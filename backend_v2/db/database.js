// backend_v2/db/database.js
// Gestione centralizzata DB (better-sqlite3) con percorso fisso esterno

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

let dbInstance = null;

/**
 * Percorso fisso esterno del database.
 * 🔒 NON verrà mai toccato dai commit Git.
 * 🛡️ Previene completamente la corruzione o sovrascrittura del DB.
 */
function getDbPath() {
  // Percorso assoluto del tuo HDD esterno
  return "D:/inventario_database/inventario.db";
  // In alternativa:
  // return "D:\\inventario_database\\inventario.db";
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

  console.log("📄 Esiste il file DB?", fs.existsSync(dbFile));

  if (!fs.existsSync(dbFile)) {
    throw new Error(
      "❌ inventario.db NON trovato nel percorso esterno.\n" +
      "   Copialo in: " + dbFile
    );
  }

  // Apertura obbligatoria: niente DB vuoto
  const db = new Database(dbFile, { fileMustExist: true });

  // PRAGMA sicuri
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  const mode = db.pragma("journal_mode", { simple: true });
  console.log(`🧩 PRAGMA impostate correttamente (journal_mode=${mode}).`);

  return db;
}

/**
 * Non applichiamo schema.sql automaticamente — il DB ESTERNO è già completo.
 */
async function ensureDatabaseReady() {
  if (dbInstance) return dbInstance;

  const db = openDb();
  console.log("📂 Database caricato da:", getDbPath());

  dbInstance = db;
  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error("❌ Database non inizializzato. Chiama ensureDatabaseReady() prima.");
  }
  return dbInstance;
}

module.exports = { ensureDatabaseReady, getDb };
