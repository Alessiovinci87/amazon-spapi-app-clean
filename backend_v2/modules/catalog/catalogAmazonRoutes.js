const express = require("express");
const router = express.Router();
const { getCatalogDetails, getListingImages, getAplusContent, getListingText } = require("./catalogAmazonService");
const logger = require("../../utils/logger");


/**
 * 📦 GET dettagli catalogo per ASIN
 * /api/v2/catalog/:asin?marketplaceId=APJ6JRA9NG5V4
 */
router.get("/:asin", async (req, res) => {
  try {
    const { asin } = req.params;
    const marketplaceId = req.query.marketplaceId || "APJ6JRA9NG5V4";

    const details = await getCatalogDetails(asin, marketplaceId);
    res.json(details);
  } catch (err) {
    logger.error({ err, data: err.response?.data }, "Errore getCatalogDetails");
    res.status(500).json({ error: "Impossibile recuperare dettagli catalogo" });
  }
});

// GET /api/v2/catalog-amazon/listing-images/:asin?marketplaceId=X
router.get("/listing-images/:asin", async (req, res) => {
  try {
    const images = await getListingImages(
      req.params.asin,
      req.query.marketplaceId || "APJ6JRA9NG5V4"
    );
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/catalog-amazon/aplus/:asin?marketplaceId=X
router.get("/aplus/:asin", async (req, res) => {
  try {
    const result = await getAplusContent(
      req.params.asin,
      req.query.marketplaceId || "APJ6JRA9NG5V4"
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/catalog-amazon/listing-text/:asin?marketplaceId=X
router.get("/listing-text/:asin", async (req, res) => {
  try {
    const result = await getListingText(
      req.params.asin,
      req.query.marketplaceId || "APJ6JRA9NG5V4"
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
