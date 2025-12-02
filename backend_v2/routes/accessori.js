// backend_v2/routes/accessori.js
const express = require('express');
const router = express.Router();
const AccessoriController = require('../controllers/accessoriController');

router.use((req, _res, next) => {
  console.log(`[ACCESSORI] ${req.method} ${req.originalUrl}`);
  next();
});

/** 📜 GET storico accessori */
router.get('/storico', AccessoriController.getStoricoAccessori);

/** PATCH aggiorna quantità */
router.patch('/:asin_accessorio', AccessoriController.updateQuantitaAccessorio);

/** GET tutti gli accessori */
router.get('/', AccessoriController.getAllAccessori);

/** GET singolo accessorio */
router.get('/:asin_accessorio', AccessoriController.getAccessorio);

module.exports = router;
