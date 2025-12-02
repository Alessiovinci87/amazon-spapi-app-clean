// backend_v2/modules/inventory/helpers/movimentiAccessori.js

/* =========================================================
   🧮 MOVIMENTI ACCESSORI HELPER
   Calcola i movimenti (consumo / reintegro) per un prodotto
========================================================= */

/**
 * Calcola consumo o reintegro accessori da una ricetta
 * @param {Array<{asin_accessorio:string, perUnita:number, quantita:number}>} ricetta
 * @param {number} delta - quantità prodotto (+ produzione / - rettifica)
 * @returns {{
 *   validi: boolean,
 *   errori: string[],
 *   movimenti: Array<{ asin_accessorio:string, delta:number }>
 * }}
 */
function calcolaMovimentiAccessori(ricetta, delta) {
  const errori = [];
  const movimenti = [];

  if (!Array.isArray(ricetta) || ricetta.length === 0) {
    return { validi: false, errori: ['Ricetta non valida o vuota'], movimenti: [] };
  }

  for (const r of ricetta) {
    const perUnita = Number(r.perUnita ?? 0);
    const quantitaAttuale = Number(r.quantita ?? 0);
    const consumo = delta * perUnita;

    if (delta > 0) {
      // PRODUZIONE → consumo accessori
      if (quantitaAttuale - consumo < 0) {
        errori.push(
          `Scorte insufficienti: ${r.asin_accessorio} (servono ${consumo}, hai ${quantitaAttuale})`
        );
      }
      movimenti.push({ asin_accessorio: r.asin_accessorio, delta: -consumo });
    } else if (delta < 0) {
      // RETTIFICA → reintegro accessori
      movimenti.push({
        asin_accessorio: r.asin_accessorio,
        delta: Math.abs(consumo),
      });
    }
  }

  return {
    validi: errori.length === 0,
    errori,
    movimenti,
  };
}

module.exports = { calcolaMovimentiAccessori };
