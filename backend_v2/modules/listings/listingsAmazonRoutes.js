// backend_v2/modules/listings/listingsAmazonRoutes.js
const express = require("express");
const logger = require("../../utils/logger");
const router = express.Router();
const {
  getListingItem,
  getSubmissionStatus,
  patchListingItem,
  deleteListingItem,
  updateListingPrice,
  updateListingViaFeed,
} = require("./listingsAmazonService");
const { spGet } = require("../catalog/catalogAmazonService");
const { getAccessToken } = require("../auth/authService");
const { getDb } = require("../../db/database");

// Assicura la tabella di log delle modifiche prezzo (idempotente, lazy).
// NON chiamare al top-level: il DB viene inizializzato da index.js PRIMA di montare le route.
let _priceLogTableEnsured = false;
function ensurePriceLogTable() {
  if (_priceLogTableEnsured) return;
  const db = getDb();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS price_updates_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL,
      marketplace_id TEXT NOT NULL,
      old_price REAL,
      new_price REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      submission_id TEXT,
      status TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_price_updates_log_sku ON price_updates_log(sku)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_price_updates_log_created ON price_updates_log(created_at DESC)`).run();
  _priceLogTableEnsured = true;
}

/**
 * GET /api/v2/listings-amazon/test-listing
 * Test diagnostico: prova 3 varianti di chiamata Listings API
 * per identificare il problema esatto. Usa la prima SKU dal DB o una di default.
 */
router.get("/test-listing", async (req, res) => {
  const { getAccessToken } = require("../auth/authService");
  const axios = require("axios");
  const { sign } = require("aws4");

  const sellerId = process.env.SELLER_ID;
  const sku = req.query.sku || "BW-04QR-KNSR";
  const marketplaceId = req.query.marketplaceId || "APJ6JRA9NG5V4";
  const { access_token } = await getAccessToken();

  const results = {};
  results.env = { SELLER_ID: sellerId, AWS_REGION: process.env.AWS_REGION, sku_testato: sku, marketplaceId };

  // Helper: firma e chiama, restituisce debug completo
  async function debugCall(label, path, qs) {
    const fullPath = qs ? `${path}?${qs}` : path;
    const opts = {
      host: "sellingpartnerapi-eu.amazon.com",
      path: fullPath,
      service: "execute-api",
      region: process.env.AWS_REGION,
      method: "GET",
      headers: { "x-amz-access-token": access_token },
    };
    const signed = sign(opts, {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    const debug = {
      label,
      fullPath,
      canonical_uri: path,
      canonical_querystring: qs,
      signed_headers: { ...signed.headers },
    };
    // Maschera completamente i valori sensibili — non loggare token nemmeno parziali
    if (debug.signed_headers.Authorization) {
      debug.signed_headers.Authorization = "*** MASKED ***";
    }
    if (debug.signed_headers["x-amz-access-token"]) {
      debug.signed_headers["x-amz-access-token"] = "*** MASKED ***";
    }
    if (debug.signed_headers["x-amz-security-token"]) {
      debug.signed_headers["x-amz-security-token"] = "*** MASKED ***";
    }
    try {
      const resp = await axios.get(`https://sellingpartnerapi-eu.amazon.com${fullPath}`, { headers: signed.headers });
      return { ok: true, status: resp.status, data: resp.data, debug };
    } catch (err) {
      return {
        ok: false,
        status: err.response?.status,
        error: err.response?.data || err.message,
        requestId: err.response?.headers?.["x-amzn-requestid"],
        debug,
      };
    }
  }

  // Recupera ASIN per questo SKU dal DB locale
  let asin = null;
  try {
    const { getDb } = require("../../db/database");
    const db = getDb();
    const row = db.prepare("SELECT asin FROM amazon_listings WHERE sku = ? LIMIT 1").get(sku);
    asin = row?.asin;
  } catch (_) {}

  // ═══ A) CATALOG API — funziona, baseline ═══
  if (asin) {
    const catalogPath = `/catalog/2022-04-01/items/${asin}`;
    const catalogQs = `marketplaceIds=${marketplaceId}&includedData=summaries`;
    results.catalog_baseline = await debugCall("Catalog API (baseline)", catalogPath, catalogQs);
  }

  // ═══ B) LISTINGS — encoding singolo (standard) ═══
  const singleEnc = encodeURIComponent(sku);
  const listPath1 = `/listings/2021-08-01/items/${sellerId}/${singleEnc}`;
  const listQs1 = `includedData=summaries&marketplaceIds=${marketplaceId}`;
  results.listings_single_enc = await debugCall("Listings single-encode", listPath1, listQs1);

  // ═══ C) LISTINGS — doppio encoding ═══
  const doubleEnc = encodeURIComponent(encodeURIComponent(sku));
  const listPath2 = `/listings/2021-08-01/items/${sellerId}/${doubleEnc}`;
  const listQs2 = `includedData=summaries&marketplaceIds=${marketplaceId}`;
  results.listings_double_enc = await debugCall("Listings double-encode", listPath2, listQs2);

  // ═══ D) LISTINGS — senza includedData ═══
  const listPath3 = `/listings/2021-08-01/items/${sellerId}/${singleEnc}`;
  const listQs3 = `marketplaceIds=${marketplaceId}`;
  results.listings_no_included = await debugCall("Listings no includedData", listPath3, listQs3);

  // ═══ E) LISTINGS — ZERO query params ═══
  const listPath4 = `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}`;
  try {
    const opts4 = {
      host: "sellingpartnerapi-eu.amazon.com",
      path: listPath4,
      service: "execute-api",
      region: process.env.AWS_REGION,
      method: "GET",
      headers: { "x-amz-access-token": access_token },
    };
    const signed4 = sign(opts4, {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    const resp4 = await axios.get(`https://sellingpartnerapi-eu.amazon.com${listPath4}`, { headers: signed4.headers });
    results.listings_no_params = {
      ok: true, status: resp4.status, data: resp4.data,
      headers: { "x-amzn-requestid": resp4.headers["x-amzn-requestid"], "x-amz-apigw-id": resp4.headers["x-amz-apigw-id"], "content-type": resp4.headers["content-type"] },
    };
  } catch (err) {
    results.listings_no_params = {
      ok: false, status: err.response?.status,
      body: err.response?.data,
      headers: err.response?.headers ? {
        "x-amzn-requestid": err.response.headers["x-amzn-requestid"],
        "x-amzn-errortype": err.response.headers["x-amzn-errortype"],
        "x-amz-apigw-id": err.response.headers["x-amz-apigw-id"],
        "content-type": err.response.headers["content-type"],
      } : null,
      debug: { path: listPath4 },
    };
  }

  res.json(results);
});

/**
 * POST /api/v2/listings-amazon/feed-update
 * Workaround: aggiorna listing via JSON_LISTINGS_FEED (Feeds API)
 * Body: { sku, productType, attributes, marketplaceIds? }
 *
 * Esempio body per modificare titolo:
 * {
 *   "sku": "0C-GRMH-AF5U",
 *   "productType": "BEAUTY",
 *   "attributes": {
 *     "item_name": [{ "value": "Nuovo titolo", "marketplace_id": "APJ6JRA9NG5V4" }]
 *   }
 * }
 */
router.post("/feed-update", async (req, res) => {
  try {
    const { sku, productType, attributes, marketplaceIds } = req.body;
    if (!sku || !productType || !attributes) {
      return res.status(400).json({ ok: false, error: "Parametri obbligatori: sku, productType, attributes" });
    }
    const mpIds = marketplaceIds || ["APJ6JRA9NG5V4"];
    logger.info(`[Feed] Route feed-update: SKU=${sku}, productType=${productType}`);
    const result = await updateListingViaFeed(sku, productType, attributes, mpIds);
    res.json({ ok: true, ...result });
  } catch (e) {
    logger.error("❌ Errore feed-update:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v2/listings-amazon/feed-test
 * Test rapido: modifica il titolo di un prodotto via feed
 * Query: ?sku=XXX&title=NuovoTitolo&marketplaceId=APJ6JRA9NG5V4
 */
router.post("/feed-test", async (req, res) => {
  try {
    const sku = req.query.sku || req.body.sku;
    const title = req.query.title || req.body.title;
    const marketplaceId = req.query.marketplaceId || "APJ6JRA9NG5V4";

    if (!sku || !title) {
      return res.status(400).json({ ok: false, error: "Parametri: sku, title" });
    }

    logger.info(`[Feed] Test: SKU=${sku}, title="${title.substring(0, 50)}..."`);

    const attributes = {
      item_name: [{ value: title, marketplace_id: marketplaceId }],
    };

    const result = await updateListingViaFeed(sku, "PRODUCT", attributes, [marketplaceId]);
    res.json({ ok: true, ...result });
  } catch (e) {
    logger.error("❌ Errore feed-test:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v2/listings-amazon/price-info?sku=XXX&marketplaceId=APJ6JRA9NG5V4
 * Ritorna il prezzo attuale + titolo dallo snapshot locale (listings_snapshot).
 */
router.get("/price-info", async (req, res) => {
  try {
    ensurePriceLogTable();
    const { sku, marketplaceId, fresh } = req.query;
    if (!sku || !marketplaceId) {
      return res.status(400).json({ ok: false, error: "Parametri obbligatori: sku, marketplaceId" });
    }
    const db = getDb();
    const row = db.prepare(
      "SELECT sku, asin, title FROM amazon_listings WHERE sku = ? LIMIT 1"
    ).get(sku);
    if (!row) {
      return res.status(404).json({ ok: false, error: "SKU non trovato nel catalogo locale" });
    }

    // Opzione ?fresh=1: interroga Amazon in diretta (Pricing API) e aggiorna lo snapshot.
    // Usalo quando il prezzo in cache è stale. Attenzione: rate limit ~0.5 req/s.
    // Distingue MIO prezzo (il tuo listing) da BUYBOX prezzo (chi vince la pagina pubblica).
    let liveInfo = null;
    let liveError = null;
    if (fresh === "1" || fresh === "true") {
      try {
        const { access_token } = await getAccessToken();
        // getListingOffers: riferito al TUO listing (sellerSku). Include Summary con BuyBoxPrices
        // e Offers (almeno la tua, spesso anche competitor). Campo `MyOffer: true` identifica la tua.
        let pricing = null;
        try {
          pricing = await spGet(
            `/products/pricing/v0/listings/${encodeURIComponent(sku)}/offers`,
            { MarketplaceId: marketplaceId, ItemCondition: "New" },
            access_token
          );
        } catch (err1) {
          logger.warn(`[price-info] getListingOffers fallito (${err1?.response?.status}), fallback getItemOffers`);
          pricing = await spGet(
            `/products/pricing/v0/items/${row.asin}/offers`,
            { MarketplaceId: marketplaceId, ItemCondition: "New" },
            access_token
          );
        }
        const offers = pricing?.Offers ?? [];
        const summary = pricing?.Summary ?? {};

        // MIO prezzo: cerca offer con MyOffer=true, altrimenti SellerId uguale al mio
        const mySellerId = process.env.SELLER_ID;
        const myOffer = offers.find(o => o?.MyOffer === true)
          || offers.find(o => o?.SellerId && mySellerId && o.SellerId === mySellerId)
          || offers[0];
        const myPrice = myOffer?.ListingPrice?.Amount ?? null;
        const myCurrency = myOffer?.ListingPrice?.CurrencyCode ?? "EUR";
        const iAmBuyBox = myOffer?.IsBuyBoxWinner === true || myOffer?.IsFeaturedMerchant === true;

        // BUYBOX prezzo: quello mostrato sulla pagina pubblica Amazon
        const bb = summary?.BuyBoxPrices?.[0];
        const buyboxPrice = bb?.LandedPrice?.Amount ?? null;
        const buyboxCurrency = bb?.LandedPrice?.CurrencyCode ?? myCurrency;

        // LowestPrices come ulteriore fallback
        const lowestPrice = summary?.LowestPrices?.[0]?.LandedPrice?.Amount ?? null;

        // Nello snapshot salvo il MIO prezzo (quello che l'utente gestisce).
        // Il buybox va come campo separato per riferimento nella UI.
        const prezzo = myPrice ?? buyboxPrice ?? lowestPrice;
        const currency = myCurrency;
        const buyboxWon = iAmBuyBox ? 1 : 0;

        const now = new Date().toISOString();
        if (prezzo != null) {
          const upd = db.prepare(
            "UPDATE listings_snapshot SET prezzo = ?, currency = ?, buybox_won = ?, snapshot_at = ? WHERE asin = ? AND marketplace_id = ?"
          ).run(prezzo, currency, buyboxWon, now, row.asin, marketplaceId);
          if (upd.changes === 0) {
            db.prepare(
              "INSERT INTO listings_snapshot (asin, marketplace_id, prezzo, currency, buybox_won, snapshot_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).run(row.asin, marketplaceId, prezzo, currency, buyboxWon, now);
          }
        }

        liveInfo = {
          prezzo,
          currency,
          buybox_won: buyboxWon,
          snapshot_at: now,
          my_price: myPrice,
          buybox_price: buyboxPrice,
          buybox_currency: buyboxCurrency,
          lowest_price: lowestPrice,
          offers_count: offers.length,
          i_am_buybox: iAmBuyBox,
        };
        logger.info(`[price-info fresh] sku=${sku} asin=${row.asin} mkt=${marketplaceId} my=${myPrice} bb=${buyboxPrice} lowest=${lowestPrice} offers=${offers.length}`);
      } catch (err) {
        liveError = err?.response?.data || err.message;
        logger.warn(`[price-info fresh] fallito ${row.asin}/${marketplaceId}: ${JSON.stringify(liveError)}`);
      }
    }

    const snap = liveInfo || db.prepare(
      "SELECT prezzo, currency, titolo, buybox_won, snapshot_at FROM listings_snapshot WHERE asin = ? AND marketplace_id = ? LIMIT 1"
    ).get(row.asin, marketplaceId);

    // Per la titolo, anche se liveInfo c'è, prendi dalla snapshot DB se manca lì
    const titoloFromDb = db.prepare(
      "SELECT titolo FROM listings_snapshot WHERE asin = ? AND marketplace_id = ? LIMIT 1"
    ).get(row.asin, marketplaceId)?.titolo;

    res.json({
      ok: true,
      sku: row.sku,
      asin: row.asin,
      titolo: snap?.titolo || titoloFromDb || row.title || null,
      prezzo: snap?.prezzo ?? null,
      currency: snap?.currency || "EUR",
      buybox_won: snap?.buybox_won ?? null,
      snapshot_at: snap?.snapshot_at || null,
      source: liveInfo ? "live" : "cache",
      live_error: liveError ? (typeof liveError === "string" ? liveError.slice(0, 500) : JSON.stringify(liveError).slice(0, 500)) : null,
      // Campi extra solo se fresh=1
      my_price: liveInfo?.my_price ?? null,
      buybox_price: liveInfo?.buybox_price ?? null,
      lowest_price: liveInfo?.lowest_price ?? null,
      offers_count: liveInfo?.offers_count ?? null,
      i_am_buybox: liveInfo?.i_am_buybox ?? null,
    });
  } catch (e) {
    logger.error("❌ Errore GET /price-info:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v2/listings-amazon/price
 * Body: { sku, price, marketplaceId, currency?, productType? }
 * Invia PATCH a SP-API su `purchasable_offer`, aggiorna listings_snapshot locale e logga la submission.
 */
router.post("/price", async (req, res) => {
  try {
    ensurePriceLogTable();
    const { sku, price, marketplaceId, currency = "EUR", productType = "PRODUCT" } = req.body || {};
    if (!sku || price == null || !marketplaceId) {
      return res.status(400).json({ ok: false, error: "Parametri obbligatori: sku, price, marketplaceId" });
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return res.status(400).json({ ok: false, error: "Prezzo non valido" });
    }

    const db = getDb();
    // Lookup ASIN per aggiornare lo snapshot dopo
    const lst = db.prepare("SELECT asin FROM amazon_listings WHERE sku = ? LIMIT 1").get(sku);
    const asin = lst?.asin || null;
    const snapBefore = asin
      ? db.prepare("SELECT prezzo FROM listings_snapshot WHERE asin = ? AND marketplace_id = ? LIMIT 1").get(asin, marketplaceId)
      : null;
    const oldPrice = snapBefore?.prezzo ?? null;

    let spResult = null;
    let logError = null;
    try {
      spResult = await updateListingPrice(sku, { price: priceNum, marketplaceId, currency, productType });
    } catch (e) {
      logError = e.message;
    }

    const submissionId = spResult?.submissionId || null;
    const status = spResult?.status || (spResult?.error ? "ERROR" : null);
    const apiErr = spResult?.error ? (typeof spResult.data === "string" ? spResult.data : JSON.stringify(spResult.data || spResult.message || "")) : null;

    // Log sempre (anche se fallisce)
    db.prepare(`
      INSERT INTO price_updates_log (sku, marketplace_id, old_price, new_price, currency, submission_id, status, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sku, marketplaceId, oldPrice, priceNum, currency, submissionId, status, logError || apiErr || null);

    if (logError) return res.status(500).json({ ok: false, error: logError });
    if (spResult?.error) return res.status(spResult.status || 500).json({ ok: false, status: spResult.status, data: spResult.data });

    // Aggiorna snapshot locale col nuovo prezzo (best-effort)
    if (asin) {
      const upd = db.prepare(
        "UPDATE listings_snapshot SET prezzo = ?, currency = ?, snapshot_at = CURRENT_TIMESTAMP WHERE asin = ? AND marketplace_id = ?"
      ).run(priceNum, currency, asin, marketplaceId);
      if (upd.changes === 0) {
        // Nessuna riga: inserisci una nuova
        db.prepare(
          "INSERT INTO listings_snapshot (asin, marketplace_id, prezzo, currency, snapshot_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)"
        ).run(asin, marketplaceId, priceNum, currency);
      }
    }

    res.json({ ok: true, submissionId, status, oldPrice, newPrice: priceNum });
  } catch (e) {
    logger.error("❌ Errore POST /price:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v2/listings-amazon/price-bulk
 * Body: { items: [{sku, price, marketplaceId, currency?, productType?}] }
 * Aggiorna più prezzi in sequenza. Ritorna array di risultati (ok/error per ogni riga).
 * Ogni update è comunque loggato in price_updates_log. Pausa 300ms tra le chiamate.
 */
router.post("/price-bulk", async (req, res) => {
  try {
    ensurePriceLogTable();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return res.status(400).json({ ok: false, error: "items vuoto" });
    if (items.length > 100) return res.status(400).json({ ok: false, error: "max 100 items per chiamata" });

    const db = getDb();
    const results = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const { sku, price, marketplaceId, currency = "EUR", productType = "PRODUCT" } = it || {};
      if (!sku || price == null || !marketplaceId) {
        results.push({ sku: sku || null, ok: false, error: "Parametri mancanti" });
        continue;
      }
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        results.push({ sku, ok: false, error: "Prezzo non valido" });
        continue;
      }
      const lst = db.prepare("SELECT asin FROM amazon_listings WHERE sku = ? LIMIT 1").get(sku);
      const asin = lst?.asin || null;
      const oldRow = asin
        ? db.prepare("SELECT prezzo FROM listings_snapshot WHERE asin = ? AND marketplace_id = ? LIMIT 1").get(asin, marketplaceId)
        : null;

      let spResult = null, errMsg = null;
      try {
        spResult = await updateListingPrice(sku, { price: priceNum, marketplaceId, currency, productType });
      } catch (e) {
        errMsg = e.message;
      }

      const submissionId = spResult?.submissionId || null;
      const status = spResult?.status || (spResult?.error ? "ERROR" : null);
      const apiErr = spResult?.error ? JSON.stringify(spResult.data || spResult.message || "").slice(0, 500) : null;

      db.prepare(`
        INSERT INTO price_updates_log (sku, marketplace_id, old_price, new_price, currency, submission_id, status, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sku, marketplaceId, oldRow?.prezzo ?? null, priceNum, currency, submissionId, status, errMsg || apiErr || null);

      if (!errMsg && !spResult?.error && asin) {
        const upd = db.prepare(
          "UPDATE listings_snapshot SET prezzo = ?, currency = ?, snapshot_at = CURRENT_TIMESTAMP WHERE asin = ? AND marketplace_id = ?"
        ).run(priceNum, currency, asin, marketplaceId);
        if (upd.changes === 0) {
          db.prepare(
            "INSERT INTO listings_snapshot (asin, marketplace_id, prezzo, currency, snapshot_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)"
          ).run(asin, marketplaceId, priceNum, currency);
        }
      }

      results.push({
        sku,
        ok: !errMsg && !spResult?.error,
        submissionId,
        oldPrice: oldRow?.prezzo ?? null,
        newPrice: priceNum,
        error: errMsg || (spResult?.error ? apiErr : null),
      });

      // Piccola pausa per evitare rate-limit (Listings Items ~5 req/s)
      if (i < items.length - 1) await new Promise(r => setTimeout(r, 300));
    }
    const okCount = results.filter(r => r.ok).length;
    res.json({ ok: true, total: items.length, ok_count: okCount, ko_count: items.length - okCount, results });
  } catch (e) {
    logger.error("❌ Errore POST /price-bulk:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v2/listings-amazon/price-submission?sku=XXX&marketplaceId=YYY&logId=NN
 * Verifica lo stato attuale di una submission: interroga SP-API per vedere issues
 * e aggiorna il log locale se passato logId.
 */
router.get("/price-submission", async (req, res) => {
  try {
    ensurePriceLogTable();
    const { sku, marketplaceId, logId } = req.query;
    if (!sku || !marketplaceId) {
      return res.status(400).json({ ok: false, error: "Parametri: sku, marketplaceId" });
    }
    const result = await getSubmissionStatus(sku, null, [marketplaceId]);
    if (result?.error) {
      return res.status(result.status || 500).json({ ok: false, status: result.status, data: result.data });
    }
    const issues = result?.issues || result?.summaries?.flatMap(s => s.issues || []) || [];
    const summaries = result?.summaries || [];
    const hasErrors = issues.some(i => (i.severity || "").toUpperCase() === "ERROR");
    const computedStatus = hasErrors ? "ERROR" : (issues.length > 0 ? "WARNING" : "OK");

    if (logId) {
      const db = getDb();
      db.prepare(
        "UPDATE price_updates_log SET status = ?, error = ? WHERE id = ?"
      ).run(computedStatus, hasErrors ? JSON.stringify(issues.filter(i => i.severity === "ERROR")).slice(0, 500) : null, logId);
    }
    res.json({ ok: true, status: computedStatus, issues, summaries });
  } catch (e) {
    logger.error("❌ Errore GET /price-submission:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v2/listings-amazon/price-log?sku=XXX&limit=20
 * Ritorna lo storico delle modifiche prezzo (filtro opzionale per SKU).
 */
router.get("/price-log", (req, res) => {
  try {
    ensurePriceLogTable();
    const { sku } = req.query;
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const db = getDb();
    const rows = sku
      ? db.prepare("SELECT * FROM price_updates_log WHERE sku = ? ORDER BY created_at DESC LIMIT ?").all(sku, limit)
      : db.prepare("SELECT * FROM price_updates_log ORDER BY created_at DESC LIMIT ?").all(limit);
    res.json({ ok: true, items: rows });
  } catch (e) {
    logger.error("❌ Errore GET /price-log:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v2/listings-amazon/:sku?marketplaceId=XXXX
 * Recupera un listing Amazon
 */
router.get("/:sku", async (req, res) => {
  try {
    const { sku } = req.params;
    const { marketplaceId } = req.query;

    const marketplaceIds = marketplaceId ? [marketplaceId] : ["APJ6JRA9NG5V4"]; // default Italia

    logger.info("👉 ROUTE GET /listings-amazon");
    logger.info("   SKU:", sku);
    logger.info("   marketplaceIds:", marketplaceIds);

    const result = await getListingItem(sku, marketplaceIds);
    res.json(result);
  } catch (e) {
    logger.error("❌ Errore GET Listings:", e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * PATCH /api/v2/listings-amazon/:sku?marketplaceId=XXXX
 * Aggiorna un listing Amazon
 * Body = payload JSON da inviare a SP-API
 */
router.patch("/:sku", async (req, res) => {
  try {
    const { sku } = req.params;
    const { marketplaceId } = req.query;
    const payload = req.body;

    const marketplaceIds = marketplaceId ? [marketplaceId] : ["APJ6JRA9NG5V4"];

    logger.info("👉 ROUTE PATCH /listings-amazon");
    logger.info("   SKU:", sku);
    logger.info("   marketplaceIds:", marketplaceIds);
    logger.info("   Payload:", JSON.stringify(payload, null, 2));

    const result = await patchListingItem(sku, payload, marketplaceIds);
    res.json(result);
  } catch (e) {
    logger.error("❌ Errore PATCH Listings:", e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/v2/listings-amazon/:sku?marketplaceId=XXXX
 * Elimina un listing Amazon
 */
router.delete("/:sku", async (req, res) => {
  try {
    const { sku } = req.params;
    const { marketplaceId } = req.query;

    const marketplaceIds = marketplaceId ? [marketplaceId] : ["APJ6JRA9NG5V4"];

    logger.info("👉 ROUTE DELETE /listings-amazon");
    logger.info("   SKU:", sku);
    logger.info("   marketplaceIds:", marketplaceIds);

    const result = await deleteListingItem(sku, marketplaceIds);
    res.json(result);
  } catch (e) {
    logger.error("❌ Errore DELETE Listings:", e.message);
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;
