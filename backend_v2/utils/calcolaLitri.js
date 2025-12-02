// backend_v2/utils/calcolaLitri.js

/**
 * Calcola i litri di sfuso necessari per la produzione,
 * gestendo anche i KIT (es. 2x12ml o 2x100ml).
 */
function calcolaLitriDaProduzione(formato, quantitaProdotti, nomeProdotto = "") {
  const q = Number(quantitaProdotti) || 0;
  if (q <= 0) return 0;

  const f = (formato || "").toLowerCase().trim();
  const nome = (nomeProdotto || "").toLowerCase();

  // 🔧 Coefficienti base (modificabili)
  const COEFFICIENTI = {
    "12ml": 1 / 83,   // 1L = 83 pezzi
    "100ml": 1 / 10,  // 1L = 10 pezzi
  };

  // =======================================================
  // 🧴 GESTIONE KIT SPECIALI
  // =======================================================
  let moltiplicatore = 1; // di default 1 flacone = 1x formato

  if (nome.includes("antimicotico") && nome.includes("kit")) {
    moltiplicatore = 2; // ogni kit = 2 x 12ml
  } else if (nome.includes("cleaner") && nome.includes("kit")) {
    moltiplicatore = 2; // ogni kit = 2 x 100ml
  } else if (nome.includes("remover") && nome.includes("kit")) {
    moltiplicatore = 2; // ogni kit = 2 x 100ml
  }

  // =======================================================
  // 💧 Calcolo finale
  // =======================================================
  if (f.includes("12")) return q * COEFFICIENTI["12ml"] * moltiplicatore;
  if (f.includes("100")) return q * COEFFICIENTI["100ml"] * moltiplicatore;

  return 0;
}

module.exports = { calcolaLitriDaProduzione };
