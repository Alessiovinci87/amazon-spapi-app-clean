// backend_v2/modules/competitor/competitorRoutes.js
const express = require("express");
const router = express.Router();
const logger = require("../../utils/logger");
const {
  getKeywords,
  addKeyword,
  removeKeyword,
  toggleKeyword,
  runCategorySnapshot,
  getSnapshotHistory,
  getCompetitorAsins,
  searchCategory,
  exploreCategoria,
  snapshotSingleKeyword,
  addTrackedAsin,
  listTrackedAsins,
  removeTrackedAsin,
  removeTrackedByKeyword,
  captureAsinSnapshot,
  getAsinSnapshotHistory,
  getAsinChanges,
  getRecentChanges,
  runTrackedAsinsSnapshot,
  discoverCategorieDaTracked,
  getAsinSalesEstimate,
  getKeywordWordCloud,
  addMyMapping,
  removeMyMapping,
  listMyMappings,
  getCompetitorComparison,
  debugPricing,
} = require("./competitorService");

// ── KEYWORD CRUD ────────────────────────────────────────

// GET /api/v2/competitor/keywords — lista keyword con conteggio + trend
router.get("/keywords", (req, res) => {
  try {
    res.json({ ok: true, keywords: getKeywords() });
  } catch (err) {
    logger.error({ err }, "Errore GET keywords");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/v2/competitor/keywords — aggiungi keyword + snapshot iniziale immediato
router.post("/keywords", async (req, res) => {
  try {
    const { keyword, marketplace, category_id } = req.body;
    if (!keyword || keyword.trim().length < 2) return res.status(400).json({ ok: false, error: "Keyword troppo corta" });
    const result = addKeyword(keyword.trim(), (marketplace || "IT").toUpperCase(), category_id || "");
    if (result.ok && result.id) {
      // Esegui subito snapshot per popolare top-20 (senza aspettare cron 08:00)
      try {
        const snap = await snapshotSingleKeyword(result.id);
        result.snapshot = snap;
      } catch (e) {
        logger.warn(`[Competitor] snapshot iniziale keyword ${result.id} fallito: ${e.message}`);
      }
    }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Errore POST keyword");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/v2/competitor/keywords/:id
router.delete("/keywords/:id", (req, res) => {
  try {
    res.json(removeKeyword(parseInt(req.params.id)));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PATCH /api/v2/competitor/keywords/:id/toggle — attiva/disattiva
router.patch("/keywords/:id/toggle", (req, res) => {
  try {
    res.json(toggleKeyword(parseInt(req.params.id)));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── SNAPSHOT ────────────────────────────────────────────

// POST /api/v2/competitor/snapshot — esegui snapshot ora (sincrono, veloce con poche keyword)
router.post("/snapshot", async (req, res) => {
  try {
    const result = await runCategorySnapshot();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "Errore competitor snapshot");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/competitor/history/:keywordId — storico conteggi per grafico
router.get("/history/:keywordId", (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const data = getSnapshotHistory(parseInt(req.params.keywordId), days);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── ASIN COMPETITOR ─────────────────────────────────────

// GET /api/v2/competitor/asins?keyword=...&marketplace=IT
router.get("/asins", (req, res) => {
  try {
    const { keyword, marketplace } = req.query;
    if (!keyword) return res.status(400).json({ ok: false, error: "keyword richiesta" });
    const asins = getCompetitorAsins(keyword, marketplace || "IT");
    res.json({ ok: true, asins });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── RICERCA LIVE (senza salvare) ────────────────────────

// GET /api/v2/competitor/search?keyword=...&marketplace=IT&category_id=...
// Almeno uno tra keyword e category_id deve essere presente
router.get("/search", async (req, res) => {
  try {
    const { keyword, marketplace, category_id } = req.query;
    if (!keyword && !category_id) return res.status(400).json({ ok: false, error: "Specifica almeno una keyword o una categoria" });
    const result = await searchCategory(keyword || "", (marketplace || "IT").toUpperCase(), 20, category_id || "");
    res.json({ ok: true, ...result });
  } catch (err) {
    const code = err.statusCode || 500;
    if (code >= 500) logger.error({ err }, "Errore competitor search");
    res.status(code).json({ ok: false, error: err.message });
  }
});

// ── STORICO COMPETITOR (ASIN tracciati) ─────────────────

// GET /api/v2/competitor/tracked
router.get("/tracked", (req, res) => {
  try {
    const { marketplace, all } = req.query;
    const rows = listTrackedAsins({ marketplace: marketplace || null, soloAttivi: all !== "1" });
    res.json({ ok: true, tracked: rows });
  } catch (err) {
    logger.error({ err }, "Errore GET tracked");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/v2/competitor/tracked — aggiungi ASIN manualmente (e cattura snapshot subito)
router.post("/tracked", async (req, res) => {
  try {
    const { asin, marketplace, note } = req.body;
    if (!asin) return res.status(400).json({ ok: false, error: "asin richiesto" });
    const r = addTrackedAsin({ asin, marketplace: (marketplace || "IT").toUpperCase(), note: note || "", source: "manual" });
    if (!r.ok) return res.status(400).json(r);
    // Cattura subito il primo snapshot
    const snap = await captureAsinSnapshot(r.asin, (marketplace || "IT").toUpperCase());
    res.json({ ok: true, asin: r.asin, snapshot: snap });
  } catch (err) {
    logger.error({ err }, "Errore POST tracked");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/v2/competitor/tracked/:id
router.delete("/tracked/:id", (req, res) => {
  try {
    res.json(removeTrackedAsin(parseInt(req.params.id)));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/v2/competitor/tracked-by-keyword?keyword_source=X&marketplace=IT
router.delete("/tracked-by-keyword", (req, res) => {
  try {
    const { keyword_source, marketplace } = req.query;
    if (!keyword_source) return res.status(400).json({ ok: false, error: "keyword_source richiesta" });
    res.json(removeTrackedByKeyword(keyword_source, (marketplace || "IT").toUpperCase()));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/v2/competitor/tracked/check-asin — forza check di un ASIN specifico (anche non tracciato)
router.post("/tracked/check-asin", async (req, res) => {
  try {
    const { asin, marketplace } = req.body;
    if (!asin) return res.status(400).json({ ok: false, error: "asin richiesto" });
    const result = await captureAsinSnapshot(asin.trim().toUpperCase(), (marketplace || "IT").toUpperCase());
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Errore check-asin");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/competitor/tracked/:asin/history?marketplace=IT
router.get("/tracked/:asin/history", (req, res) => {
  try {
    const { marketplace, limit } = req.query;
    const data = getAsinSnapshotHistory(req.params.asin, (marketplace || "IT").toUpperCase(), parseInt(limit) || 60);
    res.json({ ok: true, snapshots: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/competitor/tracked/:asin/changes
router.get("/tracked/:asin/changes", (req, res) => {
  try {
    const { marketplace, limit } = req.query;
    const data = getAsinChanges(req.params.asin, (marketplace || "IT").toUpperCase(), parseInt(limit) || 100);
    res.json({ ok: true, changes: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/competitor/changes?days=30
router.get("/changes", (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 200;
    const changes = getRecentChanges({ days, limit });
    res.json({ ok: true, changes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/v2/competitor/tracked/snapshot — cron manuale per tutti i tracciati
router.post("/tracked/snapshot", async (req, res) => {
  try {
    const result = await runTrackedAsinsSnapshot();
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Errore tracked snapshot");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── CONFRONTO MIO ASIN ↔ COMPETITOR ─────────────────────

// GET /api/v2/competitor/mappings — lista mapping
router.get("/mappings", (req, res) => {
  try { res.json({ ok: true, mappings: listMyMappings() }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// POST /api/v2/competitor/mappings — crea mapping mio_asin ↔ keyword
router.post("/mappings", (req, res) => {
  try {
    const { my_asin, marketplace, keyword_source, note } = req.body;
    const r = addMyMapping({ my_asin, marketplace: (marketplace || "IT").toUpperCase(), keyword_source, note });
    if (!r.ok) return res.status(400).json(r);
    res.json(r);
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// DELETE /api/v2/competitor/mappings/:id
router.delete("/mappings/:id", (req, res) => {
  try { res.json(removeMyMapping(parseInt(req.params.id))); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// GET /api/v2/competitor/comparison — dashboard confronto mio vs competitor
router.get("/comparison", (req, res) => {
  try { res.json({ ok: true, items: getCompetitorComparison() }); }
  catch (err) { logger.error({ err }, "Errore comparison"); res.status(500).json({ ok: false, error: err.message }); }
});

// GET /api/v2/competitor/debug-pricing/:asin?marketplace=IT — DEBUG: ritorna raw payload + parsing
router.get("/debug-pricing/:asin", async (req, res) => {
  try {
    const result = await debugPricing(req.params.asin, (req.query.marketplace || "IT").toUpperCase());
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/competitor/wordcloud?keyword=...&marketplace=IT
router.get("/wordcloud", (req, res) => {
  try {
    const { keyword, marketplace } = req.query;
    if (!keyword) return res.status(400).json({ ok: false, error: "keyword richiesta" });
    const result = getKeywordWordCloud(keyword, (marketplace || "IT").toUpperCase(), 30);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/competitor/categoria-explore?category_id=...&marketplace=IT
// Workaround: usa una keyword neutra per esplorare i top prodotti di una categoria
router.get("/categoria-explore", async (req, res) => {
  try {
    const { category_id, marketplace } = req.query;
    if (!category_id) return res.status(400).json({ ok: false, error: "category_id richiesto" });
    const result = await exploreCategoria(category_id, (marketplace || "IT").toUpperCase(), 20);
    res.json({ ok: true, ...result });
  } catch (err) {
    const code = err.statusCode || 500;
    if (code >= 500) logger.error({ err }, "Errore categoria-explore");
    res.status(code).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/competitor/tracked/:asin/sales-estimate?marketplace=IT&days=30
router.get("/tracked/:asin/sales-estimate", (req, res) => {
  try {
    const { marketplace, days } = req.query;
    const result = getAsinSalesEstimate(req.params.asin, (marketplace || "IT").toUpperCase(), parseInt(days) || 30);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/competitor/categorie-discovery — scansiona tracked, restituisce browse node trovati
router.get("/categorie-discovery", async (req, res) => {
  try {
    const list = await discoverCategorieDaTracked();
    res.json({ ok: true, categorie: list });
  } catch (err) {
    logger.error({ err }, "Errore categorie-discovery");
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
