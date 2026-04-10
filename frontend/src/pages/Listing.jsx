import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ListingHome from "../components/listing/ListingHome";
import { PAESI as paesi } from "../utils/paesi";
import { fetchProdotti, filtraProdotti, contaProdottiPerPaese } from "../utils/gestioneListing";
import {
  ArrowLeft,
  Search,
  Globe,
  Package,
  CheckCircle,
} from "lucide-react";

const Listing = () => {
  const navigate = useNavigate();
  const [prodotti, setProdotti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [paese, setPaese] = useState("");
  const sectionRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchProdotti(setProdotti).finally(() => setLoading(false));
  }, []);

  const handlePaeseClick = (codice) => {
    setPaese(codice === paese ? "" : codice);
    setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const prodottiFiltrati = filtraProdotti(prodotti, paese, filtro);
  const totaleAsin = new Set(prodotti.map(p => p.asin)).size;
  const paesiAttivi = paesi.filter(p => contaProdottiPerPaese(prodotti, p.codice) > 0).length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} type="button" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <Globe className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Nexus</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Listing Prodotti</span>
            </div>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Marketplace</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Listing Prodotti <span className="text-slate-500">— catalogo internazionale.</span>
          </h1>
        </div>
      </section>

      {/* === Content === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Marketplace", value: paesi.length, icon: Globe, color: "blue" },
            { label: "Attivi", value: paesiAttivi, icon: CheckCircle, color: "emerald" },
            { label: "ASIN Totali", value: totaleAsin, icon: Package, color: "violet" },
          ].map(s => {
            const Icon = s.icon;
            const colorMap = {
              blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
              emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
              violet: "text-violet-400 bg-violet-500/10 border-violet-500/30",
            };
            return (
              <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-lg px-5 py-4">
                <div className={`w-8 h-8 rounded-md border flex items-center justify-center mb-3 ${colorMap[s.color]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-semibold text-white tabular-nums">{s.value}</div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Ricerca */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca per nome, ASIN o SKU..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-slate-900/60 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-colors"
          />
        </div>

        {/* Griglia paesi */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-4">Seleziona marketplace</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {paesi.map(p => {
                const count = contaProdottiPerPaese(prodotti, p.codice);
                const isSelected = paese === p.codice;
                const isActive = count > 0;
                return (
                  <button
                    key={p.codice}
                    onClick={() => handlePaeseClick(p.codice)}
                    type="button"
                    className={`relative flex flex-col items-center gap-2 px-3 py-4 rounded-lg border transition-all ${
                      isSelected
                        ? "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/30"
                        : isActive
                          ? "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800"
                          : "border-slate-800 bg-slate-900/30 opacity-40"
                    }`}
                  >
                    <img
                      src={`https://flagcdn.com/w40/${p.bandiera}.png`}
                      alt={p.nome}
                      className="w-8 h-auto rounded-sm shadow-sm"
                      loading="lazy"
                    />
                    <span className={`text-xs font-semibold ${isSelected ? "text-blue-400" : "text-slate-300"}`}>{p.codice}</span>
                    <span className={`text-lg font-bold tabular-nums ${isSelected ? "text-white" : isActive ? "text-blue-400" : "text-slate-600"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Risultati */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">Caricamento catalogo...</div>
        ) : paese ? (
          <div ref={sectionRef} className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
            <div className="px-5 sm:px-6 py-5">
              <ListingHome prodotti={prodottiFiltrati} paese={paese} filtro={filtro} totaleProdotti={prodottiFiltrati.length} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Globe className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">Seleziona un marketplace per visualizzare i prodotti</p>
          </div>
        )}
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>&copy; {new Date().getFullYear()} Nexus &middot; Listing</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Listing;
