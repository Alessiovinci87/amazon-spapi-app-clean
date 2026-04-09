// backend_v2/services/accessoriImpegno.service.js
// Gestione impegno/rilascio/scala accessori legati alle prenotazioni produzione

const { getDb } = require("../db/database");

// Mappa formato → accessori da impegnare (corrisponde agli asin_accessorio reali nel DB)
const ACCESSORI_PER_FORMATO = {
  "12ml": ["BOCCETTA_12_ML", "TAPPO_12_ML", "PENNELLO_12_ML", "SCATOLETTE_12ML"],
  "10ml": ["BOCCETTA_12_ML", "TAPPO_12_ML", "PENNELLO_12_ML", "SCATOLETTE_12ML"],
  "100ml": ["BOCCETTA_100_ML", "TAPPO_100_ML"],
};

function getListaAccessori(formato) {
  const f = (formato || "").toLowerCase().trim();
  return ACCESSORI_PER_FORMATO[f] || [];
}

/**
 * Impegna accessori al momento della creazione prenotazione.
 * Aumenta quantita_impegnata per ogni accessorio del formato.
 */
function impegnaAccessori(formato, quantita, db_ext) {
  const db = db_ext || getDb();
  const lista = getListaAccessori(formato);
  const stmt = db.prepare(
    "UPDATE accessori SET quantita_impegnata = quantita_impegnata + ? WHERE asin_accessorio = ?"
  );
  for (const asin of lista) {
    stmt.run(quantita, asin);
  }
}

/**
 * Rilascia impegno accessori (prenotazione annullata o rimasta pendente).
 * Riduce quantita_impegnata senza toccare quantita fisica.
 */
function rilasciaImpegno(formato, quantita, db_ext) {
  const db = db_ext || getDb();
  const lista = getListaAccessori(formato);
  const stmt = db.prepare(
    "UPDATE accessori SET quantita_impegnata = MAX(0, quantita_impegnata - ?) WHERE asin_accessorio = ?"
  );
  for (const asin of lista) {
    stmt.run(quantita, asin);
  }
}

/**
 * Scala accessori per produzione (parziale o totale).
 * - quantita fisica -=  qtaProdotta  (consumo reale)
 * - quantita_impegnata -= qtaProdotta  (riduce l'impegno di quanto prodotto)
 * Se parziale, la rimanenza rimane ancora impegnata.
 */
function scalaAccessori(formato, qtaProdotta, db_ext) {
  const db = db_ext || getDb();
  const lista = getListaAccessori(formato);
  const stmt = db.prepare(`
    UPDATE accessori
    SET quantita           = MAX(0, quantita - ?),
        quantita_impegnata = MAX(0, quantita_impegnata - ?)
    WHERE asin_accessorio = ?
  `);
  for (const asin of lista) {
    stmt.run(qtaProdotta, qtaProdotta, asin);
  }
}

module.exports = { impegnaAccessori, rilasciaImpegno, scalaAccessori, getListaAccessori };
