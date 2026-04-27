// backend_v2/modules/feedback/feedbackRoutes.js
const express = require("express");
const logger = require("../../utils/logger");
const router = express.Router();
const {
  MARKETPLACES,
  getMarketplaceByCode,
  syncMarketplaceFeedback,
  getFeedback,
  getStats,
  getSyncStatus,
  getCatalogWithFeedback,
  listFeedbackReports,
  fetchRawTsv,
} = require("./feedbackService");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GET /api/v2/feedback/marketplaces — elenco paesi disponibili
router.get("/marketplaces", (req, res) => {
  res.json(
    MARKETPLACES.map((m) => ({
      code: m.code,
      paese: m.paese,
      marketplaceId: m.marketplaceId,
    }))
  );
});

// GET /api/v2/feedback?marketplace=IT&stelle=1,2&asin=B0...&limit=200
router.get("/", (req, res) => {
  try {
    const { marketplace, asin, limit } = req.query;
    let stelle;
    if (req.query.stelle) {
      stelle = String(req.query.stelle)
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((s) => s >= 1 && s <= 5);
    }

    const feedback = getFeedback({ marketplace, asin, stelle, limit });
    const stats = getStats({ marketplace });
    const sync = getSyncStatus({ marketplace });

    res.json({
      ok: true,
      marketplace: marketplace || null,
      stats,
      sync,
      feedback,
    });
  } catch (err) {
    logger.error("❌ /feedback GET:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/v2/feedback/sync  body: { marketplace: "IT", days: 365 }
// Sincronizza il report SP-API per il marketplace richiesto.
router.post("/sync", async (req, res) => {
  logger.info(`📨 [POST /sync] richiesta ricevuta:`, req.body);
  const marketplace = req.body?.marketplace || req.query?.marketplace;
  const days = req.body?.days || req.query?.days;
  if (!marketplace) {
    return res.status(400).json({ ok: false, error: "Marketplace richiesto" });
  }
  try {
    logger.info(`🔄 Sync seller feedback per ${marketplace} (${days || 365}gg)…`);
    const result = await syncMarketplaceFeedback(marketplace, { days });
    logger.info(`✅ Sync ${marketplace}: ${result.records} record — invio risposta`);
    res.json({ ok: true, ...result });
    logger.info(`📤 [POST /sync] risposta inviata`);
  } catch (err) {
    logger.error(`❌ Sync feedback ${marketplace}:`, err.response?.data || err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/v2/feedback/sync-all  body: { days?: 365 }
// Sincronizza il report SP-API per TUTTI i marketplace EU configurati,
// uno alla volta (i report SP-API non sono parallelizzabili in modo sicuro).
router.post("/sync-all", async (req, res) => {
  const days = req.body?.days || req.query?.days;
  logger.info(`🔄 Sync feedback per tutti i marketplace EU…`);
  const results = [];
  const errors = [];
  for (let i = 0; i < MARKETPLACES.length; i++) {
    const mp = MARKETPLACES[i];
    try {
      logger.info(`  → ${mp.code}`);
      const r = await syncMarketplaceFeedback(mp.code, { days });
      logger.info(`  ✅ ${mp.code}: ${r.records} record`);
      results.push({ marketplace: mp.code, records: r.records });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.errors?.[0]?.message || err.message;
      logger.warn(`  ⚠️ ${mp.code}: ${msg}`);
      errors.push({ marketplace: mp.code, error: msg });
      // Quota esaurita: aspetta più a lungo prima di proseguire
      if (status === 429 || /quota/i.test(msg)) {
        logger.info(`  ⏳ Quota esaurita, attendo 60s…`);
        await sleep(60000);
      }
    }
    // Pausa tra marketplace per evitare rate-limit (Reports API: ~0.0167 req/s)
    if (i < MARKETPLACES.length - 1) {
      logger.info(`  ⏳ Pausa 15s prima del prossimo marketplace…`);
      await sleep(15000);
    }
  }
  const total = results.reduce((s, r) => s + r.records, 0);
  logger.info(`✅ Sync completato: ${total} feedback totali (${errors.length} errori)`);
  res.json({ ok: true, total, results, errors });
});

// POST /api/v2/feedback/cache/clear
// Svuota la cache ordini (amazon_order_cache). Forza il prossimo sync
// a richiamare Orders API per ogni feedback.
router.post("/cache/clear", (req, res) => {
  try {
    const { getDb } = require("../../db/database");
    const db = getDb();
    const before = db.prepare("SELECT COUNT(*) as c FROM amazon_order_cache").get().c;
    db.prepare("DELETE FROM amazon_order_cache").run();
    logger.info(`🧹 Cache ordini svuotata: ${before} record cancellati`);
    res.json({ ok: true, deleted: before });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/v2/feedback/reset
// Svuota tutta la tabella seller_feedback (utile per ripartire da zero
// dopo cambi di schema o duplicati). Non tocca la cache ordini.
router.post("/reset", (req, res) => {
  try {
    const { getDb } = require("../../db/database");
    const db = getDb();
    const before = db.prepare("SELECT COUNT(*) as c FROM seller_feedback").get().c;
    db.prepare("DELETE FROM seller_feedback").run();
    db.prepare("DELETE FROM seller_feedback_sync").run();
    logger.info(`🧹 Reset feedback: cancellati ${before} record`);
    res.json({ ok: true, deleted: before });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/feedback/diagnose?marketplace=IT
// Lista i report SP-API GET_SELLER_FEEDBACK_DATA esistenti su Amazon
// (qualsiasi stato, ultimi 90gg). Utile per capire se Amazon ha dati o no.
router.get("/diagnose", async (req, res) => {
  try {
    const { marketplace } = req.query;
    if (!marketplace) {
      return res.status(400).json({ ok: false, error: "Marketplace richiesto" });
    }
    const mp = getMarketplaceByCode(marketplace);
    if (!mp) {
      return res.status(400).json({ ok: false, error: `Marketplace sconosciuto: ${marketplace}` });
    }
    const reports = await listFeedbackReports(
      [mp.marketplaceId],
      ["DONE", "IN_PROGRESS", "IN_QUEUE", "CANCELLED", "FATAL"]
    );
    res.json({
      ok: true,
      marketplace,
      count: reports.length,
      reports: reports.map((r) => ({
        reportId: r.reportId,
        status: r.processingStatus,
        createdTime: r.createdTime,
        processingStartTime: r.processingStartTime,
        processingEndTime: r.processingEndTime,
        hasDocument: !!r.reportDocumentId,
        dataStartTime: r.dataStartTime,
        dataEndTime: r.dataEndTime,
      })),
    });
  } catch (err) {
    logger.error("❌ /feedback/diagnose:", err.response?.data || err.message);
    res.status(500).json({
      ok: false,
      error: err.response?.data?.errors?.[0]?.message || err.message,
    });
  }
});

// GET /api/v2/feedback/raw-tsv?marketplace=IT&days=365
// Diagnostica: scarica il report e restituisce il TSV raw (senza parsing)
// + metadata (encoding, byteLength, firstBytes hex). Usare per capire perché
// un sync rileva "1 sola" recensione.
router.get("/raw-tsv", async (req, res) => {
  try {
    const { marketplace, days } = req.query;
    if (!marketplace) return res.status(400).json({ ok: false, error: "marketplace richiesto" });
    const maxPreview = Math.min(Number(req.query.preview) || 10000, 200000);
    const result = await fetchRawTsv(marketplace, { days });
    // Ritorna solo preview del TSV (può essere MB)
    const truncated = (result.tsv || "").length > maxPreview;
    res.json({
      ok: true,
      ...result,
      tsv: (result.tsv || "").slice(0, maxPreview),
      truncated,
      tsvLength: (result.tsv || "").length,
    });
  } catch (err) {
    logger.error("❌ /feedback/raw-tsv:", err.response?.data || err.message);
    res.status(500).json({
      ok: false,
      error: err.response?.data?.errors?.[0]?.message || err.message,
    });
  }
});

// GET /api/v2/feedback/catalog?marketplace=IT
// Catalogo del marketplace con feedback aggregato per ASIN.
router.get("/catalog", (req, res) => {
  try {
    const { marketplace } = req.query;
    if (!marketplace) {
      return res.status(400).json({ ok: false, error: "Marketplace richiesto" });
    }
    const items = getCatalogWithFeedback({ marketplace });
    res.json({ ok: true, marketplace, items });
  } catch (err) {
    logger.error("❌ /feedback/catalog:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/feedback/sync/status?marketplace=IT
router.get("/sync/status", (req, res) => {
  const { marketplace } = req.query;
  res.json({ ok: true, status: getSyncStatus({ marketplace }) });
});

module.exports = router;
