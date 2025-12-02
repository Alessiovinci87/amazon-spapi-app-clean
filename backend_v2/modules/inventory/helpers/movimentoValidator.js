// backend_v2/modules/inventory/helpers/movimentoValidator.js

/* =========================================================
   🎯 MOVIMENTO VALIDATOR
   Determina tipo di movimento e convalida campi
========================================================= */

/**
 * Determina il tipo di movimento e i vincoli richiesti
 * @param {number} delta - differenza tra nuovo e corrente
 * @returns {{ tipo: string, richiedeNota: boolean, richiedeOperatore: boolean }}
 */
function distinguiTipoMovimento(delta) {
  if (delta > 0) {
    return { tipo: "PRODUZIONE", richiedeNota: false, richiedeOperatore: false };
  }
  if (delta < 0) {
    return { tipo: "RETTIFICA", richiedeNota: true, richiedeOperatore: true };
  }
  return { tipo: "NESSUNO", richiedeNota: false, richiedeOperatore: false };
}

/**
 * Valida i campi in base ai vincoli ricevuti
 * @param {{ note: string, operatore: string, richiedeNota: boolean, richiedeOperatore: boolean }}
 */
function validaCampiRettifica({ note, operatore, richiedeNota, richiedeOperatore }) {
  if (richiedeNota && (!note || !note.trim())) throw new Error("Nota obbligatoria per rettifica");
  if (richiedeOperatore && (!operatore || !operatore.trim()))
    throw new Error("Operatore obbligatorio per rettifica");
}

module.exports = { distinguiTipoMovimento, validaCampiRettifica };
