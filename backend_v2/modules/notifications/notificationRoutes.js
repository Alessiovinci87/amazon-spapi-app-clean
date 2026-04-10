// backend_v2/modules/notifications/notificationRoutes.js
// Endpoint per gestione notifiche email: test, invio manuale, stato

const express = require("express");
const router = express.Router();
const { verifySmtp, isEmailConfigured } = require("./emailService");
const { sendAlertDigest, getAlertSummary } = require("./alertDigest");

// GET /api/v2/notifications/status — stato configurazione email
router.get("/status", async (_req, res) => {
  const configured = isEmailConfigured();
  const digestTo = process.env.ALERT_DIGEST_TO || null;
  const digestCron = process.env.ALERT_DIGEST_CRON || "0 7 * * *";

  let smtp = { ok: false, message: "Non configurato" };
  if (configured) {
    smtp = await verifySmtp();
  }

  const summary = getAlertSummary();

  res.json({
    ok: true,
    email: {
      configured,
      smtp,
      digestTo,
      digestCron,
    },
    alerts: {
      total: summary.total,
      categorie: Object.keys(summary.grouped).length,
    },
  });
});

// POST /api/v2/notifications/test-digest — invia digest manualmente (per test)
router.post("/test-digest", async (_req, res) => {
  try {
    const result = await sendAlertDigest();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/v2/notifications/preview-digest — anteprima HTML del digest
router.get("/preview-digest", (_req, res) => {
  const { buildDigestHtml } = require("./alertDigest");
  const summary = getAlertSummary();

  if (summary.total === 0) {
    return res.send("<html><body style='background:#0f172a;color:#94a3b8;padding:40px;font-family:sans-serif;text-align:center;'><h2>Nessun alert aperto</h2><p>Il digest non verrebbe inviato.</p></body></html>");
  }

  const html = buildDigestHtml(summary);
  res.type("html").send(html);
});

module.exports = router;
