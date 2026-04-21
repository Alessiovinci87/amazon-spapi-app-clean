const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const logger = require("../utils/logger");

// 📜 GET lista brand
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const brand = db.prepare("SELECT id, nome, logo, intestazione FROM brand").all();
    res.json(brand);
  } catch (err) {
    logger.error({ err }, "Errore caricamento brand");
    res.status(500).json({ error: "Errore caricamento brand" });
  }
});

module.exports = router;
