// backend_v2/scripts/seedMagazzinoUser.js
// Crea o aggiorna l'utente "magazzino" (ruolo magazzino) con la password fornita.
// Uso: node scripts/seedMagazzinoUser.js [password]
// Se la password manca usa il default "magazzino2026".

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { hashPassword } = require("../utils/password");

const password = process.argv[2] || "magazzino2026";

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "db", "inventario.db");
if (!fs.existsSync(dbPath)) {
  console.error(`Database non trovato: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const existing = db.prepare("SELECT id FROM utenti WHERE username = 'magazzino'").get();
const hash = hashPassword(password);

if (existing) {
  db.prepare(
    "UPDATE utenti SET password = ?, ruolo = 'magazzino', attivo = 1, updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(hash, existing.id);
  console.log(`Utente 'magazzino' aggiornato (id=${existing.id}). Password impostata.`);
} else {
  const result = db.prepare(
    "INSERT INTO utenti (username, password, ruolo, nome, attivo) VALUES ('magazzino', ?, 'magazzino', 'Operatore Magazzino', 1)"
  ).run(hash);
  console.log(`Utente 'magazzino' creato (id=${result.lastInsertRowid}).`);
}

console.log(`Password attiva: "${password}"`);
console.log(`DB: ${path.resolve(dbPath)}`);
db.close();
