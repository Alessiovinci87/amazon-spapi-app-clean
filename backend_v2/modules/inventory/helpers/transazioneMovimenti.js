// backend_v2/modules/inventory/helpers/transazioneMovimenti.js

/* =========================================================
   💾 TRANSAZIONE MOVIMENTI HELPER
   Esegue un gruppo di query DB in modo atomico
========================================================= */
const { getDb } = require('../../../db/database');

/**
 * Esegue una lista di funzioni DB dentro una singola transazione.
 * Se una fallisce → rollback automatico.
 * @param {object} db - istanza DB da getDb()
 * @param {Function[]} operazioni - array di funzioni che eseguono query
 * @returns {{ success: boolean, movimentiCreati: number }}
 */
function eseguiTransazioneMovimenti(db, operazioni = []) {
  if (!db || !db.transaction) throw new Error('Database non valido');
  if (!Array.isArray(operazioni) || operazioni.length === 0)
    return { success: true, movimentiCreati: 0 };

  try {
    const tx = db.transaction(() => {
      for (const fn of operazioni) fn();
    });
    tx();
    return { success: true, movimentiCreati: operazioni.length };
  } catch (err) {
    console.error('❌ Errore transazione movimenti:', err.message);
    return { success: false, movimentiCreati: 0 };
  }
}

function registraMovimento({ tipo, asin_prodotto, delta_pronto, note, operatore }) {
  const db = getDb();
  db.prepare(
    `INSERT INTO movimenti (tipo, asin_prodotto, delta_pronto, note, operatore)
     VALUES (?, ?, ?, ?, ?)`
  ).run(tipo, asin_prodotto, delta_pronto, note, operatore);
}


module.exports = { eseguiTransazioneMovimenti, registraMovimento };



