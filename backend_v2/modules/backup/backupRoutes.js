// backend_v2/modules/backup/backupRoutes.js
// Endpoint per backup manuale e stato backup

const express = require("express");
const router = express.Router();
const { runBackup, listBackups, getLastBackup, BACKUP_DIR } = require("./backupService");

// POST /api/v2/backup — esegue backup manuale
router.post("/", async (_req, res) => {
  try {
    const result = await runBackup(true);
    res.json({ ok: true, backup: result });
  } catch (err) {
    console.error("❌ Errore backup manuale:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/backup — lista backup + stato ultimo
router.get("/", (_req, res) => {
  try {
    const backups = listBackups();
    res.json({
      ok: true,
      backupDir: BACKUP_DIR,
      lastBackup: getLastBackup(),
      count: backups.length,
      backups,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
