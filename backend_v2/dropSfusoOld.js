const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "db", "inventario.db");
const db = new Database(dbPath);

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
  console.log("📋 Tabelle attuali:", tables.map(t => t.name));

  const exists = tables.some(t => t.name === "sfuso_old");
  if (exists) {
    db.exec("DROP TABLE sfuso_old;");
    console.log("✅ Tabella temporanea 'sfuso_old' eliminata");
  } else {
    console.log("ℹ️ Nessuna tabella sfuso_old trovata");
  }
} catch (err) {
  console.error("❌ Errore eliminazione sfuso_old:", err.message);
} finally {
  db.close();
}
