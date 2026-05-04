const { getDb } = require("../db/database");
const { checkSottoSogliaAccessori } = require("./stockAlerts.service");

/** 🔎 Ritorna tutti gli accessori */
function getAllAccessori() {
  const db = getDb();
  return db
    .prepare(`
      SELECT asin_accessorio, nome, quantita, soglia_minima, immagine
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
      SELECT asin_accessorio, nome, quantita, soglia_minima, immagine
      FROM accessori
      WHERE asin_accessorio = ?
    `)
    .get(asin_accessorio);
}

/** ➕ Crea un nuovo accessorio (asin_accessorio = chiave manuale) */
function createAccessorio({ asin_accessorio, nome, quantita = 0, soglia_minima = 0 }) {
  const db = getDb();

  const exists = db
    .prepare(`SELECT asin_accessorio FROM accessori WHERE asin_accessorio = ?`)
    .get(asin_accessorio);
  if (exists) {
    const err = new Error(`Accessorio "${asin_accessorio}" già esistente`);
    err.statusCode = 409;
    throw err;
  }

  db.prepare(
    `INSERT INTO accessori (asin_accessorio, nome, quantita, soglia_minima, immagine)
     VALUES (?, ?, ?, ?, NULL)`
  ).run(asin_accessorio, nome, quantita, soglia_minima);

  // Storico iniziale solo se la quantità di partenza è > 0 (rettifica iniziale)
  if (quantita > 0) {
    db.prepare(
      `INSERT INTO storico_movimenti
        (tipo, asin_accessorio, delta_quantita, note, operatore, created_at)
       VALUES
        ('RETTIFICA_ACCESSORIO', ?, ?, ?, 'admin', datetime('now','localtime'))`
    ).run(asin_accessorio, quantita, "Creazione accessorio");
  }

  return db
    .prepare(
      `SELECT asin_accessorio, nome, quantita, soglia_minima, immagine
       FROM accessori WHERE asin_accessorio = ?`
    )
    .get(asin_accessorio);
}

/** 🖼️ Aggiorna il path immagine (o NULL per rimuoverla) */
function updateImmagineAccessorio(asin_accessorio, path_immagine) {
  const db = getDb();
  db.prepare(`UPDATE accessori SET immagine = ? WHERE asin_accessorio = ?`).run(
    path_immagine,
    asin_accessorio,
  );
  return db
    .prepare(`SELECT asin_accessorio, nome, quantita, soglia_minima, immagine FROM accessori WHERE asin_accessorio = ?`)
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

  // Verifica alert sotto soglia
  checkSottoSogliaAccessori(db, asin_accessorio);

  return {
    ok: true,
    asin_accessorio,
    precedente: quantitaPrecedente,
    nuova: quantitaNuova,
    delta,
  };
}

/** Imposta la soglia minima di un accessorio */
function updateSogliaAccessorio(asin_accessorio, soglia_minima) {
  const db = getDb();
  const acc = db.prepare("SELECT asin_accessorio FROM accessori WHERE asin_accessorio = ?").get(asin_accessorio);
  if (!acc) throw new Error(`Accessorio ${asin_accessorio} non trovato`);

  db.prepare("UPDATE accessori SET soglia_minima = ? WHERE asin_accessorio = ?").run(soglia_minima, asin_accessorio);

  // Ricalcola alert dopo cambio soglia
  checkSottoSogliaAccessori(db, asin_accessorio);

  return { ok: true, asin_accessorio, soglia_minima };
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
  createAccessorio,
  updateQuantitaAccessorio,
  updateSogliaAccessorio,
  updateImmagineAccessorio,
  getStoricoAccessori,
};
