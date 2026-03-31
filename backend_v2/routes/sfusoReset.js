// backend_v2/routes/sfusoReset.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const { verifyPassword } = require("../utils/password");

// 🔹 DELETE → Reset storico sfuso inventario (richiede password admin verificata server-side)
router.delete("/storico-inventario/reset", (req, res) => {
  const { password } = req.body;

  if (!password || typeof password !== "string") {
    return res.status(400).json({ ok: false, message: "Password richiesta." });
  }

  const db = getDb();

  const row = db.prepare("SELECT valore FROM impostazioni WHERE chiave = 'admin_password'").get();
  if (!row) {
    return res.status(500).json({ ok: false, message: "Password admin non configurata nel DB." });
  }

  if (!verifyPassword(password, row.valore)) {
    return res.status(401).json({ ok: false, message: "Password errata." });
  }

  try {
    db.prepare("DELETE FROM storico_sfuso").run();
    console.log("✅ Storico sfuso inventario svuotato con successo");
    res.json({ ok: true, message: "Storico cancellato con successo" });
  } catch (err) {
    console.error("❌ Errore reset storico:", err.message);
    res.status(500).json({ ok: false, message: "Errore nel reset dello storico", error: err.message });
  }
});

module.exports = router;
