import React from "react";
import { useNavigate } from "react-router-dom";

const abbreviaNome = (nome) => {
  if (!nome) return "";
  const parole = nome.split(" ");
  return parole.slice(0, 4).join(" ") + (parole.length > 4 ? "..." : "");
};

const renderStars = (valutazione = 0) => {
  const stelle = [];
  const piena = Math.floor(valutazione);
  const decimale = valutazione - piena;

  const fullStar = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#facc15" stroke="#eab308" strokeWidth="0.5" className="w-3 h-3" aria-hidden="true">
      <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z" />
    </svg>
  );

  const halfStar = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="w-3 h-3" aria-hidden="true">
      <defs>
        <linearGradient id="half3d">
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="50%" stopColor="#d1d5db" />
        </linearGradient>
      </defs>
      <path fill="url(#half3d)" stroke="#eab308" strokeWidth="0.5" d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z" />
    </svg>
  );

  const emptyStar = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" className="w-3 h-3" aria-hidden="true">
      <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z" />
    </svg>
  );

  for (let i = 0; i < piena; i++) {
    stelle.push(React.cloneElement(fullStar, { key: `full-${i}` }));
  }
  if (decimale >= 0.25 && decimale < 0.75) {
    stelle.push(React.cloneElement(halfStar, { key: "half" }));
  } else if (decimale >= 0.75) {
    stelle.push(React.cloneElement(fullStar, { key: "roundup" }));
  }
  while (stelle.length < 5) {
    stelle.push(React.cloneElement(emptyStar, { key: `empty-${stelle.length}` }));
  }

  return stelle;
};

const ListingHome = ({ prodotti, paese, filtro, totaleProdotti }) => {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-center text-white">Seleziona un prodotto</h2>
      <h3 className="text-sm text-gray-300 text-center mb-8">
        {totaleProdotti} risultati trovati per <strong>{paese}</strong>
        {filtro && ` con filtro: "${filtro}"`}
      </h3>

      <div className="flex flex-wrap justify-center gap-6">
        {prodotti.map((prod) => (
          <div
            key={prod.asin}
            role="button"
            tabIndex={0}
            onClick={() => {
              localStorage.setItem("paese", paese);
              navigate(`/listing/${prod.asin}`);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                localStorage.setItem("paese", paese);
                navigate(`/listing/${prod.asin}`);
              }
            }}
            className="bg-white w-[200px] p-4 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label={`Seleziona prodotto ${prod.nome || prod.sku || prod.asin}`}
          >
            <div className="w-full h-[130px] flex items-center justify-center bg-gray-100 rounded mb-3">
              <img
                src={prod.immagine_main || "/placeholder.jpg"}
                alt={prod.nome || prod.asin}
                className="max-h-[100px] object-contain"
                loading="lazy"
              />
            </div>
            <div className="text-sm font-semibold text-black truncate mb-1" title={prod.nome || prod.sku || prod.asin}>
              {abbreviaNome(prod.nome || prod.sku || prod.asin)}
            </div>
            <div className="text-xs text-gray-600 truncate" title={`SKU: ${prod.sku}`}>
              SKU: {prod.sku}
            </div>
            <div className="text-xs text-gray-600 truncate mb-1" title={`ASIN: ${prod.asin}`}>
              ASIN: {prod.asin}
            </div>
            {prod.prezzo && (
              <div className="text-green-600 font-bold text-sm mb-1">
                €{prod.prezzo}
              </div>
            )}
            {prod.valutazione && (
              <div className="text-sm flex justify-center items-center gap-1" aria-label={`Valutazione: ${prod.valutazione} stelle`}>
                {renderStars(prod.valutazione)}
                <span className="text-gray-700 text-xs ml-1">
                  ({prod.valutazione})
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListingHome;
