// backend_v2/modules/returns/returnsRoutes.js
const express = require("express");
const router = express.Router();
const {
  syncReturns,
  getReturns,
  getReturnReasons,
  getTopReturnedProducts,
} = require("./returnsService");

// POST /api/v2/returns/sync — importa resi da Amazon SP-API
router.post("/sync", async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const result = await syncReturns({ startDate, endDate });
    res.json(result);
  } catch (err) {
    console.error("❌ [Resi] Errore sync:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/returns — lista resi con filtri
router.get("/", (req, res) => {
  try {
    const { asin, reason, startDate, endDate, limit, offset } = req.query;
    const result = getReturns({
      asin,
      reason,
      startDate,
      endDate,
      limit: limit ? Number(limit) : 200,
      offset: offset ? Number(offset) : 0,
    });
    res.json(result);
  } catch (err) {
    console.error("❌ [Resi] Errore GET:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/returns/reasons — top motivi resi
router.get("/reasons", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const rows = getReturnReasons({ startDate, endDate });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/returns/top-products — prodotti più resi
router.get("/top-products", (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const rows = getTopReturnedProducts({
      startDate,
      endDate,
      limit: limit ? Number(limit) : 20,
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
