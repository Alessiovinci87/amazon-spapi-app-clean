import React from "react";
import AccessorioCard from "./AccessorioCard.jsx";

const InventarioAccessori = ({
  accessori,
  setMostraStoricoAsin,
  fetchAccessori,
  search, // 🆕
}) => {
  const testo = search?.toLowerCase().trim() || "";

  const filtrati = accessori.filter(
    (a) =>
      !testo ||
      a.nome?.toLowerCase().includes(testo) ||
      a.asin_accessorio?.toLowerCase()?.includes(testo)
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      {filtrati.map((a) => (
        <AccessorioCard
          key={a.asin_accessorio}
          asin_accessorio={a.asin_accessorio}
          nome={a.nome}
          quantita={a.quantita}
          setMostraStoricoAsin={setMostraStoricoAsin}
          fetchAccessori={fetchAccessori}
        />
      ))}
    </div>
  );
};

export default InventarioAccessori;
