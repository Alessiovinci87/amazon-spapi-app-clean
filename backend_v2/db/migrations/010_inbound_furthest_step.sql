-- ============================================================
-- MIGRAZIONE 010 - furthest_step in inbound_plans
-- ============================================================
-- Tiene traccia dello step piu' avanti raggiunto dal wizard,
-- indipendentemente da dove l'utente ha cliccato. Permette
-- la navigazione cliccabile in avanti senza dover rieseguire
-- le azioni Amazon (che sarebbero rifiutate come "read-only").
-- ============================================================

ALTER TABLE inbound_plans ADD COLUMN furthest_step TEXT;

UPDATE inbound_plans SET furthest_step = current_step WHERE furthest_step IS NULL;
