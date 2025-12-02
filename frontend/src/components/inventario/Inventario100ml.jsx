import React from "react";
import InventarioCard from "./inventarioCard";

const Inventario100ml = ({
  elementi,
  calcolaAccessoriImpegnati,
  handleChange,
  confermaUtilizzo,
  mostraStoricoAsin,
  setMostraStoricoAsin,
  search, // 🆕 aggiungi questa prop
}) => {
  const testo = search?.toLowerCase().trim() || "";

  // 🔍 filtro combinato: 100ml + ricerca
  const prodotti100ml = elementi.filter((item) =>
    item.nome.toLowerCase().includes("100 ml") &&
    (!testo ||
      item.nome.toLowerCase().includes(testo) ||
      item.asin?.toLowerCase().includes(testo))
  );

  return (
    <>
      {prodotti100ml.map((prodotto, index) => {
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

export default Inventario100ml;
