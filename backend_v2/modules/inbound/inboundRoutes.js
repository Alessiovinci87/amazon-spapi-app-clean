const express = require("express");
const logger = require("../../utils/logger");
const svc = require("./inboundService");
const api = require("./inboundApi");

const router = express.Router();

router.get("/config", (_req, res) => {
  res.json({ testMode: api.isMockEnabled() });
});

router.get("/plans", (_req, res) => {
  res.json(svc.listPlans());
});

router.get("/plans/:id", (req, res) => {
  try {
    const plan = svc.getPlan(req.params.id);
    plan.source_address = JSON.parse(plan.source_address);
    plan.items = svc.getPlanItems(plan.id);
    res.json(plan);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post("/plans", (req, res) => {
  try {
    const planId = svc.createDraft(req.body);
    res.status(201).json({ id: planId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/plans/:id", (req, res) => {
  svc.deletePlan(req.params.id);
  res.json({ ok: true });
});

router.post("/plans/:id/create-on-amazon", async (req, res) => {
  try {
    const out = await svc.createPlanOnAmazon(req.params.id);
    res.json(out);
  } catch (err) {
    logger.error({ err }, "[Inbound] createPlanOnAmazon");
    res.status(500).json({ error: err.message, details: err.details });
  }
});

router.post("/plans/:id/packing/start", async (req, res) => {
  try {
    const out = await svc.startPacking(req.params.id);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/plans/:id/packing/options", async (req, res) => {
  try {
    res.json(await svc.listPackingOptions(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/plans/:id/packing/confirm", async (req, res) => {
  try {
    const out = await svc.confirmPacking(req.params.id, req.body.packingOptionId);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Placement
router.post("/plans/:id/placement/start", async (req, res) => {
  try { res.json(await svc.startPlacement(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.get("/plans/:id/placement/options", async (req, res) => {
  try { res.json(await svc.listPlacementOptions(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/plans/:id/placement/confirm", async (req, res) => {
  try { res.json(await svc.confirmPlacement(req.params.id, req.body.placementOptionId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Transportation
router.post("/plans/:id/transport/start", async (req, res) => {
  try { res.json(await svc.startTransportation(req.params.id, req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.get("/plans/:id/transport/options", async (req, res) => {
  try { res.json(await svc.listTransportationOptions(req.params.id, req.query)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/plans/:id/transport/confirm", async (req, res) => {
  try { res.json(await svc.confirmTransportation(req.params.id, req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Delivery Window (per shipment)
router.post("/plans/:id/delivery/:shipmentId/start", async (req, res) => {
  try { res.json(await svc.startDelivery(req.params.id, req.params.shipmentId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.get("/plans/:id/delivery/:shipmentId/options", async (req, res) => {
  try { res.json(await svc.listDeliveryWindowOptions(req.params.id, req.params.shipmentId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/plans/:id/delivery/:shipmentId/confirm", async (req, res) => {
  try { res.json(await svc.confirmDelivery(req.params.id, req.params.shipmentId, req.body.deliveryWindowOptionId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Plan summary (per leggere shipments dopo placement)
router.get("/plans/:id/summary", async (req, res) => {
  try { res.json(await svc.getPlanSummary(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/plans/:id/mark-done", (req, res) => {
  svc.markDone(req.params.id);
  res.json({ ok: true });
});

router.get("/operations/:opId", async (req, res) => {
  try {
    res.json(await svc.pollOperation(req.params.opId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PDF mock: generato al volo in modalita' test, per simulare un download labels reale
router.get("/mock-labels/:shipmentId.pdf", (req, res) => {
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=mock-labels-${req.params.shipmentId}.pdf`);
  doc.pipe(res);

  doc.fontSize(22).fillColor("#dc2626").text("MOCK LABEL", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#666").text("Etichetta dimostrativa - Modalita' Test", { align: "center" });
  doc.moveDown(2);

  doc.fontSize(14).fillColor("#000").text(`Shipment ID: ${req.params.shipmentId}`);
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#444").text("Centro destinazione: Amazon FBA (mock)");
  doc.text("Tipo etichetta: Box Label / FNSKU");
  doc.moveDown(1.5);

  // Codice a barre finto (rettangoli alternati)
  const startX = 80, startY = doc.y, barH = 70;
  let x = startX;
  for (let i = 0; i < 60; i++) {
    const w = (i % 3 === 0) ? 5 : 2;
    if (i % 2 === 0) doc.rect(x, startY, w, barH).fill("#000");
    x += w + 1;
  }
  doc.fillColor("#000").fontSize(10).text(`X${req.params.shipmentId}`, startX, startY + barH + 8);

  doc.moveDown(4);
  doc.fontSize(9).fillColor("#999")
    .text("Questa e' un'etichetta dimostrativa generata in modalita' Test.", { align: "center" })
    .text("Nessuna spedizione reale e' stata creata su Amazon.", { align: "center" })
    .text("Per attivare il flusso reale: rimuovere INBOUND_TEST_MODE dall'env del server.", { align: "center" });

  doc.end();
});

router.get("/shipments/:shipmentId/labels", async (req, res) => {
  try {
    const planId = req.query.planId;
    res.json(await svc.downloadLabels(planId, req.params.shipmentId, req.query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
