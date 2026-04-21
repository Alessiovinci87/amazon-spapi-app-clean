// backend_v2/modules/notifications/emailService.js
// Servizio email con Nodemailer — supporta SMTP generico (Gmail, Outlook, custom)

const nodemailer = require("nodemailer");
const logger = require("../../utils/logger");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn("Email non configurata — imposta SMTP_HOST, SMTP_USER, SMTP_PASS nel .env");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

/**
 * Invia un'email.
 * @param {object} opts - { to, subject, html, text }
 * @returns {Promise<object|null>} info se inviata, null se email non configurata
 */
async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) return null;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const info = await t.sendMail({ from, to, subject, html, text });
  logger.info(`Email inviata a ${to}: ${info.messageId}`);
  return info;
}

/**
 * Verifica che la configurazione SMTP funzioni.
 */
async function verifySmtp() {
  const t = getTransporter();
  if (!t) return { ok: false, message: "SMTP non configurato" };
  try {
    await t.verify();
    return { ok: true, message: "Connessione SMTP verificata" };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

module.exports = { sendEmail, verifySmtp, isEmailConfigured };
