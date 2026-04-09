import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  Edit3,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Box,
  History,
  Search,
  X,
} from "lucide-react";

/* ── Shared UI ──────────────────────────────────────────── */

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors";

function StatTile({ icon: Icon, label, value, accent = "emerald" }) {
  const m = {
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    amber:   "bg-amber-500/10 border-amber-500/40 text-amber-400",
    rose:    "bg-rose-500/10 border-rose-500/40 text-rose-400",
  };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${m[accent]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function SectionCard({ accent = "violet", eyebrow, title, icon: Icon, children }) {
  const bars = { violet: "bg-violet-400", cyan: "bg-cyan-400", emerald: "bg-emerald-400", blue: "bg-blue-400" };
  const icons = { violet: "text-violet-400 bg-violet-500/10 border-violet-500/30", cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30", emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", blue: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${bars[accent]}/60`} />
      <div className="px-5 sm:px-6 py-5">
        {(eyebrow || title) && (
          <div className="flex items-center gap-3 mb-4">
            {Icon && (
              <div className={`w-8 h-8 rounded-md border flex items-center justify-center flex-shrink-0 ${icons[accent]}`}>
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">{eyebrow}</div>}
              {title && <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-tight truncate">{title}</h2>}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ── Helpers quantita ────────────────────────────────────── */

const getQuantitaAccent = (quantita) => {
  if (quantita === 0) return { bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-400" };
  if (typeof quantita === "number" && quantita < 2000) return { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400" };
  return { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400" };
};

const getQuantitaIcon = (quantita) => {
  if (quantita === 0) return <AlertCircle className="w-3.5 h-3.5" />;
  if (typeof quantita === "number" && quantita < 2000) return <TrendingUp className="w-3.5 h-3.5" />;
  return <CheckCircle className="w-3.5 h-3.5" />;
};

/* ── Componente principale ───────────────────────────────── */

const Scatolette = () => {
  const [rows, setRows] = useState([]);
  const [expandedCards, setExpandedCards] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isMagazzino = location.pathname.startsWith("/magazzino");

  useEffect(() => {
    const fetchScatolette = async () => {
      try {
        const res = await fetch("/api/v2/scatolette");
        const data = await res.json();
        setRows(data);
      } catch (err) {
        console.error("Errore caricamento scatolette:", err);
      }
    };
    fetchScatolette();
  }, []);

  const toggleCardExpansion = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChange = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleRettifica = async (row) => {
    const nuovaQuantita = prompt(
      `Rettifica quantita per "${row.nome_prodotto}".\nQuantita attuale: ${row.quantita}`,
      row.quantita
    );
    if (nuovaQuantita === null) return;
    try {
      const res = await fetch(`/api/v2/scatolette/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantita: Number(nuovaQuantita) }),
      });
      if (!res.ok) throw new Error("Errore aggiornamento quantita");
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, quantita: Number(nuovaQuantita) } : r)));
      toast.success("Quantita aggiornata");
    } catch (err) {
      console.error("Errore aggiornamento:", err);
      toast.error("Errore aggiornamento quantita");
    }
  };

  const filteredRows = rows.filter((row) =>
    row.nome_prodotto?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalScatolette = filteredRows.reduce((acc, row) => acc + (typeof row.quantita === "number" ? row.quantita : 0), 0);
  const scatoletteBasse = filteredRows.filter((row) => typeof row.quantita === "number" && row.quantita > 0 && row.quantita < 2000).length;
  const scatoletteEsaurite = filteredRows.filter((row) => row.quantita === 0).length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(isMagazzino ? "/magazzino" : "/dashboard")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
              <Box className="w-[18px] h-[18px] text-violet-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Gestione Scatolette</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Packaging e materiali</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button onClick={() => navigate("/scatolette/storico")} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 hover:border-violet-400/60 text-violet-300 hover:text-violet-200 text-[12px] font-medium transition-all">
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storico</span>
            </button>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Magazzino</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Gestione Scatolette <span className="text-slate-500">— packaging e materiali.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Inventario packaging e materiali. Monitora le scorte e gestisci le rettifiche.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Statistiche */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile icon={CheckCircle} label="Totale scatolette" value={totalScatolette.toLocaleString()} accent="emerald" />
          <StatTile icon={TrendingUp} label="Scorte basse (<2000)" value={scatoletteBasse} accent="amber" />
          <StatTile icon={AlertCircle} label="Esaurite" value={scatoletteEsaurite} accent="rose" />
        </div>

        {/* Ricerca */}
        <SectionCard accent="cyan" eyebrow="Ricerca" title="Cerca scatoletta" icon={Search}>
          <div className="relative">
            <input type="text" placeholder="Cerca per nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </SectionCard>

        {/* Contatore */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-blue-400" />
          <div className="px-5 sm:px-6 py-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">Inventario</div>
              <p className="text-sm text-slate-300">
                <span className="text-violet-400 font-medium">{filteredRows.length}</span> tipologi{filteredRows.length === 1 ? "a" : "e"} di scatolett{filteredRows.length === 1 ? "a" : "e"}
              </p>
            </div>
          </div>
        </div>

        {/* Card scatolette */}
        {filteredRows.length === 0 ? (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700/60" />
            <div className="px-5 sm:px-6 py-12 text-center">
              <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nessuna scatoletta trovata</p>
              {searchTerm && <p className="text-xs text-slate-600 mt-1">Prova a modificare i termini di ricerca</p>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {filteredRows.map((row) => {
              const isExpanded = expandedCards[row.id];
              const qAccent = getQuantitaAccent(row.quantita);

              return (
                <div key={row.id} className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-all">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />

                  {/* Header */}
                  <div className="px-5 py-4 cursor-pointer hover:bg-slate-800/30 transition-colors" onClick={() => toggleCardExpansion(row.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-md bg-violet-500/10 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate capitalize">{row.nome_prodotto}</h3>
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${qAccent.bg} ${qAccent.text}`}>
                            {getQuantitaIcon(row.quantita)}
                            {row.quantita} pz
                          </span>
                        </div>
                      </div>
                      <button type="button" className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleCardExpansion(row.id); }}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Contenuto espanso */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-3 border-t border-slate-800 pt-4">
                      {/* Quantita + Rettifica */}
                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-md px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-violet-400 mb-2">Quantita disponibile</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={row.quantita}
                            onChange={(e) => handleChange(row.id, "quantita", e.target.value)}
                            className="flex-1 bg-slate-700/60 border border-slate-600 rounded-md px-3 py-2 text-white text-lg font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-500/60"
                          />
                          <button onClick={() => handleRettifica(row)} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-[12px] font-medium transition-all">
                            <Edit3 className="w-3.5 h-3.5" /> Rettifica
                          </button>
                        </div>
                      </div>

                      {/* Campi aggiuntivi */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Colonna 1", field: "colonna1" },
                          { label: "6 Mesi", field: "mesi8" },
                          { label: "Ordine Sigma", field: "ordineSigma" },
                          { label: "Ordine Packly", field: "ordinePackly" },
                        ].map((item) => (
                          <div key={item.field} className="bg-slate-800/40 border border-slate-700/60 rounded-md px-3 py-2">
                            <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-1">{item.label}</label>
                            <input
                              type="text"
                              value={row[item.field] || ""}
                              onChange={(e) => handleChange(row.id, item.field, e.target.value)}
                              className="w-full bg-transparent border-0 text-sm text-white placeholder-slate-600 focus:outline-none p-0"
                              placeholder="..."
                            />
                          </div>
                        ))}
                      </div>

                      {/* Info ordine */}
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-md px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-blue-400 mb-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Info ordine
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-1">Data ordine</label>
                            <input type="date" value={row.dataOrdine || ""} onChange={(e) => handleChange(row.id, "dataOrdine", e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-1">6 Mesi (New)</label>
                            <input type="text" value={row.mesi8new || ""} onChange={(e) => handleChange(row.id, "mesi8new", e.target.value)} className={inputCls} placeholder="..." />
                          </div>
                        </div>
                      </div>

                      {/* Alert */}
                      {row.quantita === 0 && (
                        <div className="bg-rose-500/5 border border-rose-500/30 rounded-md p-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <p className="text-rose-300 text-xs font-medium">Scatoletta esaurita — riordinare urgentemente</p>
                        </div>
                      )}
                      {typeof row.quantita === "number" && row.quantita > 0 && row.quantita < 2000 && (
                        <div className="bg-amber-500/5 border border-amber-500/30 rounded-md p-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <p className="text-amber-300 text-xs font-medium">Scorte in esaurimento — considera un riordino</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Gestione Scatolette</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Scatolette;
