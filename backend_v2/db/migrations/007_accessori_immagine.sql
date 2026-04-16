-- Aggiunge colonna `immagine` (path/URL relativo all'immagine caricata dall'utente)
-- a accessori. Se NULL, il frontend usa il fallback euristico (match sul nome).
ALTER TABLE accessori ADD COLUMN immagine TEXT;
