// backend_v2/routes/accessori.js
const express = require('express');
const { z } = require("zod");
const router = express.Router();
const AccessoriController = require('../controllers/accessoriController');
const { validate } = require("../middleware/validate");

const asinParam = z.object({ asin_accessorio: z.string().min(1).max(50) });

const sogliaSchema = z.object({
  soglia_minima: z.coerce.number().int().min(0),
});

const updateQtaSchema = z.object({
  quantita: z.coerce.number().int().min(0),
  nota: z.string().max(1000).nullish(),
  operatore: z.string().max(100).optional(),
});

router.use((req, _res, next) => {
  console.log(`[ACCESSORI] ${req.method} ${req.originalUrl}`);
  next();
});

/** 📜 GET storico accessori */
router.get('/storico', AccessoriController.getStoricoAccessori);

/** PATCH imposta soglia minima */
router.patch('/:asin_accessorio/soglia',
  validate({ params: asinParam, body: sogliaSchema }),
  AccessoriController.updateSogliaAccessorio);

/** PATCH aggiorna quantità */
router.patch('/:asin_accessorio',
  validate({ params: asinParam, body: updateQtaSchema }),
  AccessoriController.updateQuantitaAccessorio);

/** GET tutti gli accessori */
router.get('/', AccessoriController.getAllAccessori);

/** GET singolo accessorio */
router.get('/:asin_accessorio', AccessoriController.getAccessorio);

module.exports = router;
