import React from "react";
import InventarioCard from "./inventarioCard";

const InventarioKit = ({
  elementi,
  calcolaAccessoriImpegnati,
  handleChange,
  confermaUtilizzo,
  mostraStoricoAsin,
  setMostraStoricoAsin,
  search, // 🆕
}) => {
  const testo = search?.toLowerCase().trim() || "";

  const prodottiKit = elementi.filter(
    (item) =>
      item.nome.toLowerCase().includes("kit") &&
      (!testo ||
        item.nome.toLowerCase().includes(testo) ||
        item.asin?.toLowerCase().includes(testo))
  );

  return (
    <>
      {prodottiKit.map((prodotto, index) => {
        const accessoriImpegnati = calcolaAccessoriImpegnati(prodotto);

        return (
          <InventarioCard
            key={`${prodotto.nome}-${index}`}
            prodotto={prodotto}
            accessoriImpegnati={accessoriImpegnati}
            handleChange={handleChange}
            confermaUtilizzo={confermaUtilizzo}
            mostraStoricoAsin={mostraStoricoAsin}
            setMostraStoricoAsin={setMostraStoricoAsin}
          />
        );
      })}
    </>
  );
};

export default InventarioKit;
