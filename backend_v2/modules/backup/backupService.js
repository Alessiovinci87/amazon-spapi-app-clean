// backend_v2/modules/backup/backupService.js
// Backup automatico SQLite con rotazione — usa better-sqlite3 .backup() per copie a caldo sicure

const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const { getDb, getDbPath } = require("../../db/database");
const logger = require("../../utils/logger");

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(getDbPath()), "backups");
const BACKUP_DIR_SECONDARY = process.env.BACKUP_DIR_SECONDARY || "";
const MAX_BACKUPS = parseInt(process.env.BACKUP_MAX_KEEP, 10) || 7;
// Default: ogni 4 ore dalle 10:00 alle 22:00 (PC spento di notte)
const BACKUP_CRON = process.env.BACKUP_CRON || "0 10,14,18,22 * * *";
// Se ultimo backup più vecchio di queste ore, fai un backup all'avvio
const BACKUP_STARTUP_MAX_AGE_HOURS = parseInt(process.env.BACKUP_STARTUP_MAX_AGE_HOURS, 10) || 12;

let lastBackup = null;

function ensureBackupDir(dir = BACKUP_DIR) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Copia l'ultimo backup nella directory secondaria (se configurata)
 * e applica la rotazione su di essa.
 */
function mirrorToSecondary(sourcePath, filename) {
  if (!BACKUP_DIR_SECONDARY) return;
  try {
    ensureBackupDir(BACKUP_DIR_SECONDARY);
    const destPath = path.join(BACKUP_DIR_SECONDARY, filename);
    fs.copyFileSync(sourcePath, destPath);
    logger.info(`🪞 Backup copiato su secondario: ${destPath}`);
    rotateBackupsInDir(BACKUP_DIR_SECONDARY);
  } catch (err) {
    logger.error(`❌ Errore copia backup secondario (${BACKUP_DIR_SECONDARY}):`, err.message);
  }
}

function rotateBackupsInDir(dir) {
  ensureBackupDir(dir);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("inventario_") && f.endsWith(".db"))
    .map((f) => ({
      name: f,
      path: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length > MAX_BACKUPS) {
    for (const f of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(f.path);
      logger.info(`🗑️  Backup rimosso (rotazione, ${dir}): ${f.name}`);
    }
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

  logger.info(`💾 Backup ${tag} completato: ${filename} (${sizeMB} MB)`);

  rotateBackups();
  mirrorToSecondary(destPath, filename);

  return lastBackup;
}

/**
 * Rimuove i backup più vecchi dalla directory primaria.
 */
function rotateBackups() {
  rotateBackupsInDir(BACKUP_DIR);
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
 * Ritorna il timestamp (ms) dell'ultimo backup sul filesystem, o null se nessuno.
 */
function getLastBackupMtime() {
  ensureBackupDir();
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("inventario_") && f.endsWith(".db"))
    .map((f) => fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs);
  return files.length ? Math.max(...files) : null;
}

/**
 * Avvia il cron job e fa un backup all'avvio se l'ultimo è troppo vecchio.
 */
function startBackupCron() {
  logger.info(`⏰ Backup cron schedulato: "${BACKUP_CRON}" (mantiene ultimi ${MAX_BACKUPS})`);
  logger.info(`📁 Directory backup: ${BACKUP_DIR}`);
  if (BACKUP_DIR_SECONDARY) {
    logger.info(`🪞 Directory backup secondaria: ${BACKUP_DIR_SECONDARY}`);
  }

  // Backup all'avvio se l'ultimo è più vecchio di BACKUP_STARTUP_MAX_AGE_HOURS
  const lastMtime = getLastBackupMtime();
  const ageHours = lastMtime ? (Date.now() - lastMtime) / (1000 * 60 * 60) : Infinity;
  if (ageHours >= BACKUP_STARTUP_MAX_AGE_HOURS) {
    const reason = lastMtime
      ? `ultimo backup ${ageHours.toFixed(1)}h fa`
      : "nessun backup esistente";
    logger.info(`🔄 Backup all'avvio (${reason})…`);
    runBackup(false).catch((err) =>
      logger.error("❌ Errore backup all'avvio:", err.message)
    );
  } else {
    logger.info(`✔️  Ultimo backup ${ageHours.toFixed(1)}h fa, nessun backup all'avvio necessario`);
  }

  cron.schedule(BACKUP_CRON, async () => {
    try {
      await runBackup(false);
    } catch (err) {
      logger.error("❌ Errore backup automatico:", err.message);
    }
  });
}

function getLastBackup() {
  return lastBackup;
}

module.exports = { runBackup, listBackups, startBackupCron, getLastBackup, BACKUP_DIR };
