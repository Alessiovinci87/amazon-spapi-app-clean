// frontend/src/utils/creaNuovaCard.js
/**
 * 🔧 Funzione universale per creare una nuova card (Sfuso, Prodotto, Accessorio, Etichetta, ecc.)
 * @param {string} tipo - Tipo di elemento ("sfuso", "prodotti", "accessori", "etichette", "inventario", "magazzino", ecc.)
 * @param {object} payload - Dati da inviare al backend
 * @returns {object|null} newItem - Oggetto normalizzato pronto da aggiungere allo state
 */

const API_BASE = "http://localhost:3005/api/v2";

// Mappa per retrocompatibilità endpoint
const ENDPOINT_MAP = {
  inventario: "magazzino",
  prodotti: "magazzino",
};

export async function creaNuovaCard(tipo, payload) {
  if (!tipo || typeof tipo !== "string") {
    console.error("❌ Tipo non valido in creaNuovaCard:", tipo);
    return null;
  }

  try {
    // Mappa il tipo all'endpoint corretto
    const tipoNormalizzato = tipo.toLowerCase();
    const endpointTipo = ENDPOINT_MAP[tipoNormalizzato] || tipoNormalizzato;
    
    const endpoint = `${API_BASE}/${endpointTipo}`;
    console.log(`📡 POST ${endpoint}`, payload);
    
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Errore ${res.status}: ${msg}`);
    }

    const data = await res.json();

    // 🔹 Normalizzazione base (campi comuni)
    const newItem = {
      id: data.id || data.ID || null,
      nome:
        data.nome_prodotto ||
        data.nome ||
        payload.nome_prodotto ||
        payload.nome ||
        "Senza nome",
      formato: data.formato || payload.formato || "N/D",
      quantita:
        Number(data.litri_disponibili) ||
        Number(data.quantita) ||
        Number(payload.quantita) ||
        0,
      lotto: data.lotto || "-",
      fornitore: data.fornitore || payload.fornitore || "N/D",
      asin_collegati: (() => {
        try {
          if (Array.isArray(data.asin_collegati)) return data.asin_collegati;
          if (typeof data.asin_collegati === "string")
            return JSON.parse(data.asin_collegati);
          if (Array.isArray(payload.asin_collegati)) return payload.asin_collegati;
          return [];
        } catch {
          return [];
        }
      })(),
      immagine: data.immagine || "/images/no_image2.png",
    };

    console.log(`✅ ${tipo.toUpperCase()} creato con successo:`, newItem);
    return newItem;
  } catch (err) {
    console.error(`❌ Errore creazione ${tipo}:`, err);
    alert(`Errore durante la creazione del nuovo ${tipo}: ${err.message}`);
    return null;
  }
}