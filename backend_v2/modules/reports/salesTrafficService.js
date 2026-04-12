// backend_v2/modules/reports/salesTrafficService.js
const zlib = require("zlib");
const axios = require("axios");
const { getAccessToken } = require("../auth/authService");
const { getDb } = require("../../db/database");

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

function ensureTable() {
  const db = getDb();
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
    console.log(`[SalesTraffic] Report pronto: ${latest.reportId}`);
    return latest;
  } catch (err) {
    console.warn("[SalesTraffic] checkExistingReport:", err.message);
    return null;
  }
}

// Aggiorna dati di vendita e traffico
async function aggiornaSalesTraffic() {
  console.log("[SalesTraffic] Avvio aggiornamento...");
  ensureTable();

  const db = getDb();
  const today = todayISO();
  let totalInserted = 0;

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO sales_traffic
    (asin, sku, country, units_ordered, ordered_product_sales,
     average_sales_per_unit, conversion_rate, sessions, page_views, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [country, marketplaceId] of Object.entries(MARKETPLACES)) {
    console.log(`[SalesTraffic] Marketplace: ${country}`);

    // Skip se abbiamo gia molti giorni di dati per questo country (non solo oggi)
    const dataCount = db.prepare(
      "SELECT COUNT(DISTINCT date) AS days FROM sales_traffic WHERE country = ? AND date != ''"
    ).get(country);

    if (dataCount && dataCount.days >= 30) {
      // Gia abbastanza storico — controlla se aggiornato nelle ultime 12h
      const lastUpdate = db.prepare(
        "SELECT MAX(created_at) AS last_ts FROM sales_traffic WHERE country = ?"
      ).get(country);
      if (lastUpdate?.last_ts) {
        const hoursSince = (Date.now() - new Date(lastUpdate.last_ts).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 12) {
          console.log(`[SalesTraffic] ${country}: ${dataCount.days} giorni in DB, aggiornato ${hoursSince.toFixed(1)}h fa, skip`);
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
          console.log(`[SalesTraffic] Creato report ${reportId} (${country})`);

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
        console.log(`[SalesTraffic] Scarico documento ${reportDocumentId}...`);
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

        // Il report puo avere i dati in due formati:
        // 1. json.salesAndTrafficByAsin (array diretto)
        // 2. json.salesAndTrafficByDate[].salesAndTrafficByAsin (per giorno)
        let asinRows = [];
        let reportDate = today;

        if (Array.isArray(json?.salesAndTrafficByAsin)) {
          asinRows = json.salesAndTrafficByAsin;
        } else if (Array.isArray(json?.salesAndTrafficByDate)) {
          // Estrai data dal primo giorno disponibile
          for (const dayData of json.salesAndTrafficByDate) {
            const dayDate = dayData.date || today;
            const dayAsinRows = dayData.salesAndTrafficByAsin || [];
            for (const r of dayAsinRows) {
              r._reportDate = dayDate;
            }
            asinRows.push(...dayAsinRows);
          }
        }

        if (!asinRows.length) {
          console.warn(`[SalesTraffic] Nessun dato nel report per ${country}`);
          break;
        }

        let inserted = 0;
        const insertMany = db.transaction((rows) => {
          for (const r of rows) {
            const asin = r.parentAsin || r.asin || "";
            const stats = r.salesByAsin || {};
            const traffic = r.trafficByAsin || {};
            const rowDate = r._reportDate || today;

            insertStmt.run(
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
              rowDate
            );
            inserted++;
          }
        });

        insertMany(asinRows);
        console.log(`[SalesTraffic] ${country}: ${inserted} righe salvate`);
        totalInserted += inserted;
        success = true;
      } catch (err) {
        lastError = err;
        const code = err.response?.status;
        const amzMsg = err.response?.data?.errors?.[0]?.message || err.response?.data;
        if (code === 429 || code === 403) {
          console.warn(`[SalesTraffic] Limite per ${country} (${code}): ${amzMsg || err.message}`);
          if (attempt < 2) {
            console.warn(`[SalesTraffic] Retry tra 90s...`);
            await sleep(90000);
          }
        } else {
          console.warn(`[SalesTraffic] Errore ${country} (${code || "?"}):`, amzMsg || err.message);
          break;
        }
      }
    }

    if (!success) {
      console.error(`[SalesTraffic] Fallito ${country} dopo ${attempt} tentativi:`, lastError?.message);
    }

    console.log("[SalesTraffic] Pausa 60s prima del prossimo marketplace...");
    await sleep(60000);
  }

  console.log(`[SalesTraffic] Totale righe salvate: ${totalInserted}`);
  return { ok: true, record: totalInserted };
}

// GET vendite dal DB
function getSalesTraffic() {
  ensureTable();
  const db = getDb();
  return db.prepare("SELECT * FROM sales_traffic ORDER BY date DESC, asin, country").all();
}

module.exports = { aggiornaSalesTraffic, getSalesTraffic };
