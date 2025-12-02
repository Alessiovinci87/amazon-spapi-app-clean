// backend_v2/db/database.js
// Gestione centralizzata DB (better-sqlite3) con percorso fisso esterno

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

let dbInstance = null;

/**
 * Percorso fisso del database esterno.
 * 🔒 NON viene incluso nei commit Git
 * 🛡️ NON può essere sovrascritto
 * 🚀 Garantisce stabilità totale del gestionale
 */
function getDbPath() {
  // Usa SEMPRE il DB esterno
  return path.resolve("D:/inventario_database/inventario.db");
}

/**
 * Apertura sicura del database
 */
function openDb() {
  const dbFile = getDbPath();

  console.log("\n=========================================");
  console.log("📌 DATABASE APERTO DA QUESTO PERCORSO:");
  console.log(dbFile);
  console.log("=========================================\n");

  // Controllo esistenza file
  if (!fs.existsSync(dbFile)) {
    throw new Error(
      "❌ ERRORE: inventario.db NON trovato!\n" +
      "👉 Percorso richiesto: " + dbFile + "\n" +
      "💡 Copia qui il DB prima di avviare il backend."
    );
  }

  // Apertura database — obbligo di file esistente
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
 * Inizializzazione — NO schema.sql
 * Il DB esterno è già completo e NON deve essere modificato.
 */
async function ensureDatabaseReady() {
  if (dbInstance) return dbInstance;

  const db = openDb();
  console.log("📂 Database caricato correttamente da:", getDbPath());

  dbInstance = db;
  return dbInstance;
}

/**
 * Ottieni istanza DB già aperta
 */
function getDb() {
  if (!dbInstance) {
    throw new Error(
      "❌ ERRORE: Database non inizializzato!\n" +
      "👉 Chiama prima ensureDatabaseReady()."
    );
  }
  return dbInstance;
}

module.exports = { ensureDatabaseReady, getDb };
