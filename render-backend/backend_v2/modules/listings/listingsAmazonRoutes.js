// backend_v2/modules/listings/listingsAmazonRoutes.js
const express = require("express");
const router = express.Router();
const {
  getListingItem,
  patchListingItem,
  deleteListingItem,
} = require("./listingsAmazonService");

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
const axios = require("axios");
const { getAccessToken } = require("../auth/authService");

router.get("/debug/:sku", async (req, res) => {
  try {
    const { sku } = req.params;
    const { marketplaceIds = "APJ6JRA9NG5V4" } = req.query;
    const { access_token } = await getAccessToken();

    const url = `https://sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${process.env.SELLER_ID}/${sku}?marketplaceIds=${marketplaceIds}`;

    console.log("👉 DEBUG URL:", url);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
        "Content-Type": "application/json",
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error("❌ Errore DEBUG Listings:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

module.exports = router;
