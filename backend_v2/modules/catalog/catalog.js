// backend_v2/modules/catalog/catalog.js
const express = require("express");
const router = express.Router();
const { getCatalogDetails } = require("./catalogAmazonService");
const logger = require("../../utils/logger");

/**
 * 📦 GET dettagli catalogo per ASIN
 * Percorso effettivo usato dal frontend: /api/v2/reports-amazon/catalog/:asin
 */
router.get("/:asin", async (req, res) => {
  try {
    const { asin } = req.params;

    logger.info(`Richiesta dettagli catalogo per ASIN: ${asin}`);

    // 🔹 Recupera i dettagli da tutti i marketplace EU
    const details = await getCatalogDetails(asin);

    // 🔹 Risposta compatibile col frontend
    res.json(details);
  } catch (err) {
    logger.error({ err }, "Errore getCatalogDetails");
    res.status(500).json({ error: "Impossibile recuperare dettagli catalogo" });
  }
});

module.exports = router;
