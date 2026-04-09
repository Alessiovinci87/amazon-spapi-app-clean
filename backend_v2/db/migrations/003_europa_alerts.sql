-- =====================================================================
-- Migrazione 003: Sistema alert Europa (per-ASIN configurabili)
-- =====================================================================

-- Regole di alert configurabili per ASIN
CREATE TABLE IF NOT EXISTS alert_rules (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  asin       TEXT    NOT NULL,
  nome       TEXT,                            -- etichetta opzionale (es. nome prodotto)
  tipo       TEXT    NOT NULL,                -- STOCK_LOW | BUYBOX_LOST | LISTING_CHANGED
  marketplace_id TEXT,                        -- NULL = tutti i marketplace
  soglia     INTEGER DEFAULT 0,               -- per STOCK_LOW: quantità minima
  abilitato  INTEGER DEFAULT 1,              -- 0/1
  created_at TEXT    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(asin, tipo, marketplace_id)
);

-- Storico degli alert scattati
CREATE TABLE IF NOT EXISTS alert_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  asin          TEXT    NOT NULL,
  tipo          TEXT    NOT NULL,
  marketplace_id TEXT,
  messaggio     TEXT,
  valore_attuale TEXT,                        -- es. quantità attuale, prezzo
  valore_precedente TEXT,                     -- es. quantità precedente
  letto         INTEGER DEFAULT 0,           -- 0 = non letto, 1 = letto
  created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
);

-- Snapshot periodici dei listing (per rilevare modifiche)
CREATE TABLE IF NOT EXISTS listings_snapshot (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  asin          TEXT    NOT NULL,
  marketplace_id TEXT    NOT NULL,
  titolo        TEXT,
  prezzo        REAL,
  currency      TEXT    DEFAULT 'EUR',
  stato         TEXT,
  buybox_won    INTEGER DEFAULT 0,           -- 0/1
  snapshot_at   TEXT    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(asin, marketplace_id)
);

-- Storico buy box (ogni cambio registrato)
CREATE TABLE IF NOT EXISTS buybox_tracking (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  asin              TEXT    NOT NULL,
  marketplace_id    TEXT    NOT NULL,
  won               INTEGER DEFAULT 0,      -- 0/1
  our_price         REAL,
  competitor_price  REAL,
  checked_at        TEXT    DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_alert_rules_asin      ON alert_rules(asin);
CREATE INDEX IF NOT EXISTS idx_alert_events_asin     ON alert_events(asin);
CREATE INDEX IF NOT EXISTS idx_alert_events_letto    ON alert_events(letto);
CREATE INDEX IF NOT EXISTS idx_listings_snapshot_asin ON listings_snapshot(asin);
CREATE INDEX IF NOT EXISTS idx_buybox_tracking_asin  ON buybox_tracking(asin);
