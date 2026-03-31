const express = require("express");
const router = express.Router();

const { getDb } = require("../db/database");

router.get("/", (req, res) => {
    try {
        const db = getDb();

        // 1. Totale prodotti in inventario
        const prodottiTotali =
            db.prepare(`
    SELECT COUNT(*) AS totale
    FROM prodotti
  `).get().totale || 0;

        // 2. Spedizioni attive
        const spedizioniAttive =
            db
                .prepare(
                    "SELECT COUNT(*) AS totale FROM spedizioni WHERE stato != 'completata'"
                )
                .get().totale || 0;

        // 3. Produzioni attive (sfuso)
        const produzioniAttive =
  db.prepare(`
    SELECT COUNT(*) AS totale
    FROM prenotazioni_sfuso
    WHERE LOWER(stato) = 'in lavorazione'
  `).get().totale || 0;



        res.json({
            prodottiTotali,
            spedizioniAttive,
            produzioniAttive,
        });
    } catch (err) {
        console.error("Errore statistiche:", err);
        res.status(500).json({ error: "Errore nel recupero statistiche" });
    }
});

module.exports = router;
