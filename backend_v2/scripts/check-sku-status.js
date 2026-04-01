// check-sku-status.js
const Database = require("better-sqlite3");

const DB_PATH = "D:/inventario_database/inventario.db";
const db = new Database(DB_PATH);

const count = db.prepare("SELECT COUNT(*) as tot FROM prodotti").get();
const conSku = db.prepare("SELECT COUNT(*) as tot FROM prodotti WHERE sku IS NOT NULL AND sku != ''").get();
const senzaSku = db.prepare("SELECT COUNT(*) as tot FROM prodotti WHERE sku IS NULL OR sku = ''").get();

console.log("========================================");
console.log("📊 STATO CATALOGO PRODOTTI");
console.log("========================================");
console.log(`📦 Totale prodotti nel DB: ${count.tot}`);
console.log(`✅ Con SKU:                ${conSku.tot}`);
console.log(`⚠️ Senza SKU:              ${senzaSku.tot}`);
console.log("========================================");

// Mostra i prodotti senza SKU
if (senzaSku.tot > 0) {
  console.log("\n📋 Prodotti SENZA SKU:");
  const prodottiSenzaSku = db.prepare("SELECT asin, nome FROM prodotti WHERE sku IS NULL OR sku = '' LIMIT 30").all();
  prodottiSenzaSku.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.asin} - ${p.nome?.substring(0, 50) || "N/A"}...`);
  });
  if (senzaSku.tot > 30) {
    console.log(`   ... e altri ${senzaSku.tot - 30}`);
  }
}

db.close();