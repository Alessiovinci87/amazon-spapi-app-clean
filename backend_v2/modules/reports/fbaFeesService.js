// backend_v2/modules/reports/fbaFeesService.js
// Stima fee FBA per ASIN usando le tariffe note Amazon EU (Beauty/Personal Care)
// Non richiede permessi API aggiuntivi — calcola dalle vendite già in DB.
const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");

// ─── Tariffe Amazon EU note per categoria Beauty ──────────────
// Referral fee: % del prezzo di vendita
const REFERRAL_PCT = {
  IT: 0.15, FR: 0.15, ES: 0.15, DE: 0.15,
  NL: 0.15, BE: 0.15, PL: 0.15,
  UK: 0.1545, // 15.45% per UK
};

// Fulfillment FBA: tariffa fissa per unità basata sul tipo prodotto
// Questi valori sono le tariffe medie 2025 per "Small Standard" e "Large Standard"
// in EU per prodotti Beauty. Aggiornabili da Settings in futuro.
const FBA_FULFILL_DEFAULT = 3.20; // €3.20 medio per pezzo (Small/Large Standard EU)

// =====================================================
// AGGIORNA COMMISSIONI FBA (calcolo da dati vendita)
// =====================================================
async function aggiornaFBAFees() {
  logger.info("Avvio calcolo FBA fees (formula tariffe EU)...");

  try {
    const db = getDb();

    db.exec(`
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
    try { db.exec(`ALTER TABLE fba_fees ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`); } catch {}

    // 1. Prendi ASIN con vendite, raggruppati per paese
    const rows = db.prepare(`
      SELECT
        st.asin,
        st.sku,
        st.country,
        SUM(st.units_ordered) AS unita,
        SUM(st.ordered_product_sales) AS fatturato
      FROM sales_traffic st
      WHERE st.asin IS NOT NULL AND st.asin != '' AND st.units_ordered > 0
      GROUP BY st.asin, st.country
    `).all();

    logger.info(`Trovati ${rows.length} combinazioni ASIN×paese con vendite`);
    if (rows.length === 0) return { ok: true, record: 0 };

    const upsert = db.prepare(`
      INSERT OR REPLACE INTO fba_fees
      (asin, sku, country, referral_fee, fulfillment_fee, storage_fee, total_fee, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
    `);

    const insertMany = db.transaction((items) => {
      for (const r of items) upsert.run(r.asin, r.sku, r.country, r.referral, r.fulfillment, 0, r.total);
    });

    const toInsert = rows.map(r => {
      const prezzoMedio = r.unita > 0 ? r.fatturato / r.unita : 0;
      const referralPct = REFERRAL_PCT[r.country] || 0.15;
      const referral = Math.round(prezzoMedio * referralPct * 100) / 100;
      const fulfillment = FBA_FULFILL_DEFAULT;
      const total = Math.round((referral + fulfillment) * 100) / 100;

      return {
        asin: r.asin,
        sku: r.sku || "",
        country: r.country,
        referral,
        fulfillment,
        total,
      };
    });

    insertMany(toInsert);

    // Conta ASIN unici
    const uniqueAsins = new Set(toInsert.map(r => r.asin)).size;
    logger.info(`FBA Fees calcolate: ${toInsert.length} righe (${uniqueAsins} ASIN × ${Object.keys(REFERRAL_PCT).length} paesi max)`);

    return { ok: true, record: toInsert.length };
  } catch (err) {
    logger.error({ err }, "Errore aggiornaFBAFees");
    return { ok: false, error: err.message };
  }
}

// =====================================================
// Legge le fee dal DB
// =====================================================
function getFBAFees() {
  const db = getDb();
  return db.prepare("SELECT * FROM fba_fees ORDER BY updated_at DESC, asin, country").all();
}

// =====================================================
// Product Fees API — stima reale per ASIN (richiede permessi "Pricing" nell'app SP-API)
// =====================================================
const axios = require("axios");
const { sign } = require("aws4");
const { getAccessToken } = require("../auth/authService");

const SP_HOST = "sellingpartnerapi-eu.amazon.com";
const SP_URL = `https://${SP_HOST}`;

// Mapping marketplaceId → country (spostato qui per poter essere usato da vatRateForMarketplace)
const MKT_TO_COUNTRY = {
  APJ6JRA9NG5V4: "IT", A1PA6795UKMFR9: "DE", A13V1IB3VIYZZH: "FR",
  A1RKKUPIHCS9HS: "ES", A1F83G8C2ARO7P: "UK",
  A1805IZSGTT6HS: "NL", AMEN7PMS3EDWL: "BE", A1C3SOZRARQ6R3: "PL",
  A28R8C7NBKEWEA: "IE",
};

// Aliquote IVA standard per marketplace (per stimare valori netti)
// Riferimento: IVA "servizi" del marketplace di destinazione (applicata da Amazon sulle fee)
const VAT_RATE = {
  IT: 0.22, DE: 0.19, FR: 0.20, ES: 0.21,
  UK: 0.20, NL: 0.21, BE: 0.21, PL: 0.23,
  IE: 0.23,
};

function vatRateForMarketplace(marketplaceId) {
  const country = MKT_TO_COUNTRY[marketplaceId] || "IT";
  return VAT_RATE[country] ?? 0.22;
}

function toNet(gross, rate) {
  return +(Number(gross || 0) / (1 + rate)).toFixed(2);
}

/**
 * Chiama Product Fees API per un singolo ASIN + prezzo.
 * Ritorna breakdown fee o throw error (es. 403 se permessi mancanti).
 */
async function fetchFeesEstimateForAsin({ asin, price, marketplaceId, currency = "EUR", isAmazonFulfilled = true }) {
  if (!asin || !price || !marketplaceId) throw new Error("Parametri mancanti: asin, price, marketplaceId");
  const { access_token } = await getAccessToken();

  const body = {
    FeesEstimateRequest: {
      MarketplaceId: marketplaceId,
      IdType: "ASIN",
      IdValue: asin,
      IsAmazonFulfilled: isAmazonFulfilled,
      PriceToEstimateFees: {
        ListingPrice: { CurrencyCode: currency, Amount: Number(price) },
      },
      Identifier: `req-${asin}-${Date.now()}`,
    },
  };

  const urlPath = `/products/fees/v0/items/${encodeURIComponent(asin)}/feesEstimate`;
  const opts = {
    host: SP_HOST,
    path: urlPath,
    service: "execute-api",
    region: process.env.AWS_REGION || "eu-west-1",
    method: "POST",
    headers: { "x-amz-access-token": access_token, "content-type": "application/json" },
    body: JSON.stringify(body),
  };
  const signed = sign(opts, {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const res = await axios({
    method: "POST",
    url: `${SP_URL}${urlPath}`,
    headers: signed.headers,
    data: JSON.stringify(body),
    validateStatus: () => true,
  });
  if (res.status !== 200) {
    const err = new Error(`Product Fees API ${res.status}: ${JSON.stringify(res.data).slice(0, 300)}`);
    err.status = res.status;
    err.data = res.data;
    throw err;
  }
  const result = res.data?.payload?.FeesEstimateResult;
  if (!result || result.Status !== "Success") {
    const err = new Error(`Product Fees API status=${result?.Status || "?"}: ${JSON.stringify(result?.Error || result).slice(0, 300)}`);
    err.status = 400;
    err.data = result;
    throw err;
  }

  const fees = result.FeesEstimate;
  const total = fees?.TotalFeesEstimate?.Amount ?? 0;

  // Classifica ogni FeeDetail sul tipo. I FeeType comuni:
  // - ReferralFee (commissione categoria)
  // - FBAFees (parent, contiene fulfillment+storage nei sub-detail → non double count)
  // - FulfillmentFees (se IsAmazonFulfilled=true, può essere top-level)
  // - VariableClosingFee (solo certi marketplace/categorie)
  let referral = 0, fulfillment = 0, variable = 0;
  for (const f of fees?.FeeDetailList || []) {
    const amt = Number(f?.FinalFee?.Amount ?? f?.FeeAmount?.Amount ?? 0);
    const type = (f?.FeeType || "").toLowerCase();
    if (type.includes("referral")) referral += amt;
    else if (type === "fbafees" || type.includes("fulfillment") || type === "fbafee") fulfillment += amt;
    else if (type.includes("variable")) variable += amt;
  }
  logger.info(
    `[ProductFees] sku=${asin} mkt=${marketplaceId} price=${price} → total=${total} (ref=${referral.toFixed(2)} ful=${fulfillment.toFixed(2)} var=${variable.toFixed(2)})`
  );
  logger.info(`[ProductFees] FeeDetailList raw: ${JSON.stringify(fees?.FeeDetailList || []).slice(0, 600)}`);

  const vat = vatRateForMarketplace(marketplaceId);
  const totalNum = +Number(total).toFixed(2);
  return {
    asin,
    marketplaceId,
    price_used: Number(price),
    // Valori "gross" così come ritornati dall'API (IVA inclusa)
    referral_fee: +referral.toFixed(2),
    fulfillment_fee: +fulfillment.toFixed(2),
    variable_closing_fee: +variable.toFixed(2),
    total_fee: totalNum,
    // Valori "net" stimati rimuovendo l'IVA del marketplace
    referral_fee_net: toNet(referral, vat),
    fulfillment_fee_net: toNet(fulfillment, vat),
    variable_closing_fee_net: toNet(variable, vat),
    total_fee_net: toNet(totalNum, vat),
    vat_rate: vat,
    raw_fee_detail: fees?.FeeDetailList || [],
  };
}

/**
 * Salva le fee ricevute dall'API nella tabella fba_fees (upsert per asin+country).
 * marketplaceId → country tramite MKT_TO_COUNTRY (definito all'inizio del file).
 */

// Idempotente: assicura che fba_fees abbia tutte le colonne necessarie (source, price_used, _net).
// Chiamabile da più route che leggono quei campi senza attendere il primo confirm.
function ensureFbaFeesSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS fba_fees (
      asin TEXT, sku TEXT, country TEXT,
      referral_fee REAL DEFAULT 0, fulfillment_fee REAL DEFAULT 0, storage_fee REAL DEFAULT 0,
      total_fee REAL DEFAULT 0,
      source TEXT DEFAULT 'formula',
      price_used REAL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (asin, country)
    );
  `);
  try { db.exec(`ALTER TABLE fba_fees ADD COLUMN source TEXT DEFAULT 'formula'`); } catch {}
  try { db.exec(`ALTER TABLE fba_fees ADD COLUMN price_used REAL`); } catch {}
  try { db.exec(`ALTER TABLE fba_fees ADD COLUMN referral_fee_net REAL`); } catch {}
  try { db.exec(`ALTER TABLE fba_fees ADD COLUMN fulfillment_fee_net REAL`); } catch {}
  try { db.exec(`ALTER TABLE fba_fees ADD COLUMN total_fee_net REAL`); } catch {}
  try { db.exec(`ALTER TABLE fba_fees ADD COLUMN vat_rate REAL`); } catch {}
}

function salvaFeeConfermate(items) {
  ensureFbaFeesSchema();
  const db = getDb();

  const upsert = db.prepare(`
    INSERT INTO fba_fees (asin, sku, country, referral_fee, fulfillment_fee, storage_fee, total_fee, referral_fee_net, fulfillment_fee_net, total_fee_net, vat_rate, source, price_used, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'api', ?, datetime('now','localtime'))
    ON CONFLICT(asin, country) DO UPDATE SET
      sku = COALESCE(excluded.sku, sku),
      referral_fee = excluded.referral_fee,
      fulfillment_fee = excluded.fulfillment_fee,
      total_fee = excluded.total_fee,
      referral_fee_net = excluded.referral_fee_net,
      fulfillment_fee_net = excluded.fulfillment_fee_net,
      total_fee_net = excluded.total_fee_net,
      vat_rate = excluded.vat_rate,
      source = 'api',
      price_used = excluded.price_used,
      updated_at = excluded.updated_at
  `);

  const tx = db.transaction((arr) => {
    for (const it of arr) {
      const country = MKT_TO_COUNTRY[it.marketplaceId] || null;
      if (!country) continue;
      const vat = vatRateForMarketplace(it.marketplaceId);
      const referralNet = it.referral_fee_net != null ? it.referral_fee_net : toNet(it.referral_fee, vat);
      const fulfillmentNet = it.fulfillment_fee_net != null ? it.fulfillment_fee_net : toNet(it.fulfillment_fee, vat);
      const totalNet = it.total_fee_net != null ? it.total_fee_net : toNet(it.total_fee, vat);
      upsert.run(
        it.asin, it.sku || null, country,
        it.referral_fee, it.fulfillment_fee, 0, it.total_fee,
        referralNet, fulfillmentNet, totalNet, vat,
        it.price_used
      );
    }
  });
  tx(items);
  return { ok: true, saved: items.length };
}

module.exports = {
  aggiornaFBAFees,
  getFBAFees,
  fetchFeesEstimateForAsin,
  salvaFeeConfermate,
  ensureFbaFeesSchema,
  MKT_TO_COUNTRY,
};
