-- Tabella utenti con ruoli per autenticazione JWT
CREATE TABLE IF NOT EXISTS utenti (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    UNIQUE NOT NULL,
  password   TEXT    NOT NULL,  -- formato "salt_hex:hash_hex" (scrypt)
  ruolo      TEXT    NOT NULL DEFAULT 'magazzino' CHECK(ruolo IN ('admin','ufficio','magazzino')),
  nome       TEXT,
  attivo     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    DEFAULT (datetime('now','localtime')),
  updated_at TEXT    DEFAULT (datetime('now','localtime'))
);

-- Inserisci utente admin di default (password: 1234)
-- La password verrà sovrascritta dal seed in database.js se ADMIN_PASSWORD_DEFAULT è impostato
