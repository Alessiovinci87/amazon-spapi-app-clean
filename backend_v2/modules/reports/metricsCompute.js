// metricsCompute.js
// Compute job che popola asin_daily_metrics da:
//  - amazon_order_cache (orders live, per giorni recenti)
//  - sales_traffic + sales_daily (consolidato T-2, per giorni passati)
//  - fba_fees (commissioni Amazon)
//  - bilancio_catalogo + prodotti (costo unitario)

const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");

const MP_TO_CC = {
  "APJ6JRA9NG5V4": "IT",
  "A13V1IB3VIYZZH": "FR",
  "A1RKKUPIHCS9HS": "ES",
  "A1PA6795UKMFR9": "DE",
  "A1F83G8C2ARO7P": "UK",
  "A1805IZSGTT6HS": "NL",
  "AMEN7PMS3EDWL":  "BE",
  "A1C3SOZRARQ6R3": "PL",
};

function ymdAddDays(ymd, n) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayItYmd() {
  const off = new Date();
  off.setHours(off.getHours() + (off.getTimezoneOffset() / 60) + 2);
  return off.toISOString().slice(0, 10);
}

// Carica costi e fee per ASIN (una sola lettura per chiamata, riusati).
function loadEnrichments(db) {
  const costMap = new Map();
  db.prepare(`
    SELECT p.asin, bc.costo
    FROM bilancio_catalogo bc
    JOIN prodotti p ON bc.tipo = 'prodotto' AND bc.id_riferimento = p.id
    WHERE p.asin IS NOT NULL AND p.asin != ''
  `).all().forEach(r => costMap.set(r.asin, r.costo || 0));

  const feeMap = new Map(); // key = `${asin}|${country}`
  db.prepare(`
    SELECT asin, country, AVG(total_fee) AS fee
    FROM fba_fees
    WHERE asin IS NOT NULL AND asin != ''
    GROUP BY asin, country
  `).all().forEach(r => feeMap.set(`${r.asin}|${r.country}`, r.fee || 0));

  // Fallback: fee media per country (se ASIN specifico non ha fee)
  const feeAvgByCountry = new Map();
  db.prepare(`
    SELECT country, AVG(total_fee) AS fee
    FROM fba_fees
    WHERE country IS NOT NULL
    GROUP BY country
  `).all().forEach(r => feeAvgByCountry.set(r.country, r.fee || 0));

  return { costMap, feeMap, feeAvgByCountry };
}

// Calcola metriche per un singolo giorno e fa upsert.
// Strategia:
//  - Se sales_daily ha dati per (date, country) → usa quello (consolidato)
//  - Altrimenti aggrega amazon_order_cache (live, ASIN da firstAsin)
function computeDay(db, ymd, enrichments) {
  const { costMap, feeMap, feeAvgByCountry } = enrichments;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  // 1. Country che hanno sales_daily per questo giorno (consolidato)
  const consolidatedCountries = new Set(
    db.prepare("SELECT DISTINCT country FROM sales_daily WHERE date = ?").all(ymd).map(r => r.country)
  );

  // 2. Per i country consolidati: stima per-ASIN proporzionale da sales_traffic (annuo)
  for (const country of consolidatedCountries) {
    const dayTotal = db.prepare(`
      SELECT SUM(units_ordered) AS u, SUM(ordered_product_sales) AS f
      FROM sales_daily WHERE country = ? AND date = ?
    `).get(country, ymd);
    if (!dayTotal || !dayTotal.u) continue;

    const yearTotal = db.prepare(`
      SELECT SUM(units_ordered) AS u, SUM(ordered_product_sales) AS f
      FROM sales_daily WHERE country = ?
    `).get(country);
    if (!yearTotal || !yearTotal.u) continue;

    const ratioU = dayTotal.u / yearTotal.u;
    const ratioF = dayTotal.f / yearTotal.f;

    const asinAnnual = db.prepare(`
      SELECT asin, SUM(units_ordered) AS u, SUM(ordered_product_sales) AS f
      FROM sales_traffic
      WHERE country = ? AND asin IS NOT NULL AND asin != ''
      GROUP BY asin
    `).all(country);

    const upsert = db.prepare(`
      INSERT INTO asin_daily_metrics
        (asin, country, metric_date, units, revenue, fee_total, cost_total, margin, source, computed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sales_daily', ?)
      ON CONFLICT(asin, country, metric_date) DO UPDATE SET
        units = excluded.units, revenue = excluded.revenue,
        fee_total = excluded.fee_total, cost_total = excluded.cost_total,
        margin = excluded.margin, source = excluded.source, computed_at = excluded.computed_at
    `);

    const tx = db.transaction((rows) => {
      for (const r of rows) {
        const units = Math.round(r.u * ratioU);
        if (units === 0) continue;
        const revenue = Math.round((r.f * ratioF) * 100) / 100;
        const feePerUnit = feeMap.get(`${r.asin}|${country}`) ?? feeAvgByCountry.get(country) ?? 0;
        const costPerUnit = costMap.get(r.asin) ?? 0;
        const fee = Math.round(feePerUnit * units * 100) / 100;
        const cost = Math.round(costPerUnit * units * 100) / 100;
        const margin = Math.round((revenue - fee - cost) * 100) / 100;
        upsert.run(r.asin, country, ymd, units, revenue, fee, cost, margin, now);
      }
    });
    tx(asinAnnual);
  }

  // 3. Per i country NON in sales_daily: aggrega da amazon_order_cache
  const liveRows = db.prepare(`
    SELECT marketplace_id, asin,
      COUNT(*) AS orders,
      COALESCE(SUM(units), 0) AS units,
      COALESCE(SUM(revenue), 0) AS revenue
    FROM amazon_order_cache
    WHERE DATE(purchase_date) = ?
      AND COALESCE(status, '') != 'Canceled'
      AND asin IS NOT NULL AND asin != ''
    GROUP BY marketplace_id, asin
  `).all(ymd);

  const upsertLive = db.prepare(`
    INSERT INTO asin_daily_metrics
      (asin, country, metric_date, units, revenue, fee_total, cost_total, margin, source, computed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'orders_live', ?)
    ON CONFLICT(asin, country, metric_date) DO UPDATE SET
      units = excluded.units, revenue = excluded.revenue,
      fee_total = excluded.fee_total, cost_total = excluded.cost_total,
      margin = excluded.margin, source = excluded.source, computed_at = excluded.computed_at
  `);

  const txLive = db.transaction((rows) => {
    for (const r of rows) {
      const country = MP_TO_CC[r.marketplace_id];
      if (!country) continue;
      // Se questo country è già in sales_daily, skip (ha priorità)
      if (consolidatedCountries.has(country)) continue;
      const units = r.units || 0;
      const revenue = Math.round((r.revenue || 0) * 100) / 100;
      const feePerUnit = feeMap.get(`${r.asin}|${country}`) ?? feeAvgByCountry.get(country) ?? 0;
      const costPerUnit = costMap.get(r.asin) ?? 0;
      const fee = Math.round(feePerUnit * units * 100) / 100;
      const cost = Math.round(costPerUnit * units * 100) / 100;
      const margin = Math.round((revenue - fee - cost) * 100) / 100;
      upsertLive.run(r.asin, country, ymd, units, revenue, fee, cost, margin, now);
    }
  });
  txLive(liveRows);

  // 4. Pulizia: rimuovi righe metric_date=ymd per ASIN non più presenti né
  //    in sales_traffic né in amazon_order_cache (es. ordini cancellati).
  //    Per semplicità saltiamo questo step nell'MVP — i dati stantii vengono
  //    sovrascritti al prossimo run del giorno.
}

function computeAsinDailyMetricsForRange(fromYmd, toYmd) {
  const db = getDb();
  const enrichments = loadEnrichments(db);
  let cursor = fromYmd;
  let days = 0;
  while (cursor <= toYmd) {
    computeDay(db, cursor, enrichments);
    cursor = ymdAddDays(cursor, 1);
    days++;
  }
  logger.info(`[Metrics] computed ${days} days (${fromYmd}..${toYmd})`);
  return { days };
}

function computeMetricsLast7Days() {
  const today = todayItYmd();
  const from = ymdAddDays(today, -7);
  return computeAsinDailyMetricsForRange(from, today);
}

module.exports = {
  computeAsinDailyMetricsForRange,
  computeMetricsLast7Days,
};
