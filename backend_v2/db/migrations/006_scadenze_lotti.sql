-- Scadenze lotti: aggiunge data_scadenza e pao_mesi (Period After Opening) a sfuso
-- data_scadenza: data di scadenza assoluta del lotto
-- pao_mesi: durata PAO in mesi (per cosmetici, es. 12 = "12M")

-- La colonna viene aggiunta a sfuso (dove si gestisce il lotto attivo)
-- e a sfuso_movimenti (per tracciare la scadenza nei carichi DDT)
