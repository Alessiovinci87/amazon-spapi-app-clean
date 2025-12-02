// backend_v2/routes/prodottiSfuso.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

router.get("/", (req, res) => {
  try {
    const db = getDb();
    const prodotti = db.prepare("SELECT * FROM prodotti_sfuso").all();
    res.json(prodotti);
  } catch (err) {
    console.error("❌ Errore caricamento prodotti_sfuso:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

module.exports = router;
