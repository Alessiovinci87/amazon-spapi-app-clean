import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ListingHome from "../components/listing/ListingHome";
import { PAESI as paesi } from "../utils/paesi";
import { filtraProdotti, contaProdottiPerPaese } from "../utils/gestioneListing";

async function fetchProdottiWithHidden(setter, includeHidden) {
  try {
    const url = `/api/v2/europa/catalogo${includeHidden ? "?includeHidden=1" : ""}`;
    const r = await fetch(url);
    const d = await r.json();
    if (Array.isArray(d)) setter(d);
  } catch (e) {
    console.error("Errore catalogo:", e);
  }
}
import {
  Search,
  Globe,
  Package,
  CheckCircle,
  RefreshCw,
  Loader,
} from "lucide-react";
import { toast } from "sonner";
import PageTopBar from "../components/PageTopBar";

const Listing = () => {
  const navigate = useNavigate();
  const [prodotti, setProdotti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [paese, setPaese] = useState("");
  const [syncRunning, setSyncRunning] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const sectionRef = useRef(null);

  const reload = () => fetchProdottiWithHidden(setProdotti, showHidden);

  const pollSyncStatus = async () => {
    try {
      const r = await fetch(`/api/v2/europa/sync-prezzi/stato`);
      const j = await r.json();
      if (j?.running) {
        setTimeout(pollSyncStatus, 5000);
      } else {
        setSyncRunning(false);
        if (j?.error) toast.error(`Sync fallito: ${j.error}`);
        else toast.success(`Sync completato · aggiornati ${j?.aggiornati ?? 0} ASIN`);
        // Ricarica dati per refresh UI
        reload();
      }
    } catch {
      setSyncRunning(false);
    }
  };

  const handleSync = async () => {
    if (syncRunning) return;
    setSyncRunning(true);
    try {
      const r = await fetch(`/api/v2/europa/sync-prezzi`, { method: "POST" });
      const j = await r.json();
      if (!j.avviato) {
        toast.info(j?.messaggio || "Sync già in corso");
        if (j?.stato?.running) setTimeout(pollSyncStatus, 3000);
        else setSyncRunning(false);
        return;
      }
      toast.success(`Aggiornamento prezzi/stock avviato · ${j.total} ASIN`);
      setTimeout(pollSyncStatus, 5000);
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
      setSyncRunning(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProdottiWithHidden(setProdotti, showHidden).finally(() => setLoading(false));
  }, [showHidden]);

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

      <PageTopBar
        icon={Globe}
        iconAccent="blue"
        eyebrow="Marketplace"
        title="Listing Prodotti"
        backTo="/europe"
        syncing={syncRunning}
        onSyncClick={syncRunning ? undefined : handleSync}
        syncTitle="Aggiorna prezzi e Buy Box per tutti gli ASIN"
      />

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
              <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <img src={`https://flagcdn.com/w40/${paesi.find(p => p.codice === paese)?.bandiera || paese.toLowerCase()}.png`} alt={paese} className="h-6 w-auto rounded-sm" />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Marketplace</div>
                    <div className="text-sm font-semibold text-white">{paesi.find(p => p.codice === paese)?.nome || paese}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHidden((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-[11px] uppercase tracking-wider transition-colors ${
                      showHidden
                        ? "bg-slate-800 border-slate-600 text-slate-200"
                        : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {showHidden ? "Nascondi archiviati" : "Mostra nascosti"}
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={syncRunning}
                    type="button"
                    title="Aggiorna prezzi, stock e stato Buy Box per tutti gli ASIN"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {syncRunning ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {syncRunning ? "Aggiornamento…" : "Aggiorna stato"}
                  </button>
                </div>
              </div>
              <ListingHome prodotti={prodottiFiltrati} paese={paese} filtro={filtro} totaleProdotti={prodottiFiltrati.length} showHidden={showHidden} onChanged={reload} />
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
