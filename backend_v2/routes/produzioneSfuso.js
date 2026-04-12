// backend_v2/routes/produzioneSfuso.js
const express = require("express");
const router = express.Router();

const produzioneController = require("../controllers/produzioneSfuso.controller");
const storicoService = require("../services/storicoProduzioniSfuso.service");

/* =========================================================
   🚀 PRODUZIONE SFUSO – Rotte principali
   Prefix previsto: /api/v2/produzioni-sfuso
========================================================= */

// Elenco produzioni (tutte o filtrate per stato)
router.get("/", produzioneController.getAllProduzioni);

// Crea una nuova produzione (pianificata)
router.post("/", produzioneController.creaProduzione);

// Crea produzione partendo da prenotazione
router.post("/crea-da-prenotazione", produzioneController.creaDaPrenotazione);

// GET /storico — DEVE stare prima di /:id per non essere catturata dal parametro dinamico
router.get("/storico", (req, res) => {
  try {
    const { asin, stato } = req.query;
    const data = storicoService.getStorico({ asin, stato });
    res.json({ ok: true, data });
  } catch (err) {
    console.error("Errore getStoricoProduzioniSfuso:", err);
    res.status(500).json({ ok: false, message: "Errore nel recupero dello storico" });
  }
});

// Aggiorna una produzione (es. quantita o note)
router.patch("/:id", produzioneController.aggiornaProduzione);

// Conferma completamento produzione (esegue scalatura e movimenti)
router.post("/:id/completa", produzioneController.completaProduzione);

// Elimina una produzione (solo se non completata)
router.delete("/:id", produzioneController.eliminaProduzione);

module.exports = router;
