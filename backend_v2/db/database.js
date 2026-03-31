// backend_v2/db/database.js
// Gestione centralizzata DB (better-sqlite3) — percorso configurato via env DB_PATH

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { hashPassword } = require("../utils/password");

let dbInstance = null;

/**
 * Legge il percorso del database da DB_PATH nell'ambiente.
 * Fallback al percorso locale di sviluppo se non configurato.
 */
function getDbPath() {
  return process.env.DB_PATH || path.join(__dirname, "inventario.db");
}

/**
 * Apertura database con controlli di sicurezza
 */
function openDb() {
  const dbFile = getDbPath();

  console.log("\n=========================================");
  console.log("📌 DATABASE APERTO DA QUESTO PERCORSO:");
  console.log(path.resolve(dbFile));
  console.log("=========================================\n");

  if (!fs.existsSync(dbFile)) {
    throw new Error(
      "❌ Database non trovato nel percorso configurato.\n" +
      "   Percorso atteso: " + dbFile + "\n" +
      "   Controlla la variabile DB_PATH nel file .env"
    );
  }

  const db = new Database(dbFile, { fileMustExist: true });

  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  const mode = db.pragma("journal_mode", { simple: true });
  console.log(`🧩 PRAGMA impostate correttamente (journal_mode=${mode}).`);

  return db;
}

/**
 * Verifica se la tabella impostazioni esiste e ha la password admin.
 * Se non esiste o la password non è stata impostata, inserisce il valore di default.
 */
function seedPasswordAdmin(db) {
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='impostazioni'")
    .get();

  if (!tableExists) return;

  const existing = db.prepare("SELECT 1 FROM impostazioni WHERE chiave = 'admin_password'").get();
  if (existing) return;

  const defaultPassword = process.env.ADMIN_PASSWORD_DEFAULT || "1234";
  const hash = hashPassword(defaultPassword);

  db.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('admin_password', ?)").run(hash);
  console.log("🔐 Password admin inizializzata nel DB dall'env ADMIN_PASSWORD_DEFAULT.");
}

/**
 * Inizializza il database e fa il seed della password admin se necessario.
 */
async function ensureDatabaseReady() {
  if (dbInstance) return dbInstance;

  const db = openDb();
  console.log("📂 Database caricato da:", getDbPath());

  dbInstance = db;

  seedPasswordAdmin(db);

  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error("❌ Database non inizializzato. Chiama ensureDatabaseReady() prima.");
  }
  return dbInstance;
}

module.exports = { ensureDatabaseReady, getDb, getDbPath };
