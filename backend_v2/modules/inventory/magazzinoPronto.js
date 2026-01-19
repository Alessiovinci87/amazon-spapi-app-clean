// backend_v2/modules/inventory/magazzinoPronto.js
const express = require("express");
const router = express.Router();
const magazzinoController = require("../../controllers/magazzino.controller");

// Usare direttamente la funzione del controller
router.patch("/:asin/pronto", magazzinoController.setProntoAssoluto);

module.exports = router;
