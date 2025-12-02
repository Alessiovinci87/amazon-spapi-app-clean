/**
 * Somma i valori di una colonna filtrando per il tipo specificato
 * @param {Array} dati - array di oggetti (righe)
 * @param {string} tipoCercato - valore del campo 'tipo' da filtrare (es. 'a', 'b', 'c')
 * @param {string} campoSomma - nome della colonna numerica da sommare (es. 'imponibile')
 * @returns {number} somma filtrata
 */
export function sommaPerTipo(dati, tipoCercato, campoSomma) {
  return dati
    .filter(row => row.tipo === tipoCercato)
    .reduce((sum, row) => sum + (parseFloat(row[campoSomma]) || 0), 0);
}

/**
 * Calcola il costo totale sommando i vari componenti
 * @param {number} costoBase
 * @param {number} altreSpese
 * @param {number} commissioni
 * @param {number} speseSpedizione
 * @returns {number} costo totale
 */
export function calcolaCostoTotale(costoBase, altreSpese, commissioni, speseSpedizione) {
  return (
    (parseFloat(costoBase) || 0) +
    (parseFloat(altreSpese) || 0) +
    (parseFloat(commissioni) || 0) +
    (parseFloat(speseSpedizione) || 0)
  );
}

/**
 * Calcola il margine tra prezzo vendita e costo totale
 * @param {number} prezzoVendita
 * @param {number} costoTotale
 * @returns {number} margine
 */
export function calcolaMargine(prezzoVendita, costoTotale) {
  return (parseFloat(prezzoVendita) || 0) - (parseFloat(costoTotale) || 0);
}

/**
 * Somma i valori di due colonne su tutto l'array dati
 * @param {Array} dati - array di oggetti (righe)
 * @param {string} col1 - nome prima colonna da sommare
 * @param {string} col2 - nome seconda colonna da sommare
 * @returns {number} somma totale di entrambe le colonne
 */
export function sommaDueColonne(dati, col1, col2) {
  return dati.reduce((acc, row) => {
    const val1 = parseFloat(row[col1]) || 0;
    const val2 = parseFloat(row[col2]) || 0;
    return acc + val1 + val2;
  }, 0);
}

/**
 * Calcola il margine moltiplicato per un fattore (es. 2x, 3x, 4x)
 * @param {number} margineBase
 * @param {number} moltiplicatore
 * @returns {number} margine moltiplicato
 */
export function calcolaMargineMultiplo(margineBase, moltiplicatore) {
  return (parseFloat(margineBase) || 0) * moltiplicatore;
}

/**
 * Calcola la percentuale del costo rispetto al prezzo di vendita
 * @param {number} costoBase
 * @param {number} prezzoVendita
 * @returns {number} percentuale costo
 */
export function calcolaPercentualeCosto(costoBase, prezzoVendita) {
  const costo = parseFloat(costoBase) || 0;
  const prezzo = parseFloat(prezzoVendita) || 1; // evita divisione per zero
  return (costo / prezzo) * 100;
}

/**
 * Calcola il prezzo minimo (prezzo di vendita - costo totale)
 * @param {number} prezzoVenditaIvato
 * @param {number} costoTotale
 * @returns {number} prezzo minimo
 */
export function calcolaPrezzoMinimo(prezzoVenditaIvato, costoTotale) {
  const prezzo = parseFloat(prezzoVenditaIvato) || 0;
  const costo = parseFloat(costoTotale) || 0;
  return prezzo - costo;
}

/**
 * Somma i valori di 4 colonne di una singola riga (row)
 * @param {Object} row - singola riga dati
 * @returns {number} somma delle 4 colonne g, h, i, j
 */
export function sommaTotFattura(row) {
  const g = parseFloat(row.g) || 0;
  const h = parseFloat(row.h) || 0;
  const i = parseFloat(row.i) || 0;
  const j = parseFloat(row.j) || 0;
  return g + h + i + j;
}
