const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "db", "inventario.db");
const db = new Database(dbPath);

try {
  console.log("🚧 Inizio aggiornamento tabella sfuso...");

  // 🔹 Recupera colonne esistenti
  const columnsInfo = db.prepare("PRAGMA table_info(sfuso);").all();
  const columns = columnsInfo.map((c) => c.name);
  console.log("📋 Colonne esistenti:", columns);

  // 🔹 Rinominare tabella originale
  db.exec("ALTER TABLE sfuso RENAME TO sfuso_old;");

  // 🔹 Ricrea tabella con vincolo aggiornato
  db.exec(`
    CREATE TABLE sfuso (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_prodotto TEXT,
      formato TEXT CHECK (formato IN ('10ml','12ml','100ml')),
      asin_collegati TEXT DEFAULT '[]',
      fornitore TEXT,
      lotto TEXT,
      lotto_old TEXT,
      litri_disponibili REAL DEFAULT 0,
      litri_disponibili_old REAL DEFAULT 0,
      stato TEXT DEFAULT 'attivo',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 🔹 Colonne da copiare (solo quelle esistenti nella vecchia tabella)
  const validColumns = [
    "id",
    "nome_prodotto",
    "formato",
    "asin_collegati",
    "fornitore",
    "lotto",
    "lotto_old",
    "litri_disponibili",
    "litri_disponibili_old",
    "stato",
    "created_at",
    "updated_at",
  ].filter((col) => columns.includes(col));

  const colsString = validColumns.join(", ");
  console.log("✅ Copio colonne:", colsString);

  db.exec(`
    INSERT INTO sfuso (${colsString})
    SELECT ${colsString} FROM sfuso_old;
  `);

  db.exec("DROP TABLE sfuso_old;");
  console.log("✅ Tabella sfuso aggiornata con vincolo ('10ml','12ml','100ml')");
} catch (err) {
  console.error("❌ Errore aggiornamento tabella sfuso:", err.message);
} finally {
  db.close();
}
