// backend_v2/routes/sfusoReset.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

// 🔹 DELETE → Reset storico sfuso inventario
router.delete("/storico-inventario/reset", async (req, res) => {
    try {
        const db = getDb(); // ✅ istanza SQLite
        if (!db) {
            console.error("❌ getDb() ha restituito undefined o null");
            return res.status(500).json({ message: "Database non disponibile" });
        }

        console.log("🧹 Tentativo di reset tabella storico_sfuso_inventario...");

        // ✅ Usa exec() invece di run() per il tuo setup
        await db.exec("DELETE FROM storico_sfuso");

        console.log("✅ Storico sfuso inventario svuotato con successo");
        res.json({ message: "Storico cancellato con successo" });
    } catch (err) {
        console.error("❌ Errore reset storico:", err.message);
        res.status(500).json({ message: "Errore nel reset dello storico", error: err.message });
    }
});

module.exports = router;
