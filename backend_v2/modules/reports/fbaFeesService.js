// backend_v2/modules/reports/fbaFeesService.js
const path = require("path");
const zlib = require("zlib");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const axios = require("axios");
const { getAccessToken } = require("../auth/authService");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";
const DB_PATH = path.join(__dirname, "../../db/inventario.db");

const MARKETPLACES = {
  IT: "APJ6JRA9NG5V4", // 🇮🇹 Italia
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// =====================================================
// 🔍 Controlla se esiste già un report FBA Fee completato
// =====================================================
async function checkExistingReport(access_token, marketplaceId) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await axios.get(`${BASE_URL}/reports/2021-06-30/reports`, {
      params: {
        reportTypes: "GET_FBA_FEE_PREVIEW_REPORT",
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

    console.log(`🧾 Report commissioni pronto: ${latest.reportId}`);
    return latest;
  } catch (err) {
    console.warn("⚠️ checkExistingReport Fee:", err.message);
    return null;
  }
}

// =====================================================
// 💸 AGGIORNA COMMISSIONI FBA
// =====================================================
async function aggiornaFBAFees() {
  console.log("💸 Avvio aggiornamento FBA fees…");
  let db;

  try {
    db = await open({ filename: DB_PATH, driver: sqlite3.Database });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS fba_fees (
        asin TEXT,
        sku TEXT,
        country TEXT,
        referral_fee REAL DEFAULT 0,
        fulfillment_fee REAL DEFAULT 0,
        storage_fee REAL DEFAULT 0,
        total_fee REAL DEFAULT 0,
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

          const existing = await checkExistingReport(access_token, marketplaceId);
          if (existing && existing.reportDocumentId) {
            console.log(`♻️ Riutilizzo report ${existing.reportId} (${country})`);
            reportId = existing.reportId;
            reportDocumentId = existing.reportDocumentId;
          } else {
            const createRes = await axios.post(
              `${BASE_URL}/reports/2021-06-30/reports`,
              {
                reportType: "GET_FBA_FEE_PREVIEW_REPORT",
                marketplaceIds: [marketplaceId],
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
            console.log(`📝 Creato nuovo report fees ${reportId} (${country})`);
          }

          // ⏳ Attendi completamento
          if (!reportDocumentId) {
            for (let i = 0; i < 40; i++) {
              await sleep(8000);
              const statusRes = await axios.get(
                `${BASE_URL}/reports/2021-06-30/reports/${reportId}`,
                { headers: { Authorization: `Bearer ${access_token}` } }
              );
              const status = statusRes.data.processingStatus;
              reportDocumentId = statusRes.data.reportDocumentId;
              if (status === "DONE") break;
              if (["CANCELLED", "FATAL"].includes(status)) break;
            }
            if (!reportDocumentId) throw new Error("Report non completato");
          }

          // 📥 Scarica e decomprimi
          console.log(`📥 Scarico documento report ${reportDocumentId}...`);
          const meta = await axios.get(
            `${BASE_URL}/reports/2021-06-30/documents/${reportDocumentId}`,
            { headers: { Authorization: `Bearer ${access_token}` } }
          );

          const { url, compressionAlgorithm } = meta.data;
          const file = await axios.get(url, { responseType: "arraybuffer" });

          let buffer = Buffer.from(file.data);
          if (compressionAlgorithm === "GZIP") buffer = zlib.gunzipSync(buffer);
          const text = buffer.toString("utf-8");

          const lines = text.split("\n").filter((l) => l.trim());
          if (lines.length <= 1) {
            console.warn(`⚠️ Report vuoto per ${country}`);
            break;
          }

          const headers = lines.shift().split("\t").map((h) => h.trim().toLowerCase());
          const idx = (n) => headers.findIndex((h) => h === n.toLowerCase());

          const stmt = await db.prepare(`
            INSERT OR REPLACE INTO fba_fees
            (asin, sku, country, referral_fee, fulfillment_fee, storage_fee, total_fee, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `);

          let inserted = 0;
          for (const line of lines) {
            const cols = line.split("\t");
            const asin = cols[idx("asin")]?.trim();
            if (!asin) continue;

            const sku = cols[idx("sku")]?.trim() || "";
            const referral = parseFloat(cols[idx("referral-fee")] || "0");
            const fulfill = parseFloat(cols[idx("fulfillment-fee")] || "0");
            const storage = parseFloat(cols[idx("storage-fee")] || "0");
            const total = parseFloat(cols[idx("total-fee")] || "0");

            await stmt.run(asin, sku, country, referral, fulfill, storage, total);
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

      if (!success) console.error(`❌ Fallito ${country} dopo 3 tentativi:`, lastError?.message);
      console.log("🕒 Pausa 30s prima del prossimo marketplace...");
      await sleep(30000);
    }

    console.log(`🎯 Totale righe salvate: ${totalInserted}`);
    return { ok: true, record: totalInserted };
  } catch (err) {
    console.error("❌ Errore aggiornaFBAFees:", err.message);
    return { ok: false, error: err.message };
  } finally {
    if (db) await db.close();
  }
}

// =====================================================
// 📊 Legge le fee dal DB
// =====================================================
async function getFBAFees() {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  const data = await db.all("SELECT * FROM fba_fees ORDER BY updated_at DESC, asin, country");
  await db.close();
  return data;
}

module.exports = { aggiornaFBAFees, getFBAFees };
