import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  RefreshCw,
  Search,
  Filter,
  Globe,
  ChevronDown,
  ChevronUp,
  ImageOff,
  Loader2,
  ShoppingCart,
  DollarSign,
  CheckCircle,
  XCircle,
  LogOut,
} from "lucide-react";

const flags = {
  Italy: "it",
  France: "fr",
  Spain: "es",
  Germany: "de",
  UK: "gb",
  Netherlands: "nl",
  Belgium: "be",
  Poland: "pl",
  Sweden: "se",
};

const marketplaces = Object.keys(flags);

const InventarioMagazzino = () => {
  const navigate = useNavigate();
  const [prodotti, setProdotti] = useState([]);
  const [stockFBA, setStockFBA] = useState([]);
  const [dettagli, setDettagli] = useState({});
  const [filtro, setFiltro] = useState("");
  const [soloOutOfStock, setSoloOutOfStock] = useState(false);
  const [expandedAsin, setExpandedAsin] = useState(null);
  const [selezionati, setSelezionati] = useState(marketplaces);
  const [caricamento, setCaricamento] = useState(false);

  useEffect(() => {
    const fetchCatalogo = async () => {
      try {
        const response = await fetch(
          "/api/v2/reports-amazon/catalogo/amzn1.spdoc.1.4.eu.508a42ce-5a6a-4e38-83e7-edc44aa896f5.TAV53YUXUWMKC.47700"
        );
        const data = await response.json();
        setProdotti(data);
      } catch (error) {
        console.error("Errore caricamento catalogo:", error);
      }
    };
    fetchCatalogo();
  }, []);

  const caricaStockFBA = async () => {
    setCaricamento(true);
    try {
      const res = await fetch("/api/v2/reports-amazon/fba-stock");
      const data = await res.json();
      setStockFBA(data);
    } catch (err) {
      console.error("Errore caricamento stock FBA:", err);
    } finally {
      setCaricamento(false);
    }
  };

  useEffect(() => { caricaStockFBA(); }, []);

  useEffect(() => {
    const fetchAllImages = async () => {
      try {
        const res = await fetch("/api/v2/reports-amazon/catalog-images/all");
        const data = await res.json();
        if (data?.immagini) {
          setProdotti((prev) =>
            prev.map((p) => {
              const found = data.immagini.find((i) => i.asin === p.asin);
              return found ? { ...p, immagine_main: found.image } : p;
            })
          );
        }
      } catch (err) {
        console.error("Errore fetch immagini globali:", err);
      }
    };
    fetchAllImages();
  }, []);

  const aggiornaStockFBA = async () => {
    setCaricamento(true);
    try {
      const res = await fetch("/api/v2/reports-amazon/fba-stock/update", { method: "POST" });
      await res.json();
      await caricaStockFBA();
    } catch (err) {
      console.error("Errore aggiornamento FBA:", err);
    } finally {
      setCaricamento(false);
    }
  };

  const prodottiConStock = prodotti.map((p) => {
    const fbaRecord = stockFBA.find((f) => f.asin === p.asin);
    return {
      ...p,
      stockFBA: fbaRecord ? fbaRecord.stock_totale : 0,
      stockCountry: fbaRecord ? fbaRecord.country : null,
    };
  });

  const caricaDettagli = async (asin) => {
    if (dettagli[asin]) {
      setExpandedAsin(expandedAsin === asin ? null : asin);
      return;
    }
    try {
      const res = await fetch(`/api/v2/reports-amazon/catalog/${asin}`);
      const data = await res.json();
      setDettagli((prev) => ({ ...prev, [asin]: data.marketplaces }));
      setExpandedAsin(asin);
    } catch (err) {
      console.error("Errore caricamento dettagli:", err);
    }
  };

  const prodottiFiltrati = prodottiConStock.filter((p) => {
    const testo = filtro.toLowerCase();
    const match =
      p.asin?.toLowerCase().includes(testo) ||
      p.sku?.toLowerCase().includes(testo) ||
      p.nome?.toLowerCase().includes(testo);
    return match && (!soloOutOfStock || p.stockFBA === 0) && (p.stockCountry ? selezionati.includes(p.stockCountry) : true);
  });

  const calcolaCommissioni = (price) => {
    if (!price || !price.amount) return "-";
    const commissione = (price.amount * 0.15).toFixed(2);
    return `${commissione} ${price.currencyCode}`;
  };

  const togglePaese = (paese) => {
    setSelezionati((prev) =>
      prev.includes(paese) ? prev.filter((p) => p !== paese) : [...prev, paese]
    );
  };

  const fetchImmagine = async (asin) => {
    try {
      const res = await fetch(`/api/v2/reports-amazon/catalog-image/${asin}`);
      const data = await res.json();
      if (data?.image) {
        setProdotti((prev) =>
          prev.map((p) => (p.asin === asin ? { ...p, immagine_main: data.image } : p))
        );
      }
    } catch (err) {
      console.error("Errore fetch immagine:", err);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/magazzino")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <Package className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Inventario Amazon</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Catalogo + Stock FBA</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={aggiornaStockFBA}
              disabled={caricamento}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${caricamento ? "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed" : "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200"}`}
            >
              {caricamento ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {caricamento ? "Aggiornamento..." : "Aggiorna Stock FBA"}
            </button>
          </div>
        </div>
      </header>

      {/* === Content === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">

        {/* Filtri */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
          <div className="px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-cyan-500/10 border-cyan-500/40 text-cyan-400">
                <Filter className="w-[18px] h-[18px]" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Ricerca</span>
                <h3 className="text-sm font-semibold text-white -mt-0.5">Filtri</h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-5">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filtra per ASIN, SKU o Nome..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-md text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-cyan-500/60 focus:border-cyan-500/40 outline-none transition-colors"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={soloOutOfStock}
                  onChange={() => setSoloOutOfStock(!soloOutOfStock)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-rose-500/40"
                />
                Solo out of stock
              </label>
            </div>

            {/* Filtro paesi */}
            <div className="flex flex-wrap gap-2">
              {marketplaces.map((paese) => (
                <button
                  key={paese}
                  type="button"
                  onClick={() => togglePaese(paese)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selezionati.includes(paese) ? "bg-blue-500/15 border border-blue-500/40 text-blue-300" : "bg-slate-800/60 border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"}`}
                >
                  <img src={`https://flagcdn.com/24x18/${flags[paese]}.png`} alt={paese} className="w-5 h-3 rounded-sm" />
                  {paese}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats rapide */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-5 py-4">
            <div className="text-2xl font-semibold text-white tabular-nums">{prodottiFiltrati.length}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-0.5">Prodotti</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-5 py-4">
            <div className="text-2xl font-semibold text-emerald-400 tabular-nums">{prodottiFiltrati.filter(p => p.stockFBA > 0).length}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-0.5">In stock</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-5 py-4">
            <div className="text-2xl font-semibold text-rose-400 tabular-nums">{prodottiFiltrati.filter(p => p.stockFBA === 0).length}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-0.5">Out of stock</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-5 py-4">
            <div className="text-2xl font-semibold text-blue-400 tabular-nums">{selezionati.length}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-0.5">Paesi attivi</div>
          </div>
        </div>

        {/* Lista prodotti */}
        <div className="space-y-3">
          {prodottiFiltrati.map((p) => {
            const isExpanded = expandedAsin === p.asin;
            const stockColor = p.stockFBA === 0 ? "border-l-rose-500/70" : p.stockFBA < 10 ? "border-l-amber-500/70" : "border-l-emerald-500/70";

            return (
              <div key={p.asin} className={`bg-slate-900/60 border border-slate-800 rounded-lg border-l-2 ${stockColor} overflow-hidden`}>
                <div className="flex items-center gap-4 px-6 py-4 sm:px-8 sm:py-5">
                  <img
                    key={p.immagine_main || p.asin}
                    src={p.immagine_main || "/images/no_image2.png"}
                    alt={p.nome}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/no_image.jpg";
                      fetchImmagine(p.asin);
                    }}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-md object-contain bg-slate-800 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-white truncate">{p.nome}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">{p.asin}</span>
                      <span className="text-[11px] text-slate-500">SKU: <span className="font-mono text-slate-400">{p.sku}</span></span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
                      <span className="text-slate-400">
                        Catalogo: <span className="font-semibold text-white tabular-nums">{p.stock ?? p.pronto ?? 0}</span>
                      </span>
                      <span className={p.stockFBA === 0 ? "text-rose-400" : "text-emerald-400"}>
                        FBA: <span className="font-semibold text-white tabular-nums">{p.stockFBA ?? 0}</span>
                        {p.stockCountry && <span className="text-slate-500 ml-1">({p.stockCountry})</span>}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => caricaDettagli(p.asin)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 transition-colors flex-shrink-0"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {isExpanded ? "Nascondi" : "Dettagli"}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Tabella dettagli marketplace */}
                {isExpanded && dettagli[p.asin] && (
                  <div className="border-t border-slate-800 px-6 py-4 sm:px-8 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="pb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium">Marketplace</th>
                          <th className="pb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium">Prezzo</th>
                          <th className="pb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium">Stock Amazon</th>
                          <th className="pb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium">FBA reale</th>
                          <th className="pb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium">Buy Box</th>
                          <th className="pb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium">Commissioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dettagli[p.asin]
                          .filter((d) => selezionati.includes(d.paese))
                          .map((d) => {
                            const flag = flags[d.paese] || "xx";
                            const price = d.listing?.summaries?.[0]?.price;
                            const quantity = d.listing?.summaries?.[0]?.quantity ?? "n/d";
                            const hasBuyBox = d.listing?.summaries?.[0]?.buyBoxWon;
                            const fbaQty = p.stockFBA || "-";

                            return (
                              <tr key={d.marketplaceId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                <td className="py-2.5 pr-3">
                                  <div className="flex items-center gap-2">
                                    <img src={`https://flagcdn.com/24x18/${flag}.png`} alt={d.paese} className="w-5 h-3 rounded-sm" />
                                    <span className="text-slate-300">{d.paese}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3 text-white tabular-nums font-medium">
                                  {price?.amount || "-"} <span className="text-slate-500">{price?.currencyCode || ""}</span>
                                </td>
                                <td className="py-2.5 pr-3 text-slate-300 tabular-nums">{quantity}</td>
                                <td className="py-2.5 pr-3 text-blue-400 font-semibold tabular-nums">{fbaQty}</td>
                                <td className="py-2.5 pr-3">
                                  {hasBuyBox
                                    ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    : <XCircle className="w-4 h-4 text-rose-400" />}
                                </td>
                                <td className="py-2.5 text-emerald-400 tabular-nums">{calcolaCommissioni(price)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
        <span>&copy; {new Date().getFullYear()} Nexus — Inventario Amazon</span>
        <span className="font-mono">v2.0</span>
      </footer>
    </div>
  );
};

export default InventarioMagazzino;
