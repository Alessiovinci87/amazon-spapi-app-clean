import React from "react";
import InventarioLista from "./InventarioLista";

const Inventario5litri = ({
  elementi = [],
  calcolaAccessoriImpegnati,
  handleChange,
  confermaUtilizzo,
  mostraStoricoAsin,
  setMostraStoricoAsin,
  search, // 🆕
}) => {
  const testo = search?.toLowerCase().trim() || "";

  const filtrati = elementi.filter((item) => {
    const nome = item.nome?.toLowerCase?.() || "";

    const is5L =
      nome.includes("5 litri") ||
      nome.includes("5 l") ||
      nome.includes("5l") ||
      nome.includes("5lt") ||
      nome.includes("5 lt") ||
      nome.includes("litri 5") ||
      nome.includes("5-litri") ||
      nome.includes("5-liter") ||
      nome.includes("5000 ml") ||
      nome.includes("5.000 ml");

    const matchRicerca =
      !testo ||
      nome.includes(testo) ||
      item.asin?.toLowerCase()?.includes(testo);

    return is5L && matchRicerca;
  });

  return (
    <InventarioLista
      elementiDaMostrare={filtrati}
      sezioneAttiva="5litri"
      calcolaAccessoriImpegnati={calcolaAccessoriImpegnati}
      handleChange={handleChange}
      confermaUtilizzo={confermaUtilizzo}
      mostraStoricoAsin={mostraStoricoAsin}
      setMostraStoricoAsin={setMostraStoricoAsin}
    />
  );
};

export default Inventario5litri;
