// backend_v2/services/scatoletteStorico.service.js

const { getDb } = require("../db/database");

function registraMovimentoScatolette({
  asin_prodotto,
  scatoletta,
  delta,
  quantita_finale,
  nota = "",
  operatore = "system",
}) {
  const db = getDb();

  db.prepare(`
    INSERT INTO storico_movimenti_scatolette
      (asin_prodotto, scatoletta, delta, quantita_finale, nota, operatore, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
  `).run(
    asin_prodotto,
    scatoletta,
    delta,
    quantita_finale,
    nota,
    operatore
  );
}


function getStoricoScatolette() {
  const db = getDb();
  return db
    .prepare(`
      SELECT *
      FROM storico_movimenti_scatolette
      ORDER BY created_at DESC
    `)
    .all();
}

module.exports = {
  registraMovimentoScatolette,
  getStoricoScatolette,
};
