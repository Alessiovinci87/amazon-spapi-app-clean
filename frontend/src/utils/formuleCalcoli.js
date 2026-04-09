/**
 * Somma i valori di una colonna filtrando per il tipo specificato
 * @param {Array} dati - array di oggetti (righe)
 * @param {string} tipoCercato - valore del campo 'tipo' da filtrare (es. 'a', 'b', 'c')
 * @param {string} campoSomma - nome della colonna numerica da sommare (es. 'imponibile')
 * @returns {number} somma filtrata
 */
export function sommaPerTipo(dati, tipoCercato, campoSomma) {
  return dati
    .filter(row => row.tipo?.toLowerCase() === tipoCercato.toLowerCase())
    .reduce((sum, row) => sum + (parseFloat(row[campoSomma]) || 0), 0);
}

/**
 * Calcola il costo totale: A + B + C
 * @param {number} costoBase - somma imponibili tipo A
 * @param {number} commissioni - somma imponibili tipo B
 * @param {number} speseSpedizione - somma imponibili tipo C
 * @returns {number} costo totale
 */
export function calcolaCostoTotale(costoBase, commissioni, speseSpedizione) {
  return (
    (parseFloat(costoBase) || 0) +
    (parseFloat(commissioni) || 0) +
    (parseFloat(speseSpedizione) || 0)
  );
}

/**
 * Calcola il margine no IVA: scorporo IVA dal prezzo vendita, poi sottraggo costo totale
 * Formula Excel: PrezzoVenditaIvato / (1 + IVA%) - CostoTotale
 * @param {number} prezzoVenditaIvato
 * @param {number} ivaPercentuale - es. 22
 * @param {number} costoTotale
 * @returns {number} margine senza IVA
 */
export function calcolaMargine(prezzoVenditaIvato, ivaPercentuale, costoTotale) {
  const prezzo = parseFloat(prezzoVenditaIvato) || 0;
  const iva = (parseFloat(ivaPercentuale) || 0) / 100;
  const costo = parseFloat(costoTotale) || 0;
  return (prezzo / (1 + iva)) - costo;
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
 * Calcola il costo base moltiplicato (margine Nx nel foglio Excel)
 * Formula Excel: CostoBase(A) * N
 * @param {number} costoBase - somma imponibili tipo A
 * @param {number} moltiplicatore - es. 2, 3, 4
 * @returns {number} costo base moltiplicato
 */
export function calcolaMargineMultiplo(costoBase, moltiplicatore) {
  return (parseFloat(costoBase) || 0) * moltiplicatore;
}

/**
 * Calcola la pubblicita massima spendibile per un dato moltiplicatore
 * Formula Excel: MargineNoIVA - (CostoBase * N)
 * @param {number} margineNoIva
 * @param {number} costoBase - somma imponibili tipo A
 * @param {number} moltiplicatore - es. 2, 3, 4
 * @returns {number} pubblicita massima (negativo = non sostenibile)
 */
export function calcolaPubblicitaMax(margineNoIva, costoBase, moltiplicatore) {
  const margine = parseFloat(margineNoIva) || 0;
  const costo = parseFloat(costoBase) || 0;
  return margine - (costo * moltiplicatore);
}

/**
 * Calcola la percentuale di utile effettivo
 * Formula Excel: (MargineNoIVA / CostoTotale) * 100
 * @param {number} margineNoIva
 * @param {number} costoTotale
 * @returns {number} percentuale utile
 */
export function calcolaPercentualeCosto(margineNoIva, costoTotale) {
  const margine = parseFloat(margineNoIva) || 0;
  const costo = parseFloat(costoTotale) || 0;
  if (costo === 0) return 0;
  return (margine / costo) * 100;
}

/**
 * Calcola l'utile effettivo
 * Formula Excel: MargineNoIVA - CostoPubblicitario
 * @param {number} margineNoIva
 * @param {number} costoPubblicitario
 * @returns {number} utile effettivo
 */
export function calcolaUtileEffettivo(margineNoIva, costoPubblicitario) {
  return (parseFloat(margineNoIva) || 0) - (parseFloat(costoPubblicitario) || 0);
}

/**
 * Calcola il prezzo minimo al pubblico
 * Formula Excel: CostoTotale * (1 + IVA%)
 * @param {number} costoTotale
 * @param {number} ivaPercentuale - es. 22
 * @returns {number} prezzo minimo ivato
 */
export function calcolaPrezzoMinimo(costoTotale, ivaPercentuale) {
  const costo = parseFloat(costoTotale) || 0;
  const iva = (parseFloat(ivaPercentuale) || 0) / 100;
  return costo * (1 + iva);
}

/**
 * Calcola il totale fattura di una singola riga: Imponibile + IVA Pagata
 * @param {Object} row - singola riga dati
 * @returns {number} totale fattura
 */
export function sommaTotFattura(row) {
  const imponibile = parseFloat(row.imponibile) || 0;
  const ivaPagata = parseFloat(row.ivaPagata) || 0;
  return imponibile + ivaPagata;
}
