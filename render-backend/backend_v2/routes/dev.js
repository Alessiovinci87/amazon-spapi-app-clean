// backend_v2/routes/dev.js
// Endpoint DEV: backup/restore JSON e copia fisica del DB
const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/database');

const router = express.Router();

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

// Impedisci path traversal sui nomi file di backup
function safeBackupPath(filename) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  return path.join(backupsDir(), safe);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/dev/backup → snapshot JSON (prodotti, accessori, relazioni, storico/movimenti)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/backup', (_req, res) => {
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
      // se hai un campo data diverso, adegua qui
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
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/dev/backup/db → copia fisica del file inventario.db
// ─────────────────────────────────────────────────────────────────────────────
router.get('/backup/db', (_req, res) => {
  try {
    const dbFile = path.join(__dirname, '..', 'db', 'inventario.db');
    const filename = `inventario_${Date.now()}.db`;
    const dest = path.join(backupsDir(), filename);

    fs.copyFileSync(dbFile, dest);
    return res.json({ ok: true, file: filename, path: `backups/${filename}` });
  } catch (err) {
    console.error('❌ [DEV][backup/db] errore:', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v2/dev/restore/:filename → ripristina da snapshot JSON
// Body (opzionale): { mode?: "replace" | "merge" } default "replace"
//  - replace: svuota e riscrive le tabelle
//  - merge:   upsert (mantiene ciò che non è nel file)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/restore/:filename', (req, res) => {
  try {
    const file = safeBackupPath(req.params.filename);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ ok: false, message: 'File di snapshot non trovato' });
    }

    const mode = (req.body && req.body.mode) || 'replace';
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));

    const db = getDb();
    const tx = db.transaction(() => {
      // vincoli FK attivi
      db.pragma('foreign_keys = ON');

      // In modalità replace pulisco (ordine sicuro: prima figli poi parent)
      if (mode === 'replace') {
        if (hasTable(db, 'movimenti')) db.prepare(`DELETE FROM movimenti`).run();
        if (hasTable(db, 'storico'))   db.prepare(`DELETE FROM storico`).run();
        db.prepare(`DELETE FROM prodotti_accessori`).run();
        db.prepare(`DELETE FROM accessori`).run();
        db.prepare(`DELETE FROM prodotti`).run();
      }

      // UPERT helper
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

      // Ripristino parent prima
      for (const p of (snapshot.prodotti || [])) {
        upsertProdotti.run(p);
      }
      for (const a of (snapshot.accessori || [])) {
        upsertAccessori.run(a);
      }
      for (const r of (snapshot.relazioni || [])) {
        upsertRelazioni.run(r);
      }

      // Storico/movimenti: ripristino solo se esistono le tabelle
      if (Array.isArray(snapshot.storico) && hasTable(db, 'storico')) {
        const insStorico = db.prepare(`
          INSERT INTO storico(id, asin, tipo, qty, ts, note)
          VALUES (@id, @asin, @tipo, @qty, @ts, @note)
          ON CONFLICT(id) DO NOTHING
        `);
        for (const s of snapshot.storico) insStorico.run(s);
      }

      if (Array.isArray(snapshot.movimenti) && hasTable(db, 'movimenti')) {
        // Adatta i campi a seconda dello schema reale di "movimenti"
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
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v2/dev/restore/db/:filename → sostituisce il file inventario.db
// ⚠️ Per sicurezza: chiudi l’app o riavviala subito dopo il ripristino.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/restore/db/:filename', (req, res) => {
  try {
    const src = safeBackupPath(req.params.filename);
    const dest = path.join(__dirname, '..', 'db', 'inventario.db');

    if (!fs.existsSync(src)) {
      return res.status(404).json({ ok: false, message: 'File .db non trovato in backups' });
    }

    // copia fisica (sovrascrive)
    fs.copyFileSync(src, dest);

    return res.json({
      ok: true,
      message: 'DB ripristinato. Riavvia il backend per usare il nuovo file.',
      file: path.basename(src),
    });
  } catch (err) {
    console.error('❌ [DEV][restore/db] errore:', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
