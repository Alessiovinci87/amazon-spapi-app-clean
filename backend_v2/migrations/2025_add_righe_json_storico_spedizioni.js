// migrations/2025_add_righe_json_storico_spedizioni.js
const { ensureDatabaseReady, getDb } = require("../db/database");

function migrate() {
  console.log("\n=== MIGRATION: Add righe_json to storico_spedizioni ===\n");

  ensureDatabaseReady();
  const db = getDb();

  db.prepare(`
    ALTER TABLE storico_spedizioni
    ADD COLUMN righe_json TEXT;
  `).run();

  console.log("✅ Colonna righe_json aggiunta con successo!");
}

migrate();
