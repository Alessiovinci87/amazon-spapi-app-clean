const Database = require("better-sqlite3");
const db = new Database("./db/inventario.db");

try {
  db.prepare(`
    ALTER TABLE storico_sfuso
    ADD COLUMN evento TEXT DEFAULT NULL
  `).run();

  console.log("✅ Colonna 'evento' aggiunta a storico_sfuso");
} catch (err) {
  console.log("⚠️ La colonna 'evento' esiste già o errore:", err.message);
}
