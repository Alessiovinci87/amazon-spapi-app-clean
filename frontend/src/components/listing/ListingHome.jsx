import { useNavigate } from "react-router-dom";
import { getPrezzoPerPaese, getStockPerPaese } from "../../utils/gestioneListing";
import { Package } from "lucide-react";

const ListingHome = ({ prodotti, paese, filtro, totaleProdotti }) => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="text-sm text-slate-400 mb-4">
        {totaleProdotti} prodott{totaleProdotti === 1 ? "o" : "i"} per <span className="text-white font-medium">{paese}</span>
        {filtro && <> con filtro: "<span className="text-cyan-400">{filtro}</span>"</>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {prodotti.map((prod) => {
          const prezzoInfo = getPrezzoPerPaese(prod, paese);
          const stock = getStockPerPaese(prod, paese);

          return (
            <button
              key={prod.asin}
              onClick={() => {
                localStorage.setItem("paese", paese);
                navigate(`/uffici/listing/${prod.asin}`);
              }}
              type="button"
              className="group flex flex-col bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 hover:bg-slate-900 transition-all text-left"
            >
              {/* Immagine */}
              <div className="w-full aspect-square bg-white flex items-center justify-center p-2">
                {prod.image_url ? (
                  <img
                    src={prod.image_url}
                    alt={prod.product_name || prod.asin}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <Package className="w-10 h-10 text-slate-300" />
                )}
              </div>

              {/* Info */}
              <div className="px-3 py-2.5 flex-1 flex flex-col">
                <p className="text-xs text-white font-medium leading-tight line-clamp-2 mb-1.5">
                  {prod.product_name || prod.asin}
                </p>
                <p className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded w-fit mb-1.5">
                  {prod.asin}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  {prezzoInfo ? (
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {prezzoInfo.currency === "GBP" ? "\u00A3" : "\u20AC"}{prezzoInfo.prezzo}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    stock > 0
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    {stock} pz
                  </span>
                </div>

                {prezzoInfo?.buybox && (
                  <span className="mt-1 text-[9px] uppercase tracking-wider text-amber-400 font-medium">BuyBox</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ListingHome;
