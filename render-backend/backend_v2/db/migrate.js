const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    executed_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;

function runMigrations(dbPath) {
  const db = new Database(dbPath);

  db.exec(MIGRATIONS_TABLE);

  const migrationsDir = path.join(__dirname, "migrations");

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const migrationName = file;

    const exists = db.prepare("SELECT 1 FROM _migrations WHERE name = ?").get(migrationName);
    if (exists) {
      console.log(`⏩ Migrazione già applicata: ${migrationName}`);
      continue;
    }

    console.log(`🚀 Applicazione migrazione: ${migrationName}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec(sql);

    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(migrationName);
    console.log(`✅ Migrazione completata: ${migrationName}`);
  }

  console.log("💾 Tutte le migrazioni sono aggiornate.");
  db.close();
}

module.exports = { runMigrations };
