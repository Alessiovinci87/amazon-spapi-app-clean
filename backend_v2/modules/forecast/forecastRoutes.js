// backend_v2/modules/forecast/forecastRoutes.js
const express = require("express");
const router = express.Router();
const logger = require("../../utils/logger");
const { forecastStock } = require("./forecastService");

/**
 * GET /api/v2/forecast/stock?windowDays=30&leadTimeDays=14&country=IT&minDaysLeft=30
 * Ritorna la previsione per tutti gli ASIN con stock o inbound.
 */
router.get("/stock", (req, res) => {
  try {
    const windowDays = Math.max(1, Math.min(180, parseInt(req.query.windowDays) || 30));
    const leadTimeDays = Math.max(0, Math.min(120, parseInt(req.query.leadTimeDays) || 14));
    const country = req.query.country ? String(req.query.country).toUpperCase() : null;
    const minDaysLeft = req.query.minDaysLeft ? Number(req.query.minDaysLeft) : null;

    const items = forecastStock({ windowDays, leadTimeDays, country, minDaysLeft });
    res.json({ ok: true, params: { windowDays, leadTimeDays, country, minDaysLeft }, total: items.length, items });
  } catch (e) {
    logger.error({ err: e }, "Errore GET /forecast/stock");
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
