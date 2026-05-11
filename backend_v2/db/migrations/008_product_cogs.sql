-- ============================================================
-- 📦 MIGRAZIONE 008 — COGS per prodotto (ispirato Shopkeeper)
-- ============================================================
-- Tabella per i Cost-Of-Goods-Sold dettagliati per ASIN, marketplace
-- e modalità di fulfillment (FBA o FBM). Ogni combinazione ha 6
-- componenti di costo che vengono sommati in `total` (campo generato).
-- ============================================================

CREATE TABLE IF NOT EXISTS product_cogs (
  asin             TEXT    NOT NULL,
  marketplace_id   TEXT    NOT NULL,
  fulfillment_type TEXT    NOT NULL DEFAULT 'FBA',  -- 'FBA' | 'FBM'

  -- Componenti costo (EUR per unità)
  wholesale        REAL    NOT NULL DEFAULT 0,
  inspection       REAL    NOT NULL DEFAULT 0,
  region_shipping  REAL    NOT NULL DEFAULT 0,
  import_tax       REAL    NOT NULL DEFAULT 0,
  other_costs      REAL    NOT NULL DEFAULT 0,
  inbound_shipping REAL    NOT NULL DEFAULT 0,

  -- Totale calcolato automaticamente dal DB
  total REAL GENERATED ALWAYS AS (
    wholesale + inspection + region_shipping + import_tax + other_costs + inbound_shipping
  ) VIRTUAL,

  -- Metadati liberi
  tag        TEXT,
  note       TEXT,

  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),

  PRIMARY KEY (asin, marketplace_id, fulfillment_type),
  CHECK (fulfillment_type IN ('FBA','FBM'))
);

CREATE INDEX IF NOT EXISTS idx_product_cogs_asin        ON product_cogs(asin);
CREATE INDEX IF NOT EXISTS idx_product_cogs_marketplace ON product_cogs(marketplace_id);

CREATE TRIGGER IF NOT EXISTS tg_product_cogs_update
AFTER UPDATE ON product_cogs
FOR EACH ROW
BEGIN
  UPDATE product_cogs
  SET updated_at = datetime('now','localtime')
  WHERE asin = OLD.asin
    AND marketplace_id = OLD.marketplace_id
    AND fulfillment_type = OLD.fulfillment_type;
END;
