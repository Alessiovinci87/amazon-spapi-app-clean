const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

/** 📊 GET impegni per ogni prodotto */
router.get("/", (req, res) => {
  const db = getDb();

  // Query che calcola gli impegni per asin
  const impegni = db
    .prepare(`
      SELECT 
        r.asin,
        r.prodotto_nome,
        s.paese,
        s.progressivo,
        SUM(r.quantita) as totale
      FROM spedizioni_righe r
      JOIN spedizioni s ON s.id = r.spedizione_id
      WHERE s.stato IN ('BOZZA','CONFERMATA')
      GROUP BY r.asin, s.paese, s.progressivo
    `)
    .all();

  // trasformo in oggetto { asin: [ { paese, progressivo, totale } ] }
  const result = {};
  for (const i of impegni) {
    if (!result[i.asin]) result[i.asin] = [];
    result[i.asin].push({
      paese: i.paese,
      progressivo: i.progressivo,
      totale: i.totale,
    });
  }

  res.json(result);
});

module.exports = router;
