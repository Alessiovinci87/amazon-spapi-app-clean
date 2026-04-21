// backend_v2/modules/reports/fbaStockService.js
const path = require("path");
const zlib = require("zlib");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const axios = require("axios");
const { getAccessToken } = require("../auth/authService");
const { getDbPath } = require("../../db/database");
const logger = require("../../utils/logger");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";
const DB_PATH = getDbPath();

// 🇮🇹 Attivo solo Italia per ora
const MARKETPLACES = { IT: "APJ6JRA9NG5V4" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// =====================================================
// 🔍 Controlla se esiste già un report FBA completato (ultime 24h)
// =====================================================
async function checkExistingReport(access_token, marketplaceId) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await axios.get(`${BASE_URL}/reports/2021-06-30/reports`, {
      params: {
        reportTypes: "GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA",
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

    logger.info(`Report FBA pronto: ${latest.reportId}`);

    // ✅ se manca il documentId, rigenera token e rilegge il singolo report
    if (!latest.reportDocumentId) {
      logger.info(`Nessun documentId nel report ${latest.reportId}, aggiorno token...`);
      const { access_token: freshToken } = await getAccessToken();
      const r2 = await axios.get(
        `${BASE_URL}/reports/2021-06-30/reports/${latest.reportId}`,
        { headers: { Authorization: `Bearer ${freshToken}` } }
      );
      if (r2.data?.reportDocumentId)
        latest.reportDocumentId = r2.data.reportDocumentId;
    }

    return latest;
  } catch (err) {
    logger.warn({ err }, "checkExistingReport FBA");
    return null;
  }
}

// =====================================================
// 📦 AGGIORNAMENTO COMPLETO FBA STOCK
// =====================================================
async function aggiornaFBAStock(forceNew = false) {
  logger.info("Avvio aggiornamento FBA stock…");

  try {
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    await db.exec(`
      CREATE TABLE IF NOT EXISTS fba_stock (
        asin TEXT,
        sku TEXT,
        product_name TEXT,
        country TEXT,
        quantity INTEGER DEFAULT 0,
        stock_totale INTEGER DEFAULT 0,
        reserved_qty INTEGER DEFAULT 0,
        inbound_working INTEGER DEFAULT 0,
        inbound_shipped INTEGER DEFAULT 0,
        inbound_receiving INTEGER DEFAULT 0,
        unfulfillable_qty INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (asin, country)
      );
    `);

    let totalInserted = 0;

    for (const [country, marketplaceId] of Object.entries(MARKETPLACES)) {
      logger.info(`Marketplace: ${country}`);
      let success = false;
      let attempt = 0;
      let lastError = null;

      while (!success && attempt < 3) {
        attempt++;
        try {
          const { access_token } = await getAccessToken();
          let reportId, reportDocumentId;
          const forceNew = true;
          const existing = await checkExistingReport(access_token, marketplaceId);

          if (existing && existing.reportDocumentId && !forceNew) {
            logger.info(`Riutilizzo report ${existing.reportId} (${country})`);
            reportId = existing.reportId;
            reportDocumentId = existing.reportDocumentId;
          } else {
            logger.info(forceNew ? "Rigenerazione forzata report..." : "Nessun report valido trovato, creazione nuovo...");
            const createRes = await axios.post(
              `${BASE_URL}/reports/2021-06-30/reports`,
              {
                reportType: "GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA",
                marketplaceIds: [marketplaceId],
                dataStartTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
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
            logger.info(`Creato nuovo report ${reportId} (${country})`);
          }

          // ⏳ Attesa completamento
          let status = "IN_PROGRESS";
          if (!reportDocumentId) {
            for (let i = 0; i < 40; i++) {
              await sleep(8000);
              const s = await axios.get(
                `${BASE_URL}/reports/2021-06-30/reports/${reportId}`,
                { headers: { Authorization: `Bearer ${access_token}` } }
              );
              status = s.data.processingStatus;
              reportDocumentId = s.data.reportDocumentId;
              if (status === "DONE") break;
              if (["CANCELLED", "FATAL"].includes(status)) break;
            }
            if (!reportDocumentId) throw new Error("Report non completato");
          }

          // 📥 Download documento con retry + rigenerazione token
          logger.info(`Scarico documento ${reportDocumentId}...`);
          let fileBuffer = null;
          let lastDownloadError = null;

          for (let i = 0; i < 3; i++) {
            try {
              const { access_token: freshToken } = await getAccessToken();
              const metaRes = await axios.get(
                `${BASE_URL}/reports/2021-06-30/documents/${reportDocumentId}`,
                { headers: { Authorization: `Bearer ${freshToken}` } }
              );

              const { url, compressionAlgorithm } = metaRes.data;
              const res = await axios.get(url, { responseType: "arraybuffer" });

              fileBuffer = Buffer.from(res.data);
              if (compressionAlgorithm === "GZIP")
                fileBuffer = zlib.gunzipSync(fileBuffer);

              logger.info("Documento scaricato correttamente");
              break;
            } catch (err) {
              lastDownloadError = err;
              const status = err.response?.status;
              if (status === 403 || status === 429) {
                logger.warn(`Retry download (${i + 1}/3) dopo 60s...`);
                await sleep(60000);
                continue;
              }
              throw err;
            }
          }

          if (!fileBuffer)
            throw new Error(`Download documento fallito: ${lastDownloadError?.message}`);

          const text = fileBuffer.toString("utf-8");
          logger.info("Anteprima TSV: %s", text.slice(0, 200));

          const lines = text.split("\n").filter((r) => r.trim());
          if (lines.length <= 1) {
            logger.warn(`Report vuoto per ${country}`);
            break;
          }

          const headers = lines.shift().split("\t").map((h) => h.trim().toLowerCase());
          const idx = (name) => headers.findIndex((h) => h === name.toLowerCase());

          // UPSERT: se lo stesso ASIN×country esiste già, tieni la riga con stock_totale più alto
          // Risolve il caso di ASIN con più SKU (uno attivo con stock, uno dismesso con qty=0)
          const stmt = await db.prepare(`
            INSERT INTO fba_stock (
              asin, sku, product_name, country,
              quantity, stock_totale,
              reserved_qty, inbound_working, inbound_shipped, inbound_receiving, unfulfillable_qty, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(asin, country) DO UPDATE SET
              sku = CASE WHEN excluded.stock_totale > stock_totale THEN excluded.sku ELSE sku END,
              product_name = CASE WHEN excluded.stock_totale > stock_totale THEN excluded.product_name ELSE product_name END,
              quantity = MAX(quantity, excluded.quantity),
              stock_totale = MAX(stock_totale, excluded.stock_totale),
              reserved_qty = MAX(reserved_qty, excluded.reserved_qty),
              inbound_working = MAX(inbound_working, excluded.inbound_working),
              inbound_shipped = MAX(inbound_shipped, excluded.inbound_shipped),
              inbound_receiving = MAX(inbound_receiving, excluded.inbound_receiving),
              unfulfillable_qty = MAX(unfulfillable_qty, excluded.unfulfillable_qty),
              updated_at = CURRENT_TIMESTAMP
          `);

          let inserted = 0;
          for (const line of lines) {
            const cols = line.split("\t");
            const asin = cols[idx("asin")]?.trim();
            if (!asin) continue;

            const sku = cols[idx("seller-sku")]?.trim() || "";
            const name = cols[idx("product-name")]?.trim() || "";

            const fulfillable = parseInt(cols[idx("afn-fulfillable-quantity")] || 0, 10);
            const reserved = parseInt(cols[idx("afn-reserved-quantity")] || 0, 10);
            const inboundWorking = parseInt(cols[idx("afn-inbound-working-quantity")] || 0, 10);
            const inboundShipped = parseInt(cols[idx("afn-inbound-shipped-quantity")] || 0, 10);
            const inboundReceiving = parseInt(cols[idx("afn-inbound-receiving-quantity")] || 0, 10);
            const unfulfillable = parseInt(cols[idx("afn-unsellable-quantity")] || 0, 10);

            const totale =
              fulfillable + reserved + inboundWorking + inboundShipped + inboundReceiving + unfulfillable;

            await stmt.run(
              asin,
              sku,
              name,
              country,
              fulfillable,
              totale,
              reserved,
              inboundWorking,
              inboundShipped,
              inboundReceiving,
              unfulfillable
            );
            inserted++;
          }

          await stmt.finalize();
          logger.info(`${country}: ${inserted} righe salvate`);
          totalInserted += inserted;
          success = true;
        } catch (err) {
          lastError = err;
          const code = err.response?.status;
          if (code === 429 || code === 403) {
            const wait = 60000 * attempt * 2;
            logger.warn(`Limite o quota per ${country}. Attendo ${wait / 1000}s...`);
            await sleep(wait);
          } else {
            logger.warn({ err }, `Errore su ${country}`);
            break;
          }
        }
      }

      if (!success)
        logger.error(`Fallito ${country} dopo 3 tentativi: ${lastError?.message}`);

      logger.info("Pausa 30s prima del prossimo marketplace...");
      await sleep(30000);
    }

    await db.close();
    logger.info(`Totale righe salvate: ${totalInserted}`);
    return { ok: true, record: totalInserted };
  } catch (err) {
    logger.error({ err }, "Errore aggiornaFBAStock");
    return { ok: false, error: err.message };
  }
}

// =====================================================
// 📊 GET STOCK DAL DB
// =====================================================
async function getFBAStock() {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  const data = await db.all("SELECT * FROM fba_stock ORDER BY updated_at DESC, asin, country");
  await db.close();
  return data;
}

module.exports = { aggiornaFBAStock, getFBAStock };
