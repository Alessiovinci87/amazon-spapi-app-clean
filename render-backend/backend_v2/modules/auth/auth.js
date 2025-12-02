const express = require("express");
const router = express.Router();
const { getAccessToken } = require("./authService");

// GET /api/v2/auth/token → genera un nuovo access_token
router.get("/token", async (_req, res) => {
  try {
    const tokenData = await getAccessToken();
    res.json(tokenData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
