import { getPrezzoPerPaese, getStockPerPaese } from "../../utils/gestioneListing";
import { Package, Image as ImageIcon, Sparkles, ExternalLink, AlertTriangle, X, RotateCcw, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const AMAZON_TLD = {
  IT: "it", FR: "fr", DE: "de", ES: "es", GB: "co.uk",
  NL: "nl", BE: "com.be", SE: "se", PL: "pl",
};

function StatoBadge({ stato }) {
  if (!stato) return <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-500">N/D</span>;
  const s = String(stato).toUpperCase();
  const cls = s === "BUYABLE" || s === "DISCOVERABLE"
    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
    : s === "INCOMPLETE" || s === "INACTIVE"
    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
    : "bg-slate-800 border-slate-700 text-slate-400";
  return <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wider ${cls}`}>{s}</span>;
}

const ListingHome = ({ prodotti, paese, filtro, totaleProdotti, showHidden = false, onChanged }) => {
  const [syncingAsin, setSyncingAsin] = useState(null);
  const openImages = (prod) => window.open(`/uffici/listing/immagini/${prod.asin}/${paese}`, "_self");
  const openAplus = (prod) => window.open(`/uffici/listing/aplus/${prod.asin}/${paese}`, "_self");
  const openAmazon = (prod) => {
    const tld = AMAZON_TLD[paese] || "com";
    window.open(`https://www.amazon.${tld}/dp/${prod.asin}`, "_blank", "noreferrer");
  };

  const hideProduct = async (prod) => {
    if (!window.confirm(`Nascondere ${prod.asin} dalla lista?\n\nNon tratti più questo prodotto? Potrai sempre ripristinarlo dal toggle "Mostra nascosti".`)) return;
    try {
      const r = await fetch("/api/v2/europa/catalogo/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin: prod.asin }),
      });
      if (!r.ok) throw new Error();
      toast.success(`${prod.asin} nascosto`);
      onChanged?.();
    } catch {
      toast.error("Errore durante la rimozione");
    }
  };

  const syncProduct = async (prod) => {
    if (syncingAsin) return;
    setSyncingAsin(prod.asin);
    try {
      // IMPORTANTE: sequenziale, non in parallelo.
      // Entrambi gli endpoint chiamano FBA Inventory sugli 8 marketplace;
      // 16 richieste parallele sforano la quota e Amazon risponde con 429
      // (→ salvaStockNelDB salta, stock non si aggiorna in UI).
      const rStock = await fetch(`/api/v2/europa/sync-stock/${prod.asin}`, { method: "POST" });
      const jStock = await rStock.json().catch(() => ({}));
      console.log(`[sync ${prod.asin}] stock=${rStock.status}`, jStock);
      if (!rStock.ok) {
        toast.error(`Stock: ${jStock?.error || rStock.status}`);
      } else if (jStock?.warning) {
        toast.warning(jStock.warning);
      }

      const rPrezzi = await fetch(`/api/v2/europa/sync/${prod.asin}`, { method: "POST" });
      const jPrezzi = await rPrezzi.json().catch(() => ({}));
      console.log(`[sync ${prod.asin}] prezzi=${rPrezzi.status}`, jPrezzi);
      if (!rPrezzi.ok) toast.error(`Prezzi: ${jPrezzi?.error || rPrezzi.status}`);

      if (rStock.ok && rPrezzi.ok) {
        const saved = Array.isArray(jStock?.saved) ? jStock.saved.length : 0;
        toast.success(`${prod.asin}: stock ${saved} paesi · prezzi ok`);
      }
      onChanged?.();
    } catch (e) {
      toast.error(`Errore sync ${prod.asin}: ${e.message}`);
    } finally {
      setSyncingAsin(null);
    }
  };

  const unhideProduct = async (prod) => {
    try {
      const r = await fetch("/api/v2/europa/catalogo/unhide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin: prod.asin }),
      });
      if (!r.ok) throw new Error();
      toast.success(`${prod.asin} ripristinato`);
      onChanged?.();
    } catch {
      toast.error("Errore durante il ripristino");
    }
  };

  return (
    <div>
      <div className="text-sm text-slate-400 mb-4">
        {totaleProdotti} prodott{totaleProdotti === 1 ? "o" : "i"} per <span className="text-white font-medium">{paese}</span>
        {filtro && <> con filtro: "<span className="text-cyan-400">{filtro}</span>"</>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {prodotti.map((prod) => {
          const prezzoInfo = getPrezzoPerPaese(prod, paese);
          const stock = getStockPerPaese(prod, paese);
          const prezzoEntry = prod.prezzi?.find((p) => p.country === paese);
          const stato = prezzoEntry?.stato;
          const hasPrezzoOk = Boolean(prezzoInfo);
          const hasStock = stock > 0;
          const sUp = String(stato || "").toUpperCase();
          // Alert solo su problemi CERTI: stato INCOMPLETE/INACTIVE, o prezzo assente, o stock a zero.
          // Se lo stato è sconosciuto/nullo non segnaliamo nulla (mancano i dati, non è un errore).
          const problems = [];
          if (sUp === "INCOMPLETE" || sUp === "INACTIVE") problems.push(`Stato: ${sUp}`);
          if (!hasPrezzoOk) problems.push("Prezzo non disponibile");
          if (!hasStock) problems.push("Stock a zero");
          const hasProblems = problems.length > 0;

          return (
            <div
              key={prod.asin}
              className={`group flex flex-col bg-slate-900/60 border rounded-lg overflow-hidden transition-all ${prod.hidden ? "border-slate-700 opacity-60" : hasProblems ? "border-amber-500/30" : "border-slate-800"}`}
            >
              {/* Immagine */}
              <div className="relative w-full aspect-square bg-white flex items-center justify-center p-2">
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
                {hasProblems && !prod.hidden && (
                  <div
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-amber-500/90 text-amber-950 flex items-center justify-center"
                    title={problems.join(" · ")}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                )}
                {/* Hide / Restore button */}
                {prod.hidden ? (
                  <button
                    type="button"
                    onClick={() => unhideProduct(prod)}
                    title="Ripristina"
                    className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-emerald-500/90 text-emerald-950 hover:bg-emerald-400 flex items-center justify-center"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => hideProduct(prod)}
                    title="Nascondi questo prodotto"
                    className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-rose-500 text-slate-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="px-3 py-2.5 flex-1 flex flex-col">
                <p className="text-xs text-white font-medium leading-tight line-clamp-2 mb-1.5">
                  {prod.product_name || prod.asin}
                </p>
                <div className="flex items-center gap-1 mb-2 flex-wrap">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {prod.asin}
                  </span>
                  <StatoBadge stato={stato} />
                </div>

                <div className="flex items-center justify-between mb-1">
                  {prezzoInfo ? (
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {prezzoInfo.currency === "GBP" ? "\u00A3" : "\u20AC"}{prezzoInfo.prezzo}
                    </span>
                  ) : (
                    <span className="text-xs text-rose-400">Prezzo n.d.</span>
                  )}
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    hasStock
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    {stock} pz
                  </span>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] uppercase tracking-wider font-medium ${prezzoInfo?.buybox ? "text-emerald-400" : "text-rose-400"}`}>
                    {prezzoInfo?.buybox ? "BuyBox ✓" : "BuyBox ✗"}
                  </span>
                </div>

                {/* Quick actions (analisi) */}
                <div className="mt-auto grid grid-cols-4 gap-1 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => syncProduct(prod)}
                    disabled={syncingAsin === prod.asin}
                    title="Aggiorna questo prodotto (tutti i marketplace)"
                    className="flex items-center justify-center py-1.5 rounded-md border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-blue-500/50 hover:text-blue-300 text-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingAsin === prod.asin ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openImages(prod)}
                    title="Immagini catalogo"
                    className="flex items-center justify-center py-1.5 rounded-md border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-cyan-500/50 hover:text-cyan-300 text-slate-400 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openAplus(prod)}
                    title="A+ Content"
                    className="flex items-center justify-center py-1.5 rounded-md border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-violet-500/50 hover:text-violet-300 text-slate-400 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openAmazon(prod)}
                    title="Apri su Amazon"
                    className="flex items-center justify-center py-1.5 rounded-md border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-amber-500/50 hover:text-amber-300 text-slate-400 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ListingHome;
