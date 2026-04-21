// backend_v2/modules/returns/returnsService.js
// Servizio per scaricare i resi FBA via SP-API Reports
// Report: GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA (TSV)

const axios = require("axios");
const zlib = require("zlib");
const { getAccessToken } = require("../auth/authService");
const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MARKETPLACES = [
  { code: "IT", marketplaceId: "APJ6JRA9NG5V4" },
  { code: "FR", marketplaceId: "A13V1IB3VIYZZH" },
  { code: "ES", marketplaceId: "A1RKKUPIHCS9HS" },
  { code: "DE", marketplaceId: "A1PA6795UKMFR9" },
  { code: "UK", marketplaceId: "A1F83G8C2ARO7P" },
  { code: "NL", marketplaceId: "A1805IZSGTT6HS" },
  { code: "BE", marketplaceId: "AMEN7PMS3EDWL" },
  { code: "PL", marketplaceId: "A1C3SOZRARQ6R3" },
];

const MP_TO_COUNTRY = Object.fromEntries(MARKETPLACES.map((m) => [m.marketplaceId, m.code]));

/**
 * Crea un report resi FBA.
 * @param {string[]} marketplaceIds
 * @param {object} opts - { dataStartTime, dataEndTime } ISO8601
 */
async function createReturnsReport(marketplaceIds, opts = {}) {
  const { access_token } = await getAccessToken();

  const body = {
    reportType: "GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA",
    marketplaceIds,
  };
  if (opts.dataStartTime) body.dataStartTime = opts.dataStartTime;
  if (opts.dataEndTime) body.dataEndTime = opts.dataEndTime;

  const res = await axios.post(
    `${BASE_URL}/reports/2021-06-30/reports`,
    body,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data;
}

/**
 * Polling stato report fino a DONE.
 */
async function waitForReport(reportId, maxAttempts = 40) {
  const { access_token } = await getAccessToken();

  for (let i = 0; i < maxAttempts; i++) {
    const res = await axios.get(
      `${BASE_URL}/reports/2021-06-30/reports/${reportId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-amz-access-token": access_token,
        },
      }
    );

    const status = res.data.processingStatus;
    if (status === "DONE") return res.data;
    if (status === "CANCELLED" || status === "FATAL") {
      throw new Error(`Report ${reportId} terminato con stato: ${status}`);
    }
    await sleep(8000);
  }
  throw new Error(`Report ${reportId}: timeout dopo ${maxAttempts} tentativi`);
}

/**
 * Scarica e parsa il documento TSV del report resi.
 */
async function downloadReturnsDocument(reportDocumentId) {
  const { access_token } = await getAccessToken();

  const meta = await axios.get(
    `${BASE_URL}/reports/2021-06-30/documents/${reportDocumentId}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
      },
    }
  );

  const docData = meta.data;
  const res = await axios.get(docData.url, { responseType: "arraybuffer" });

  let buffer = Buffer.from(res.data);
  if (docData.compressionAlgorithm === "GZIP") {
    buffer = zlib.gunzipSync(buffer);
  }

  const text = buffer.toString("utf-8");
  const rows = text.split("\n").filter((line) => line.trim() !== "");
  if (rows.length === 0) return [];

  const headers = rows.shift().split("\t").map((h) => h.trim());

  return rows.map((line) => {
    const values = line.split("\t");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || "").trim();
    });
    return obj;
  });
}

/**
 * Salva i resi nel DB (upsert per return-date + order-id + asin).
 * Colonne del report TSV:
 *   return-date, order-id, order-type, asin, fnsku, product-name,
 *   quantity, fulfillment-center-id, detailed-disposition, reason,
 *   status, license-plate-number, customer-comments
 */
function saveReturnsToDb(rows) {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO fba_returns (
      return_date, order_id, asin, sku, product_name,
      quantity, fulfillment_center, disposition, reason,
      status, customer_comments, country, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(order_id, asin, return_date) DO UPDATE SET
      quantity          = excluded.quantity,
      disposition       = excluded.disposition,
      reason            = excluded.reason,
      status            = excluded.status,
      customer_comments = excluded.customer_comments,
      updated_at        = excluded.updated_at
  `);

  const tx = db.transaction((items) => {
    let inserted = 0;
    for (const r of items) {
      stmt.run(
        r["return-date"] || null,
        r["order-id"] || null,
        r["asin"] || null,
        r["fnsku"] || null,
        r["product-name"] || null,
        parseInt(r["quantity"]) || 0,
        r["fulfillment-center-id"] || null,
        r["detailed-disposition"] || null,
        r["reason"] || null,
        r["status"] || null,
        r["customer-comments"] || null,
        null, // country — verrà popolato dal marketplace

      );
      inserted++;
    }
    return inserted;
  });

  return tx(rows);
}

/**
 * Flusso completo: crea report → poll → download → salva.
 * @param {object} opts - { startDate, endDate } formato YYYY-MM-DD
 */
async function syncReturns(opts = {}) {
  const allMarketplaceIds = MARKETPLACES.map((m) => m.marketplaceId);

  const startDate = opts.startDate
    ? new Date(opts.startDate).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = opts.endDate
    ? new Date(opts.endDate).toISOString()
    : new Date().toISOString();

  logger.info(`[Resi] Creazione report dal ${startDate} al ${endDate}...`);
  const { reportId } = await createReturnsReport(allMarketplaceIds, {
    dataStartTime: startDate,
    dataEndTime: endDate,
  });
  logger.info(`[Resi] Report creato: ${reportId}, attendo elaborazione...`);

  const report = await waitForReport(reportId);
  const docId = report.reportDocumentId;
  logger.info(`[Resi] Report pronto, scarico documento ${docId}...`);

  const rows = await downloadReturnsDocument(docId);
  logger.info(`[Resi] ${rows.length} righe scaricate, salvo nel DB...`);

  if (rows.length > 0) {
    const count = saveReturnsToDb(rows);
    logger.info(`[Resi] ${count} resi salvati/aggiornati nel DB`);
    return { ok: true, reportId, rows: rows.length, saved: count };
  }

  return { ok: true, reportId, rows: 0, saved: 0 };
}

/**
 * Recupera resi dal DB con filtri.
 */
function getReturns({ asin, reason, startDate, endDate, limit = 200, offset = 0 } = {}) {
  const db = getDb();
  const where = [];
  const params = [];

  if (asin) { where.push("asin = ?"); params.push(asin); }
  if (reason) { where.push("reason LIKE ?"); params.push(`%${reason}%`); }
  if (startDate) { where.push("return_date >= ?"); params.push(startDate); }
  if (endDate) { where.push("return_date <= ?"); params.push(endDate); }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db.prepare(`
    SELECT * FROM fba_returns ${whereClause}
    ORDER BY return_date DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(
    `SELECT COUNT(*) AS n FROM fba_returns ${whereClause}`
  ).get(...params);

  // Statistiche aggregate
  const stats = db.prepare(`
    SELECT
      COUNT(*) AS totale,
      SUM(quantity) AS pezzi_totali,
      COUNT(DISTINCT asin) AS asin_unici,
      COUNT(DISTINCT reason) AS motivi_unici
    FROM fba_returns ${whereClause}
  `).get(...params);

  return { total: total.n, rows, stats };
}

/**
 * Top motivi resi (raggruppato).
 */
function getReturnReasons({ startDate, endDate } = {}) {
  const db = getDb();
  const where = [];
  const params = [];
  if (startDate) { where.push("return_date >= ?"); params.push(startDate); }
  if (endDate) { where.push("return_date <= ?"); params.push(endDate); }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  return db.prepare(`
    SELECT reason, SUM(quantity) AS totale, COUNT(*) AS occorrenze
    FROM fba_returns ${whereClause}
    GROUP BY reason
    ORDER BY totale DESC
  `).all(...params);
}

/**
 * Top prodotti più resi.
 */
function getTopReturnedProducts({ startDate, endDate, limit = 20 } = {}) {
  const db = getDb();
  const where = [];
  const params = [];
  if (startDate) { where.push("return_date >= ?"); params.push(startDate); }
  if (endDate) { where.push("return_date <= ?"); params.push(endDate); }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  return db.prepare(`
    SELECT asin, product_name, SUM(quantity) AS totale, COUNT(*) AS occorrenze
    FROM fba_returns ${whereClause}
    GROUP BY asin
    ORDER BY totale DESC
    LIMIT ?
  `).all(...params, limit);
}

module.exports = {
  syncReturns,
  getReturns,
  getReturnReasons,
  getTopReturnedProducts,
  createReturnsReport,
  MARKETPLACES,
  MP_TO_COUNTRY,
};
