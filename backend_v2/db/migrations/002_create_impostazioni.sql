-- ============================================================
-- Migrazione 002 — Tabella impostazioni applicazione
-- Usata per memorizzare configurazioni chiave/valore (es. password admin hashata)
-- ============================================================

CREATE TABLE IF NOT EXISTS impostazioni (
  chiave TEXT PRIMARY KEY,
  valore TEXT NOT NULL,
  aggiornato_il TEXT DEFAULT CURRENT_TIMESTAMP
);
