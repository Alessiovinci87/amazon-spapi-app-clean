// backend_v2/modules/notifications/alertDigest.js
// Genera e invia il digest giornaliero degli alert aperti via email

const cron = require("node-cron");
const { getDb } = require("../../db/database");
const { sendEmail, isEmailConfigured } = require("./emailService");

const DIGEST_CRON = process.env.ALERT_DIGEST_CRON || "0 7 * * *"; // ogni mattina alle 07:00
const DIGEST_TO = process.env.ALERT_DIGEST_TO || "";

/**
 * Raccoglie tutti gli alert non letti raggruppati per source/tipo.
 */
function getAlertSummary() {
  const db = getDb();

  const alerts = db.prepare(`
    SELECT id, asin, tipo, source, messaggio, nome, created_at
    FROM alert_events
    WHERE letto = 0
    ORDER BY created_at DESC
  `).all();

  // Raggruppa per tipo
  const grouped = {};
  for (const a of alerts) {
    const key = a.tipo || "ALTRO";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }

  return { alerts, grouped, total: alerts.length };
}

/**
 * Genera HTML del digest.
 */
function buildDigestHtml({ grouped, total }) {
  if (total === 0) return null; // niente da inviare

  const tipoLabels = {
    STOCK_LOW: "Stock sotto soglia",
    SFUSO_INSUFFICIENTE: "Sfuso insufficiente",
    LOTTO_IN_SCADENZA: "Lotti in scadenza",
    LOTTO_SCADUTO: "Lotti scaduti",
    PRICE_DROP: "Calo prezzo",
    BUYBOX_LOST: "BuyBox persa",
    LISTING_SUPPRESSED: "Listing soppressi",
  };

  const colorMap = {
    STOCK_LOW: "#f59e0b",
    SFUSO_INSUFFICIENTE: "#f59e0b",
    LOTTO_IN_SCADENZA: "#f97316",
    LOTTO_SCADUTO: "#ef4444",
    PRICE_DROP: "#ef4444",
    BUYBOX_LOST: "#ef4444",
    LISTING_SUPPRESSED: "#ef4444",
  };

  let sections = "";
  for (const [tipo, alerts] of Object.entries(grouped)) {
    const label = tipoLabels[tipo] || tipo;
    const color = colorMap[tipo] || "#6b7280";

    let rows = "";
    for (const a of alerts.slice(0, 20)) { // max 20 per tipo
      const data = new Date(a.created_at).toLocaleDateString("it-IT", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
      rows += `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 8px 12px; color: #e2e8f0; font-size: 13px;">${a.nome || a.asin}</td>
          <td style="padding: 8px 12px; color: #94a3b8; font-size: 13px;">${a.messaggio || "—"}</td>
          <td style="padding: 8px 12px; color: #64748b; font-size: 12px; white-space: nowrap;">${data}</td>
        </tr>`;
    }
    if (alerts.length > 20) {
      rows += `<tr><td colspan="3" style="padding: 8px 12px; color: #64748b; font-size: 12px;">…e altri ${alerts.length - 20} alert</td></tr>`;
    }

    sections += `
      <div style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
          <span style="font-size: 14px; font-weight: 600; color: #f1f5f9;">${label}</span>
          <span style="font-size: 12px; color: #64748b; margin-left: 4px;">(${alerts.length})</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: #0f172a;">
              <th style="padding: 8px 12px; text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Prodotto</th>
              <th style="padding: 8px 12px; text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Dettaglio</th>
              <th style="padding: 8px 12px; text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Data</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const oggi = new Date().toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">

    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 18px; font-weight: 600; color: #f1f5f9; letter-spacing: -0.025em;">Nexus</div>
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-top: 4px;">Alert Digest</div>
    </div>

    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 13px; color: #94a3b8;">${oggi}</div>
      <div style="font-size: 24px; font-weight: 600; color: #f1f5f9; margin-top: 4px;">
        ${total} alert ${total === 1 ? "aperto" : "aperti"}
      </div>
      <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
        ${Object.keys(grouped).length} ${Object.keys(grouped).length === 1 ? "categoria" : "categorie"}
      </div>
    </div>

    ${sections}

    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #334155;">
      <div style="font-size: 11px; color: #475569;">
        Nexus Operations Platform &middot; Digest automatico
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Invia il digest giornaliero.
 */
async function sendAlertDigest() {
  if (!isEmailConfigured()) {
    console.log("📧 [AlertDigest] Email non configurata, skip.");
    return { sent: false, reason: "smtp_not_configured" };
  }

  const to = DIGEST_TO;
  if (!to) {
    console.log("📧 [AlertDigest] Nessun destinatario (ALERT_DIGEST_TO), skip.");
    return { sent: false, reason: "no_recipient" };
  }

  const summary = getAlertSummary();
  if (summary.total === 0) {
    console.log("📧 [AlertDigest] Nessun alert aperto, niente da inviare.");
    return { sent: false, reason: "no_alerts", total: 0 };
  }

  const html = buildDigestHtml(summary);
  const subject = `[Nexus] ${summary.total} alert aperti — ${new Date().toLocaleDateString("it-IT")}`;

  try {
    await sendEmail({ to, subject, html });
    console.log(`📧 [AlertDigest] Digest inviato a ${to} — ${summary.total} alert.`);
    return { sent: true, total: summary.total, to };
  } catch (err) {
    console.error("❌ [AlertDigest] Errore invio:", err.message);
    return { sent: false, reason: "send_error", error: err.message };
  }
}

/**
 * Avvia il cron job per il digest giornaliero.
 */
function startDigestCron() {
  if (!isEmailConfigured()) {
    console.log("📧 [AlertDigest] SMTP non configurato — cron digest non avviato.");
    return;
  }
  if (!DIGEST_TO) {
    console.log("📧 [AlertDigest] ALERT_DIGEST_TO non impostato — cron digest non avviato.");
    return;
  }

  console.log(`📧 [AlertDigest] Cron schedulato: "${DIGEST_CRON}" → ${DIGEST_TO}`);
  cron.schedule(DIGEST_CRON, async () => {
    try {
      await sendAlertDigest();
    } catch (err) {
      console.error("❌ [AlertDigest] Errore cron:", err.message);
    }
  });
}

module.exports = { sendAlertDigest, startDigestCron, getAlertSummary, buildDigestHtml };
