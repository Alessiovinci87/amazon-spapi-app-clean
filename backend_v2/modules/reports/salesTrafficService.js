// backend_v2/modules/reports/salesTrafficService.js
const zlib = require("zlib");
const axios = require("axios");
const { getAccessToken } = require("../auth/authService");
const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";
const MARKETPLACES = {
  IT: "APJ6JRA9NG5V4",
  FR: "A13V1IB3VIYZZH",
  ES: "A1RKKUPIHCS9HS",
  DE: "A1PA6795UKMFR9",
  UK: "A1F83G8C2ARO7P",
  NL: "A1805IZSGTT6HS",
  BE: "AMEN7PMS3EDWL",
  PL: "A1C3SOZRARQ6R3",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

let _tableEnsured = false;
function ensureTable() {
  if (_tableEnsured) return;
  const db = getDb();
  // Tabella per dettaglio ASIN (aggregato periodo intero)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sales_traffic (
      asin TEXT,
      sku TEXT,
      country TEXT,
      units_ordered INTEGER DEFAULT 0,
      ordered_product_sales REAL DEFAULT 0,
      average_sales_per_unit REAL DEFAULT 0,
      conversion_rate REAL DEFAULT 0,
      sessions INTEGER DEFAULT 0,
      page_views INTEGER DEFAULT 0,
      date TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (asin, country, date)
    );
  `).run();
  // Tabella per dati giornalieri aggregati (da salesAndTrafficByDate)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sales_daily (
      country TEXT NOT NULL,
      date TEXT NOT NULL,
      units_ordered INTEGER DEFAULT 0,
      ordered_product_sales REAL DEFAULT 0,
      sessions INTEGER DEFAULT 0,
      page_views INTEGER DEFAULT 0,
      unit_session_percentage REAL DEFAULT 0,
      order_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (country, date)
    );
  `).run();
  _tableEnsured = true;
}

// Cerca report vendite gia completato (ultime 24h)
async function checkExistingReport(access_token, marketplaceId) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await axios.get(`${BASE_URL}/reports/2021-06-30/reports`, {
      params: {
        reportTypes: "GET_SALES_AND_TRAFFIC_REPORT",
        processingStatuses: "DONE",
        marketplaceIds: marketplaceId,
        createdSince: since,
      },
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
      },
    });
    const reports = res.data?.reports || [];
    if (!reports.length) return null;
    const latest = reports.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    )[0];
    logger.info(`[SalesTraffic] Report pronto: ${latest.reportId}`);
    return latest;
  } catch (err) {
    logger.warn("[SalesTraffic] checkExistingReport:", err.message);
    return null;
  }
}

// Aggiorna dati di vendita e traffico
// force=true bypassa il check "skip se aggiornato <12h fa" (usato dai cron schedulati,
// che devono sempre andare in fondo per pescare il dato T-2 di Amazon).
async function aggiornaSalesTraffic({ force = false } = {}) {
  logger.info(`[SalesTraffic] Avvio aggiornamento${force ? " (force)" : ""}...`);
  ensureTable();

  const db = getDb();
  const today = todayISO();
  let totalInserted = 0;

  const insertAsinStmt = db.prepare(`
    INSERT OR REPLACE INTO sales_traffic
    (asin, sku, country, units_ordered, ordered_product_sales,
     average_sales_per_unit, conversion_rate, sessions, page_views, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertDailyStmt = db.prepare(`
    INSERT OR REPLACE INTO sales_daily
    (country, date, units_ordered, ordered_product_sales, sessions, page_views, unit_session_percentage, order_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [country, marketplaceId] of Object.entries(MARKETPLACES)) {
    logger.info(`[SalesTraffic] Marketplace: ${country}`);

    // Skip se abbiamo gia molti giorni di dati per questo country e aggiornamento recente
    const dataCount = db.prepare(
      "SELECT COUNT(DISTINCT date) AS days FROM sales_daily WHERE country = ?"
    ).get(country);

    if (!force && dataCount && dataCount.days >= 30) {
      const lastUpdate = db.prepare(
        "SELECT MAX(created_at) AS last_ts FROM sales_daily WHERE country = ?"
      ).get(country);
      if (lastUpdate?.last_ts) {
        const hoursSince = (Date.now() - new Date(lastUpdate.last_ts).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 12) {
          logger.info(`[SalesTraffic] ${country}: ${dataCount.days} giorni in DB, aggiornato ${hoursSince.toFixed(1)}h fa, skip`);
          continue;
        }
      }
    }

    let success = false;
    let attempt = 0;
    let lastError = null;

    while (!success && attempt < 2) {
      attempt++;
      try {
        const { access_token } = await getAccessToken();

        // Verifica se c'e gia un report pronto
        let reportId = null;
        let reportDocumentId = null;
        {
          // Crea sempre un nuovo report (periodo: ultimi 365 giorni)
          const now = new Date();
          const startDate = new Date(now);
          startDate.setDate(now.getDate() - 365);

          const createRes = await axios.post(
            `${BASE_URL}/reports/2021-06-30/reports`,
            {
              reportType: "GET_SALES_AND_TRAFFIC_REPORT",
              dataStartTime: startDate.toISOString(),
              dataEndTime: now.toISOString(),
              marketplaceIds: [marketplaceId],
              reportOptions: { dateGranularity: "DAY", asinGranularity: "SKU" },
            },
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
                "x-amz-access-token": access_token,
                "Content-Type": "application/json",
              },
            }
          );

          reportId = createRes.data.reportId;
          logger.info(`[SalesTraffic] Creato report ${reportId} (${country})`);

          // Attendi completamento
          let status = "IN_PROGRESS";
          for (let i = 0; i < 30; i++) {
            await sleep(8000);
            const res = await axios.get(
              `${BASE_URL}/reports/2021-06-30/reports/${reportId}`,
              { headers: { Authorization: `Bearer ${access_token}`, "x-amz-access-token": access_token } }
            );
            status = res.data.processingStatus;
            reportDocumentId = res.data.reportDocumentId;
            if (status === "DONE") break;
            if (["CANCELLED", "FATAL"].includes(status)) break;
          }
          if (!reportDocumentId) throw new Error("Report non completato");
        }

        // Scarica e decomprimi
        logger.info(`[SalesTraffic] Scarico documento ${reportDocumentId}...`);
        const freshToken = (await getAccessToken()).access_token;
        const metaRes = await axios.get(
          `${BASE_URL}/reports/2021-06-30/documents/${reportDocumentId}`,
          {
            headers: {
              Authorization: `Bearer ${freshToken}`,
              "x-amz-access-token": freshToken,
            },
          }
        );
        const { url, compressionAlgorithm } = metaRes.data;
        const fileRes = await axios.get(url, { responseType: "arraybuffer" });

        let buffer = Buffer.from(fileRes.data);
        if (compressionAlgorithm === "GZIP") buffer = zlib.gunzipSync(buffer);
        const text = buffer.toString("utf-8");

        // Parsing JSON
        const json = JSON.parse(text);

        // Amazon restituisce DUE sezioni indipendenti:
        // 1. salesAndTrafficByDate → aggregati giornalieri (totali per giorno) → salva in sales_daily
        // 2. salesAndTrafficByAsin → dettaglio per ASIN (aggregato periodo intero) → salva in sales_traffic
        let insertedDaily = 0;
        let insertedAsin = 0;

        // --- SEZIONE 1: dati giornalieri (sales_daily) ---
        if (Array.isArray(json?.salesAndTrafficByDate)) {
          const insertDailyTx = db.transaction((rows) => {
            for (const dayData of rows) {
              const dayDate = dayData.date;
              if (!dayDate) continue;
              const sales = dayData.salesByDate || {};
              const traffic = dayData.trafficByDate || {};
              insertDailyStmt.run(
                country,
                dayDate,
                sales.unitsOrdered || 0,
                sales.orderedProductSales?.amount || 0,
                traffic.sessions || 0,
                traffic.pageViews || 0,
                traffic.unitSessionPercentage || 0,
                sales.orderCount || sales.ordersPlaced || 0
              );
              insertedDaily++;
            }
          });
          insertDailyTx(json.salesAndTrafficByDate);
          logger.info(`[SalesTraffic] ${country}: ${insertedDaily} giorni salvati in sales_daily`);
        }

        // --- SEZIONE 2: dettaglio per ASIN (sales_traffic) ---
        const asinRows = Array.isArray(json?.salesAndTrafficByAsin)
          ? json.salesAndTrafficByAsin : [];

        if (asinRows.length) {
          const insertAsinTx = db.transaction((rows) => {
            for (const r of rows) {
              const asin = r.parentAsin || r.childAsin || "";
              const stats = r.salesByAsin || {};
              const traffic = r.trafficByAsin || {};
              insertAsinStmt.run(
                asin,
                r.sku || "",
                country,
                stats.unitsOrdered || 0,
                stats.orderedProductSales?.amount || 0,
                stats.unitsOrdered
                  ? (stats.orderedProductSales?.amount || 0) / stats.unitsOrdered
                  : 0,
                traffic.unitSessionPercentage || 0,
                traffic.sessions || 0,
                traffic.pageViews || 0,
                today // ASIN data è aggregata sull'intero periodo
              );
              insertedAsin++;
            }
          });
          insertAsinTx(asinRows);
        }

        if (!insertedDaily && !insertedAsin) {
          logger.warn(`[SalesTraffic] Nessun dato nel report per ${country}`);
          break;
        }

        logger.info(`[SalesTraffic] ${country}: ${insertedAsin} ASIN salvati in sales_traffic`);
        totalInserted += insertedDaily + insertedAsin;
        success = true;
      } catch (err) {
        lastError = err;
        const code = err.response?.status;
        const amzMsg = err.response?.data?.errors?.[0]?.message || err.response?.data;
        if (code === 429 || code === 403) {
          logger.warn(`[SalesTraffic] Limite per ${country} (${code}): ${amzMsg || err.message}`);
          if (attempt < 2) {
            logger.warn(`[SalesTraffic] Retry tra 90s...`);
            await sleep(90000);
          }
        } else {
          logger.warn(`[SalesTraffic] Errore ${country} (${code || "?"}):`, amzMsg || err.message);
          break;
        }
      }
    }

    if (!success) {
      logger.error(`[SalesTraffic] Fallito ${country} dopo ${attempt} tentativi:`, lastError?.message);
    }

    logger.info("[SalesTraffic] Pausa 60s prima del prossimo marketplace...");
    await sleep(60000);
  }

  logger.info(`[SalesTraffic] Totale righe salvate: ${totalInserted}`);
  return { ok: true, record: totalInserted };
}

// GET vendite dal DB
function getSalesTraffic() {
  ensureTable();
  const db = getDb();
  return db.prepare("SELECT * FROM sales_traffic ORDER BY date DESC, asin, country").all();
}

// =====================================================
// STIMA GIORNALIERA PER ASIN (nessuna API, calcolo proporzionale)
// Usa: sales_traffic (annuo per ASIN×paese) + sales_daily (giornaliero per paese)
// Formula: asin_day = (asin_year / country_year) × country_day
// =====================================================

/**
 * Stima le vendite per ASIN in un range di date, distribuendo proporzionalmente
 * i dati annuali per ASIN in base ai totali giornalieri per paese.
 * @param {string} [from] - data inizio YYYY-MM-DD
 * @param {string} [to] - data fine YYYY-MM-DD
 * @param {string[]} [countries] - filtro paesi
 * @returns {Object[]} - righe con asin, sku, unita, fatturato, sessioni, visualizzazioni
 */
function getAsinSalesForPeriod(from, to, countries = []) {
  const db = getDb();

  // 1. Totali annui per paese (da sales_daily, per calcolare le proporzioni)
  const countryTotals = {};
  const totalRows = db.prepare(
    "SELECT country, SUM(units_ordered) AS tot_u, SUM(ordered_product_sales) AS tot_f, SUM(sessions) AS tot_s, SUM(page_views) AS tot_pv FROM sales_daily GROUP BY country"
  ).all();
  for (const r of totalRows) countryTotals[r.country] = r;

  // 2. Totali giornalieri per paese nel periodo richiesto
  let dateFilter = "";
  const dateParams = [];
  if (from) { dateFilter += " AND date >= ?"; dateParams.push(from); }
  if (to) { dateFilter += " AND date <= ?"; dateParams.push(to); }

  let countryIn = "";
  if (countries.length > 0) {
    countryIn = ` AND country IN (${countries.map(() => "?").join(",")})`;
    dateParams.push(...countries);
  }

  const periodTotals = {};
  const periodRows = db.prepare(
    `SELECT country, SUM(units_ordered) AS p_u, SUM(ordered_product_sales) AS p_f, SUM(sessions) AS p_s, SUM(page_views) AS p_pv FROM sales_daily WHERE 1=1${dateFilter}${countryIn} GROUP BY country`
  ).all(...dateParams);
  for (const r of periodRows) periodTotals[r.country] = r;

  // 3. Vendite annuali per ASIN×paese
  let stCountryFilter = "";
  const stParams = [];
  if (countries.length > 0) {
    stCountryFilter = ` AND country IN (${countries.map(() => "?").join(",")})`;
    stParams.push(...countries);
  }

  const asinRows = db.prepare(
    `SELECT asin, sku, country, units_ordered, ordered_product_sales, sessions, page_views FROM sales_traffic WHERE asin IS NOT NULL AND asin != '' AND units_ordered > 0${stCountryFilter}`
  ).all(...stParams);

  // 4. Calcola stima proporzionale
  const asinMap = {}; // asin → { unita, fatturato, sessioni, visualizzazioni }

  for (const r of asinRows) {
    const ct = countryTotals[r.country];
    const pt = periodTotals[r.country];
    if (!ct || !pt) continue; // no data per questo paese

    // Proporzione: quanto del totale annuo cade nel periodo selezionato
    const ratioU = ct.tot_u > 0 ? pt.p_u / ct.tot_u : 0;
    const ratioF = ct.tot_f > 0 ? pt.p_f / ct.tot_f : 0;
    const ratioS = ct.tot_s > 0 ? pt.p_s / ct.tot_s : 0;
    const ratioPV = ct.tot_pv > 0 ? pt.p_pv / ct.tot_pv : 0;

    if (!asinMap[r.asin]) asinMap[r.asin] = { asin: r.asin, sku: r.sku || "", unita: 0, fatturato: 0, sessioni: 0, visualizzazioni: 0 };
    asinMap[r.asin].unita += Math.round(r.units_ordered * ratioU);
    asinMap[r.asin].fatturato += r.ordered_product_sales * ratioF;
    asinMap[r.asin].sessioni += Math.round((r.sessions || 0) * ratioS);
    asinMap[r.asin].visualizzazioni += Math.round((r.page_views || 0) * ratioPV);
  }

  return Object.values(asinMap);
}

// (Legacy: ensureAsinDailyTable mantenuta per compatibilità, non più usata attivamente)
function ensureAsinDailyTable() {
  const db = getDb();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sales_asin_daily (
      asin TEXT NOT NULL,
      sku TEXT DEFAULT '',
      country TEXT NOT NULL,
      date TEXT NOT NULL,
      units_ordered INTEGER DEFAULT 0,
      ordered_product_sales REAL DEFAULT 0,
      sessions INTEGER DEFAULT 0,
      page_views INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (asin, country, date)
    )
  `).run();
}

/**
 * Sync ASIN sales per un singolo giorno e un singolo marketplace.
 * Richiede un report GET_SALES_AND_TRAFFIC_REPORT con finestra 1 giorno.
 */
async function syncAsinForDay(country, marketplaceId, targetDate) {
  const db = getDb();
  const startDate = new Date(targetDate + "T00:00:00Z");
  const endDate = new Date(targetDate + "T23:59:59Z");

  const { access_token } = await getAccessToken();

  // Crea report per 1 giorno
  const createRes = await axios.post(
    `${BASE_URL}/reports/2021-06-30/reports`,
    {
      reportType: "GET_SALES_AND_TRAFFIC_REPORT",
      dataStartTime: startDate.toISOString(),
      dataEndTime: endDate.toISOString(),
      marketplaceIds: [marketplaceId],
      reportOptions: { dateGranularity: "DAY", asinGranularity: "SKU" },
    },
    { headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" } }
  );

  const reportId = createRes.data.reportId;
  logger.info(`[AsinDaily] Report ${reportId} creato per ${country} ${targetDate}`);

  // Attendi completamento
  let reportDocumentId;
  for (let i = 0; i < 30; i++) {
    await sleep(8000);
    const freshToken = (await getAccessToken()).access_token;
    const statusRes = await axios.get(
      `${BASE_URL}/reports/2021-06-30/reports/${reportId}`,
      { headers: { Authorization: `Bearer ${freshToken}` } }
    );
    if (statusRes.data.processingStatus === "DONE") {
      reportDocumentId = statusRes.data.reportDocumentId;
      break;
    }
    if (["CANCELLED", "FATAL"].includes(statusRes.data.processingStatus)) break;
  }
  if (!reportDocumentId) throw new Error(`Report non completato per ${country} ${targetDate}`);

  // Scarica
  const dlToken = (await getAccessToken()).access_token;
  const meta = await axios.get(
    `${BASE_URL}/reports/2021-06-30/documents/${reportDocumentId}`,
    { headers: { Authorization: `Bearer ${dlToken}` } }
  );
  const { url, compressionAlgorithm } = meta.data;
  const file = await axios.get(url, { responseType: "arraybuffer" });
  let buffer = Buffer.from(file.data);
  if (compressionAlgorithm === "GZIP") buffer = require("zlib").gunzipSync(buffer);
  const json = JSON.parse(buffer.toString("utf-8"));

  // Parsing per ASIN
  const asinRows = Array.isArray(json?.salesAndTrafficByAsin) ? json.salesAndTrafficByAsin : [];
  if (asinRows.length === 0) return 0;

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO sales_asin_daily
    (asin, sku, country, date, units_ordered, ordered_product_sales, sessions, page_views)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((rows) => {
    for (const r of rows) {
      const asin = r.parentAsin || r.childAsin || "";
      if (!asin) continue;
      const sales = r.salesByAsin || {};
      const traffic = r.trafficByAsin || {};
      upsert.run(
        asin, r.sku || "", country, targetDate,
        sales.unitsOrdered || 0,
        sales.orderedProductSales?.amount || 0,
        traffic.sessions || 0,
        traffic.pageViews || 0
      );
    }
  });
  tx(asinRows);

  return asinRows.length;
}

/**
 * Sync giornaliero: scarica i dati ASIN di ieri per tutti i marketplace.
 */
async function syncAsinDaily() {
  ensureAsinDailyTable();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = yesterday.toISOString().slice(0, 10);

  logger.info(`[AsinDaily] Sync dati ASIN per ${targetDate}...`);
  let totalInserted = 0;

  for (const [country, marketplaceId] of Object.entries(MARKETPLACES)) {
    // Skip se già sincronizzato
    const db = getDb();
    const existing = db.prepare(
      "SELECT COUNT(*) as n FROM sales_asin_daily WHERE country = ? AND date = ?"
    ).get(country, targetDate);
    if (existing.n > 0) {
      logger.info(`[AsinDaily] ${country} ${targetDate} già sincronizzato (${existing.n} ASIN), skip`);
      continue;
    }

    try {
      const count = await syncAsinForDay(country, marketplaceId, targetDate);
      logger.info(`[AsinDaily] ${country} ${targetDate}: ${count} ASIN salvati`);
      totalInserted += count;
    } catch (err) {
      const code = err.response?.status;
      logger.warn(`[AsinDaily] Errore ${country} ${targetDate} (HTTP ${code}): ${err.message}`);
    }

    // Pausa tra marketplace
    await sleep(45000);
  }

  logger.info(`[AsinDaily] Completato. Totale: ${totalInserted} righe.`);
  return { ok: true, record: totalInserted };
}

/**
 * Backfill: riempi gli ultimi N giorni. Ogni giorno per ogni marketplace.
 * Attenzione: molte chiamate API, usare con cautela.
 */
async function backfillAsinDaily(days = 7) {
  ensureAsinDailyTable();
  logger.info(`[AsinDaily] Backfill ultimi ${days} giorni...`);

  let totalInserted = 0;
  const dates = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  for (const targetDate of dates) {
    for (const [country, marketplaceId] of Object.entries(MARKETPLACES)) {
      const db = getDb();
      const existing = db.prepare(
        "SELECT COUNT(*) as n FROM sales_asin_daily WHERE country = ? AND date = ?"
      ).get(country, targetDate);
      if (existing.n > 0) continue; // già presente

      try {
        const count = await syncAsinForDay(country, marketplaceId, targetDate);
        logger.info(`[AsinDaily] Backfill ${country} ${targetDate}: ${count} ASIN`);
        totalInserted += count;
      } catch (err) {
        logger.warn(`[AsinDaily] Backfill errore ${country} ${targetDate}: ${err.message}`);
      }

      await sleep(45000);
    }
  }

  logger.info(`[AsinDaily] Backfill completato. ${totalInserted} righe totali.`);
  return { ok: true, record: totalInserted };
}

module.exports = { aggiornaSalesTraffic, getSalesTraffic, getAsinSalesForPeriod, syncAsinDaily, backfillAsinDaily };
