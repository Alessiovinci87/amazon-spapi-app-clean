const express = require("express");
const router = express.Router();
const { getAccessToken } = require("../auth/authService");
const { getAmazonInventory } = require("./inventoryAmazonService");

// GET /api/v2/inventory-amazon/:sku
router.get("/:sku", async (req, res) => {
  try {
    const { sku } = req.params;

    // 1) Otteniamo un access_token nuovo
    const tokenData = await getAccessToken();

    // 2) Chiamiamo Amazon
    const result = await getAmazonInventory(sku, tokenData.access_token);

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
