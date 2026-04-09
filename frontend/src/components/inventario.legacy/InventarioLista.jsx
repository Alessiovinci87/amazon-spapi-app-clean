import React from "react";
import InventarioCard from "./InventarioCard";
import { calcolaAccessoriImpegnati } from "../../utils/gestioneInventario";

const InventarioLista = ({
  elementiDaMostrare = [],
  sezioneAttiva,
  accessori,
  handleChange,
  confermaUtilizzo,
  confermaModificaAccessorio,
  mostraStoricoAsin,
  setMostraStoricoAsin,
  onAggiornamentoCompletato,  // 🔥 AGGIUNTA QUESTA PROP
}) => {
  const isAccessory = sezioneAttiva === "accessori";

  const items = isAccessory
    ? Object.values(
        elementiDaMostrare.reduce((acc, curr) => {
          const asin = curr.asin_accessorio || curr.asin || "noasin";
          const nome = curr.nome || "nonome";
          const key = `${asin}_${nome}`.toLowerCase().trim();

          if (!acc[key]) acc[key] = curr;
          return acc;
        }, {})
      )
    : elementiDaMostrare;

  return (
    <div className="flex flex-col gap-6 max-w-8xl mx-auto w-full">
      {items.map((item, index) => {
        const accessoriImpegnati = isAccessory
          ? {}
          : calcolaAccessoriImpegnati(item);

        return (
          <InventarioCard
            key={`${item.nome}-${index}`}
            prodotto={item}
            accessoriImpegnati={accessoriImpegnati}
            handleChange={handleChange}
            confermaUtilizzo={isAccessory ? () => {} : confermaUtilizzo}
            confermaModificaAccessorio={
              isAccessory
                ? () =>
                    confermaModificaAccessorio({
                      asin: item.asin_accessorio || item.asin,
                      nome: item.nome,
                      quantitaPerProdotto: item.quantitaPerProdotto,
                    })
                : undefined
            }
            mostraStoricoAsin={mostraStoricoAsin}
            setMostraStoricoAsin={setMostraStoricoAsin}
            isAccessory={isAccessory}
            onAggiornamentoCompletato={onAggiornamentoCompletato} // 🔥 PASSO LA FUNZIONE
            onClick={() => setMostraStoricoAsin(item.asin)}
          />
        );
      })}
    </div>
  );
};

export default InventarioLista;
