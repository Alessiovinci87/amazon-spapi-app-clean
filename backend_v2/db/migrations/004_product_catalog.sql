-- Migrazione 004: tabella product_catalog con image_count
-- Per installazioni fresche crea la tabella completa.
-- Per installazioni esistenti, l'ALTER TABLE viene gestito
-- con try/catch nel codice di avvio (europaRoutes.js).

CREATE TABLE IF NOT EXISTS product_catalog (
  asin           TEXT    NOT NULL,
  marketplace_id TEXT    NOT NULL,
  country        TEXT,
  titolo         TEXT,
  image_url      TEXT,
  image_count    INTEGER DEFAULT 0,
  updated_at     TEXT,
  PRIMARY KEY (asin, marketplace_id)
);

CREATE INDEX IF NOT EXISTS idx_product_catalog_asin ON product_catalog(asin);
