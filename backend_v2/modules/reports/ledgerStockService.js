// backend_v2/modules/reports/ledgerStockService.js
// Recupera distribuzione fisica stock per paese via GET_LEDGER_SUMMARY_VIEW_DATA
// Questo report mostra le unità reali per fulfillment center → aggreghiamo per paese

const axios = require("axios");
const zlib  = require("zlib");
const { getAccessToken } = require("../auth/authService");
const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────
// Crea un nuovo report e aspetta che sia completato (DONE)
// ─────────────────────────────────────────────────────────────────────
async function creaEAttendi(access_token, reportType, marketplaceId, extra = {}) {
  // 1. Crea report (retry su 429: createReport rate limit = 1/min)
  let createRes;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      createRes = await axios.post(
        `${BASE_URL}/reports/2021-06-30/reports`,
        { reportType, marketplaceIds: [marketplaceId], ...extra },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "x-amz-access-token": access_token,
            "Content-Type": "application/json",
          },
        }
      );
      break;
    } catch (err) {
      if (err.response?.status === 429 && attempt < 2) {
        logger.info(`⏳ [Ledger] 429 su createReport (tentativo ${attempt + 1}/3) — attendo 65s…`);
        await sleep(65000);
        continue;
      }
      throw err;
    }
  }
  const reportId = createRes.data.reportId;
  logger.info(`📝 [Ledger] Report ${reportType} creato: ${reportId}`);

  // 2. Poll fino a DONE (max 20 min)
  for (let i = 0; i < 150; i++) {
    await sleep(8000);
    const { access_token: fresh } = await getAccessToken();
    const s = await axios.get(
      `${BASE_URL}/reports/2021-06-30/reports/${reportId}`,
      { headers: { Authorization: `Bearer ${fresh}`, "x-amz-access-token": fresh } }
    );
    const status = s.data.processingStatus;
    if (status === "DONE") {
      logger.info(`✅ [Ledger] Report ${reportId} completato`);
      return { reportId, reportDocumentId: s.data.reportDocumentId, fresh };
    }
    if (["CANCELLED", "FATAL"].includes(status)) {
      throw new Error(`Report ${reportId} terminato con stato ${status}`);
    }
    logger.info(`⏳ [Ledger] ${reportId} stato: ${status} (attesa ${i * 8}s)`);
  }
  throw new Error(`Timeout: report ${reportId} non completato in 20 minuti`);
}

// ─────────────────────────────────────────────────────────────────────
// Scarica il documento di un report e restituisce il testo TSV
// ─────────────────────────────────────────────────────────────────────
async function scaricaDocumento(reportDocumentId) {
  const { access_token } = await getAccessToken();
  for (let i = 0; i < 3; i++) {
    try {
      const metaRes = await axios.get(
        `${BASE_URL}/reports/2021-06-30/documents/${reportDocumentId}`,
        { headers: { Authorization: `Bearer ${access_token}`, "x-amz-access-token": access_token } }
      );
      const { url, compressionAlgorithm } = metaRes.data;
      const res = await axios.get(url, { responseType: "arraybuffer" });
      let buf = Buffer.from(res.data);
      const byteLength = buf.length;
      if (compressionAlgorithm === "GZIP") buf = zlib.gunzipSync(buf);
      return { tsv: buf.toString("utf-8"), compressionAlgorithm, byteLength };
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 429) {
        logger.warn(`⏳ [Ledger] Retry download (${i + 1}/3)`);
        await sleep(30000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Download documento fallito dopo 3 tentativi");
}

// ─────────────────────────────────────────────────────────────────────
// Parsa il TSV del Ledger Summary e aggiorna fba_stock per paese
// Colonne rilevanti: asin, fulfillment-center-id, ending-warehouse-quantity
// ─────────────────────────────────────────────────────────────────────
// Parsa sia GET_LEDGER_SUMMARY_VIEW_DATA (con aggregateByLocation=COUNTRY)
// sia GET_LEDGER_DETAIL_VIEW_DATA — rileva il formato dai nomi colonna.
//
// Summary: location=country, ending warehouse balance=stock fisico, date=snapshot
// Detail:  country=country, reconciled quantity=saldo running, date and time=timestamp
function parsaEAggiorna(db, tsvText, defaultCountry) {
  const lines = tsvText.split("\n").filter(l => l.trim());
  logger.info(`[Ledger] Righe dati (escluso header): ${lines.length - 1}`);
  if (lines.length <= 1) return 0;

  const headers = lines[0].split("\t").map(h => h.trim().toLowerCase().replace(/"/g, ""));
  const idx = name => headers.findIndex(h => h === name);

  logger.info("[Ledger] Headers:", headers.join(" | "));

  const iAsin = idx("asin");
  const iDisp = idx("disposition");

  // Rileva formato: Summary vs Detail
  const iLoc    = idx("location");
  const iEnd    = idx("ending warehouse balance");
  const iDate   = idx("date");
  const iCntry  = idx("country");
  const iRecQty = idx("reconciled quantity");
  const iDt     = idx("date and time");

  const isSummary = iLoc !== -1 && iEnd !== -1;
  logger.info(`[Ledger] Formato: ${isSummary ? "SUMMARY (dati fisici per paese)" : "DETAIL (saldo running)"}`);

  if (iAsin === -1 || (!isSummary && iRecQty === -1)) {
    logger.warn("[Ledger] ⚠️ Formato non riconosciuto. Headers:", headers.join(", "));
    return 0;
  }

  // Per ogni ASIN+country SELLABLE: tieni solo la riga più recente
  const latest = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t").map(c => c.trim().replace(/"/g, ""));
    const asin = cols[iAsin];
    if (!asin || asin.length !== 10) continue;
    if (iDisp !== -1 && cols[iDisp] !== "SELLABLE") continue;

    const country = isSummary
      ? ((iLoc !== -1 ? cols[iLoc] : null) || defaultCountry)
      : ((iCntry !== -1 ? cols[iCntry] : null) || defaultCountry);
    const qty     = isSummary
      ? (parseInt(cols[iEnd], 10) || 0)
      : (parseInt(cols[iRecQty], 10) || 0);
    const sortKey = isSummary
      ? (iDate !== -1 ? cols[iDate] : "")
      : (iDt !== -1 ? cols[iDt] : "");

    const key = `${asin}|${country}`;
    if (!latest[key] || sortKey >= latest[key].sortKey) {
      latest[key] = { asin, country, qty, sortKey };
    }
  }

  const agg = {};
  for (const { asin, country, qty } of Object.values(latest)) {
    if (!agg[asin]) agg[asin] = {};
    agg[asin][country] = qty;
  }

  logger.info(`[Ledger] ASIN unici SELLABLE: ${Object.keys(agg).length}`);

  const stmt = db.prepare(`
    INSERT INTO fba_stock (asin, sku, product_name, country, quantity, stock_totale, updated_at)
    VALUES (?, NULL, NULL, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(asin, country) DO UPDATE SET
      quantity   = excluded.quantity,
      stock_totale = excluded.stock_totale,
      updated_at = excluded.updated_at
  `);

  // Azzera i paesi NON presenti nel Ledger per gli ASIN elaborati.
  // Necessario perché l'AlertCron sovrascrive con le quantità Pan-EU pool
  // (Inventory API restituisce stessa quantità per tutti i paesi EU).
  let updated = 0;
  const upsert = db.transaction(() => {
    for (const [asin, countries] of Object.entries(agg)) {
      // Upsert quantità reali dal Ledger
      for (const [country, qty] of Object.entries(countries)) {
        stmt.run(asin, country, qty, qty);
        updated++;
      }
      // Azzera paesi non presenti nel Ledger (es. NL/BE con 0 unità fisiche)
      const ledgerCountries = Object.keys(countries);
      const placeholders = ledgerCountries.map(() => '?').join(',');
      db.prepare(`
        UPDATE fba_stock SET quantity = 0, stock_totale = 0, updated_at = CURRENT_TIMESTAMP
        WHERE asin = ? AND country NOT IN (${placeholders})
      `).run(asin, ...ledgerCountries);
    }
  });
  upsert();
  return updated;
}

// ─────────────────────────────────────────────────────────────────────
// Entry point principale: scarica il ledger per marketplace IT
// (Pan-EU: un unico report IT copre tutti i magazzini EU)
// ─────────────────────────────────────────────────────────────────────
async function aggiornaLedgerStock() {
  const db = getDb();
  const { access_token } = await getAccessToken();

  // Il Ledger Summary report è a livello account (non per singolo marketplace)
  // Usiamo IT come marketplace di riferimento — il report include tutti i FC EU
  const MARKETPLACE_IT = "APJ6JRA9NG5V4";

  // Formato date: YYYY-MM-DDT00:00:00Z (senza millisecondi, come richiede Amazon)
  function toAmazonDate(d) {
    return d.toISOString().substring(0, 10) + "T00:00:00Z";
  }

  const oggi = new Date();
  const ieri = new Date(oggi - 1 * 24 * 60 * 60 * 1000);

  // Strategia: prima Summary con aggregateByLocation=COUNTRY (dati fisici per paese),
  // poi Detail come fallback (saldo running per marketplace)
  const TENTATIVI = [
    {
      label:      "Summary COUNTRY / 7gg",
      reportType: "GET_LEDGER_SUMMARY_VIEW_DATA",
      start:      toAmazonDate(new Date(oggi - 7 * 86400000)),
      end:        toAmazonDate(oggi),
      options:    { reportOptions: { aggregateByLocation: "COUNTRY", aggregatedByTimePeriod: "DAILY" } },
    },
    {
      label:      "Summary COUNTRY / 30gg",
      reportType: "GET_LEDGER_SUMMARY_VIEW_DATA",
      start:      toAmazonDate(new Date(oggi - 30 * 86400000)),
      end:        toAmazonDate(oggi),
      options:    { reportOptions: { aggregateByLocation: "COUNTRY", aggregatedByTimePeriod: "DAILY" } },
    },
    {
      label:      "Detail / ieri",
      reportType: "GET_LEDGER_DETAIL_VIEW_DATA",
      start:      toAmazonDate(ieri),
      end:        ieri.toISOString().substring(0, 10) + "T23:59:59Z",
      options:    {},
    },
    {
      label:      "Detail / 7gg",
      reportType: "GET_LEDGER_DETAIL_VIEW_DATA",
      start:      toAmazonDate(new Date(oggi - 7 * 86400000)),
      end:        toAmazonDate(oggi),
      options:    {},
    },
  ];

  for (const { label, reportType, start, end, options } of TENTATIVI) {
    logger.info(`📊 [Ledger] ${label}: ${start} → ${end}`);
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        const { reportDocumentId } = await creaEAttendi(
          access_token,
          reportType,
          MARKETPLACE_IT,
          { dataStartTime: start, dataEndTime: end, ...options }
        );

        const { tsv } = await scaricaDocumento(reportDocumentId);
        const updated = parsaEAggiorna(db, tsv, "IT");

        if (updated > 0) {
          logger.info(`✅ [Ledger] Aggiornate ${updated} righe per paese (${label})`);
          return { ok: true, righeAggiornate: updated };
        }
        logger.info(`⚠️ [Ledger] ${label}: 0 righe SELLABLE, provo il prossimo tentativo…`);
        break; // 0 righe → passa al prossimo label senza retry
      } catch (err) {
        logger.error(`❌ [Ledger] Errore ${label} (tentativo ${attempts}/3): ${err.message}`);
        if (err.response?.status === 429 && attempts < 3) {
          logger.info(`⏳ [Ledger] Rate limit — attendo 65s prima di riprovare ${label}…`);
          await sleep(65000);
          continue; // riprova stesso tentativo
        }
        break; // altro errore o massimo tentativi → passa al prossimo label
      }
    }
  }

  logger.warn("⚠️ [Ledger] Nessun dato SELLABLE trovato in nessun tentativo.");
  return { ok: true, righeAggiornate: 0, avviso: "Nessun dato inventario trovato nel Ledger EU." };
}

module.exports = { aggiornaLedgerStock };
