const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "db", "inventario.db");
const db = new Database(dbPath);

try {
  db.prepare("ALTER TABLE sfuso ADD COLUMN asin_collegati TEXT DEFAULT '[]'").run();
  console.log("✅ Colonna asin_collegati aggiunta con successo alla tabella sfuso");
} catch (err) {
  if (err.message.includes("duplicate column name")) {
    console.log("ℹ️ Colonna asin_collegati già presente, nessuna modifica necessaria");
  } else {
    console.error("❌ Errore durante l'aggiunta della colonna:", err.message);
  }
}

db.close();
