// backend_v2/routes/magazzino.routes.js
const express = require("express");
const router = express.Router();
const magazzinoController = require("../controllers/magazzino.controller");
const { getDb } = require("../db/database");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const { checkSottoSogliaProdotti } = require("../services/stockAlerts.service");

const asinParam = z.object({ asin: z.string().min(1).max(20) });
const setProntoSchema = z.object({
  pronto: z.coerce.number(),
  note: z.string().min(1).max(1000),
  operatore: z.string().min(1).max(80),
});
const produceSchema = z.object({
  qty: z.coerce.number(),
  note: z.string().max(1000).default(""),
  operatore: z.string().max(80).default("system"),
});
const sfusoLitriSchema = z.object({
  sfusoLitri: z.coerce.number(),
});
const sogliaSchema = z.object({
  soglia_minima: z.coerce.number().min(0),
});
// payload prodotto: variabile (alias nome/nome_prodotto, tanti campi opzionali)
const createProdottoSchema = z.object({
  nome: z.string().max(255).optional(),
  nome_prodotto: z.string().max(255).optional(),
  asin: z.string().max(20).optional(),
  sku: z.string().max(80).optional(),
}).passthrough().refine(
  (d) => !!(d.nome || d.nome_prodotto),
  { message: "Il nome del prodotto è obbligatorio", path: ["nome"] }
);

router.get("/nomi", magazzinoController.getNomiProdotti);
router.get("/", magazzinoController.getAllProdotti);
router.get("/:asin/accessori", magazzinoController.getAccessoriAssociati);
router.patch("/:asin/pronto", validate({ params: asinParam, body: setProntoSchema }), magazzinoController.setProntoAssoluto);
router.post("/:asin/produce", validate({ params: asinParam, body: produceSchema }), magazzinoController.produceDelta);
router.patch("/:asin/sfuso", validate({ params: asinParam, body: sfusoLitriSchema }), magazzinoController.aggiornaSfusoLitri);

// Aggiorna soglia minima alert per un prodotto
router.patch("/:asin/soglia", validate({ params: asinParam, body: sogliaSchema }), (req, res) => {
  try {
    const db = getDb();
    const { soglia_minima } = req.body;
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
router.post("/", validate({ body: createProdottoSchema }), magazzinoController.createProdotto);

// DELETE - Elimina prodotto per ASIN
router.delete("/:asin", validate({ params: asinParam }), magazzinoController.deleteProdotto);

module.exports = router;