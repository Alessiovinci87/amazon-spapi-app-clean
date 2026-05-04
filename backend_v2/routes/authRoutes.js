// backend_v2/routes/authRoutes.js
// Endpoint login, registrazione utenti, profilo, gestione utenti

const express = require("express");
const { z } = require("zod");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { getDb } = require("../db/database");
const { hashPassword, verifyPassword } = require("../utils/password");
const { requireAuth, requireRole, generateToken } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const logger = require("../utils/logger");

// Rate limit sul login: max 10 tentativi ogni 15 min per IP (conta solo i falliti)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { ok: false, message: "Troppi tentativi di login. Riprova tra qualche minuto." },
});

// ===== Schemas =====
const RUOLI = ["admin", "ufficio", "magazzino"];

const loginSchema = z.object({
  username: z.string().min(1, "Username richiesto.").max(50),
  password: z.string().min(1, "Password richiesta.").max(200),
});

const cambioPasswordSchema = z.object({
  passwordAttuale: z.string().min(1, "Password attuale richiesta."),
  nuovaPassword: z.string().min(4, "La nuova password deve avere almeno 4 caratteri.").max(200),
});

const creaUtenteSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(4, "Password di almeno 4 caratteri richiesta.").max(200),
  ruolo: z.enum(RUOLI).optional(),
  nome: z.string().max(100).nullish(),
});

const modificaUtenteSchema = z.object({
  ruolo: z.enum(RUOLI).optional(),
  attivo: z.boolean().optional(),
  nome: z.string().max(100).nullish(),
}).refine((d) => d.ruolo !== undefined || d.attivo !== undefined || d.nome !== undefined, {
  message: "Nessun campo da aggiornare.",
});

const resetPasswordSchema = z.object({
  nuovaPassword: z.string().min(4, "Password di almeno 4 caratteri richiesta.").max(200),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// POST /api/v2/auth-app/login — login con username + password, ritorna JWT
router.post("/login", loginLimiter, validate({ body: loginSchema }), (req, res) => {
  const { username, password } = req.body;

  const db = getDb();
  const user = db.prepare("SELECT * FROM utenti WHERE username = ? AND attivo = 1").get(username);

  if (!user || !verifyPassword(password, user.password)) {
    logger.warn({ event: "login_failed", username, ip: req.ip }, "Login fallito");
    return res.status(401).json({ ok: false, message: "Credenziali non valide." });
  }

  const token = generateToken(user);
  logger.info({ event: "login_success", userId: user.id, username: user.username, ruolo: user.ruolo, ip: req.ip }, "Login riuscito");

  res.json({
    ok: true,
    token,
    user: { id: user.id, username: user.username, ruolo: user.ruolo, nome: user.nome },
  });
});

// GET /api/v2/auth-app/me — profilo utente corrente (richiede JWT)
router.get("/me", requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT id, username, ruolo, nome, created_at FROM utenti WHERE id = ?").get(req.user.id);

  if (!user) {
    return res.status(404).json({ ok: false, message: "Utente non trovato." });
  }

  res.json({ ok: true, user });
});

// POST /api/v2/auth-app/cambio-password — cambio password (utente autenticato)
router.post("/cambio-password", requireAuth, validate({ body: cambioPasswordSchema }), (req, res) => {
  const { passwordAttuale, nuovaPassword } = req.body;

  const db = getDb();
  const user = db.prepare("SELECT * FROM utenti WHERE id = ?").get(req.user.id);

  if (!verifyPassword(passwordAttuale, user.password)) {
    return res.status(401).json({ ok: false, message: "Password attuale non corretta." });
  }

  const hash = hashPassword(nuovaPassword);
  db.prepare("UPDATE utenti SET password = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(hash, req.user.id);

  res.json({ ok: true, message: "Password aggiornata." });
});

// ===== GESTIONE UTENTI (solo admin) =====

// GET /api/v2/auth-app/utenti — lista utenti
router.get("/utenti", requireAuth, requireRole("admin"), (_req, res) => {
  const db = getDb();
  const utenti = db.prepare("SELECT id, username, ruolo, nome, attivo, created_at, updated_at FROM utenti ORDER BY created_at").all();
  res.json({ ok: true, utenti });
});

// POST /api/v2/auth-app/utenti — crea nuovo utente
router.post(
  "/utenti",
  requireAuth,
  requireRole("admin"),
  validate({ body: creaUtenteSchema }),
  (req, res) => {
    const { username, password, ruolo, nome } = req.body;

    const db = getDb();
    const existing = db.prepare("SELECT 1 FROM utenti WHERE username = ?").get(username);
    if (existing) {
      return res.status(409).json({ ok: false, message: "Username già esistente." });
    }

    const hash = hashPassword(password);
    const result = db.prepare(
      "INSERT INTO utenti (username, password, ruolo, nome) VALUES (?, ?, ?, ?)"
    ).run(username, hash, ruolo || "magazzino", nome || null);

    res.status(201).json({ ok: true, id: result.lastInsertRowid, message: "Utente creato." });
  }
);

// PATCH /api/v2/auth-app/utenti/:id — modifica utente (ruolo, attivo, nome)
router.patch(
  "/utenti/:id",
  requireAuth,
  requireRole("admin"),
  validate({ params: idParamSchema, body: modificaUtenteSchema }),
  (req, res) => {
    const { ruolo, attivo, nome } = req.body;
    const { id } = req.params;

    const db = getDb();
    const user = db.prepare("SELECT * FROM utenti WHERE id = ?").get(id);
    if (!user) {
      return res.status(404).json({ ok: false, message: "Utente non trovato." });
    }

    const updates = [];
    const params = [];

    if (ruolo !== undefined) {
      updates.push("ruolo = ?");
      params.push(ruolo);
    }
    if (attivo !== undefined) {
      updates.push("attivo = ?");
      params.push(attivo ? 1 : 0);
    }
    if (nome !== undefined) {
      updates.push("nome = ?");
      params.push(nome);
    }

    updates.push("updated_at = datetime('now','localtime')");
    params.push(id);

    db.prepare(`UPDATE utenti SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    res.json({ ok: true, message: "Utente aggiornato." });
  }
);

// POST /api/v2/auth-app/utenti/:id/reset-password — reset password (admin)
router.post(
  "/utenti/:id/reset-password",
  requireAuth,
  requireRole("admin"),
  validate({ params: idParamSchema, body: resetPasswordSchema }),
  (req, res) => {
    const { nuovaPassword } = req.body;
    const { id } = req.params;

    const db = getDb();
    const hash = hashPassword(nuovaPassword);
    const result = db.prepare("UPDATE utenti SET password = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(hash, id);

    if (result.changes === 0) {
      return res.status(404).json({ ok: false, message: "Utente non trovato." });
    }

    res.json({ ok: true, message: "Password resettata." });
  }
);

// DELETE /api/v2/auth-app/utenti/:id — elimina utente (admin)
// Blocca: cancellazione di sé stessi e dell'unico admin rimasto.
router.delete(
  "/utenti/:id",
  requireAuth,
  requireRole("admin"),
  validate({ params: idParamSchema }),
  (req, res) => {
    const id = Number(req.params.id);
    const db = getDb();

    const target = db.prepare("SELECT id, username, ruolo FROM utenti WHERE id = ?").get(id);
    if (!target) {
      return res.status(404).json({ ok: false, message: "Utente non trovato." });
    }
    if (target.id === req.user.id) {
      return res.status(400).json({ ok: false, message: "Non puoi cancellare te stesso." });
    }
    if (target.ruolo === "admin") {
      const adminCount = db.prepare("SELECT COUNT(*) AS n FROM utenti WHERE ruolo = 'admin' AND attivo = 1").get().n;
      if (adminCount <= 1) {
        return res.status(400).json({ ok: false, message: "Impossibile cancellare l'unico admin." });
      }
    }

    db.prepare("DELETE FROM utenti WHERE id = ?").run(id);
    logger.info({ event: "user_deleted", deletedId: id, deletedUsername: target.username, by: req.user.username }, "Utente cancellato");
    res.json({ ok: true, message: "Utente eliminato." });
  }
);

module.exports = router;
