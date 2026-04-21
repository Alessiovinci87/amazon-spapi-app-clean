// 📁 backend_v2/modules/inventory/inventario.js
const express = require("express");
const router = express.Router();

// 🧩 Usa SEMPRE il database principale centralizzato
const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");


// 🔹 GET /api/v2/magazzino
router.get("/", (req, res) => {
  try {
    const db = getDb(); // <-- ✔ Usa DB esterno e unificato
    const query = db.prepare("SELECT * FROM prodotti");
    const data = query.all();

    logger.info(`Prodotti trovati: ${data.length}`);

    res.json({ ok: true, data });
  } catch (err) {
    logger.error({ err }, "Errore fetch prodotti");
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
