const { getDb } = require("../db/database");

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

/** ✏️ Imposta la quantità assoluta di un accessorio + registra storico */
function updateQuantitaAccessorio(asin_accessorio, quantitaNuova, nota = "", operatore = "admin") {
  const db = getDb();

  // quantità precedente
  const before = db
    .prepare(`SELECT quantita, nome FROM accessori WHERE asin_accessorio = ?`)
    .get(asin_accessorio);

  if (!before) {
    throw new Error(`Accessorio ${asin_accessorio} non trovato`);
  }

  const quantitaPrecedente = before.quantita;
  const delta = quantitaNuova - quantitaPrecedente;

  // 🔄 aggiorna quantità effettiva
  db.prepare(
    `UPDATE accessori
     SET quantita = ?
     WHERE asin_accessorio = ?`
  ).run(quantitaNuova, asin_accessorio);

  // 📝 salva storico nel formato CORRETTO
  db.prepare(
    `INSERT INTO storico_movimenti
      (tipo, asin_accessorio, delta_quantita, note, operatore, created_at)
     VALUES
      ('RETTIFICA_ACCESSORIO', ?, ?, ?, ?, datetime('now','localtime'))`
  ).run(asin_accessorio, delta, nota, operatore);

  return {
    ok: true,
    asin_accessorio,
    precedente: quantitaPrecedente,
    nuova: quantitaNuova,
    delta,
  };
}

/** 📜 Ritorna lo storico dei movimenti accessori */
function getStoricoAccessori() {
  const db = getDb();
  return db
    .prepare(`
      SELECT *
      FROM storico_movimenti
      WHERE tipo = 'RETTIFICA_ACCESSORIO'
      ORDER BY created_at DESC
    `)
    .all();
}

module.exports = {
  getAllAccessori,
  getAccessorio,
  updateQuantitaAccessorio,
  getStoricoAccessori,
};
