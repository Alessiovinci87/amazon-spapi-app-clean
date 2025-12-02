// backend_v2/services/accessoriService.js
// Operazioni CRUD essenziali sugli accessori

const { getDb } = require('../db/database');

/** 🔎 Ritorna tutti gli accessori */
function getAllAccessori() {
  const db = getDb();
  return db
    .prepare(`
      SELECT asin_accessorio, nome, quantita
      FROM accessori
      ORDER BY asin_accessorio
    `)
    .all();
}

/** 🔎 Ritorna un singolo accessorio */
function getAccessorio(asin_accessorio) {
  const db = getDb();
  return db
    .prepare(`
      SELECT asin_accessorio, nome, quantita
      FROM accessori
      WHERE asin_accessorio = ?
    `)
    .get(asin_accessorio);
}

/** ✏️ Imposta la quantità assoluta di un accessorio */
function updateQuantitaAccessorio(asin_accessorio, quantita) {
  const db = getDb();

  const stmt = db.prepare(`
    UPDATE accessori
    SET quantita = ?
    WHERE asin_accessorio = ?
  `);

  const info = stmt.run(quantita, asin_accessorio);

  if (info.changes === 0) {
    throw new Error(`Accessorio ${asin_accessorio} non trovato`);
  }

  return { ok: true, asin_accessorio, quantita };
}

/** 💾 Salva un movimento nello storico accessori */
function salvaStoricoAccessorio({ asin_accessorio, nome, quantitaPrecedente, quantitaNuova, nota, operatore }) {
  const db = getDb();
  db.prepare(
    `INSERT INTO storico_movimenti 
     (asin_accessorio, nome, quantita_precedente, quantita_nuova, nota, operatore, tipo, data)
     VALUES (?, ?, ?, ?, ?, ?, 'RETTIFICA_ACCESSORIO', datetime('now'))`
  ).run(
    asin_accessorio,
    nome,
    quantitaPrecedente,
    quantitaNuova,
    nota,
    operatore
  );
}


/** 📜 Ritorna lo storico dei movimenti accessori */
function getStoricoAccessori() {
  const db = getDb();
  return db
    .prepare(`
      SELECT asin_accessorio, nome, quantita_precedente, quantita_nuova, nota, operatore, data
      FROM storico_movimenti
      WHERE tipo = 'RETTIFICA_ACCESSORIO'
      ORDER BY data DESC
    `)
    .all();
}

module.exports = {
  getAllAccessori,
  getAccessorio,
  updateQuantitaAccessorio,
  getStoricoAccessori,
  salvaStoricoAccessorio,
};

