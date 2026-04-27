// backend_v2/modules/listings/listingsEditorRoutes.js
const express = require("express");
const logger = require("../../utils/logger");
const router = express.Router();

const {
  syncListings,
  listListings,
  getListing,
  updateListing,
  fetchSubmissionStatus,
  MARKETPLACES,
  normalizeCountry,
} = require("./listingsEditorService");

// Stato sync in memoria (per evitare sync concorrenti sullo stesso country)
const syncState = {};

// ============================================================
// GET /api/v2/listings-editor/countries
// ============================================================
router.get("/countries", (req, res) => {
  res.json({ ok: true, countries: Object.keys(MARKETPLACES) });
});

// ============================================================
// POST /api/v2/listings-editor/sync?country=IT
// Avvia sync in background e risponde subito
// ============================================================
router.post("/sync", (req, res) => {
  const country = normalizeCountry(req.query.country || req.body?.country || "");
  if (!country || !MARKETPLACES[country]) {
    return res.status(400).json({ ok: false, error: "country non valido" });
  }

  if (syncState[country]?.running) {
    return res.json({
      ok: true,
      running: true,
      message: `Sync ${country} già in esecuzione`,
      startedAt: syncState[country].startedAt,
    });
  }

  syncState[country] = { running: true, startedAt: new Date().toISOString(), result: null, error: null };

  res.json({
    ok: true,
    running: true,
    message: `Sync ${country} avviato in background`,
    startedAt: syncState[country].startedAt,
  });

  // Esecuzione async
  setImmediate(async () => {
    try {
      const result = await syncListings(country);
      syncState[country] = {
        running: false,
        startedAt: syncState[country].startedAt,
        finishedAt: new Date().toISOString(),
        result,
        error: null,
      };
    } catch (err) {
      logger.error(`❌ Sync ${country} fallito:`, err.message);
      syncState[country] = {
        running: false,
        startedAt: syncState[country].startedAt,
        finishedAt: new Date().toISOString(),
        result: null,
        error: err.message,
      };
    }
  });
});

// ============================================================
// GET /api/v2/listings-editor/sync/status?country=IT
// ============================================================
router.get("/sync/status", (req, res) => {
  const country = normalizeCountry(req.query.country || "");
  if (!country || !MARKETPLACES[country]) {
    return res.status(400).json({ ok: false, error: "country non valido" });
  }
  res.json({ ok: true, state: syncState[country] || { running: false } });
});

// ============================================================
// GET /api/v2/listings-editor/list?country=IT&search=XXX&limit=200&offset=0
// ============================================================
router.get("/list", (req, res) => {
  try {
    const country = normalizeCountry(req.query.country || "");
    if (!country || !MARKETPLACES[country]) {
      return res.status(400).json({ ok: false, error: "country non valido" });
    }
    const search = req.query.search || "";
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const offset = Number(req.query.offset) || 0;

    const data = listListings({ country, search, limit, offset });
    res.json({ ok: true, ...data });
  } catch (err) {
    logger.error("❌ /list:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// GET /api/v2/listings-editor/item?sku=XXX&country=IT
// ============================================================
router.get("/item", (req, res) => {
  try {
    const country = normalizeCountry(req.query.country || "");
    const sku = req.query.sku;
    if (!sku || !country) {
      return res.status(400).json({ ok: false, error: "sku e country obbligatori" });
    }
    const row = getListing(sku, country);
    if (!row) return res.status(404).json({ ok: false, error: "Listing non in cache" });
    res.json({ ok: true, data: row });
  } catch (err) {
    logger.error("❌ /item:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// PATCH /api/v2/listings-editor/item?sku=XXX&country=IT
// Body: { title?, bullets?, description?, productType? }
// ============================================================
router.patch("/item", async (req, res) => {
  try {
    const country = normalizeCountry(req.query.country || "");
    const sku = req.query.sku;
    if (!sku || !country) {
      return res.status(400).json({ ok: false, error: "sku e country obbligatori" });
    }
    const result = await updateListing(sku, country, req.body || {});
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    logger.error("❌ PATCH /item:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// GET /api/v2/listings-editor/status?sku=XXX&country=IT
// ============================================================
router.get("/status", async (req, res) => {
  try {
    const country = normalizeCountry(req.query.country || "");
    const sku = req.query.sku;
    if (!sku || !country) {
      return res.status(400).json({ ok: false, error: "sku e country obbligatori" });
    }
    const result = await fetchSubmissionStatus(sku, country);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    logger.error("❌ GET /status:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
