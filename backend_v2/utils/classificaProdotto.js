// backend_v2/utils/classificaProdotto.js

/**
 * CAPACITÀ BOX (VALORI FISSI)
 */
const CAPACITA_BOX = {
  "12ML_SINGOLO": 300,
  "12ML_KIT": 150,
  "100ML": 150,
  "DEFAULT": 150,
};

/**
 * CLASSIFICAZIONE PRODOTTO
 * 
 * Gerarchia:
 * 1. Metadati strutturati (se disponibili)
 * 2. Parsing titolo
 * 3. Fallback default
 */
function classificaProdotto(prodotto) {
  const nome = (prodotto.nome || prodotto.prodotto_nome || "").toLowerCase();
  const formatoMl = prodotto.formato_ml || null;
  const pezzi = prodotto.pezzi || prodotto.numero_pezzi || null;

  let risultato = {
    tipo: null,
    capacitaBox: CAPACITA_BOX.DEFAULT,
    warning: null,
  };

  // ========== LIVELLO 1: METADATI STRUTTURATI ==========
  if (formatoMl && pezzi) {
    if (formatoMl === 100) {
      risultato.tipo = "100ML";
      risultato.capacitaBox = CAPACITA_BOX["100ML"];
      return risultato;
    }
    if (formatoMl === 12 && pezzi > 1) {
      risultato.tipo = "12ML_KIT";
      risultato.capacitaBox = CAPACITA_BOX["12ML_KIT"];
      return risultato;
    }
    if (formatoMl === 12 && pezzi === 1) {
      risultato.tipo = "12ML_SINGOLO";
      risultato.capacitaBox = CAPACITA_BOX["12ML_SINGOLO"];
      return risultato;
    }
  }

  // ========== LIVELLO 2: PARSING TITOLO ==========
  const match100ml = nome.match(/100\s*ml/i);
  const match12ml = nome.match(/12\s*ml/i);
  const match10ml = nome.match(/10\s*ml/i);
  const isMultipack = detectMultipack(nome);

  if (match100ml) {
    risultato.tipo = "100ML";
    risultato.capacitaBox = CAPACITA_BOX["100ML"];
    return risultato;
  }

  if (match12ml || match10ml) {
    if (isMultipack) {
      risultato.tipo = "12ML_KIT";
      risultato.capacitaBox = CAPACITA_BOX["12ML_KIT"];
    } else {
      risultato.tipo = "12ML_SINGOLO";
      risultato.capacitaBox = CAPACITA_BOX["12ML_SINGOLO"];
    }
    return risultato;
  }

  // ========== LIVELLO 3: FALLBACK ==========
  risultato.tipo = "DEFAULT";
  risultato.capacitaBox = CAPACITA_BOX.DEFAULT;
  risultato.warning = `Classificazione ambigua per: "${prodotto.nome || prodotto.prodotto_nome}"`;
  console.warn(`⚠️ ${risultato.warning}`);
  
  return risultato;
}

/**
 * Rileva se il prodotto è un multipack/kit
 */
function detectMultipack(nome) {
  const patterns = [
    /\d+\s*pz/i,
    /\d+\s*pezzi/i,
    /\d+\s*x\s/i,
    /\bkit\b/i,
    /\bset\b/i,
    /\bcoppia\b/i,
    /\bduo\b/i,
    /\btwin\b/i,
    /\bpack\b/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(nome)) return true;
  }

  const compositePatterns = [
    /base\s*(e|&|\+)\s*top/i,
    /top\s*(e|&|\+)\s*base/i,
    /primer\s*(e|&|\+)\s*prep/i,
    /prep\s*(e|&|\+)\s*primer/i,
  ];

  for (const pattern of compositePatterns) {
    if (pattern.test(nome)) return true;
  }

  return false;
}

/**
 * CALCOLA RIGHE DDT PER UN PRODOTTO
 * Genera N righe dove ogni riga = UN BOX/PACCO
 */
function calcolaRigheDDT(prodotto, quantita) {
  const classificazione = classificaProdotto(prodotto);
  const capacita = classificazione.capacitaBox;
  const numBox = Math.ceil(quantita / capacita);
  
  const righe = [];
  let quantitaRimanente = quantita;

  for (let i = 0; i < numBox; i++) {
    const quantitaBox = Math.min(quantitaRimanente, capacita);
    
    righe.push({
      asin: prodotto.asin || "",
      sku: prodotto.sku || "",
      prodottoNome: prodotto.nome || prodotto.prodotto_nome || "",
      quantita: quantitaBox,
      cartone: "",
      pacco: "",
      boxNumero: i + 1,
      boxTotali: numBox,
      tipoClassificazione: classificazione.tipo,
      capacitaBox: capacita,
      isManuallyEdited: false,
    });

    quantitaRimanente -= quantitaBox;
  }

  if (numBox > 1) {
    console.log(`📦 ${prodotto.prodotto_nome || prodotto.nome}: ${quantita} pz → ${numBox} box (${classificazione.tipo})`);
  }

  return righe;
}

/**
 * ESPANDI TUTTI I PRODOTTI IN RIGHE DDT
 */
function espandiProdottiInRighe(prodotti) {
  let tutteLeRighe = [];
  
  for (const prodotto of prodotti) {
    const righe = calcolaRigheDDT(prodotto, prodotto.quantita);
    tutteLeRighe = tutteLeRighe.concat(righe);
  }

  tutteLeRighe = tutteLeRighe.map((riga, index) => ({
    ...riga,
    id: `riga-${index}-${Date.now()}`,
  }));

  return tutteLeRighe;
}

module.exports = {
  CAPACITA_BOX,
  classificaProdotto,
  detectMultipack,
  calcolaRigheDDT,
  espandiProdottiInRighe,
};