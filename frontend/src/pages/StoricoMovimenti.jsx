import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  History,
  Search,
  X,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";

/* ── Helpers ─────────────────────────────────────────────── */

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return dateString;
  }
};

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-colors";

/* ── Shared UI ──────────────────────────────────────────── */

function StatTile({ icon: Icon, label, value, accent = "blue" }) {
  const m = {
    blue:    "bg-blue-500/10 border-blue-500/40 text-blue-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    amber:   "bg-amber-500/10 border-amber-500/40 text-amber-400",
    violet:  "bg-violet-500/10 border-violet-500/40 text-violet-400",
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

function SectionCard({ accent = "blue", eyebrow, title, icon: Icon, children }) {
  const bars = { blue: "bg-blue-400", cyan: "bg-cyan-400", violet: "bg-violet-400", emerald: "bg-emerald-400" };
  const icons = { blue: "text-blue-400 bg-blue-500/10 border-blue-500/30", cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30", violet: "text-violet-400 bg-violet-500/10 border-violet-500/30", emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
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

function TipoBadge({ mov }) {
  const tipo = mov.direzione || mov.tipo;
  if (tipo === "RETTIFICA +") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
        <TrendingUp className="w-3 h-3" /> RETTIFICA +
      </span>
    );
  }
  if (tipo === "RETTIFICA -") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-amber-500/10 border-amber-500/30 text-amber-400">
        <TrendingDown className="w-3 h-3" /> RETTIFICA -
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium bg-violet-500/10 border-violet-500/30 text-violet-400">
      {tipo}
    </span>
  );
}

/* ── Componente principale ───────────────────────────────── */

const StoricoMovimenti = () => {
  const [movimenti, setMovimenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroFrom, setFiltroFrom] = useState("");
  const [filtroTo, setFiltroTo] = useState("");
  const [prodottoSelezionato, setProdottoSelezionato] = useState(null);
  const [prodottiDisponibili, setProdottiDisponibili] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const isMagazzino = localStorage.getItem("auth") === "magazzino";

  useEffect(() => {
    const fetchMovimenti = async () => {
      try {
        const res = await fetch("/api/v2/storico");
        const data = await res.json();
        setMovimenti(data);
      } catch (err) {
        console.error("Errore recupero storico globale:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovimenti();
  }, []);

  useEffect(() => {
    fetch("/api/v2/inventario/nomi")
      .then((res) => res.json())
      .then((data) => setProdottiDisponibili(data))
      .catch((err) => console.error("Errore caricamento nomi prodotti:", err));
  }, []);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const movimentiFiltrati = movimenti.filter((m) => {
    if (prodottoSelezionato && m.nome_prodotto !== prodottoSelezionato.nome) return false;
    const dataMov = new Date(m.created_at);
    if (filtroFrom && dataMov < new Date(filtroFrom)) return false;
    if (filtroTo && dataMov > new Date(filtroTo)) return false;
    return true;
  });

  const nRettPos = movimentiFiltrati.filter((m) => m.direzione === "RETTIFICA +").length;
  const nRettNeg = movimentiFiltrati.filter((m) => m.direzione === "RETTIFICA -").length;
  const nAltri = movimentiFiltrati.filter((m) => m.direzione !== "RETTIFICA +" && m.direzione !== "RETTIFICA -").length;
  const hasFilters = prodottoSelezionato || filtroFrom || filtroTo;

  const clearFilters = () => {
    setProdottoSelezionato(null);
    setFiltroNome("");
    setFiltroFrom("");
    setFiltroTo("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-10 h-10 text-slate-700 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-slate-500">Caricamento storico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(isMagazzino ? "/magazzino" : "/inventario")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <History className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Storico Globale</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Movimenti di magazzino</span>
            </div>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Magazzino</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Storico Globale Movimenti <span className="text-slate-500">— cronologia completa.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Cronologia completa di tutti i movimenti di magazzino. Filtra per prodotto o periodo.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Statistiche */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={History} label="Totali" value={movimentiFiltrati.length} accent="blue" />
          <StatTile icon={TrendingUp} label="Rettifiche +" value={nRettPos} accent="emerald" />
          <StatTile icon={TrendingDown} label="Rettifiche -" value={nRettNeg} accent="amber" />
          <StatTile icon={Package} label="Altri" value={nAltri} accent="violet" />
        </div>

        {/* Filtri */}
        <SectionCard accent="blue" eyebrow="Filtri" title="Filtra movimenti" icon={Filter}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ricerca prodotto */}
            <div className="relative">
              <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2 flex items-center gap-1.5">
                <Search className="w-3 h-3" /> Cerca prodotto
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filtroNome.trim()) {
                      e.preventDefault();
                      const match = movimenti.find(
                        (m) => m.nome_prodotto && m.nome_prodotto.toLowerCase().includes(filtroNome.toLowerCase())
                      );
                      if (match) setProdottoSelezionato(match);
                    }
                  }}
                  className={`${inputCls} pl-9 pr-9`}
                  placeholder="Es. Antimicotico"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                {filtroNome && (
                  <button onClick={() => { setFiltroNome(""); setProdottoSelezionato(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {filtroNome.length > 1 && (
                <ul className="absolute z-10 bg-slate-800 border border-slate-700 w-full mt-1 rounded-md shadow-xl max-h-60 overflow-y-auto">
                  {prodottiDisponibili
                    .filter((p) => p.nome.toLowerCase().includes(filtroNome.toLowerCase()))
                    .map((p) => (
                      <li
                        key={p.asin}
                        className="p-3 cursor-pointer hover:bg-slate-700/60 text-white border-b border-slate-700/60 last:border-b-0 transition-colors"
                        onClick={() => { setProdottoSelezionato(p); setFiltroNome(p.nome); }}
                      >
                        <p className="text-sm font-medium">{p.nome}</p>
                        <p className="text-xs text-slate-400">ASIN: {p.asin}</p>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Da data */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Da data
              </label>
              <input type="date" value={filtroFrom} onChange={(e) => setFiltroFrom(e.target.value)} className={inputCls} />
            </div>

            {/* A data */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> A data
              </label>
              <input type="date" value={filtroTo} onChange={(e) => setFiltroTo(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Filtri attivi */}
          {hasFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Filtri attivi:</span>
              {prodottoSelezionato && (
                <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-md text-[11px] font-medium flex items-center gap-1.5">
                  {prodottoSelezionato.nome}
                  <button onClick={() => { setProdottoSelezionato(null); setFiltroNome(""); }} className="hover:text-blue-200"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filtroFrom && (
                <span className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-md text-[11px] font-medium flex items-center gap-1.5">
                  Da: {filtroFrom}
                  <button onClick={() => setFiltroFrom("")} className="hover:text-violet-200"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filtroTo && (
                <span className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-md text-[11px] font-medium flex items-center gap-1.5">
                  A: {filtroTo}
                  <button onClick={() => setFiltroTo("")} className="hover:text-violet-200"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={clearFilters} className="text-[11px] text-rose-400 hover:text-rose-300 ml-2 underline underline-offset-2">
                Rimuovi tutti
              </button>
            </div>
          )}
        </SectionCard>

        {/* Prodotto selezionato */}
        {prodottoSelezionato && (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
            <div className="px-5 sm:px-6 py-4 flex items-center gap-4">
              <img
                src={`/images/${prodottoSelezionato.asin}.jpg`}
                alt={prodottoSelezionato.nome}
                className="w-16 h-16 object-cover rounded-md border border-slate-700"
                onError={(e) => { e.target.src = "/images/placeholder.jpg"; }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.14em] text-blue-400 mb-1">Prodotto selezionato</div>
                <h3 className="text-sm font-semibold text-white truncate">{prodottoSelezionato.nome}</h3>
                <p className="text-xs text-slate-400 mt-0.5">ASIN: {prodottoSelezionato.asin}</p>
              </div>
            </div>
          </div>
        )}

        {/* Lista movimenti */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-blue-500/10 border-blue-500/30 flex items-center justify-center flex-shrink-0">
                <History className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Movimenti</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Lista movimenti</h2>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-medium tabular-nums">{movimentiFiltrati.length}</span>
            </div>

            {movimentiFiltrati.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-1">Nessun movimento trovato</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-medium transition-all">
                    Rimuovi i filtri
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {movimentiFiltrati.map((mov) => (
                  <div
                    key={mov.id}
                    className="relative bg-slate-800/40 border border-slate-700/60 rounded-md hover:border-slate-600 transition-all cursor-pointer"
                    onClick={() => toggleExpand(mov.id)}
                  >
                    <div className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-3 flex-wrap mb-1">
                            <h3 className="text-sm font-semibold text-white truncate">
                              {mov.nome_prodotto || mov.asin_prodotto}
                            </h3>
                            <TipoBadge mov={mov} />
                          </div>
                          <p className="text-xs text-slate-500 font-mono">{mov.asin_prodotto}</p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {!expanded[mov.id] && (
                            <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap hidden sm:inline">
                              {formatDate(mov.created_at)}
                            </span>
                          )}
                          <button type="button" className="text-slate-500 hover:text-slate-200 transition-colors">
                            {expanded[mov.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Dettagli espansi */}
                      {expanded[mov.id] && (
                        <div className="space-y-3 pt-3 mt-3 border-t border-slate-700/60">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { label: "Delta", value: mov.dettagli?.delta },
                              { label: "Valore Finale", value: mov.dettagli?.finale },
                              { label: "Operatore", value: mov.dettagli?.operatore || "-" },
                              { label: "Data", value: formatDate(mov.created_at) },
                            ].map((item) => (
                              <div key={item.label} className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{item.label}</p>
                                <p className="text-sm text-white font-medium truncate">{item.value}</p>
                              </div>
                            ))}
                          </div>

                          {mov.dettagli?.nota && (
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-md px-4 py-2.5">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-blue-400 mb-1 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Nota
                              </p>
                              <p className="text-[13px] text-blue-200/80">{mov.dettagli.nota}</p>
                            </div>
                          )}

                          {mov.accessori?.length > 0 && (
                            <div className="bg-violet-500/5 border border-violet-500/20 rounded-md px-4 py-2.5">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-violet-400 mb-2 flex items-center gap-1">
                                <Package className="w-3 h-3" /> Accessori movimentati
                              </p>
                              <ul className="space-y-1">
                                {mov.accessori.map((acc, idx) => (
                                  <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                                    <span className="font-mono text-slate-400">{acc.asin_accessorio}</span>
                                    <span className={`font-semibold ${acc.qty > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                      {acc.qty > 0 ? `+${acc.qty}` : acc.qty}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Storico Movimenti</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default StoricoMovimenti;
