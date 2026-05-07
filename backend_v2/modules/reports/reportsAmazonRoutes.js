// backend_v2/modules/reports/reportsAmazonRoutes.js
const express = require("express");
const router = express.Router();
const logger = require("../../utils/logger");

const {
  createReport,
  getReportStatus,
  getReportDocument,
  downloadReportDocument,
  getCatalogItem,
  getListingItem,
} = require("./reportsAmazonService");

const marketplacesMap = require("./marketplacesMap");

// ✅ importa il modulo catalog per i dettagli asin
const catalogRouter = require("../catalog/catalog");
router.use("/catalog", catalogRouter); // ← aggiunta fondamentale

// ✅ lista default di marketplace EU
const defaultMarketplaceIds = [
  "APJ6JRA9NG5V4",   // Italia
  "A13V1IB3VIYZZH",  // Francia
  "A1RKKUPIHCS9HS",  // Spagna
  "A1PA6795UKMFR9",  // Germania
  "A1F83G8C2ARO7P",  // UK
  "A1805IZSGTT6HS",  // Paesi Bassi
  "A2NODRKZP88ZB9",  // Svezia
  "A1C3SOZRARQ6R3",  // Polonia
  "AMEN7PMS3EDWL"    // Belgio
];

const { open } = require("sqlite");
const sqlite3 = require("sqlite3").verbose();


const path = require("path"); // ✅ AGGIUNTO IMPORT
const { getDbPath } = require("../../db/database");


const { aggiornaFBAFees, getFBAFees, fetchFeesEstimateForAsin, salvaFeeConfermate, ensureFbaFeesSchema, MKT_TO_COUNTRY } = require("./fbaFeesService");
const { aggiornaSalesTraffic, getSalesTraffic, getAsinSalesForPeriod, syncAsinDaily, backfillAsinDaily } = require("./salesTrafficService");

// 🔄 POST → genera o aggiorna report vendite
router.post("/sales-traffic/update", async (req, res) => {
  try {
    logger.info("Avvio aggiornamento Sales & Traffic...");
    // ✅ risponde subito, non blocca Postman
    res.json({ ok: true, message: "Aggiornamento Sales & Traffic avviato in background" });

    // 🧠 esecuzione in background
    setImmediate(async () => {
      try {
        const result = await aggiornaSalesTraffic();
        logger.info({ data: result }, "Sales & Traffic completato");
      } catch (err) {
        logger.error({ err }, "Errore in background Sales & Traffic");
      }
    });
  } catch (err) {
    logger.error({ err }, "Errore iniziale aggiornaSalesTraffic");
    res.status(500).json({
      ok: false,
      error: "Impossibile avviare aggiornamento Sales & Traffic",
      details: err.message,
    });
  }
});


// 📊 GET → restituisce i dati vendite salvati nel DB
router.get("/sales-traffic", async (req, res) => {
  try {
    const data = await getSalesTraffic();
    logger.info(`Sales & Traffic: ${data.length} record trovati`);
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    logger.error({ err }, "Errore getSalesTraffic");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 📊 GET → riepilogo vendite aggregato (con filtro date opzionale)
// Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
// Usa sales_daily per totali/trend (dati giornalieri reali da Amazon)
// Usa sales_traffic per dettaglio ASIN (aggregato intero periodo)
// Mappa marketplace_id Amazon → country code (allineato a sales_daily.country)
const MP_ID_TO_CC = {
  "APJ6JRA9NG5V4": "IT",
  "A13V1IB3VIYZZH": "FR",
  "A1RKKUPIHCS9HS": "ES",
  "A1PA6795UKMFR9": "DE",
  "A1F83G8C2ARO7P": "UK",
  "A1805IZSGTT6HS": "NL",
  "AMEN7PMS3EDWL":  "BE",
  "A1C3SOZRARQ6R3": "PL",
};

router.get("/sales-traffic/summary", async (req, res) => {
  try {
    const { getDb } = require("../../db/database");
    const db = getDb();
    const { from, to } = req.query;

    const dailyFilter = (from && to) ? "WHERE date >= ? AND date <= ?" : "WHERE 1=1";
    const dateParams = (from && to) ? [from, to] : [];

    const dailyTotals = db.prepare(`
      SELECT
        COALESCE(SUM(units_ordered), 0) AS unita_totali,
        COALESCE(SUM(ordered_product_sales), 0) AS fatturato_totale,
        COUNT(DISTINCT country) AS marketplace_attivi,
        COUNT(DISTINCT date) AS giorni_con_dati,
        MIN(date) AS data_inizio,
        MAX(date) AS data_fine,
        COALESCE(SUM(order_count), 0) AS ordini_totali
      FROM sales_daily ${dailyFilter}
    `).get(...dateParams);

    const asinCount = db.prepare(
      "SELECT COUNT(DISTINCT asin) AS cnt FROM sales_traffic WHERE asin != ''"
    ).get();

    const lastAvailable = db.prepare(
      "SELECT MAX(date) AS ultima_data FROM sales_daily"
    ).get();

    const dailyPerMarketplace = db.prepare(`
      SELECT country,
        SUM(units_ordered) AS unita,
        SUM(ordered_product_sales) AS fatturato,
        COUNT(DISTINCT date) AS giorni
      FROM sales_daily ${dailyFilter}
      GROUP BY country
    `).all(...dateParams);

    const topAsin = db.prepare(`
      SELECT st.asin, st.sku,
        SUM(st.units_ordered) AS unita,
        SUM(st.ordered_product_sales) AS fatturato,
        ROUND(AVG(st.conversion_rate), 2) AS conv_rate_avg,
        SUM(st.sessions) AS sessioni,
        COALESCE(pc.titolo, al.title, '') AS nome
      FROM sales_traffic st
      LEFT JOIN product_catalog pc ON pc.asin = st.asin
      LEFT JOIN amazon_listings al ON al.asin = st.asin
      WHERE st.asin != ''
      GROUP BY st.asin
      ORDER BY fatturato DESC
      LIMIT 50
    `).all();

    const dailyPerData = db.prepare(`
      SELECT date,
        SUM(units_ordered) AS unita,
        SUM(ordered_product_sales) AS fatturato,
        SUM(sessions) AS sessioni
      FROM sales_daily ${dailyFilter}
      GROUP BY date
      ORDER BY date ASC
    `).all(...dateParams);

    // Fallback Orders Live: Amazon pubblica sales_daily con T-2,
    // quindi per i giorni del range non ancora consolidati leggiamo
    // da amazon_order_cache (Orders API near-real-time).
    const livePerData = [];
    const livePerMarketplace = {};
    const liveTotals = { unita: 0, fatturato: 0, ordini: 0, countries: new Set() };

    if (from && to) {
      const allDates = [];
      const cursor = new Date(from + "T00:00:00Z");
      const endDate = new Date(to + "T00:00:00Z");
      while (cursor <= endDate) {
        allDates.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      const coveredDates = new Set(dailyPerData.map((r) => r.date));
      const missingDates = allDates.filter((d) => !coveredDates.has(d));

      if (missingDates.length > 0) {
        const placeholders = missingDates.map(() => "?").join(",");
        const liveRows = db.prepare(`
          SELECT marketplace_id, DATE(purchase_date) AS date,
            COUNT(*) AS ordini,
            COALESCE(SUM(units), 0) AS unita,
            COALESCE(SUM(revenue), 0) AS fatturato
          FROM amazon_order_cache
          WHERE DATE(purchase_date) IN (${placeholders})
            AND COALESCE(status, '') != 'Canceled'
          GROUP BY marketplace_id, DATE(purchase_date)
        `).all(...missingDates);

        const byDate = {};
        for (const r of liveRows) {
          const country = MP_ID_TO_CC[r.marketplace_id];
          if (!country) continue;
          liveTotals.unita += r.unita;
          liveTotals.fatturato += r.fatturato;
          liveTotals.ordini += r.ordini;
          liveTotals.countries.add(country);

          if (!byDate[r.date]) {
            byDate[r.date] = { date: r.date, unita: 0, fatturato: 0, sessioni: 0, is_live: 1 };
          }
          byDate[r.date].unita += r.unita;
          byDate[r.date].fatturato += r.fatturato;

          if (!livePerMarketplace[country]) {
            livePerMarketplace[country] = { country, unita: 0, fatturato: 0, giorni: 0 };
          }
          livePerMarketplace[country].unita += r.unita;
          livePerMarketplace[country].fatturato += r.fatturato;
          livePerMarketplace[country].giorni += 1;
        }
        livePerData.push(...Object.values(byDate));
      }
    }

    const dailyCountries = new Set(dailyPerMarketplace.map((r) => r.country));
    const allCountries = new Set([...dailyCountries, ...liveTotals.countries]);

    const totals = {
      unita_totali: (dailyTotals.unita_totali || 0) + liveTotals.unita,
      fatturato_totale: Math.round(((dailyTotals.fatturato_totale || 0) + liveTotals.fatturato) * 100) / 100,
      marketplace_attivi: allCountries.size,
      giorni_con_dati: (dailyTotals.giorni_con_dati || 0) + livePerData.length,
      data_inizio: dailyTotals.data_inizio,
      data_fine: dailyTotals.data_fine,
      ordini_totali: (dailyTotals.ordini_totali || 0) + liveTotals.ordini,
      asin_attivi: asinCount?.cnt || 0,
      ultima_data_disponibile: lastAvailable?.ultima_data || null,
      live_days_count: livePerData.length,
    };

    const mergedPerMarketplace = {};
    for (const r of dailyPerMarketplace) mergedPerMarketplace[r.country] = { ...r };
    for (const r of Object.values(livePerMarketplace)) {
      if (!mergedPerMarketplace[r.country]) {
        mergedPerMarketplace[r.country] = { country: r.country, unita: 0, fatturato: 0, giorni: 0 };
      }
      mergedPerMarketplace[r.country].unita += r.unita;
      mergedPerMarketplace[r.country].fatturato += r.fatturato;
      mergedPerMarketplace[r.country].giorni += r.giorni;
    }
    const perMarketplace = Object.values(mergedPerMarketplace).sort((a, b) => b.fatturato - a.fatturato);

    const perData = [...dailyPerData, ...livePerData].sort((a, b) => a.date.localeCompare(b.date));

    res.json({ ok: true, totals, perMarketplace, topAsin, perData });
  } catch (err) {
    logger.error({ err }, "Errore sales-traffic/summary");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 📊 GET → confronto periodi (thisWeek vs lastWeek, thisMonth vs lastMonth)
router.get("/sales-traffic/compare", (req, res) => {
  try {
    const { getDb } = require("../../db/database");
    const db = getDb();

    function periodStats(startDate, endDate) {
      return db.prepare(`
        SELECT
          COALESCE(SUM(units_ordered), 0) AS unita,
          COALESCE(SUM(ordered_product_sales), 0) AS fatturato,
          COALESCE(SUM(sessions), 0) AS sessioni
        FROM sales_daily
        WHERE date >= ? AND date <= ?
      `).get(startDate, endDate);
    }

    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);

    // Settimana corrente (lun-dom)
    const dayOfWeek = (today.getDay() + 6) % 7;
    const thisWeekStart = new Date(today); thisWeekStart.setDate(today.getDate() - dayOfWeek);
    const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart); lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

    // Mese corrente
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const thisWeek = periodStats(fmt(thisWeekStart), fmt(today));
    const lastWeek = periodStats(fmt(lastWeekStart), fmt(lastWeekEnd));
    const thisMonth = periodStats(fmt(thisMonthStart), fmt(today));
    const lastMonth = periodStats(fmt(lastMonthStart), fmt(lastMonthEnd));

    res.json({ ok: true, thisWeek, lastWeek, thisMonth, lastMonth });
  } catch (err) {
    logger.error({ err }, "Errore sales-traffic/compare");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST → sync ASIN daily (ieri)
router.post("/asin-daily/sync", async (req, res) => {
  try {
    res.json({ ok: true, message: "Sync ASIN giornaliero avviato in background" });
    setImmediate(async () => {
      try {
        const result = await syncAsinDaily();
        logger.info({ data: result }, "AsinDaily sync completato");
      } catch (err) { logger.error({ err }, "Errore AsinDaily sync"); }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST → backfill ultimi N giorni (default 7)
router.post("/asin-daily/backfill", async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  try {
    res.json({ ok: true, message: `Backfill ultimi ${days} giorni avviato in background` });
    setImmediate(async () => {
      try {
        const result = await backfillAsinDaily(days);
        logger.info({ data: result }, "AsinDaily backfill completato");
      } catch (err) { logger.error({ err }, "Errore AsinDaily backfill"); }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET → dati giornalieri ASIN disponibili (date range)
router.get("/asin-daily/dates", (req, res) => {
  try {
    const db = require("../../db/database").getDb();
    try { db.prepare("SELECT 1 FROM sales_asin_daily LIMIT 1").get(); } catch { return res.json({ ok: true, dates: [], min: null, max: null }); }
    const range = db.prepare("SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(DISTINCT date) as days FROM sales_asin_daily").get();
    const dates = db.prepare("SELECT DISTINCT date FROM sales_asin_daily ORDER BY date DESC").all().map(r => r.date);
    res.json({ ok: true, dates, min: range.min_date, max: range.max_date, days: range.days });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── FBA COVERAGE (giorni copertura stock) ────────────────────────
// Per ogni ASIN×paese: stock attuale, velocità vendita, giorni copertura, rischio stockout
router.get("/fba-coverage", (req, res) => {
  try {
    const db = require("../../db/database").getDb();
    const { country } = req.query;
    const countryFilter = country ? country.split(",").map(c => c.trim().toUpperCase()).filter(Boolean) : [];

    // 1. Giorni nel periodo vendite (per calcolare velocità media)
    const daysInPeriod = db.prepare("SELECT COUNT(DISTINCT date) AS n FROM sales_daily").get()?.n || 365;

    // 2. Vendite per ASIN×paese (annuali)
    let stWhere = "";
    const stParams = [];
    if (countryFilter.length > 0) {
      stWhere = ` AND st.country IN (${countryFilter.map(() => "?").join(",")})`;
      stParams.push(...countryFilter);
    }

    const rows = db.prepare(`
      SELECT
        fs.asin,
        fs.country,
        fs.quantity AS stock_fulfillable,
        COALESCE(fs.quantity, 0) + COALESCE(fs.reserved_qty, 0) + COALESCE(fs.inbound_working, 0) + COALESCE(fs.inbound_shipped, 0) + COALESCE(fs.inbound_receiving, 0) + COALESCE(fs.unfulfillable_qty, 0) AS stock_fba,
        COALESCE(fs.reserved_qty, 0) AS reserved_qty,
        COALESCE(fs.inbound_receiving, 0) + COALESCE(fs.inbound_shipped, 0) + COALESCE(fs.inbound_working, 0) AS inbound_qty,
        fs.product_name,
        COALESCE(st.units_ordered, 0) AS unita_anno,
        COALESCE(st.ordered_product_sales, 0) AS fatturato_anno,
        COALESCE(img.titolo, fs.product_name, '') AS nome,
        COALESCE(img.image_url, '') AS immagine
      FROM fba_stock fs
      LEFT JOIN sales_traffic st ON st.asin = fs.asin AND st.country = fs.country
      LEFT JOIN (
        SELECT asin, titolo, image_url FROM product_catalog
        WHERE image_url IS NOT NULL AND image_url != ''
        GROUP BY asin
      ) img ON img.asin = fs.asin
      WHERE fs.quantity >= 0${stWhere ? stWhere.replace(/st\./g, "fs.").replace("fs.country", "fs.country") : ""}
      ${countryFilter.length > 0 ? "" : ""}
    `).all(...(countryFilter.length > 0 ? countryFilter : []));

    // Paesi disponibili
    const availableCountries = db.prepare(
      "SELECT DISTINCT country FROM fba_stock WHERE country IS NOT NULL ORDER BY country"
    ).all().map(r => r.country);

    // Velocità ultimi 30gg per paese (per pesare la velocità recente vs annuale)
    const maxDate = db.prepare("SELECT MAX(date) AS d FROM sales_daily").get()?.d;
    const last30 = {};
    if (maxDate) {
      const d30ago = new Date(maxDate);
      d30ago.setDate(d30ago.getDate() - 30);
      const rows30 = db.prepare(
        "SELECT country, SUM(units_ordered) AS u30, SUM(ordered_product_sales) AS f30 FROM sales_daily WHERE date >= ? GROUP BY country"
      ).all(d30ago.toISOString().slice(0, 10));
      for (const r of rows30) last30[r.country] = r;
    }

    // Totali annui per paese (per calcolare rapporto 30gg/anno)
    const countryAnnual = {};
    db.prepare("SELECT country, SUM(units_ordered) AS u_year FROM sales_daily GROUP BY country").all()
      .forEach(r => countryAnnual[r.country] = r.u_year);

    let critici = 0, attenzione = 0, ok = 0, esauriti = 0;

    const prodotti = rows
      .filter(r => r.unita_anno > 0 || r.stock_fba > 0) // escludi ASIN senza vendite e senza stock
      .map(r => {
        // Velocità media annuale
        const velAnno = r.unita_anno / daysInPeriod;

        // Velocità ultimi 30gg (più recente, pesa di più)
        let vel30 = velAnno;
        if (last30[r.country] && countryAnnual[r.country] > 0) {
          const ratio30 = last30[r.country].u30 / countryAnnual[r.country];
          vel30 = (r.unita_anno * ratio30 / 30); // velocità stimata ultimi 30gg per questo ASIN
        }

        // Media pesata: 70% ultimi 30gg + 30% annuale
        const velocita = vel30 * 0.7 + velAnno * 0.3;
        const giorniCopertura = velocita > 0 ? Math.round(r.stock_fba / velocita) : (r.stock_fba > 0 ? 999 : 0);

        // Suggerimento riordino: quante unità per arrivare a 60gg di copertura
        const target60 = Math.ceil(velocita * 60);
        const suggerimentoQty = Math.max(0, target60 - r.stock_fba);

        let rischio;
        if (r.stock_fba === 0 && r.unita_anno > 0) { rischio = "ESAURITO"; esauriti++; }
        else if (giorniCopertura <= 14) { rischio = "CRITICO"; critici++; }
        else if (giorniCopertura <= 30) { rischio = "ATTENZIONE"; attenzione++; }
        else { rischio = "OK"; ok++; }

        return {
          asin: r.asin,
          country: r.country,
          nome: r.nome || r.asin,
          immagine: r.immagine || "",
          stock_fba: r.stock_fba,
          stock_fulfillable: r.stock_fulfillable || 0,
          reserved_qty: r.reserved_qty || 0,
          inbound_qty: r.inbound_qty || 0,
          velocita_giorno: Math.round(velocita * 100) / 100,
          giorni_copertura: giorniCopertura,
          suggerimento_qty: suggerimentoQty,
          fatturato_anno: Math.round(r.fatturato_anno * 100) / 100,
          rischio,
        };
      })
      .sort((a, b) => a.giorni_copertura - b.giorni_copertura); // più urgenti prima

    // Stock EU aggregato per ASIN (Amazon cross-ship in EU)
    const euStock = {};
    db.prepare("SELECT asin, SUM(quantity) AS eu_qty FROM fba_stock WHERE country NOT IN ('GB','SK') GROUP BY asin").all()
      .forEach(r => euStock[r.asin] = r.eu_qty || 0);
    for (const p of prodotti) {
      p.eu_stock_totale = euStock[p.asin] || 0;
    }

    res.json({
      ok: true,
      kpi: { esauriti, critici, attenzione, ok, totale: prodotti.length },
      countries: availableCountries,
      prodotti,
    });
  } catch (err) {
    logger.error({ err }, "Errore fba-coverage");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── PROFITABILITY DASHBOARD ───────────────────────────────────────
// Endpoint completo: per ogni ASIN → ricavi, fee breakdown, costo, margine, stock FBA, immagine
router.get("/profitability", (req, res) => {
  try {
    const { getDb } = require("../../db/database");
    const db = getDb();

    const { country, from, to } = req.query;
    const countryFilter = country ? country.split(",").map(c => c.trim().toUpperCase()).filter(Boolean) : [];
    const usePeriod = !!(from || to);

    const periodo = usePeriod ? `${from || "inizio"} — ${to || "oggi"}` : "ultimi 365 giorni (aggregato)";

    // Strategia (FASE 1):
    //  - Con range date: legge dalla tabella denormalizzata asin_daily_metrics,
    //    popolata dal compute job ogni 5 min. Coerente con Panoramica/Vendite.
    //  - Senza range: aggregato annuo su sales_traffic (fallback legacy).
    let salesData;
    if (usePeriod && from && to) {
      const countryWhere = countryFilter.length > 0
        ? ` AND country IN (${countryFilter.map(() => "?").join(",")})` : "";
      const params = [from, to, ...countryFilter];
      salesData = db.prepare(`
        SELECT asin,
          SUM(units) AS unita,
          SUM(revenue) AS fatturato,
          SUM(fee_total) AS fee_total_pre,
          SUM(cost_total) AS cost_total_pre,
          SUM(margin) AS margin_pre,
          0 AS sessioni, 0 AS visualizzazioni
        FROM asin_daily_metrics
        WHERE metric_date >= ? AND metric_date <= ?${countryWhere}
        GROUP BY asin
      `).all(...params);
      // Aggiungo sku da prodotti
      const skuMap = {};
      db.prepare("SELECT asin, sku FROM amazon_listings WHERE asin IS NOT NULL").all().forEach(r => skuMap[r.asin] = r.sku);
      salesData = salesData.map(r => ({ ...r, sku: skuMap[r.asin] || "" }));
    } else {
      let whereExtra = "";
      const stParams = [];
      if (countryFilter.length > 0) {
        whereExtra = ` AND country IN (${countryFilter.map(() => "?").join(",")})`;
        stParams.push(...countryFilter);
      }
      salesData = db.prepare(`
        SELECT asin, MAX(sku) AS sku,
          SUM(units_ordered) AS unita,
          SUM(ordered_product_sales) AS fatturato,
          SUM(sessions) AS sessioni,
          SUM(page_views) AS visualizzazioni
        FROM sales_traffic
        WHERE units_ordered > 0 AND asin IS NOT NULL AND asin != ''${whereExtra}
        GROUP BY asin
      `).all(...stParams);
    }

    // Arricchisci con fee, costi, immagini, stock
    const feeCountryFilter = countryFilter.length > 0 ? ` WHERE country IN (${countryFilter.map(() => "?").join(",")})` : "";
    const feeParams = countryFilter.length > 0 ? countryFilter : [];
    const feesMap = {};
    db.prepare(`SELECT asin, AVG(referral_fee) AS referral_fee, AVG(fulfillment_fee) AS fulfillment_fee, AVG(storage_fee) AS storage_fee, AVG(total_fee) AS fee_media FROM fba_fees${feeCountryFilter} GROUP BY asin`).all(...feeParams).forEach(r => feesMap[r.asin] = r);

    const prodottiMap = {};
    db.prepare("SELECT id, asin, nome FROM prodotti WHERE asin IS NOT NULL").all().forEach(r => prodottiMap[r.asin] = r);

    const costiMap = {};
    db.prepare("SELECT bc.tipo, bc.id_riferimento, bc.costo, p.asin FROM bilancio_catalogo bc LEFT JOIN prodotti p ON bc.tipo = 'prodotto' AND bc.id_riferimento = p.id WHERE p.asin IS NOT NULL").all().forEach(r => costiMap[r.asin] = r.costo);

    const imgMap = {};
    db.prepare("SELECT asin, titolo, image_url FROM product_catalog WHERE image_url IS NOT NULL AND image_url != '' GROUP BY asin").all().forEach(r => imgMap[r.asin] = r);

    const alMap = {};
    db.prepare("SELECT asin, title FROM amazon_listings GROUP BY asin").all().forEach(r => alMap[r.asin] = r.title);

    const stkMap = {};
    db.prepare("SELECT asin, SUM(quantity) AS stock_fba FROM fba_stock GROUP BY asin").all().forEach(r => stkMap[r.asin] = r.stock_fba);

    const rows = salesData.map(v => ({
      ...v,
      referral_fee: feesMap[v.asin]?.referral_fee || 0,
      fulfillment_fee: feesMap[v.asin]?.fulfillment_fee || 0,
      storage_fee: feesMap[v.asin]?.storage_fee || 0,
      fee_media: feesMap[v.asin]?.fee_media || 0,
      costo_unitario: costiMap[v.asin] || 0,
      nome: imgMap[v.asin]?.titolo || alMap[v.asin] || prodottiMap[v.asin]?.nome || "",
      immagine: imgMap[v.asin]?.image_url || "",
      stock_fba: stkMap[v.asin] || 0,
    }));

    // Paesi disponibili per il selettore frontend
    const availableCountries = db.prepare(
      "SELECT DISTINCT country FROM sales_traffic WHERE country IS NOT NULL ORDER BY country"
    ).all().map(r => r.country);

    let totRicavi = 0, totFee = 0, totCosti = 0, totUnita = 0;
    const fromMetrics = !!(usePeriod && from && to);

    const prodotti = rows.map((r) => {
      // Se i dati vengono da asin_daily_metrics, fee/cost/margin sono GIÀ
      // aggregati e precisi (sommati per giorno+country). Altrimenti
      // calcoliamo on-the-fly da fee_media e costo_unitario.
      const feeTotale = fromMetrics
        ? (r.fee_total_pre || 0)
        : (r.fee_media || 0) * (r.unita || 0);
      const costoTotale = fromMetrics
        ? (r.cost_total_pre || 0)
        : (r.costo_unitario || 0) * (r.unita || 0);
      const margine = fromMetrics
        ? (r.margin_pre || 0)
        : (r.fatturato || 0) - feeTotale - costoTotale;
      const marginePct = r.fatturato > 0 ? Math.round((margine / r.fatturato) * 1000) / 10 : 0;
      const prezzoMedio = r.unita > 0 ? r.fatturato / r.unita : 0;

      totRicavi += r.fatturato || 0;
      totFee += feeTotale;
      totCosti += costoTotale;
      totUnita += r.unita || 0;

      return {
        asin: r.asin,
        sku: r.sku || "",
        nome: r.nome || r.asin,
        immagine: r.immagine || "",
        unita: r.unita || 0,
        fatturato: Math.round((r.fatturato || 0) * 100) / 100,
        prezzo_medio: Math.round(prezzoMedio * 100) / 100,
        costo_unitario: Math.round((r.costo_unitario || 0) * 100) / 100,
        referral_fee: Math.round((r.referral_fee || 0) * 100) / 100,
        fulfillment_fee: Math.round((r.fulfillment_fee || 0) * 100) / 100,
        storage_fee: Math.round((r.storage_fee || 0) * 100) / 100,
        fee_totale: Math.round(feeTotale * 100) / 100,
        costo_totale: Math.round(costoTotale * 100) / 100,
        margine: Math.round(margine * 100) / 100,
        margine_pct: marginePct,
        stock_fba: r.stock_fba || 0,
        sessioni: r.sessioni || 0,
        visualizzazioni: r.visualizzazioni || 0,
      };
    });

    const totMargine = totRicavi - totFee - totCosti;

    res.json({
      ok: true,
      source: fromMetrics ? "asin_daily_metrics" : "sales_traffic_legacy",
      kpi: {
        ricavi_totali: Math.round(totRicavi * 100) / 100,
        fee_totali: Math.round(totFee * 100) / 100,
        costi_totali: Math.round(totCosti * 100) / 100,
        margine_netto: Math.round(totMargine * 100) / 100,
        margine_pct: totRicavi > 0 ? Math.round((totMargine / totRicavi) * 1000) / 10 : 0,
        unita_totali: totUnita,
        prodotti_count: prodotti.length,
      },
      countries: availableCountries,
      filtro_paese: countryFilter.length > 0 ? countryFilter : null,
      periodo,
      stima_proporzionale: usePeriod,
      date_range: (() => { try { return db.prepare("SELECT MIN(date) AS min, MAX(date) AS max FROM sales_daily").get(); } catch { return null; } })(),
      prodotti,
    });
  } catch (err) {
    logger.error({ err }, "Errore profitability");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 📊 GET → P&L mensile
// Query: ?year=2026&country=IT,DE (country opzionale, più paesi separati da virgola)
// Ritorna una riga per mese con ricavi / costi prodotto / fee Amazon / margine.
router.get("/pl-monthly", (req, res) => {
  try {
    const { getDb } = require("../../db/database");
    const db = getDb();
    const year = String(req.query.year || new Date().getFullYear());
    const countryFilter = req.query.country
      ? String(req.query.country).split(",").map(c => c.trim().toUpperCase()).filter(Boolean)
      : [];

    const params = [year];
    let countryWhere = "";
    if (countryFilter.length > 0) {
      countryWhere = ` AND st.country IN (${countryFilter.map(() => "?").join(",")})`;
      params.push(...countryFilter);
    }

    const rows = db.prepare(`
      SELECT strftime('%Y-%m', st.date) AS mese,
        SUM(st.units_ordered) AS unita,
        SUM(st.ordered_product_sales) AS ricavi,
        SUM(COALESCE(bc.costo, 0) * st.units_ordered) AS costi_prodotto,
        SUM(COALESCE(ff.total_fee, 0) * st.units_ordered) AS fee_amazon,
        COUNT(DISTINCT st.asin) AS asin_count
      FROM sales_traffic st
      LEFT JOIN prodotti p ON p.asin = st.asin
      LEFT JOIN bilancio_catalogo bc ON bc.tipo = 'prodotto' AND bc.id_riferimento = p.id
      LEFT JOIN (SELECT asin, AVG(total_fee) AS total_fee FROM fba_fees GROUP BY asin) ff ON ff.asin = st.asin
      WHERE strftime('%Y', st.date) = ? AND st.units_ordered > 0 ${countryWhere}
      GROUP BY mese
      ORDER BY mese ASC
    `).all(...params);

    // Normalizza tutti i mesi dell'anno (anche quelli senza vendite)
    const monthsMap = new Map();
    for (const r of rows) monthsMap.set(r.mese, r);
    const items = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      const r = monthsMap.get(key);
      const ricavi = +(r?.ricavi || 0).toFixed(2);
      const costi = +(r?.costi_prodotto || 0).toFixed(2);
      const fee = +(r?.fee_amazon || 0).toFixed(2);
      const margine = +(ricavi - costi - fee).toFixed(2);
      const margine_pct = ricavi > 0 ? +(margine / ricavi * 100).toFixed(1) : 0;
      items.push({
        mese: key,
        mese_label: new Date(`${key}-01`).toLocaleDateString("it-IT", { month: "long", year: "numeric" }),
        unita: r?.unita || 0,
        asin_count: r?.asin_count || 0,
        ricavi,
        costi_prodotto: costi,
        fee_amazon: fee,
        costi_totali: +(costi + fee).toFixed(2),
        margine_netto: margine,
        margine_pct,
      });
    }

    const totali = items.reduce((acc, r) => ({
      unita: acc.unita + r.unita,
      ricavi: +(acc.ricavi + r.ricavi).toFixed(2),
      costi_prodotto: +(acc.costi_prodotto + r.costi_prodotto).toFixed(2),
      fee_amazon: +(acc.fee_amazon + r.fee_amazon).toFixed(2),
      costi_totali: +(acc.costi_totali + r.costi_totali).toFixed(2),
      margine_netto: +(acc.margine_netto + r.margine_netto).toFixed(2),
    }), { unita: 0, ricavi: 0, costi_prodotto: 0, fee_amazon: 0, costi_totali: 0, margine_netto: 0 });
    totali.margine_pct = totali.ricavi > 0 ? +(totali.margine_netto / totali.ricavi * 100).toFixed(1) : 0;

    res.json({ ok: true, year: Number(year), country: countryFilter.length ? countryFilter : null, items, totali });
  } catch (err) {
    logger.error({ err }, "Errore pl-monthly");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET → margine per prodotto (legacy, usato da DashboardVendite)
router.get("/sales-traffic/margins", (req, res) => {
  try {
    const { getDb } = require("../../db/database");
    const db = getDb();

    const rows = db.prepare(`
      SELECT
        st.asin,
        st.sku,
        SUM(st.units_ordered) AS unita,
        SUM(st.ordered_product_sales) AS fatturato,
        COALESCE(AVG(ff.total_fee), 0) AS fee_media,
        COALESCE(bc.costo, 0) AS costo_produzione,
        COALESCE(pc.titolo, al.title, '') AS nome
      FROM sales_traffic st
      LEFT JOIN fba_fees ff ON ff.asin = st.asin AND ff.country = st.country
      LEFT JOIN prodotti p ON p.asin = st.asin
      LEFT JOIN bilancio_catalogo bc ON bc.tipo = 'prodotto' AND bc.id_riferimento = p.rowid
      LEFT JOIN product_catalog pc ON pc.asin = st.asin
      LEFT JOIN amazon_listings al ON al.asin = st.asin
      WHERE st.units_ordered > 0 AND st.asin != ''
      GROUP BY st.asin
      ORDER BY fatturato DESC
      LIMIT 50
    `).all();

    const result = rows.map((r) => {
      const feeTotale = (r.fee_media || 0) * (r.unita || 0);
      const costoTotale = (r.costo_produzione || 0) * (r.unita || 0);
      const margine = (r.fatturato || 0) - feeTotale - costoTotale;
      const marginePct = r.fatturato > 0 ? Math.round((margine / r.fatturato) * 100) : 0;
      return {
        asin: r.asin,
        sku: r.sku,
        nome: r.nome || "",
        unita: r.unita,
        fatturato: Math.round(r.fatturato * 100) / 100,
        fee_totale: Math.round(feeTotale * 100) / 100,
        costo_totale: Math.round(costoTotale * 100) / 100,
        margine: Math.round(margine * 100) / 100,
        margine_pct: marginePct,
      };
    });

    res.json({ ok: true, data: result });
  } catch (err) {
    logger.error({ err }, "Errore sales-traffic/margins");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 🔄 POST → genera o aggiorna report commissioni FBA
router.post("/fba-fees/update", async (req, res) => {
  try {
    logger.info("Avvio aggiornamento FBA Fees...");
    // Risposta immediata → evita timeout
    res.json({ ok: true, message: "Aggiornamento FBA Fees avviato in background" });

    // Esecuzione in background
    setImmediate(async () => {
      try {
        const result = await aggiornaFBAFees();
        logger.info(`FBA Fees completato. Record salvati: ${result?.record || 0}`);
      } catch (err) {
        logger.error({ err }, "Errore in background FBA Fees");
      }
    });
  } catch (err) {
    logger.error({ err }, "Errore iniziale aggiornaFBAFees");
    res.status(500).json({
      ok: false,
      error: "Impossibile avviare aggiornamento FBA Fees",
      details: err.message,
    });
  }
});

// 📊 GET → restituisce le commissioni salvate nel DB
router.get("/fba-fees", async (req, res) => {
  try {
    const data = await getFBAFees();
    logger.info(`FBA Fees: ${data.length} record trovati`);
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    logger.error({ err }, "Errore getFBAFees");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 📋 GET /fba-fees/candidates?country=IT — lista ASIN candidati per fetch API (ASIN con prezzo in snapshot)
router.get("/fba-fees/candidates", (req, res) => {
  try {
    const { getDb } = require("../../db/database");
    const db = getDb();
    ensureFbaFeesSchema(); // garantisce esistenza colonne source/price_used

    const country = req.query.country ? String(req.query.country).toUpperCase() : "IT";
    const mktId = Object.entries(MKT_TO_COUNTRY).find(([, c]) => c === country)?.[0];
    if (!mktId) return res.status(400).json({ ok: false, error: "Country non valido" });

    // product_catalog potrebbe non avere image_url in installazioni vecchie: fallback sicuro
    const pcCols = db.pragma("table_info(product_catalog)");
    const pcHasImage = pcCols.some(c => c.name === "image_url");
    const imageSelect = pcHasImage
      ? `(SELECT image_url FROM product_catalog WHERE asin = ls.asin LIMIT 1)`
      : `NULL`;

    const rows = db.prepare(`
      SELECT ls.asin, ls.prezzo, ls.currency, ls.titolo,
        (SELECT sku FROM amazon_listings WHERE asin = ls.asin LIMIT 1) AS sku,
        ${imageSelect} AS image_url,
        (SELECT total_fee FROM fba_fees WHERE asin = ls.asin AND country = ? LIMIT 1) AS fee_attuale,
        (SELECT total_fee_net FROM fba_fees WHERE asin = ls.asin AND country = ? LIMIT 1) AS fee_attuale_net,
        (SELECT source FROM fba_fees WHERE asin = ls.asin AND country = ? LIMIT 1) AS source_attuale,
        (SELECT updated_at FROM fba_fees WHERE asin = ls.asin AND country = ? LIMIT 1) AS updated_at
      FROM listings_snapshot ls
      WHERE ls.marketplace_id = ? AND ls.prezzo IS NOT NULL AND ls.prezzo > 0
      ORDER BY ls.asin
    `).all(country, country, country, country, mktId);

    // Fallback: se fee_attuale_net non è salvato (fee legacy o da formula), lo calcolo al volo
    // dividendo il lordo per (1 + vat_rate) del marketplace corrente.
    const VAT = { IT: 0.22, DE: 0.19, FR: 0.20, ES: 0.21, UK: 0.20, NL: 0.21, BE: 0.21, PL: 0.23, IE: 0.23 };
    const rate = VAT[country] ?? 0.22;
    for (const r of rows) {
      if (r.fee_attuale != null && r.fee_attuale_net == null) {
        r.fee_attuale_net = +(r.fee_attuale / (1 + rate)).toFixed(2);
        r.fee_attuale_net_computed = true; // flag informativo: è calcolato, non salvato
      }
    }

    res.json({ ok: true, country, marketplaceId: mktId, vat_rate: rate, total: rows.length, items: rows });
  } catch (e) {
    logger.error({ err: e }, "Errore fba-fees/candidates");
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 🎯 POST /fba-fees/fetch — interroga Product Fees API per un batch di ASIN
// Body: { items: [{asin, price, marketplaceId}] } — NON salva, solo preview.
router.post("/fba-fees/fetch", async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return res.status(400).json({ ok: false, error: "items vuoto" });
    if (items.length > 50) return res.status(400).json({ ok: false, error: "max 50 ASIN per batch" });

    const results = [];
    for (const it of items) {
      try {
        const r = await fetchFeesEstimateForAsin({
          asin: it.asin, price: it.price, marketplaceId: it.marketplaceId, currency: it.currency || "EUR",
        });
        results.push({ ok: true, sku: it.sku || null, ...r });
      } catch (e) {
        results.push({
          ok: false, asin: it.asin, marketplaceId: it.marketplaceId, sku: it.sku || null,
          error: e.message, status: e.status || null,
        });
      }
      // Rate-limit Product Fees API: ~1 req/s
      await new Promise(r => setTimeout(r, 1100));
    }
    const okCount = results.filter(r => r.ok).length;
    res.json({ ok: true, total: items.length, ok_count: okCount, ko_count: items.length - okCount, results });
  } catch (e) {
    logger.error({ err: e }, "Errore fba-fees/fetch");
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 💾 POST /fba-fees/confirm — salva le fee ricevute nella tabella fba_fees (source='api')
// Body: { items: [{asin, sku?, marketplaceId, referral_fee, fulfillment_fee, total_fee, price_used}] }
router.post("/fba-fees/confirm", (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return res.status(400).json({ ok: false, error: "items vuoto" });
    const result = salvaFeeConfermate(items);
    res.json(result);
  } catch (e) {
    logger.error({ err: e }, "Errore fba-fees/confirm");
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/create", async (req, res) => {
  try {
    const { marketplaceIds, reportType, dataStartTime, dataEndTime } = req.body;
    const ids = marketplaceIds?.length ? marketplaceIds : defaultMarketplaceIds;

    logger.info(`Creazione report: ${reportType || "non specificato"} → ${ids.join(", ")}`);

    const report = await createReport({
      reportType,
      marketplaceIds: ids,
      dataStartTime,
      dataEndTime,
    });

    res.json({ ok: true, report });
  } catch (err) {
    logger.error({ err, data: err.response?.data }, "Errore creazione report");
    res.status(500).json({ error: "Impossibile creare report" });
  }
});

// 📊 2. Stato report
router.get("/status/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params;
    const status = await getReportStatus(reportId);
    res.json(status);
  } catch (err) {
    logger.error({ err, data: err.response?.data }, "Errore stato report");
    res.status(500).json({ error: "Impossibile recuperare stato report" });
  }
});

// 📥 3. Documento report
router.get("/document/:id", async (req, res) => {
  try {
    const { id } = req.params; // può essere reportId o reportDocumentId
    const doc = await getReportDocument(id);
    res.json(doc);
  } catch (err) {
    logger.error({ err, data: err.response?.data }, "Errore documento report");
    res.status(500).json({ error: "Impossibile recuperare documento report" });
  }
});

router.get("/ping", (req, res) => {
  res.json({ ok: true, msg: "pong reports-amazon" });
});

// 📂 4. Catalogo normalizzato da report
router.get("/catalogo/:reportDocumentId", async (req, res) => {
  try {
    const { reportDocumentId } = req.params;

    // 1️⃣ Ottieni info documento e scarica contenuto
    const docInfo = await getReportDocument({ reportId: reportDocumentId });
    const { url, compressionAlgorithm } = docInfo;
    const buffer = await downloadReportDocument({ url, compressionAlgorithm });

    // 2️⃣ Parsing TSV/CSV
    const { parseDelimited } = require("./reportClient");
    const rows = parseDelimited(buffer);

    // 3️⃣ Costruisci mappa normalizzata
    const mappa = {};
    rows.forEach((p) => {
      const asin = p.asin1?.trim();
      if (!asin) return;

      const marketplaceId = p["marketplace-id"] || "APJ6JRA9NG5V4";
      if (!mappa[asin]) {
        mappa[asin] = {
          asin,
          sku: p["seller-sku"],
          nome: p["item-name"],
          descrizione: p["item-description"] || "",
          immagine: null,
          stato: p["status"] || "UNKNOWN",
          fulfillment: p["fulfilment-channel"] || "",
          perPaese: {},
        };
      }

      mappa[asin].perPaese[marketplaceId] = {
        paese: marketplacesMap[marketplaceId] || marketplaceId,
        prezzo: Number(p["price"]) || 0,
        stock: Number(p["quantity"]) || 0,
        buyBox: false,
        stato: p["status"] || "UNKNOWN",
      };
    });

    res.json({ ok: true, count: Object.keys(mappa).length, catalogo: Object.values(mappa) });
  } catch (err) {
    logger.error({ err, data: err.response?.data }, "Errore catalogo");
    res.status(500).json({ error: "Impossibile recuperare catalogo", details: err.message });
  }
});


// 📂 5. Report grezzo
router.get("/download/:reportDocumentId", async (req, res) => {
  try {
    const { reportDocumentId } = req.params;

    // 1️⃣ Ottieni info documento da Amazon
    const docInfo = await getReportDocument({ reportId: reportDocumentId });
    const { url, compressionAlgorithm } = docInfo;

    // 2️⃣ Scarica il file effettivo
    const buffer = await downloadReportDocument({ url, compressionAlgorithm });

    // 3️⃣ Determina se è TSV o JSON
    const { parseJSON, parseDelimited } = require("./reportClient");
    let data = null;
    try {
      data = parseJSON(buffer);
    } catch {
      data = parseDelimited(buffer);
    }

    res.json({ ok: true, count: Array.isArray(data) ? data.length : 1, data });
  } catch (err) {
    logger.error({ err, data: err.response?.data }, "Errore download report");
    res.status(500).json({ error: "Impossibile scaricare report", details: err.message });
  }
});


// 🌍 6. Catalogo diretto da API → dati per un ASIN in tutti i marketplace
router.get("/catalog/:asin/:sku", async (req, res) => {
  try {
    const { asin, sku } = req.params;
    const { getAccessToken } = require("../auth/authService");
    const { access_token } = await getAccessToken();

    const results = await Promise.allSettled(
      defaultMarketplaceIds.map(async (mId) => {
        try {
          const catalog = await getCatalogItem(asin, [mId], access_token);
          const listing = await getListingItem(sku, access_token, [mId]);
          return {
            marketplaceId: mId,
            paese: marketplacesMap[mId] || mId,
            catalog,
            listing,
          };
        } catch (err) {
          return {
            marketplaceId: mId,
            paese: marketplacesMap[mId] || mId,
            error: err.message || "Errore sconosciuto",
          };
        }
      })
    );

    res.json({
      asin,
      sku,
      marketplaces: results.map((r) =>
        r.status === "fulfilled" ? r.value : { error: r.reason }
      ),
    });
  } catch (err) {
    logger.error({ err, data: err.response?.data }, "Errore catalog asin");
    res.status(500).json({ error: "Impossibile recuperare catalog asin" });
  }
});



// 📦 Import modulo FBA stock
const { aggiornaFBAStock, getFBAStock } = require("./fbaStockService");

/**
 * 🧾 GET elenco FBA stock dal DB locale
 */
router.get("/fba-stock", async (req, res) => {
  try {
    const data = await getFBAStock();
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    logger.error({ err }, "Errore getFBAStock");
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/fba-stock/completo", async (req, res) => {
  let db;
  try {
    db = await open({
      filename: getDbPath(),
      driver: sqlite3.Database,
    });

    // 🔹 1️⃣ Prodotti
    const prodotti = await db.all(`
      SELECT asin, nome AS product_name, sku
      FROM prodotti
      WHERE asin IS NOT NULL AND asin != ''
      ORDER BY asin
    `);

    // 🔹 2️⃣ Stock FBA
    const stock = await db.all(`
      SELECT asin, country, quantity, stock_totale
      FROM fba_stock
      ORDER BY asin
    `);

    // 🔹 3️⃣ Mappa lookup
    const stockMap = {};
    for (const r of stock) {
      if (!stockMap[r.asin]) stockMap[r.asin] = [];
      stockMap[r.asin].push({
        country: r.country,
        quantity: Number(r.quantity) || 0,
        stock_totale: Number(r.stock_totale) || 0,
      });
    }

    // 🔹 4️⃣ Merge
    const unione = prodotti.map((p) => {
      const fba = stockMap[p.asin] || [];
      const totale = fba.reduce(
        (sum, s) => sum + Number(s.stock_totale || s.quantity || 0),
        0
      );
      return {
        asin: p.asin,
        sku: p.sku,
        nome: p.product_name,
        stock_globale: totale,
        marketplace: fba,
      };
    });

    res.json({ ok: true, count: unione.length, prodotti: unione });
  } catch (err) {
    logger.error({ err }, "Errore fba-stock/completo");
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (db) await db.close();
  }
});


// 📍 7. Dettagli stock FBA per un singolo ASIN
// 📦 Dettaglio stock FBA per singolo ASIN
router.get("/fba-stock/:asin", async (req, res) => {
  let db;
  try {
    const { asin } = req.params;

    db = await open({
      filename: getDbPath(),
      driver: sqlite3.Database,
    });

    const righe = await db.all(
      `SELECT country,
              quantity,
              stock_totale,
              reserved_qty,
              inbound_working,
              inbound_shipped,
              inbound_receiving,
              unfulfillable_qty
       FROM fba_stock
       WHERE asin = ?
       ORDER BY country`,
      asin
    );

    if (!righe.length) {
      return res.status(404).json({ ok: false, message: "ASIN non trovato nel DB FBA" });
    }

    const stockGlobale = righe.reduce(
      (sum, r) => sum + Number(r.stock_totale || r.quantity || 0),
      0
    );

    const dettagli = righe.map((r) => ({
      country: r.country,
      disponibile: Number(r.quantity) || 0,
      totale: Number(r.stock_totale) || 0,
      riservato: Number(r.reserved_qty) || 0,
      inLavorazione: Number(r.inbound_working) || 0,
      spedito: Number(r.inbound_shipped) || 0,
      inRicezione: Number(r.inbound_receiving) || 0,
      nonGestibile: Number(r.unfulfillable_qty) || 0,
    }));

    res.json({
      ok: true,
      asin,
      count: dettagli.length,
      stock_globale: stockGlobale,
      marketplace: dettagli,
    });
  } catch (err) {
    logger.error({ err }, "Errore get FBA stock per asin");
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (db) await db.close();
  }
});


// 📸 Ottiene l'immagine principale di un ASIN da Amazon SP-API o fallback scraping
router.get("/catalog-image/:asin", async (req, res) => {
  const axios = require("axios");
  const { getAccessToken } = require("../auth/authService");
  const { asin } = req.params;

  try {
    let imageUrl = null;
    const marketplaceId = "APJ6JRA9NG5V4";

    // 🔹 1️⃣ Tentativo SP-API
    try {
      const { access_token } = await getAccessToken();
      const url = `https://sellingpartnerapi-eu.amazon.com/catalog/2022-04-01/items/${asin}?marketplaceIds=${marketplaceId}&includedData=images`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-amz-access-token": access_token,
        },
        timeout: 8000,
      });

      const images =
        response.data?.images ||
        response.data?.data?.attributes?.find((a) => a.name === "images")?.value ||
        [];

      imageUrl =
        images.find((img) => img.variant === "MAIN")?.link ||
        images[0]?.link ||
        null;
    } catch {
      logger.warn(`SP-API: immagine non trovata per ${asin}`);
    }

    // 🔹 2️⃣ Fallback scraping pubblico
    if (!imageUrl) {
      try {
        const html = await axios
          .get(`https://www.amazon.it/dp/${asin}`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 8000,
          })
          .then((r) => r.data);

        const match =
          html.match(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/) ||
          html.match(/"large":"(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/);
        if (match) imageUrl = match[1].replace(/\\u0026/g, "&");
      } catch {
        logger.warn(`Fallback: immagine non trovata per ${asin}`);
      }
    }

    if (!imageUrl) {
      return res.status(404).json({ asin, error: "Nessuna immagine trovata" });
    }

    res.json({ ok: true, asin, image: imageUrl });
  } catch (err) {
    logger.error({ err }, "Errore catalog-image");
    res.status(500).json({ ok: false, error: err.message });
  }
});



/**
 * 🔄 POST per aggiornare FBA stock scaricando il report da Amazon
 */
// 🔄 POST per aggiornare FBA stock (versione SINCRONA)
router.post("/fba-stock/update", async (req, res) => {
  try {
    logger.info("Avvio aggiornamento FBA stock...");
    // ✅ Risposta immediata → evita timeout
    res.json({ ok: true, message: "Aggiornamento FBA stock avviato in background" });

    // 🧠 Esecuzione in background
    setImmediate(async () => {
      try {
        const result = await aggiornaFBAStock();
        logger.info({ data: result }, "Aggiornamento FBA stock completato");
      } catch (err) {
        logger.error({ err }, "Errore in background aggiornaFBAStock");
      }
    });
  } catch (err) {
    logger.error({ err }, "Errore iniziale aggiornaFBAStock");
    res.status(500).json({
      ok: false,
      error: "Impossibile avviare aggiornamento FBA stock",
      details: err.message,
    });
  }
});


// 📊 Unione Catalogo + FBA: mostra tutti i prodotti anche con stock 0




// 📸 Ottiene le immagini principali per tutti gli ASIN direttamente da Amazon SP-API (fallback automatico)
// 📸 Ottiene le immagini principali per tutti gli ASIN (SP-API → fallback → cache)
router.get("/catalog-images/all", async (req, res) => {
  const axios = require("axios");
  const { getAccessToken } = require("../auth/authService");
  let db;

  try {
    const { access_token } = await getAccessToken();
    db = await open({
      filename: getDbPath(),
      driver: sqlite3.Database,
    });

    // 🔹 1️⃣ Recupera ASIN unici da varie fonti
    const prodotti = await db.all(`
      SELECT DISTINCT asin FROM fba_stock WHERE asin IS NOT NULL AND asin != ''
      UNION
      SELECT DISTINCT asin FROM prodotti WHERE asin IS NOT NULL AND asin != ''
      UNION
      SELECT DISTINCT asin FROM catalog_images WHERE asin IS NOT NULL AND asin != ''
    `);

    if (!prodotti.length) {
      return res.json({ ok: true, count: 0, immagini: [] });
    }

    const results = [];
    const marketplaceId = "APJ6JRA9NG5V4";
    const now = new Date().toISOString();

    for (const { asin } of prodotti) {
      let imageUrl = null;

      // 🔹 2️⃣ Cache locale
      const cached = await db.get(
        "SELECT image_url FROM catalog_images WHERE asin = ?",
        asin
      );
      if (cached?.image_url) {
        results.push({ asin, image: cached.image_url, cached: true });
        continue;
      }

      // 🔹 3️⃣ Tentativo SP-API
      try {
        const url = `https://sellingpartnerapi-eu.amazon.com/catalog/2022-04-01/items/${asin}?marketplaceIds=${marketplaceId}&includedData=images`;
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "x-amz-access-token": access_token,
          },
          timeout: 8000,
        });

        const images =
          response.data?.images ||
          response.data?.data?.attributes?.find((a) => a.name === "images")?.value ||
          [];

        imageUrl =
          images.find((img) => img.variant === "MAIN")?.link ||
          images[0]?.link ||
          null;
      } catch (err) {
        logger.warn(`SP-API: immagine non trovata per ${asin}`);
      }

      // 🔹 4️⃣ Fallback pubblico
      if (!imageUrl) {
        try {
          const html = await axios
            .get(`https://www.amazon.it/dp/${asin}`, {
              headers: { "User-Agent": "Mozilla/5.0" },
              timeout: 8000,
            })
            .then((r) => r.data);

          const match =
            html.match(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/) ||
            html.match(/"large":"(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/);

          if (match) imageUrl = match[1].replace(/\\u0026/g, "&");
        } catch {
          logger.warn(`Fallback: nessuna immagine trovata per ${asin}`);
        }
      }

      // 🔹 5️⃣ Cache DB
      if (imageUrl) {
        await db.run(
          `INSERT OR REPLACE INTO catalog_images (asin, image_url, last_update)
           VALUES (?, ?, ?)`,
          asin,
          imageUrl,
          now
        );
        results.push({ asin, image: imageUrl, cached: false });
      }
    }

    res.json({ ok: true, count: results.length, immagini: results });
  } catch (err) {
    logger.error({ err }, "Errore catalog-images/all");
    res.status(500).json({
      ok: false,
      error: "Impossibile recuperare immagini globali",
      details: err.message,
    });
  } finally {
    if (db) await db.close();
  }
});

// ============================================================
// 🔄 POST → Sincronizza SKU da Amazon (GET_MERCHANT_LISTINGS_ALL_DATA)
// ============================================================
router.post("/sync-sku", async (req, res) => {
  let db;
  try {
    logger.info("Avvio sincronizzazione SKU da Amazon...");

    // Risposta immediata
    res.json({ ok: true, message: "Sincronizzazione SKU avviata in background" });

    // Esecuzione in background
    setImmediate(async () => {
      try {
        const { getAccessToken } = require("../auth/authService");
        const { access_token } = await getAccessToken();

        // 1️⃣ Crea il report
        logger.info("Creazione report GET_MERCHANT_LISTINGS_ALL_DATA...");
        const reportResponse = await createReport({
          reportType: "GET_FLAT_FILE_OPEN_LISTINGS_DATA",
          marketplaceIds: defaultMarketplaceIds,
        });

        const reportId = reportResponse?.reportId;
        if (!reportId) {
          logger.error("Nessun reportId ricevuto");
          return;
        }
        logger.info(`Report creato: ${reportId}`);

        // 2️⃣ Attendi che il report sia pronto (polling)
        let status = null;
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 10000)); // Attendi 10 secondi
          status = await getReportStatus(reportId);
          logger.info(`Stato report: ${status?.processingStatus} (tentativo ${attempts + 1}/${maxAttempts})`);

          if (status?.processingStatus === "DONE") break;
          if (status?.processingStatus === "FATAL" || status?.processingStatus === "CANCELLED") {
            logger.error(`Report fallito: ${status?.processingStatus}`);
            return;
          }
          attempts++;
        }

        if (status?.processingStatus !== "DONE") {
          logger.error("Timeout: report non completato");
          return;
        }

        // 3️⃣ Scarica il documento
        const reportDocumentId = status?.reportDocumentId;
        if (!reportDocumentId) {
          logger.error("Nessun reportDocumentId");
          return;
        }

        logger.info(`Download documento: ${reportDocumentId}`);
        const docInfo = await getReportDocument({ reportId: reportDocumentId });
        const buffer = await downloadReportDocument({
          url: docInfo.url,
          compressionAlgorithm: docInfo.compressionAlgorithm,
        });

        // 4️⃣ Parsing TSV
        const { parseDelimited } = require("./reportClient");
        const rows = parseDelimited(buffer);
        logger.info(`Righe trovate nel report: ${rows.length}`);

        // 5️⃣ Aggiorna DB
        db = await open({
          filename: getDbPath(),
          driver: sqlite3.Database,
        });

        let updated = 0;
        for (const row of rows) {
          const asin = row["asin1"] || row["asin"];
          const sku = row["seller-sku"] || row["sku"];

          if (asin && sku) {
            const result = await db.run(
              `UPDATE prodotti SET sku = ? WHERE asin = ? AND (sku IS NULL OR sku = '')`,
              sku,
              asin
            );
            if (result.changes > 0) {
              updated++;
              logger.info(`SKU aggiornato: ${asin} → ${sku}`);
            }
          }
        }

        logger.info(`Sincronizzazione completata! SKU aggiornati: ${updated}`);
      } catch (err) {
        logger.error({ err }, "Errore sincronizzazione SKU");
      } finally {
        if (db) await db.close();
      }
    });
  } catch (err) {
    logger.error({ err }, "Errore iniziale sync-sku");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 📊 GET → Verifica stato SKU nel DB
router.get("/sku-status", async (req, res) => {
  let db;
  try {
    db = await open({
      filename: getDbPath(),
      driver: sqlite3.Database,
    });

    const totale = await db.get(`SELECT COUNT(*) as count FROM prodotti`);
    const conSku = await db.get(`SELECT COUNT(*) as count FROM prodotti WHERE sku IS NOT NULL AND sku != ''`);
    const senzaSku = await db.get(`SELECT COUNT(*) as count FROM prodotti WHERE sku IS NULL OR sku = ''`);

    res.json({
      ok: true,
      totale: totale.count,
      conSku: conSku.count,
      senzaSku: senzaSku.count,
      percentuale: Math.round((conSku.count / totale.count) * 100) + "%",
    });
  } catch (err) {
    logger.error({ err }, "Errore sku-status");
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (db) await db.close();
  }
});





module.exports = router;
