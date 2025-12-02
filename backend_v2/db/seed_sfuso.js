const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "inventario.db");
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS sfuso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_prodotto TEXT,
  formato TEXT,
  fornitore TEXT,
  lotto TEXT,
  lotto_old TEXT,
  litri_disponibili REAL DEFAULT 0,
  litri_disponibili_old REAL DEFAULT 0,
  quantita_in_arrivo REAL DEFAULT 0,
  stato TEXT DEFAULT 'attivo',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

const insert = db.prepare(`
INSERT INTO sfuso (nome_prodotto, formato, fornitore, lotto, litri_disponibili, litri_disponibili_old)
VALUES (@nome_prodotto, @formato, @fornitore, @lotto, @litri_disponibili, @litri_disponibili_old)
`);

const dati = [
  {
    nome_prodotto: "Hair Protection",
    formato: "12ml",
    fornitore: "Supplier A",
    lotto: "HP-12-2025-001",
    litri_disponibili: 5.0,
    litri_disponibili_old: 1.0,
  },
  {
    nome_prodotto: "Hair Protection",
    formato: "100ml",
    fornitore: "Supplier A",
    lotto: "HP-100-2025-001",
    litri_disponibili: 8.0,
    litri_disponibili_old: 0.5,
  },
];

const tx = db.transaction(() => dati.forEach((r) => insert.run(r)));
tx();

console.log("✅ Tabella sfuso popolata con lotti di test");
db.close();
