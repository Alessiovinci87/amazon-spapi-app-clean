// backend_v2/modules/listings/listingsAmazonRoutes.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const {
  getListingItem,
  patchListingItem,
  deleteListingItem,
} = require("./listingsAmazonService");
const { getAccessToken } = require("../auth/authService");
const { spGet } = require("../catalog/catalogAmazonService");

/**
 * DIAG: verifica auth + confronta SELLER_ID env vs marketplaceParticipations
 * DEVE essere prima di /:sku altrimenti viene intercettato come SKU="diag"
 */
router.get("/diag", async (req, res) => {
  const out = {
    env_seller_id: process.env.SELLER_ID || null,
    env_aws_region: process.env.AWS_REGION || null,
    participations: null,
    participations_error: null,
  };

  try {
    const { access_token } = await getAccessToken();
    const url = "https://sellingpartnerapi-eu.amazon.com/sellers/v1/marketplaceParticipations";
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
      },
    });
    out.participations = response.data;
  } catch (err) {
    out.participations_error = {
      status: err.response?.status,
      data: err.response?.data || err.message,
    };
  }

  res.json(out);
});

/**
 * TEST: searchListingsItems endpoint (sellerId in QUERY invece che in PATH)
 * URL: /api/v2/listings-amazon/test-search?sku=X
 */
router.get("/test-search", async (req, res) => {
  try {
    const { access_token } = await getAccessToken();
    const sku = req.query.sku || "BW-04QR-KNSR";
    const sellerId = process.env.SELLER_ID;

    const path = `/listings/2021-08-01/items`;
    const query = {
      sellerId,
      marketplaceIds: "APJ6JRA9NG5V4",
      identifiers: sku,
      identifiersType: "SKU",
    };

    console.log("🧪 TEST searchListingsItems:", path, query);
    try {
      const result = await spGet(path, query, access_token);
      res.json({ ok: true, endpoint: "searchListingsItems", path, query, result });
    } catch (err) {
      res.status(200).json({
        ok: false,
        endpoint: "searchListingsItems",
        path,
        query,
        status: err.response?.status,
        data: err.response?.data || err.message,
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * TEST: usa lo stesso signer (spGet) che funziona su catalog, ma sull'URL listings.
 * Serve a isolare se il problema è il signer o l'endpoint/params.
 * URL: /api/v2/listings-amazon/test-catalog-signer/:sku?marketplaceIds=APJ6JRA9NG5V4
 */
router.get("/test-catalog-signer/:sku", async (req, res) => {
  try {
    const { sku } = req.params;
    const marketplaceIds = req.query.marketplaceIds || "APJ6JRA9NG5V4";
    const { access_token } = await getAccessToken();

    // Usa spGet (che funziona su catalog) sull'URL listings
    const sellerId = process.env.SELLER_ID;
    const path = `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}`;

    console.log("🧪 TEST catalog-signer su listings URL:", path);
    try {
      const result = await spGet(path, { marketplaceIds }, access_token);
      res.json({ ok: true, path, result });
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      console.log("🧪 TEST risultato:", status, JSON.stringify(data));
      res.status(200).json({ ok: false, path, status, data: data || err.message });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
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


/**
 * DEBUG: GET listing senza firma AWS4
 * Usa solo access_token (come Postman)
 * URL: /api/v2/listings-amazon/debug/:sku?marketplaceIds=XXX
 */
router.get("/debug/:sku", async (req, res) => {
  const { sku } = req.params;
  const { marketplaceIds = "APJ6JRA9NG5V4" } = req.query;
  const { access_token } = await getAccessToken();
  const sellerId = process.env.SELLER_ID;

  const variants = [
    {
      name: "A_minimal",
      url: `https://sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${sellerId}/${sku}?marketplaceIds=${marketplaceIds}`,
      headers: { "x-amz-access-token": access_token },
    },
    {
      name: "B_with_authorization",
      url: `https://sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${sellerId}/${sku}?marketplaceIds=${marketplaceIds}`,
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
      },
    },
    {
      name: "C_with_includedData",
      url: `https://sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${sellerId}/${sku}?marketplaceIds=${marketplaceIds}&includedData=summaries`,
      headers: { "x-amz-access-token": access_token },
    },
    {
      name: "D_encoded_sku",
      url: `https://sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}?marketplaceIds=${marketplaceIds}`,
      headers: { "x-amz-access-token": access_token },
    },
  ];

  const results = [];
  for (const v of variants) {
    console.log(`\n👉 [${v.name}] ${v.url}`);
    try {
      const response = await axios.get(v.url, { headers: v.headers });
      console.log(`   ✅ ${v.name} status ${response.status}`);
      results.push({
        name: v.name,
        ok: true,
        status: response.status,
        data: response.data,
      });
    } catch (err) {
      console.log(`   ❌ ${v.name} status ${err.response?.status}`);
      console.log(`      ${JSON.stringify(err.response?.data || err.message)}`);
      results.push({
        name: v.name,
        ok: false,
        status: err.response?.status,
        data: err.response?.data,
        requestId: err.response?.headers?.["x-amzn-requestid"],
      });
    }
  }

  res.json({ sellerId, sku, marketplaceIds, variants: results });
});

module.exports = router;
