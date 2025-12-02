// 📁 backend_v2/modules/inventory/inventario.js
const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const router = express.Router();

// 🧩 Connessione al database principale
const dbPath = path.join(__dirname, "../../db/inventario.db");
console.log("🧭 Percorso DB effettivo:", dbPath);
console.log("📄 Esiste il file DB?", require("fs").existsSync(dbPath));

console.log("📂 DB caricato da:", dbPath); // <-- 🔍 Log percorso effettivo

const db = new Database(dbPath, { fileMustExist: true });

try {
  const tabelle = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("📋 Tabelle trovate nel DB:", tabelle);
  const count = db.prepare("SELECT COUNT(*) as n FROM prodotti").get();
  console.log("📦 Numero prodotti trovati:", count);
} catch (err) {
  console.error("❌ Errore test DB:", err);
}


// 🔹 GET /api/v2/magazzino
router.get("/", (req, res) => {
  try {
    const query = db.prepare("SELECT * FROM prodotti");
    const data = query.all();

    console.log(`📦 Prodotti trovati: ${data.length}`); // <-- 🔍 Log numero prodotti

    res.json({ ok: true, data });
  } catch (err) {
    console.error("❌ Errore fetch prodotti:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
