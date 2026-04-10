// backend_v2/modules/backup/backupService.js
// Backup automatico SQLite con rotazione — usa better-sqlite3 .backup() per copie a caldo sicure

const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const { getDb, getDbPath } = require("../../db/database");

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(getDbPath()), "backups");
const MAX_BACKUPS = parseInt(process.env.BACKUP_MAX_KEEP, 10) || 7;
const BACKUP_CRON = process.env.BACKUP_CRON || "0 2 * * *"; // ogni notte alle 02:00

let lastBackup = null;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Esegue un backup del database SQLite.
 * Usa il metodo .backup() di better-sqlite3 (online backup API di SQLite).
 * Ritorna il path del file di backup creato.
 */
async function runBackup(manual = false) {
  ensureBackupDir();

  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const tag = manual ? "manual" : "auto";
  const filename = `inventario_${tag}_${ts}.db`;
  const destPath = path.join(BACKUP_DIR, filename);

  const db = getDb();
  await db.backup(destPath);

  const stats = fs.statSync(destPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  lastBackup = {
    file: filename,
    path: destPath,
    sizeMB: parseFloat(sizeMB),
    timestamp: now.toISOString(),
    type: tag,
  };

  console.log(`💾 Backup ${tag} completato: ${filename} (${sizeMB} MB)`);

  rotateBackups();

  return lastBackup;
}

/**
 * Rimuove i backup più vecchi, mantiene solo MAX_BACKUPS file.
 */
function rotateBackups() {
  ensureBackupDir();

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("inventario_") && f.endsWith(".db"))
    .map((f) => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime); // più recenti prima

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    for (const f of toDelete) {
      fs.unlinkSync(f.path);
      console.log(`🗑️  Backup rimosso (rotazione): ${f.name}`);
    }
  }
}

/**
 * Ritorna la lista dei backup esistenti.
 */
function listBackups() {
  ensureBackupDir();

  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("inventario_") && f.endsWith(".db"))
    .map((f) => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        file: f,
        sizeMB: parseFloat((stats.size / (1024 * 1024)).toFixed(2)),
        created: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.created) - new Date(a.created));
}

/**
 * Avvia il cron job per backup notturno.
 */
function startBackupCron() {
  console.log(`⏰ Backup cron schedulato: "${BACKUP_CRON}" (mantiene ultimi ${MAX_BACKUPS})`);
  console.log(`📁 Directory backup: ${BACKUP_DIR}`);

  cron.schedule(BACKUP_CRON, async () => {
    try {
      await runBackup(false);
    } catch (err) {
      console.error("❌ Errore backup automatico:", err.message);
    }
  });
}

function getLastBackup() {
  return lastBackup;
}

module.exports = { runBackup, listBackups, startBackupCron, getLastBackup, BACKUP_DIR };
