-- ============================================================
-- MIGRAZIONE 011 - shipping_mode in inbound_plans
-- ============================================================
-- Persiste la modalita' di spedizione scelta dall'utente nello
-- step Imballaggio (GROUND_SMALL_PARCEL = piccoli colli SPD,
-- LESS_THAN_TRUCKLOAD = pallet/LTL). Senza questa colonna lo
-- shippingMode veniva perso e il successivo step Trasporto
-- usava sempre l'hardcoded GROUND_SMALL_PARCEL, ignorando la
-- scelta dell'utente.
-- ============================================================

ALTER TABLE inbound_plans ADD COLUMN shipping_mode TEXT DEFAULT 'GROUND_SMALL_PARCEL';

UPDATE inbound_plans SET shipping_mode = 'GROUND_SMALL_PARCEL' WHERE shipping_mode IS NULL;
