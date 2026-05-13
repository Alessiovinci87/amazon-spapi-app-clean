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

// Boxing (setPackingInformation)
router.post("/plans/:id/boxing/configure", async (req, res) => {
  try { res.json(await svc.configureBoxing(req.params.id, req.body)); }
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
router.post("/plans/:id/transport/use-your-own-carrier", async (req, res) => {
  try { res.json(await svc.configureUseYourOwnCarrier(req.params.id, req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Delivery Window (per shipment)
router.post("/plans/:id/delivery/:shipmentId/prepare", async (req, res) => {
  try { res.json(await svc.prepareDeliveryWindows(req.params.id, req.params.shipmentId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
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

router.post("/plans/:id/sync", async (req, res) => {
  try { res.json(await svc.syncWithAmazon(req.params.id)); }
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

// PDF mock: layout fedele all'etichetta FBA reale Amazon (10x15 cm termica)
router.get("/mock-labels/:shipmentId.pdf", (req, res) => {
  const PDFDocument = require("pdfkit");
  const mm = (n) => n * 2.83465;
  const W = mm(100), H = mm(150);
  const M = mm(4);
  const doc = new PDFDocument({ size: [W, H], margin: M });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=mock-labels-${req.params.shipmentId}.pdf`);
  doc.pipe(res);

  const shipId = req.params.shipmentId;
  const boxId = `${shipId}U000001`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("it-IT") + " " + now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  // ────── Header: "Logística de Amazon" + Pacco info ──────
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#000").text("Logística de", M, M);
  doc.text("Amazon", M, M + 14);
  doc.font("Helvetica-Bold").fontSize(11).text("Pacco n°1 di 1 - 5kg", M, M + 4, { width: W - 2 * M, align: "right" });

  let y = M + 32;

  // ────── MITTENTE / DESTINATARIO (2 colonne) ──────
  const colW = (W - 2 * M) / 2 - mm(2);
  const leftX = M, rightX = M + colW + mm(4);

  doc.font("Helvetica-Bold").fontSize(7).text("MITTENTE:", leftX, y);
  doc.font("Helvetica").fontSize(8).text("Pics srl", leftX, y + 9);
  doc.fontSize(7).text("via dei fabbri, sn", leftX, y + 18);
  doc.text("07041 Alghero Italia/ SS/ Sardegna", leftX, y + 26);
  doc.text("Italia", leftX, y + 34);

  doc.font("Helvetica-Bold").fontSize(7).text("DESTINATARIO:", rightX, y);
  doc.font("Helvetica").fontSize(7).text(" Declarante: Dissimile srl", rightX, y + 9);
  doc.text("Amazon - ZAZ1", rightX, y + 17);
  doc.text("Polígono – Plataforma Logística de Zaragoza", rightX, y + 25, { width: colW });
  doc.text("Parcelas: ALI-28 y ALI-2", rightX, y + 38);
  doc.text("Zaragoza Aragon 50197", rightX, y + 46);
  doc.text("Spagna", rightX, y + 54);

  y += 68;

  // ────── Banner scuro con FBA STA / Creada ──────
  doc.rect(M, y, W - 2 * M, mm(4)).fill("#000");
  doc.fillColor("#fff").font("Helvetica-Bold").fontSize(7)
    .text(`FBA STA (${dateStr})-MOCK`, M + mm(1), y + 2);
  doc.text(`Creada: ${dateStr} CEST (+02)`, M, y + 2, { width: W - 2 * M - mm(1), align: "right" });

  y += mm(5) + 2;

  // ────── Codice a barre stilizzato (Code128-like) ──────
  const barAreaW = W - 2 * M - mm(2);
  const barH = mm(20);
  let bx = M + mm(1);

  // Genera larghezze pseudo-random ma deterministiche dal shipId
  const seed = Array.from(shipId).reduce((a, c) => a + c.charCodeAt(0), 0);
  let rng = seed;
  const next = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng; };
  const widths = [];
  let totalW = 0;
  for (let i = 0; i < 120; i++) {
    const t = next() % 4;
    const w = [0.45, 0.7, 0.95, 1.2][t];
    widths.push(w);
    totalW += w;
  }
  const scale = barAreaW / totalW;
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i] * scale;
    if (i % 2 === 0) doc.rect(bx, y, w, barH).fill("#000");
    bx += w;
  }

  doc.fillColor("#000").font("Helvetica").fontSize(9).text(boxId, M, y + barH + 2, { width: W - 2 * M, align: "center" });

  y += barH + 14;
  doc.strokeColor("#000").lineWidth(0.5).moveTo(M, y).lineTo(W - M, y).stroke();
  y += 4;

  // ────── Info SKU/Q.tà/Scad/Posizione ──────
  doc.font("Helvetica").fontSize(7).fillColor("#000").text("SKU único", M, y, { width: W - 2 * M, align: "right" });
  doc.font("Helvetica-Bold").fontSize(9).text("5C-3SRI-FQFZ", M, y + 9, { width: W - 2 * M, align: "right" });
  doc.font("Helvetica-Bold").fontSize(8).text("Q.tà 50    Scad. 12 mag 2029", M, y + 22, { width: W - 2 * M, align: "right" });
  doc.font("Helvetica-Bold").fontSize(9).text("P1 - B1", M, y + 34, { width: W - 2 * M, align: "right" });

  // ────── Footer: MANTIENI VISIBILE ──────
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#000")
    .text("MANTIENI VISIBILE QUESTA ETICHETTA", M, H - mm(10), { width: W - 2 * M, align: "center" });

  // ────── Watermark MOCK (semi-trasparente) ──────
  doc.save();
  doc.fillColor("#dc2626").opacity(0.18).font("Helvetica-Bold").fontSize(46);
  doc.rotate(-25, { origin: [W / 2, H / 2] });
  doc.text("MOCK", 0, H / 2 - 24, { width: W, align: "center" });
  doc.restore();

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
