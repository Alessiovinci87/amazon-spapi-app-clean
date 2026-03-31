// backend_v2/routes/debug.js
// ⚠️ Accessibile SOLO in ambiente non-production e con password admin

const express = require('express');
const { getDb } = require('../db/database');
const { verifyPassword } = require('../utils/password');

const router = express.Router();

// Guard: blocca in production
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ ok: false, message: 'Not found' });
  }
  next();
});

// Guard: richiede password admin
router.use((req, res, next) => {
  const password = req.body?.password || req.headers['x-dev-password'];
  if (!password) {
    return res.status(401).json({ ok: false, message: 'Password richiesta.' });
  }
  const db = getDb();
  const row = db.prepare("SELECT valore FROM impostazioni WHERE chiave = 'admin_password'").get();
  if (!row || !verifyPassword(password, row.valore)) {
    return res.status(401).json({ ok: false, message: 'Password non valida.' });
  }
  next();
});

// Info di ambiente (senza indirizzi di rete o dati sensibili)
router.get('/env', (req, res) => {
  res.json({
    pid: process.pid,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    env: {
      PORT: process.env.PORT || null,
      NODE_ENV: process.env.NODE_ENV || null,
    },
  });
});

// Stato DB: solo dati non sensibili
router.get('/state', (req, res, next) => {
  try {
    const db = getDb();
    const prodotti = db.prepare(`SELECT asin, nome, pronto FROM prodotti ORDER BY asin`).all();
    const accessori = db.prepare(`SELECT asin_accessorio, nome, quantita FROM accessori ORDER BY asin_accessorio`).all();
    const relazioni = db.prepare(`SELECT asin, asin_accessorio, perUnita FROM prodotti_accessori ORDER BY asin, asin_accessorio`).all();
    res.json({ prodotti, accessori, relazioni });
  } catch (e) { next(e); }
});

module.exports = router;
