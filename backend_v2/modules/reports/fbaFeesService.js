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

module.exports = { aggiornaFBAFees, getFBAFees };
