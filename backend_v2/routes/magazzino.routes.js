// backend_v2/routes/magazzino.routes.js
const express = require("express");
const router = express.Router();
const magazzinoController = require("../controllers/magazzino.controller");

router.get("/nomi", magazzinoController.getNomiProdotti);
router.get("/", magazzinoController.getAllProdotti);
router.get("/:asin/accessori", magazzinoController.getAccessoriAssociati);
router.patch("/:asin/pronto", magazzinoController.setProntoAssoluto);
router.post("/:asin/produce", magazzinoController.produceDelta);
router.patch("/:asin/sfuso", magazzinoController.aggiornaSfusoLitri);

// 🆕 POST - Crea nuovo prodotto
router.post("/", magazzinoController.createProdotto);

// 🗑️ DELETE - Elimina prodotto per ASIN
router.delete("/:asin", magazzinoController.deleteProdotto);

module.exports = router;