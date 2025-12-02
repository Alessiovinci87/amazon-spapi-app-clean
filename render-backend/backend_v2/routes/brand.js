const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

// 📜 GET lista brand
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const brand = db.prepare("SELECT id, nome, logo, intestazione FROM brand").all();
    res.json(brand);
  } catch (err) {
    console.error("❌ Errore caricamento brand:", err.message);
    res.status(500).json({ error: "Errore caricamento brand" });
  }
});

module.exports = router;
