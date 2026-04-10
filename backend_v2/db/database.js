// backend_v2/db/database.js
// Gestione centralizzata DB (better-sqlite3) — percorso configurato via env DB_PATH

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { hashPassword } = require("../utils/password");

let dbInstance = null;

/**
 * Legge il percorso del database da DB_PATH nell'ambiente.
 * Fallback al percorso locale di sviluppo se non configurato.
 */
function getDbPath() {
  return process.env.DB_PATH || path.join(__dirname, "inventario.db");
}

/**
 * Apertura database con controlli di sicurezza.
 * Se il WAL è corrotto (SQLITE_IOERR_TRUNCATE), rimuove i file WAL/SHM e riprova una volta.
 */
function openDb(retry = true) {
  const dbFile = getDbPath();

  console.log("\n=========================================");
  console.log("📌 DATABASE APERTO DA QUESTO PERCORSO:");
  console.log(path.resolve(dbFile));
  console.log("=========================================\n");

  if (!fs.existsSync(dbFile)) {
    throw new Error(
      "❌ Database non trovato nel percorso configurato.\n" +
      "   Percorso atteso: " + dbFile + "\n" +
      "   Controlla la variabile DB_PATH nel file .env"
    );
  }

  try {
    const db = new Database(dbFile, { fileMustExist: true });

    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");

    const mode = db.pragma("journal_mode", { simple: true });
    console.log(`🧩 PRAGMA impostate correttamente (journal_mode=${mode}).`);

    return db;
  } catch (err) {
    if (err.code === "SQLITE_IOERR_TRUNCATE" && retry) {
      console.warn("⚠️  WAL corrotto rilevato — rimozione automatica dei file WAL/SHM e nuovo tentativo…");
      const walFile = dbFile + "-wal";
      const shmFile = dbFile + "-shm";
      try { fs.unlinkSync(walFile); } catch (_) {}
      try { fs.unlinkSync(shmFile); } catch (_) {}
      return openDb(false); // un solo retry
    }
    throw err;
  }
}

/**
 * Verifica se la tabella impostazioni esiste e ha la password admin.
 * Se non esiste o la password non è stata impostata, inserisce il valore di default.
 */
function seedPasswordAdmin(db) {
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='impostazioni'")
    .get();

  if (!tableExists) return;

  const existing = db.prepare("SELECT 1 FROM impostazioni WHERE chiave = 'admin_password'").get();
  if (existing) return;

  const defaultPassword = process.env.ADMIN_PASSWORD_DEFAULT || "1234";
  const hash = hashPassword(defaultPassword);

  db.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('admin_password', ?)").run(hash);
  console.log("🔐 Password admin inizializzata nel DB dall'env ADMIN_PASSWORD_DEFAULT.");
}

/**
 * Seed utente admin nella tabella utenti (se la tabella esiste e non ha admin).
 */
function seedAdminUser(db) {
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='utenti'")
    .get();

  if (!tableExists) return;

  const existing = db.prepare("SELECT 1 FROM utenti WHERE username = 'admin'").get();
  if (existing) return;

  const defaultPassword = process.env.ADMIN_PASSWORD_DEFAULT || "1234";
  const hash = hashPassword(defaultPassword);

  db.prepare(
    "INSERT INTO utenti (username, password, ruolo, nome) VALUES ('admin', ?, 'admin', 'Amministratore')"
  ).run(hash);
  console.log("🔐 Utente admin creato con password da ADMIN_PASSWORD_DEFAULT.");
}

/**
 * Inizializza il database e fa il seed della password admin se necessario.
 */
function runMigrations(db) {
  // Aggiunge quantita_impegnata ad accessori se mancante
  const cols = db.pragma("table_info(accessori)");
  if (!cols.some(c => c.name === "quantita_impegnata")) {
    db.prepare("ALTER TABLE accessori ADD COLUMN quantita_impegnata INTEGER NOT NULL DEFAULT 0").run();
    console.log("🔧 Migrazione: aggiunta colonna quantita_impegnata ad accessori");
  }
  // Aggiunge soglia_minima ad accessori se mancante
  if (!cols.some(c => c.name === "soglia_minima")) {
    db.prepare("ALTER TABLE accessori ADD COLUMN soglia_minima INTEGER NOT NULL DEFAULT 0").run();
    console.log("🔧 Migrazione: aggiunta colonna soglia_minima ad accessori");
  }

  // Aggiunge soglia_minima a sfuso se mancante
  const colsSfuso = db.pragma("table_info(sfuso)");
  if (colsSfuso.length > 0 && !colsSfuso.some(c => c.name === "soglia_minima")) {
    db.prepare("ALTER TABLE sfuso ADD COLUMN soglia_minima REAL NOT NULL DEFAULT 0").run();
    console.log("🔧 Migrazione: aggiunta colonna soglia_minima a sfuso");
  }

  // Aggiunge nome a alert_events se mancante (per mostrare nome prodotto accanto all'ASIN)
  const colsAlertEv = db.pragma("table_info(alert_events)");
  if (colsAlertEv.length > 0 && !colsAlertEv.some(c => c.name === "nome")) {
    db.prepare("ALTER TABLE alert_events ADD COLUMN nome TEXT").run();
    console.log("🔧 Migrazione: aggiunta colonna nome ad alert_events");

    // Backfill: popola nome dagli alert esistenti usando fba_stock.product_name
    try {
      db.prepare(`
        UPDATE alert_events SET nome = (
          SELECT fs.product_name FROM fba_stock fs WHERE fs.asin = alert_events.asin LIMIT 1
        ) WHERE nome IS NULL AND asin IS NOT NULL
      `).run();
      console.log("🔧 Backfill: nome popolato per alert esistenti da fba_stock");
    } catch (e) { console.warn("⚠️ Backfill nome alert:", e.message); }
  }

  // ===== SALES TRAFFIC: aggiunge date + created_at se mancanti =====
  const colsST = db.pragma("table_info(sales_traffic)");
  if (colsST.length > 0 && !colsST.some(c => c.name === "date")) {
    db.prepare("ALTER TABLE sales_traffic ADD COLUMN date TEXT DEFAULT ''").run();
    console.log("🔧 Migrazione: aggiunta colonna date a sales_traffic");
  }
  if (colsST.length > 0 && !colsST.some(c => c.name === "created_at")) {
    db.prepare("ALTER TABLE sales_traffic ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP").run();
    console.log("🔧 Migrazione: aggiunta colonna created_at a sales_traffic");
  }

  // ===== RESI FBA =====
  db.prepare(`
    CREATE TABLE IF NOT EXISTS fba_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_date TEXT,
      order_id TEXT,
      asin TEXT,
      sku TEXT,
      product_name TEXT,
      quantity INTEGER DEFAULT 0,
      fulfillment_center TEXT,
      disposition TEXT,
      reason TEXT,
      status TEXT,
      customer_comments TEXT,
      country TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(order_id, asin, return_date)
    )
  `).run();

  // ===== TRACCIABILITÀ LOTTI =====
  // Aggiunge lotto a produzioni_sfuso se mancante
  const colsProdSfuso = db.pragma("table_info(produzioni_sfuso)");
  if (colsProdSfuso.length > 0 && !colsProdSfuso.some(c => c.name === "lotto")) {
    db.prepare("ALTER TABLE produzioni_sfuso ADD COLUMN lotto TEXT").run();
    console.log("🔧 Migrazione: aggiunta colonna lotto a produzioni_sfuso");
  }
  // Aggiunge lotto a storico_produzioni_sfuso se mancante
  const colsStoricoProd = db.pragma("table_info(storico_produzioni_sfuso)");
  if (colsStoricoProd.length > 0 && !colsStoricoProd.some(c => c.name === "lotto")) {
    db.prepare("ALTER TABLE storico_produzioni_sfuso ADD COLUMN lotto TEXT").run();
    console.log("🔧 Migrazione: aggiunta colonna lotto a storico_produzioni_sfuso");
  }
  // Aggiunge lotto a storico_movimenti se mancante
  const colsStoricoMov = db.pragma("table_info(storico_movimenti)");
  if (colsStoricoMov.length > 0 && !colsStoricoMov.some(c => c.name === "lotto")) {
    db.prepare("ALTER TABLE storico_movimenti ADD COLUMN lotto TEXT").run();
    console.log("🔧 Migrazione: aggiunta colonna lotto a storico_movimenti");
  }
  // Aggiunge lotto a ddt_generici_righe se mancante
  const colsDdtRighe = db.pragma("table_info(ddt_generici_righe)");
  if (colsDdtRighe.length > 0 && !colsDdtRighe.some(c => c.name === "lotto")) {
    db.prepare("ALTER TABLE ddt_generici_righe ADD COLUMN lotto TEXT").run();
    console.log("🔧 Migrazione: aggiunta colonna lotto a ddt_generici_righe");
  }

  // ===== ONE STEP =====
  db.prepare(`
    CREATE TABLE IF NOT EXISTS onestep_prodotti (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      asin            TEXT    UNIQUE NOT NULL,
      sku             TEXT,
      codice_colore   TEXT,
      nome            TEXT,
      image_url       TEXT,
      quantita        INTEGER NOT NULL DEFAULT 0,
      soglia_minima   INTEGER NOT NULL DEFAULT 10,
      created_at      TEXT DEFAULT (datetime('now','localtime')),
      updated_at      TEXT DEFAULT (datetime('now','localtime'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS onestep_ordini (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      fornitore             TEXT    NOT NULL,
      data_ordine           TEXT    DEFAULT (datetime('now','localtime')),
      data_consegna_prevista TEXT,
      stato                 TEXT    NOT NULL DEFAULT 'bozza',
      note                  TEXT,
      operatore             TEXT    DEFAULT 'admin',
      created_at            TEXT    DEFAULT (datetime('now','localtime')),
      updated_at            TEXT    DEFAULT (datetime('now','localtime'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS onestep_ordini_righe (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      id_ordine          INTEGER NOT NULL REFERENCES onestep_ordini(id) ON DELETE CASCADE,
      asin               TEXT    NOT NULL,
      quantita_ordinata  INTEGER NOT NULL DEFAULT 0,
      quantita_ricevuta  INTEGER,
      stato              TEXT    DEFAULT 'in_attesa',
      created_at         TEXT    DEFAULT (datetime('now','localtime'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS onestep_movimenti (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      asin             TEXT    NOT NULL,
      tipo             TEXT    NOT NULL,
      quantita         INTEGER NOT NULL,
      riferimento_tipo TEXT,
      riferimento_id   INTEGER,
      note             TEXT,
      operatore        TEXT    DEFAULT 'system',
      created_at       TEXT    DEFAULT (datetime('now','localtime'))
    )
  `).run();

  console.log("✅ Migrazione One Step completata");

  // ===== TOP COAT =====
  db.prepare(`
    CREATE TABLE IF NOT EXISTS topcoat_prodotti (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      asin            TEXT    UNIQUE NOT NULL,
      sku             TEXT,
      codice_colore   TEXT,
      nome            TEXT,
      image_url       TEXT,
      quantita        INTEGER NOT NULL DEFAULT 0,
      soglia_minima   INTEGER NOT NULL DEFAULT 10,
      created_at      TEXT DEFAULT (datetime('now','localtime')),
      updated_at      TEXT DEFAULT (datetime('now','localtime'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS topcoat_ordini (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      fornitore             TEXT    NOT NULL,
      data_ordine           TEXT    DEFAULT (datetime('now','localtime')),
      data_consegna_prevista TEXT,
      stato                 TEXT    NOT NULL DEFAULT 'bozza',
      note                  TEXT,
      operatore             TEXT    DEFAULT 'admin',
      created_at            TEXT    DEFAULT (datetime('now','localtime')),
      updated_at            TEXT    DEFAULT (datetime('now','localtime'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS topcoat_ordini_righe (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      id_ordine          INTEGER NOT NULL REFERENCES topcoat_ordini(id) ON DELETE CASCADE,
      asin               TEXT    NOT NULL,
      quantita_ordinata  INTEGER NOT NULL DEFAULT 0,
      quantita_ricevuta  INTEGER,
      stato              TEXT    DEFAULT 'in_attesa',
      created_at         TEXT    DEFAULT (datetime('now','localtime'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS topcoat_movimenti (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      asin             TEXT    NOT NULL,
      tipo             TEXT    NOT NULL,
      quantita         INTEGER NOT NULL,
      riferimento_tipo TEXT,
      riferimento_id   INTEGER,
      note             TEXT,
      operatore        TEXT    DEFAULT 'system',
      created_at       TEXT    DEFAULT (datetime('now','localtime'))
    )
  `).run();

  console.log("✅ Migrazione Top Coat completata");

  // ===== MODULI CUSTOM (sistema generico) =====
  db.prepare(`
    CREATE TABLE IF NOT EXISTS moduli_custom (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      slug          TEXT    UNIQUE NOT NULL,
      label         TEXT    NOT NULL,
      icona         TEXT    DEFAULT '📦',
      stile_codice  TEXT    NOT NULL DEFAULT 'numerico',  -- 'numerico' | 'testuale'
      colore        TEXT    DEFAULT 'blue',                -- tailwind color name
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS moduli_prodotti (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      modulo_id       INTEGER NOT NULL REFERENCES moduli_custom(id) ON DELETE CASCADE,
      asin            TEXT    NOT NULL,
      sku             TEXT,
      codice_colore   TEXT,
      nome            TEXT,
      image_url       TEXT,
      quantita        INTEGER NOT NULL DEFAULT 0,
      soglia_minima   INTEGER NOT NULL DEFAULT 10,
      created_at      TEXT DEFAULT (datetime('now','localtime')),
      updated_at      TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(modulo_id, asin)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS moduli_ordini (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      modulo_id             INTEGER NOT NULL REFERENCES moduli_custom(id) ON DELETE CASCADE,
      fornitore             TEXT    NOT NULL,
      data_ordine           TEXT    DEFAULT (datetime('now','localtime')),
      data_consegna_prevista TEXT,
      stato                 TEXT    NOT NULL DEFAULT 'bozza',
      note                  TEXT,
      operatore             TEXT    DEFAULT 'admin',
      created_at            TEXT    DEFAULT (datetime('now','localtime')),
      updated_at            TEXT    DEFAULT (datetime('now','localtime'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS moduli_ordini_righe (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      id_ordine          INTEGER NOT NULL REFERENCES moduli_ordini(id) ON DELETE CASCADE,
      asin               TEXT    NOT NULL,
      quantita_ordinata  INTEGER NOT NULL DEFAULT 0,
      quantita_ricevuta  INTEGER,
      stato              TEXT    DEFAULT 'in_attesa',
      created_at         TEXT    DEFAULT (datetime('now','localtime'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS moduli_movimenti (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      modulo_id        INTEGER NOT NULL REFERENCES moduli_custom(id) ON DELETE CASCADE,
      asin             TEXT    NOT NULL,
      tipo             TEXT    NOT NULL,
      quantita         INTEGER NOT NULL,
      riferimento_tipo TEXT,
      riferimento_id   INTEGER,
      note             TEXT,
      operatore        TEXT    DEFAULT 'system',
      created_at       TEXT    DEFAULT (datetime('now','localtime'))
    )
  `).run();

  console.log("✅ Migrazione Moduli Custom completata");

  // ===== ALERT EVENTS: aggiungi colonna 'source' se mancante =====
  try {
    const colsAlert = db.pragma("table_info(alert_events)");
    if (colsAlert.length > 0 && !colsAlert.some(c => c.name === "source")) {
      db.prepare("ALTER TABLE alert_events ADD COLUMN source TEXT").run();
      console.log("🔧 Migrazione: aggiunta colonna source ad alert_events");
    }
  } catch (_) { /* tabella non esiste ancora, sarà creata dalla migration europa */ }

  // ===== SELLER FEEDBACK (SP-API GET_SELLER_FEEDBACK_DATA) =====
  // Migrazione: se la tabella esiste con il vecchio unique constraint
  // (marketplace_id, order_id, date, rating), la droppiamo e ricreiamo
  // con la nuova chiave (order_id, rating). I dati sono solo cache di Amazon.
  try {
    const oldSchema = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='seller_feedback'")
      .get();
    if (
      oldSchema?.sql &&
      oldSchema.sql.includes("UNIQUE(marketplace_id, order_id, date, rating)")
    ) {
      db.prepare("DROP TABLE seller_feedback").run();
      console.log("🔧 Migrazione: drop seller_feedback (vecchio schema)");
    }
  } catch (_) {}

  db.prepare(`
    CREATE TABLE IF NOT EXISTS seller_feedback (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      marketplace_id    TEXT    NOT NULL,
      order_id          TEXT,
      date              TEXT    NOT NULL,
      rating            INTEGER NOT NULL,
      comments          TEXT,
      response          TEXT,
      rater_email       TEXT,
      asin              TEXT,
      synced_at         TEXT    NOT NULL,
      UNIQUE(order_id, rating)
    )
  `).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_seller_feedback_mp   ON seller_feedback(marketplace_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_seller_feedback_date ON seller_feedback(date)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_seller_feedback_asin ON seller_feedback(asin)`).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS seller_feedback_sync (
      marketplace_id TEXT PRIMARY KEY,
      last_sync      TEXT NOT NULL,
      status         TEXT,
      records        INTEGER DEFAULT 0
    )
  `).run();

  // Cache info ordine: per evitare di richiamare ripetutamente Orders API
  db.prepare(`
    CREATE TABLE IF NOT EXISTS amazon_order_cache (
      order_id        TEXT PRIMARY KEY,
      marketplace_id  TEXT,
      asin            TEXT,
      title           TEXT,
      purchase_date   TEXT,
      fetched_at      TEXT NOT NULL
    )
  `).run();

  console.log("✅ Migrazione Seller Feedback completata");

  // ===== SCADENZE LOTTI =====
  // Aggiunge data_scadenza e pao_mesi a sfuso se mancanti
  const colsSfusoScad = db.pragma("table_info(sfuso)");
  if (colsSfusoScad.length > 0 && !colsSfusoScad.some(c => c.name === "data_scadenza")) {
    db.prepare("ALTER TABLE sfuso ADD COLUMN data_scadenza TEXT").run();
    console.log("🔧 Migrazione: aggiunta colonna data_scadenza a sfuso");
  }
  if (colsSfusoScad.length > 0 && !colsSfusoScad.some(c => c.name === "pao_mesi")) {
    db.prepare("ALTER TABLE sfuso ADD COLUMN pao_mesi INTEGER").run();
    console.log("🔧 Migrazione: aggiunta colonna pao_mesi a sfuso");
  }
  // Aggiunge data_scadenza a sfuso_movimenti se mancante
  const colsSfusoMov = db.pragma("table_info(sfuso_movimenti)");
  if (colsSfusoMov.length > 0 && !colsSfusoMov.some(c => c.name === "data_scadenza")) {
    db.prepare("ALTER TABLE sfuso_movimenti ADD COLUMN data_scadenza TEXT").run();
    console.log("🔧 Migrazione: aggiunta colonna data_scadenza a sfuso_movimenti");
  }

  console.log("✅ Migrazione Scadenze Lotti completata");

  // ===== ORDINI FORNITORI: aggiungi quantita_ricevuta se mancante =====
  const colsOrdForn = db.pragma("table_info(ordini_fornitori)");
  if (colsOrdForn.length > 0 && !colsOrdForn.some(c => c.name === "quantita_ricevuta")) {
    db.prepare("ALTER TABLE ordini_fornitori ADD COLUMN quantita_ricevuta REAL").run();
    console.log("🔧 Migrazione: aggiunta colonna quantita_ricevuta a ordini_fornitori");
  }

  // ===== PRODOTTI: aggiungi soglia_minima se mancante =====
  const colsProdotti = db.pragma("table_info(prodotti)");
  if (colsProdotti.length > 0 && !colsProdotti.some(c => c.name === "soglia_minima")) {
    db.prepare("ALTER TABLE prodotti ADD COLUMN soglia_minima INTEGER NOT NULL DEFAULT 10").run();
    console.log("🔧 Migrazione: aggiunta colonna soglia_minima a prodotti");
  }
}

async function ensureDatabaseReady() {
  if (dbInstance) return dbInstance;

  const db = openDb();
  console.log("📂 Database caricato da:", getDbPath());

  dbInstance = db;

  seedPasswordAdmin(db);
  runMigrations(db);
  seedAdminUser(db);

  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error("❌ Database non inizializzato. Chiama ensureDatabaseReady() prima.");
  }
  return dbInstance;
}

module.exports = { ensureDatabaseReady, getDb, getDbPath };
