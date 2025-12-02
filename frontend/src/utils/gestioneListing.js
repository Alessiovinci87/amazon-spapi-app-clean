// utils/gestioneListing.js

/**
 * Carica i prodotti mock da un file JSON e aggiorna lo stato con setProdotti
 * @param {Function} setProdotti - Funzione di setState di React per aggiornare i prodotti
 */
export const fetchProdottiMock = async (setProdotti) => {
  try {
    const response = await fetch("/mock/prodotti-listing.json");
    const data = await response.json();
    setProdotti(data);
  } catch (error) {
    console.error("❌ Errore nel caricamento dei prodotti:", error);
  }
};

/**
 * Filtra i prodotti in base al paese selezionato e al testo di ricerca
 * @param {Array} prodotti - Lista completa dei prodotti
 * @param {string} paese - Paese selezionato (es: "Italia")
 * @param {string} filtro - Testo da cercare in nome, ASIN o SKU
 * @returns {Array} - Lista filtrata
 */
export const filtraProdotti = (prodotti, paese, filtro) => {
  if (!paese) return [];

  return prodotti.filter((p) => {
    const testo = `${p.nome} ${p.asin} ${p.sku}`.toLowerCase();
    return testo.includes(filtro.toLowerCase()) && p.marketplaces?.hasOwnProperty(paese);
  });
};

/**
 * Conta i prodotti che hanno un marketplace attivo per uno specifico paese
 * @param {Array} prodotti - Lista completa dei prodotti
 * @param {string} paese - Paese selezionato
 * @returns {number} - Numero di prodotti per il paese selezionato
 */
export const contaProdottiPerPaese = (prodotti, paese) => {
  return prodotti.filter((p) => p.marketplaces?.hasOwnProperty(paese)).length;
};

/**
 * Ritorna solo i prodotti che non sono contrassegnati come nascosti
 * @param {Array} prodotti - Lista completa dei prodotti
 * @returns {Array} - Solo prodotti visibili
 */
export const prodottiVisibili = (prodotti) => {
  return prodotti.filter((p) => !p.nascosto);
};
