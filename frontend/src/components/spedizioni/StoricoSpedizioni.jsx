import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Truck,
  Download,
  ChevronDown,
  ChevronUp,
  Globe,
  History,
  CheckCircle,
  Clock,
  Package,
  FileText,
  User,
  X,
} from "lucide-react";

/* ── Helpers ─────────────────────────────────────────────── */

const FLAGS = { IT: "IT", FR: "FR", ES: "ES", DE: "DE", BE: "BE", NL: "NL", SE: "SE", PL: "PL", IE: "IE" };

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return dateString; }
};

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-colors";

/* ── Badges ──────────────────────────────────────────────── */

function StatoBadge({ stato }) {
  const s = (stato || "").toLowerCase();
  if (s.includes("completata") || s.includes("spedita") || s.includes("confermata")) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-emerald-500/10 border-emerald-500/30 text-emerald-400"><CheckCircle className="w-3 h-3" />{stato}</span>;
  }
  if (s.includes("preparazione") || s.includes("in corso") || s.includes("bozza")) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-amber-500/10 border-amber-500/30 text-amber-400"><Clock className="w-3 h-3" />{stato}</span>;
  }
  if (s.includes("annullata") || s.includes("cancellata") || s.includes("eliminata")) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-rose-500/10 border-rose-500/30 text-rose-400"><X className="w-3 h-3" />{stato}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium bg-slate-500/10 border-slate-500/30 text-slate-400">{stato}</span>;
}

function EventoBadge({ evento }) {
  const e = (evento || "").toLowerCase();
  if (e.includes("creata")) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium bg-blue-500/10 border-blue-500/30 text-blue-400">{evento}</span>;
  }
  if (e.includes("confermata")) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium bg-emerald-500/10 border-emerald-500/30 text-emerald-400">{evento}</span>;
  }
  if (e.includes("eliminata")) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium bg-rose-500/10 border-rose-500/30 text-rose-400">{evento}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium bg-slate-500/10 border-slate-500/30 text-slate-400">{evento}</span>;
}

/* ── StatTile ────────────────────────────────────────────── */

function StatTile({ icon: Icon, label, value, accent = "blue" }) {
  const m = {
    blue:    "bg-blue-500/10 border-blue-500/40 text-blue-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    amber:   "bg-amber-500/10 border-amber-500/40 text-amber-400",
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

/* ── Componente principale ───────────────────────────────── */

const StoricoSpedizioni = () => {
  const [storico, setStorico] = useState([]);
  const [filtroState, setFiltroState] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isMagazzino = location.pathname.startsWith("/magazzino");

  const scaricaCSV = (s) => {
    const header = "ASIN;Prodotto;Quantita\n";
    const rows = (s.righe || []).map((r) => `${r.asin};"${r.prodotto_nome}";${r.quantita}`).join("\n");
    const csv = `Progressivo: ${s.progressivo}\nPaese: ${s.paese}\nData Operazione: ${s.data_operazione}\nEvento: ${s.tipo_evento}\nStato Spedizione: ${s.stato}\nOperatore: ${s.operatore}\nNote: ${s.note}\n\n${header}${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storico_${s.progressivo}.csv`;
    a.click();
  };

  const loadStorico = (paese) => {
    fetch(`/api/v2/spedizioni/storico${paese ? `?paese=${paese}` : ""}`)
      .then((res) => res.json())
      .then((data) =>
        setStorico(data.map((s) => ({ ...s, righe: s.righe || JSON.parse(s.righe_json || "[]"), open: false })))
      );
  };

  useEffect(() => { loadStorico(""); }, []);

  const toggle = (spedizioneId) => {
    setStorico((prev) => prev.map((s) => s.spedizione_id === spedizioneId ? { ...s, open: !s.open } : s));
  };

  const handleFiltro = (paese) => {
    setFiltroState(paese);
    loadStorico(paese);
  };

  const nCompletate = storico.filter((s) => { const st = (s.stato || "").toLowerCase(); return st.includes("confermata") || st.includes("spedita") || st.includes("completata"); }).length;
  const nInCorso = storico.filter((s) => { const st = (s.stato || "").toLowerCase(); return st.includes("preparazione") || st.includes("bozza") || st.includes("in corso"); }).length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(isMagazzino ? "/magazzino/spedizioni" : "/spedizioni")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <Truck className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Storico Spedizioni</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Cronologia operazioni</span>
            </div>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Magazzino</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Storico Spedizioni <span className="text-slate-500">— cronologia completa.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Cronologia completa delle operazioni di spedizione. Filtra per paese per visualizzare spedizioni specifiche.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Statistiche */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile icon={History} label="Totali" value={storico.length} accent="blue" />
          <StatTile icon={CheckCircle} label="Completate" value={nCompletate} accent="emerald" />
          <StatTile icon={Clock} label="In corso" value={nInCorso} accent="amber" />
        </div>

        {/* Filtro paese */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-md border bg-blue-500/10 border-blue-500/30 flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Filtro</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Filtra per paese</h2>
              </div>
            </div>

            <select value={filtroState} onChange={(e) => handleFiltro(e.target.value)} className={inputCls + " cursor-pointer"}>
              <option value="">Tutti i Paesi</option>
              <option value="IT">Italia</option>
              <option value="FR">Francia</option>
              <option value="ES">Spagna</option>
              <option value="DE">Germania</option>
              <option value="BE">Belgio</option>
              <option value="NL">Olanda</option>
              <option value="SE">Svezia</option>
              <option value="PL">Polonia</option>
              <option value="IE">Irlanda</option>
            </select>

            {filtroState && (
              <div className="mt-3 flex items-center gap-2">
                <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-md text-[11px] font-medium flex items-center gap-1.5">
                  {filtroState}
                  <button onClick={() => handleFiltro("")} className="hover:text-blue-200"><X className="w-3 h-3" /></button>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lista spedizioni */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-blue-500/10 border-blue-500/30 flex items-center justify-center flex-shrink-0">
                <History className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Spedizioni</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Lista operazioni</h2>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-medium tabular-nums">{storico.length}</span>
            </div>

            {storico.length === 0 ? (
              <div className="py-12 text-center">
                <Truck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Nessuna spedizione registrata</p>
              </div>
            ) : (
              <div className="space-y-3">
                {storico.map((s) => (
                  <div key={`${s.id}-${s.tipo_evento}`} className="relative bg-slate-800/40 border border-slate-700/60 rounded-md hover:border-slate-600 transition-all">
                    {/* Header card */}
                    <div className="px-5 py-4 cursor-pointer" onClick={() => toggle(s.spedizione_id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-1.5">
                            <span className="text-lg font-semibold" title={s.paese}>{FLAGS[s.paese] || s.paese}</span>
                            <h3 className="text-sm font-semibold text-white">Spedizione #{s.progressivo}</h3>
                            <EventoBadge evento={s.tipo_evento} />
                            <StatoBadge stato={s.stato} />
                          </div>
                          <p className="text-xs text-slate-500 font-mono">{formatDate(s.data_operazione)}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); scaricaCSV(s); }}
                            type="button"
                            className="px-2.5 py-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[11px] font-medium transition-all flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> CSV
                          </button>
                          <button type="button" className="text-slate-500 hover:text-slate-200 transition-colors">
                            {s.open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dettagli espansi */}
                    {s.open && (
                      <div className="px-5 pb-5 space-y-3 border-t border-slate-700/60 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5 flex items-center gap-1"><User className="w-3 h-3" /> Operatore</p>
                            <p className="text-sm text-white font-medium">{s.operatore || "-"}</p>
                          </div>
                          <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5 flex items-center gap-1"><FileText className="w-3 h-3" /> Note</p>
                            <p className="text-sm text-white font-medium">{s.note || "-"}</p>
                          </div>
                        </div>

                        {/* Righe prodotti */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-400 mb-3 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Prodotti ({s.righe.length})
                          </p>

                          {s.righe.length === 0 ? (
                            <p className="text-sm text-slate-500">Nessun prodotto</p>
                          ) : (
                            <div className="space-y-2">
                              {s.righe.map((r, i) => (
                                <div key={i} className="flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-md px-4 py-2.5">
                                  <div className="min-w-0">
                                    <p className="text-sm text-white font-medium truncate">{r.prodotto_nome}</p>
                                    <p className="text-xs text-slate-500 font-mono">{r.asin}</p>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold tabular-nums flex-shrink-0">
                                    {r.quantita} pz
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
          <span>© {new Date().getFullYear()} Nexus · Storico Spedizioni</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default StoricoSpedizioni;
