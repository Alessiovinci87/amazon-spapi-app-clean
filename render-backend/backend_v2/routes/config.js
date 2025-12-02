const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

function db() {
    return getDb();
}

// GET → ottieni contatore
router.get("/produzione-counter", (req, res) => {
    try {
        const row = db()
            .prepare(`SELECT value FROM config WHERE key = ?`)
            .get("produzione_counter");

        res.json({
            ok: true,
            value: row ? Number(row.value) : 0
        });

    } catch (err) {
        console.error("❌ Errore GET:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});


// POST → reset contatore
// POST → reset contatore + pulizia prenotazioni NON completate
router.post("/reset-contatore-produzione", (req, res) => {
    try {
        const database = db();

        const reset = database.transaction(() => {

            // 1️⃣ Reset contatore produzione
            database.prepare(`
                UPDATE config 
                SET value = 0 
                WHERE key = 'produzione_counter'
            `).run();

            // 2️⃣ Annulla SOLO le prenotazioni non completate
            database.prepare(`
                UPDATE prenotazioni_sfuso
                SET stato = 'annullato'
                WHERE stato != 'completato'
            `).run();

            // 3️⃣ Annulla SOLO produzioni non completate
            database.prepare(`
                UPDATE produzioni_sfuso
                SET stato = 'annullato'
                WHERE stato != 'completato'
            `).run();

            // 4️⃣ Cancella SOLO le prenotazioni annullate (fantasma)
            database.prepare(`
                DELETE FROM prenotazioni_sfuso
                WHERE stato = 'annullato'
            `).run();

            // ❗ NON tocchiamo lo storico
            // ❗ NON tocchiamo le produzioni completate
        });

        reset();

        res.json({
            ok: true,
            message: "Reset eseguito senza cancellare lo storico."
        });

    } catch (err) {
        console.error("❌ Errore reset contatore produzione:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});




// POST → reset totale produzione (prenotazioni + lavorazione + completate + storico)
/*router.post("/reset-produzione-totale", (req, res) => {
    try {
        const dbc = db();

        // 1. Svuota tutte le prenotazioni (qualsiasi stato)
        dbc.prepare("DELETE FROM prenotazioni_sfuso").run();

        // 2. Svuota tutte le produzioni completate
        dbc.prepare("DELETE FROM produzioni_sfuso").run();

        // 3. Svuota tutto lo storico
        dbc.prepare("DELETE FROM storico_produzioni_sfuso").run();

        // 4. (opzionale) svuota movimenti
        try {
            dbc.prepare("DELETE FROM movimenti").run();
        } catch { }

        // 5. Reset contatore se ti serve ancora
        dbc.prepare("UPDATE config SET value = 0 WHERE key = ?").run("produzione_counter");

        res.json({
            ok: true,
            message: "Reset totale completato"
        });

    } catch (err) {
        console.error("❌ Errore RESET TOTALE:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});*/


module.exports = router;
