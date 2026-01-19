// import-sku.js
// Esegui con: node import-sku.js percorso/al/file.csv

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Percorso database (modifica se necessario)
const DB_PATH = "D:/inventario_database/inventario.db";

// Percorso CSV (prende dal primo argomento o usa il default)
const CSV_PATH = process.argv[2] || "./Report_dell_inventario.csv";

console.log("🚀 Import SKU da CSV Amazon");
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

// Prima riga = header
const header = lines[0].split("\t");
const skuIndex = header.findIndex((h) => h.toLowerCase() === "sku");
const asinIndex = header.findIndex((h) => h.toLowerCase() === "asin");

if (skuIndex === -1 || asinIndex === -1) {
  console.error("❌ Colonne 'sku' o 'asin' non trovate nell'header");
  console.log("Header trovato:", header);
  process.exit(1);
}

console.log(`✅ Colonne trovate: sku=${skuIndex}, asin=${asinIndex}`);

// Apri database
const db = new Database(DB_PATH);

// Prepara statement
const updateStmt = db.prepare(`
  UPDATE prodotti 
  SET sku = ? 
  WHERE asin = ?
`);

const checkStmt = db.prepare(`
  SELECT id, asin, nome, sku FROM prodotti WHERE asin = ?
`);

// Statistiche
let updated = 0;
let notFound = 0;
let skipped = 0;
let errors = 0;

// Processa righe (salta header)
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split("\t");
  const sku = cols[skuIndex]?.trim();
  const asin = cols[asinIndex]?.trim();

  if (!sku || !asin) {
    skipped++;
    continue;
  }

  try {
    // Verifica se esiste nel DB
    const prodotto = checkStmt.get(asin);

    if (!prodotto) {
      console.log(`⚠️ ASIN non trovato nel DB: ${asin} (SKU: ${sku})`);
      notFound++;
      continue;
    }

    // Se ha già SKU, salta
    if (prodotto.sku && prodotto.sku.trim() !== "") {
      console.log(`⏭️ SKU già presente per ${asin}: ${prodotto.sku}`);
      skipped++;
      continue;
    }

    // Aggiorna
    const result = updateStmt.run(sku, asin);
    if (result.changes > 0) {
      console.log(`✅ ${asin} → ${sku} (${prodotto.nome?.substring(0, 40)}...)`);
      updated++;
    }
  } catch (err) {
    console.error(`❌ Errore per ${asin}: ${err.message}`);
    errors++;
  }
}

// Chiudi database
db.close();

// Riepilogo
console.log("\n========================================");
console.log("📊 RIEPILOGO IMPORT SKU");
console.log("========================================");
console.log(`✅ Aggiornati:    ${updated}`);
console.log(`⏭️ Saltati:       ${skipped}`);
console.log(`⚠️ Non trovati:   ${notFound}`);
console.log(`❌ Errori:        ${errors}`);
console.log(`📋 Totale righe:  ${lines.length - 1}`);
console.log("========================================");