const { ensureDatabaseReady, getDb } = require("../db/database");

async function migrate() {
  await ensureDatabaseReady();  // 🔥 inizializza DB correttamente
  const db = getDb();

  console.log("➡ Aggiungo colonna tipo_evento a storico_spedizioni...");

  db.prepare(`
    ALTER TABLE storico_spedizioni
    ADD COLUMN tipo_evento TEXT DEFAULT 'CREATA'
  `).run();

  console.log("✅ Migrazione completata!");
}

migrate();
