// backend_v2/routes/dev.js
// Endpoint DEV: backup/restore JSON e copia fisica del DB
// ⚠️ Accessibile SOLO in ambiente non-production e con password admin

const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDb, getDbPath } = require('../db/database');
const { verifyPassword } = require('../utils/password');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Guard: blocca tutti gli endpoint se siamo in production
// ─────────────────────────────────────────────────────────────────────────────
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ ok: false, message: 'Not found' });
  }
  next();
});

// Guard: richiede password admin nel body o nell'header X-Dev-Password
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function hasTable(db, name) {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name);
  return !!row;
}

function backupsDir() {
  const dir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Costruisce il path sicuro di un file dentro la cartella backups.
// Usa path.basename() per eliminare qualsiasi componente di directory (inclusi ..)
function safeBackupPath(filename) {
  const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safe) throw new Error('Nome file non valido.');
  return path.join(backupsDir(), safe);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/dev/backup → snapshot JSON
// ─────────────────────────────────────────────────────────────────────────────
router.get('/backup', (req, res) => {
  try {
    const db = getDb();

    const prodotti = db.prepare(`SELECT * FROM prodotti`).all();
    const accessori = db.prepare(`SELECT * FROM accessori`).all();
    const relazioni = db.prepare(`SELECT * FROM prodotti_accessori`).all();

    let storico = [];
    if (hasTable(db, 'storico')) {
      storico = db.prepare(`SELECT * FROM storico ORDER BY ts DESC`).all();
    }

    let movimenti = [];
    if (hasTable(db, 'movimenti')) {
      movimenti = db.prepare(`SELECT * FROM movimenti`).all();
    }

    const snapshot = {
      created_at: new Date().toISOString(),
      prodotti,
      accessori,
      relazioni,
      storico,
      movimenti,
    };

    const filename = `snapshot_${Date.now()}.json`;
    const filepath = path.join(backupsDir(), filename);
    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2), 'utf8');

    return res.json({ ok: true, file: filename, path: `backups/${filename}` });
  } catch (err) {
    console.error('❌ [DEV][backup] errore:', err);
    return res.status(500).json({ ok: false, message: 'Errore durante il backup.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/dev/backup/db → copia fisica del file .db
// ─────────────────────────────────────────────────────────────────────────────
router.get('/backup/db', (req, res) => {
  try {
    const dbFile = getDbPath();
    if (!fs.existsSync(dbFile)) {
      return res.status(404).json({ ok: false, message: 'File DB non trovato.' });
    }
    const filename = `inventario_${Date.now()}.db`;
    const dest = path.join(backupsDir(), filename);
    fs.copyFileSync(dbFile, dest);
    return res.json({ ok: true, file: filename, path: `backups/${filename}` });
  } catch (err) {
    console.error('❌ [DEV][backup/db] errore:', err);
    return res.status(500).json({ ok: false, message: 'Errore durante il backup del DB.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v2/dev/restore/:filename → ripristina da snapshot JSON
// Body: { password, mode?: "replace" | "merge" }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/restore/:filename', (req, res) => {
  try {
    const file = safeBackupPath(req.params.filename);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ ok: false, message: 'File di snapshot non trovato.' });
    }

    const mode = (req.body && req.body.mode) || 'replace';
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));

    const db = getDb();
    const tx = db.transaction(() => {
      if (mode === 'replace') {
        if (hasTable(db, 'movimenti')) db.prepare(`DELETE FROM movimenti`).run();
        if (hasTable(db, 'storico'))   db.prepare(`DELETE FROM storico`).run();
        db.prepare(`DELETE FROM prodotti_accessori`).run();
        db.prepare(`DELETE FROM accessori`).run();
        db.prepare(`DELETE FROM prodotti`).run();
      }

      const upsertProdotti = db.prepare(`
        INSERT INTO prodotti(asin, nome, pronto)
        VALUES(@asin, @nome, @pronto)
        ON CONFLICT(asin) DO UPDATE SET nome=excluded.nome, pronto=excluded.pronto
      `);
      const upsertAccessori = db.prepare(`
        INSERT INTO accessori(asin_accessorio, nome, quantita)
        VALUES(@asin_accessorio, @nome, @quantita)
        ON CONFLICT(asin_accessorio) DO UPDATE SET nome=excluded.nome, quantita=excluded.quantita
      `);
      const upsertRelazioni = db.prepare(`
        INSERT INTO prodotti_accessori(asin, asin_accessorio, perUnita)
        VALUES(@asin, @asin_accessorio, @perUnita)
        ON CONFLICT(asin, asin_accessorio) DO UPDATE SET perUnita=excluded.perUnita
      `);

      for (const p of (snapshot.prodotti || [])) upsertProdotti.run(p);
      for (const a of (snapshot.accessori || [])) upsertAccessori.run(a);
      for (const r of (snapshot.relazioni || [])) upsertRelazioni.run(r);

      if (Array.isArray(snapshot.storico) && hasTable(db, 'storico')) {
        const insStorico = db.prepare(`
          INSERT INTO storico(id, asin, tipo, qty, ts, note)
          VALUES (@id, @asin, @tipo, @qty, @ts, @note)
          ON CONFLICT(id) DO NOTHING
        `);
        for (const s of snapshot.storico) insStorico.run(s);
      }

      if (Array.isArray(snapshot.movimenti) && hasTable(db, 'movimenti')) {
        // I nomi colonna vengono letti dallo schema del DB (fonte sicura, non dall'input)
        const cols = db.prepare(`PRAGMA table_info(movimenti)`).all().map(c => c.name);
        const hasId = cols.includes('id');
        const insMov = db.prepare(`
          INSERT INTO movimenti(${hasId ? 'id,' : ''} tipo, asin_prodotto, asin_accessorio, delta_pronto, delta_quantita, note, created_at)
          VALUES(${hasId ? '@id,' : ''} @tipo, @asin_prodotto, @asin_accessorio, @delta_pronto, @delta_quantita, @note, @created_at)
          ${hasId ? 'ON CONFLICT(id) DO NOTHING' : ''}
        `);
        for (const m of snapshot.movimenti) insMov.run(m);
      }
    });

    tx();
    return res.json({ ok: true, restored_from: path.basename(file), mode });
  } catch (err) {
    console.error('❌ [DEV][restore] errore:', err);
    return res.status(500).json({ ok: false, message: 'Errore durante il ripristino.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v2/dev/restore/db/:filename → sostituisce il file inventario.db
// Crea automaticamente un backup del DB corrente prima di sovrascrivere.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/restore/db/:filename', (req, res) => {
  try {
    const src = safeBackupPath(req.params.filename);
    const dest = getDbPath();

    if (!fs.existsSync(src)) {
      return res.status(404).json({ ok: false, message: 'File .db non trovato in backups.' });
    }

    // Backup automatico del DB corrente prima di sovrascrivere
    if (fs.existsSync(dest)) {
      const backupPre = path.join(backupsDir(), `pre_restore_${Date.now()}.db`);
      fs.copyFileSync(dest, backupPre);
      console.log(`📦 [DEV] Backup pre-restore salvato in: ${backupPre}`);
    }

    fs.copyFileSync(src, dest);

    return res.json({
      ok: true,
      message: 'DB ripristinato. Riavvia il backend per usare il nuovo file.',
      file: path.basename(src),
    });
  } catch (err) {
    console.error('❌ [DEV][restore/db] errore:', err);
    return res.status(500).json({ ok: false, message: 'Errore durante il ripristino del DB.' });
  }
});

module.exports = router;
