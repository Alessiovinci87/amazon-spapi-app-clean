// backend_v2/routes/appAuth.js
// Verifica la password admin dell'applicazione (memorizzata hashata nel DB)

const express = require("express");
const { z } = require("zod");
const router = express.Router();
const { getDb } = require("../db/database");
const { verifyPassword } = require("../utils/password");
const { validate } = require("../middleware/validate");

const verificaPasswordSchema = z.object({
  password: z.string().min(1, "Password mancante.").max(200),
});

/**
 * POST /api/v2/app-auth/verifica-password
 * Body: { password: string }
 * Risposta: { ok: true } oppure 401
 */
router.post("/verifica-password", validate({ body: verificaPasswordSchema }), (req, res) => {
  const { password } = req.body;

  const db = getDb();
  const row = db.prepare("SELECT valore FROM impostazioni WHERE chiave = 'admin_password'").get();

  if (!row) {
    return res.status(500).json({ ok: false, message: "Password admin non configurata nel DB." });
  }

  const valida = verifyPassword(password, row.valore);
  if (!valida) {
    return res.status(401).json({ ok: false, message: "Password errata." });
  }

  res.json({ ok: true });
});

module.exports = router;
