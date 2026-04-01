// backend_v2/services/storicoProduzioniSfuso.service.js
const { getDb } = require("../db/database");

/**
 * 🧾 Registra un evento nello storico delle produzioni sfuso
 */
function registraStoricoProduzione({
  id_produzione,
  id_sfuso = null,
  asin_prodotto = null,
  nome_prodotto = null,
  formato = "",
  quantita = null,
  litri_usati = null,
  evento = "CREATA",
  note = "",
  operatore = "system"
}) {

  const db = getDb();

  // 📝 INSERT storico
  db.prepare(`
    INSERT INTO storico_produzioni_sfuso (
      id_produzione,
      id_sfuso,
      asin_prodotto,
      nome_prodotto,
      formato,
      quantita,
      litri_usati,
      evento,
      note,
      operatore,
      data_evento
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
  `).run(
    id_produzione,
    id_sfuso,
    asin_prodotto,
    nome_prodotto,
    formato,
    quantita,
    litri_usati,
    evento,
    note,
    operatore
  );

  return { ok: true };
}

/**
 * 📜 Recupera lo storico (con eventuali filtri)
 */
function getStorico({ asin, evento } = {}) {
  const db = getDb();
  let query = `SELECT * FROM storico_produzioni_sfuso`;
  const params = [];

  const conditions = [];
  if (asin) { conditions.push("asin_prodotto = ?"); params.push(asin); }
  if (evento) { conditions.push("evento = ?"); params.push(evento); }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY data_evento DESC";

  return db.prepare(query).all(...params);
}

module.exports = {
  registraStoricoProduzione,
  getStorico
};
