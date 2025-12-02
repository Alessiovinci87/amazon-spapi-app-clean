// backend_v2/modules/reports/fbaStockService.js
const path = require("path");
const zlib = require("zlib");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const axios = require("axios");
const { getAccessToken } = require("../auth/authService");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";
const DB_PATH = path.join(__dirname, "../../db/inventario.db");

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

    console.log(`🧾 Report FBA pronto: ${latest.reportId}`);

    // ✅ se manca il documentId, rigenera token e rilegge il singolo report
    if (!latest.reportDocumentId) {
      console.log(`🔄 Nessun documentId nel report ${latest.reportId}, aggiorno token...`);
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
    console.warn("⚠️ checkExistingReport FBA:", err.message);
    return null;
  }
}

// =====================================================
// 📦 AGGIORNAMENTO COMPLETO FBA STOCK
// =====================================================
async function aggiornaFBAStock(forceNew = false) {
  console.log("📦 Avvio aggiornamento FBA stock…");

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
      console.log(`🌍 Marketplace: ${country}`);
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
            console.log(`♻️ Riutilizzo report ${existing.reportId} (${country})`);
            reportId = existing.reportId;
            reportDocumentId = existing.reportDocumentId;
          } else {
            console.log(forceNew ? "🔁 Rigenerazione forzata report..." : "🆕 Nessun report valido trovato, creazione nuovo...");
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
            console.log(`📝 Creato nuovo report ${reportId} (${country})`);
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
          console.log(`📥 Scarico documento ${reportDocumentId}...`);
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

              console.log("✅ Documento scaricato correttamente");
              break;
            } catch (err) {
              lastDownloadError = err;
              const status = err.response?.status;
              if (status === 403 || status === 429) {
                console.warn(`⏳ Retry download (${i + 1}/3) dopo 60s...`);
                await sleep(60000);
                continue;
              }
              throw err;
            }
          }

          if (!fileBuffer)
            throw new Error(`Download documento fallito: ${lastDownloadError?.message}`);

          const text = fileBuffer.toString("utf-8");
          console.log("🧩 Anteprima TSV:", text.slice(0, 200));

          const lines = text.split("\n").filter((r) => r.trim());
          if (lines.length <= 1) {
            console.warn(`⚠️ Report vuoto per ${country}`);
            break;
          }

          const headers = lines.shift().split("\t").map((h) => h.trim().toLowerCase());
          const idx = (name) => headers.findIndex((h) => h === name.toLowerCase());

          const stmt = await db.prepare(`
            INSERT OR REPLACE INTO fba_stock (
              asin, sku, product_name, country,
              quantity, stock_totale,
              reserved_qty, inbound_working, inbound_shipped, inbound_receiving, unfulfillable_qty, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
          console.log(`✅ ${country}: ${inserted} righe salvate`);
          totalInserted += inserted;
          success = true;
        } catch (err) {
          lastError = err;
          const code = err.response?.status;
          if (code === 429 || code === 403) {
            const wait = 60000 * attempt * 2;
            console.warn(`⏳ Limite o quota per ${country}. Attendo ${wait / 1000}s...`);
            await sleep(wait);
          } else {
            console.warn(`⚠️ Errore su ${country}:`, err.message);
            break;
          }
        }
      }

      if (!success)
        console.error(`❌ Fallito ${country} dopo 3 tentativi:`, lastError?.message);

      console.log("🕒 Pausa 30s prima del prossimo marketplace...");
      await sleep(30000);
    }

    await db.close();
    console.log(`🎯 Totale righe salvate: ${totalInserted}`);
    return { ok: true, record: totalInserted };
  } catch (err) {
    console.error("❌ Errore aggiornaFBAStock:", err.message);
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
