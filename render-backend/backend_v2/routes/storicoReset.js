const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database.js");

// RESET STORICO PRODUZIONI
router.delete("/storico/reset", (req, res) => {
  try {
    const db = getDb(); // <-- QUI la magia

    db.prepare("DELETE FROM storico_produzioni_sfuso").run();

    res.json({ ok: true, message: "Storico produzioni svuotato correttamente." });
  } catch (err) {
    console.error("❌ Errore reset storico:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
