-- ============================================================
-- MIGRAZIONE 009 - Spedizioni inbound FBA (Send-to-Amazon API)
-- ============================================================
-- Tabelle per il flusso Fulfillment Inbound API v2024-03-20:
--   - inbound_plans     -> piano logico (1 per richiesta utente)
--   - inbound_shipments -> spedizioni fisiche generate dal piano
--   - inbound_items     -> SKU+quantita per piano (input utente)
--   - inbound_boxes     -> cartoni dichiarati dal seller
--   - inbound_operations -> tracking degli operationId asincroni
-- ============================================================

CREATE TABLE IF NOT EXISTS inbound_plans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  amazon_plan_id    TEXT UNIQUE,
  name              TEXT,
  marketplace_id    TEXT NOT NULL,
  source_address    TEXT NOT NULL,                   -- JSON {name, addressLine1, city, ...}

  status            TEXT NOT NULL DEFAULT 'DRAFT',   -- DRAFT|PLAN_CREATED|PACKING_CONFIRMED|PLACEMENT_CONFIRMED|TRANSPORT_CONFIRMED|DELIVERY_CONFIRMED|VOIDED
  current_step      TEXT NOT NULL DEFAULT 'items',   -- items|packing|placement|transport|delivery|labels|done

  selected_packing_group_id TEXT,
  selected_placement_id     TEXT,
  selected_transportation_id TEXT,
  selected_delivery_window_id TEXT,

  spedizione_id     INTEGER,                          -- FK opzionale a spedizioni (prebolla)

  created_at        TEXT DEFAULT (datetime('now','localtime')),
  updated_at        TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_inbound_plans_status ON inbound_plans(status);
CREATE INDEX IF NOT EXISTS idx_inbound_plans_sped   ON inbound_plans(spedizione_id);


CREATE TABLE IF NOT EXISTS inbound_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id       INTEGER NOT NULL,
  asin          TEXT,
  msku          TEXT NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  prep_owner    TEXT,                                 -- AMAZON|SELLER|NONE
  labeling_owner TEXT,                                -- AMAZON|SELLER|NONE
  expiration    TEXT,
  FOREIGN KEY (plan_id) REFERENCES inbound_plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inbound_items_plan ON inbound_items(plan_id);


CREATE TABLE IF NOT EXISTS inbound_shipments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id             INTEGER NOT NULL,
  amazon_shipment_id  TEXT UNIQUE,                    -- shipmentId Amazon (FBA15...)
  destination          TEXT,                          -- centro logistico Amazon (FRA1, BLQ1, ...)
  status              TEXT,                           -- WORKING|READY_TO_SHIP|SHIPPED|RECEIVING|CLOSED|VOIDED
  tracking_numbers    TEXT,                           -- JSON array
  labels_url          TEXT,                           -- ultima URL labels scaricata
  bill_of_lading_url  TEXT,
  created_at          TEXT DEFAULT (datetime('now','localtime')),
  updated_at          TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (plan_id) REFERENCES inbound_plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inbound_shipments_plan ON inbound_shipments(plan_id);


CREATE TABLE IF NOT EXISTS inbound_boxes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id         INTEGER NOT NULL,
  box_index           INTEGER NOT NULL,
  weight_kg           REAL,
  length_cm           REAL,
  width_cm            REAL,
  height_cm           REAL,
  content_json        TEXT,                            -- JSON [{msku, quantity}]
  FOREIGN KEY (shipment_id) REFERENCES inbound_shipments(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS inbound_operations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id       INTEGER NOT NULL,
  operation_id  TEXT NOT NULL,
  operation_type TEXT NOT NULL,                       -- generatePackingOptions|confirmPackingOption|...
  status        TEXT NOT NULL DEFAULT 'IN_PROGRESS',  -- IN_PROGRESS|SUCCESS|FAILED
  error_details TEXT,
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  completed_at  TEXT,
  FOREIGN KEY (plan_id) REFERENCES inbound_plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inbound_ops_plan ON inbound_operations(plan_id);
CREATE INDEX IF NOT EXISTS idx_inbound_ops_status ON inbound_operations(status);


CREATE TRIGGER IF NOT EXISTS tg_inbound_plans_update
AFTER UPDATE ON inbound_plans
FOR EACH ROW
BEGIN
  UPDATE inbound_plans SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS tg_inbound_shipments_update
AFTER UPDATE ON inbound_shipments
FOR EACH ROW
BEGIN
  UPDATE inbound_shipments SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
END;
