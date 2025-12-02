-- ============================================================
-- 📘 MIGRAZIONE BILANCIO — Catalogo costi + Movimenti economici
-- ============================================================

-- =============================
-- 1) TABELLA: bilancio_catalogo
-- =============================
CREATE TABLE IF NOT EXISTS bilancio_catalogo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Tipo di elemento a cui si riferisce il costo:
  -- "prodotto" | "accessorio" | "sfuso"
  tipo TEXT NOT NULL,

  -- ID dell’elemento nella tabella corrispondente (prodotti, accessori, sfuso)
  id_riferimento INTEGER NOT NULL,

  -- Costo unitario (per pezzo o per litro)
  costo REAL NOT NULL DEFAULT 0,

  -- Campo libero per eventuali annotazioni interne
  note TEXT DEFAULT NULL,

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- Unicità: un solo costo per elemento
  UNIQUE (tipo, id_riferimento)
);

-- ====================================
-- 2) TRIGGER: aggiorna updated_at
-- ====================================
CREATE TRIGGER IF NOT EXISTS tg_bilancio_catalogo_update
AFTER UPDATE ON bilancio_catalogo
FOR EACH ROW
BEGIN
  UPDATE bilancio_catalogo
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;


-- ===============================
-- 3) TABELLA: bilancio_movimenti
-- ===============================
CREATE TABLE IF NOT EXISTS bilancio_movimenti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Categoria del movimento:
  -- "acquisto", "spedizione", "rettifica", "produzione", "scarto", "altro"
  categoria TEXT NOT NULL,

  -- Importo economico (positivo o negativo)
  importo REAL NOT NULL,

  -- Collegamento opzionale a un elemento del magazzino
  tipo_riferimento TEXT DEFAULT NULL,  -- "prodotto" | "accessorio" | "sfuso" | NULL
  id_riferimento INTEGER DEFAULT NULL,

  -- Descrizione libera per operatori
  descrizione TEXT DEFAULT NULL,

  -- Operatore (per audit)
  operatore TEXT DEFAULT 'system',

  -- Timestamp
  data TEXT DEFAULT CURRENT_TIMESTAMP
);
