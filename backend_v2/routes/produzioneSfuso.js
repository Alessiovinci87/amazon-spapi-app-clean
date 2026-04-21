// backend_v2/routes/produzioneSfuso.js
const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const logger = require("../utils/logger");

const produzioneController = require("../controllers/produzioneSfuso.controller");
const storicoService = require("../services/storicoProduzioniSfuso.service");

// ─── Zod schemas ───────────────────────────────────────
const idParam = z.object({ id: z.coerce.number().int().positive() });
const creaSchema = z.object({
  id_sfuso: z.coerce.number().int().positive(),
  asin_prodotto: z.string().min(1).max(20),
  nome_prodotto: z.string().max(255).nullish(),
  formato: z.string().max(40).nullish(),
  quantita: z.coerce.number().positive(),
  note: z.string().max(500).default(""),
  operatore: z.string().max(80).default("system"),
});
// La rotta crea-da-prenotazione accetta prenotazioni con nomi campo variabili
// (camelCase, snake_case, alias). Validiamo solo i campi minimi e lasciamo passare il resto.
const creaDaPrenotazioneSchema = z.object({
  id: z.coerce.number().int().positive(),
}).passthrough();
const aggiornaSchema = z.object({
  quantita: z.coerce.number().positive().nullish(),
  litri_usati: z.coerce.number().nullish(),
  note: z.string().max(500).nullish(),
  stato: z.string().max(40).nullish(),
  operatore: z.string().max(80).nullish(),
}).passthrough();
const completaSchema = z.object({
  operatore: z.string().max(80).default("system"),
});

/* =========================================================
   🚀 PRODUZIONE SFUSO – Rotte principali
   Prefix previsto: /api/v2/produzioni-sfuso
========================================================= */

// Elenco produzioni (tutte o filtrate per stato)
router.get("/", produzioneController.getAllProduzioni);

// Crea una nuova produzione (pianificata)
router.post("/", validate({ body: creaSchema }), produzioneController.creaProduzione);

// Crea produzione partendo da prenotazione
router.post("/crea-da-prenotazione", validate({ body: creaDaPrenotazioneSchema }), produzioneController.creaDaPrenotazione);

// GET /storico — DEVE stare prima di /:id per non essere catturata dal parametro dinamico
router.get("/storico", (req, res) => {
  try {
    const { asin, stato } = req.query;
    const data = storicoService.getStorico({ asin, stato });
    res.json({ ok: true, data });
  } catch (err) {
    logger.error({ err }, "Errore getStoricoProduzioniSfuso");
    res.status(500).json({ ok: false, message: "Errore nel recupero dello storico" });
  }
});

// Aggiorna una produzione (es. quantita o note)
router.patch("/:id", validate({ params: idParam, body: aggiornaSchema }), produzioneController.aggiornaProduzione);

// Conferma completamento produzione (esegue scalatura e movimenti)
router.post("/:id/completa", validate({ params: idParam, body: completaSchema }), produzioneController.completaProduzione);

// Elimina una produzione (solo se non completata)
router.delete("/:id", validate({ params: idParam }), produzioneController.eliminaProduzione);

module.exports = router;
