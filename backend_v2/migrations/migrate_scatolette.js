// backend_v2/migrations/migrate_scatolette.js
const Database = require("better-sqlite3");
const path = require("path");

// Percorso al DB principale
const dbPath = path.join(__dirname, "..", "db", "inventario.db");
const db = new Database(dbPath);

console.log("📦 MIGRAZIONE SCATOLETTE — AVVIO");

// 1. Crea tabella se non esiste
db.exec(`
  CREATE TABLE IF NOT EXISTS scatolette (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asin_prodotto TEXT NOT NULL,
    sku TEXT,
    nome_prodotto TEXT NOT NULL,
    scatoletta TEXT NOT NULL,
    quantita INTEGER DEFAULT 0
  );
`);

console.log("✔ Tabella 'scatolette' creata/verificata");

// 2. Popola tabella con dati iniziali dal JSON
const scatolette = [
  { asin_prodotto: "B08X21RXF1", sku: "HL-3AJ4-9DWJ", nome_prodotto: "Nail Prep", scatoletta: "SCATOLETTA_NAIL_PREP", quantita: 0 },
  { asin_prodotto: "B08JCWDCF2", sku: "IQ-CJP7-HGHI", nome_prodotto: "Primer", scatoletta: "SCATOLETTA_PRIMER", quantita: 0 },
  { asin_prodotto: "B0BK9QLKN1", sku: "PH-U17C-SDTL", nome_prodotto: "Primer Acido", scatoletta: "SCATOLETTA_PRIMER_ACIDO", quantita: 0 },
  { asin_prodotto: "B0FJMF75RR", sku: "0C-GRMH-AF5U", nome_prodotto: "Olio Caramello", scatoletta: "SCATOLETTA_OLIO_CARAMELLO", quantita: 0 },
  { asin_prodotto: "B0FJMGRDBJ", sku: "W8-VGAT-9ZVC", nome_prodotto: "Olio Monoi", scatoletta: "SCATOLETTA_OLIO_MONOI", quantita: 0 },
  { asin_prodotto: "B0CHMK39L9", sku: "B3-OI3E-Q5EU", nome_prodotto: "Olio Frutti di Bosco", scatoletta: "SCATOLETTA_OLIO_FRUTTI_DI_BOSCO", quantita: 0 },
  { asin_prodotto: "B0CHMK6QTY", sku: "B0-4T35-L47C", nome_prodotto: "Olio Cocco", scatoletta: "SCATOLETTA_OLIO_COCCO", quantita: 0 },
  { asin_prodotto: "B0CHMJ7HW8", sku: "DJ-YXM7-BKPY", nome_prodotto: "Olio Banana", scatoletta: "SCATOLETTA_OLIO_BANANA", quantita: 0 },
  { asin_prodotto: "B0CHMLJD7K", sku: "7S-2HON-0K7W", nome_prodotto: "Olio Lavanda", scatoletta: "SCATOLETTA_OLIO_LAVANDA", quantita: 0 },
  { asin_prodotto: "B09VY51ZFF", sku: "BR-QOX7-DTQL", nome_prodotto: "Olio Fragola", scatoletta: "SCATOLETTA_OLIO_FRAGOLA", quantita: 0 },
  { asin_prodotto: "B09VY4M2R4", sku: "ZX-NZFS-TU60", nome_prodotto: "Olio Ananas", scatoletta: "SCATOLETTA_OLIO_ANANAS", quantita: 0 },
  { asin_prodotto: "B0963P8M6Y", sku: "JD-JNS2-XDO2", nome_prodotto: "Olio Mela", scatoletta: "SCATOLETTA_OLIO_MELA", quantita: 0 },
  { asin_prodotto: "B0963Q6MSP", sku: "KI-JDKZ-FY0A", nome_prodotto: "Olio Arancia", scatoletta: "SCATOLETTA_OLIO_ARANCIA", quantita: 0 },
  { asin_prodotto: "B0963Q2987", sku: "H5-Q5LT-O5N4", nome_prodotto: "Olio Cioccolato", scatoletta: "SCATOLETTA_OLIO_CIOCCOLATO", quantita: 0 },
  { asin_prodotto: "B0963P222M", sku: "QD-7OXR-TGEQ", nome_prodotto: "Olio Limone", scatoletta: "SCATOLETTA_OLIO_LIMONE", quantita: 0 },
  { asin_prodotto: "B0963PF48B", sku: "6L-E47V-KB24", nome_prodotto: "Olio Vaniglia", scatoletta: "SCATOLETTA_OLIO_VANIGLIA", quantita: 0 },
  { asin_prodotto: "B0C5Y4QWG2", sku: "NX-ZTQL-00UH", nome_prodotto: "Olio Trifasico", scatoletta: "SCATOLETTA_OLIO_TRIFASICO", quantita: 0 },
  { asin_prodotto: "B0BY9Q4KTT", sku: "68-YM50-I8G3", nome_prodotto: "Antimicotico", scatoletta: "SCATOLETTA_ANTIMICOTICO", quantita: 0 },
  { asin_prodotto: "B0977FRJ6M", sku: "BO-UO6L-WFVR", nome_prodotto: "Anti Bite", scatoletta: "SCATOLETTA_ANTI_BITE", quantita: 0 },
  { asin_prodotto: "B094RK3P5T", sku: "1V-PVA4-32Q1", nome_prodotto: "Rinforzante", scatoletta: "SCATOLETTA_RINFORZANTE", quantita: 0 },
  { asin_prodotto: "B095KW4BS4", sku: "ZP-8F2J-HVL5", nome_prodotto: "Sciogli Rimuovi Cuticole", scatoletta: "SCATOLETTA_RIMUOVI_CUTICOLE", quantita: 0 },
  { asin_prodotto: "B09DQ3KH7Q", sku: "0Y-WJJG-6ALF", nome_prodotto: "Indurente", scatoletta: "SCATOLETTA_INDURENTE", quantita: 0 },
  { asin_prodotto: "B0CFB8PV37", sku: "HM-SJ8F-HRRD", nome_prodotto: "No Wipe Top Coat", scatoletta: "SCATOLETTA_NO_WIPE_TOP", quantita: 0 },
  { asin_prodotto: "B0CFBC4MCP", sku: "6H-LHM4-GL4M", nome_prodotto: "Ultra Shine Top Coat", scatoletta: "SCATOLETTA_ULTRA_SHINE", quantita: 0 },
  { asin_prodotto: "B0CFBBL77X", sku: "7S-E0VB-89IU", nome_prodotto: "Opaco Top Coat", scatoletta: "SCATOLETTA_OPACO", quantita: 0 },
  { asin_prodotto: "B09DQ62H25", sku: "GZ-KPW2-2BQP", nome_prodotto: "Top Coat Manicure Lucido", scatoletta: "SCATOLETTA_TOP_LUCIDO", quantita: 0 },
  { asin_prodotto: "B09DQ5457F", sku: "ET-3S95-8MKF", nome_prodotto: "Top Coat Manicure Opaco", scatoletta: "SCATOLETTA_TOP_OPACO", quantita: 0 }
];

const insert = db.prepare(`
  INSERT INTO scatolette (asin_prodotto, sku, nome_prodotto, scatoletta, quantita)
  VALUES (@asin_prodotto, @sku, @nome_prodotto, @scatoletta, @quantita)
`);

let count = 0;
for (const item of scatolette) {
  insert.run(item);
  count++;
}

console.log(`✔ Inserite ${count} scatolette nel database`);
console.log("🏁 MIGRAZIONE COMPLETATA");
