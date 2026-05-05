// backend_v2/routes/dashboard.js
// Endpoint aggregato per la pagina /uffici/panoramica.
// Una sola chiamata che ritorna KPI + semafori + alert + operazioni in corso.
// Cache in-memory 60s per evitare di ricalcolare tutto a ogni refresh.

const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const logger = require("../utils/logger");

const CACHE_TTL_MS = 60 * 1000;
let _cache = { data: null, ts: 0 };

function safe(fn, fallback = null) {
  try { return fn(); } catch (e) { logger.warn({ err: e.message }, "dashboard query failed"); return fallback; }
}

function pctDelta(curr, prev) {
  if (prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function buildOverview() {
  const db = getDb();

  // ===== KPI vendite / ordini / resi 7gg vs 7gg precedenti =====
  // sales_daily.date è in formato YYYY-MM-DD
  const today = new Date();
  const fmtDate = (d) => d.toISOString().slice(0, 10);
  const ymd = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return fmtDate(d);
  };
  const range7 = { from: ymd(7), to: ymd(0) };
  const range7prev = { from: ymd(14), to: ymd(8) };

  const salesAgg = (range) => safe(() => db.prepare(`
    SELECT
      COALESCE(SUM(units_ordered), 0)         AS units,
      COALESCE(SUM(ordered_product_sales), 0) AS revenue,
      COALESCE(SUM(order_count), 0)           AS orders
    FROM sales_daily
    WHERE date >= ? AND date <= ?
  `).get(range.from, range.to), { units: 0, revenue: 0, orders: 0 });

  const sales = salesAgg(range7);
  const salesPrev = salesAgg(range7prev);

  const resi7 = safe(() => db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) AS qty
    FROM fba_returns
    WHERE return_date >= ?
  `).get(range7.from)?.qty, 0);

  const resi7prev = safe(() => db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) AS qty
    FROM fba_returns
    WHERE return_date >= ? AND return_date < ?
  `).get(range7prev.from, range7.from)?.qty, 0);

  const kpi = {
    revenue:       { value: sales.revenue, delta_pct: pctDelta(sales.revenue, salesPrev.revenue) },
    orders:        { value: sales.orders,  delta_pct: pctDelta(sales.orders, salesPrev.orders) },
    units:         { value: sales.units,   delta_pct: pctDelta(sales.units, salesPrev.units) },
    returns_units: { value: resi7,         delta_pct: pctDelta(resi7, resi7prev) },
    returns_pct: sales.units > 0 ? Math.round((resi7 / sales.units) * 1000) / 10 : null,
    range_giorni: 7,
  };

  // ===== Stato sistema (semafori) =====
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
    // Snapshot più recente per ASIN+marketplace, conta quelli con buybox_won = 0
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

  // ===== Alert recenti (ultimi 8 non letti) =====
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

  // ===== Operazioni in corso (lista breve) =====
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
    generated_at: new Date().toISOString(),
    kpi,
    sistema: {
      sync: syncLog,
      tracking,
      etichette,
      produzioni,
      ddt,
      buybox,
      ordini_fornitori,
    },
    alerts: { items: alerts, unread_total: alert_unread_total },
    operazioni: {
      ddt_da_completare,
      prenotazioni_in_lavorazione,
      ordini_in_attesa,
    },
  };
}

router.get("/overview", (req, res) => {
  try {
    const now = Date.now();
    if (req.query.refresh !== "1" && _cache.data && now - _cache.ts < CACHE_TTL_MS) {
      return res.json({ ok: true, cached: true, ...(_cache.data) });
    }
    const data = buildOverview();
    _cache = { data, ts: now };
    res.json({ ok: true, cached: false, ...data });
  } catch (err) {
    logger.error({ err }, "Errore /dashboard/overview");
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
