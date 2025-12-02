// backend_v2/routes/magazzino.routes.js
const express = require("express");
const router = express.Router();
const magazzinoController = require("../controllers/magazzino.controller");

router.get("/nomi", magazzinoController.getNomiProdotti);
router.get("/", magazzinoController.getAllProdotti);
router.get("/:asin/accessori", magazzinoController.getAccessoriAssociati);
router.patch("/:asin/pronto", magazzinoController.setProntoAssoluto); // ✅ AGGIUNTA CORRETTA
router.post("/:asin/produce", magazzinoController.produceDelta);
router.patch("/:asin/sfuso", magazzinoController.aggiornaSfusoLitri);

module.exports = router;
