const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "../db/inventario.db");
const db = new Database(dbPath);

const prodotti100ml = [
  { nome: "Remover 100ml", asin: ["B094YJC9HR", "B0DTJ6H1WD"] },
  { nome: "Remover Limone 100ml", asin: ["B09WYYBFX2"] },
  { nome: "Cleaner 100ml", asin: ["B08XQQHK37", "B0DTZ5PPPB"] },
  { nome: "Cleaner Menta 100ml", asin: ["B09CL6RMWZ"] },
  { nome: "Cleaner Cocco 100ml", asin: ["B0DXVQ42VH"] },
  { nome: "Slip Solution 100ml", asin: ["B09FLX9CQV"] },
  { nome: "Brush Cleaner 100ml", asin: ["B0924Q9M9X"] },
  { nome: "Solvente NO Acetone (BubbleGum) 100ml", asin: ["B09238F1VL"] },
  { nome: "Liquido Acrilico Monomero Mango 100ml", asin: ["B0FTSN1X1V"] },
];

try {
  const insert = db.prepare(`
    INSERT INTO sfuso (nome_prodotto, formato, asin_collegati, fornitore, lotto, litri_disponibili)
    VALUES (@nome_prodotto, @formato, @asin_collegati, '-', '-', 0)
  `);

  const tx = db.transaction(() => {
    for (const p of prodotti100ml) {
      insert.run({
        nome_prodotto: p.nome,
        formato: "100ml",
        asin_collegati: JSON.stringify(p.asin),
      });
    }
  });

  tx();
  console.log(`✅ Inseriti ${prodotti100ml.length} prodotti 100ml in tabella sfuso`);
} catch (err) {
  console.error("❌ Errore inserimento 100ml:", err.message);
} finally {
  db.close();
}
