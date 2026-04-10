// backend_v2/routes/authRoutes.js
// Endpoint login, registrazione utenti, profilo, gestione utenti

const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const { hashPassword, verifyPassword } = require("../utils/password");
const { requireAuth, requireRole, generateToken } = require("../middleware/authMiddleware");

// POST /api/v2/auth-app/login — login con username + password, ritorna JWT
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ ok: false, message: "Username e password richiesti." });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM utenti WHERE username = ? AND attivo = 1").get(username);

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ ok: false, message: "Credenziali non valide." });
  }

  const token = generateToken(user);

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
router.post("/cambio-password", requireAuth, (req, res) => {
  const { passwordAttuale, nuovaPassword } = req.body;

  if (!passwordAttuale || !nuovaPassword) {
    return res.status(400).json({ ok: false, message: "Password attuale e nuova richieste." });
  }

  if (nuovaPassword.length < 4) {
    return res.status(400).json({ ok: false, message: "La nuova password deve avere almeno 4 caratteri." });
  }

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
router.post("/utenti", requireAuth, requireRole("admin"), (req, res) => {
  const { username, password, ruolo, nome } = req.body;

  if (!username || !password) {
    return res.status(400).json({ ok: false, message: "Username e password richiesti." });
  }

  if (ruolo && !["admin", "ufficio", "magazzino"].includes(ruolo)) {
    return res.status(400).json({ ok: false, message: "Ruolo non valido. Usa: admin, ufficio, magazzino." });
  }

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
});

// PATCH /api/v2/auth-app/utenti/:id — modifica utente (ruolo, attivo, nome)
router.patch("/utenti/:id", requireAuth, requireRole("admin"), (req, res) => {
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
    if (!["admin", "ufficio", "magazzino"].includes(ruolo)) {
      return res.status(400).json({ ok: false, message: "Ruolo non valido." });
    }
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

  if (updates.length === 0) {
    return res.status(400).json({ ok: false, message: "Nessun campo da aggiornare." });
  }

  updates.push("updated_at = datetime('now','localtime')");
  params.push(id);

  db.prepare(`UPDATE utenti SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  res.json({ ok: true, message: "Utente aggiornato." });
});

// POST /api/v2/auth-app/utenti/:id/reset-password — reset password (admin)
router.post("/utenti/:id/reset-password", requireAuth, requireRole("admin"), (req, res) => {
  const { nuovaPassword } = req.body;
  const { id } = req.params;

  if (!nuovaPassword || nuovaPassword.length < 4) {
    return res.status(400).json({ ok: false, message: "Password di almeno 4 caratteri richiesta." });
  }

  const db = getDb();
  const hash = hashPassword(nuovaPassword);
  const result = db.prepare("UPDATE utenti SET password = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(hash, id);

  if (result.changes === 0) {
    return res.status(404).json({ ok: false, message: "Utente non trovato." });
  }

  res.json({ ok: true, message: "Password resettata." });
});

module.exports = router;
