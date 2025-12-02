const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "inventario.db");
const db = new Database(dbPath);

console.log("🔧 Migrazione FK produzioni_sfuso → ON UPDATE/DELETE CASCADE…");

try {
  db.exec("PRAGMA foreign_keys = OFF");

  // 1. Creazione nuova tabella con FK corretto
  db.exec(`
    CREATE TABLE produzioni_sfuso_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_sfuso INTEGER NOT NULL,
      asin_prodotto TEXT,
      nome_prodotto TEXT,
      formato TEXT,
      stato TEXT DEFAULT 'Pianificata',
      note TEXT,
      prodotti INTEGER DEFAULT 0,
      data_creazione TEXT DEFAULT (datetime('now')),
      data_inizio TEXT,
      data_fine TEXT,
      gruppo_fifo TEXT,
      operatore TEXT DEFAULT 'system',
      quantita INTEGER DEFAULT 0,
      quantita_iniziale INTEGER DEFAULT 0,
      quantita_finale INTEGER DEFAULT 0,
      litri_usati REAL DEFAULT 0,
      data_effettiva TEXT,
      quantita_finale_old INTEGER DEFAULT 0,
      litri_usati_old REAL DEFAULT 0,
      FOREIGN KEY(id_sfuso)
        REFERENCES sfuso(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    );
  `);

  console.log("📥 Copio i dati dalla tabella originale…");
  db.exec(`
    INSERT INTO produzioni_sfuso_new
    (id, id_sfuso, asin_prodotto, nome_prodotto, formato, stato, note,
     prodotti, data_creazione, data_inizio, data_fine, gruppo_fifo,
     operatore, quantita, quantita_iniziale, quantita_finale,
     litri_usati, data_effettiva, quantita_finale_old, litri_usati_old)
    SELECT id, id_sfuso, asin_prodotto, nome_prodotto, formato, stato, note,
           prodotti, data_creazione, data_inizio, data_fine, gruppo_fifo,
           operatore, quantita, quantita_iniziale, quantita_finale,
           litri_usati, data_effettiva, quantita_finale_old, litri_usati_old
    FROM produzioni_sfuso;
  `);

  console.log("🗑 Elimino la vecchia tabella produziomi_sfuso…");
  db.exec(`DROP TABLE produzioni_sfuso;`);

  console.log("📝 Rinomino la tabella nuova → produzioni_sfuso…");
  db.exec(`
    ALTER TABLE produzioni_sfuso_new
    RENAME TO produzioni_sfuso;
  `);

  db.exec("PRAGMA foreign_keys = ON");

  console.log("✅ Migrazione completata con successo! FK aggiornata.");
} catch (err) {
  console.error("❌ Errore durante la migrazione:", err);
} finally {
  db.close();
}
