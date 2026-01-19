// 📁 backend_v2/modules/inventory/inventario.js
const express = require("express");
const router = express.Router();

// 🧩 Usa SEMPRE il database principale centralizzato
const { getDb } = require("../../db/database");


// 🔹 GET /api/v2/magazzino
router.get("/", (req, res) => {
  try {
    const db = getDb(); // <-- ✔ Usa DB esterno e unificato
    const query = db.prepare("SELECT * FROM prodotti");
    const data = query.all();

    console.log(`📦 Prodotti trovati: ${data.length}`);

    res.json({ ok: true, data });
  } catch (err) {
    console.error("❌ Errore fetch prodotti:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
