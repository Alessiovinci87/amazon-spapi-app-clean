const express = require("express");
const router = express.Router();
const { getCatalogDetails } = require("./catalogAmazonService");


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
    console.error("❌ Errore getCatalogDetails:", err.response?.data || err.message);
    res.status(500).json({ error: "Impossibile recuperare dettagli catalogo" });
  }
});

module.exports = router;
