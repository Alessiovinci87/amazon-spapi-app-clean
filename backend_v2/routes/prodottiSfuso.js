// backend_v2/routes/prodottiSfuso.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const logger = require("../utils/logger");

router.get("/", (req, res) => {
  try {
    const db = getDb();
    const prodotti = db.prepare("SELECT * FROM prodotti_sfuso").all();
    res.json(prodotti);
  } catch (err) {
    logger.error({ err }, "Errore caricamento prodotti_sfuso");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

module.exports = router;
