// backend_v2/routes/movimenti.js
const express = require('express');
const router = express.Router();
const movimentiController = require('../controllers/movimentiController');

// POST → salva un nuovo movimento
router.post('/', movimentiController.salvaMovimento);

// GET → elenca ultimi movimenti
router.get('/', movimentiController.listaMovimenti);

module.exports = router;
