const express = require("express");
const { z } = require("zod");
const router = express.Router();
const { getDb } = require("../db/database");
const { verifyPassword } = require("../utils/password");
const { validate } = require("../middleware/validate");
const logger = require("../utils/logger");

const resetContatoreSchema = z.object({
  password: z.string().min(1, "Password richiesta.").max(200),
});

// GET → ottieni contatore
router.get("/produzione-counter", (req, res) => {
    try {
        const db = getDb();
        const row = db.prepare(`SELECT value FROM config WHERE key = ?`).get("produzione_counter");
        res.json({ ok: true, value: row ? Number(row.value) : 0 });
    } catch (err) {
        logger.error({ err }, "Errore GET produzione-counter");
        res.status(500).json({ ok: false, error: "Errore nel recupero del contatore" });
    }
});

// POST → reset contatore + pulizia prenotazioni NON completate
// Richiede password admin nel body per operazione distruttiva
router.post("/reset-contatore-produzione", validate({ body: resetContatoreSchema }), (req, res) => {
    const { password } = req.body;

    const db = getDb();
    const row = db.prepare("SELECT valore FROM impostazioni WHERE chiave = 'admin_password'").get();
    if (!row || !verifyPassword(password, row.valore)) {
        return res.status(401).json({ ok: false, message: "Password non valida." });
    }

    try {
        const reset = db.transaction(() => {
            db.prepare(`UPDATE config SET value = 0 WHERE key = 'produzione_counter'`).run();
            db.prepare(`UPDATE prenotazioni_sfuso SET stato = 'annullato' WHERE stato != 'completato'`).run();
            db.prepare(`UPDATE produzioni_sfuso SET stato = 'annullato' WHERE stato != 'completato'`).run();
            db.prepare(`DELETE FROM prenotazioni_sfuso WHERE stato = 'annullato'`).run();
        });

        reset();

        logger.info("Reset contatore produzione eseguito");
        res.json({ ok: true, message: "Reset eseguito senza cancellare lo storico." });

    } catch (err) {
        logger.error({ err }, "Errore reset contatore produzione");
        res.status(500).json({ ok: false, error: "Errore durante il reset" });
    }
});

module.exports = router;
