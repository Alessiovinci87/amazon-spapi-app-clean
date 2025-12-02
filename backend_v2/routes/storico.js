const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

/*
===========================================================
  GET /api/v2/storico
  → Storico globale
===========================================================
*/
router.get("/", (req, res) => {
  try {
    const db = getDb();

    const rows = db.prepare(`
      SELECT
        id,
        tipo,
        asin_prodotto,
        asin_accessorio,
        delta_pronto,
        delta_quantita,
        nome_prodotto,
        note,
        operatore,
        created_at
      FROM storico_movimenti
      ORDER BY created_at DESC
    `).all();

    res.json(rows);

  } catch (err) {
    console.error("❌ Errore GET /storico:", err.message);
    res.status(500).json({ error: "Errore recupero storico globale" });
  }
});



/*
===========================================================
  GET /api/v2/storico/:asin
  → Storico singolo prodotto o accessorio
===========================================================
*/
router.get("/:asin", (req, res) => {
  try {
    const { asin } = req.params;
    const db = getDb();

    const movimenti = db.prepare(`
      SELECT
        id,
        tipo,
        asin_prodotto,
        asin_accessorio,
        delta_pronto,
        delta_quantita,
        nome_prodotto,
        note,
        operatore,
        created_at
      FROM storico_movimenti
      WHERE asin_prodotto = ?
         OR asin_accessorio = ?
      ORDER BY created_at DESC
    `).all(asin, asin);

    res.json(movimenti);

  } catch (err) {
    console.error("❌ Errore GET /storico/:asin:", err.message);
    res.status(500).json({ error: "Errore recupero storico prodotto" });
  }
});




/*
===========================================================
  GET /api/v2/storico/sfuso/:asin
  → Storico produzioni SFUSO
===========================================================
*/
router.get("/sfuso/storico_produzioni/:asin", (req, res) => {
  try {
    const { asin } = req.params;
    const db = getDb();

    const rows = db.prepare(`
      SELECT *
      FROM storico_produzioni_sfuso
      WHERE asin_prodotto = ?
      ORDER BY data_evento DESC
    `).all(asin);

    res.json(rows);

  } catch (err) {
    console.error("❌ Errore GET /sfuso/storico_produzioni:", err.message);
    res.status(500).json({ error: "Errore recupero storico produzioni" });
  }
});

module.exports = router;
