const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

let dbInstance = null;

function getDbPath() {
  return path.resolve("D:/inventario_database/inventario.db");
}

function openDb() {
  const dbFile = getDbPath();

  console.log("\n=========================================");
  console.log("📌 DATABASE APERTO DA QUESTO PERCORSO:");
  console.log(dbFile);
  console.log("=========================================\n");

  if (!fs.existsSync(dbFile)) {
    throw new Error(
      "❌ ERRORE: inventario.db NON trovato!\n" +
      "👉 Percorso richiesto: " + dbFile
    );
  }

  const db = new Database(dbFile, { fileMustExist: true });

  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  return db;
}

async function ensureDatabaseReady() {
  if (dbInstance) return dbInstance;

  const db = openDb();
  console.log("📂 Database locale caricato da:", getDbPath());

  dbInstance = db;
  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error("❌ Database non inizializzato!");
  }
  return dbInstance;
}

module.exports = { ensureDatabaseReady, getDb };
