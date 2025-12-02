BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "_migrations" (
	"id"	INTEGER,
	"name"	TEXT UNIQUE,
	"executed_at"	TEXT DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "accessori" (
	"asin_accessorio"	TEXT,
	"nome"	TEXT NOT NULL,
	"quantita"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("asin_accessorio")
);
CREATE TABLE IF NOT EXISTS "bilancio_catalogo" (
	"id"	INTEGER,
	"tipo"	TEXT NOT NULL,
	"id_riferimento"	INTEGER NOT NULL,
	"costo"	REAL NOT NULL DEFAULT 0,
	"note"	TEXT DEFAULT NULL,
	"created_at"	TEXT DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	TEXT DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("tipo","id_riferimento")
);
CREATE TABLE IF NOT EXISTS "bilancio_movimenti" (
	"id"	INTEGER,
	"categoria"	TEXT NOT NULL,
	"importo"	REAL NOT NULL,
	"tipo_riferimento"	TEXT DEFAULT NULL,
	"id_riferimento"	INTEGER DEFAULT NULL,
	"descrizione"	TEXT DEFAULT NULL,
	"operatore"	TEXT DEFAULT 'system',
	"data"	TEXT DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "brand" (
	"id"	INTEGER,
	"nome"	TEXT NOT NULL,
	"logo"	TEXT NOT NULL,
	"intestazione"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "catalog_images" (
	"asin"	TEXT,
	"image_url"	TEXT,
	"last_update"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("asin")
);
CREATE TABLE IF NOT EXISTS "config" (
	"key"	TEXT,
	"value"	TEXT,
	PRIMARY KEY("key")
);
CREATE TABLE IF NOT EXISTS "ddt" (
	"id"	INTEGER,
	"progressivo"	TEXT NOT NULL,
	"paese"	TEXT NOT NULL,
	"data"	DATE NOT NULL,
	"operatore"	TEXT,
	"note"	TEXT,
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"numero_spedizione"	TEXT,
	"data_ddt"	TEXT,
	"numero_cartone"	INTEGER,
	"numero_pacco"	INTEGER,
	"trasportatore"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "ddt_generici" (
	"id"	INTEGER,
	"brand"	TEXT NOT NULL,
	"numeroDDT"	TEXT NOT NULL,
	"numeroAmazon"	TEXT,
	"data"	TEXT,
	"paese"	TEXT,
	"centro"	TEXT,
	"trasportatore"	TEXT,
	"tracking"	TEXT,
	"totUnita"	INTEGER,
	"totColli"	INTEGER,
	"created_at"	TEXT DEFAULT (datetime('now')),
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "ddt_generici_righe" (
	"id"	INTEGER,
	"ddt_id"	INTEGER NOT NULL,
	"asin"	TEXT,
	"sku"	TEXT,
	"prodottoNome"	TEXT,
	"quantita"	INTEGER,
	"cartone"	TEXT,
	"pacco"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("ddt_id") REFERENCES "ddt_generici"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "ddt_righe" (
	"id"	INTEGER,
	"ddt_id"	INTEGER NOT NULL,
	"asin"	TEXT,
	"sku"	TEXT,
	"prodotto_nome"	TEXT NOT NULL,
	"quantita"	INTEGER NOT NULL,
	"codice_pacco"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("ddt_id") REFERENCES "ddt"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "fba_fees" (
	"asin"	TEXT,
	"sku"	TEXT,
	"country"	TEXT,
	"referral_fee"	REAL DEFAULT 0,
	"fulfillment_fee"	REAL DEFAULT 0,
	"storage_fee"	REAL DEFAULT 0,
	"total_fee"	REAL DEFAULT 0,
	PRIMARY KEY("asin","country")
);
CREATE TABLE IF NOT EXISTS "fba_stock" (
	"asin"	TEXT,
	"sku"	TEXT,
	"product_name"	TEXT,
	"country"	TEXT,
	"quantity"	INTEGER DEFAULT 0,
	"stock_totale"	INTEGER DEFAULT 0,
	"reserved_qty"	INTEGER DEFAULT 0,
	"inbound_working"	INTEGER DEFAULT 0,
	"inbound_shipped"	INTEGER DEFAULT 0,
	"inbound_receiving"	INTEGER DEFAULT 0,
	"unfulfillable_qty"	INTEGER DEFAULT 0,
	PRIMARY KEY("asin","country")
);
CREATE TABLE IF NOT EXISTS "fornitori" (
	"id"	INTEGER,
	"nome"	TEXT NOT NULL,
	"partitaIva"	TEXT,
	"indirizzo"	TEXT,
	"email"	TEXT,
	"telefono"	TEXT,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "fornitori_prodotti" (
	"id"	INTEGER,
	"id_fornitore"	INTEGER NOT NULL,
	"id_sfuso"	INTEGER NOT NULL,
	"prezzo"	REAL DEFAULT 0,
	"note"	TEXT,
	"data_creazione"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("id_fornitore") REFERENCES "fornitori"("id") ON DELETE CASCADE,
	FOREIGN KEY("id_sfuso") REFERENCES "sfuso"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "movimenti" (
	"id"	INTEGER,
	"asin_prodotto"	TEXT,
	"nome_prodotto"	TEXT,
	"tipo_movimento"	TEXT,
	"quantita"	INTEGER,
	"data_movimento"	TEXT DEFAULT CURRENT_TIMESTAMP,
	"note"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "movimenti_backup" (
	"id"	INT,
	"created_at"	TEXT,
	"tipo"	TEXT,
	"asin_prodotto"	TEXT,
	"asin_accessorio"	TEXT,
	"delta_pronto"	INT,
	"delta_quantita"	INT,
	"note"	TEXT,
	"operatore"	TEXT,
	"id_riferimento"	INT
);
CREATE TABLE IF NOT EXISTS "ordini_fornitori" (
	"id"	INTEGER,
	"id_fornitore"	INTEGER NOT NULL,
	"id_sfuso"	INTEGER,
	"asin"	TEXT,
	"quantita_litri"	REAL DEFAULT 0,
	"stato"	TEXT DEFAULT 'In attesa',
	"data_ordine"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"data_consegna_prevista"	DATETIME,
	"data_consegna_effettiva"	DATETIME,
	"note"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("id_fornitore") REFERENCES "fornitori"("id") ON DELETE CASCADE,
	FOREIGN KEY("id_sfuso") REFERENCES "sfuso"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "ordini_fornitori_old" (
	"id"	INTEGER,
	"id_fornitore"	INTEGER NOT NULL,
	"asin"	TEXT NOT NULL,
	"nome_prodotto"	TEXT,
	"formato"	TEXT,
	"quantita_litri"	REAL DEFAULT 0,
	"prezzo_unitario"	REAL DEFAULT 0,
	"costo_totale"	REAL DEFAULT 0,
	"pagamento"	TEXT,
	"stato"	TEXT DEFAULT 'In attesa',
	"data_ordine"	TEXT,
	"note"	TEXT,
	"data_consegna_prevista"	TEXT,
	"data_consegna_effettiva"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("id_fornitore") REFERENCES "fornitori"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "prenotazioni_sfuso" (
	"id"	INTEGER NOT NULL,
	"id_sfuso"	INTEGER,
	"nome_prodotto"	TEXT,
	"formato"	TEXT,
	"stato"	TEXT,
	"note"	TEXT,
	"prodotti"	INTEGER,
	"dataRichiesta"	TEXT,
	"priorita"	TEXT,
	"lotto"	TEXT,
	"operatore"	TEXT,
	"asin_prodotto"	TEXT,
	"litriImpegnati"	REAL,
	"boccette"	INTEGER,
	"tappini"	INTEGER,
	"pennellini"	INTEGER,
	"dataInizio"	TEXT,
	"dataFine"	TEXT,
	"gruppo_fifo"	TEXT,
	"dataConferma"	TEXT,
	"quantita_iniziale"	INTEGER DEFAULT 0,
	"quantita_finale"	INTEGER DEFAULT 0,
	"id_produzione"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "prenotazioni_sfuso_backup" (
	"id"	INTEGER,
	"id_sfuso"	INTEGER,
	"nome_prodotto"	TEXT,
	"formato"	TEXT,
	"stato"	TEXT,
	"note"	TEXT,
	"prodotti"	INTEGER,
	"dataRichiesta"	TEXT,
	"priorita"	TEXT,
	"lotto"	TEXT,
	"operatore"	TEXT,
	"asin_prodotto"	TEXT,
	"litriImpegnati"	REAL DEFAULT 0,
	"boccette"	INTEGER DEFAULT 0,
	"tappini"	INTEGER DEFAULT 0,
	"pennellini"	INTEGER DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "prenotazioni_sfuso_oldfk" (
	"id"	INTEGER,
	"id_sfuso"	INTEGER NOT NULL,
	"nome_prodotto"	TEXT,
	"formato"	TEXT NOT NULL CHECK("formato" IN ('12ml', '100ml')),
	"stato"	TEXT NOT NULL DEFAULT 'PRENOTAZIONE' CHECK("stato" IN ('PRENOTAZIONE', 'In lavorazione', 'Confermata', 'Annullata')),
	"note"	TEXT,
	"prodotti"	INTEGER DEFAULT 0,
	"dataRichiesta"	TEXT NOT NULL DEFAULT (datetime('now')),
	"priorita"	TEXT DEFAULT 'Media',
	"lotto"	TEXT,
	"operatore"	TEXT,
	"asin_prodotto"	TEXT,
	"litriImpegnati"	REAL DEFAULT 0,
	"boccette"	INTEGER DEFAULT 0,
	"tappini"	INTEGER DEFAULT 0,
	"pennellini"	INTEGER DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("id_sfuso") REFERENCES "sfuso_old"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "prodotti" (
	"id"	INTEGER,
	"asin"	TEXT,
	"nome"	TEXT,
	"pronto"	INTEGER DEFAULT 0,
	"family_code"	TEXT,
	"categoria"	TEXT,
	"pezzi_per_kit"	INTEGER DEFAULT 1,
	"sfusoLitri"	INTEGER DEFAULT 0,
	"immagine_main"	TEXT,
	"sku"	TEXT,
	"id_sfuso_collegato"	INTEGER,
	"formato"	TEXT,
	"isKit"	INTEGER DEFAULT 0,
	"isAccessorio"	INTEGER DEFAULT 0,
	"pezziPerKit"	INTEGER DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "prodotti_sfuso" (
	"id"	INTEGER,
	"nome"	TEXT NOT NULL,
	"formato"	TEXT NOT NULL,
	"asin"	TEXT,
	"litri_base"	REAL DEFAULT 5,
	"categoria"	TEXT,
	"prezzo_base"	REAL DEFAULT 0,
	"data_creazione"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "prodotto_immagini_backup" (
	"id"	INT,
	"asin"	TEXT,
	"url"	TEXT,
	"variant"	TEXT
);
CREATE TABLE IF NOT EXISTS "produzioni_sfuso" (
	"id"	INTEGER,
	"id_sfuso"	INTEGER NOT NULL,
	"asin_prodotto"	TEXT,
	"nome_prodotto"	TEXT,
	"formato"	TEXT,
	"stato"	TEXT DEFAULT 'Pianificata',
	"note"	TEXT,
	"prodotti"	INTEGER DEFAULT 0,
	"data_creazione"	TEXT DEFAULT (datetime('now')),
	"data_inizio"	TEXT,
	"data_fine"	TEXT,
	"gruppo_fifo"	TEXT,
	"operatore"	TEXT DEFAULT 'system',
	"quantita"	INTEGER DEFAULT 0,
	"quantita_iniziale"	INTEGER DEFAULT 0,
	"quantita_finale"	INTEGER DEFAULT 0,
	"litri_usati"	REAL DEFAULT 0,
	"data_effettiva"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("id_sfuso") REFERENCES "sfuso"("id")
);
CREATE TABLE IF NOT EXISTS "ricette_accessori" (
	"family_code"	TEXT NOT NULL,
	"asin_accessorio"	TEXT NOT NULL,
	"perUnita"	INTEGER NOT NULL CHECK("perUnita" >= 0),
	PRIMARY KEY("family_code","asin_accessorio"),
	FOREIGN KEY("asin_accessorio") REFERENCES "accessori"("asin_accessorio") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "sales_traffic" (
	"asin"	TEXT,
	"sku"	TEXT,
	"country"	TEXT,
	"units_ordered"	INTEGER DEFAULT 0,
	"ordered_product_sales"	REAL DEFAULT 0,
	"average_sales_per_unit"	REAL DEFAULT 0,
	"conversion_rate"	REAL DEFAULT 0,
	"sessions"	INTEGER DEFAULT 0,
	"page_views"	INTEGER DEFAULT 0,
	PRIMARY KEY("asin","country")
);
CREATE TABLE IF NOT EXISTS "sfuso" (
	"id"	INTEGER,
	"nome_prodotto"	TEXT,
	"formato"	TEXT CHECK("formato" IN ('10ml', '12ml', '100ml')),
	"asin_collegati"	TEXT DEFAULT '[]',
	"fornitore"	TEXT,
	"lotto"	TEXT,
	"lotto_old"	TEXT,
	"litri_disponibili"	REAL DEFAULT 0,
	"litri_disponibili_old"	REAL DEFAULT 0,
	"stato"	TEXT DEFAULT 'attivo',
	"created_at"	TEXT DEFAULT (datetime('now')),
	"updated_at"	TEXT DEFAULT (datetime('now')),
	"litri_in_arrivo"	REAL DEFAULT 0,
	"asin"	TEXT,
	"asin_collegato"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "sfuso_movimenti" (
	"id"	INTEGER,
	"id_sfuso"	INTEGER,
	"nome_prodotto"	TEXT,
	"formato"	TEXT,
	"lotto"	TEXT,
	"fornitore"	TEXT,
	"tipo"	TEXT CHECK("tipo" IN ('CARICO DDT', 'RETTIFICA')),
	"quantita"	REAL,
	"operatore"	TEXT,
	"note"	TEXT,
	"data_movimento"	TEXT DEFAULT (datetime('now', 'localtime')),
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "sfuso_old" (
	"id"	INTEGER,
	"nome_prodotto"	TEXT,
	"formato"	TEXT CHECK("formato" IN ('12ml', '100ml')),
	"litriDisponibili"	REAL DEFAULT 0,
	"lotto"	TEXT,
	"dataAggiornamento"	TEXT DEFAULT (datetime('now')),
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "spedizioni" (
	"id"	INTEGER,
	"progressivo"	TEXT NOT NULL,
	"paese"	TEXT NOT NULL,
	"data"	TEXT NOT NULL,
	"operatore"	TEXT,
	"note"	TEXT,
	"stato"	TEXT NOT NULL DEFAULT 'BOZZA',
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "spedizioni_righe" (
	"id"	INTEGER,
	"spedizione_id"	INTEGER NOT NULL,
	"asin"	TEXT,
	"sku"	TEXT,
	"prodotto_nome"	TEXT NOT NULL,
	"quantita"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("spedizione_id") REFERENCES "spedizioni"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "storico_movimenti" (
	"id"	INTEGER,
	"asin_prodotto"	TEXT,
	"asin_accessorio"	TEXT,
	"nome"	TEXT,
	"quantita_precedente"	INTEGER,
	"quantita_nuova"	INTEGER,
	"nota"	TEXT,
	"operatore"	TEXT,
	"tipo"	TEXT,
	"data"	TEXT DEFAULT (datetime('now')),
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "storico_produzioni_sfuso" (
	"id"	INTEGER,
	"id_produzione"	INTEGER NOT NULL,
	"id_sfuso"	INTEGER,
	"asin_prodotto"	TEXT,
	"nome_prodotto"	TEXT,
	"formato"	TEXT,
	"quantita_iniziale"	INTEGER,
	"quantita_finale"	INTEGER,
	"quantita"	INTEGER,
	"litri_usati"	REAL,
	"evento"	TEXT,
	"note"	TEXT,
	"operatore"	TEXT,
	"data_evento"	TEXT DEFAULT (datetime('now')),
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("id_produzione") REFERENCES "produzioni_sfuso"("id")
);
CREATE TABLE IF NOT EXISTS "storico_sfuso" (
	"id"	INTEGER,
	"tipo"	TEXT CHECK("tipo" IN ('RETTIFICA', 'PRENOTAZIONE', 'FIFO', 'MOD. QUANTITA', 'In lavorazione', 'MODIFICA_PRODUZIONE', 'AGGIORNAMENTO_STATO', 'Confermata', 'Annullata')),
	"campo"	TEXT,
	"nuovoValore"	TEXT,
	"nota"	TEXT,
	"operatore"	TEXT,
	"formato"	TEXT,
	"stato"	TEXT,
	"lotto"	TEXT,
	"prodotti"	INTEGER,
	"boccette"	INTEGER,
	"tappini"	INTEGER,
	"pennellini"	INTEGER,
	"priorita"	TEXT,
	"id_sfuso"	INTEGER,
	"id_prenotazione"	INTEGER,
	"data"	TIMESTAMP DEFAULT (datetime('now', 'localtime')),
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "storico_spedizioni" (
	"id"	INTEGER,
	"spedizione_id"	INTEGER NOT NULL,
	"progressivo"	TEXT NOT NULL,
	"paese"	TEXT NOT NULL,
	"stato"	TEXT NOT NULL,
	"data_operazione"	TEXT NOT NULL DEFAULT (datetime('now')),
	"operatore"	TEXT,
	"note"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("spedizione_id") REFERENCES "spedizioni"("id") ON DELETE CASCADE
);
INSERT INTO "_migrations" VALUES (1,'bilancio.sql','2025-11-24 15:43:08');
INSERT INTO "accessori" VALUES ('BOCCETTA_12_ML','Boccetta 12 ml',2900);
INSERT INTO "accessori" VALUES ('TAPPO_12_ML','Tappo 12 ml',927319);
INSERT INTO "accessori" VALUES ('PENNELLO_12_ML','Pennello 12 ml',927319);
INSERT INTO "accessori" VALUES ('BOCCETTA_100_ML','Boccetta 100 ml',100000039);
INSERT INTO "accessori" VALUES ('TAPPO_100_ML','Tappo 100 ml',1000019);
INSERT INTO "brand" VALUES (1,'Lookink','/logos/lookink.png','Lookink Srl - Via Roma 1, Alghero');
INSERT INTO "brand" VALUES (2,'C-Side','/logos/cside.png','C-Side Cosmetics - Via Mare 5, Alghero');
INSERT INTO "catalog_images" VALUES ('B07THXCC2C','https://m.media-amazon.com/images/I/51S2G9Sl7aL._AC_SL1000_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B08B3YRSQS','https://m.media-amazon.com/images/I/61+QomdnhkL._AC_SL1000_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B08DYB28ZH','https://m.media-amazon.com/images/I/51FVx8S-xiL._SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B08JCWDCF2','https://m.media-amazon.com/images/I/716Zm9s4KQL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B08TX6DKF3','https://m.media-amazon.com/images/I/61Uqu-pIMSL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B08X21RXF1','https://m.media-amazon.com/images/I/71EE0W3IJgL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B08XQQHK37','https://m.media-amazon.com/images/I/61PJtY-6M-L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09238F1VL','https://m.media-amazon.com/images/I/51gWVJnsKOL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0924Q9M9X','https://m.media-amazon.com/images/I/51Zp6xnPOLL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B094RK3P5T','https://m.media-amazon.com/images/I/71xr+iNIgOL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B094YJC9HR','https://m.media-amazon.com/images/I/61hjxwngsQL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B094YPSVWK','https://m.media-amazon.com/images/I/61SuZSJIaeS._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B095KW4BS4','https://m.media-amazon.com/images/I/71uQ1vSTbnL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0963P222M','https://m.media-amazon.com/images/I/71MZotSKIgL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0963P8M6Y','https://m.media-amazon.com/images/I/71SZG3E34yL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0963PCLVR','https://m.media-amazon.com/images/I/81tzOYx5bkL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0963PF48B','https://m.media-amazon.com/images/I/71TWOM5iqbL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0963Q2987','https://m.media-amazon.com/images/I/71s8lQ5v1YL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0963Q6MSP','https://m.media-amazon.com/images/I/719wmTU+AXL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0977FRJ6M','https://m.media-amazon.com/images/I/71XlSfX0aSL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09CL6RMWZ','https://m.media-amazon.com/images/I/61YLO32JLiL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09DQ3KH7Q','https://m.media-amazon.com/images/I/613-x2ZbsiL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09DQ4RTG1','https://m.media-amazon.com/images/I/61gAG1+43fL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09DQ5457F','https://m.media-amazon.com/images/I/61gAG1+43fL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09DQ62H25','https://m.media-amazon.com/images/I/61gAG1+43fL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09FLX9CQV','https://m.media-amazon.com/images/I/51Z03K9+57L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09G32LP1C','https://m.media-amazon.com/images/I/61rN+6liVVL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09GVR44Z7','https://m.media-amazon.com/images/I/61zR52h3D8L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09H7PB9XT','https://m.media-amazon.com/images/I/71Npmhu9Q+L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09JZJ2PL6','https://m.media-amazon.com/images/I/61bxlIeikXL._SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09JZJTY1D','https://m.media-amazon.com/images/I/61bxlIeikXL._SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09JZJVF9J','https://m.media-amazon.com/images/I/61VuVnmXF2L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09JZK3SQL','https://m.media-amazon.com/images/I/61bxlIeikXL._SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09JZLHKRP','https://m.media-amazon.com/images/I/61bxlIeikXL._SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09NMH29QH','https://m.media-amazon.com/images/I/51FVx8S-xiL._SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09VY4M2R4','https://m.media-amazon.com/images/I/714WZp4JyGL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09VY51ZFF','https://m.media-amazon.com/images/I/71i2H7qPalL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09WYYBFX2','https://m.media-amazon.com/images/I/61hjxwngsQL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B09WZ1TQNV','https://m.media-amazon.com/images/I/61hjxwngsQL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BK9QLKN1','https://m.media-amazon.com/images/I/71JAS6cF+ZL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNV5ZKD','https://m.media-amazon.com/images/I/71gS+WpaSAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNWJ2KV','https://m.media-amazon.com/images/I/71t9cGHlfBL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNWPRDZ','https://m.media-amazon.com/images/I/71IwdpYFFKL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNWQJ6D','https://m.media-amazon.com/images/I/71DawYNbckL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNWQKG2','https://m.media-amazon.com/images/I/71LAun8knPL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNWY2GC','https://m.media-amazon.com/images/I/710xPXg7nrL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNX2188','https://m.media-amazon.com/images/I/71wrmhtbNPL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNX2B48','https://m.media-amazon.com/images/I/71Vc-xLMLaL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNX35MB','https://m.media-amazon.com/images/I/71VSKBAVhWL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNX8727','https://m.media-amazon.com/images/I/71Djpq+SZBL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNX9M9F','https://m.media-amazon.com/images/I/71L-ySatQLL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNXCX65','https://m.media-amazon.com/images/I/71ZOQgVCNdL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNXGN4F','https://m.media-amazon.com/images/I/71LAun8knPL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNXMR2G','https://m.media-amazon.com/images/I/71+FgHJglzL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNXPD6Y','https://m.media-amazon.com/images/I/71bGEa0hfBL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNXTJXY','https://m.media-amazon.com/images/I/71LAun8knPL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNXWWGJ','https://m.media-amazon.com/images/I/71LAun8knPL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNY2LVV','https://m.media-amazon.com/images/I/714FxVGW2JL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNY5GTZ','https://m.media-amazon.com/images/I/71JM9R-UctL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNY5PZY','https://m.media-amazon.com/images/I/71y5BWGoXIL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNYJB5T','https://m.media-amazon.com/images/I/71LAun8knPL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNYP3BH','https://m.media-amazon.com/images/I/71P63LzBCAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNYPL9H','https://m.media-amazon.com/images/I/71CYv-CjfyL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNYQKLN','https://m.media-amazon.com/images/I/71ErBmD6jqL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNYZFDN','https://m.media-amazon.com/images/I/71LAun8knPL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNZ3CKM','https://m.media-amazon.com/images/I/71eCsFXdrlL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNZC6Z9','https://m.media-amazon.com/images/I/71rGoARFrnL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNZF8V3','https://m.media-amazon.com/images/I/71j5ZDIrRFL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNZJ2XS','https://m.media-amazon.com/images/I/71td9+G5ovL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNZLQW5','https://m.media-amazon.com/images/I/71olyD1NXAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNZRB36','https://m.media-amazon.com/images/I/719H6UItlvL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNZRMS9','https://m.media-amazon.com/images/I/71k6UuWLMWL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNNZSC6G','https://m.media-amazon.com/images/I/71+FgHJglzL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BNP25WPZ','https://m.media-amazon.com/images/I/71LAun8knPL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0BY9Q4KTT','https://m.media-amazon.com/images/I/71BLmRrLaEL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C4L8PHF9','https://m.media-amazon.com/images/I/81GNDxt-dLL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C4L9ZYNY','https://m.media-amazon.com/images/I/71xRxxZJybL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C4TF7MFH','https://m.media-amazon.com/images/I/71tHS+InL6L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C5Y4QWG2','https://m.media-amazon.com/images/I/71vOLIRlQVL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BGKYH3','https://m.media-amazon.com/images/I/71dv2O26HAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BHNTSK','https://m.media-amazon.com/images/I/71dv2O26HAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BJ9RSY','https://m.media-amazon.com/images/I/71dv2O26HAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BJCFRY','https://m.media-amazon.com/images/I/71dv2O26HAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BJNNGZ','https://m.media-amazon.com/images/I/71dv2O26HAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BK37Q5','https://m.media-amazon.com/images/I/71dv2O26HAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BK5TLH','https://m.media-amazon.com/images/I/71dv2O26HAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BLBJV1','https://m.media-amazon.com/images/I/71dv2O26HAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BM925T','https://m.media-amazon.com/images/I/71WFFPRqUcL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BMXBQH','https://m.media-amazon.com/images/I/71dv2O26HAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C8BNK6KS','https://m.media-amazon.com/images/I/71dv2O26HAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QG725S','https://m.media-amazon.com/images/I/81mVkKy3ykL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QG7FZ2','https://m.media-amazon.com/images/I/81mVkKy3ykL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QGQPCT','https://m.media-amazon.com/images/I/81sHvboRxkL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QHFB5Y','https://m.media-amazon.com/images/I/81mVkKy3ykL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QHPG3Q','https://m.media-amazon.com/images/I/81wMfP3KTFL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QJ2W5H','https://m.media-amazon.com/images/I/81mVkKy3ykL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QJBSFR','https://m.media-amazon.com/images/I/81mVkKy3ykL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QJD1JV','https://m.media-amazon.com/images/I/814Zyy6yoeL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QJFNRT','https://m.media-amazon.com/images/I/81mVkKy3ykL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QJMK7T','https://m.media-amazon.com/images/I/81mVkKy3ykL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QJV244','https://m.media-amazon.com/images/I/81P1aeaPBAL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QK6BY6','https://m.media-amazon.com/images/I/81mVkKy3ykL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QK6W2J','https://m.media-amazon.com/images/I/81OX-oNy5IL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0C9QKH1TX','https://m.media-amazon.com/images/I/81mVkKy3ykL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CFB8PV37','https://m.media-amazon.com/images/I/71KXqLbzb-L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CFB8SZYB','https://m.media-amazon.com/images/I/71KXqLbzb-L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CFBBL77X','https://m.media-amazon.com/images/I/71vW-ewCeDL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CFBC4MCP','https://m.media-amazon.com/images/I/71ZeBp39iyL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CHMJ7HW8','https://m.media-amazon.com/images/I/71JPs5YT3gL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CHMK39L9','https://m.media-amazon.com/images/I/71GxEmNn1vL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CHMK6QTY','https://m.media-amazon.com/images/I/71KqB0aLaqL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CHMLJD7K','https://m.media-amazon.com/images/I/713y0SR7EpL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CLS1H8MF','https://m.media-amazon.com/images/I/7162jAAUqwL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5GF8TP','https://m.media-amazon.com/images/I/71Fu3Z1Vw3L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5GGYR4','https://m.media-amazon.com/images/I/71lgRYjqQ6L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5GJTT8','https://m.media-amazon.com/images/I/71nUjxDcVoL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5GN72K','https://m.media-amazon.com/images/I/71VoI0WjPvL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5GQH4N','https://m.media-amazon.com/images/I/71UUucyhwQL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5HJGFS','https://m.media-amazon.com/images/I/71+Q-uTp63L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5HNYKP','https://m.media-amazon.com/images/I/71Lnk-NaTYL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5HRH87','https://m.media-amazon.com/images/I/710qSy1foTL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5HRS3V','https://m.media-amazon.com/images/I/711F+tnSClL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5HSSM6','https://m.media-amazon.com/images/I/71gx68SuXhL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5HTL3X','https://m.media-amazon.com/images/I/71dU1c6sa1L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5HX243','https://m.media-amazon.com/images/I/71ks5W9goOL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5HX7HG','https://m.media-amazon.com/images/I/71ak6HbNQhL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5J8PFK','https://m.media-amazon.com/images/I/71lgRYjqQ6L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5JDCXT','https://m.media-amazon.com/images/I/712HOiHgqxL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5JLZFN','https://m.media-amazon.com/images/I/71grZfBTDcL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5JNDVH','https://m.media-amazon.com/images/I/71O98M0qkPL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5JS2TW','https://m.media-amazon.com/images/I/71xt0vsU54L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5JV4KC','https://m.media-amazon.com/images/I/71XY-l6CkJL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5JZH2B','https://m.media-amazon.com/images/I/71zBGNfhziL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5K2N9B','https://m.media-amazon.com/images/I/71nUXF-owUL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5K9B5Y','https://m.media-amazon.com/images/I/71Kh1PXXm1L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5KDR5Z','https://m.media-amazon.com/images/I/71OHsgQmVrL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5KLF9P','https://m.media-amazon.com/images/I/71lgRYjqQ6L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5KSMYS','https://m.media-amazon.com/images/I/71BdtCUbYJL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CQ5Q5DLM','https://m.media-amazon.com/images/I/71lgRYjqQ6L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CVB9GWPW','https://m.media-amazon.com/images/I/71YGrxnDgzL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CVS15HDW','https://m.media-amazon.com/images/I/715KztJm-DL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0CVSDGZBP','https://m.media-amazon.com/images/I/71UBCXtJCDL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGWXXBM','https://m.media-amazon.com/images/I/71-f9LflwVL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGXDFLT','https://m.media-amazon.com/images/I/719b1KHm4cL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGYBWDH','https://m.media-amazon.com/images/I/71OGSR-eoIL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGYDWYH','https://m.media-amazon.com/images/I/71wUqeRQvTL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGYG2DK','https://m.media-amazon.com/images/I/71IE-xnAjGL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGYH1W6','https://m.media-amazon.com/images/I/71MHgg0Nv-L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGYL427','https://m.media-amazon.com/images/I/71Jc1rvrsEL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGZ2PVC','https://m.media-amazon.com/images/I/71w1mMTRP1L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGZHMWL','https://m.media-amazon.com/images/I/71+uvGMJlsL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGZLQ54','https://m.media-amazon.com/images/I/71hkZadIJsL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGZRVBN','https://m.media-amazon.com/images/I/71Ard4ijjOL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGGZX8SH','https://m.media-amazon.com/images/I/71iYy0LfU-L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGH1262Z','https://m.media-amazon.com/images/I/71C9ZBWy8pL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGH19R3X','https://m.media-amazon.com/images/I/71R2QygBI0L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGH1CHWH','https://m.media-amazon.com/images/I/71AsSCTDdkL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGH1FZ98','https://m.media-amazon.com/images/I/71GM2M1qF7L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGH1JVYT','https://m.media-amazon.com/images/I/71cobVzCH0L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGH1NMB3','https://m.media-amazon.com/images/I/71Wuk6zNjRL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGH2K7ZG','https://m.media-amazon.com/images/I/71SM2zbru-L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DGH31BMM','https://m.media-amazon.com/images/I/71fxgkA5unL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DHVH4TLZ','https://m.media-amazon.com/images/I/71AsSCTDdkL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DHVJ1VH6','https://m.media-amazon.com/images/I/71AsSCTDdkL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DHXZ9XP8','https://m.media-amazon.com/images/I/71yTmWI5w6L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DKPBB9K4','https://m.media-amazon.com/images/I/81tzOYx5bkL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DKTQXDR9','https://m.media-amazon.com/images/I/71a+IsaPASL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DKTRN6DK','https://m.media-amazon.com/images/I/71BLmRrLaEL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DKXXRMZS','https://m.media-amazon.com/images/I/71uQ1vSTbnL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DKXXYCRD','https://m.media-amazon.com/images/I/71uQ1vSTbnL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DT4JG66N','https://m.media-amazon.com/images/I/61JoOK2HTBL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DT4KHJVT','https://m.media-amazon.com/images/I/61ji7gCvDpL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DT4L4HQR','https://m.media-amazon.com/images/I/61ji7gCvDpL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DTJ5PVGQ','https://m.media-amazon.com/images/I/61hjxwngsQL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DTJ6H1WD','https://m.media-amazon.com/images/I/61hjxwngsQL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DTZ4W4RT','https://m.media-amazon.com/images/I/71kTYGDfu8L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DTZ5PPPB','https://m.media-amazon.com/images/I/71kTYGDfu8L._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0DXVQ42VH','https://m.media-amazon.com/images/I/71nUw2S2hzL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0FGQPZWQP','https://m.media-amazon.com/images/I/612YPjakOuL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0FJMF75RR','https://m.media-amazon.com/images/I/71qWXLdJKiL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "catalog_images" VALUES ('B0FJMGRDBJ','https://m.media-amazon.com/images/I/71kTbeF86RL._AC_SL1500_.jpg','2025-10-13T09:43:59.144Z');
INSERT INTO "config" VALUES ('produzione_counter','0');
INSERT INTO "ddt" VALUES (1,'IT-4','IT','2025-09-11','','','2025-09-11 15:37:20','1','2025-09-18',2,2,'GLS');
INSERT INTO "ddt" VALUES (2,'IT-4','IT','2025-09-11','','','2025-09-12 08:32:26','','','','','GLS');
INSERT INTO "ddt_generici" VALUES (1,'lookink','21','','2025-09-01','Italia','BLQ1 - 45020 Castelguglielmo, Provincia di Rovigo','GLS','21',21,0,'2025-09-18 14:11:04');
INSERT INTO "ddt_generici" VALUES (2,'lookink','21','12','2025-09-17','Italia','BLQ1 - 45020 Castelguglielmo, Provincia di Rovigo','GLS','123',1,0,'2025-09-18 14:36:53');
INSERT INTO "ddt_generici" VALUES (3,'lookink','21','12','2025-09-17','Italia','BLQ1 - 45020 Castelguglielmo, Provincia di Rovigo','GLS','123',1,0,'2025-09-18 14:37:58');
INSERT INTO "ddt_generici" VALUES (4,'lookink','21','12','2025-09-17','Italia','BLQ1 - 45020 Castelguglielmo, Provincia di Rovigo','GLS','123',1,0,'2025-09-18 14:39:18');
INSERT INTO "ddt_generici" VALUES (5,'lookink','21','12','2025-09-17','Italia','BLQ1 - 45020 Castelguglielmo, Provincia di Rovigo','GLS','123',1,0,'2025-09-18 14:43:58');
INSERT INTO "ddt_generici" VALUES (6,'lookink','12','we','2025-09-11','Italia','BLQ1 - 45020 Castelguglielmo, Provincia di Rovigo','GLS','ewq',0,0,'2025-09-23 08:56:18');
INSERT INTO "ddt_generici" VALUES (7,'lookink','21','321','2025-09-23','Italia','MXP5 - 20023 Vercelli, Lombardia','GLS','213',0,0,'2025-09-23 09:20:38');
INSERT INTO "ddt_generici" VALUES (8,'cside','213','321','2025-09-23','Francia','321','BRT','321',0,0,'2025-09-23 11:55:30');
INSERT INTO "ddt_generici" VALUES (9,'cside','213','321','2025-09-23','Francia','324','BRT','321',1,0,'2025-09-23 11:57:02');
INSERT INTO "ddt_generici" VALUES (10,'cside','213','321','2025-09-23','Francia','324','BRT','321',1,0,'2025-09-23 11:57:17');
INSERT INTO "ddt_generici" VALUES (11,'cside','213','321','2025-09-23','Francia','324','BRT','321',1,0,'2025-09-23 11:58:00');
INSERT INTO "ddt_generici" VALUES (12,'lookink','231','4314','2025-09-23','Italia','321','BRT','321',2,0,'2025-09-23 12:01:22');
INSERT INTO "ddt_generici" VALUES (13,'cside','123','321','2025-09-23','Italia','321','GLS','321',2,0,'2025-09-23 12:09:50');
INSERT INTO "ddt_generici" VALUES (14,'pics','FBA15KWKBWL0','2SH5YXJY','2025-09-23','Italia','TRN3 - Str. John Fitzgerald Kennedy - 15122 - Alessandria, Piedmont - Italy','GLS','SS660036503',810,0,'2025-09-23 12:14:16');
INSERT INTO "ddt_generici" VALUES (15,'lookink','WS','EWQ','2025-09-22','Italia','EWQEQ','GLS','EWQ',100,1,'2025-09-23 12:35:13');
INSERT INTO "ddt_generici" VALUES (16,'lookink','WS','EWQ','2025-09-22','Italia','EWQEQ','GLS','EWQ',100,1,'2025-09-23 12:35:53');
INSERT INTO "ddt_generici" VALUES (17,'lookink','WS','EWQ','2025-09-22','Italia','EWQEQ','GLS','EWQ',100,1,'2025-09-23 12:37:02');
INSERT INTO "ddt_generici" VALUES (18,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:05:49');
INSERT INTO "ddt_generici" VALUES (19,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:07:40');
INSERT INTO "ddt_generici" VALUES (20,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:08:23');
INSERT INTO "ddt_generici" VALUES (21,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:08:37');
INSERT INTO "ddt_generici" VALUES (22,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:11:16');
INSERT INTO "ddt_generici" VALUES (23,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:11:53');
INSERT INTO "ddt_generici" VALUES (24,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:15:01');
INSERT INTO "ddt_generici" VALUES (25,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:16:55');
INSERT INTO "ddt_generici" VALUES (26,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:18:23');
INSERT INTO "ddt_generici" VALUES (27,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:18:48');
INSERT INTO "ddt_generici" VALUES (28,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:20:03');
INSERT INTO "ddt_generici" VALUES (29,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:21:52');
INSERT INTO "ddt_generici" VALUES (30,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:22:04');
INSERT INTO "ddt_generici" VALUES (31,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:22:13');
INSERT INTO "ddt_generici" VALUES (32,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:23:03');
INSERT INTO "ddt_generici" VALUES (33,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 08:38:48');
INSERT INTO "ddt_generici" VALUES (34,'pics','FBA15KWL172G','2T7UBRDO','2025-09-23','Inghilterra','Amazon UK Services Ltd. LBA4_IP9 Amazon
Unit IP9 Toronto Way
New Rossington, DONCASTER DN11 0GU
GB (LBA4)','TNT','',600,2,'2025-09-24 09:31:25');
INSERT INTO "ddt_generici" VALUES (35,'pics','FBA15KWL315T','5Z8VMZ9V','2025-09-23','Inghilterra','XLP1 - Great Bear AFTX (Deeside, UK)
Deeside Industrial Park, Zone 3
Weighbridge Road
DEESIDE, Flintshire CH5 2LL
GB (XLP1)','TNT','754386533',550,4,'2025-09-25 08:47:54');
INSERT INTO "ddt_generici" VALUES (36,'lookink','FBA15KX0VKXZ','','2025-09-26','Italia','TRN3 - Str. John Fitzgerald Kennedy - 15122 - Alessandria, Piedmont - Italy','GLS','',100,1,'2025-09-26 08:58:11');
INSERT INTO "ddt_generici" VALUES (37,'lookink','FBA15KX0Z2YB ','','2025-09-26','Francia','CDG7 - 1 avenue Alain Boucher Parc d''activites des Portes de Senlis - 60300 - Senlis, Oise - France','GLS','',50,1,'2025-09-26 09:01:40');
INSERT INTO "ddt_generici" VALUES (38,'lookink','FBA15KX0648R','','2025-09-26','Spagna','ZAZ1 - Polígono – Plataforma Logística de Zaragoza Parcelas: ALI-28 y ALI-2 - 50197 - Zaragoza, Aragon - Spain','GLS','',100,1,'2025-09-26 09:06:12');
INSERT INTO "ddt_generici" VALUES (39,'pics','FBA15KXLT63Y','7E5HZPIA','2025-10-01','Italia','Amazon EU SARL - TRN3
Str. John Fitzgerald Kennedy
15122 Alessandria Piedmont
Italia','UPS','1ZH814V46821810189',950,5,'2025-10-01 15:00:18');
INSERT INTO "ddt_generici" VALUES (40,'pics','FBA15KXLT63Y','7E5HZPIA','2025-10-01','Italia','Amazon - BGY1
Via Primo Maggio 8
24050 Cividate al Piano BERGAMO
Italia','UPS','1ZH814V46810768818',300,1,'2025-10-01 15:03:41');
INSERT INTO "ddt_generici" VALUES (41,'pics','FBA15KY16KS2','421Y3VQT','2025-10-07','Italia','Amazon Italia Logistica S.r.l
Strada Dogana Po, 2U
Castel San Giovanni (PC) 29015
IT (MXP5)','GLS','',75,3,'2025-10-08 10:35:15');
INSERT INTO "ddt_generici" VALUES (42,'pics','FBA15KY1B87G','4IOSIVGY','2025-10-07','Italia','Amazon EU SARL - TRN3
Str. John Fitzgerald Kennedy
Alessandria, Piedmont 15122
IT (TRN3)','GLS','',135,3,'2025-10-08 10:38:24');
INSERT INTO "ddt_generici" VALUES (43,'pics','FBA15KY16KS2','4IOSIVGY','2025-10-07','Italia','Amazon Italia Logistica S.r.l
Strada Dogana Po, 2U
Castel San Giovanni (PC) 29015
IT (MXP5)','GLS','SS660039153',210,6,'2025-10-08 10:48:44');
INSERT INTO "ddt_generici" VALUES (44,'pics','FBA15KY1B87G','4IOSIVGY','2025-10-07','Italia','Amazon EU SARL - TRN3
Str. John Fitzgerald Kennedy
Alessandria, Piedmont 15122
IT (TRN3)','GLS','SS660039155',1532,39,'2025-10-08 11:09:52');
INSERT INTO "ddt_generici" VALUES (45,'pics','FBA15L01J17F','3CB21WXI','2025-10-22','Francia','XVA1 - CEVA AFTX (Bussy-Lettree, FR)
5 Rue Henri Guillaumet
CEVA Logistics
Bussy-Lettree, Marne 51320
FR (XVA1)','GLS','SS660041531',650,4,'2025-10-22 09:52:48');
INSERT INTO "ddt_generici" VALUES (46,'pics','FBA15L02Q0J8','7HR1VTWI','2025-10-22','Germania','XFR4 - IDL AFT-X (Estorf, DE)
Mittelweserpark
Brakenhof 20/24
Estorf, Lower Saxony 31629
DE (XFR4)','GLS','',700,4,'2025-10-22 11:14:17');
INSERT INTO "ddt_generici" VALUES (47,'lookink','FBA15L1JLB2C','','2025-11-03','Italia','Amazon EU SARL - TRN3
Str. John Fitzgerald Kennedy
Alessandria, Piedmont 15122
IT (TRN3)','GLS','',200,1,'2025-11-03 11:32:52');
INSERT INTO "ddt_generici" VALUES (48,'lookink','FBA15L1JLX50','','2025-11-03','Spagna','Amazon - ZAZ1
Polígono – Plataforma Logística de Zaragoza
Parcelas: ALI-28 y ALI-2
Zaragoza, Aragon 50197
ES (ZAZ1)','GLS','',250,2,'2025-11-03 11:39:30');
INSERT INTO "ddt_generici_righe" VALUES (1,41,'B0CQ5KLF9P','R7-FJQW-1VXR','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Burgundy - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'1.0','FBA15KY16KS2U000001');
INSERT INTO "ddt_generici_righe" VALUES (2,41,'B0CQ5HRH87','X3-ZQJ3-GJCJ','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Milky Soft Nude - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',15,'1.0','FBA15KY16KS2U000001');
INSERT INTO "ddt_generici_righe" VALUES (3,41,'B0CQ5JV4KC','WN-8WZ9-FI4I','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Milky Soft Nude - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',15,'1.0','FBA15KY16KS2U000001');
INSERT INTO "ddt_generici_righe" VALUES (4,42,'B0CQ5J8PFK','8Y-55XM-19M6','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Pink - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'2.0','FBA15KY16KS2U000002');
INSERT INTO "ddt_generici_righe" VALUES (5,42,'B0CQ5JNDVH','4F-I2CW-R76M','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Milky Soft Pink Clear - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'2.0','FBA15KY16KS2U000002');
INSERT INTO "ddt_generici_righe" VALUES (6,42,'B0CQ5HRS3V','IA-1PNP-V6CQ','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Soft Pink - Colore Permanente Rosa - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'2.0','FBA15KY16KS2U000002');
INSERT INTO "ddt_generici_righe" VALUES (7,43,'B0CQ5KLF9P','R7-FJQW-1VXR','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Burgundy - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'1.0','FBA15KY16KS2U000001');
INSERT INTO "ddt_generici_righe" VALUES (8,43,'B0CQ5HRH87','X3-ZQJ3-GJCJ','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Mercury Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',15,'1.0','FBA15KY16KS2U000001');
INSERT INTO "ddt_generici_righe" VALUES (9,43,'B0CQ5JV4KC','WN-8WZ9-FI4I','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Milky Soft Nude - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',15,'1.0','FBA15KY16KS2U000001');
INSERT INTO "ddt_generici_righe" VALUES (10,43,'B0CQ5J8PFK','8Y-55XM-19M6','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Pink - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'2.0','FBA15KY16KS2U000002');
INSERT INTO "ddt_generici_righe" VALUES (11,43,'B0CQ5JNDVH','4F-I2CW-R76M','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Milky Soft Pink Clear - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'2.0','FBA15KY16KS2U000002');
INSERT INTO "ddt_generici_righe" VALUES (12,43,'B0CQ5HRS3V','IA-1PNP-V6CQ','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Soft Pink - Colore Permanente Rosa - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'2.0','FBA15KY16KS2U000002');
INSERT INTO "ddt_generici_righe" VALUES (13,44,'B0DGH1NMB3','6T-6W7X-Q9T4','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Verde Petrolio - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'1.0','FBA15KY1B87GU000001');
INSERT INTO "ddt_generici_righe" VALUES (14,44,'B0DGH1FZ98','W4-RN92-S4T7','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Vino - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'1.0','FBA15KY1B87GU000001');
INSERT INTO "ddt_generici_righe" VALUES (15,44,'B0DGGYL427','W8-KPWB-GKZ1','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Blu - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',20,'1.0','FBA15KY1B87GU000001');
INSERT INTO "ddt_generici_righe" VALUES (16,44,'B0DGGZ2PVC','QC-TZQ2-FZK9','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Grigio Blu Chiaro - Smalto Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'1.0','FBA15KY1B87GU000001');
INSERT INTO "ddt_generici_righe" VALUES (17,44,'B0CQ5GF8TP','IV-L3VC-OG4K','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'2.0','FBA15KY1B87GU000002');
INSERT INTO "ddt_generici_righe" VALUES (18,44,'B0CQ5GJTT8','8W-RRL7-0S15','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Fucsia Cherry - Smalto Per Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'2.0','FBA15KY1B87GU000002');
INSERT INTO "ddt_generici_righe" VALUES (19,44,'B0CQ5HTL3X','XI-Y2HS-AW1W','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Nero - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'2.0','FBA15KY1B87GU000002');
INSERT INTO "ddt_generici_righe" VALUES (20,44,'B0CQ5JZH2B','48-U0XC-WJ3U','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Bubble Pink - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'2.0','FBA15KY1B87GU000002');
INSERT INTO "ddt_generici_righe" VALUES (21,44,'B0CQ5K9B5Y','I3-MES4-BCW3','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Champagne Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',30,'3.0','FBA15KY1B87GU000003');
INSERT INTO "ddt_generici_righe" VALUES (22,44,'B0CQ5K2N9B','TD-RU51-57WD','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Blu Sky Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',30,'3.0','FBA15KY1B87GU000003');
INSERT INTO "ddt_generici_righe" VALUES (23,44,'B0CQ5HJGFS','HS-3OH4-3UUQ','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Lilla Silver Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',30,'3.0','FBA15KY1B87GU000003');
INSERT INTO "ddt_generici_righe" VALUES (24,44,'B0DHXZ9XP8','RF-H7DI-RZFB','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Nettare di Pesca - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'3.0','FBA15KY1B87GU000003');
INSERT INTO "ddt_generici_righe" VALUES (25,44,'B0CQ5HX7HG','UN-N053-TM0O','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Pink Nude - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'4.0','FBA15KY1B87GU000004');
INSERT INTO "ddt_generici_righe" VALUES (26,44,'B0CQ5JS2TW','UF-CCFB-LE80','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Soft Nude - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'4.0','FBA15KY1B87GU000004');
INSERT INTO "ddt_generici_righe" VALUES (27,44,'B0CQ5GN72K','JT-L6NC-LPAA','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Beige Nude - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'4.0','FBA15KY1B87GU000004');
INSERT INTO "ddt_generici_righe" VALUES (28,44,'B0CQ5GGYR4','1E-2POT-RVIZ','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Bianco Intenso - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',42,'4.0','FBA15KY1B87GU000004');
INSERT INTO "ddt_generici_righe" VALUES (29,44,'B0CQ5HX243','RE-ZAE7-KSET','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Puro - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'5.0','FBA15KY1B87GU000005');
INSERT INTO "ddt_generici_righe" VALUES (30,44,'B0CQ5HNYKP','GF-JCW2-BSLX','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Sangue - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'5.0','FBA15KY1B87GU000005');
INSERT INTO "ddt_generici_righe" VALUES (31,44,'B0CQ5KSMYS','ST-347T-I20K','Smalto Semipermanente Unghie One Step Uv/Led 10 ml - Rosso Scuro Semi Trasparente - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'5.0','FBA15KY1B87GU000005');
INSERT INTO "ddt_generici_righe" VALUES (32,44,'B0CQ5JLZFN','KY-M2P5-05G1','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Intenso - Smalto Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'5.0','FBA15KY1B87GU000005');
INSERT INTO "ddt_generici_righe" VALUES (33,44,'B0CQ5KDR5Z','45-XTR9-JGRD','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Beige - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'6.0','FBA15KY1B87GU000006');
INSERT INTO "ddt_generici_righe" VALUES (34,44,'B0CQ5JDCXT','MD-IHFO-VTWA','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Snow White Glitter- Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',30,'6.0','FBA15KY1B87GU000006');
INSERT INTO "ddt_generici_righe" VALUES (35,44,'B0CQ5HSSM6','XE-KBV5-3WW1','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Milky Soft Beige - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat SKU: XE-KBV5-3WW1',30,'6.0','FBA15KY1B87GU000006');
INSERT INTO "ddt_generici_righe" VALUES (36,44,'B0CQ5GQH4N','2X-76K5-RQY2','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Bianco Latte Semi Trasparente - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'6.0','FBA15KY1B87GU000006');
INSERT INTO "ddt_generici_righe" VALUES (37,44,'B0DGGWXXBM','2T-3P2S-77QH','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Magenta Porpora - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'7.0','FBA15KY1B87GU000007');
INSERT INTO "ddt_generici_righe" VALUES (38,44,'B0DGGYH1W6','KJ-RVXP-NIA5','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Sangria - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'7.0','FBA15KY1B87GU000007');
INSERT INTO "ddt_generici_righe" VALUES (39,44,'B0DGH1JVYT','QB-MVPL-3EZR','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Rubino Scuro - Colore Permanente Rosa - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'7.0','FBA15KY1B87GU000007');
INSERT INTO "ddt_generici_righe" VALUES (40,44,'B0DGH31BMM','IP-WFDZ-U3U1','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosa Antico - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'7.0','FBA15KY1B87GU000007');
INSERT INTO "ddt_generici_righe" VALUES (41,44,'B0DGGXDFLT','Z8-7NPI-DXEH','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Cioccolato al Latte - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'8.0','FBA15KY1B87GU000008');
INSERT INTO "ddt_generici_righe" VALUES (42,44,'B0DGH19R3X','EI-YQNH-JWN4','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Grigio Chiaro- Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'8.0','FBA15KY1B87GU000008');
INSERT INTO "ddt_generici_righe" VALUES (43,44,'B0DGGZRVBN','JF-51UN-53XD','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Grigio Scuro - Smalto Per Unghie Subito Brillanti Con o Senza Base e Top Coat',30,'8.0','FBA15KY1B87GU000008');
INSERT INTO "ddt_generici_righe" VALUES (44,44,'B0DGGYDWYH','HY-VV22-R5O3','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Grigio - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'8.0','FBA15KY1B87GU000008');
INSERT INTO "ddt_generici_righe" VALUES (45,44,'B0DGGYBWDH','27-IVD3-CDZN','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Verde Chiaro Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',15,'9.0','FBA15KY1B87GU000009');
INSERT INTO "ddt_generici_righe" VALUES (46,44,'B0DGH2K7ZG','6J-TI1C-Z3WK','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Lilla Glitter Trasparente - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',30,'9.0','FBA15KY1B87GU000009');
INSERT INTO "ddt_generici_righe" VALUES (47,44,'B0DGGYG2DK','KK-USIC-NSGP','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosa Glitter Trasparente - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',15,'9.0','FBA15KY1B87GU000009');
INSERT INTO "ddt_generici_righe" VALUES (48,44,'B0DGGZLQ54','2B-0CRB-3K1A','Smalto Semipermanente Unghie One Step Uv/Led 10 ml - Rosso Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'9.0','FBA15KY1B87GU000009');
INSERT INTO "ddt_generici_righe" VALUES (49,44,'B0DGGZHMWL','5N-CQKP-6ZV6',' Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Corallo Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'10.0','FBA15KY1B87GU000010');
INSERT INTO "ddt_generici_righe" VALUES (50,44,'B0DGH1262Z','76-LCP9-ORGF','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Elegance Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',45,'10.0','FBA15KY1B87GU000010');
INSERT INTO "ddt_generici_righe" VALUES (51,44,'B0DGGZX8SH','LW-Z8AQ-O2D5','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Gold Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',15,'10.0','FBA15KY1B87GU000010');
INSERT INTO "ddt_generici_righe" VALUES (52,44,'','','',0,'','');
INSERT INTO "ddt_generici_righe" VALUES (53,45,'B0DXVQ42VH','81-SPL0-HNB8	','Cleaner Ongles Dégraissant à la Noix de Coco 100 ml – Nettoyant Ongles Professionnel, Élimine la Couche Collante et Prépare les Ongles pour une Application Parfaite de Gel et Vernis Semi-Permanent',150,'1.0','FBA15L01J17FU000001');
INSERT INTO "ddt_generici_righe" VALUES (54,45,'B0977FRJ6M','BO-UO6L-WFVR','Vernis amer anti ronge ongle12 ml - Nails Stop Mordre contre les rongements d''ongles - Vernis à Ongles Anti Rongement Idéal pour éviter de se ronger les ongles.',300,'2.0','FBA15L01J17FU000002');
INSERT INTO "ddt_generici_righe" VALUES (55,45,'B08XQQHK37','JR-FCA4-9W2N','Cleaner Ongles Dégraissant Professionnel 100 ml – Nail Cleaner Haute Qualité pour Ongles, Élimine la Couche Collante et Prépare les Ongles pour une Application Parfaite de Gel et Vernis Semi-Permanent',100,'3.0','FBA15L01J17FU000003');
INSERT INTO "ddt_generici_righe" VALUES (56,45,'B08XQQHK37','JR-FCA4-9W2N','Cleaner Ongles Dégraissant Professionnel 100 ml – Nail Cleaner Haute Qualité pour Ongles, Élimine la Couche Collante et Prépare les Ongles pour une Application Parfaite de Gel et Vernis Semi-Permanent',100,'4.0','FBA15L01J17FU000004');
INSERT INTO "ddt_generici_righe" VALUES (57,46,'B09FLX9CQV','R8-PG4G-RCUC','Slip Solution 100 ml Professional Liquid for Nails - Modellierflüssigkeit für Acrygel, erweicht und erleichtert die Verarbeitung von Hybrid Gel for Nails transparent',150,'1.0','FBA15L02Q0J8U000001');
INSERT INTO "ddt_generici_righe" VALUES (58,46,'B095KW4BS4','ZP-8F2J-HVL5','Cuticle Remover - Nagelhautentferner Flüssig Professioneller für Hände und Füße 12 ml - Löst und entfernt Nagelhaut Behandlung für Fingernägel und Fingernägel',150,'2.0','FBA15L02Q0J8U000002');
INSERT INTO "ddt_generici_righe" VALUES (59,46,'B0977FRJ6M','BO-UO6L-WFVR','Nagellack gegen Nägelkauen 12 ml | Bitterlack mit extrem bitterem Geschmack | Stoppt Nägelkauen & Daumenlutschen | Für Erwachsene & Kinder | Fördert Nagelwachstum',100,'3.0','FBA15L02Q0J8U000003');
INSERT INTO "ddt_generici_righe" VALUES (60,46,'B08JCWDCF2','CU-E0AS-S0X4','Primer für Gelnägel Professioneller 12 ml - NON Acid Adhesion Promotor für Builder Gel, Farbgel, Semi Permanent, Acrygel, Acryl, One Step Nagellack',300,'4.0','FBA15L02Q0J8U000004');
INSERT INTO "ddt_generici_righe" VALUES (61,47,'B0D6RVRG6S','W7-AFGG-6J0N',' Smalto per Micosi Unghie Piedi e Mani 12 ml - Made in Italy - Trattamento Antimicotico Forte Smalto ideale per Funghi e Onicomicosi - Trattamento Efficace Per la Ricrescita di Unghie Sane',200,'1.0','FBA15L1JLB2CU000001');
INSERT INTO "ddt_generici_righe" VALUES (62,48,'B0D6RVRG6S','W7-AFGG-6J0N',' Esmalte para Micosis en Uñas de Pies y Manos 12 ml - Made in Italy - Tratamiento Antimicótico Fuerte - Esmalte Ideal para Hongos y Onicomicosis - Tratamiento Eficaz para la Regeneración de Uñas Saluda',200,'1.0','FBA15L1JLX50U000001');
INSERT INTO "ddt_generici_righe" VALUES (63,48,'B0DVH8QLDL','9X-607W-Y6DB',' Protector Térmico Pelo 100 ml – Leave In Profesional | Protege hasta 230°C y de rayos UV | Anti-Frizz, Anti-Humedad | Hidrata, Desenreda y Repara Cabello Seco, Dañado, Rizado o Liso',50,'2.0','FBA15L1JLX50U000002');
INSERT INTO "ddt_righe" VALUES (1,1,'B0BY9Q4KTT',NULL,'Antimicotico 12ml',1500,'2');
INSERT INTO "ddt_righe" VALUES (2,1,'B0BY9Q4KTT',NULL,'Antimicotico 12ml',50,'2');
INSERT INTO "ddt_righe" VALUES (3,2,'B0BY9Q4KTT',NULL,'Antimicotico 12ml',1500,NULL);
INSERT INTO "ddt_righe" VALUES (4,2,'B0BY9Q4KTT',NULL,'Antimicotico 12ml',50,NULL);
INSERT INTO "fornitori" VALUES (9,'Alessio Vinci','','Via Fleming 41','alessio.vinci87@gmail.com','3403689635','2025-10-24 11:21:12');
INSERT INTO "fornitori" VALUES (10,'David Fadda','','Via dei Fabbri','KEvin@Kevdi.it','3332221114','2025-10-24 13:40:42');
INSERT INTO "fornitori" VALUES (11,'Guido','','via dei fabbri','ajjld@ghgdsk.it','3245697','2025-10-24 14:34:52');
INSERT INTO "fornitori_prodotti" VALUES (2,9,1,5.0,NULL,'2025-10-29 10:43:55');
INSERT INTO "fornitori_prodotti" VALUES (3,10,54,55.0,NULL,'2025-10-29 11:21:31');
INSERT INTO "fornitori_prodotti" VALUES (4,10,1,44.0,NULL,'2025-10-29 11:30:07');
INSERT INTO "fornitori_prodotti" VALUES (5,9,54,0.0,NULL,'2025-10-29 13:16:17');
INSERT INTO "movimenti" VALUES (1,NULL,NULL,'CONSUMO_ACCESSORI',-100,'2025-09-08 11:15:23','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (2,NULL,NULL,'CONSUMO_ACCESSORI',-100,'2025-09-08 11:15:23','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (3,NULL,NULL,'CONSUMO_ACCESSORI',-100,'2025-09-08 11:15:23','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (4,NULL,NULL,'CONSUMO_ACCESSORI',-100,'2025-09-08 11:15:32','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (5,NULL,NULL,'CONSUMO_ACCESSORI',-100,'2025-09-08 11:15:32','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (6,NULL,NULL,'CONSUMO_ACCESSORI',-100,'2025-09-08 11:15:32','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (7,NULL,NULL,'CONSUMO_ACCESSORI',-100,'2025-09-08 11:16:08','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (8,NULL,NULL,'CONSUMO_ACCESSORI',-100,'2025-09-08 11:16:08','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (9,NULL,NULL,'CONSUMO_ACCESSORI',-100,'2025-09-08 11:16:08','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (10,NULL,NULL,'CONSUMO_ACCESSORI',-700,'2025-09-08 12:31:21','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (11,NULL,NULL,'CONSUMO_ACCESSORI',-700,'2025-09-08 12:31:21','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (12,NULL,NULL,'CONSUMO_ACCESSORI',-700,'2025-09-08 12:31:21','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (13,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-08 12:31:49','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (14,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-08 12:31:49','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (15,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-08 12:31:49','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (16,NULL,NULL,'CONSUMO_ACCESSORI',-450,'2025-09-08 12:32:23','Consumo accessori per produzione B0DKPBB9K4');
INSERT INTO "movimenti" VALUES (17,NULL,NULL,'CONSUMO_ACCESSORI',-450,'2025-09-08 12:32:23','Consumo accessori per produzione B0DKPBB9K4');
INSERT INTO "movimenti" VALUES (18,NULL,NULL,'CONSUMO_ACCESSORI',-450,'2025-09-08 12:32:23','Consumo accessori per produzione B0DKPBB9K4');
INSERT INTO "movimenti" VALUES (19,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 09:45:05','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (20,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 09:45:05','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (21,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 09:45:05','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (22,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 09:45:48','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (23,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 09:45:48','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (24,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 09:45:48','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (25,NULL,NULL,'CONSUMO_ACCESSORI',-9000,'2025-09-09 11:29:12','Consumo accessori per produzione B0DKPBB9K4');
INSERT INTO "movimenti" VALUES (26,NULL,NULL,'CONSUMO_ACCESSORI',-9000,'2025-09-09 11:29:12','Consumo accessori per produzione B0DKPBB9K4');
INSERT INTO "movimenti" VALUES (27,NULL,NULL,'CONSUMO_ACCESSORI',-9000,'2025-09-09 11:29:12','Consumo accessori per produzione B0DKPBB9K4');
INSERT INTO "movimenti" VALUES (28,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 12:45:52','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (29,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 12:45:52','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (30,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 12:45:52','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (31,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:22:22','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (32,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:22:22','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (33,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:22:22','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (34,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:25:55','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (35,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:25:55','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (36,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:25:55','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (37,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:41:47','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (38,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:41:47','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (39,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:41:47','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (40,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 14:42:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (41,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 14:42:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (42,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 14:42:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (43,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 14:44:31','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (44,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 14:44:31','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (45,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 14:44:31','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (46,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:47:13','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (47,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:47:13','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (48,NULL,NULL,'CONSUMO_ACCESSORI',-200,'2025-09-09 14:47:13','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (49,NULL,NULL,'CONSUMO_ACCESSORI',-123,'2025-09-09 19:43:06','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (50,NULL,NULL,'CONSUMO_ACCESSORI',-123,'2025-09-09 19:43:06','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (51,NULL,NULL,'CONSUMO_ACCESSORI',-123,'2025-09-09 19:43:06','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (52,NULL,NULL,'CONSUMO_ACCESSORI',-1234,'2025-09-09 19:50:48','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (53,NULL,NULL,'CONSUMO_ACCESSORI',-1234,'2025-09-09 19:50:48','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (54,NULL,NULL,'CONSUMO_ACCESSORI',-1234,'2025-09-09 19:50:48','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (55,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 19:51:06','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (56,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 19:51:06','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (57,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 19:51:06','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (58,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 19:56:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (59,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 19:56:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (60,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 19:56:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (61,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:03:12','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (62,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:03:12','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (63,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:03:12','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (64,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:03:20','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (65,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:03:20','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (66,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:03:20','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (67,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:05:52','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (68,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:05:52','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (69,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:05:52','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (70,NULL,NULL,'CONSUMO_ACCESSORI',-12,'2025-09-09 20:09:43','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (71,NULL,NULL,'CONSUMO_ACCESSORI',-12,'2025-09-09 20:09:43','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (72,NULL,NULL,'CONSUMO_ACCESSORI',-12,'2025-09-09 20:09:43','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (73,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 20:13:18','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (74,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 20:13:18','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (75,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 20:13:18','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (76,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:17:26','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (77,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:17:26','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (78,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:17:26','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (79,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:18:06','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (80,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:18:06','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (81,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:18:06','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (82,NULL,NULL,'CONSUMO_ACCESSORI',-2,'2025-09-09 20:26:12','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (83,NULL,NULL,'CONSUMO_ACCESSORI',-2,'2025-09-09 20:26:12','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (84,NULL,NULL,'CONSUMO_ACCESSORI',-2,'2025-09-09 20:26:12','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (85,NULL,NULL,'CONSUMO_ACCESSORI',-1234,'2025-09-09 20:30:22','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (86,NULL,NULL,'CONSUMO_ACCESSORI',-1234,'2025-09-09 20:30:22','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (87,NULL,NULL,'CONSUMO_ACCESSORI',-1234,'2025-09-09 20:30:22','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (88,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:40:58','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (89,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:40:58','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (90,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-09 20:40:58','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (91,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 20:47:43','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (92,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 20:47:43','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (93,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 20:47:43','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (94,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 20:48:15','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (95,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 20:48:15','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (96,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 20:48:15','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (97,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 22:09:02','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (98,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 22:09:02','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (99,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-09 22:09:02','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (100,NULL,NULL,'CONSUMO_ACCESSORI',-3000,'2025-09-09 22:16:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (101,NULL,NULL,'CONSUMO_ACCESSORI',-3000,'2025-09-09 22:16:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (102,NULL,NULL,'CONSUMO_ACCESSORI',-3000,'2025-09-09 22:16:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (103,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 08:01:35','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (104,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 08:01:35','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (105,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 08:01:35','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (106,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 08:02:46','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (107,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 08:02:46','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (108,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 08:02:46','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (109,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-10 08:21:42','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (110,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-10 08:21:42','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (111,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-10 08:21:42','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (112,NULL,NULL,'REINTEGRO_ACCESSORI',3000,'2025-09-10 08:49:03','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (113,NULL,NULL,'REINTEGRO_ACCESSORI',3000,'2025-09-10 08:49:03','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (114,NULL,NULL,'REINTEGRO_ACCESSORI',3000,'2025-09-10 08:49:03','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (115,NULL,NULL,'REINTEGRO_ACCESSORI',1000,'2025-09-10 08:49:28','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (116,NULL,NULL,'REINTEGRO_ACCESSORI',1000,'2025-09-10 08:49:28','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (117,NULL,NULL,'REINTEGRO_ACCESSORI',1000,'2025-09-10 08:49:28','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (118,NULL,NULL,'CONSUMO_ACCESSORI',-4000,'2025-09-10 09:00:00','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (119,NULL,NULL,'CONSUMO_ACCESSORI',-4000,'2025-09-10 09:00:00','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (120,NULL,NULL,'CONSUMO_ACCESSORI',-4000,'2025-09-10 09:00:00','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (121,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-10 09:00:30','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (122,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-10 09:00:30','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (123,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-10 09:00:30','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (124,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 09:09:53','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (125,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 09:09:53','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (126,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 09:09:53','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (127,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-10 09:10:28','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (128,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-10 09:10:28','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (129,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-10 09:10:28','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (130,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 09:30:21','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (131,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 09:30:21','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (132,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 09:30:21','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (133,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-10 09:30:35','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (134,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-10 09:30:35','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (135,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-10 09:30:35','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (136,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 10:04:58','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (137,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 10:04:58','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (138,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 10:04:58','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (139,NULL,NULL,'REINTEGRO_ACCESSORI',1000,'2025-09-10 10:05:15','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (140,NULL,NULL,'REINTEGRO_ACCESSORI',1000,'2025-09-10 10:05:15','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (141,NULL,NULL,'REINTEGRO_ACCESSORI',1000,'2025-09-10 10:05:15','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (142,NULL,NULL,'CONSUMO_ACCESSORI',-4000,'2025-09-10 11:20:31','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (143,NULL,NULL,'CONSUMO_ACCESSORI',-4000,'2025-09-10 11:20:31','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (144,NULL,NULL,'CONSUMO_ACCESSORI',-4000,'2025-09-10 11:20:31','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (145,NULL,NULL,'REINTEGRO_ACCESSORI',3000,'2025-09-10 15:01:28','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (146,NULL,NULL,'REINTEGRO_ACCESSORI',3000,'2025-09-10 15:01:28','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (147,NULL,NULL,'REINTEGRO_ACCESSORI',3000,'2025-09-10 15:01:28','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (148,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 15:11:21','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (149,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 15:11:21','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (150,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 15:11:21','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (151,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 15:13:46','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (152,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 15:13:46','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (153,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-09-10 15:13:46','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (154,NULL,NULL,'REINTEGRO_ACCESSORI',3000,'2025-09-10 15:24:07','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (155,NULL,NULL,'REINTEGRO_ACCESSORI',3000,'2025-09-10 15:24:07','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (156,NULL,NULL,'REINTEGRO_ACCESSORI',3000,'2025-09-10 15:24:07','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (157,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-10 15:25:10','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (158,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-10 15:25:10','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (159,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-10 15:25:10','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (160,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-11 09:31:36','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (161,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-11 09:31:36','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (162,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-11 09:31:36','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (163,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-12 13:54:37','Consumo accessori per produzione B0DTJ6H1WD');
INSERT INTO "movimenti" VALUES (164,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-12 13:54:37','Consumo accessori per produzione B0DTJ6H1WD');
INSERT INTO "movimenti" VALUES (165,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-12 13:54:37','Consumo accessori per produzione B0DTJ6H1WD');
INSERT INTO "movimenti" VALUES (166,NULL,NULL,'CONSUMO_ACCESSORI',-20000,'2025-09-12 13:54:49','Consumo accessori per produzione B0DTJ5PVGQ');
INSERT INTO "movimenti" VALUES (167,NULL,NULL,'CONSUMO_ACCESSORI',-20000,'2025-09-12 13:54:49','Consumo accessori per produzione B0DTJ5PVGQ');
INSERT INTO "movimenti" VALUES (168,NULL,NULL,'CONSUMO_ACCESSORI',-20000,'2025-09-12 13:54:49','Consumo accessori per produzione B0DTJ5PVGQ');
INSERT INTO "movimenti" VALUES (169,NULL,NULL,'CONSUMO_ACCESSORI',-18000,'2025-09-12 13:55:00','Consumo accessori per produzione B0DTJ6H1WD');
INSERT INTO "movimenti" VALUES (170,NULL,NULL,'CONSUMO_ACCESSORI',-18000,'2025-09-12 13:55:00','Consumo accessori per produzione B0DTJ6H1WD');
INSERT INTO "movimenti" VALUES (171,NULL,NULL,'CONSUMO_ACCESSORI',-18000,'2025-09-12 13:55:00','Consumo accessori per produzione B0DTJ6H1WD');
INSERT INTO "movimenti" VALUES (172,NULL,NULL,'CONSUMO_ACCESSORI',-10000,'2025-09-12 13:55:08','Consumo accessori per produzione B095KW4BS4');
INSERT INTO "movimenti" VALUES (173,NULL,NULL,'CONSUMO_ACCESSORI',-10000,'2025-09-12 13:55:08','Consumo accessori per produzione B095KW4BS4');
INSERT INTO "movimenti" VALUES (174,NULL,NULL,'CONSUMO_ACCESSORI',-10000,'2025-09-12 13:55:08','Consumo accessori per produzione B095KW4BS4');
INSERT INTO "movimenti" VALUES (175,NULL,NULL,'CONSUMO_ACCESSORI',-10000,'2025-09-12 13:55:16','Consumo accessori per produzione B094RK3P5T');
INSERT INTO "movimenti" VALUES (176,NULL,NULL,'CONSUMO_ACCESSORI',-10000,'2025-09-12 13:55:16','Consumo accessori per produzione B094RK3P5T');
INSERT INTO "movimenti" VALUES (177,NULL,NULL,'CONSUMO_ACCESSORI',-10000,'2025-09-12 13:55:16','Consumo accessori per produzione B094RK3P5T');
INSERT INTO "movimenti" VALUES (178,NULL,NULL,'CONSUMO_ACCESSORI',-8550,'2025-09-12 13:55:34','Consumo accessori per produzione B0DKPBB9K4');
INSERT INTO "movimenti" VALUES (179,NULL,NULL,'CONSUMO_ACCESSORI',-8550,'2025-09-12 13:55:34','Consumo accessori per produzione B0DKPBB9K4');
INSERT INTO "movimenti" VALUES (180,NULL,NULL,'CONSUMO_ACCESSORI',-8550,'2025-09-12 13:55:34','Consumo accessori per produzione B0DKPBB9K4');
INSERT INTO "movimenti" VALUES (181,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-14 16:48:22','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (182,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-14 16:48:22','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (183,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-14 16:48:22','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (184,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-14 16:49:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (185,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-14 16:49:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (186,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-14 16:49:38','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (187,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-16 16:29:14','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (188,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-16 16:29:14','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (189,NULL,NULL,'REINTEGRO_ACCESSORI',2000,'2025-09-16 16:29:14','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (190,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-18 15:40:08','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (191,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-18 15:40:08','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (192,NULL,NULL,'CONSUMO_ACCESSORI',-2000,'2025-09-18 15:40:08','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (193,NULL,NULL,'CONSUMO_ACCESSORI',-20,'2025-09-18 15:40:58','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (194,NULL,NULL,'CONSUMO_ACCESSORI',-20,'2025-09-18 15:40:58','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (195,NULL,NULL,'CONSUMO_ACCESSORI',-20,'2025-09-18 15:40:58','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (196,NULL,NULL,'CONSUMO_ACCESSORI',-20,'2025-09-18 15:43:25','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (197,NULL,NULL,'CONSUMO_ACCESSORI',-20,'2025-09-18 15:43:25','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (198,NULL,NULL,'CONSUMO_ACCESSORI',-20,'2025-09-18 15:43:25','Consumo accessori per produzione B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (199,NULL,NULL,'CONSUMO_ACCESSORI',-360,'2025-09-29 11:06:09','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (200,NULL,NULL,'CONSUMO_ACCESSORI',-360,'2025-09-29 11:06:09','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (201,NULL,NULL,'CONSUMO_ACCESSORI',-360,'2025-09-29 11:06:09','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (202,NULL,NULL,'REINTEGRO_ACCESSORI',360,'2025-09-29 11:06:27','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (203,NULL,NULL,'REINTEGRO_ACCESSORI',360,'2025-09-29 11:06:27','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (204,NULL,NULL,'REINTEGRO_ACCESSORI',360,'2025-09-29 11:06:27','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (205,NULL,NULL,'REINTEGRO_ACCESSORI',50,'2025-09-29 11:06:56','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (206,NULL,NULL,'REINTEGRO_ACCESSORI',50,'2025-09-29 11:06:56','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (207,NULL,NULL,'REINTEGRO_ACCESSORI',50,'2025-09-29 11:06:56','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (208,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-29 11:07:22','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (209,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-29 11:07:22','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (210,NULL,NULL,'CONSUMO_ACCESSORI',-1,'2025-09-29 11:07:22','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (211,NULL,NULL,'REINTEGRO_ACCESSORI',19,'2025-09-29 11:07:54','Reintegro accessori da rettifica prodotto B094YJC9HR');
INSERT INTO "movimenti" VALUES (212,NULL,NULL,'REINTEGRO_ACCESSORI',19,'2025-09-29 11:07:54','Reintegro accessori da rettifica prodotto B094YJC9HR');
INSERT INTO "movimenti" VALUES (213,NULL,NULL,'CONSUMO_ACCESSORI',-1220,'2025-10-03 13:39:18','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (214,NULL,NULL,'CONSUMO_ACCESSORI',-1220,'2025-10-03 13:39:18','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (215,NULL,NULL,'CONSUMO_ACCESSORI',-1220,'2025-10-03 13:39:18','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (216,NULL,NULL,'REINTEGRO_ACCESSORI',221,'2025-10-07 11:03:16','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (217,NULL,NULL,'REINTEGRO_ACCESSORI',221,'2025-10-07 11:03:16','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (218,NULL,NULL,'REINTEGRO_ACCESSORI',221,'2025-10-07 11:03:16','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (219,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-10-18 13:37:53','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (220,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-10-18 13:37:53','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (221,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-10-18 13:37:53','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (222,NULL,NULL,'REINTEGRO_ACCESSORI',59,'2025-10-18 13:38:16','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (223,NULL,NULL,'REINTEGRO_ACCESSORI',59,'2025-10-18 13:38:16','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (224,NULL,NULL,'REINTEGRO_ACCESSORI',59,'2025-10-18 13:38:16','Reintegro accessori da rettifica prodotto B0BY9Q4KTT');
INSERT INTO "movimenti" VALUES (225,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-10-20 10:48:48','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (226,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-10-20 10:48:48','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (227,NULL,NULL,'CONSUMO_ACCESSORI',-1000,'2025-10-20 10:48:48','Consumo accessori per produzione B08TX6DKF3');
INSERT INTO "movimenti" VALUES (228,NULL,NULL,'REINTEGRO_ACCESSORI',2800,'2025-10-27 16:02:44','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (229,NULL,NULL,'REINTEGRO_ACCESSORI',2800,'2025-10-27 16:02:44','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti" VALUES (230,NULL,NULL,'REINTEGRO_ACCESSORI',2800,'2025-10-27 16:02:44','Reintegro accessori da rettifica prodotto B08TX6DKF3');
INSERT INTO "movimenti_backup" VALUES (2,'2025-09-08 11:15:23','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-100,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (3,'2025-09-08 11:15:23','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-100,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (4,'2025-09-08 11:15:23','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-100,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (6,'2025-09-08 11:15:32','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-100,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (7,'2025-09-08 11:15:32','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-100,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (8,'2025-09-08 11:15:32','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-100,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (10,'2025-09-08 11:16:08','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-100,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (11,'2025-09-08 11:16:08','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-100,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (12,'2025-09-08 11:16:08','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-100,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (14,'2025-09-08 12:31:21','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-700,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (15,'2025-09-08 12:31:21','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-700,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (16,'2025-09-08 12:31:21','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-700,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (18,'2025-09-08 12:31:49','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (19,'2025-09-08 12:31:49','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (20,'2025-09-08 12:31:49','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (22,'2025-09-08 12:32:23','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-450,'Consumo accessori per produzione B0DKPBB9K4',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (23,'2025-09-08 12:32:23','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-450,'Consumo accessori per produzione B0DKPBB9K4',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (24,'2025-09-08 12:32:23','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-450,'Consumo accessori per produzione B0DKPBB9K4',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (26,'2025-09-09 09:45:05','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (27,'2025-09-09 09:45:05','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (28,'2025-09-09 09:45:05','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (30,'2025-09-09 09:45:48','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (31,'2025-09-09 09:45:48','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (32,'2025-09-09 09:45:48','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (34,'2025-09-09 11:29:12','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-9000,'Consumo accessori per produzione B0DKPBB9K4',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (35,'2025-09-09 11:29:12','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-9000,'Consumo accessori per produzione B0DKPBB9K4',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (36,'2025-09-09 11:29:12','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-9000,'Consumo accessori per produzione B0DKPBB9K4',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (38,'2025-09-09 12:45:52','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (39,'2025-09-09 12:45:52','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (40,'2025-09-09 12:45:52','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT',NULL,NULL);
INSERT INTO "movimenti_backup" VALUES (42,'2025-09-09 14:22:22','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',41);
INSERT INTO "movimenti_backup" VALUES (43,'2025-09-09 14:22:22','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',41);
INSERT INTO "movimenti_backup" VALUES (44,'2025-09-09 14:22:22','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',41);
INSERT INTO "movimenti_backup" VALUES (46,'2025-09-09 14:25:55','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',45);
INSERT INTO "movimenti_backup" VALUES (47,'2025-09-09 14:25:55','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',45);
INSERT INTO "movimenti_backup" VALUES (48,'2025-09-09 14:25:55','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',45);
INSERT INTO "movimenti_backup" VALUES (50,'2025-09-09 14:41:47','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',49);
INSERT INTO "movimenti_backup" VALUES (51,'2025-09-09 14:41:47','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',49);
INSERT INTO "movimenti_backup" VALUES (52,'2025-09-09 14:41:47','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',49);
INSERT INTO "movimenti_backup" VALUES (54,'2025-09-09 14:42:38','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',53);
INSERT INTO "movimenti_backup" VALUES (55,'2025-09-09 14:42:38','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',53);
INSERT INTO "movimenti_backup" VALUES (56,'2025-09-09 14:42:38','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',53);
INSERT INTO "movimenti_backup" VALUES (58,'2025-09-09 14:44:31','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',57);
INSERT INTO "movimenti_backup" VALUES (59,'2025-09-09 14:44:31','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',57);
INSERT INTO "movimenti_backup" VALUES (60,'2025-09-09 14:44:31','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',57);
INSERT INTO "movimenti_backup" VALUES (62,'2025-09-09 14:47:13','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',61);
INSERT INTO "movimenti_backup" VALUES (63,'2025-09-09 14:47:13','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',61);
INSERT INTO "movimenti_backup" VALUES (64,'2025-09-09 14:47:13','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-200,'Consumo accessori per produzione B0BY9Q4KTT','system',61);
INSERT INTO "movimenti_backup" VALUES (66,'2025-09-09 19:43:06','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-123,'Consumo accessori per produzione B0BY9Q4KTT','system',65);
INSERT INTO "movimenti_backup" VALUES (67,'2025-09-09 19:43:06','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-123,'Consumo accessori per produzione B0BY9Q4KTT','system',65);
INSERT INTO "movimenti_backup" VALUES (68,'2025-09-09 19:43:06','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-123,'Consumo accessori per produzione B0BY9Q4KTT','system',65);
INSERT INTO "movimenti_backup" VALUES (70,'2025-09-09 19:50:48','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1234,'Consumo accessori per produzione B0BY9Q4KTT','system',69);
INSERT INTO "movimenti_backup" VALUES (71,'2025-09-09 19:50:48','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1234,'Consumo accessori per produzione B0BY9Q4KTT','system',69);
INSERT INTO "movimenti_backup" VALUES (72,'2025-09-09 19:50:48','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1234,'Consumo accessori per produzione B0BY9Q4KTT','system',69);
INSERT INTO "movimenti_backup" VALUES (74,'2025-09-09 19:51:06','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',73);
INSERT INTO "movimenti_backup" VALUES (75,'2025-09-09 19:51:06','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',73);
INSERT INTO "movimenti_backup" VALUES (76,'2025-09-09 19:51:06','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',73);
INSERT INTO "movimenti_backup" VALUES (78,'2025-09-09 19:56:38','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',77);
INSERT INTO "movimenti_backup" VALUES (79,'2025-09-09 19:56:38','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',77);
INSERT INTO "movimenti_backup" VALUES (80,'2025-09-09 19:56:38','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',77);
INSERT INTO "movimenti_backup" VALUES (82,'2025-09-09 20:03:12','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',81);
INSERT INTO "movimenti_backup" VALUES (83,'2025-09-09 20:03:12','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',81);
INSERT INTO "movimenti_backup" VALUES (84,'2025-09-09 20:03:12','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',81);
INSERT INTO "movimenti_backup" VALUES (86,'2025-09-09 20:03:20','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',85);
INSERT INTO "movimenti_backup" VALUES (87,'2025-09-09 20:03:20','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',85);
INSERT INTO "movimenti_backup" VALUES (88,'2025-09-09 20:03:20','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',85);
INSERT INTO "movimenti_backup" VALUES (90,'2025-09-09 20:05:52','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',89);
INSERT INTO "movimenti_backup" VALUES (91,'2025-09-09 20:05:52','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',89);
INSERT INTO "movimenti_backup" VALUES (92,'2025-09-09 20:05:52','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',89);
INSERT INTO "movimenti_backup" VALUES (94,'2025-09-09 20:09:43','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-12,'Consumo accessori per produzione B0BY9Q4KTT','system',93);
INSERT INTO "movimenti_backup" VALUES (95,'2025-09-09 20:09:43','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-12,'Consumo accessori per produzione B0BY9Q4KTT','system',93);
INSERT INTO "movimenti_backup" VALUES (96,'2025-09-09 20:09:43','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-12,'Consumo accessori per produzione B0BY9Q4KTT','system',93);
INSERT INTO "movimenti_backup" VALUES (98,'2025-09-09 20:13:18','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',97);
INSERT INTO "movimenti_backup" VALUES (99,'2025-09-09 20:13:18','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',97);
INSERT INTO "movimenti_backup" VALUES (100,'2025-09-09 20:13:18','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',97);
INSERT INTO "movimenti_backup" VALUES (102,'2025-09-09 20:17:26','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',101);
INSERT INTO "movimenti_backup" VALUES (103,'2025-09-09 20:17:26','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',101);
INSERT INTO "movimenti_backup" VALUES (104,'2025-09-09 20:17:26','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',101);
INSERT INTO "movimenti_backup" VALUES (106,'2025-09-09 20:18:06','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',105);
INSERT INTO "movimenti_backup" VALUES (107,'2025-09-09 20:18:06','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',105);
INSERT INTO "movimenti_backup" VALUES (108,'2025-09-09 20:18:06','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',105);
INSERT INTO "movimenti_backup" VALUES (110,'2025-09-09 20:26:12','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-2,'Consumo accessori per produzione B0BY9Q4KTT','system',109);
INSERT INTO "movimenti_backup" VALUES (111,'2025-09-09 20:26:12','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-2,'Consumo accessori per produzione B0BY9Q4KTT','system',109);
INSERT INTO "movimenti_backup" VALUES (112,'2025-09-09 20:26:12','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-2,'Consumo accessori per produzione B0BY9Q4KTT','system',109);
INSERT INTO "movimenti_backup" VALUES (114,'2025-09-09 20:30:22','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1234,'Consumo accessori per produzione B0BY9Q4KTT','system',113);
INSERT INTO "movimenti_backup" VALUES (115,'2025-09-09 20:30:22','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1234,'Consumo accessori per produzione B0BY9Q4KTT','system',113);
INSERT INTO "movimenti_backup" VALUES (116,'2025-09-09 20:30:22','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1234,'Consumo accessori per produzione B0BY9Q4KTT','system',113);
INSERT INTO "movimenti_backup" VALUES (119,'2025-09-09 20:40:58','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',118);
INSERT INTO "movimenti_backup" VALUES (120,'2025-09-09 20:40:58','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',118);
INSERT INTO "movimenti_backup" VALUES (121,'2025-09-09 20:40:58','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B0BY9Q4KTT','system',118);
INSERT INTO "movimenti_backup" VALUES (124,'2025-09-09 20:47:43','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','ALESSIO',123);
INSERT INTO "movimenti_backup" VALUES (125,'2025-09-09 20:47:43','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','ALESSIO',123);
INSERT INTO "movimenti_backup" VALUES (126,'2025-09-09 20:47:43','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','ALESSIO',123);
INSERT INTO "movimenti_backup" VALUES (128,'2025-09-09 20:48:15','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',127);
INSERT INTO "movimenti_backup" VALUES (129,'2025-09-09 20:48:15','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',127);
INSERT INTO "movimenti_backup" VALUES (130,'2025-09-09 20:48:15','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',127);
INSERT INTO "movimenti_backup" VALUES (133,'2025-09-09 22:09:02','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',132);
INSERT INTO "movimenti_backup" VALUES (134,'2025-09-09 22:09:02','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',132);
INSERT INTO "movimenti_backup" VALUES (135,'2025-09-09 22:09:02','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','system',132);
INSERT INTO "movimenti_backup" VALUES (137,'2025-09-09 22:16:38','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-3000,'Consumo accessori per produzione B0BY9Q4KTT','system',136);
INSERT INTO "movimenti_backup" VALUES (138,'2025-09-09 22:16:38','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-3000,'Consumo accessori per produzione B0BY9Q4KTT','system',136);
INSERT INTO "movimenti_backup" VALUES (139,'2025-09-09 22:16:38','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-3000,'Consumo accessori per produzione B0BY9Q4KTT','system',136);
INSERT INTO "movimenti_backup" VALUES (143,'2025-09-10 08:01:35','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',142);
INSERT INTO "movimenti_backup" VALUES (144,'2025-09-10 08:01:35','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',142);
INSERT INTO "movimenti_backup" VALUES (145,'2025-09-10 08:01:35','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',142);
INSERT INTO "movimenti_backup" VALUES (147,'2025-09-10 08:02:46','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',146);
INSERT INTO "movimenti_backup" VALUES (148,'2025-09-10 08:02:46','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',146);
INSERT INTO "movimenti_backup" VALUES (149,'2025-09-10 08:02:46','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',146);
INSERT INTO "movimenti_backup" VALUES (151,'2025-09-10 08:21:42','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',150);
INSERT INTO "movimenti_backup" VALUES (152,'2025-09-10 08:21:42','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',150);
INSERT INTO "movimenti_backup" VALUES (153,'2025-09-10 08:21:42','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',150);
INSERT INTO "movimenti_backup" VALUES (155,'2025-09-10 08:49:03','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,3000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',154);
INSERT INTO "movimenti_backup" VALUES (156,'2025-09-10 08:49:03','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,3000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',154);
INSERT INTO "movimenti_backup" VALUES (157,'2025-09-10 08:49:03','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,3000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',154);
INSERT INTO "movimenti_backup" VALUES (159,'2025-09-10 08:49:28','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,1000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',158);
INSERT INTO "movimenti_backup" VALUES (160,'2025-09-10 08:49:28','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,1000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',158);
INSERT INTO "movimenti_backup" VALUES (161,'2025-09-10 08:49:28','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,1000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',158);
INSERT INTO "movimenti_backup" VALUES (163,'2025-09-10 09:00:00','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-4000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',162);
INSERT INTO "movimenti_backup" VALUES (164,'2025-09-10 09:00:00','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-4000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',162);
INSERT INTO "movimenti_backup" VALUES (165,'2025-09-10 09:00:00','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-4000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',162);
INSERT INTO "movimenti_backup" VALUES (167,'2025-09-10 09:00:30','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',166);
INSERT INTO "movimenti_backup" VALUES (168,'2025-09-10 09:00:30','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',166);
INSERT INTO "movimenti_backup" VALUES (169,'2025-09-10 09:00:30','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',166);
INSERT INTO "movimenti_backup" VALUES (171,'2025-09-10 09:09:53','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',170);
INSERT INTO "movimenti_backup" VALUES (172,'2025-09-10 09:09:53','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',170);
INSERT INTO "movimenti_backup" VALUES (173,'2025-09-10 09:09:53','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',170);
INSERT INTO "movimenti_backup" VALUES (175,'2025-09-10 09:10:28','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','Alessio',174);
INSERT INTO "movimenti_backup" VALUES (176,'2025-09-10 09:10:28','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','Alessio',174);
INSERT INTO "movimenti_backup" VALUES (177,'2025-09-10 09:10:28','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','Alessio',174);
INSERT INTO "movimenti_backup" VALUES (179,'2025-09-10 09:30:21','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',178);
INSERT INTO "movimenti_backup" VALUES (180,'2025-09-10 09:30:21','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',178);
INSERT INTO "movimenti_backup" VALUES (181,'2025-09-10 09:30:21','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',178);
INSERT INTO "movimenti_backup" VALUES (183,'2025-09-10 09:30:35','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',182);
INSERT INTO "movimenti_backup" VALUES (184,'2025-09-10 09:30:35','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',182);
INSERT INTO "movimenti_backup" VALUES (185,'2025-09-10 09:30:35','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',182);
INSERT INTO "movimenti_backup" VALUES (187,'2025-09-10 10:04:58','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',186);
INSERT INTO "movimenti_backup" VALUES (188,'2025-09-10 10:04:58','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',186);
INSERT INTO "movimenti_backup" VALUES (189,'2025-09-10 10:04:58','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',186);
INSERT INTO "movimenti_backup" VALUES (191,'2025-09-10 10:05:15','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,1000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',190);
INSERT INTO "movimenti_backup" VALUES (192,'2025-09-10 10:05:15','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,1000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',190);
INSERT INTO "movimenti_backup" VALUES (193,'2025-09-10 10:05:15','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,1000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',190);
INSERT INTO "movimenti_backup" VALUES (195,'2025-09-10 11:20:31','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-4000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',194);
INSERT INTO "movimenti_backup" VALUES (196,'2025-09-10 11:20:31','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-4000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',194);
INSERT INTO "movimenti_backup" VALUES (197,'2025-09-10 11:20:31','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-4000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',194);
INSERT INTO "movimenti_backup" VALUES (199,'2025-09-10 15:01:28','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,3000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','Alessio',198);
INSERT INTO "movimenti_backup" VALUES (200,'2025-09-10 15:01:28','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,3000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','Alessio',198);
INSERT INTO "movimenti_backup" VALUES (201,'2025-09-10 15:01:28','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,3000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','Alessio',198);
INSERT INTO "movimenti_backup" VALUES (203,'2025-09-10 15:11:21','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',202);
INSERT INTO "movimenti_backup" VALUES (204,'2025-09-10 15:11:21','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',202);
INSERT INTO "movimenti_backup" VALUES (205,'2025-09-10 15:11:21','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',202);
INSERT INTO "movimenti_backup" VALUES (207,'2025-09-10 15:13:46','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',206);
INSERT INTO "movimenti_backup" VALUES (208,'2025-09-10 15:13:46','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',206);
INSERT INTO "movimenti_backup" VALUES (209,'2025-09-10 15:13:46','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B0BY9Q4KTT','Alessio',206);
INSERT INTO "movimenti_backup" VALUES (211,'2025-09-10 15:24:07','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,3000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','Alessio',210);
INSERT INTO "movimenti_backup" VALUES (212,'2025-09-10 15:24:07','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,3000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','Alessio',210);
INSERT INTO "movimenti_backup" VALUES (213,'2025-09-10 15:24:07','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,3000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','Alessio',210);
INSERT INTO "movimenti_backup" VALUES (215,'2025-09-10 15:25:10','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',214);
INSERT INTO "movimenti_backup" VALUES (216,'2025-09-10 15:25:10','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',214);
INSERT INTO "movimenti_backup" VALUES (217,'2025-09-10 15:25:10','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',214);
INSERT INTO "movimenti_backup" VALUES (219,'2025-09-11 09:31:36','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',218);
INSERT INTO "movimenti_backup" VALUES (220,'2025-09-11 09:31:36','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',218);
INSERT INTO "movimenti_backup" VALUES (221,'2025-09-11 09:31:36','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',218);
INSERT INTO "movimenti_backup" VALUES (223,'2025-09-12 13:54:37','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-2000,'Consumo accessori per produzione B0DTJ6H1WD','alessio',222);
INSERT INTO "movimenti_backup" VALUES (224,'2025-09-12 13:54:37','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-2000,'Consumo accessori per produzione B0DTJ6H1WD','alessio',222);
INSERT INTO "movimenti_backup" VALUES (225,'2025-09-12 13:54:37','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-2000,'Consumo accessori per produzione B0DTJ6H1WD','alessio',222);
INSERT INTO "movimenti_backup" VALUES (227,'2025-09-12 13:54:49','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-20000,'Consumo accessori per produzione B0DTJ5PVGQ','alessio',226);
INSERT INTO "movimenti_backup" VALUES (228,'2025-09-12 13:54:49','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-20000,'Consumo accessori per produzione B0DTJ5PVGQ','alessio',226);
INSERT INTO "movimenti_backup" VALUES (229,'2025-09-12 13:54:49','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-20000,'Consumo accessori per produzione B0DTJ5PVGQ','alessio',226);
INSERT INTO "movimenti_backup" VALUES (231,'2025-09-12 13:55:00','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-18000,'Consumo accessori per produzione B0DTJ6H1WD','alessio',230);
INSERT INTO "movimenti_backup" VALUES (232,'2025-09-12 13:55:00','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-18000,'Consumo accessori per produzione B0DTJ6H1WD','alessio',230);
INSERT INTO "movimenti_backup" VALUES (233,'2025-09-12 13:55:00','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-18000,'Consumo accessori per produzione B0DTJ6H1WD','alessio',230);
INSERT INTO "movimenti_backup" VALUES (235,'2025-09-12 13:55:08','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-10000,'Consumo accessori per produzione B095KW4BS4','alessio',234);
INSERT INTO "movimenti_backup" VALUES (236,'2025-09-12 13:55:08','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-10000,'Consumo accessori per produzione B095KW4BS4','alessio',234);
INSERT INTO "movimenti_backup" VALUES (237,'2025-09-12 13:55:08','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-10000,'Consumo accessori per produzione B095KW4BS4','alessio',234);
INSERT INTO "movimenti_backup" VALUES (239,'2025-09-12 13:55:16','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-10000,'Consumo accessori per produzione B094RK3P5T','alessio',238);
INSERT INTO "movimenti_backup" VALUES (240,'2025-09-12 13:55:16','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-10000,'Consumo accessori per produzione B094RK3P5T','alessio',238);
INSERT INTO "movimenti_backup" VALUES (241,'2025-09-12 13:55:16','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-10000,'Consumo accessori per produzione B094RK3P5T','alessio',238);
INSERT INTO "movimenti_backup" VALUES (243,'2025-09-12 13:55:34','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-8550,'Consumo accessori per produzione B0DKPBB9K4','alessio',242);
INSERT INTO "movimenti_backup" VALUES (244,'2025-09-12 13:55:34','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-8550,'Consumo accessori per produzione B0DKPBB9K4','alessio',242);
INSERT INTO "movimenti_backup" VALUES (245,'2025-09-12 13:55:34','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-8550,'Consumo accessori per produzione B0DKPBB9K4','alessio',242);
INSERT INTO "movimenti_backup" VALUES (247,'2025-09-14 16:48:22','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',246);
INSERT INTO "movimenti_backup" VALUES (248,'2025-09-14 16:48:22','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',246);
INSERT INTO "movimenti_backup" VALUES (249,'2025-09-14 16:48:22','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',246);
INSERT INTO "movimenti_backup" VALUES (251,'2025-09-14 16:49:38','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',250);
INSERT INTO "movimenti_backup" VALUES (252,'2025-09-14 16:49:38','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',250);
INSERT INTO "movimenti_backup" VALUES (253,'2025-09-14 16:49:38','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',250);
INSERT INTO "movimenti_backup" VALUES (255,'2025-09-16 16:29:14','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',254);
INSERT INTO "movimenti_backup" VALUES (256,'2025-09-16 16:29:14','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',254);
INSERT INTO "movimenti_backup" VALUES (257,'2025-09-16 16:29:14','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,2000,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',254);
INSERT INTO "movimenti_backup" VALUES (259,'2025-09-18 15:40:08','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',258);
INSERT INTO "movimenti_backup" VALUES (260,'2025-09-18 15:40:08','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',258);
INSERT INTO "movimenti_backup" VALUES (261,'2025-09-18 15:40:08','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-2000,'Consumo accessori per produzione B0BY9Q4KTT','alessio',258);
INSERT INTO "movimenti_backup" VALUES (263,'2025-09-18 15:40:58','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-20,'Consumo accessori per produzione B0BY9Q4KTT','alessio',262);
INSERT INTO "movimenti_backup" VALUES (264,'2025-09-18 15:40:58','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-20,'Consumo accessori per produzione B0BY9Q4KTT','alessio',262);
INSERT INTO "movimenti_backup" VALUES (265,'2025-09-18 15:40:58','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-20,'Consumo accessori per produzione B0BY9Q4KTT','alessio',262);
INSERT INTO "movimenti_backup" VALUES (267,'2025-09-18 15:43:25','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-20,'Consumo accessori per produzione B0BY9Q4KTT','alessio',266);
INSERT INTO "movimenti_backup" VALUES (268,'2025-09-18 15:43:25','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-20,'Consumo accessori per produzione B0BY9Q4KTT','alessio',266);
INSERT INTO "movimenti_backup" VALUES (269,'2025-09-18 15:43:25','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-20,'Consumo accessori per produzione B0BY9Q4KTT','alessio',266);
INSERT INTO "movimenti_backup" VALUES (283,'2025-09-29 11:06:09','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-360,'Consumo accessori per produzione B08TX6DKF3','alessio',282);
INSERT INTO "movimenti_backup" VALUES (284,'2025-09-29 11:06:09','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-360,'Consumo accessori per produzione B08TX6DKF3','alessio',282);
INSERT INTO "movimenti_backup" VALUES (285,'2025-09-29 11:06:09','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-360,'Consumo accessori per produzione B08TX6DKF3','alessio',282);
INSERT INTO "movimenti_backup" VALUES (287,'2025-09-29 11:06:27','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,360,'Reintegro accessori da rettifica prodotto B08TX6DKF3','alessio',286);
INSERT INTO "movimenti_backup" VALUES (288,'2025-09-29 11:06:27','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,360,'Reintegro accessori da rettifica prodotto B08TX6DKF3','alessio',286);
INSERT INTO "movimenti_backup" VALUES (289,'2025-09-29 11:06:27','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,360,'Reintegro accessori da rettifica prodotto B08TX6DKF3','alessio',286);
INSERT INTO "movimenti_backup" VALUES (291,'2025-09-29 11:06:56','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,50,'Reintegro accessori da rettifica prodotto B08TX6DKF3','alessio',290);
INSERT INTO "movimenti_backup" VALUES (292,'2025-09-29 11:06:56','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,50,'Reintegro accessori da rettifica prodotto B08TX6DKF3','alessio',290);
INSERT INTO "movimenti_backup" VALUES (293,'2025-09-29 11:06:56','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,50,'Reintegro accessori da rettifica prodotto B08TX6DKF3','alessio',290);
INSERT INTO "movimenti_backup" VALUES (295,'2025-09-29 11:07:22','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1,'Consumo accessori per produzione B08TX6DKF3','alessio',294);
INSERT INTO "movimenti_backup" VALUES (296,'2025-09-29 11:07:22','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1,'Consumo accessori per produzione B08TX6DKF3','alessio',294);
INSERT INTO "movimenti_backup" VALUES (297,'2025-09-29 11:07:22','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1,'Consumo accessori per produzione B08TX6DKF3','alessio',294);
INSERT INTO "movimenti_backup" VALUES (299,'2025-09-29 11:07:54','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_100_ML',0,19,'Reintegro accessori da rettifica prodotto B094YJC9HR','alessio',298);
INSERT INTO "movimenti_backup" VALUES (300,'2025-09-29 11:07:54','REINTEGRO_ACCESSORI',NULL,'TAPPO_100_ML',0,19,'Reintegro accessori da rettifica prodotto B094YJC9HR','alessio',298);
INSERT INTO "movimenti_backup" VALUES (302,'2025-10-03 13:39:18','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1220,'Consumo accessori per produzione B08TX6DKF3','e',301);
INSERT INTO "movimenti_backup" VALUES (303,'2025-10-03 13:39:18','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1220,'Consumo accessori per produzione B08TX6DKF3','e',301);
INSERT INTO "movimenti_backup" VALUES (304,'2025-10-03 13:39:18','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1220,'Consumo accessori per produzione B08TX6DKF3','e',301);
INSERT INTO "movimenti_backup" VALUES (306,'2025-10-07 11:03:16','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,221,'Reintegro accessori da rettifica prodotto B08TX6DKF3','alessio',305);
INSERT INTO "movimenti_backup" VALUES (307,'2025-10-07 11:03:16','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,221,'Reintegro accessori da rettifica prodotto B08TX6DKF3','alessio',305);
INSERT INTO "movimenti_backup" VALUES (308,'2025-10-07 11:03:16','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,221,'Reintegro accessori da rettifica prodotto B08TX6DKF3','alessio',305);
INSERT INTO "movimenti_backup" VALUES (310,'2025-10-18 13:37:53','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B08TX6DKF3','alessio',309);
INSERT INTO "movimenti_backup" VALUES (311,'2025-10-18 13:37:53','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B08TX6DKF3','alessio',309);
INSERT INTO "movimenti_backup" VALUES (312,'2025-10-18 13:37:53','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B08TX6DKF3','alessio',309);
INSERT INTO "movimenti_backup" VALUES (314,'2025-10-18 13:38:16','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,59,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',313);
INSERT INTO "movimenti_backup" VALUES (315,'2025-10-18 13:38:16','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,59,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',313);
INSERT INTO "movimenti_backup" VALUES (316,'2025-10-18 13:38:16','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,59,'Reintegro accessori da rettifica prodotto B0BY9Q4KTT','alessio',313);
INSERT INTO "movimenti_backup" VALUES (318,'2025-10-20 10:48:48','CONSUMO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,-1000,'Consumo accessori per produzione B08TX6DKF3','Alessio',317);
INSERT INTO "movimenti_backup" VALUES (319,'2025-10-20 10:48:48','CONSUMO_ACCESSORI',NULL,'PENNELLO_12_ML',0,-1000,'Consumo accessori per produzione B08TX6DKF3','Alessio',317);
INSERT INTO "movimenti_backup" VALUES (320,'2025-10-20 10:48:48','CONSUMO_ACCESSORI',NULL,'TAPPO_12_ML',0,-1000,'Consumo accessori per produzione B08TX6DKF3','Alessio',317);
INSERT INTO "movimenti_backup" VALUES (322,'2025-10-27 16:02:44','REINTEGRO_ACCESSORI',NULL,'BOCCETTA_12_ML',0,2800,'Reintegro accessori da rettifica prodotto B08TX6DKF3','Alessio',321);
INSERT INTO "movimenti_backup" VALUES (323,'2025-10-27 16:02:44','REINTEGRO_ACCESSORI',NULL,'PENNELLO_12_ML',0,2800,'Reintegro accessori da rettifica prodotto B08TX6DKF3','Alessio',321);
INSERT INTO "movimenti_backup" VALUES (324,'2025-10-27 16:02:44','REINTEGRO_ACCESSORI',NULL,'TAPPO_12_ML',0,2800,'Reintegro accessori da rettifica prodotto B08TX6DKF3','Alessio',321);
INSERT INTO "ordini_fornitori" VALUES (53,10,1,NULL,55.0,'In attesa','2025-10-29T16:42:35.481Z',NULL,NULL,NULL);
INSERT INTO "ordini_fornitori_old" VALUES (15,9,'B08JCWDCF2','Primer NO Acido','12ml',30.0,5.0,150.0,'Bonifico','In attesa','2025-10-24T14:36:40.762Z',NULL,'2025-10-24',NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (1,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','CONFERMATA',NULL,13,'2025-10-20 13:24:24','Media','-','admin','B0BY9Q4KTT',0.157,13,13,13,'2025-10-20 16:05:24',NULL,NULL,'2025-10-20 16:35:02',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (2,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','Annullata',NULL,147,'2025-10-20 16:35:26','Media','w456798','admin','B0BY9Q4KTT',1.771,147,147,147,'2025-10-21 14:59:58','2025-10-21 14:59:58',NULL,NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (3,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','Annullata',NULL,147,'2025-10-20 16:35:37','Media','w456798','admin','B0BY9Q4KTT',1.771,147,147,147,'2025-10-21 14:59:56','2025-10-21 14:59:57',NULL,NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (4,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','Annullata',NULL,147,'2025-10-20 16:44:06','Media','w456798','admin','B0BY9Q4KTT',1.771,147,147,147,'2025-10-21 14:59:54','2025-10-21 14:59:55',NULL,NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (5,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','CONFERMATA',NULL,147,'2025-10-20 16:54:09','Media','w456798','admin','B0BY9Q4KTT',1.771,147,147,147,'2025-10-21 14:59:49',NULL,NULL,'2025-10-21 14:59:52',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (6,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','CONFERMATA',NULL,155,'2025-10-20 17:15:10','Media','f13456','admin','B0BY9Q4KTT',1.867,155,155,155,'2025-10-21 13:05:39',NULL,NULL,'2025-10-21 13:10:54',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (7,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','CONFERMATA',NULL,114,'2025-10-21 11:06:49','Media','f13456','admin','B0BY9Q4KTT',1.375,150,150,150,'2025-10-21 14:34:30',NULL,'FIFO_1761050070014','2025-10-21 14:57:50',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (8,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','CONFERMATA',NULL,150,'2025-10-21 11:07:06','Media','f13456','admin','B0BY9Q4KTT',1.807,150,150,150,'2025-10-21 13:16:16',NULL,NULL,'2025-10-21 13:49:39',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (9,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','CONFERMATA',NULL,150,'2025-10-21 11:30:44','Media','f13456','admin','B0BY9Q4KTT',1.807,150,150,150,'2025-10-21 13:01:36',NULL,NULL,'2025-10-21 13:03:10',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (10,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','Annullata',NULL,111,'2025-10-21 12:00:35','Media','f13456','admin','B0BY9Q4KTT',1.337,111,111,111,'2025-10-21 13:03:19','2025-10-21 13:05:37',NULL,'2025-10-21 13:05:31',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (11,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','Annullata',NULL,111,'2025-10-21 12:22:30','Media','f13456','admin','B0BY9Q4KTT',1.337,111,111,111,'2025-10-21 13:01:32','2025-10-21 13:01:57',NULL,NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (12,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','Annullata',NULL,83,'2025-10-21 12:23:40','Media','f13456','admin','B0BY9Q4KTT',1.0,166,166,166,'2025-10-21 12:48:02','2025-10-21 13:01:30','FIFO_1761043682563','2025-10-21 13:00:51',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (13,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','Annullata',NULL,154,'2025-10-21 12:26:52','Media','f13456','admin','B0BY9Q4KTT',1.856,166,166,166,'2025-10-21 13:01:43','2025-10-21 13:01:57','FIFO_1761044503028',NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (14,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','Annullata',NULL,166,'2025-10-21 12:31:15','Media','f13456','admin','B0BY9Q4KTT',2.0,166,166,166,'2025-10-21 12:48:01','2025-10-21 12:52:27',NULL,'2025-10-21 12:52:25',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (15,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','CONFERMATA','[21/10/2025, 12:47:39] test',249,'2025-10-21 12:31:26','Media','f13456','admin','B0BY9Q4KTT',3.0,415,415,415,'2025-10-21 12:45:57',NULL,'FIFO_1761043557507','2025-10-21 12:47:59',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (16,1,NULL,'12ml','Annullata','[21/10/2025, 12:47:32] test',166,'2025-10-21 12:45:57','Media','w456798','admin',NULL,2.0,415,415,415,'2025-10-21 12:45:57','2025-10-21 12:46:21','FIFO_1761043557507',NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (17,1,NULL,'12ml','Annullata',NULL,83,'2025-10-21 12:48:02','Media','w456798','admin',NULL,1.0,166,166,166,'2025-10-21 12:48:02','2025-10-21 12:52:13','FIFO_1761043682563',NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (18,1,NULL,'12ml','Annullata',NULL,11,'2025-10-21 13:01:43','Media','w456798','admin',NULL,0.144,166,166,166,'2025-10-21 13:01:43','2025-10-21 13:01:56','FIFO_1761044503028',NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (19,1,NULL,'12ml','CONFERMATA',NULL,35,'2025-10-21 14:34:30','Media','w456798','admin','B08JCWDCF2',0.431999999999999,150,150,150,'2025-10-21 14:34:30',NULL,'FIFO_1761050070014','2025-10-21 14:59:42',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (20,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','Annullata',NULL,2000,'2025-10-21 15:00:25','Media','w456798','admin','B0BY9Q4KTT',24.096,2000,2000,2000,'2025-10-21 15:01:28','2025-10-21 15:01:29',NULL,NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (21,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','Annullata',NULL,1000,'2025-10-21 15:00:47','Media','w456798','admin','B0BY9Q4KTT',12.048,1000,1000,1000,'2025-10-21 15:01:26','2025-10-21 15:01:27',NULL,NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (22,1,'Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.','12ml','CONFERMATA',NULL,500,'2025-10-21 15:01:07','Media','w456798','admin','B0BY9Q4KTT',6.024,500,500,500,'2025-10-21 15:01:20',NULL,NULL,'2025-10-21 15:01:24',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (23,14,'Antifungo 12ml','12ml','CONFERMATA',NULL,150,'2025-10-22 10:55:22','Media','qwerty','admin','B0BY9Q4KTT',1.807,0,0,0,'2025-10-22 10:55:27',NULL,NULL,'2025-10-22 10:55:33',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (24,14,'Antifungo 12ml','12ml','CONFERMATA','[22/10/2025, 10:55:44] test',150,'2025-10-22 10:55:39','Media','qwerty','admin','B0BY9Q4KTT',1.807,0,0,0,'2025-10-22 10:55:50',NULL,NULL,'2025-10-22 10:56:06',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (25,14,'Antifungo 12ml','12ml','Annullata',NULL,100,'2025-10-22 10:56:47','Media','qwerty','admin','B0BY9Q4KTT',1.205,0,0,0,'2025-10-22 10:56:49','2025-10-22 10:56:51',NULL,NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (26,14,'Antifungo 12ml','12ml','CONFERMATA','[23/10/2025, 08:47:15] urgente',115,'2025-10-23 08:47:01','Alta','qwerty','admin','B0BY9Q4KTT',1.386,0,0,0,'2025-10-23 08:47:33',NULL,'FIFO_1761202053258','2025-10-23 08:49:19',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (27,14,NULL,'12ml','CONFERMATA','[23/10/2025, 08:47:15] urgente',884,'2025-10-23 08:47:33','Alta','ytrewq','admin','B0BY9Q4KTT',10.662,0,0,0,'2025-10-23 08:47:33',NULL,'FIFO_1761202053258','2025-10-23 08:49:25',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (28,1,'Primer NO Acido 12ml','12ml','CONFERMATA',NULL,830,'2025-10-24 16:38:32','Media','f13456','admin','B08JCWDCF2',10.0,0,0,0,'2025-10-24 16:38:43',NULL,'FIFO_1761316723754','2025-10-24 16:39:09',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (29,1,NULL,'12ml','CONFERMATA',NULL,4170,'2025-10-24 16:38:43','Media','w456798','admin','B08JCWDCF2',50.241,0,0,0,'2025-10-24 16:38:43',NULL,'FIFO_1761316723754','2025-10-24 16:39:07',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (30,1,'Primer NO Acido 12ml','12ml','CONFERMATA',NULL,50,'2025-10-24 16:45:28','Media','f13456','admin','B08JCWDCF2',0.602,0,0,0,'2025-10-24 16:46:00',NULL,NULL,'2025-10-24 16:47:00',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (31,1,'Primer NO Acido 12ml','12ml','CONFERMATA',NULL,50,'2025-10-24 16:54:35','Media','f13456','admin','B08JCWDCF2',0.602,0,0,0,'2025-10-24 16:54:37',NULL,NULL,'2025-10-24 17:00:46',0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (32,14,'Antifungo 12ml','12ml','Annullata',NULL,150,'2025-10-27 10:20:50','Media','ytrewq','admin','B0BY9Q4KTT',1.807,0,0,0,'2025-10-27 10:20:52','2025-11-24 16:44:14',NULL,NULL,0,0,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (33,1,'Primer NO Acido 12ml','12ml','Annullata',NULL,55,'2025-11-25 10:52:50','Media','f13456','admin','B08JCWDCF2',0.663,0,0,0,'2025-11-25 10:52:55','2025-11-25 10:53:41',NULL,NULL,55,55,NULL);
INSERT INTO "prenotazioni_sfuso" VALUES (34,1,'Primer NO Acido 12ml','12ml','Annullata',NULL,55,'2025-11-25 11:06:38','Media','f13456','admin','B08JCWDCF2',0.663,0,0,0,'2025-11-25 11:06:41','2025-11-25 11:24:29',NULL,NULL,55,55,2);
INSERT INTO "prodotti" VALUES (1,NULL,'Test Inserimento',0,'GENERIC','PREPARATORI UNGHIE',1,0,NULL,'TS-001',14,'12ml',0,0,1);
INSERT INTO "prodotti" VALUES (2,NULL,'Test Inserimento',0,'GENERIC','PREPARATORI UNGHIE',1,0,NULL,'TS-002',14,'12ml',0,0,1);
INSERT INTO "prodotti" VALUES (3,'FUSTO_A_5L','Fusto Base A 5L',0,'5L_STD','5L',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (4,'FUSTO_B_5L','Fusto Base B 5L',0,'5L_STD','5L',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (5,'B09H7PB9XT','Builder Gel Cover 3in1 Beige Professional UV-LED - 30 ml MEDIUM-High VISCOSITY Self-leveling for Nails Extension, Ultra Resistant for Nails Extension',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71Npmhu9Q+L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (6,'B08TX6DKF3','Pics Nails Gel Nail Polish 2-in-1 Base Coat & Top Coat, 12 ml, UV LED Semi-Permanent, 2 Products in 1',3000,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/41QEhWVZzNL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (7,'B09K6GYDLS','Cuticle Oil for Nails Professiona Nail Treatment 12 ml - 0,4 Fl. oz - Vanilla Fragrance - Moisturizing and Regenerating Oil for Cuticles, Gives Relief and Freshness to Dry and Irritated Skin',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (8,'B09VWVVSPW','Nail Glue Super Strong 7.5 ml 0,25 Fl oz - Professional Nail Glue Ideal for Refills, Nails Tips, Acrylic Nails, Glitter, Stickers and Broken Nails',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (9,'B0CHZ7JKQV','Gel Nail Polish for Nail Art and French Manicure 10 ml - High Precision Brush Gel Nail Varnish Colours for Lines, Colors, and Professional Nail Decoration',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (10,'B0CS41QLP5','One Step Semi-Permanent Nail Polish UV/LED 12 ml - Gel Nail Polish - Instantly Shiny Nails With or Without Base and Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (11,'B0CLHBFQTL','Top Coat Gel Polish No Wipe 10ml Uv/Led - Clear Gel Nail Polish Sealer. Ultimate Nail Shine for All Methods. Achieve Professional Gloss and Durability!',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (12,'B0CJ5P79TH','Builder Gel Nail Extension - Poly Nail Acrylic Gel in 15g Tube. Professional and Long Lasting, Hema Free Builder Gel For You',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (13,'B0C9QGQPCT','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Rosa Glitter - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione per Linee, Colori e Decorazione Unghie Professionale.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81sHvboRxkL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (14,'B0FJMF75RR','Olio Cuticole Unghie per mani e piedi Professionale 12ml - Fragranza Caramello - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi, Dona Sollievo e Freschezza alla pelle secca e Irritata',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71qWXLdJKiL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (15,'B094YJC9HR','Remover Semipermanente Unghie Acetone Puro Rimuovi Smalto Semipermanente per Unghie Professionale - Solvente Rimuovi Smalto semipermanente per Unghie 100 ml',1,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/61hjxwngsQL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (16,'B09DQ3KH7Q','Smalto Indurente rinforzante Unghie 12ml Professionale - Ideale per Unghie Fragili e Deboli - Rinforza e Migliora la struttura di unghie Fragili e Deboli',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/613-x2ZbsiL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (17,'B0BNNWY2GC','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Emerald',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/710xPXg7nrL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (18,'B0BNNX9M9F','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Aurora Boreale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71L-ySatQLL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (19,'B0BNNWJ2KV','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Crystal',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71t9cGHlfBL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (20,'B0BNNXTJXY','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Amethyst',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71LAun8knPL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (21,'B0BNNV5ZKD','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Aquamarine',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71gS+WpaSAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (22,'B0BNNX8727','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Siam',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71Djpq+SZBL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (23,'B0BNNWQJ6D','Brillantini Unghie per Nail Art e Decorazione Kit Mix A.B. SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Kit Mix Aurora Boreale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71DawYNbckL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (24,'B0BNNZC6Z9','Brillantini Unghie per Nail Art e Decorazione Kit Mix Crystal SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Mix Dimensioni Crystal',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71rGoARFrnL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (25,'B0BNNYPL9H','Brillantini Unghie per Nail Art e Decorazione SS-8 (2,3mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Crystal',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71CYv-CjfyL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (26,'B0BNNZJ2XS','Brillantini Unghie per Nail Art e Decorazione SS-3 (1,3mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Crystal',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71td9+G5ovL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (27,'B0BNNZLQW5','Brillantini Unghie per Nail Art e Decorazione SS-10 (2,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Crystal',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71olyD1NXAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (28,'B0BNNXPD6Y','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� (SS-16 (3,8 mm), Crystal)',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71bGEa0hfBL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (29,'B0BNNZSC6G','Brillantini Unghie per Nail Art e Decorazione SS-3 (1,3mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Aurora Boreale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71+FgHJglzL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (30,'B0BNNZF8V3','Brillantini Unghie per Nail Art e Decorazione SS-8 (2,3mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Aurora Boreale)',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71j5ZDIrRFL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (31,'B0BNNY5PZY','Brillantini Unghie per Nail Art e Decorazione SS-10 (2,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Aurora Boreale)',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71y5BWGoXIL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (32,'B0BNNYQKLN','Brillantini Unghie per Nail Art e Decorazione SS-16 (3,8 mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Aurora Boreale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71ErBmD6jqL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (33,'B0C4L9ZYNY','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� (SS-5 (1,7 mm), Sky A.B.)',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71xRxxZJybL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (34,'B0BNNX35MB','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Sapphire',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71VSKBAVhWL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (35,'B0BNNYP3BH','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Light Sapphire',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71P63LzBCAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (36,'B0BNNXGN4F','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� (SS-5 (1,7 mm), Topaz)',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71LAun8knPL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (37,'B0BNNX2188','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Flame',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71wrmhtbNPL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (38,'B0C4L8PHF9','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� (5g (1 mm), Pixie Dust A.B.)',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81GNDxt-dLL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (39,'B0BNNY2LVV','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Tanzanite',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/714FxVGW2JL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (40,'B0BNNXCX65','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Blue Flame',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71ZOQgVCNdL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (41,'B0BNNX2B48','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Light Amethyst',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71Vc-xLMLaL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (42,'B0BNNZRMS9','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Light Topaz',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71k6UuWLMWL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (43,'B0BNNY5GTZ','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Peacock Blue',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71JM9R-UctL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (44,'B0BNNWPRDZ','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Mix Color',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71IwdpYFFKL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (45,'B0BNNZRB36','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� White Opal',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/719H6UItlvL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (46,'B0BNNZ3CKM','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Peridot',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71eCsFXdrlL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (47,'B0BNNXWWGJ','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Smoked',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71LAun8knPL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (48,'B0C9QHFB5Y','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Nero - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione per Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81TbUrOM1IL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (49,'B0BY9Q4KTT','Antimicotico Micosi Unghie Piedi e Mani 12 ml - Trattamento della Micosi del Piede e della Mano, Previene e la Micosi/Funghi dalle Unghie di Piedi e Mani e Ripristina il Naturale Aspetto dell''Unghia.',3727,'12ML_STD','12ML',NULL,8,'https://m.media-amazon.com/images/I/71BLmRrLaEL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (50,'B09238F1VL','Solvente per Unghie Senza Acetone Per Smalto Normale 100 ml - Levasmalto Delicato per Manicure e Pedicure Professionale',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/314BgXeGtZL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (51,'B0963PF48B','Olio Cuticole Unghie di mani e piedi Professionale 12ml - Fragranza Vaniglia - Idratante e Rigenerante, Dona Sollievo e Freschezza alla pelle secca e Irritate',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71TWOM5iqbL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (52,'B0C9QK6W2J','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Midnight Blue - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione per Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81OX-oNy5IL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (53,'B0DGH1262Z','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Elegance Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71C9ZBWy8pL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (54,'B08DYB28ZH','Colla per Unghie Finte Professionale 7.5 g Extra Forte -Colla per Tip, Brillantini, Adesivi, Glitter, Decorazioni per Unghie Alta Qualit�',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/51FVx8S-xiL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (55,'B0CHMLJD7K','Olio Cuticole Unghie per mani e piedi Professionale 12ml - Fragranza Lavanda - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi, Dona Sollievo e Freschezza alla pelle secca e Irritata',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/713y0SR7EpL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (56,'B0DXVQ42VH','Sgrassatore Unghie Gel al Cocco 100 ml - Nail Cleaner Professionale Cleaner Unghie Sgrassatore per Pulizia e Rimozione Strato di Dispersione Ideale per Unghie Gel Semipermanente e UV Fragranza Cocco',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/71nUw2S2hzL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (57,'B094YPSVWK','Olio CBD 5% (5000 mg) - 100 ml | Olio di Canapa Biologico Italiano pari a 3900 Gocce con CBD di Alta Qualit� Made in Italy Olio di Canapa CBD in Gocce',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/41yETwio9OS.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (58,'B0CHMK6QTY','Olio Cuticole Unghie per mani e piedi Professionale 12ml - Fragranza Cocco - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi, Dona Sollievo e Freschezza alla pelle secca e Irritata',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71KqB0aLaqL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (59,'B0CHMK39L9','Olio Cuticole Unghie per mani e piedi Professionale 12ml - Fragranza Frutti di Bosco - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi, Dona Sollievo e Freschezza alla pelle secca e Irritata',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71GxEmNn1vL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (60,'B094RK3P5T','Smalto Rinforzante Unghie Istantaneo al Calcio Extra Forte - 12 ml Rinforza e Migliora istantaneamente la struttura dell''unghia Fragili e Deboli.',10000,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71xr+iNIgOL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (61,'B0977FRJ6M','Smalto Amaro per non mangiare le Unghie 12 ml - Nails Stop Biting contro l'' onicofagia-Smalto Anti Rosicchia unghie Ideale per evitare di mangiarsi le unghie.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71hxi8BUhBL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (62,'B09VY51ZFF','Olio Cuticole Unghie per mani e piedi Professionale 12ml - Fragranza Fragola - Idratante e Rigenerante, Dona Sollievo e Freschezza alla pelle secca e Irritata',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71i2H7qPalL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (63,'B0CHMJ7HW8','Olio Cuticole Unghie per mani e piedi Professionale 12ml - Fragranza Banana - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi, Dona Sollievo e Freschezza alla pelle secca e Irritata',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/511CT539jRL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (64,'B09JZK3SQL','Cilindri Abrasivi Fresa Unghie in Ceramica Ultra Resistenti Grana 150-25 pz. 5 volte pi� resistenti dei comuni cilindri abrasivi per Fresa Unghie Premium Quality 25pz.=100pz.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/61bxlIeikXL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (65,'B09DQ5457F','Top Coat Opaco Smalto Sigillante per Unghie 12ml ad Asciugatura Rapida - Smalto Trasparente per manicure e pedicure Top Coat per Unghie con Effetto Matt, Sigilla e Protegge lo Smalto Opaco',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/61gAG1+43fL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (66,'B0DKTQXDR9','Antimicotico Unghie Piedi e Mani 2 pz. x12 ml - Formato Risparmio - Trattamento della Micosi Unghie del Piede e della Mano, Previene la Micosi/Funghi dalle Unghie di Piedi e Mani',83,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71a+IsaPASL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (67,'B08XQQHK37','Cleaner Unghie Sgrassatore Gel Semipermanente Professionale 100 ml - Cleanser Sgrassante per Unghie di Alta Qualit�, Rimuove lo strato di dispersione (appiccicoso) dalle Unghie Gel, Semipermanente',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/31nmFCIcFML.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (68,'B09DQ62H25','Top Coat Lucido Smalto Sigillante per Unghie 12ml ad Asciugatura Rapida - Smalto Trasparente per manicure e pedicure Top Coat per Unghie con Effetto Gloss, Sigilla e Protegge lo Smalto Lucido',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/61gAG1+43fL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (69,'B0963Q2987','Olio Cuticole Unghie di mani e piedi Professionale 12ml - Fragranza Cioccolato - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi, Dona Sollievo e Freschezza alla pelle secca e Irritata',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71s8lQ5v1YL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (70,'B08X21RXF1','Nail Prep Deidratante per Unghie 12 ml - Preparatore Professionale per Unghie, Prepara l''unghia Deidratandola per le Procedure di ricostruzione',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71EE0W3IJgL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (71,'B0CVSDGZBP','Acrigel per Unghie Clear 30 g (2 x 15g)- Gel Acrilico per Ricostruzione Unghie, Acrygel per Estensione Unghie Lunga Tenuta, Compatibile con Colori Gel, Smalto Semipermanente, Decorazioni, Smalt',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71UBCXtJCDL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (72,'B0C4TF7MFH','Cutiway Rimuovi Cuticole Unghie Professionale Profumato 12 ml - Cuticle Remover Efficace - Soluzione Facile e Delicata per Togliere e Spingere le Pellicine - Cuticole Remover per Manicure e Pedicure',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/41FP1Hq+ucL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (73,'B0DGH31BMM','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosa Antico - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (74,'B08JCWDCF2','Primer Unghie Gel Professionale 12 ml di Alta Qualit� - Promotore Adesione NON Acido per Gel Costruttori, Gel Color, Semipermanente, Acrygel, Acrilico, Smalti One Step',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/716Zm9s4KQL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (75,'B0963P8M6Y','Olio Cuticole Unghie di mani e piedi Professionale 12ml - Fragranza Mela - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi, Sollievo e Freschezza alla pelle secca e Irritata',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71SZG3E34yL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (76,'B0963Q6MSP','Olio Cuticole Unghie per mani e piedi Professionale 12ml - Fragranza Arancia - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi, Dona Sollievo e Freschezza alla pelle secca e Irritata',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/719wmTU+AXL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (77,'B0C5Y4QWG2','Olio Cuticole Unghie Premium 12ml | Made in Italy | Formula per Cura delle Cuticole Con Olio di Ribes Nero, Mandorle,Jojoba e Semi di Lino - Rigenerante ed Idratante per Cuticole Secche e Irritate',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71vOLIRlQVL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (78,'B0C9QHPG3Q','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Blu Chiaro Glitter - Smalto Nail Art Gel Semipermanente Alta Precisione per Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81wMfP3KTFL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (79,'B0BK9QLKN1','Primer Unghie Gel ACIDO Professionale 12 ml di Alta Qualit� - Promotore d''Adesione ACIDO per Gel Costruttori, Gel Color, Semipermanente, Acrygel, Acrilico, Smalti One Step',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71JAS6cF+ZL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (80,'B09GVR44Z7','Rimuovi Calli Liquido Strong Professionale 5 ml - Liquido Callifugo per Piedi e Mani, Rimuove i Calli in modo professionale seguendo semplici passaggi',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/61zR52h3D8L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (81,'B0963P222M','Olio Cuticole Unghie di mani e piedi Professionale 12ml - Fragranza Limone - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi, Dona Sollievo e Freschezza alla pelle secca e Irritate',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71MZotSKIgL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (82,'B0DGH1CHWH','Cleaner Unghie Sgrassatore Gel 5 L. - MAXI - Nail Cleaner Sgrassante per Unghie Professionale Ideale per Pulizia Unghie e Rimozione dello Strato di Dispersione (Appiccicoso) (5 Litri, Cocco)',0,'5L_STD','5L',NULL,0,'https://m.media-amazon.com/images/I/71AsSCTDdkL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (83,'B09FLX9CQV','Slip Solution 100 ml Liquido Acrygel Professionale per Unghie - Liquido Modellante per Acrigel Alta Qualit�, Ammorbidisce e Facilita la lavorazione del Gel Ibrido per Unghie',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/51Z03K9+57L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (84,'B0C9QJV244','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Effetto Opaco - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione per Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81P1aeaPBAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (85,'B0C9QJD1JV','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Rosa Party Glitter - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/814Zyy6yoeL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (86,'B0DTZ5PPPB','Cleaner Unghie Sgrassatore Gel UV Semipermanente Professionale 2pz. x 100 ml - Cleanser Sgrassante per Unghie di Alta Qualit�, Rimuove lo strato di dispersione (appiccicoso) dalle Unghie Ricostruite',30,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/71kTYGDfu8L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (87,'B0DT4L4HQR','Remover Semipermanente Unghie 5L. - Fragranza Limone - Rimuovi Smalto Semipermanente per Unghie Professionale - Solvente Rimuovi semipermanente per Unghie',0,'5L_STD','5L',NULL,0,'https://m.media-amazon.com/images/I/61ji7gCvDpL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (88,'B0C8BMXBQH','Acrigel Ricostruzione ed Estensione Unghie, Trasparente, Gel Acrilico 15g Professionale a Lunga Durata, Smalto Semipermanente, Decorazioni',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71dv2O26HAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (89,'B0C9QJMK7T','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Viola Glitter - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione per Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81mVkKy3ykL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (90,'B09G32LP1C','Base Coat Smalto Protettivo per Unghie 12ml ad Asciugatura Rapida - Smalto Lucido per Unghie utilizzato come Base per Smalti Colorati per Unghie',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/61rN+6liVVL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (91,'B0DHVH4TLZ','Cleaner Unghie Sgrassatore Gel 5 L. - MAXI - Nail Cleaner Sgrassante per Unghie Professionale Ideale per Pulizia Unghie e Rimozione dello Strato di Dispersione (Appiccicoso)',0,'5L_STD','5L',NULL,0,'https://m.media-amazon.com/images/I/71AsSCTDdkL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (92,'B0FJMGRDBJ','Olio Cuticole Unghie per mani e piedi Professionale 12ml - Fragranza Monoi- Olio Idratante e Rigenerante per Cuticole di Mani e Piedi',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71kTbeF86RL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (93,'B0DKPBB9K4','Olio Cuticole Unghie 9pz. per mani e piedi Professionale 12ml - Mix di 9 Fragranze - Idea Regalo per lei - Olio Idratante per Cuticole Mani e Piedi, Dona Sollievo e Freschezza',2000,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81tzOYx5bkL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (94,'B0CVB9GWPW','Nail Prep e Primer Unghie Gel 12ml - 2 pz. - Kit Preparatori per Unghie Professionale Migliora Tenuta delle Unghie Ricostruite Primer NON ACIDO Promotore d''adesione e Nail Prep Deidratante per Unghie',0,'KIT_12ML','KIT',NULL,0,'https://m.media-amazon.com/images/I/71YGrxnDgzL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (95,'B0DT4JG66N','Remover Semipermanente Unghie 5L. - Fragranza Limone - Rimuovi Smalto Semipermanente per Unghie Professionale - Solvente Rimuovi semipermanente per Unghie (5 Litri, Solvente Senza Acetone)',0,'5L_STD','5L',NULL,0,'https://m.media-amazon.com/images/I/61JoOK2HTBL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (96,'B095KW4BS4','Rimuovi Cuticole Unghie di Mani e Piedi Professionale 12 ml - Scioglie e Rimuove Cuticole Trattamento per Unghie di Mani e Piedi',10000,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71uQ1vSTbnL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (97,'B09CL6RMWZ','Sgrassatore Unghie Gel alla Menta 100 ml - Cleaner Unghie Sgrassatore Semipermanente - Cleaner Unghie Solvente Smalto Gel UV per Pulizia e Rimozione Strato di Dispersione',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/61YLO32JLiL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (98,'B09VY4M2R4','Olio Cuticole Unghie per mani e piedi Professionale 12ml - Fragranza Ananas - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/714WZp4JyGL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (99,'B07THXCC2C','Lima Prepstone di Preparazione Ricostruzione Unghie, lima levigante in pietra pomice per Unghie',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/31U3AODjfdL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (100,'B0BNNWQKG2','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Black Diamond',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71LAun8knPL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (101,'B0BNP25WPZ','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 1440pz. Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� 1440 pz.Crystal',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71LAun8knPL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (102,'B0CQ5GGYR4','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Bianco Intenso - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (103,'B0BNNYJB5T','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 1440 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Aurora Boreale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71LAun8knPL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (104,'B0C9QJ2W5H','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Giallo Neon Brilla al Buio - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione per Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81mVkKy3ykL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (105,'B0DGGYBWDH','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Verde Chiaro Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (106,'B0DGGZLQ54','Smalto Semipermanente Unghie One Step Uv/Led 10 ml - Rosso Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (107,'B0C8BJCFRY','Acrigel per Unghie Nude Chiaro - Gel Acrilico per Ricostruzione Unghie 15g Professionale, per Estensione Unghie a Lunga Durata, Compatibile con Colori Gel, Smalto Semipermanente, Decorazioni.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71dv2O26HAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (108,'B0DGGWXXBM','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Magenta Porpora - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (109,'B0CQ5GQH4N','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Bianco Latte Semi Trasparente - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (110,'B0BNNYZFDN','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit� Jet',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71LAun8knPL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (111,'B0CQ5KDR5Z','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Beige - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (112,'B0CQ5JZH2B','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Bubble Pink - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (113,'B0CQ5JNDVH','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Milky Soft Pink Clear - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (114,'B0DGGZHMWL','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Corallo Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (115,'B0CFBC4MCP','Top Coat Semipermanente UV/LED 10 ml - Top Coat ULTRA SHINE Smalto Gel Sigillante Unghie Senza Strato di Dispersione, Incrementa la durata e dona un Effetto Lucido a Gel Color, Acrygel, Semipermanenti',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71KXqLbzb-L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (116,'B0DGH2K7ZG','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Lilla Glitter Trasparente - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (117,'B0C9QJFNRT','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Argento Glitter - Smalto Nail Art Gel Semipermanente Alta Precisione per Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81mVkKy3ykL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (118,'B0DGH1NMB3','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Verde Petrolio - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (119,'B0CFBBL77X','Top Coat Semipermanente UV/LED 10 ml - Top Coat OPACO Smalto Gel Sigillante Unghie Senza Strato di Dispersione, Incrementa la durata e dona un Effetto Opaco a Gel Color, Acrygel, Semipermanenti',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71KXqLbzb-L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (120,'B0C8BNK6KS','Acrigel per Unghie Bianco Soft - Gel Acrilico per Ricostruzione Unghie 15g Professionale, Acrygel per Estensione Unghie a Lunga Durata Gel per Ricostruzione, Smalto Semipermanente, Decorazioni.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71dv2O26HAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (121,'B0C8BK5TLH','Pics Nails Tira Fuori Le Unghie Acrigel per Unghie Nude Scuro - Gel Acrilico per Ricostruzione 15g Professionale, Acrygel per Estensione a Lunga Durata, Smalto Semipermanente, Decorazioni.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71dv2O26HAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (122,'B0CQ5GJTT8','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Fucsia Cherry - Smalto Per Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (123,'B0CQ5J8PFK','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Pink - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (124,'B0C8BGKYH3','Acrigel per Unghie Rosa Natural - Gel Acrilico per Ricostruzione Unghie 15g Professionale, Acrygel per Estensione Unghie a Lunga Durata Gel per Ricostruzione, Smalto Semipermanente, Decorazioni.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71dv2O26HAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (125,'B0924Q9M9X','Pics Nails Liquido Professionale per la Pulizia di Trucco e Pennello per Unghie, 100 ml',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/31MNBOJExxL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (126,'B0C9QKH1TX','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Fucsia Glitter - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione per Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81mVkKy3ykL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (127,'B0DGH19R3X','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Grigio Chiaro- Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (128,'B0CQ5HNYKP','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Sangue - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (129,'B0CFB8PV37','Top Coat Semipermanente UV/LED 10 ml - Top Coat NO WIPE Smalto in Gel Sigillante Unghie Senza Strato di Dispersione, Incrementa la durata e dona un Effetto Lucido a Gel Color, Acrygel, Semipermanenti',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71KXqLbzb-L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (130,'B0C9QK6BY6','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Bianco - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione per Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81mVkKy3ykL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (131,'B09JZLHKRP','Cilindri Abrasivi Fresa Unghie in Polvere di Ceramica Ultra Resistenti Grana #100-25 pz. - 5 volte pi� resistenti dei comuni cilindri abrasivi per Fresa Unghie Premium Quality 25pz.=100pz.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/61bxlIeikXL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (132,'B0CQ5HJGFS','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Lilla Silver Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (133,'B0DGGYDWYH','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Grigio - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (134,'B0CQ5K9B5Y','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Champagne Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (135,'B0CQ5HRS3V','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Soft Pink - Colore Permanente Rosa - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (136,'B0CQ5GF8TP','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (137,'B09WYYBFX2','Solvente Semi Permanente Limone 100 ml Professionale � Solvente Soak Off UV-LED � Solvente Semi Permanente (Lime), Giallo',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/61hjxwngsQL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (138,'B0DGGZRVBN','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Grigio Scuro - Smalto Per Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (139,'B0CQ5GN72K','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Beige Nude - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (140,'B0DGGYH1W6','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Sangria - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (141,'B0DGGYG2DK','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosa Glitter Trasparente - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (142,'B0CQ5JLZFN','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Intenso - Smalto Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (143,'B0DGGZX8SH','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Gold Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (144,'B0DTJ6H1WD','Remover Smalto Semipermanente Limone 100 ml Professionale- Rimuovi Smalto Semipermanente Soak Off UV-LED per Unghie - Solvente Rimuovi Smalto semipermanente per Unghie (Remover 2 pz.)',10000,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/61hjxwngsQL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (145,'B0CQ5JDCXT','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Snow White Glitter- Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (146,'B09JZJVF9J','Monomero per Acrilico Unghie Professionale 100 ml - Liquido Acrilico per Polvere Acrilica per Ricostruzione Unghie, Utile per Modellare e Creare le Unghie Finte mediante la Polvere Acrilica per Unghie',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/61VuVnmXF2L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (147,'B08B3YRSQS','Kit Acrygel Polygel Professionale Completo per Ricostruzione Unghie, Colori Gel Acrilico 30ml',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/61+QomdnhkL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (148,'B0C8BJNNGZ','Acrigel per Unghie Bianco Puro - Gel Acrilico per Ricostruzione Unghie 15g Professionale, Acrygel per Estensione Unghie a Lunga Durata Gel per Ricostruzione, Smalto Semipermanente, Decorazioni.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71dv2O26HAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (149,'B0C8BHNTSK','Acrigel per Unghie Rosa Bubble - Gel Acrilico per Ricostruzione Unghie 15g Professionale, Acrygel per Estensione Unghie a Lunga Durata Gel per Ricostruzione, Smalto Semipermanente, Decorazioni.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71dv2O26HAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (150,'B0DGH1JVYT','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Rubino Scuro - Colore Permanente Rosa - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (151,'B0DGGZ2PVC','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Grigio Blu Chiaro - Smalto Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (152,'B0C9QJBSFR','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione per Linee, Colori e Decorazione Unghie Professionale (3. Oro Glitter)',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81mVkKy3ykL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (153,'B0CLS1H8MF','Base Semipermanente Unghie Gel UV-LED 10 ml Trasparente - Smalto Base Coat Universale Per Tutte Le Marche di Smalti Semipermanenti e Gel Per Unghie. Risultati : Unghie Con Lunga Durata !',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/7162jAAUqwL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (154,'B0CQ5KLF9P','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Burgundy - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (155,'B0CQ5HX243','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Puro - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (156,'B0DHXZ9XP8','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Nettare di Pesca - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (157,'B0C8BLBJV1','Acrigel per Unghie Bianco Fumo - Gel Acrilico per Ricostruzione Unghie 15g Professionale, Acrygel per Estensione Unghie a Lunga Durata Gel per Ricostruzione, Smalto Semipermanente, Decorazioni.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71dv2O26HAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (158,'B0DKXXRMZS','Rimuovi Cuticole Unghie di Mani e Piedi Professionale 12 ml - Cuticole Remover che Scioglie e Rimuove le Cuticole per Unghie di Mani e Piedi (2pz. 12 ml (Cuticle Remover + Olio Cuticole))',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71uQ1vSTbnL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (159,'B0CQ5KSMYS','Smalto Semipermanente Unghie One Step Uv/Led 10 ml - Rosso Scuro Semi Trasparente - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (160,'B0C9QG725S','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Effetto Lucido - Smalto Nail Art Gel Semipermanente Alta Precisione per Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81mVkKy3ykL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (161,'B0CQ5K2N9B','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Blu Sky Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (162,'B0FGQPZWQP','Pics Nails Kit Viaggio Liquidi 100 ml � Bottiglie Vuote e Boccette da Viaggio | Flaconi, Contenitori per Liquidi Bagaglio a Mano, Shampoo da Viaggio Aereo, Accessori Utili per Viaggio',0,'KIT_100ML','KIT',NULL,0,'https://m.media-amazon.com/images/I/612YPjakOuL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (163,'B0CQ5JS2TW','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Soft Nude - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (164,'B0CQ5HX7HG','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Pink Nude - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (165,'B0DGH1FZ98','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Rosso Vino - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (166,'B0DGGYL427','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Blu - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (167,'B0DTJ5PVGQ','Remover Semipermanente + Cleaner Unghie Sgrassatore 100 ml x 2 Professionale- Rimuovi Smalto Semipermanente Soak Off UV-LED per Unghie - Sgrassatore per Unghie gel Rimuove lo Strato di dispersione',10000,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/61hjxwngsQL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (168,'B0CQ5JV4KC','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Milky Soft Nude - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (169,'B0C8BJ9RSY','Acrigel per Unghie Rosa Clear - Gel Acrilico per Ricostruzione Unghie 15g Professionale, Acrygel per Estensione Unghie Lunga Tenuta, Compatibile con Colori Gel, Smalto Semipermanente, Decorazioni.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71dv2O26HAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (170,'B0CQ5HRH87','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Mercury Glitter - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (171,'B0CQ5HSSM6','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Milky Soft Beige - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,NULL,NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (172,'B0C8BM925T','Acrigel per Unghie Rosa Chiaro - Gel Acrilico per Ricostruzione Unghie 15g Professionale, Acrygel per Estensione Unghie a Lunga Durata Gel per Ricostruzione, Smalto Semipermanente, Decorazioni.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71WFFPRqUcL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (173,'B0CQ5HTL3X','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Nero - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (174,'B0CVS15HDW','Base e Top Coat No Wipe Smalto Semipermanente per Unghie UV/LED Soak Off - 10 ml - 2 pz. Base Coat Semipermanente e Top Coat No Wipe Smalto Base e Sigillante per Unghie Lucido',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fAYICeO6L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (175,'B0DGGXDFLT','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - Cioccolato al Latte - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (176,'B09JZJ2PL6','Cilindri Abrasivi Fresa Unghie in Ceramica Ultra Resistenti 25 pz. - Grana #240-5 volte pi� resistenti dei comuni cilindri abrasivi per Fresa Unghie Premium Quality 25pz.=100pz.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/61bxlIeikXL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (177,'B0DTZ4W4RT','Cleaner Unghie Sgrassatore Gel Semipermanente Professionale 100 ml - Cleanser Sgrassante per Unghie di Alta Qualit�, Rimuove lo strato di dispersione (appiccicoso)',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/71kTYGDfu8L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (178,'B0BNNXMR2G','Brillantini Unghie per Nail Art e Decorazione SS-5 (1,7mm) - 144 Cristalli per Unghie di Qualit� Professionale, Alta Luminosit�',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71+FgHJglzL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (179,'B0C9QG7FZ2','Smalto Semipermanente Liner Nail Art Gel per Unghie UV/LED 10 ml - Smalto Nail Art Gel Semipermanente con pennello Alta Precisione per Linee, Colori e Decorazione Unghie Professionale',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81mVkKy3ykL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (180,'B0CFB8SZYB','Top Coat Semipermanente Gel UV/LED 10 ml - Top Coat (nome) Smalto in Gel per Unghie Sigillante Professionale, Incrementa la durata e dona un Effetto Lucido/Opaco a Gel Color, Acrygel, Smalti Semipermanenti e Decorazioni per Unghie',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71KXqLbzb-L.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (181,'B09DQ4RTG1','Top Coat Smalto Trasparente Sigillante per Unghie 12ml ad Asciugatura Rapida - Fissa smalto per Unghie Sigilla e Protegge lo Smalto con Effetto Lucido',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/61gAG1+43fL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (182,'B09WZ1TQNV','Remover Smalto Semipermanente Limone 100 ml Professionale- Rimuovi Smalto Semipermanente Soak Off UV-LED per Unghie - Solvente Rimuovi Smalto semipermanente per Unghie',0,'100ML_STD','100ML',NULL,0,'https://m.media-amazon.com/images/I/61hjxwngsQL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (183,'B0C8BK37Q5','Acrigel per Unghie - Gel Acrilico per Ricostruzione Unghie 15g Professionale, Acrygel per Estensione Unghie Lunga Tenuta, Compatibile con Colori Gel, Smalto Semipermanente, Decorazioni, Smalt',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71dv2O26HAL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (184,'B09JZJTY1D','Cilindri Abrasivi Fresa Unghie in Ceramica Ultra Resistenti Grana 240-25 pz. 5 volte pi� resistenti dei comuni cilindri abrasivi per Fresa Unghie Premium Quality 25pz.=100pz.',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/61bxlIeikXL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (185,'B0DKTRN6DK','Antimicotico Unghie Piedi e Mani 12 ml - Trattamento della Micosi Unghie del Piede e della Mano, Previene la Micosi/Funghi dalle Unghie di Piedi e Mani',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71BLmRrLaEL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (186,'B0DKXXYCRD','Rimuovi Cuticole Unghie di Mani e Piedi Professionale 12 ml - Scioglie e Rimuove Cuticole Trattamento per Unghie di Mani e Piedi',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71uQ1vSTbnL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (187,'B0DT4KHJVT','Remover Semipermanente Unghie 5L. - Fragranza Limone - Rimuovi Smalto Semipermanente per Unghie Professionale - Solvente Rimuovi semipermanente per Unghie',0,'5L_STD','5L',NULL,0,'https://m.media-amazon.com/images/I/61ji7gCvDpL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (188,'B0CQ5Q5DLM','Smalto Semipermanente Unghie One Step Uv/Led 12 ml - - Smalto Unghie Gel - Unghie Subito Brillanti Con o Senza Base e Top Coat',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/71fxgkA5unL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (189,'B0DHVJ1VH6','Cleaner Unghie Sgrassatore Gel 5 L. - MAXI - Nail Cleaner Sgrassante per Unghie Professionale Ideale per Pulizia Unghie e Rimozione dello Strato di Dispersione (Appiccicoso)',0,'5L_STD','5L',NULL,0,'https://m.media-amazon.com/images/I/71AsSCTDdkL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (190,'B0963PCLVR','Olio Cuticole Unghie per mani e piedi Professionale 12ml - Fragranza - Olio Idratante e Rigenerante per Cuticole di Mani e Piedi',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/81tzOYx5bkL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (191,'B09NMH29QH','Colla per Unghie Finte Professionale 7.5 g Alta Densit� Extra Forte -Colla per Tip, Brillantini, Adesivi, Glitter, Decorazioni per Unghie Alta Qualit�',0,'12ML_STD','12ML',NULL,0,'https://m.media-amazon.com/images/I/51FVx8S-xiL.jpg',NULL,NULL,'12ML',0,0,0);
INSERT INTO "prodotti" VALUES (208,'B09ALEALEALE','TESTaleTEST',0,'GENERIC','PREPARATORI UNGHIE',1,0,NULL,'ZR-7EAV-GE7X',54,'12ML',0,0,1);
INSERT INTO "prodotti_sfuso" VALUES (1,'Primer NO Acido 12ml','12ml','B08JCWDCF2',5.0,'Primer',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (2,'Primer ACIDO 12ml','12ml','B0BK9QLKN1',5.0,'Primer',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (3,'Rinforzante Calcio 12ml','12ml','B094RK3P5T',5.0,'Trattamento',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (4,'Sciogli Cuticole 12ml','12ml','B095KW4BS4',5.0,'Trattamento',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (5,'Cuti Away Tipo A 12ml','12ml','B0C4TF7MFH',5.0,'Trattamento',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (6,'Indurente 12ml','12ml','B09DQ3KH7Q',5.0,'Trattamento',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (7,'Base Coat 12ml','12ml','B09G32LP1C',5.0,'Base',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (8,'Nail Anti Bite 12ml','12ml','B0977FRJ6M',5.0,'Trattamento',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (9,'Nail Prep 12ml','12ml','B08X21RXF1',5.0,'Preparatore',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (10,'Top Coat 12ml','12ml','B09DQ62H25',5.0,'Top Coat',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (11,'Top Coat Opaco 12ml','12ml','B09DQ5457F',5.0,'Top Coat',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (12,'Base Levigante Rosa 12ml','12ml',NULL,5.0,'Base',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (13,'Base Levigante Bianca 12ml','12ml',NULL,5.0,'Base',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (14,'Antifungo 12ml','12ml','B0BY9Q4KTT',5.0,'Trattamento',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (15,'Top Coat Ultra Shine 10ml','10ml','B0CFBC4MCP',5.0,'Top Coat',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (16,'Top Coat NO Wipe 10ml','10ml','B0CFB8PV37',5.0,'Top Coat',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (17,'Top Coat Matt 10ml','10ml','B0CFBBL77X',5.0,'Top Coat',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (18,'Olio cuticole Vaniglia 12ml','12ml','B0963PF48B',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (19,'Olio cuticole Limone 12ml','12ml','B0963P222M',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (20,'Olio cuticole Cioccolato 12ml','12ml','B0963Q2987',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (21,'Olio cuticole Arancia 12ml','12ml','B0963Q6MSP',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (22,'Olio cuticole Fragola 12ml','12ml','B09VY51ZFF',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (23,'Olio cuticole Ananas 12ml','12ml','B09VY4M2R4',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (24,'Olio cuticole Mela 12ml','12ml','B0963P8M6Y',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (25,'Olio cuticole Cocco 12ml','12ml','B0CHMK6QTY',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (26,'Olio cuticole Lavanda 12ml','12ml','B0CHMLJD7K',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (27,'Olio cuticole Frutas del Bosque 12ml','12ml','B0CHMK39L9',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (28,'Olio cuticole Banana 12ml','12ml','B0CHMJ7HW8',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (29,'Olio cuticole Caramello 12ml','12ml','B0FJMF75RR',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (30,'Olio cuticole Monoi 12ml','12ml','B0FJMGRDBJ',5.0,'Olio Cuticole',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (31,'Remover 100ml','100ml','B094YJC9HR',5.0,'Remover',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (32,'Remover 100ml (kit)','100ml','B0DTJ6H1WD',5.0,'Remover',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (33,'Remover Limone 100ml','100ml',NULL,5.0,'Remover',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (34,'Cleaner 100ml','100ml','B09WYYBFX2',5.0,'Cleaner',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (35,'Cleaner 100ml (kit)','100ml','B08XQQHK37',5.0,'Cleaner',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (36,'Cleaner 100ml (kit 2)','100ml','B0DTZ5PPPB',5.0,'Cleaner',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (37,'Cleaner Menta 100ml','100ml','B09CL6RMWZ',5.0,'Cleaner',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (38,'Cleaner Cocco 100ml','100ml','B0DXVQ42VH',5.0,'Cleaner',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (39,'Slip Solution 100ml','100ml','B09FLX9CQV',5.0,'Polygel',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (40,'Brush Cleaner 100ml','100ml','B0924Q9M9X',5.0,'Pulizia Pennelli',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (41,'Solvente NO Acetone 100ml (BubbleGum)','100ml','B09238F1VL',5.0,'Solvente',0.0,'2025-10-22 13:04:15');
INSERT INTO "prodotti_sfuso" VALUES (42,'Liquido Acrilico Monomero Mango 100ml','100ml','B0FTSN1X1V',5.0,'Monomero',0.0,'2025-10-22 13:04:15');
INSERT INTO "produzioni_sfuso" VALUES (1,1,'B08JCWDCF2','Primer NO Acido 12ml','12ml','Pianificata','',0,'2025-11-25 10:23:51',NULL,NULL,NULL,'admin',55,0,0,0.662650602409639,NULL);
INSERT INTO "produzioni_sfuso" VALUES (2,1,'B08JCWDCF2','Primer NO Acido 12ml','12ml','Pianificata','',0,'2025-11-25 10:24:01',NULL,NULL,NULL,'admin',55,0,0,0.662650602409639,NULL);
INSERT INTO "ricette_accessori" VALUES ('12ML_STD','BOCCETTA_12_ML',1);
INSERT INTO "ricette_accessori" VALUES ('12ML_STD','TAPPO_12_ML',1);
INSERT INTO "ricette_accessori" VALUES ('12ML_STD','PENNELLO_12_ML',1);
INSERT INTO "ricette_accessori" VALUES ('100ML_STD','BOCCETTA_100_ML',1);
INSERT INTO "ricette_accessori" VALUES ('100ML_STD','TAPPO_100_ML',1);
INSERT INTO "ricette_accessori" VALUES ('KIT_12ML','BOCCETTA_12_ML',1);
INSERT INTO "ricette_accessori" VALUES ('KIT_12ML','TAPPO_12_ML',1);
INSERT INTO "ricette_accessori" VALUES ('KIT_12ML','PENNELLO_12_ML',1);
INSERT INTO "ricette_accessori" VALUES ('KIT_100ML','BOCCETTA_100_ML',1);
INSERT INTO "ricette_accessori" VALUES ('KIT_100ML','TAPPO_100_ML',1);
INSERT INTO "sfuso" VALUES (1,'Primer NO Acido 12ml','12ml','["B08JCWDCF2"]','David Fadda','w456798','f13456',5.0,4.459,'attivo','2025-10-18 17:24:03','2025-10-24 16:45:11',2355.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (2,'Primer ACIDO 12ml','12ml','["B0BK9QLKN1"]','Alessio Vinci','-','-',2.0,6.0,'attivo','2025-10-18 17:24:03','2025-10-21 10:57:43',1602.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (3,'Rinforzante Calcio 12ml','12ml','["B094RK3P5T"]','-','-','-',0.0,9.0,'attivo','2025-10-18 17:24:03','2025-10-21 10:41:46',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (4,'Sciogli Cuticole 12ml','12ml','["B095KW4BS4"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (5,'Cuti Away Tipo "A" 12ml','12ml','["B0C4TF7MFH"]','Alessio Vinci','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',492.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (6,'Indurente 12ml','12ml','["B09DQ3KH7Q"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (7,'Base Coat 12ml','12ml','["B09G32LP1C"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (8,'Nail Anti Bite 12ml','12ml','["B0977FRJ6M"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (9,'Nail Prep 12ml','12ml','["B08X21RXF1"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (10,'Top Coat 12ml','12ml','["B09DQ62H25"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (11,'Top Coat Opaco 12ml','12ml','["B09DQ5457F"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (12,'Base Levigante Rosa 12ml','12ml','[]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (13,'Base Levigante Bianca 12ml','12ml','[]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (14,'Antifungo 12ml','12ml','["B0BY9Q4KTT","B0DKTQXDR9"]','-','ytrewq','qwerty',-6.662,0.0,'attivo','2025-10-18 17:24:03','2025-10-21 15:49:28',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (15,'Top Coat Ultra Shine 10ml','10ml','["B0CFBC4MCP"]','-','-','-',0.0,50.0,'attivo','2025-10-18 17:24:03','2025-10-20 12:12:00',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (16,'Top Coat NO Wipe 10ml','10ml','["B0CFB8PV37"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (17,'Top Coat Matt 10ml','10ml','["B0CFBBL77X"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (18,'Olio cuticole Vaniglia 12ml','12ml','["B0963PF48B"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (19,'Olio cuticole Limone 12ml','12ml','["B0963P222M"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (20,'Olio cuticole Cioccolato 12ml','12ml','["B0963Q2987"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (21,'Olio cuticole Arancia 12ml','12ml','["B0963Q6MSP"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (22,'Olio cuticole Fragola 12ml','12ml','["B09VY51ZFF"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (23,'Olio cuticole Ananas 12ml','12ml','["B09VY4M2R4"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (24,'Olio cuticole Mela 12ml','12ml','["B0963P8M6Y"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (25,'Olio cuticole Cocco 12ml','12ml','["B0CHMK6QTY"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (26,'Olio cuticole Lavanda 12ml','12ml','["B0CHMLJD7K"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (27,'Olio cuticole Frutas del Bosques 12ml','12ml','["B0CHMK39L9"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (28,'Olio cuticole Banana 12ml','12ml','["B0CHMJ7HW8"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (29,'Olio cuticole Caramello 12ml','12ml','["B0FJMF75RR"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (30,'Olio cuticole Monoi 12ml','12ml','["B0FJMGRDBJ"]','-','-','-',0.0,0.0,'attivo','2025-10-18 17:24:03','2025-10-18 15:24:03',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (35,'Remover 100ml','100ml','["B094YJC9HR","B0DTJ6H1WD"]','-','-',NULL,0.0,0.0,'attivo','2025-10-18 15:47:27','2025-10-18 15:47:27',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (36,'Remover Limone 100ml','100ml','["B09WYYBFX2"]','-','-',NULL,0.0,0.0,'attivo','2025-10-18 15:47:27','2025-10-18 15:47:27',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (37,'Cleaner 100ml','100ml','["B08XQQHK37","B0DTZ5PPPB"]','David Fadda','R789465','a456789',7.0,5.0,'attivo','2025-10-18 15:47:27','2025-10-21 15:52:52',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (38,'Cleaner Menta 100ml','100ml','["B09CL6RMWZ"]','-','-',NULL,0.0,0.0,'attivo','2025-10-18 15:47:27','2025-10-18 15:47:27',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (39,'Cleaner Cocco 100ml','100ml','["B0DXVQ42VH"]','-','-',NULL,0.0,0.0,'attivo','2025-10-18 15:47:27','2025-10-18 15:47:27',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (40,'Slip Solution 100ml','100ml','["B09FLX9CQV"]','-','-',NULL,0.0,0.0,'attivo','2025-10-18 15:47:27','2025-10-18 15:47:27',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (41,'Brush Cleaner 100ml','100ml','["B0924Q9M9X"]','-','-',NULL,0.0,0.0,'attivo','2025-10-18 15:47:27','2025-10-18 15:47:27',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (42,'Solvente NO Acetone (BubbleGum) 100ml','100ml','["B09238F1VL"]','-','-',NULL,0.0,0.0,'attivo','2025-10-18 15:47:27','2025-10-18 15:47:27',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (43,'Liquido Acrilico Monomero Mango 100ml','100ml','["B0FTSN1X1V"]','-','-',NULL,0.0,0.0,'attivo','2025-10-18 15:47:27','2025-10-18 15:47:27',0.0,NULL,NULL);
INSERT INTO "sfuso" VALUES (54,'TESTaleTEST','12ml','[]','Alessio Vinci','-','-',5.0,0.0,'attivo','2025-10-29 10:32:09','2025-10-29 09:32:09',123.0,'B09ALEALEALE','B09ALEALEALE');
INSERT INTO "sfuso_movimenti" VALUES (1,1,'Senza nome','12ml','123456','','RETTIFICA',50.0,'alessio','test','2025-10-07 13:09:09');
INSERT INTO "sfuso_movimenti" VALUES (2,1,'Prodotto 12ml','12ml','123456','N/D','RETTIFICA',50.0,'alessio','test','2025-10-07 13:11:57');
INSERT INTO "sfuso_movimenti" VALUES (3,1,'Prodotto 12ml','12ml','123456','N/D','RETTIFICA',50.0,'alessio','test','2025-10-07 13:21:39');
INSERT INTO "sfuso_movimenti" VALUES (4,1,'Prodotto 12ml','12ml','123456','N/D','RETTIFICA',50.0,'alessio','test','2025-10-07 13:30:27');
INSERT INTO "sfuso_movimenti" VALUES (5,1,'Prodotto 12ml','12ml','123456','N/D','RETTIFICA',555.0,'alessio','test','2025-10-07 13:32:11');
INSERT INTO "sfuso_movimenti" VALUES (6,1,'Prodotto 12ml','12ml','123456','N/D','RETTIFICA',50.0,'alessio','test','2025-10-07 13:37:56');
INSERT INTO "sfuso_movimenti" VALUES (7,1,'Prodotto 12ml','12ml','123456','N/D','RETTIFICA',50.0,'alessio','test','2025-10-07 14:32:20');
INSERT INTO "sfuso_movimenti" VALUES (8,1,'Prodotto 12ml','12ml','123456','N/D','RETTIFICA',666.0,'alessio','test','2025-10-07 14:32:59');
INSERT INTO "sfuso_movimenti" VALUES (9,1,'Prodotto 12ml','12ml','123456','N/D','RETTIFICA',888.0,'alessio','test','2025-10-07 14:39:29');
INSERT INTO "sfuso_movimenti" VALUES (10,1,'Prodotto 12ml','12ml','123456','N/D','RETTIFICA',888.0,'alessio','test','2025-10-07 14:41:07');
INSERT INTO "sfuso_movimenti" VALUES (11,1,'Senza nome','12ml','k55555','N/D','RETTIFICA',0.0,'alessio','Aggiornato lotto a k55555. test','2025-10-07 14:44:05');
INSERT INTO "sfuso_movimenti" VALUES (12,1,'Prodotto 12ml','12ml','k55555','N/D','RETTIFICA',1000.0,'alessio','test','2025-10-07 14:51:50');
INSERT INTO "sfuso_movimenti" VALUES (13,1,'Prodotto 12ml','12ml','k55555','N/D','RETTIFICA',999.0,'alessio','test','2025-10-07 14:56:01');
INSERT INTO "sfuso_movimenti" VALUES (14,1,'Prodotto 12ml','12ml','k55555','N/D','RETTIFICA',777.0,'alessio','test','2025-10-07 15:04:12');
INSERT INTO "sfuso_movimenti" VALUES (15,1,'Prodotto 12ml','12ml','k55555','N/D','RETTIFICA',666.0,'alessio','test','2025-10-07 15:08:23');
INSERT INTO "sfuso_movimenti" VALUES (16,1,'Prodotto 12ml','12ml','k55555','N/D','RETTIFICA',555.0,'alessio','test','2025-10-07 15:10:00');
INSERT INTO "sfuso_movimenti" VALUES (17,1,'Prodotto 12ml','12ml','k55555','N/D','RETTIFICA',444.0,'ALESSIO','TEST','2025-10-07 15:35:49');
INSERT INTO "sfuso_movimenti" VALUES (18,1,'Prodotto 12ml','12ml','k55555','N/D','RETTIFICA',333.0,'alessio','test','2025-10-07 15:38:55');
INSERT INTO "sfuso_movimenti" VALUES (19,1,'Prodotto 12ml','12ml','k55555','N/D','RETTIFICA',222.0,'alessio','test','2025-10-07 15:56:18');
INSERT INTO "sfuso_movimenti" VALUES (20,1,'Prodotto 12ml','12ml','k55555','N/D','RETTIFICA',111.0,'AlEsSiO','test','2025-10-07 15:56:44');
INSERT INTO "sfuso_movimenti" VALUES (21,1,'Senza nome','12ml','f22222','N/D','RETTIFICA',0.0,'alessio','Aggiornato lotto a f22222. test','2025-10-07 15:58:25');
INSERT INTO "sfuso_movimenti" VALUES (22,1,'Prodotto 12ml','12ml','f22222','N/D','RETTIFICA',222.0,'ALESSIO','TEST','2025-10-07 16:18:11');
INSERT INTO "sfuso_movimenti" VALUES (23,1,'Prodotto 12ml','12ml','f22222','N/D','RETTIFICA',333.0,'alessio','test','2025-10-07 17:05:40');
INSERT INTO "sfuso_movimenti" VALUES (24,1,'Prodotto 12ml','12ml','f22222','N/D','RETTIFICA',546.0,'alessio','test','2025-10-07 17:14:10');
INSERT INTO "sfuso_movimenti" VALUES (25,1,'Senza nome','12ml','K421j56','N/D','RETTIFICA',0.0,'Alessio','Aggiornato lotto a K421j56. nuovo lotto','2025-10-07 17:14:39');
INSERT INTO "sfuso_movimenti" VALUES (26,1,'Prodotto 12ml','12ml','K421j56','N/D','RETTIFICA',666.0,'Alessio','test','2025-10-07 17:16:36');
INSERT INTO "sfuso_movimenti" VALUES (27,1,'Senza nome','12ml','G456789','N/D','RETTIFICA',0.0,'alessio','Aggiornato lotto a G456789. test','2025-10-07 17:16:54');
INSERT INTO "sfuso_movimenti" VALUES (28,1,'Prodotto 12ml','12ml','G456789','N/D','RETTIFICA',555.0,'alessio','test','2025-10-07 17:32:24');
INSERT INTO "sfuso_movimenti" VALUES (29,1,'Prodotto 12ml','12ml','G456789','N/D','RETTIFICA',500.0,'alessio','test','2025-10-08 11:37:15');
INSERT INTO "sfuso_movimenti" VALUES (30,1,'Prodotto 12ml','12ml','G456789','N/D','RETTIFICA',30.0,'alessio','test','2025-10-08 11:37:37');
INSERT INTO "sfuso_movimenti" VALUES (31,1,'Prodotto 12ml','12ml','G456789','N/D','RETTIFICA',100.0,'alessio','test','2025-10-08 11:42:52');
INSERT INTO "sfuso_movimenti" VALUES (32,1,'Prodotto 12ml','12ml','G456789','N/D','RETTIFICA',150.0,'alessio','test','2025-10-08 14:37:52');
INSERT INTO "sfuso_movimenti" VALUES (33,1,'Senza nome','12ml','h45678','N/D','RETTIFICA',0.0,'alessio','Aggiornato lotto a h45678. test','2025-10-08 14:51:27');
INSERT INTO "sfuso_movimenti" VALUES (34,1,'Senza nome','12ml','f456789','N/D','RETTIFICA',0.0,'alessio','Aggiornato lotto a f456789. test','2025-10-08 14:52:59');
INSERT INTO "sfuso_movimenti" VALUES (35,1,'Senza nome','12ml','F456123','N/D','RETTIFICA',0.0,'alessio','Aggiornato lotto_old a F456123. test','2025-10-08 14:56:28');
INSERT INTO "sfuso_movimenti" VALUES (36,1,'Senza nome','12ml','T789456','N/D','RETTIFICA',0.0,'alessio','Aggiornato lotto_old a T789456. test','2025-10-08 14:56:47');
INSERT INTO "sfuso_movimenti" VALUES (37,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',1.0,'alessio','test','2025-10-08 15:28:40');
INSERT INTO "sfuso_movimenti" VALUES (38,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',50.0,'alessio','test','2025-10-08 15:28:48');
INSERT INTO "sfuso_movimenti" VALUES (39,2,'Prodotto 100ml','100ml','LOTTO-100ML-001','N/D','RETTIFICA',85.0,'alessio','test','2025-10-09 10:22:53');
INSERT INTO "sfuso_movimenti" VALUES (40,2,'Senza nome','100ml','R789456','N/D','RETTIFICA',0.0,'Alessio','Aggiornato lotto_old a R789456. test','2025-10-09 10:23:20');
INSERT INTO "sfuso_movimenti" VALUES (41,2,'Senza nome','100ml','c456789','N/D','RETTIFICA',0.0,'Alessio','Aggiornato lotto_old a c456789. undefined','2025-10-09 10:42:07');
INSERT INTO "sfuso_movimenti" VALUES (42,2,'Senza nome','100ml','w789465','N/D','RETTIFICA',0.0,'Alessio','Aggiornato lotto_old a w789465. undefined','2025-10-09 10:47:32');
INSERT INTO "sfuso_movimenti" VALUES (43,2,'Senza nome','100ml','H456789','N/D','RETTIFICA',0.0,'Alessio','Aggiornato lotto a H456789','2025-10-09 10:50:12');
INSERT INTO "sfuso_movimenti" VALUES (44,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',50.0,'Alessio','test','2025-10-09 11:52:04');
INSERT INTO "sfuso_movimenti" VALUES (45,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',1.0,'Alessio','test','2025-10-09 11:52:13');
INSERT INTO "sfuso_movimenti" VALUES (46,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',5.0,'Alessio','test','2025-10-09 11:53:17');
INSERT INTO "sfuso_movimenti" VALUES (47,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 11:55:40');
INSERT INTO "sfuso_movimenti" VALUES (48,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 11:57:40');
INSERT INTO "sfuso_movimenti" VALUES (49,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 12:01:07');
INSERT INTO "sfuso_movimenti" VALUES (50,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 12:02:00');
INSERT INTO "sfuso_movimenti" VALUES (51,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 12:05:22');
INSERT INTO "sfuso_movimenti" VALUES (52,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 12:06:47');
INSERT INTO "sfuso_movimenti" VALUES (53,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 12:15:02');
INSERT INTO "sfuso_movimenti" VALUES (54,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 12:16:55');
INSERT INTO "sfuso_movimenti" VALUES (55,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 12:24:16');
INSERT INTO "sfuso_movimenti" VALUES (56,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 12:26:23');
INSERT INTO "sfuso_movimenti" VALUES (57,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 12:27:49');
INSERT INTO "sfuso_movimenti" VALUES (58,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 14:17:15');
INSERT INTO "sfuso_movimenti" VALUES (59,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 14:20:06');
INSERT INTO "sfuso_movimenti" VALUES (60,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 14:21:08');
INSERT INTO "sfuso_movimenti" VALUES (61,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 14:23:06');
INSERT INTO "sfuso_movimenti" VALUES (62,1,'Prodotto 12ml','12ml','f456789','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 14:34:11');
INSERT INTO "sfuso_movimenti" VALUES (63,1,'Senza nome','12ml','F753159','N/D','RETTIFICA',0.0,'Alessio','Aggiornato lotto a F753159','2025-10-09 14:34:51');
INSERT INTO "sfuso_movimenti" VALUES (64,1,'Prodotto 12ml','12ml','F753159','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-09 15:04:47');
INSERT INTO "sfuso_movimenti" VALUES (65,1,'Prodotto 12ml','12ml','F753159','N/D','RETTIFICA',20.0,'Alessio','test','2025-10-15 10:32:23');
INSERT INTO "sfuso_movimenti" VALUES (66,3,'Remover 100ml','100ml','I45613','N/D','RETTIFICA',0.0,'Alessio','Aggiornato lotto_old a I45613. undefined','2025-10-15 14:31:24');
INSERT INTO "sfuso_movimenti" VALUES (67,14,'Prodotto 12ml','12ml','-','N/D','RETTIFICA',4.0,'Alessio','test','2025-10-18 17:59:05');
INSERT INTO "sfuso_movimenti" VALUES (68,1,'Prodotto 12ml','12ml','-','N/D','RETTIFICA',5.0,'Alessio','test','2025-10-21 10:10:29');
INSERT INTO "sfuso_movimenti" VALUES (69,1,'Primer NO Acido 12ml','12ml','f13456','-','RETTIFICA',0.0,'Alessio','Aggiornato lotto_old a f13456. undefined','2025-10-21 10:10:42');
INSERT INTO "sfuso_movimenti" VALUES (70,1,'Primer NO Acido 12ml','12ml','w456798','-','RETTIFICA',0.0,'Alessio','Aggiornato lotto a w456798','2025-10-21 10:10:51');
INSERT INTO "sfuso_movimenti" VALUES (71,2,'Prodotto 12ml','12ml','-','N/D','RETTIFICA',3.0,'Alessio','test','2025-10-21 10:55:14');
INSERT INTO "sfuso_movimenti" VALUES (72,2,'Prodotto 12ml','12ml','-','N/D','RETTIFICA',2.0,'Alessio','test','2025-10-21 10:57:43');
INSERT INTO "sfuso_movimenti" VALUES (73,1,'Prodotto 12ml','12ml','w456798','N/D','RETTIFICA',10.0,'Alessio','test','2025-10-21 15:29:13');
INSERT INTO "sfuso_movimenti" VALUES (74,14,'Antifungo 12ml','12ml','qwerty','-','RETTIFICA',0.0,'Alessio','Aggiornato lotto_old a qwerty. undefined','2025-10-21 15:49:14');
INSERT INTO "sfuso_movimenti" VALUES (75,14,'Antifungo 12ml','12ml','ytrewq','-','RETTIFICA',0.0,'Alessio','Aggiornato lotto a ytrewq','2025-10-21 15:49:28');
INSERT INTO "sfuso_movimenti" VALUES (76,37,'Prodotto 100ml','100ml','-','N/D','RETTIFICA',7.0,'Alessio','test','2025-10-21 15:52:33');
INSERT INTO "sfuso_movimenti" VALUES (77,37,'Cleaner 100ml','100ml','a456789','-','RETTIFICA',0.0,'Alessio','Aggiornato lotto_old a a456789. undefined','2025-10-21 15:52:43');
INSERT INTO "sfuso_movimenti" VALUES (78,37,'Cleaner 100ml','100ml','R789465','-','RETTIFICA',0.0,'Alessio','Aggiornato lotto a R789465','2025-10-21 15:52:52');
INSERT INTO "sfuso_movimenti" VALUES (79,1,'Prodotto 12ml','12ml','w456798','N/D','RETTIFICA',50.0,'Alessio','test','2025-10-24 16:42:00');
INSERT INTO "sfuso_movimenti" VALUES (80,1,'Prodotto 12ml','12ml','w456798','N/D','RETTIFICA',5.0,'Alessio','test','2025-10-24 16:45:11');
INSERT INTO "sfuso_old" VALUES (1,'Placeholder Sfuso','12ml',100.0,'Lotto-Test','2025-10-20 11:22:24');
INSERT INTO "spedizioni" VALUES (31,'IT-1','IT','2025-10-24','2','','CONFERMATA','2025-10-24 15:02:08');
INSERT INTO "spedizioni_righe" VALUES (39,31,'B094YJC9HR',NULL,'Remover Semipermanente Unghie Acetone Puro Rimuovi Smalto Semipermanente per Unghie Professionale - Solvente Rimuovi Smalto semipermanente per Unghie 100 ml',1);
INSERT INTO "spedizioni_righe" VALUES (40,31,'B094RK3P5T',NULL,'Smalto Rinforzante Unghie Istantaneo al Calcio Extra Forte - 12 ml Rinforza e Migliora istantaneamente la struttura dell''unghia Fragili e Deboli.',100);
INSERT INTO "storico_movimenti" VALUES (1,NULL,'BOCCETTA_100_ML','Boccetta 100 ml',10000006,10000007,'test','Alessio','RETTIFICA_ACCESSORIO','2025-09-14 07:48:24');
INSERT INTO "storico_movimenti" VALUES (2,NULL,'BOCCETTA_100_ML','Boccetta 100 ml',10000007,10000008,'test','Alessio','RETTIFICA_ACCESSORIO','2025-09-14 07:58:15');
INSERT INTO "storico_movimenti" VALUES (3,NULL,'BOCCETTA_100_ML','Boccetta 100 ml',10000008,10000009,'test','Alessio','RETTIFICA_ACCESSORIO','2025-09-14 08:00:46');
INSERT INTO "storico_movimenti" VALUES (4,NULL,'BOCCETTA_100_ML','Boccetta 100 ml',10000009,100000010,'test','Alessio','RETTIFICA_ACCESSORIO','2025-09-14 08:02:22');
INSERT INTO "storico_movimenti" VALUES (5,NULL,'BOCCETTA_100_ML','Boccetta 100 ml',100000010,100000015,'test','Alessio','RETTIFICA_ACCESSORIO','2025-09-18 08:19:49');
INSERT INTO "storico_movimenti" VALUES (6,NULL,'BOCCETTA_100_ML','Boccetta 100 ml',100000018,100000019,'test','Alessio','RETTIFICA_ACCESSORIO','2025-09-18 08:50:13');
INSERT INTO "storico_movimenti" VALUES (7,NULL,'BOCCETTA_100_ML','Boccetta 100 ml',100000019,100000020,'test','Alessio','RETTIFICA_ACCESSORIO','2025-09-18 15:40:33');
INSERT INTO "storico_movimenti" VALUES (8,NULL,'BOCCETTA_12_ML','Boccetta 12 ml',924519,100,'test','Alessio','RETTIFICA_ACCESSORIO','2025-10-24 14:56:11');
INSERT INTO "storico_produzioni_sfuso" VALUES (1,1,1,'B08JCWDCF2','Primer NO Acido 12ml','12ml',NULL,NULL,55,0.662650602409639,'CREATA','da 55 a 55','admin','2025-11-25 11:23:51');
INSERT INTO "storico_produzioni_sfuso" VALUES (2,2,1,'B08JCWDCF2','Primer NO Acido 12ml','12ml',NULL,NULL,55,0.662650602409639,'CREATA','da 55 a 55','admin','2025-11-25 11:24:01');
INSERT INTO "storico_produzioni_sfuso" VALUES (3,2,1,'B08JCWDCF2','Primer NO Acido 12ml','12ml',NULL,NULL,55,0.663,'ANNULLATA','Prenotazione annullata','admin','2025-11-25 10:24:29');
INSERT INTO "storico_sfuso" VALUES (1,'RETTIFICA','litri_disponibili_old','6.0','test','Alessio','12ml','RETTIFICA','-',NULL,0,0,0,'Media',2,NULL,'2025-10-21 08:57:15');
INSERT INTO "storico_sfuso" VALUES (2,'RETTIFICA','litri_disponibili','2.0','test','Alessio','12ml','RETTIFICA','-',NULL,0,0,0,'Media',2,NULL,'2025-10-21 08:57:43');
INSERT INTO "storico_sfuso" VALUES (3,'PRENOTAZIONE','litriImpegnati','1.807',NULL,'admin','12ml','PRENOTAZIONE','w456798',150,150,150,150,'Media',1,7,'2025-10-21 09:06:49');
INSERT INTO "storico_sfuso" VALUES (4,'PRENOTAZIONE','litriImpegnati','1.807',NULL,'admin','12ml','PRENOTAZIONE','w456798',150,150,150,150,'Media',1,8,'2025-10-21 09:07:06');
INSERT INTO "storico_sfuso" VALUES (5,'PRENOTAZIONE','litriImpegnati','1.807',NULL,'admin','12ml','PRENOTAZIONE','w456798',150,150,150,150,'Media',1,9,'2025-10-21 09:30:44');
INSERT INTO "storico_sfuso" VALUES (6,'PRENOTAZIONE','litriImpegnati','1.337',NULL,'admin','12ml','PRENOTAZIONE','w456798',111,111,111,111,'Media',1,10,'2025-10-21 10:00:35');
INSERT INTO "storico_sfuso" VALUES (7,'PRENOTAZIONE','litriImpegnati','1.337',NULL,'admin','12ml','PRENOTAZIONE','w456798',111,111,111,111,'Media',1,11,'2025-10-21 10:22:30');
INSERT INTO "storico_sfuso" VALUES (8,'PRENOTAZIONE','litriImpegnati','2.0',NULL,'admin','12ml','PRENOTAZIONE','w456798',166,166,166,166,'Media',1,12,'2025-10-21 10:23:40');
INSERT INTO "storico_sfuso" VALUES (9,'PRENOTAZIONE','litriImpegnati','2.0',NULL,'admin','12ml','PRENOTAZIONE','w456798',166,166,166,166,'Media',1,13,'2025-10-21 10:26:52');
INSERT INTO "storico_sfuso" VALUES (10,'PRENOTAZIONE','litriImpegnati','2.0',NULL,'admin','12ml','PRENOTAZIONE','w456798',166,166,166,166,'Media',1,14,'2025-10-21 10:31:15');
INSERT INTO "storico_sfuso" VALUES (11,'PRENOTAZIONE','litriImpegnati','5.0',NULL,'admin','12ml','PRENOTAZIONE','w456798',415,415,415,415,'Media',1,15,'2025-10-21 10:31:26');
INSERT INTO "storico_sfuso" VALUES (12,'PRENOTAZIONE','FIFO','3L da f13456 + 2L da w456798','Assegnazione FIFO','admin','12ml','In lavorazione','f13456 + w456798',415,0,0,0,'Media',1,16,'2025-10-21 10:45:57');
INSERT INTO "storico_sfuso" VALUES (13,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','f13456',415,0,0,0,'Media',1,15,'2025-10-21 10:45:57');
INSERT INTO "storico_sfuso" VALUES (14,'RETTIFICA','note','[21/10/2025, 12:47:32] test','test','admin','12ml','Annullata','w456798',166,415,415,415,'Media',1,16,'2025-10-21 10:47:32');
INSERT INTO "storico_sfuso" VALUES (15,'RETTIFICA','note','[21/10/2025, 12:47:39] test','test','admin','12ml','In lavorazione','f13456',249,415,415,415,'Media',1,15,'2025-10-21 10:47:39');
INSERT INTO "storico_sfuso" VALUES (16,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',166,0,0,0,'Media',1,14,'2025-10-21 10:48:01');
INSERT INTO "storico_sfuso" VALUES (17,'PRENOTAZIONE','FIFO','1L da f13456 + 1L da w456798','Assegnazione FIFO','admin','12ml','In lavorazione','f13456 + w456798',166,0,0,0,'Media',1,17,'2025-10-21 10:48:02');
INSERT INTO "storico_sfuso" VALUES (18,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',166,0,0,0,'Media',1,12,'2025-10-21 10:48:02');
INSERT INTO "storico_sfuso" VALUES (19,'RETTIFICA','FIFO','1.0','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','f13456',NULL,NULL,NULL,NULL,NULL,1,12,'2025-10-21 12:52:13');
INSERT INTO "storico_sfuso" VALUES (20,'RETTIFICA','FIFO','1.0','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','w456798',NULL,NULL,NULL,NULL,NULL,1,17,'2025-10-21 12:52:13');
INSERT INTO "storico_sfuso" VALUES (21,'Annullata','stato','Annullata',NULL,'admin','12ml','Annullata','w456798',83,166,166,166,'Media',1,17,'2025-10-21 12:52:13');
INSERT INTO "storico_sfuso" VALUES (22,'RETTIFICA','FIFO','2.0','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','f13456',NULL,NULL,NULL,NULL,NULL,1,14,'2025-10-21 12:52:27');
INSERT INTO "storico_sfuso" VALUES (23,'Annullata','stato','Annullata',NULL,'admin','12ml','Annullata','f13456',166,166,166,166,'Media',1,14,'2025-10-21 12:52:27');
INSERT INTO "storico_sfuso" VALUES (24,'RETTIFICA','FIFO','1.0','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','f13456',NULL,NULL,NULL,NULL,NULL,1,12,'2025-10-21 13:01:30');
INSERT INTO "storico_sfuso" VALUES (25,'RETTIFICA','FIFO','1.0','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','w456798',NULL,NULL,NULL,NULL,NULL,1,17,'2025-10-21 13:01:30');
INSERT INTO "storico_sfuso" VALUES (26,'Annullata','stato','Annullata',NULL,'admin','12ml','Annullata','f13456',83,166,166,166,'Media',1,12,'2025-10-21 13:01:30');
INSERT INTO "storico_sfuso" VALUES (27,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',111,NULL,NULL,NULL,NULL,1,11,'2025-10-21 13:01:32');
INSERT INTO "storico_sfuso" VALUES (28,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',150,NULL,NULL,NULL,NULL,1,9,'2025-10-21 13:01:36');
INSERT INTO "storico_sfuso" VALUES (29,'PRENOTAZIONE','FIFO','1.8560000000000003L da f13456 + 0.14399999999999968L da w456798','Assegnazione FIFO','admin','12ml','In lavorazione','f13456 + w456798',166,NULL,NULL,NULL,NULL,1,18,'2025-10-21 13:01:43');
INSERT INTO "storico_sfuso" VALUES (30,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',166,NULL,NULL,NULL,NULL,1,13,'2025-10-21 13:01:43');
INSERT INTO "storico_sfuso" VALUES (31,'RETTIFICA','FIFO','1.856','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','f13456',NULL,NULL,NULL,NULL,NULL,1,13,'2025-10-21 13:01:56');
INSERT INTO "storico_sfuso" VALUES (32,'RETTIFICA','FIFO','0.144','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','w456798',NULL,NULL,NULL,NULL,NULL,1,18,'2025-10-21 13:01:56');
INSERT INTO "storico_sfuso" VALUES (33,'Annullata','stato','Annullata',NULL,'admin','12ml','Annullata','w456798',11,166,166,166,'Media',1,18,'2025-10-21 13:01:56');
INSERT INTO "storico_sfuso" VALUES (34,'RETTIFICA','FIFO','1.856','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','f13456',NULL,NULL,NULL,NULL,NULL,1,13,'2025-10-21 13:01:57');
INSERT INTO "storico_sfuso" VALUES (35,'RETTIFICA','FIFO','0.144','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','w456798',NULL,NULL,NULL,NULL,NULL,1,18,'2025-10-21 13:01:57');
INSERT INTO "storico_sfuso" VALUES (36,'Annullata','stato','Annullata',NULL,'admin','12ml','Annullata','f13456',154,166,166,166,'Media',1,13,'2025-10-21 13:01:57');
INSERT INTO "storico_sfuso" VALUES (37,'RETTIFICA','FIFO','1.337','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','f13456',NULL,NULL,NULL,NULL,NULL,1,11,'2025-10-21 13:01:57');
INSERT INTO "storico_sfuso" VALUES (38,'Annullata','stato','Annullata',NULL,'admin','12ml','Annullata','f13456',111,111,111,111,'Media',1,11,'2025-10-21 13:01:57');
INSERT INTO "storico_sfuso" VALUES (39,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',111,NULL,NULL,NULL,NULL,1,10,'2025-10-21 13:03:19');
INSERT INTO "storico_sfuso" VALUES (40,'RETTIFICA','FIFO','1.337','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','f13456',NULL,NULL,NULL,NULL,NULL,1,10,'2025-10-21 13:05:37');
INSERT INTO "storico_sfuso" VALUES (41,'MODIFICA_PRODUZIONE','stato','Annullata','Cambio stato a Annullata','admin','12ml','Annullata','f13456',111,111,111,111,'Media',1,10,'2025-10-21 13:05:37');
INSERT INTO "storico_sfuso" VALUES (42,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','-',155,NULL,NULL,NULL,NULL,1,6,'2025-10-21 13:05:39');
INSERT INTO "storico_sfuso" VALUES (43,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',150,NULL,NULL,NULL,NULL,1,8,'2025-10-21 13:16:16');
INSERT INTO "storico_sfuso" VALUES (44,'PRENOTAZIONE','FIFO','1.3750000000000004L da f13456 + 0.4319999999999995L da w456798','Assegnazione FIFO','admin','12ml','In lavorazione','f13456 + w456798',150,NULL,NULL,NULL,NULL,1,19,'2025-10-21 14:34:30');
INSERT INTO "storico_sfuso" VALUES (45,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',150,NULL,NULL,NULL,NULL,1,7,'2025-10-21 14:34:30');
INSERT INTO "storico_sfuso" VALUES (46,'Confermata','pronto','35.0',NULL,'admin','12ml','Confermata','w456798',35,NULL,NULL,NULL,NULL,1,NULL,'2025-10-21 14:59:42');
INSERT INTO "storico_sfuso" VALUES (47,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','-',147,NULL,NULL,NULL,NULL,1,5,'2025-10-21 14:59:49');
INSERT INTO "storico_sfuso" VALUES (48,'Confermata','pronto','147.0',NULL,'admin','12ml','Confermata','w456798',147,NULL,NULL,NULL,NULL,1,NULL,'2025-10-21 14:59:52');
INSERT INTO "storico_sfuso" VALUES (49,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','-',147,NULL,NULL,NULL,NULL,1,4,'2025-10-21 14:59:54');
INSERT INTO "storico_sfuso" VALUES (50,'RETTIFICA','FIFO','1.771','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','w456798',NULL,NULL,NULL,NULL,NULL,1,4,'2025-10-21 14:59:55');
INSERT INTO "storico_sfuso" VALUES (51,'MODIFICA_PRODUZIONE','stato','Annullata','Cambio stato a Annullata','admin','12ml','Annullata','w456798',147,147,147,147,'Media',1,4,'2025-10-21 14:59:55');
INSERT INTO "storico_sfuso" VALUES (52,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','-',147,NULL,NULL,NULL,NULL,1,3,'2025-10-21 14:59:56');
INSERT INTO "storico_sfuso" VALUES (53,'RETTIFICA','FIFO','1.771','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','w456798',NULL,NULL,NULL,NULL,NULL,1,3,'2025-10-21 14:59:57');
INSERT INTO "storico_sfuso" VALUES (54,'MODIFICA_PRODUZIONE','stato','Annullata','Cambio stato a Annullata','admin','12ml','Annullata','w456798',147,147,147,147,'Media',1,3,'2025-10-21 14:59:57');
INSERT INTO "storico_sfuso" VALUES (55,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','-',147,NULL,NULL,NULL,NULL,1,2,'2025-10-21 14:59:58');
INSERT INTO "storico_sfuso" VALUES (56,'RETTIFICA','FIFO','1.771','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','w456798',NULL,NULL,NULL,NULL,NULL,1,2,'2025-10-21 14:59:58');
INSERT INTO "storico_sfuso" VALUES (57,'MODIFICA_PRODUZIONE','stato','Annullata','Cambio stato a Annullata','admin','12ml','Annullata','w456798',147,147,147,147,'Media',1,2,'2025-10-21 14:59:58');
INSERT INTO "storico_sfuso" VALUES (58,'PRENOTAZIONE','litriImpegnati','24.096',NULL,'admin','12ml','PRENOTAZIONE','w456798',2000,2000,2000,2000,'Media',1,20,'2025-10-21 15:00:25');
INSERT INTO "storico_sfuso" VALUES (59,'PRENOTAZIONE','litriImpegnati','12.048',NULL,'admin','12ml','PRENOTAZIONE','w456798',1000,1000,1000,1000,'Media',1,21,'2025-10-21 15:00:47');
INSERT INTO "storico_sfuso" VALUES (60,'PRENOTAZIONE','litriImpegnati','6.024',NULL,'admin','12ml','PRENOTAZIONE','w456798',500,500,500,500,'Media',1,22,'2025-10-21 15:01:07');
INSERT INTO "storico_sfuso" VALUES (61,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',500,NULL,NULL,NULL,NULL,1,22,'2025-10-21 15:01:20');
INSERT INTO "storico_sfuso" VALUES (62,'Confermata','pronto','500.0',NULL,'admin','12ml','Confermata','w456798',500,NULL,NULL,NULL,NULL,1,NULL,'2025-10-21 15:01:24');
INSERT INTO "storico_sfuso" VALUES (63,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',1000,NULL,NULL,NULL,NULL,1,21,'2025-10-21 15:01:26');
INSERT INTO "storico_sfuso" VALUES (64,'RETTIFICA','FIFO','12.048','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','w456798',NULL,NULL,NULL,NULL,NULL,1,21,'2025-10-21 15:01:27');
INSERT INTO "storico_sfuso" VALUES (65,'MODIFICA_PRODUZIONE','stato','Annullata','Cambio stato a Annullata','admin','12ml','Annullata','w456798',1000,1000,1000,1000,'Media',1,21,'2025-10-21 15:01:27');
INSERT INTO "storico_sfuso" VALUES (66,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',2000,NULL,NULL,NULL,NULL,1,20,'2025-10-21 15:01:28');
INSERT INTO "storico_sfuso" VALUES (67,'RETTIFICA','FIFO','24.096','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','w456798',NULL,NULL,NULL,NULL,NULL,1,20,'2025-10-21 15:01:29');
INSERT INTO "storico_sfuso" VALUES (68,'MODIFICA_PRODUZIONE','stato','Annullata','Cambio stato a Annullata','admin','12ml','Annullata','w456798',2000,2000,2000,2000,'Media',1,20,'2025-10-21 15:01:29');
INSERT INTO "storico_sfuso" VALUES (69,'RETTIFICA','litri_disponibili_old','5.0','test','Alessio','12ml','RETTIFICA','-',NULL,NULL,NULL,NULL,NULL,14,NULL,'2025-10-21 15:20:52');
INSERT INTO "storico_sfuso" VALUES (70,'RETTIFICA','litri_disponibili','10.0','test','Alessio','12ml','RETTIFICA','w456798',NULL,NULL,NULL,NULL,NULL,1,NULL,'2025-10-21 15:29:13');
INSERT INTO "storico_sfuso" VALUES (71,'RETTIFICA','lotto_old','qwerty',NULL,'Alessio','12ml','RETTIFICA','qwerty',NULL,NULL,NULL,NULL,NULL,14,NULL,'2025-10-21 15:49:14');
INSERT INTO "storico_sfuso" VALUES (72,'RETTIFICA','lotto','ytrewq',NULL,'Alessio','12ml','RETTIFICA','ytrewq',NULL,NULL,NULL,NULL,NULL,14,NULL,'2025-10-21 15:49:28');
INSERT INTO "storico_sfuso" VALUES (73,'RETTIFICA','litri_disponibili_old','5.0','test','Alessio','100ml','RETTIFICA','-',NULL,NULL,NULL,NULL,NULL,37,NULL,'2025-10-21 15:52:24');
INSERT INTO "storico_sfuso" VALUES (74,'RETTIFICA','litri_disponibili','7.0','test','Alessio','100ml','RETTIFICA','-',NULL,NULL,NULL,NULL,NULL,37,NULL,'2025-10-21 15:52:33');
INSERT INTO "storico_sfuso" VALUES (75,'RETTIFICA','lotto_old','a456789',NULL,'Alessio','100ml','RETTIFICA','a456789',NULL,NULL,NULL,NULL,NULL,37,NULL,'2025-10-21 15:52:43');
INSERT INTO "storico_sfuso" VALUES (76,'RETTIFICA','lotto','R789465',NULL,'Alessio','100ml','RETTIFICA','R789465',NULL,NULL,NULL,NULL,NULL,37,NULL,'2025-10-21 15:52:52');
INSERT INTO "storico_sfuso" VALUES (77,'PRENOTAZIONE','litriImpegnati','1.807',NULL,'admin','12ml','PRENOTAZIONE','ytrewq',150,0,0,0,'Media',14,23,'2025-10-22 10:55:22');
INSERT INTO "storico_sfuso" VALUES (78,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','ytrewq',150,NULL,NULL,NULL,NULL,14,23,'2025-10-22 10:55:27');
INSERT INTO "storico_sfuso" VALUES (79,'Confermata','pronto','150.0',NULL,'admin','12ml','Confermata','qwerty',150,NULL,NULL,NULL,NULL,14,NULL,'2025-10-22 10:55:33');
INSERT INTO "storico_sfuso" VALUES (80,'PRENOTAZIONE','litriImpegnati','1.807',NULL,'admin','12ml','PRENOTAZIONE','ytrewq',150,0,0,0,'Media',14,24,'2025-10-22 10:55:39');
INSERT INTO "storico_sfuso" VALUES (81,'RETTIFICA','note','[22/10/2025, 10:55:44] test','test','admin','12ml','PRENOTAZIONE','ytrewq',150,0,0,0,'Media',14,24,'2025-10-22 10:55:44');
INSERT INTO "storico_sfuso" VALUES (82,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','ytrewq',150,NULL,NULL,NULL,NULL,14,24,'2025-10-22 10:55:50');
INSERT INTO "storico_sfuso" VALUES (83,'Confermata','pronto','150.0',NULL,'admin','12ml','Confermata','qwerty',150,NULL,NULL,NULL,NULL,14,NULL,'2025-10-22 10:56:06');
INSERT INTO "storico_sfuso" VALUES (84,'PRENOTAZIONE','litriImpegnati','1.205',NULL,'admin','12ml','PRENOTAZIONE','ytrewq',100,0,0,0,'Media',14,25,'2025-10-22 10:56:47');
INSERT INTO "storico_sfuso" VALUES (85,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','ytrewq',100,NULL,NULL,NULL,NULL,14,25,'2025-10-22 10:56:49');
INSERT INTO "storico_sfuso" VALUES (86,'RETTIFICA','FIFO','1.205','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','qwerty',NULL,NULL,NULL,NULL,NULL,14,25,'2025-10-22 10:56:51');
INSERT INTO "storico_sfuso" VALUES (87,'MODIFICA_PRODUZIONE','stato','Annullata','Cambio stato a Annullata','admin','12ml','Annullata','qwerty',100,0,0,0,'Media',14,25,'2025-10-22 10:56:51');
INSERT INTO "storico_sfuso" VALUES (88,'PRENOTAZIONE','litriImpegnati','12.048',NULL,'admin','12ml','PRENOTAZIONE','ytrewq',1000,0,0,0,'Alta',14,26,'2025-10-23 08:47:01');
INSERT INTO "storico_sfuso" VALUES (89,'RETTIFICA','note','[23/10/2025, 08:47:15] urgente','urgente','admin','12ml','PRENOTAZIONE','ytrewq',1000,0,0,0,'Alta',14,26,'2025-10-23 08:47:15');
INSERT INTO "storico_sfuso" VALUES (90,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','ytrewq',1000,NULL,NULL,NULL,NULL,14,26,'2025-10-23 08:47:33');
INSERT INTO "storico_sfuso" VALUES (91,'Confermata','pronto','115.0',NULL,'admin','12ml','Confermata','qwerty',115,NULL,NULL,NULL,NULL,14,NULL,'2025-10-23 08:49:19');
INSERT INTO "storico_sfuso" VALUES (92,'Confermata','pronto','884.0',NULL,'admin','12ml','Confermata','ytrewq',884,NULL,NULL,NULL,NULL,14,NULL,'2025-10-23 08:49:25');
INSERT INTO "storico_sfuso" VALUES (93,'RETTIFICA','litri_disponibili_old','10.0','test','Alessio','12ml','RETTIFICA','f13456',NULL,NULL,NULL,NULL,NULL,1,NULL,'2025-10-24 12:39:01');
INSERT INTO "storico_sfuso" VALUES (94,'PRENOTAZIONE','litriImpegnati','60.241',NULL,'admin','12ml','PRENOTAZIONE','w456798',5000,0,0,0,'Media',1,28,'2025-10-24 16:38:32');
INSERT INTO "storico_sfuso" VALUES (95,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',5000,NULL,NULL,NULL,NULL,1,28,'2025-10-24 16:38:43');
INSERT INTO "storico_sfuso" VALUES (96,'Confermata','pronto','4170.0',NULL,'admin','12ml','Confermata','w456798',4170,NULL,NULL,NULL,NULL,1,NULL,'2025-10-24 16:39:07');
INSERT INTO "storico_sfuso" VALUES (97,'Confermata','pronto','830.0',NULL,'admin','12ml','Confermata','f13456',830,NULL,NULL,NULL,NULL,1,NULL,'2025-10-24 16:39:09');
INSERT INTO "storico_sfuso" VALUES (98,'RETTIFICA','litri_disponibili','50.0','test','Alessio','12ml','RETTIFICA','w456798',NULL,NULL,NULL,NULL,NULL,1,NULL,'2025-10-24 16:42:00');
INSERT INTO "storico_sfuso" VALUES (99,'RETTIFICA','litri_disponibili_old','5.0','test','Alessio','12ml','RETTIFICA','f13456',NULL,NULL,NULL,NULL,NULL,1,NULL,'2025-10-24 16:45:04');
INSERT INTO "storico_sfuso" VALUES (100,'RETTIFICA','litri_disponibili','5.0','test','Alessio','12ml','RETTIFICA','w456798',NULL,NULL,NULL,NULL,NULL,1,NULL,'2025-10-24 16:45:11');
INSERT INTO "storico_sfuso" VALUES (101,'PRENOTAZIONE','litriImpegnati','0.602',NULL,'admin','12ml','PRENOTAZIONE','w456798',50,0,0,0,'Media',1,30,'2025-10-24 16:45:28');
INSERT INTO "storico_sfuso" VALUES (102,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',50,NULL,NULL,NULL,NULL,1,30,'2025-10-24 16:46:00');
INSERT INTO "storico_sfuso" VALUES (103,'Confermata','pronto','50.0',NULL,'admin','12ml','Confermata','f13456',50,NULL,NULL,NULL,NULL,1,NULL,'2025-10-24 16:47:00');
INSERT INTO "storico_sfuso" VALUES (104,'PRENOTAZIONE','litriImpegnati','0.602',NULL,'admin','12ml','PRENOTAZIONE','w456798',50,0,0,0,'Media',1,31,'2025-10-24 16:54:35');
INSERT INTO "storico_sfuso" VALUES (105,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','w456798',50,NULL,NULL,NULL,NULL,1,31,'2025-10-24 16:54:37');
INSERT INTO "storico_sfuso" VALUES (106,'Confermata','pronto','50.0',NULL,'admin','12ml','Confermata','f13456',50,NULL,NULL,NULL,NULL,1,NULL,'2025-10-24 17:00:46');
INSERT INTO "storico_sfuso" VALUES (107,'PRENOTAZIONE','litriImpegnati','1.807',NULL,'admin','12ml','PRENOTAZIONE','ytrewq',150,0,0,0,'Media',14,32,'2025-10-27 10:20:50');
INSERT INTO "storico_sfuso" VALUES (108,'PRENOTAZIONE','stato','In lavorazione','Avvio lavorazione con FIFO','admin','12ml','In lavorazione','ytrewq',150,NULL,NULL,NULL,NULL,14,32,'2025-10-27 10:20:52');
INSERT INTO "storico_sfuso" VALUES (109,'RETTIFICA','FIFO','1.807','Reintegro dopo annullamento FIFO','magazzino','12ml','ANNULLATA','ytrewq',NULL,NULL,NULL,NULL,NULL,14,32,'2025-11-24 16:44:14');
INSERT INTO "storico_sfuso" VALUES (110,'Annullata','stato','Annullata','Prenotazione annullata','magazzino','12ml','Annullata','ytrewq',150,0,0,0,'Media',14,32,'2025-11-24 16:44:14');
INSERT INTO "storico_sfuso" VALUES (111,'PRENOTAZIONE','litriImpegnati','0.663',NULL,'admin','12ml','PRENOTAZIONE','w456798',55,0,0,0,'Media',1,33,'2025-11-25 10:52:50');
INSERT INTO "storico_sfuso" VALUES (112,'RETTIFICA','FIFO','0.663','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','f13456',NULL,NULL,NULL,NULL,NULL,1,33,'2025-11-25 10:53:41');
INSERT INTO "storico_sfuso" VALUES (113,'Annullata','stato','Annullata','Prenotazione annullata','admin','12ml','Annullata','f13456',55,0,0,0,'Media',1,33,'2025-11-25 10:53:41');
INSERT INTO "storico_sfuso" VALUES (114,'PRENOTAZIONE','litriImpegnati','0.663',NULL,'admin','12ml','PRENOTAZIONE','w456798',55,0,0,0,'Media',1,34,'2025-11-25 11:06:38');
INSERT INTO "storico_sfuso" VALUES (115,'RETTIFICA','FIFO','0.663','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','f13456',NULL,NULL,NULL,NULL,NULL,1,34,'2025-11-25 11:07:07');
INSERT INTO "storico_sfuso" VALUES (116,'Annullata','stato','Annullata','Prenotazione annullata','admin','12ml','Annullata','f13456',55,0,0,0,'Media',1,34,'2025-11-25 11:07:07');
INSERT INTO "storico_sfuso" VALUES (117,'RETTIFICA','FIFO','0.663','Reintegro dopo annullamento FIFO','admin','12ml','ANNULLATA','f13456',NULL,NULL,NULL,NULL,NULL,1,34,'2025-11-25 11:24:29');
INSERT INTO "storico_sfuso" VALUES (118,'Annullata','stato','Annullata','Prenotazione annullata','admin','12ml','Annullata','f13456',55,0,0,0,'Media',1,34,'2025-11-25 11:24:29');
INSERT INTO "storico_sfuso" VALUES (119,'MODIFICA_PRODUZIONE','stato','Annullata','Cambio stato a Annullata','admin','12ml','Annullata','f13456',55,0,0,0,'Media',1,34,'2025-11-25 11:24:29');
INSERT INTO "storico_sfuso" VALUES (120,'Annullata','stato','Annullata','Prenotazione annullata e litri reintegrati tramite FIFO','admin','12ml','Annullata','f13456',55,0,0,0,'Media',1,34,'2025-11-25 11:24:29');
INSERT INTO "storico_spedizioni" VALUES (71,31,'IT-1','IT','BOZZA','2025-10-24 15:02:08','2','');
INSERT INTO "storico_spedizioni" VALUES (72,31,'IT-1','IT','CONFERMATA','2025-10-24 15:03:46','2','');
CREATE TRIGGER tg_bilancio_catalogo_update
AFTER UPDATE ON bilancio_catalogo
FOR EACH ROW
BEGIN
  UPDATE bilancio_catalogo
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;
COMMIT;
