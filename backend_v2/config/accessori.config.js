// backend_v2/config/accessori.config.js
// Mappa accessori ↔ formati prodotto (ml)
//
// Puoi aggiungere, modificare o togliere accessori da qui
// senza toccare il codice della produzione.

module.exports = [
  // 🔹 Formato 12 ml (include anche oli 12 ml)
  {
    asin_accessorio: "BOCCETTE_12ML",
    formati: [12],
  },
  {
    asin_accessorio: "TAPPINI_12ML",
    formati: [12],
  },
  {
    asin_accessorio: "PENNELLINI_12ML",
    formati: [12],
  },

  // 🔹 Formato 100 ml
  {
    asin_accessorio: "BOCCETTE_100ML",
    formati: [100],
  },
  {
    asin_accessorio: "TAPPINI_100ML",
    formati: [100],
  },
];
