// backend_v2/modules/listings/listingsAmazonRoutes.js
const express = require("express");
const router = express.Router();
const {
  getListingItem,
  patchListingItem,
  deleteListingItem,
} = require("./listingsAmazonService");

/**
 * GET /api/v2/listings-amazon/test-listing
 * Test diagnostico: prova 3 varianti di chiamata Listings API
 * per identificare il problema esatto. Usa la prima SKU dal DB o una di default.
 */
router.get("/test-listing", async (req, res) => {
  const { getAccessToken } = require("../auth/authService");
  const { spGet } = require("../catalog/catalogAmazonService");
  const axios = require("axios");
  const { sign } = require("aws4");

  const sellerId = process.env.SELLER_ID;
  const sku = req.query.sku || "BW-04QR-KNSR";
  const marketplaceId = req.query.marketplaceId || "APJ6JRA9NG5V4";
  const { access_token } = await getAccessToken();

  const results = {};

  // Info ambiente
  results.env = {
    SELLER_ID: sellerId,
    AWS_REGION: process.env.AWS_REGION,
    sku_testato: sku,
    marketplaceId,
  };

  // TEST 1: GET Listings Items (path-based, signed)
  try {
    const encodedSku = encodeURIComponent(sku);
    const path = `/listings/2021-08-01/items/${sellerId}/${encodedSku}`;
    const qs = `marketplaceIds=${marketplaceId}&includedData=summaries,attributes,issues`;
    const fullPath = `${path}?${qs}`;

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
    const resp = await axios.get(`https://sellingpartnerapi-eu.amazon.com${fullPath}`, {
      headers: signed.headers,
    });
    results.test1_get_listing = { ok: true, status: resp.status, data: resp.data };
  } catch (err) {
    results.test1_get_listing = {
      ok: false,
      status: err.response?.status,
      error: err.response?.data || err.message,
      requestId: err.response?.headers?.["x-amzn-requestid"],
    };
  }

  // TEST 2: GET con marketplaceIds come parametro ripetuto (non comma-separated)
  try {
    const encodedSku = encodeURIComponent(sku);
    const path = `/listings/2021-08-01/items/${sellerId}/${encodedSku}`;
    const qs = `marketplaceIds=${marketplaceId}`;
    const fullPath = `${path}?${qs}`;

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
    const resp = await axios.get(`https://sellingpartnerapi-eu.amazon.com${fullPath}`, {
      headers: signed.headers,
    });
    results.test2_get_single_mp = { ok: true, status: resp.status, productType: resp.data?.productType };
  } catch (err) {
    results.test2_get_single_mp = {
      ok: false,
      status: err.response?.status,
      error: err.response?.data || err.message,
    };
  }

  // TEST 3: Marketplace Participations (verifica SELLER_ID valido)
  try {
    const resp = await axios.get(
      "https://sellingpartnerapi-eu.amazon.com/sellers/v1/marketplaceParticipations",
      { headers: { "x-amz-access-token": access_token } }
    );
    const partecipazioni = resp.data?.payload || resp.data;
    results.test3_participations = {
      ok: true,
      seller_id_env: sellerId,
      marketplace_count: Array.isArray(partecipazioni) ? partecipazioni.length : "N/A",
      marketplaces: Array.isArray(partecipazioni)
        ? partecipazioni.map(p => ({
            id: p.marketplace?.id,
            country: p.marketplace?.countryCode,
            participating: p.participation?.isParticipating,
          }))
        : partecipazioni,
    };
  } catch (err) {
    results.test3_participations = {
      ok: false,
      status: err.response?.status,
      error: err.response?.data || err.message,
    };
  }

  // TEST 4: GET Listing SENZA includedData (parametri minimi)
  try {
    const encodedSku = encodeURIComponent(sku);
    const path = `/listings/2021-08-01/items/${sellerId}/${encodedSku}`;
    const qs = `marketplaceIds=${marketplaceId}`;
    const fullPath = `${path}?${qs}`;

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
    const resp = await axios.get(`https://sellingpartnerapi-eu.amazon.com${fullPath}`, {
      headers: signed.headers,
    });
    results.test4_minimal_get = { ok: true, status: resp.status, data: resp.data };
  } catch (err) {
    results.test4_minimal_get = {
      ok: false,
      status: err.response?.status,
      error: err.response?.data || err.message,
    };
  }

  // TEST 5: searchListingsItems (sellerId in QUERY, non in path)
  // Se 403 → ruolo mancante. Se 400 → problema parametri diverso.
  try {
    const path = `/listings/2021-08-01/items`;
    const qs = `sellerId=${sellerId}&marketplaceIds=${marketplaceId}&identifiers=${encodeURIComponent(sku)}&identifiersType=SKU&includedData=summaries`;
    const fullPath = `${path}?${qs}`;

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
    const resp = await axios.get(`https://sellingpartnerapi-eu.amazon.com${fullPath}`, {
      headers: signed.headers,
    });
    results.test5_search_listings = { ok: true, status: resp.status, data: resp.data };
  } catch (err) {
    results.test5_search_listings = {
      ok: false,
      status: err.response?.status,
      error: err.response?.data || err.message,
    };
  }

  // TEST 6: Catalog Items (confronto — questo funziona sicuramente)
  try {
    const { getDb } = require("../../db/database");
    const db = getDb();
    const row = db.prepare("SELECT asin FROM amazon_listings WHERE sku = ? LIMIT 1").get(sku);
    if (row?.asin) {
      const catalogData = await spGet(
        `/catalog/2022-04-01/items/${row.asin}`,
        { marketplaceIds: marketplaceId, includedData: "summaries" },
        access_token
      );
      results.test6_catalog = { ok: true, asin: row.asin, title: catalogData?.summaries?.[0]?.itemName };
    } else {
      results.test6_catalog = { ok: true, note: "SKU non in cache locale, skip test catalog" };
    }
  } catch (err) {
    results.test6_catalog = { ok: false, error: err.message };
  }

  res.json(results);
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
