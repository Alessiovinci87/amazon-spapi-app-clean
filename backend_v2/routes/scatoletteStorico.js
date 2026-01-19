const express = require("express");
const router = express.Router();
const { getStoricoScatolette } = require("../services/scatoletteStorico.service");

router.get("/", (req, res) => {
  try {
    const data = getStoricoScatolette();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
