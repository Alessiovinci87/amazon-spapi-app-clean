// backend_v2/routes/debug.js
const express = require('express');
const os = require('os');
const { getDb } = require('../db/database');

const router = express.Router();

router.get('/env', (req, res) => {
  res.json({
    pid: process.pid,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    env: {
      PORT: process.env.PORT || null,
      NODE_ENV: process.env.NODE_ENV || null,
    },
    network: Object.values(os.networkInterfaces() || {}),
  });
});

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
