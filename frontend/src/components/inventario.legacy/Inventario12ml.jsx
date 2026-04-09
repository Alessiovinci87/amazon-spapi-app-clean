// 📁 components/inventario/Inventario12ml.jsx
import React from "react";
import { classificaProdotto } from "../../utils/classificaProdotto";
import InventarioLista from "./InventarioLista";

const Inventario12ml = ({
  elementi,
  calcolaAccessoriImpegnati,
  handleChange,
  confermaUtilizzo,
  mostraStoricoAsin,
  setMostraStoricoAsin,
  categoriaAttiva,
}) => {
  console.log("🔍 Elementi ricevuti in Inventario12ml:", elementi);

  // ✅ Protezione se elementi non è un array
  const prodottiClassificati = Array.isArray(elementi)
    ? elementi.map((p) => ({ ...p, ...classificaProdotto(p) }))
    : [];

  if (!Array.isArray(elementi)) {
    console.warn("⚠️ Inventario12ml: 'elementi' non è un array:", elementi);
  }

  // 🔎 Filtra per categoria selezionata (pulsanti gialli)
  // 🔎 Filtra per categoria o formato
  const filtrati = prodottiClassificati.filter((p) => {
    const tipo = p.formato || p.categoria || "";
    return tipo.toLowerCase().includes("12");
  });


  console.log(
    "📦 Prodotti mostrati in categoria:",
    categoriaAttiva,
    filtrati.length
  );

  return (
    <InventarioLista
      elementiDaMostrare={filtrati}
      sezioneAttiva="12ml"
      calcolaAccessoriImpegnati={calcolaAccessoriImpegnati}
      handleChange={handleChange}
      confermaUtilizzo={confermaUtilizzo}
      mostraStoricoAsin={mostraStoricoAsin}
      setMostraStoricoAsin={setMostraStoricoAsin}
    />
  );
};

export default Inventario12ml;
