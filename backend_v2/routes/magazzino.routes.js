// backend_v2/routes/magazzino.routes.js
const express = require("express");
const router = express.Router();
const magazzinoController = require("../controllers/magazzino.controller");
const { getDb } = require("../db/database");
const { checkSottoSogliaProdotti } = require("../services/stockAlerts.service");

router.get("/nomi", magazzinoController.getNomiProdotti);
router.get("/", magazzinoController.getAllProdotti);
router.get("/:asin/accessori", magazzinoController.getAccessoriAssociati);
router.patch("/:asin/pronto", magazzinoController.setProntoAssoluto);
router.post("/:asin/produce", magazzinoController.produceDelta);
router.patch("/:asin/sfuso", magazzinoController.aggiornaSfusoLitri);

// Aggiorna soglia minima alert per un prodotto
router.patch("/:asin/soglia", (req, res) => {
  try {
    const db = getDb();
    const { soglia_minima } = req.body;
    if (soglia_minima == null || soglia_minima < 0) {
      return res.status(400).json({ error: "soglia_minima deve essere >= 0" });
    }
    db.prepare(
      "UPDATE prodotti SET soglia_minima = ? WHERE asin = ?"
    ).run(Number(soglia_minima), req.params.asin);
    checkSottoSogliaProdotti(db, req.params.asin);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST - Crea nuovo prodotto
router.post("/", magazzinoController.createProdotto);

// DELETE - Elimina prodotto per ASIN
router.delete("/:asin", magazzinoController.deleteProdotto);

module.exports = router;