// backend_v2/routes/movimenti.js
const express = require('express');
const { z } = require("zod");
const router = express.Router();
const movimentiController = require('../controllers/movimentiController');
const { validate } = require("../middleware/validate");

const movimentoSchema = z.object({
  tipo: z.string().min(1, "Campo 'tipo' obbligatorio").max(50),
  asin_prodotto: z.string().max(50).nullish(),
  asin_accessorio: z.string().max(50).nullish(),
  delta_pronto: z.coerce.number().int().default(0),
  delta_quantita: z.coerce.number().int().default(0),
  note: z.string().max(1000).nullish(),
  operatore: z.string().max(100).default("system"),
});

// POST → salva un nuovo movimento
router.post('/', validate({ body: movimentoSchema }), movimentiController.salvaMovimento);

// GET → elenca ultimi movimenti
router.get('/', movimentiController.listaMovimenti);

module.exports = router;
