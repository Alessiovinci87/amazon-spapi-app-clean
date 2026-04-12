// backend_v2/modules/listings/listingsEditorService.js
// Service per l'editor dei listing Amazon: sync cache locale, lista, update.

const { getDb } = require("../../db/database");
const {
  createReport,
  getReportStatus,
  downloadReportDocument,
} = require("../reports/reportsAmazonService");
const { patchListingItem } = require("./listingsAmazonService");
const { getCatalogForSync } = require("../catalog/catalogAmazonService");

const MARKETPLACES = {
  IT: "APJ6JRA9NG5V4",
  FR: "A13V1IB3VIYZZH",
  ES: "A1RKKUPIHCS9HS",
  DE: "A1PA6795UKMFR9",
  UK: "A1F83G8C2ARO7P",
  NL: "A1805IZSGTT6HS",
  BE: "AMEN7PMS3EDWL",
  PL: "A1C3SOZRARQ6R3",
  SE: "A2NODRKZP88ZB9",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// 🏗️ TABELLA CACHE
// ============================================================
function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS amazon_listings (
      sku TEXT NOT NULL,
      country TEXT NOT NULL,
      asin TEXT,
      parent_asin TEXT,
      title TEXT,
      bullets TEXT,
      description TEXT,
      images TEXT,
      last_submission_id TEXT,
      last_status TEXT,
      last_status_at TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (sku, country)
    );
    CREATE INDEX IF NOT EXISTS idx_amazon_listings_country ON amazon_listings(country);
    CREATE INDEX IF NOT EXISTS idx_amazon_listings_asin ON amazon_listings(asin);
    CREATE INDEX IF NOT EXISTS idx_amazon_listings_parent ON amazon_listings(parent_asin);
  `);
}

// ============================================================
// 🔄 SYNC: popola la cache di un country dal report Amazon
// Strategia: report GET_MERCHANT_LISTINGS_ALL_DATA per lista SKU+ASIN,
// poi Catalog Items API (1 call per ASIN unico) per titolo/bullet/descrizione.
// ============================================================
async function syncListings(country) {
  ensureTable();
  const marketplaceId = MARKETPLACES[country];
  if (!marketplaceId) throw new Error(`Country ${country} non supportato`);

  console.log(`📑 [${country}] Creazione report GET_MERCHANT_LISTINGS_ALL_DATA...`);
  const report = await createReport([marketplaceId]);
  const reportId = report.reportId;
  console.log(`   reportId = ${reportId}`);

  // Attendo DONE (max 10 minuti)
  let status = "IN_PROGRESS";
  let reportDocumentId = null;
  for (let i = 0; i < 60; i++) {
    await sleep(10000);
    const st = await getReportStatus(reportId);
    status = st.processingStatus;
    reportDocumentId = st.reportDocumentId;
    console.log(`   stato = ${status}`);
    if (status === "DONE") break;
    if (["CANCELLED", "FATAL"].includes(status)) {
      throw new Error(`Report ${country} ${status}`);
    }
  }
  if (status !== "DONE" || !reportDocumentId) {
    throw new Error(`Report ${country} non completato`);
  }

  console.log(`📥 [${country}] Download documento ${reportDocumentId}...`);
  const rows = await downloadReportDocument(reportDocumentId);
  console.log(`📦 [${country}] ${rows.length} righe nel report`);

  // Dedupe per ASIN: un'unica chiamata catalog per ASIN serve tutti gli SKU che lo condividono
  const asinToSkus = new Map();
  for (const row of rows) {
    const sku = row["seller-sku"];
    const asin = row["asin1"];
    const itemName = row["item-name"] || null;
    if (!sku || !asin) continue;
    if (!asinToSkus.has(asin)) asinToSkus.set(asin, []);
    asinToSkus.get(asin).push({ sku, fallbackTitle: itemName });
  }
  console.log(`🧬 [${country}] ${asinToSkus.size} ASIN unici su ${rows.length} SKU`);

  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO amazon_listings (sku, country, asin, parent_asin, title, bullets, description, images, updated_at)
    VALUES (@sku, @country, @asin, @parent_asin, @title, @bullets, @description, @images, CURRENT_TIMESTAMP)
    ON CONFLICT(sku, country) DO UPDATE SET
      asin = excluded.asin,
      parent_asin = excluded.parent_asin,
      title = excluded.title,
      bullets = excluded.bullets,
      description = excluded.description,
      images = excluded.images,
      updated_at = CURRENT_TIMESTAMP
  `);

  let doneAsins = 0;
  let failedAsins = 0;
  let skuSaved = 0;
  let firstLogged = false;

  for (const [asin, skuList] of asinToSkus) {
    try {
      const detail = await getCatalogForSync(asin, marketplaceId);

      if (!firstLogged) {
        console.log(`🔍 [${country}] Esempio catalog ${asin}:`);
        console.log(JSON.stringify(detail, null, 2).slice(0, 1500));
        firstLogged = true;
      }

      const { title, bullets, description, parentAsin, images } = detail;

      for (const { sku, fallbackTitle } of skuList) {
        upsert.run({
          sku,
          country,
          asin,
          parent_asin: parentAsin,
          title: title || fallbackTitle,
          bullets: JSON.stringify(bullets || []),
          description,
          images: JSON.stringify(images || []),
        });
        skuSaved++;
      }
      doneAsins++;

      // Rate limit Catalog Items: 2 req/s burst 20 → 500ms tra chiamate
      await sleep(500);
    } catch (err) {
      const status = err.response?.status;
      const amzMsg = err.response?.data?.errors?.[0]?.message;
      console.warn(`⚠️ [${country}] ASIN ${asin} (${status || "?"}): ${amzMsg || err.message}`);
      // Salvo almeno il fallback dal report (title da item-name)
      for (const { sku, fallbackTitle } of skuList) {
        upsert.run({
          sku,
          country,
          asin,
          parent_asin: null,
          title: fallbackTitle,
          bullets: JSON.stringify([]),
          description: null,
          images: JSON.stringify([]),
        });
        skuSaved++;
      }
      failedAsins++;
      await sleep(1000);
    }
  }

  console.log(
    `✅ [${country}] sync completato: ${doneAsins} ASIN ok, ${failedAsins} ASIN falliti (fallback report), ${skuSaved} righe SKU salvate`
  );
  return {
    country,
    total_rows: rows.length,
    asins_total: asinToSkus.size,
    asins_done: doneAsins,
    asins_failed: failedAsins,
    sku_saved: skuSaved,
  };
}

// ============================================================
// 📋 LIST: legge dalla cache con filtri
// ============================================================
function listListings({ country, search = "", limit = 200, offset = 0 }) {
  ensureTable();
  const db = getDb();
  const where = ["country = @country"];
  const params = { country, limit, offset };

  if (search) {
    where.push("(title LIKE @q OR sku LIKE @q OR asin LIKE @q OR parent_asin LIKE @q)");
    params.q = `%${search}%`;
  }

  const rows = db
    .prepare(
      `SELECT sku, country, asin, parent_asin, title, bullets, description, images,
              last_submission_id, last_status, last_status_at, updated_at
       FROM amazon_listings
       WHERE ${where.join(" AND ")}
       ORDER BY title COLLATE NOCASE ASC
       LIMIT @limit OFFSET @offset`
    )
    .all(params);

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM amazon_listings WHERE ${where.join(" AND ")}`)
    .get(params).n;

  return {
    total,
    rows: rows.map((r) => ({
      ...r,
      bullets: r.bullets ? JSON.parse(r.bullets) : [],
      images: r.images ? JSON.parse(r.images) : [],
    })),
  };
}

// ============================================================
// 📄 GET SINGOLO
// ============================================================
function getListing(sku, country) {
  ensureTable();
  const db = getDb();
  const r = db
    .prepare(`SELECT * FROM amazon_listings WHERE sku = ? AND country = ?`)
    .get(sku, country);
  if (!r) return null;
  return {
    ...r,
    bullets: r.bullets ? JSON.parse(r.bullets) : [],
    images: r.images ? JSON.parse(r.images) : [],
  };
}

// ============================================================
// ✏️ UPDATE: PATCH a SP-API + aggiorna cache
// ============================================================
async function updateListing(sku, country, changes) {
  ensureTable();
  const marketplaceId = MARKETPLACES[country];
  if (!marketplaceId) throw new Error(`Country ${country} non supportato`);

  // Costruisco il payload PATCH per SP-API (formato JSON Patch RFC-6902)
  const patches = [];

  if (changes.title !== undefined) {
    patches.push({
      op: "replace",
      path: "/attributes/item_name",
      value: [{ value: changes.title, language_tag: countryToLang(country), marketplace_id: marketplaceId }],
    });
  }

  if (changes.bullets !== undefined) {
    patches.push({
      op: "replace",
      path: "/attributes/bullet_point",
      value: changes.bullets.map((b) => ({
        value: b,
        language_tag: countryToLang(country),
        marketplace_id: marketplaceId,
      })),
    });
  }

  if (changes.description !== undefined) {
    patches.push({
      op: "replace",
      path: "/attributes/product_description",
      value: [
        {
          value: changes.description,
          language_tag: countryToLang(country),
          marketplace_id: marketplaceId,
        },
      ],
    });
  }

  if (!patches.length) {
    throw new Error("Nessuna modifica fornita");
  }

  const payload = {
    productType: changes.productType || "PRODUCT",
    patches,
  };

  const result = await patchListingItem(sku, payload, [marketplaceId]);

  if (result?.error) {
    return { ok: false, error: result.data || result.message || "Errore SP-API" };
  }

  const submissionId = result?.submissionId || null;
  const status = result?.status || null;

  // Aggiorno cache locale coi nuovi valori + tracking submission
  const db = getDb();
  db.prepare(
    `UPDATE amazon_listings
     SET title = COALESCE(@title, title),
         bullets = COALESCE(@bullets, bullets),
         description = COALESCE(@description, description),
         last_submission_id = @submissionId,
         last_status = @status,
         last_status_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE sku = @sku AND country = @country`
  ).run({
    sku,
    country,
    title: changes.title ?? null,
    bullets: changes.bullets ? JSON.stringify(changes.bullets) : null,
    description: changes.description ?? null,
    submissionId,
    status,
  });

  return { ok: true, submissionId, status, result };
}

function countryToLang(country) {
  const map = {
    IT: "it_IT",
    FR: "fr_FR",
    ES: "es_ES",
    DE: "de_DE",
    UK: "en_GB",
    NL: "nl_NL",
    BE: "nl_BE",
    PL: "pl_PL",
    SE: "sv_SE",
  };
  return map[country] || "en_GB";
}

module.exports = {
  ensureTable,
  syncListings,
  listListings,
  getListing,
  updateListing,
  MARKETPLACES,
};
