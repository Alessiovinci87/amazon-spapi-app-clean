import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Bell,
} from "lucide-react";

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
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [expandedCards, setExpandedCards] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isMagazzino = localStorage.getItem("auth") === "magazzino";

  useEffect(() => {
    fetch("/api/v2/etichette").then((r) => r.json()).then((d) => setRows(d.data || [])).catch(() => toast.error(t("etichette.toast_error_load")));
  }, [t]);

  const toggleCardExpansion = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChange = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleRettifica = async (row) => {
    const nuovaQuantita = prompt(t("etichette.prompt_rettifica", { nome: row.nome, quantita: row.quantita }), row.quantita);
    if (nuovaQuantita === null) return;
    try {
      const res = await fetch(`/api/v2/etichette/${row.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantita: Number(nuovaQuantita) }),
      });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, quantita: Number(nuovaQuantita) } : r)));
      toast.success(t("etichette.toast_quantita_ok"));
    } catch { toast.error(t("etichette.toast_quantita_err")); }
  };

  const handleSoglia = async (row, val) => {
    const soglia = parseInt(val, 10);
    if (isNaN(soglia) || soglia < 0) return;
    try {
      await fetch(`/api/v2/etichette/${row.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soglia_minima: soglia }),
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, soglia_minima: soglia } : r)));
      toast.success(t("etichette.toast_soglia_ok", { soglia }));
    } catch { toast.error(t("etichette.toast_soglia_err")); }
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
            <button onClick={() => navigate(isMagazzino ? "/magazzino" : "/dashboard")} type="button" title={t("common.back")} className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
              <Tag className="w-[18px] h-[18px] text-cyan-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">{t("etichette.topbar_title")}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{t("etichette.topbar_eyebrow")}</span>
            </div>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("common.magazzino")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("etichette.hero_title_main")} <span className="text-slate-500">{t("etichette.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("etichette.intro")}
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Statistiche */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile icon={CheckCircle} label={t("etichette.stat_totale")} value={totalEtichette.toLocaleString()} accent="emerald" />
          <StatTile icon={TrendingUp} label={t("etichette.stat_basse")} value={etichetteBasse} accent="amber" />
          <StatTile icon={AlertCircle} label={t("etichette.stat_esaurite")} value={etichetteEsaurite} accent="rose" />
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
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">{t("etichette.search_eyebrow")}</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">{t("etichette.search_title")}</h2>
              </div>
            </div>
            <div className="relative">
              <input type="text" placeholder={t("etichette.ph_search")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
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
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">{t("etichette.inventario_eyebrow")}</div>
              <p className="text-sm text-slate-300">
                <span className="text-cyan-400 font-medium">{filteredRows.length}</span> {filteredRows.length === 1 ? t("etichette.tipologia_singolare") : t("etichette.tipologia_plurale")}
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
              <p className="text-sm text-slate-500">{t("etichette.empty_text")}</p>
              {searchTerm && <p className="text-xs text-slate-600 mt-1">{t("etichette.empty_hint")}</p>}
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
                            {row.quantita} {t("etichette.unit_pz")}
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
                        <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-400 mb-2">{t("etichette.lbl_quantita")}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={row.quantita}
                            onChange={(e) => handleChange(row.id, "quantita", e.target.value)}
                            className="flex-1 bg-slate-700/60 border border-slate-600 rounded-md px-3 py-2 text-white text-lg font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
                          />
                          <button onClick={() => handleRettifica(row)} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-[12px] font-medium transition-all">
                            <Edit3 className="w-3.5 h-3.5" /> {t("etichette.btn_rettifica")}
                          </button>
                        </div>
                      </div>

                      {/* Soglia alert */}
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-md px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-amber-400 mb-2 flex items-center gap-1">
                          <Bell className="w-3 h-3" /> {t("etichette.lbl_soglia_alert")}
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            value={row.soglia_minima || 0}
                            onChange={(e) => handleChange(row.id, "soglia_minima", e.target.value)}
                            onBlur={(e) => handleSoglia(row, e.target.value)}
                            className="w-32 bg-slate-700/60 border border-slate-600 rounded-md px-3 py-2 text-white text-sm font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                          />
                          <span className="text-xs text-slate-500">
                            {row.soglia_minima > 0
                              ? row.quantita < row.soglia_minima
                                ? t("etichette.soglia_sotto", { q: row.quantita, s: row.soglia_minima })
                                : t("etichette.soglia_sopra")
                              : t("etichette.soglia_imposta")}
                          </span>
                        </div>
                      </div>

                      {/* Alert stock */}
                      {row.quantita === 0 && (
                        <div className="bg-rose-500/5 border border-rose-500/30 rounded-md p-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <p className="text-rose-300 text-xs font-medium">{t("etichette.alert_esaurite")}</p>
                        </div>
                      )}
                      {typeof row.quantita === "number" && row.quantita > 0 && row.quantita < 2000 && (
                        <div className="bg-amber-500/5 border border-amber-500/30 rounded-md p-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <p className="text-amber-300 text-xs font-medium">{t("etichette.alert_basse")}</p>
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
          <span>© {new Date().getFullYear()} {t("etichette.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Etichette;
