import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Tag,
  Edit3,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Truck,
  Search,
  X,
} from "lucide-react";

/* ── Dati iniziali ───────────────────────────────────────── */

const initialData = [
  { id: 1, nome: "Primer no acido", quantita: 25000 },
  { id: 2, nome: "Primer Acido", quantita: 1170 },
  { id: 3, nome: "Nail Prep", quantita: 4500 },
  { id: 4, nome: "Olio Vaniglia", quantita: 2300 },
  { id: 5, nome: "olio fragola", quantita: 3000 },
  { id: 6, nome: "olio cocco", quantita: 3600 },
  { id: 7, nome: "olio generico", quantita: 5300 },
  { id: 8, nome: "acrygel", quantita: 1300 },
  { id: 9, nome: "cilindri", quantita: "2000+" },
  { id: 10, nome: "antifungo", quantita: 0 },
  { id: 11, nome: "cutiway", quantita: 3400 },
  { id: 12, nome: "olio 3 fasico", quantita: 3400 },
  { id: 13, nome: "Rinforzante", quantita: 4800 },
  { id: 14, nome: "Smalto Amaro", quantita: 7000 },
  { id: 15, nome: "Rimuovi Cuticole", quantita: 9300 },
  { id: 16, nome: "top coat manicure", quantita: 2000 },
  { id: 17, nome: "top coat Ultra shine", quantita: 1300 },
  { id: 18, nome: "top coat no wipe", quantita: 2340 },
  { id: 19, nome: "top coat matt", quantita: 2000 },
  { id: 20, nome: "base + top", quantita: 4700 },
  { id: 21, nome: "base coat", quantita: 2000 },
  { id: 22, nome: "olio cbd 5%", quantita: 2500 },
  { id: 23, nome: "olio cbd 15%", quantita: 2500 },
  { id: 24, nome: "olio cbd 25%", quantita: 2500 },
  { id: 25, nome: "Rubber base", quantita: 4700 },
  { id: 26, nome: "generica", quantita: 4700 },
];

/* ── Shared UI ──────────────────────────────────────────── */

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 focus:border-cyan-500/60 transition-colors";

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

const Etichette = () => {
  const [rows, setRows] = useState(initialData);
  const [expandedCards, setExpandedCards] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isMagazzino = location.pathname.startsWith("/magazzino");

  const toggleCardExpansion = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChange = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleRettifica = (row) => {
    const nuovaQuantita = prompt(`Rettifica quantita per "${row.nome}".\nQuantita attuale: ${row.quantita}`, row.quantita);
    if (nuovaQuantita !== null) {
      handleChange(row.id, "quantita", nuovaQuantita);
      toast.info(`Quantita aggiornata per "${row.nome}": ${nuovaQuantita}`);
    }
  };

  const filteredRows = rows.filter((row) => row.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalEtichette = filteredRows.reduce((acc, row) => acc + (typeof row.quantita === "number" ? row.quantita : 0), 0);
  const etichetteBasse = filteredRows.filter((row) => typeof row.quantita === "number" && row.quantita > 0 && row.quantita < 2000).length;
  const etichetteEsaurite = filteredRows.filter((row) => row.quantita === 0).length;

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
            <div className="w-9 h-9 rounded-md bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
              <Tag className="w-[18px] h-[18px] text-cyan-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Gestione Etichette</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Inventario etichette</span>
            </div>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Magazzino</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Gestione Etichette <span className="text-slate-500">— inventario prodotti.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Inventario etichette prodotti. Monitora le scorte e gestisci le rettifiche.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Statistiche */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile icon={CheckCircle} label="Totale etichette" value={totalEtichette.toLocaleString()} accent="emerald" />
          <StatTile icon={TrendingUp} label="Scorte basse (<2000)" value={etichetteBasse} accent="amber" />
          <StatTile icon={AlertCircle} label="Esaurite" value={etichetteEsaurite} accent="rose" />
        </div>

        {/* Ricerca */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-md border bg-cyan-500/10 border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Ricerca</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Cerca etichetta</h2>
              </div>
            </div>
            <div className="relative">
              <input type="text" placeholder="Cerca per nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contatore */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-400" />
          <div className="px-5 sm:px-6 py-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Tag className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">Inventario</div>
              <p className="text-sm text-slate-300">
                <span className="text-cyan-400 font-medium">{filteredRows.length}</span> tipologi{filteredRows.length === 1 ? "a" : "e"} di etichett{filteredRows.length === 1 ? "a" : "e"}
              </p>
            </div>
          </div>
        </div>

        {/* Card etichette */}
        {filteredRows.length === 0 ? (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700/60" />
            <div className="px-5 sm:px-6 py-12 text-center">
              <Tag className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nessuna etichetta trovata</p>
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
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />

                  {/* Header */}
                  <div className="px-5 py-4 cursor-pointer hover:bg-slate-800/30 transition-colors" onClick={() => toggleCardExpansion(row.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <Tag className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate capitalize">{row.nome}</h3>
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
                        <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-400 mb-2">Quantita disponibile</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={row.quantita}
                            onChange={(e) => handleChange(row.id, "quantita", e.target.value)}
                            className="flex-1 bg-slate-700/60 border border-slate-600 rounded-md px-3 py-2 text-white text-lg font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
                          />
                          <button onClick={() => handleRettifica(row)} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-[12px] font-medium transition-all">
                            <Edit3 className="w-3.5 h-3.5" /> Rettifica
                          </button>
                        </div>
                      </div>

                      {/* Campi aggiuntivi */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Colonna 1", field: "colonna1" },
                          { label: "6 Mesi", field: "mesi8" },
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
                          <p className="text-rose-300 text-xs font-medium">Etichette esaurite — riordinare urgentemente</p>
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
          <span>© {new Date().getFullYear()} Nexus · Gestione Etichette</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Etichette;
