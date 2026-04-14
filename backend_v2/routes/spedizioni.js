// backend_v2/routes/spedizioni.js
const express = require("express");
const { z } = require("zod");
const router = express.Router();
const controller = require("../controllers/spedizioniController");
const { validate } = require("../middleware/validate");

const idParam = z.object({ id: z.coerce.number().int().positive() });

const rigaSchema = z.object({
  asin: z.string().max(50).nullish(),
  sku: z.string().max(100).nullish(),
  nome_prodotto: z.string().max(500).nullish(),
  quantita: z.coerce.number().int().min(0),
}).passthrough();

const creaSchema = z.object({
  intestazione: z.object({}).passthrough().optional(),
  righe: z.array(rigaSchema).optional(),
}).passthrough();

const aggiungiRigheSchema = z.object({
  righe: z.array(rigaSchema).min(1, "Almeno una riga richiesta."),
});

/* ============================================================
   📦 SPEDIZIONI — ROUTER DEFINITIVO
   Ordine corretto per evitare conflitti con /:id
============================================================ */

// 🟫 GET storico (DEVE STARE PRIMA DI /:id)
router.get("/storico", controller.getStorico);

// 🟦 GET tutte le spedizioni
router.get("/", controller.getSpedizioni);

// 🟦 GET dettaglio spedizione + righe
router.get("/:id", controller.getDettaglio);

// 🟦 GET righe singola spedizione
router.get("/:id/righe", controller.getRighe);

// 🟩 POST crea spedizione con righe
router.post("/", validate({ body: creaSchema }), controller.creaSpedizione);

// 🟧 POST aggiunge righe a spedizione BOZZA
router.post("/:id/righe", validate({ params: idParam, body: aggiungiRigheSchema }), controller.aggiungiRighe);

// 🟨 PATCH aggiorna intestazione + righe (solo BOZZA)
router.patch("/:id", validate({ params: idParam }), controller.aggiornaSpedizione);

// 🟪 PATCH conferma spedizione
router.patch("/:id/conferma", validate({ params: idParam }), controller.confermaSpedizione);

// 🟥 DELETE singola spedizione
router.delete("/:id", validate({ params: idParam }), controller.eliminaSpedizione);

// 🟧 DELETE tutte le spedizioni
router.delete("/", controller.eliminaTutte);

module.exports = router;
