const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

// 🧾 GET - Tutti gli ordini fornitori
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const ordini = db
      .prepare(`
        SELECT 
          o.id,
          o.id_fornitore,
          f.nome AS fornitore,
          o.asin,
          o.nome_prodotto AS prodotti,
          o.formato,
          o.quantita_litri AS quantita,
          o.costo_totale AS costoTotale,
          o.pagamento,
          o.stato,
          o.data_ordine AS dataOrdine
        FROM ordini_fornitori o
        LEFT JOIN fornitori f ON f.id = o.id_fornitore
        ORDER BY o.data_ordine DESC
      `)
      .all();

    res.json(ordini || []);
  } catch (err) {
    console.error("❌ Errore caricamento ordini:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

module.exports = router;
