const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database.js");
const logger = require("../utils/logger");

// RESET STORICO PRODUZIONI
router.delete("/storico/reset", (req, res) => {
  try {
    const db = getDb(); // <-- QUI la magia

    db.prepare("DELETE FROM storico_produzioni_sfuso").run();

    res.json({ ok: true, message: "Storico produzioni svuotato correttamente." });
  } catch (err) {
    logger.error({ err }, "Errore reset storico");
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
