// backend_v2/modules/listings/listingsAmazonRoutes.js
const express = require("express");
const router = express.Router();
const {
  getListingItem,
  patchListingItem,
  deleteListingItem,
  updateListingViaFeed,
} = require("./listingsAmazonService");

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
    // Rimuovi il valore completo delle chiavi sensibili per leggibilita
    if (debug.signed_headers.Authorization) {
      debug.signed_headers.Authorization = debug.signed_headers.Authorization.substring(0, 80) + "...";
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
    console.log(`[Feed] Route feed-update: SKU=${sku}, productType=${productType}`);
    const result = await updateListingViaFeed(sku, productType, attributes, mpIds);
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error("❌ Errore feed-update:", e.message);
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

    console.log(`[Feed] Test: SKU=${sku}, title="${title.substring(0, 50)}..."`);

    const attributes = {
      item_name: [{ value: title, marketplace_id: marketplaceId }],
    };

    const result = await updateListingViaFeed(sku, "PRODUCT", attributes, [marketplaceId]);
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error("❌ Errore feed-test:", e.message);
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

    console.log("👉 ROUTE GET /listings-amazon");
    console.log("   SKU:", sku);
    console.log("   marketplaceIds:", marketplaceIds);

    const result = await getListingItem(sku, marketplaceIds);
    res.json(result);
  } catch (e) {
    console.error("❌ Errore GET Listings:", e.message);
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

    console.log("👉 ROUTE PATCH /listings-amazon");
    console.log("   SKU:", sku);
    console.log("   marketplaceIds:", marketplaceIds);
    console.log("   Payload:", JSON.stringify(payload, null, 2));

    const result = await patchListingItem(sku, payload, marketplaceIds);
    res.json(result);
  } catch (e) {
    console.error("❌ Errore PATCH Listings:", e.message);
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

    console.log("👉 ROUTE DELETE /listings-amazon");
    console.log("   SKU:", sku);
    console.log("   marketplaceIds:", marketplaceIds);

    const result = await deleteListingItem(sku, marketplaceIds);
    res.json(result);
  } catch (e) {
    console.error("❌ Errore DELETE Listings:", e.message);
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;
