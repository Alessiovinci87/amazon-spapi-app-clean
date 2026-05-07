// backend_v2/routes/dashboard.js
// Endpoint aggregato per la pagina /uffici/panoramica.
// Una sola chiamata che ritorna KPI + semafori + alert + operazioni in corso.
// Cache in-memory per evitare di ricalcolare tutto a ogni refresh.

const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const logger = require("../utils/logger");
const { readOrdersLiveFromCache, refreshLiveInBackground, isBgRefreshing } = require("../modules/reports/ordersLiveService");

const CACHE_TTL_MS = 60 * 1000;
// cache keyed by from-to (gli stati di sistema non dipendono dal periodo,
// vengono ricalcolati ma sono leggeri)
const _cache = new Map();

function safe(fn, fallback = null) {
  try { return fn(); } catch (e) { logger.warn({ err: e.message }, "dashboard query failed"); return fallback; }
}

function pctDelta(curr, prev) {
  if (prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

// === Helpers data ===
const fmtDate = (d) => d.toISOString().slice(0, 10);
const todayYMD = () => fmtDate(new Date());
const ymdOffset = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return fmtDate(d);
};
function diffDays(from, to) {
  const a = new Date(from + "T00:00:00Z");
  const b = new Date(to + "T00:00:00Z");
  return Math.round((b - a) / 86400000) + 1;
}
function shiftRangeBack(from, to) {
  const days = diffDays(from, to);
  const shiftFrom = new Date(from + "T00:00:00Z");
  const shiftTo = new Date(to + "T00:00:00Z");
  shiftFrom.setUTCDate(shiftFrom.getUTCDate() - days);
  shiftTo.setUTCDate(shiftTo.getUTCDate() - days);
  return { from: fmtDate(shiftFrom), to: fmtDate(shiftTo) };
}

function aggregateSales(db, from, to, capDate) {
  // capDate: ultima data per cui sales_daily è completo per TUTTI i marketplace.
  // I giorni successivi vengono coperti da Orders Live a livello di endpoint,
  // quindi qui li dobbiamo escludere per non contare due volte.
  const effectiveTo = capDate && capDate < to ? capDate : to;
  if (effectiveTo < from) {
    return { totale: { units: 0, revenue: 0, orders: 0, giorni_dati: 0 }, per_country: [] };
  }
  const totale = safe(() => db.prepare(`
    SELECT
      COALESCE(SUM(units_ordered), 0)         AS units,
      COALESCE(SUM(ordered_product_sales), 0) AS revenue,
      COALESCE(SUM(order_count), 0)           AS orders,
      COUNT(DISTINCT date)                    AS giorni_dati
    FROM sales_daily
    WHERE date >= ? AND date <= ?
  `).get(from, effectiveTo), { units: 0, revenue: 0, orders: 0, giorni_dati: 0 });

  const per_country = safe(() => db.prepare(`
    SELECT country,
           COALESCE(SUM(units_ordered), 0)         AS units,
           COALESCE(SUM(ordered_product_sales), 0) AS revenue,
           COALESCE(SUM(order_count), 0)           AS orders
    FROM sales_daily
    WHERE date >= ? AND date <= ?
    GROUP BY country
    ORDER BY revenue DESC
  `).all(from, effectiveTo), []);

  return { totale, per_country };
}

function aggregateReturns(db, from, to) {
  // fba_returns.return_date può essere ISO con orario; uso DATE()
  return safe(() => db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) AS qty
    FROM fba_returns
    WHERE DATE(return_date) >= ? AND DATE(return_date) <= ?
  `).get(from, to)?.qty, 0);
}

function aggregateReturnsByCountry(db, from, to) {
  return safe(() => db.prepare(`
    SELECT country, COALESCE(SUM(quantity), 0) AS qty
    FROM fba_returns
    WHERE DATE(return_date) >= ? AND DATE(return_date) <= ?
    GROUP BY country
  `).all(from, to), []);
}

function buildSistema() {
  const db = getDb();

  const syncLog = safe(() => db.prepare(`SELECT * FROM sync_log ORDER BY last_run DESC`).all(), []);

  const tracking = safe(() => {
    const total = db.prepare("SELECT COUNT(*) AS n FROM tracking_17track").get().n;
    const inTransit = db.prepare(`
      SELECT COUNT(*) AS n FROM tracking_17track
      WHERE status IN ('InTransit','OutForDelivery','InfoReceived','AvailableForPickup')
    `).get().n;
    const problemi = db.prepare(`
      SELECT COUNT(*) AS n FROM tracking_17track
      WHERE status IN ('Exception','DeliveryFailure','NotFound','Expired')
    `).get().n;
    const consegnati = db.prepare("SELECT COUNT(*) AS n FROM tracking_17track WHERE status = 'Delivered'").get().n;
    return { total, in_transit: inTransit, problemi, consegnati };
  }, { total: 0, in_transit: 0, problemi: 0, consegnati: 0 });

  const etichette = safe(() => {
    const tipi_in_debito = db.prepare("SELECT COUNT(*) AS n FROM etichette WHERE da_stampare > 0").get().n;
    const totale_pezzi = db.prepare("SELECT COALESCE(SUM(da_stampare),0) AS n FROM etichette").get().n;
    const sotto_soglia = db.prepare(`
      SELECT COUNT(*) AS n FROM etichette
      WHERE soglia_minima > 0 AND quantita > 0 AND quantita < soglia_minima
    `).get().n;
    const esaurite = db.prepare("SELECT COUNT(*) AS n FROM etichette WHERE quantita = 0").get().n;
    return { tipi_in_debito, totale_pezzi, sotto_soglia, esaurite };
  }, { tipi_in_debito: 0, totale_pezzi: 0, sotto_soglia: 0, esaurite: 0 });

  const produzioni = safe(() => {
    const in_lavorazione = db.prepare(`
      SELECT COUNT(*) AS n FROM prenotazioni_sfuso WHERE stato = 'In lavorazione'
    `).get().n;
    const prenotazioni_attive = db.prepare(`
      SELECT COUNT(*) AS n FROM prenotazioni_sfuso WHERE stato = 'PRENOTAZIONE'
    `).get().n;
    return { in_lavorazione, prenotazioni_attive };
  }, { in_lavorazione: 0, prenotazioni_attive: 0 });

  const ddt = safe(() => {
    const senza_tracking = db.prepare(`
      SELECT COUNT(*) AS n FROM ddt_generici
      WHERE tracking IS NULL OR TRIM(tracking) = ''
    `).get().n;
    const totale = db.prepare("SELECT COUNT(*) AS n FROM ddt_generici").get().n;
    return { senza_tracking, totale };
  }, { senza_tracking: 0, totale: 0 });

  const buybox = safe(() => {
    const persi = db.prepare(`
      WITH ultimi AS (
        SELECT s.*, ROW_NUMBER() OVER (PARTITION BY asin, marketplace_id ORDER BY snapshot_at DESC) AS rn
        FROM listings_snapshot s
      )
      SELECT COUNT(*) AS n FROM ultimi WHERE rn = 1 AND buybox_won = 0
    `).get().n;
    const totali = db.prepare(`
      WITH ultimi AS (
        SELECT s.*, ROW_NUMBER() OVER (PARTITION BY asin, marketplace_id ORDER BY snapshot_at DESC) AS rn
        FROM listings_snapshot s
      )
      SELECT COUNT(*) AS n FROM ultimi WHERE rn = 1
    `).get().n;
    return { persi, totali };
  }, { persi: 0, totali: 0 });

  const ordini_fornitori = safe(() => {
    const in_attesa = db.prepare(`
      SELECT COUNT(*) AS n FROM ordini_fornitori
      WHERE stato IN ('In attesa','In transito','Bozza','In bozza')
    `).get().n;
    return { in_attesa };
  }, { in_attesa: 0 });

  return {
    sync: syncLog,
    tracking, etichette, produzioni, ddt, buybox, ordini_fornitori,
  };
}

function buildAlertsAndOps() {
  const db = getDb();

  const alerts = safe(() => db.prepare(`
    SELECT id, asin, tipo, marketplace_id, messaggio, valore_attuale,
           valore_precedente, source, nome, created_at
    FROM alert_events
    WHERE letto = 0
    ORDER BY created_at DESC
    LIMIT 8
  `).all(), []);

  const alert_unread_total = safe(() =>
    db.prepare("SELECT COUNT(*) AS n FROM alert_events WHERE letto = 0").get().n,
    0
  );

  const ddt_da_completare = safe(() => db.prepare(`
    SELECT id, brand, numeroDDT, paese, data, totUnita
    FROM ddt_generici
    WHERE tracking IS NULL OR TRIM(tracking) = ''
    ORDER BY data DESC, id DESC
    LIMIT 5
  `).all(), []);

  const prenotazioni_in_lavorazione = safe(() => db.prepare(`
    SELECT id, asin_prodotto, nome_prodotto, formato, prodotti, dataInizio
    FROM prenotazioni_sfuso
    WHERE stato = 'In lavorazione'
    ORDER BY dataInizio DESC
    LIMIT 5
  `).all(), []);

  const ordini_in_attesa = safe(() => db.prepare(`
    SELECT o.id, o.stato, o.data_ordine, o.data_consegna_prevista,
           o.quantita_litri, o.numero_ddt, f.nome AS fornitore
    FROM ordini_fornitori o
    LEFT JOIN fornitori f ON f.id = o.id_fornitore
    WHERE o.stato IN ('In attesa','In transito','Bozza','In bozza')
    ORDER BY o.data_ordine DESC
    LIMIT 5
  `).all(), []);

  return {
    alerts: { items: alerts, unread_total: alert_unread_total },
    operazioni: {
      ddt_da_completare,
      prenotazioni_in_lavorazione,
      ordini_in_attesa,
    },
  };
}

function buildOverview({ from, to }) {
  const db = getDb();

  // Ultimo giorno COMPLETO in sales_daily: il MAX(date) globale può essere
  // raggiunto solo da alcuni paesi (Amazon pubblica il report con tempi
  // diversi per marketplace). Usiamo MIN(MAX(date)) per paese, così garantiamo
  // che TUTTI i marketplace attivi siano coperti da sales_daily fino a quella
  // data. Per i giorni successivi useremo Orders Live.
  const lastAvailable = safe(() =>
    db.prepare(`
      SELECT MIN(d) AS d FROM (
        SELECT country, MAX(date) AS d FROM sales_daily GROUP BY country
      )
    `).get()?.d, null);

  // KPI sul periodo richiesto. aggregateSales legge sales_daily fino a
  // lastAvailable (incluso); i giorni successivi vengono coperti dal merge
  // con Orders Live più sotto nell'endpoint.
  const sales = aggregateSales(db, from, to, lastAvailable);
  const prevRange = shiftRangeBack(from, to);
  const salesPrev = aggregateSales(db, prevRange.from, prevRange.to, lastAvailable);
  const resi = aggregateReturns(db, from, to);
  const resiPrev = aggregateReturns(db, prevRange.from, prevRange.to);
  const resiCountry = aggregateReturnsByCountry(db, from, to);

  // KPI top-level
  const totale = sales.totale;
  const totalePrev = salesPrev.totale;
  const giorniRange = diffDays(from, to);

  const kpi = {
    revenue:       { value: totale.revenue, delta_pct: pctDelta(totale.revenue, totalePrev.revenue) },
    orders:        { value: totale.orders,  delta_pct: pctDelta(totale.orders, totalePrev.orders) },
    units:         { value: totale.units,   delta_pct: pctDelta(totale.units, totalePrev.units) },
    returns_units: { value: resi,           delta_pct: pctDelta(resi, resiPrev) },
    returns_pct: totale.units > 0 ? Math.round((resi / totale.units) * 1000) / 10 : null,
  };

  // Per paese: combina vendite + resi
  const resiByCountry = Object.fromEntries(resiCountry.map(r => [r.country, r.qty]));
  const per_country = sales.per_country.map(c => ({
    ...c,
    returns_units: resiByCountry[c.country] || 0,
    returns_pct: c.units > 0 ? Math.round(((resiByCountry[c.country] || 0) / c.units) * 1000) / 10 : null,
  }));

  // === Sistema, alert, operazioni (non dipendono dal periodo) ===
  const sistema = buildSistema();
  const { alerts, operazioni } = buildAlertsAndOps();

  return {
    generated_at: new Date().toISOString(),
    range: {
      from, to,
      giorni: giorniRange,
      previous: prevRange,
      data_lag: !!(lastAvailable && lastAvailable < to),
      last_available_date: lastAvailable,
    },
    kpi,
    per_country,
    sistema,
    alerts,
    operazioni,
  };
}

router.get("/overview", async (req, res) => {
  try {
    // Default: ultimi 7 giorni completi (today-7..today-1) → data lag-friendly
    let from = String(req.query.from || ymdOffset(7));
    let to = String(req.query.to || ymdOffset(1));
    // Sanity check formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) from = ymdOffset(7);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) to = ymdOffset(1);
    if (from > to) [from, to] = [to, from];

    // include_live: true → integra Orders API per i giorni non coperti da sales_daily
    const includeLive = req.query.live !== "0";

    const cacheKey = `${from}|${to}|live=${includeLive}`;
    const now = Date.now();
    const hit = _cache.get(cacheKey);
    if (req.query.refresh !== "1" && hit && now - hit.ts < CACHE_TTL_MS) {
      return res.json({ ok: true, cached: true, ...(hit.data) });
    }

    const data = buildOverview({ from, to });

    // Integrazione live: leggiamo dalla cache DB amazon_order_cache (fast path).
    // Il fetch effettivo da Amazon Orders API gira in background:
    //  - SEMPRE quando includeLive (per mantenere fresca la cache)
    //  - se ?refresh=1 forziamo l'avvio anche se uno è già in corso
    // L'utente vede SUBITO i numeri attualmente in cache; se è il primo
    // accesso al periodo "oggi" la cache è vuota → 0, ma il bg refresh
    // partirà e nei prossimi N secondi (tipicamente 2-5 min) la cache
    // sarà popolata, e bastano refresh successivi.
    const last = data?.range?.last_available_date;
    if (includeLive) {
      const liveFrom = last && last >= from ? ymdAddDays(last, 1) : from;
      if (liveFrom <= to) {
        try {
          const live = readOrdersLiveFromCache({ from: liveFrom, to });
          data.live = {
            applied: true,
            range: { from: liveFrom, to },
            totale_eur: live.totale_eur,
            non_eur: live.non_eur,
            per_country: live.per_country,
            last_fetch: live.last_fetch,
            refreshing: isBgRefreshing({ from: liveFrom, to }),
          };
          // Somma alla cache (KPI + per_country)
          data.kpi.revenue.value = Math.round((data.kpi.revenue.value + live.totale_eur.revenue) * 100) / 100;
          data.kpi.units.value = data.kpi.units.value + live.totale_eur.units;
          data.kpi.orders.value = data.kpi.orders.value + live.totale_eur.orders;
          data.kpi.revenue.delta_pct = null;
          data.kpi.units.delta_pct = null;
          data.kpi.orders.delta_pct = null;
          const liveByCountry = Object.fromEntries(live.per_country.map(c => [c.country, c]));
          for (const c of data.per_country) {
            const lc = liveByCountry[c.country];
            if (lc) {
              c.revenue = Math.round((c.revenue + lc.revenue) * 100) / 100;
              c.units = c.units + lc.units;
              c.orders = c.orders + lc.orders;
            }
          }
          for (const lc of live.per_country) {
            if (!data.per_country.some(c => c.country === lc.country) && (lc.revenue > 0 || lc.units > 0)) {
              data.per_country.push({
                country: lc.country, revenue: lc.revenue, units: lc.units,
                orders: lc.orders, returns_units: 0, returns_pct: null,
              });
            }
          }
          data.per_country.sort((a, b) => b.revenue - a.revenue);
        } catch (err) {
          logger.warn({ err: err.message }, "[overview] live read failed");
          data.live = { applied: false, error: err.message };
        }
        // Trigger refresh in background (fire-and-forget)
        refreshLiveInBackground({ from: liveFrom, to });
        // Aggiorna lo stato refreshing dopo aver triggerato (potrebbe essere
        // appena stato avviato adesso)
        if (data.live) data.live.refreshing = isBgRefreshing({ from: liveFrom, to });
      } else {
        data.live = { applied: false, reason: "report Amazon coprono già il range" };
      }
    }

    _cache.set(cacheKey, { data, ts: now });
    if (_cache.size > 32) {
      const oldestKey = [..._cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0][0];
      _cache.delete(oldestKey);
    }

    res.json({ ok: true, cached: false, ...data });
  } catch (err) {
    logger.error({ err }, "Errore /dashboard/overview");
    res.status(500).json({ ok: false, error: err.message });
  }
});

function ymdAddDays(ymd, n) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

module.exports = router;
