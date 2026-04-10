// utils/gestioneListing.js
// Funzioni helper per la pagina Listing — usa dati reali da europa/catalogo

/**
 * Carica i prodotti dal catalogo Europa (dati reali SP-API).
 * @param {Function} setProdotti - setState React
 */
export const fetchProdotti = async (setProdotti) => {
  try {
    const res = await fetch("/api/v2/europa/catalogo");
    const data = await res.json();
    if (Array.isArray(data)) {
      setProdotti(data);
    }
  } catch (error) {
    console.error("Errore caricamento catalogo:", error);
  }
};

/**
 * Filtra i prodotti in base al paese selezionato e al testo di ricerca.
 * I prodotti hanno countries: [{country: "IT", quantity: ...}, ...]
 */
export const filtraProdotti = (prodotti, paese, filtro) => {
  if (!paese) return [];

  return prodotti.filter((p) => {
    // Verifica che il prodotto sia presente nel paese selezionato
    const hasCountry = p.countries?.some(c => c.country === paese);
    if (!hasCountry) return false;

    // Filtro testo
    if (filtro) {
      const testo = `${p.product_name || ""} ${p.asin || ""} ${p.sku || ""}`.toLowerCase();
      if (!testo.includes(filtro.toLowerCase())) return false;
    }

    return true;
  });
};

/**
 * Conta i prodotti presenti in un dato paese.
 */
export const contaProdottiPerPaese = (prodotti, paese) => {
  return prodotti.filter(p => p.countries?.some(c => c.country === paese)).length;
};

/**
 * Ottieni il prezzo per un prodotto in un dato paese.
 */
export const getPrezzoPerPaese = (prodotto, paese) => {
  const p = prodotto.prezzi?.find(pr => pr.country === paese);
  return p ? { prezzo: p.prezzo, currency: p.currency || "EUR", buybox: p.buybox_won } : null;
};

/**
 * Ottieni lo stock per un prodotto in un dato paese.
 */
export const getStockPerPaese = (prodotto, paese) => {
  const c = prodotto.countries?.find(co => co.country === paese);
  return c ? c.quantity : 0;
};
