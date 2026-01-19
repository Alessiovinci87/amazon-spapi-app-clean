// backend_v2/routes/spedizioni.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/spedizioniController");

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
router.post("/", controller.creaSpedizione);

// 🟧 POST aggiunge righe a spedizione BOZZA
router.post("/:id/righe", controller.aggiungiRighe);

// 🟨 PATCH aggiorna intestazione + righe (solo BOZZA)
router.patch("/:id", controller.aggiornaSpedizione);

// 🟪 PATCH conferma spedizione
router.patch("/:id/conferma", controller.confermaSpedizione);

// 🟥 DELETE singola spedizione
router.delete("/:id", controller.eliminaSpedizione);

// 🟧 DELETE tutte le spedizioni
router.delete("/", controller.eliminaTutte);

module.exports = router;
