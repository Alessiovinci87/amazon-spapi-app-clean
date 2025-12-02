// backend_v2/routes/produzioneSfuso.js
const express = require("express");
const router = express.Router();

const produzioneController = require("../controllers/produzioneSfuso.controller");

/* =========================================================
   🚀 PRODUZIONE SFUSO – Rotte principali
   Prefix previsto: /api/v2/produzioni-sfuso
========================================================= */

// 📦 Elenco produzioni (tutte o filtrate per stato)
router.get("/", produzioneController.getAllProduzioni);

// ➕ Crea una nuova produzione (pianificata)
router.post("/", produzioneController.creaProduzione);

// 🟢 Crea produzione partendo da prenotazione
router.post("/crea-da-prenotazione", produzioneController.creaDaPrenotazione);

// ✏️ Aggiorna una produzione (es. quantità o note)
router.patch("/:id", produzioneController.aggiornaProduzione);

// ✅ Conferma completamento produzione (esegue scalatura e movimenti)
router.post("/:id/completa", produzioneController.completaProduzione);

// ❌ Elimina una produzione (solo se non completata)
router.delete("/:id", produzioneController.eliminaProduzione);

// 🔹 GET /api/v2/produzioni-sfuso/storico
router.get("/storico", (req, res) => {
  try {
    const { asin, stato } = req.query;
    const data = require("../services/storicoProduzioniSfuso.service")
      .getStorico({ asin, stato });

    res.json({ ok: true, data });
  } catch (err) {
    console.error("❌ Errore getStoricoProduzioniSfuso:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
