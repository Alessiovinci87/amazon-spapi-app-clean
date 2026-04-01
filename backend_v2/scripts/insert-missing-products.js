// insert-missing-products.js
// Esegui con: node insert-missing-products.js "Report+dell'inventario_01-19-2026.txt"

const fs = require("fs");
const Database = require("better-sqlite3");

// Percorso database
const DB_PATH = "D:/inventario_database/inventario.db";

// Percorso CSV
const CSV_PATH = process.argv[2] || "./Report_dell_inventario.csv";

console.log("🚀 Inserimento prodotti mancanti da CSV Amazon");
console.log(`📂 Database: ${DB_PATH}`);
console.log(`📄 CSV: ${CSV_PATH}`);

// Verifica esistenza file
if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ File non trovato: ${CSV_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ Database non trovato: ${DB_PATH}`);
  process.exit(1);
}

// Leggi CSV
const content = fs.readFileSync(CSV_PATH, "utf-8");
const lines = content.split(/\r?\n/).filter((l) => l.trim());

console.log(`📋 Righe nel CSV: ${lines.length - 1}`);

// Apri database
const db = new Database(DB_PATH);

// Prepara statements
const checkStmt = db.prepare(`SELECT id FROM prodotti WHERE asin = ?`);

const insertStmt = db.prepare(`
  INSERT INTO prodotti (asin, sku, nome, pronto, pezzi_per_kit, sfusoLitri, isKit, isAccessorio, pezziPerKit)
  VALUES (?, ?, ?, 0, 1, 0, 0, 0, 0)
`);

// Statistiche
let inserted = 0;
let skipped = 0;
let errors = 0;

// Processa righe (salta header)
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split("\t");
  const sku = cols[0]?.trim();
  const asin = cols[1]?.trim();

  if (!asin) {
    skipped++;
    continue;
  }

  try {
    // Verifica se esiste già nel DB
    const existing = checkStmt.get(asin);

    if (existing) {
      // Già presente, salta
      skipped++;
      continue;
    }

    // Nome placeholder (da aggiornare poi)
    const nome = `Prodotto ${asin}`;

    // Inserisci nuovo prodotto
    insertStmt.run(asin, sku || "", nome);
    console.log(`✅ Inserito: ${asin} (SKU: ${sku || "N/A"})`);
    inserted++;

  } catch (err) {
    console.error(`❌ Errore per ${asin}: ${err.message}`);
    errors++;
  }
}

// Chiudi database
db.close();

// Riepilogo
console.log("\n========================================");
console.log("📊 RIEPILOGO INSERIMENTO PRODOTTI");
console.log("========================================");
console.log(`✅ Inseriti:      ${inserted}`);
console.log(`⏭️ Già presenti:  ${skipped}`);
console.log(`❌ Errori:        ${errors}`);
console.log(`📋 Totale righe:  ${lines.length - 1}`);
console.log("========================================");

if (inserted > 0) {
  console.log("\n⚠️ NOTA: I prodotti inseriti hanno un nome placeholder.");
  console.log("   Puoi aggiornare i nomi manualmente o con uno script di sync.");
}