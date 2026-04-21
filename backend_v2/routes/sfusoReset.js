// backend_v2/routes/sfusoReset.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const { verifyPassword } = require("../utils/password");
const logger = require("../utils/logger");

const resetSchema = z.object({ password: z.string().min(1).max(200) });

// 🔹 DELETE → Reset storico sfuso inventario (richiede password admin verificata server-side)
router.delete("/storico-inventario/reset", validate({ body: resetSchema }), (req, res) => {
  const { password } = req.body;

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
    logger.info("Storico sfuso inventario svuotato con successo");
    res.json({ ok: true, message: "Storico cancellato con successo" });
  } catch (err) {
    logger.error({ err }, "Errore reset storico");
    res.status(500).json({ ok: false, message: "Errore nel reset dello storico", error: err.message });
  }
});

module.exports = router;
