// backend_v2/routes/storicoSpedizioni.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

// 📜 GET storico spedizioni
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const storico = db
      .prepare("SELECT * FROM storico_spedizioni ORDER BY data_operazione DESC")
      .all();

    // 🔒 Garantisco sempre un array
    if (!Array.isArray(storico)) {
      return res.json([]);
    }

    res.json(storico);
  } catch (err) {
    console.error("❌ Errore recupero storico spedizioni:", err);
    res.status(500).json({ error: "Errore caricamento storico spedizioni" });
  }
});

module.exports = router;
