// backend_v2/modules/reports/salesTrafficService.js
const path = require("path");
const zlib = require("zlib");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const axios = require("axios");
const { getAccessToken } = require("../auth/authService");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";
const DB_PATH = path.join(__dirname, "../../db/inventario.db");
const MARKETPLACES = { IT: "APJ6JRA9NG5V4" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// =====================================================
// 🔍 Cerca report vendite già completato (nelle ultime 24h)
// =====================================================
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
    console.log(`🧾 Report vendite pronto: ${latest.reportId}`);
    return latest;
  } catch (err) {
    console.warn("⚠️ checkExistingReport vendite:", err.message);
    return null;
  }
}

// =====================================================
// 📊 AGGIORNA DATI DI VENDITA E TRAFFICO
// =====================================================
async function aggiornaSalesTraffic() {
  console.log("📈 Avvio aggiornamento Sales & Traffic report…");

  try {
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

    await db.exec(`
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
        date TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (asin, country, date)
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

          // 🔹 Verifica se c’è già un report pronto
          let reportId = null;
          let reportDocumentId = null;
          const existing = await checkExistingReport(access_token, marketplaceId);

          if (existing && existing.reportDocumentId) {
            reportId = existing.reportId;
            reportDocumentId = existing.reportDocumentId;
            console.log(`♻️ Riutilizzo report vendite ${reportId} (${country})`);
          } else {
            // 🔹 Crea nuovo report (periodo: ieri)
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            const createRes = await axios.post(
              `${BASE_URL}/reports/2021-06-30/reports`,
              {
                reportType: "GET_SALES_AND_TRAFFIC_REPORT",
                dataStartTime: yesterday.toISOString(),
                dataEndTime: today.toISOString(),
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
            console.log(`📝 Creato nuovo report vendite ${reportId} (${country})`);

            // Attendi completamento
            let status = "IN_PROGRESS";
            for (let i = 0; i < 30; i++) {
              await sleep(8000);
              const res = await axios.get(
                `${BASE_URL}/reports/2021-06-30/reports/${reportId}`,
                { headers: { Authorization: `Bearer ${access_token}` } }
              );
              status = res.data.processingStatus;
              reportDocumentId = res.data.reportDocumentId;
              if (status === "DONE") break;
              if (["CANCELLED", "FATAL"].includes(status)) break;
            }
            if (!reportDocumentId) throw new Error("Report non completato");
          }

          // 🔹 Scarica e decomprimi
          console.log(`📥 Scarico documento report vendite ${reportDocumentId}...`);
          const metaRes = await axios.get(
            `${BASE_URL}/reports/2021-06-30/documents/${reportDocumentId}`,
            { headers: { Authorization: `Bearer ${access_token}` } }
          );
          const { url, compressionAlgorithm } = metaRes.data;
          const fileRes = await axios.get(url, { responseType: "arraybuffer" });

          let buffer = Buffer.from(fileRes.data);
          if (compressionAlgorithm === "GZIP") buffer = zlib.gunzipSync(buffer);
          const text = buffer.toString("utf-8");

          // Log primi 300 caratteri
          console.log("🧩 Anteprima JSON:", text.slice(0, 300));

          // 🔹 Parsing JSON
          const json = JSON.parse(text);
          const asinRows =
            json?.salesAndTrafficByAsin ||
            json?.salesAndTrafficByDate?.flatMap((d) => d.salesAndTrafficByAsin) ||
            [];

          if (!asinRows.length) {
            console.warn(`⚠️ Nessun dato nel report vendite per ${country}`);
            break;
          }

          const stmt = await db.prepare(`
            INSERT OR REPLACE INTO sales_traffic
            (asin, sku, country, units_ordered, ordered_product_sales,
             average_sales_per_unit, conversion_rate, sessions, page_views, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
          `);

          let inserted = 0;
          for (const r of asinRows) {
            const asin = r.parentAsin || r.asin || "";
            const stats = r.salesByAsin || {};
            const traffic = r.trafficByAsin || {};

            await stmt.run(
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
              traffic.pageViews || 0
            );
            inserted++;
          }

          await stmt.finalize();
          console.log(`✅ ${country}: ${inserted} righe salvate nel DB`);
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

      if (!success) {
        console.error(`❌ Fallito ${country} dopo 3 tentativi:`, lastError?.message);
      }

      console.log("🕒 Pausa 20s prima del prossimo marketplace...");
      await sleep(20000);
    }

    await db.close();
    console.log(`🎯 Totale righe salvate: ${totalInserted}`);
    return { ok: true, record: totalInserted };
  } catch (err) {
    console.error("❌ Errore aggiornaSalesTraffic:", err.message);
    return { ok: false, error: err.message };
  }
}

// =====================================================
// 📊 GET vendite dal DB
// =====================================================
async function getSalesTraffic() {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  const data = await db.all("SELECT * FROM sales_traffic ORDER BY date DESC, asin, country");
  await db.close();
  return data;
}

module.exports = { aggiornaSalesTraffic, getSalesTraffic };
