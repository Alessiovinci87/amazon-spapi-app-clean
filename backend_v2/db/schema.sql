PRAGMA journal_mode = DELETE;
PRAGMA foreign_keys = ON;

-- ===========================
-- Tabelle base
-- ===========================

CREATE TABLE IF NOT EXISTS prodotti (
  asin TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  pronto INTEGER NOT NULL DEFAULT 0,
  family_code TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('12ML','100ML','5L','KIT')),
  pezzi_per_kit INTEGER DEFAULT NULL,
  sfusoLitri INTEGER DEFAULT 0,
  immagine_main TEXT  
);

CREATE TABLE IF NOT EXISTS accessori (
  asin_accessorio TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  quantita INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ricette_accessori (
  family_code     TEXT NOT NULL,
  asin_accessorio TEXT NOT NULL,
  perUnita        INTEGER NOT NULL CHECK (perUnita >= 0),
  PRIMARY KEY (family_code, asin_accessorio),
  FOREIGN KEY (asin_accessorio) REFERENCES accessori(asin_accessorio) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS movimenti (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  tipo            TEXT NOT NULL CHECK (tipo IN (
    'PRODUZIONE',
    'RETTIFICA',
    'CONSUMO_ACCESSORI',
    'REINTEGRO_ACCESSORI'
  )),
  asin_prodotto   TEXT,
  asin_accessorio TEXT,
  delta_pronto    INTEGER DEFAULT 0,
  delta_quantita  INTEGER DEFAULT 0,
  note            TEXT,
  operatore       TEXT,
  id_riferimento  INTEGER,
  FOREIGN KEY (asin_prodotto)   REFERENCES prodotti(asin)             ON DELETE CASCADE,
  FOREIGN KEY (asin_accessorio) REFERENCES accessori(asin_accessorio) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS storico_movimenti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asin_prodotto TEXT,
  asin_accessorio TEXT,
  nome TEXT,
  quantita_precedente INTEGER,
  quantita_nuova INTEGER,
  nota TEXT,
  operatore TEXT,
  tipo TEXT,
  data TEXT DEFAULT (datetime('now'))
);

-- ===========================
-- Nuova tabella: spedizioni
-- ===========================
CREATE TABLE IF NOT EXISTS spedizioni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  progressivo TEXT NOT NULL,
  paese TEXT NOT NULL,
  prodotto_nome TEXT NOT NULL,
  asin TEXT,
  quantita INTEGER NOT NULL,
  data DATE NOT NULL,
  operatore TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Tabelle DDT
-- ===========================
CREATE TABLE IF NOT EXISTS ddt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  progressivo TEXT NOT NULL,
  paese TEXT NOT NULL,
  data DATE NOT NULL,
  operatore TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ddt_righe (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ddt_id INTEGER NOT NULL,
  asin TEXT,
  sku TEXT,
  prodotto_nome TEXT NOT NULL,
  quantita INTEGER NOT NULL,
  FOREIGN KEY (ddt_id) REFERENCES ddt(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS brand (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  logo TEXT NOT NULL,
  intestazione TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ddt_generici (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT,
  numeroDDT TEXT,
  numeroAmazon TEXT,
  data TEXT,
  paese TEXT,
  centro TEXT,
  trasportatore TEXT,
  tracking TEXT,
  totUnita INTEGER,
  totColli INTEGER
);

CREATE TABLE IF NOT EXISTS ddt_generici_righe (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ddt_id INTEGER NOT NULL,
  asin TEXT,
  sku TEXT,
  prodottoNome TEXT,
  quantita INTEGER,
  cartone TEXT,
  pacco TEXT,
  FOREIGN KEY (ddt_id) REFERENCES ddt_generici(id) ON DELETE CASCADE
);

-- 📷 Tabella immagini prodotto
CREATE TABLE IF NOT EXISTS prodotto_immagini (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asin TEXT NOT NULL,
  url TEXT NOT NULL,
  variant TEXT,
  FOREIGN KEY (asin) REFERENCES prodotti(asin) ON DELETE CASCADE
);

-- ===========================
-- Tabella Sfuso
-- ===========================
CREATE TABLE IF NOT EXISTS sfuso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  formato TEXT NOT NULL CHECK (formato IN ('12ml', '100ml')),
  litri_disponibili REAL NOT NULL DEFAULT 0,
  litri_disponibili_old REAL DEFAULT 0,
  lotto TEXT,
  lotto_old TEXT,
  data_inserimento TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ===========================
-- Storico Sfuso (aggiornato)
-- ===========================
CREATE TABLE IF NOT EXISTS storico_sfuso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL DEFAULT (datetime('now')),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'RETTIFICA',
    'PRENOTAZIONE',
    'In lavorazione',
    'MODIFICA_PRODUZIONE',
    'Confermata',
    'Annullata'
  )),
  campo TEXT,
  nuovoValore TEXT,
  nota TEXT,
  operatore TEXT,
  formato TEXT NOT NULL CHECK (formato IN ('12ml','100ml')),
  stato TEXT DEFAULT 'PRENOTAZIONE'
    CHECK (stato IN ('PRENOTAZIONE','In lavorazione','Confermata','Annullata')),
  id_sfuso INTEGER,
  lotto TEXT,
  prodotti INTEGER,
  boccette INTEGER DEFAULT 0,
  tappini INTEGER DEFAULT 0,
  pennellini INTEGER DEFAULT 0,
  priorita TEXT DEFAULT 'Media'
);

-- ===========================
-- Prenotazioni Sfuso (aggiornato)
-- ===========================
CREATE TABLE IF NOT EXISTS prenotazioni_sfuso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_sfuso INTEGER NOT NULL,
  formato TEXT NOT NULL CHECK (formato IN ('12ml','100ml')),
  litriImpegnati REAL NOT NULL,
  lotto TEXT,
  prodotti INTEGER,
  boccette INTEGER DEFAULT 0,
  tappini INTEGER DEFAULT 0,
  pennellini INTEGER DEFAULT 0,
  priorita TEXT DEFAULT 'Media',
  stato TEXT NOT NULL DEFAULT 'PRENOTAZIONE'
    CHECK (stato IN ('PRENOTAZIONE','In lavorazione','Confermata','Annullata')),
  dataRichiesta TEXT NOT NULL DEFAULT (datetime('now')),
  dataInizio TEXT,
  dataFine TEXT,
  note TEXT,
  operatore TEXT,
  FOREIGN KEY (id_sfuso) REFERENCES sfuso(id) ON DELETE CASCADE
);

-- =========================================================
-- 🧪 TABELLA PRODUZIONI SFUSO
-- =========================================================
CREATE TABLE IF NOT EXISTS produzioni_sfuso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_sfuso INTEGER NOT NULL,
  asin_prodotto TEXT NOT NULL,
  nome_prodotto TEXT,
  formato TEXT,
  quantita INTEGER DEFAULT 0,
  litri_usati REAL DEFAULT 0,
  stato TEXT DEFAULT 'Pianificata',
  note TEXT,
  operatore TEXT DEFAULT 'system',
  data_creazione TEXT DEFAULT (datetime('now','localtime')),
  data_effettiva TEXT,
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- =========================================================
-- 🧾 STORICO PRODUZIONI SFUSO
-- =========================================================
CREATE TABLE IF NOT EXISTS storico_produzioni_sfuso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_produzione INTEGER NOT NULL,
  id_sfuso INTEGER,
  asin_prodotto TEXT,
  nome_prodotto TEXT,
  formato TEXT,
  quantita INTEGER,
  litri_usati REAL,
  stato TEXT,
  operatore TEXT,
  azione TEXT CHECK(azione IN ('CREATA','AGGIORNATA','COMPLETATA','ANNULLATA')),
  note TEXT,
  data_evento TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (id_produzione) REFERENCES produzioni_sfuso(id) ON DELETE CASCADE
);




-- ============================================================
-- 🔹 TABELLA: SFUSO_MOVIMENTI
-- Contiene tutti i movimenti relativi ai prodotti sfusi
-- (carichi automatici da DDT + rettifiche manuali)
-- ============================================================

CREATE TABLE IF NOT EXISTS sfuso_movimenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sfuso INTEGER,
    nome_prodotto TEXT,
    formato TEXT,
    lotto TEXT,
    fornitore TEXT,
    tipo TEXT CHECK(tipo IN ('CARICO DDT', 'RETTIFICA')),
    quantita REAL,
    operatore TEXT,
    note TEXT,
    data_movimento TEXT DEFAULT (datetime('now','localtime'))
);

-- ===========================
-- Tabella Produzioni
-- ===========================
CREATE TABLE IF NOT EXISTS produzioni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_sfuso INTEGER NOT NULL,
  asin_prodotto TEXT NOT NULL,
  formato TEXT NOT NULL CHECK (formato IN ('12ml', '100ml')),
  prodotti_richiesti INTEGER NOT NULL DEFAULT 0,
  litri_usati REAL DEFAULT 0,
  stato TEXT NOT NULL DEFAULT 'PRENOTATA'
    CHECK (stato IN ('PRENOTATA','IN_LAVORAZIONE','COMPLETATA','ANNULLATA')),
  data_richiesta TEXT DEFAULT (datetime('now')),
  data_completamento TEXT,
  operatore TEXT,
  note TEXT,
  FOREIGN KEY (id_sfuso) REFERENCES sfuso(id) ON DELETE CASCADE,
  FOREIGN KEY (asin_prodotto) REFERENCES prodotti(asin) ON DELETE CASCADE
);




 
-- =========================================================
-- 🧾 TABELLA STORICO PRODUZIONI SFUSO
-- Registra ogni evento di creazione, modifica o completamento
-- =========================================================
CREATE TABLE IF NOT EXISTS storico_produzioni_sfuso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_produzione INTEGER NOT NULL,
  id_sfuso INTEGER,
  asin_prodotto TEXT,
  nome_prodotto TEXT,
  quantita INTEGER,
  litri_usati REAL,
  evento TEXT NOT NULL CHECK (evento IN ('CREATA', 'AGGIORNATA', 'COMPLETATA', 'ELIMINATA')),
  note TEXT,
  operatore TEXT DEFAULT 'system',
  data_evento TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (id_produzione) REFERENCES produzioni_sfuso(id) ON DELETE CASCADE
);

-- ===========================
-- Tabella CONFIG (impostazioni globali)
-- ===========================
CREATE TABLE IF NOT EXISTS config (
    chiave TEXT PRIMARY KEY,
    valore TEXT
);

-- Inserimento valore default per contatore produzione
INSERT OR IGNORE INTO config (chiave, valore)
VALUES ('counter_produzione', '0');





-- ===========================
-- Dati iniziali
-- ===========================
INSERT OR IGNORE INTO brand (id, nome, logo, intestazione) VALUES
  (1, 'Lookink', '/logos/lookink.png', 'Lookink Srl - Via Roma 1, Alghero'),
  (2, 'C-Side', '/logos/cside.png', 'C-Side Cosmetics - Via Mare 5, Alghero');

INSERT OR IGNORE INTO accessori (asin_accessorio, nome, quantita) VALUES
('BOCCETTA_12_ML', 'Boccetta 12 ml', 1000),
('TAPPO_12_ML', 'Tappo 12 ml', 1000),
('PENNELLO_12_ML', 'Pennello 12 ml', 1000),
('BOCCETTA_100_ML', 'Boccetta 100 ml', 500),
('TAPPO_100_ML', 'Tappo 100 ml', 500);

INSERT OR IGNORE INTO prodotti (asin, nome, pronto, family_code, categoria) VALUES
('B0BY9Q4KTT', 'Antimicotico 12ml', 0, '12ML_STD', '12ML'),
('B095KW4BS4', 'Rimuovi Cuticole 12ml', 0, '12ML_STD', '12ML'),
('B094RK3P5T', 'Rinforzante 12ml', 0, '12ML_STD', '12ML');

INSERT OR IGNORE INTO prodotti (asin, nome, pronto, family_code, categoria) VALUES
('B0DXVQ42VH', 'Cleaner Cocco 100ml', 0, '100ML_STD', '100ML'),
('B08XQQHK37', 'Cleaner 100ml', 0, '100ML_STD', '100ML'),
('B094YJC9HR', 'Remover 100ml', 0, '100ML_STD', '100ML');

INSERT OR IGNORE INTO prodotti (asin, nome, pronto, family_code, categoria) VALUES
('FUSTO_A_5L', 'Fusto Base A 5L', 0, '5L_STD', '5L'),
('FUSTO_B_5L', 'Fusto Base B 5L', 0, '5L_STD', '5L');

INSERT OR IGNORE INTO prodotti (asin, nome, pronto, family_code, categoria, pezzi_per_kit) VALUES
('B0DTJ6H1WD', 'Kit Doppio Remover 12ml', 0, 'KIT_12ML', 'KIT', 2),
('B0DTJ5PVGQ', 'Kit Remover + Cleaner 12ml', 0, 'KIT_12ML', 'KIT', 2),
('B0DKPBB9K4', 'Kit 9 Oli Cuticole 12ml', 0, 'KIT_12ML', 'KIT', 9);

INSERT OR IGNORE INTO ricette_accessori (family_code, asin_accessorio, perUnita) VALUES
('12ML_STD', 'BOCCETTA_12_ML', 1),
('12ML_STD', 'TAPPO_12_ML', 1),
('12ML_STD', 'PENNELLO_12_ML', 1);

INSERT OR IGNORE INTO ricette_accessori (family_code, asin_accessorio, perUnita) VALUES
('100ML_STD', 'BOCCETTA_100_ML', 1),
('100ML_STD', 'TAPPO_100_ML', 1);

INSERT OR IGNORE INTO ricette_accessori (family_code, asin_accessorio, perUnita) VALUES
('KIT_12ML', 'BOCCETTA_12_ML', 1),
('KIT_12ML', 'TAPPO_12_ML', 1),
('KIT_12ML', 'PENNELLO_12_ML', 1);

INSERT OR IGNORE INTO ricette_accessori (family_code, asin_accessorio, perUnita) VALUES
('KIT_100ML', 'BOCCETTA_100_ML', 1),
('KIT_100ML', 'TAPPO_100_ML', 1);
