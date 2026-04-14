import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  RefreshCw,
  Package,
  Sparkles,
  Puzzle,
  TrendingDown,
  AlertTriangle,
  Boxes,
  Filter,
  Search,
  Clock,
  CalendarX2,
  Box,
  Tag,
} from "lucide-react";

/* ── Configurazione categorie ──────────────────────────────── */
const CATEGORY_KEYS = [
  { key: "prodotti",   icon: Boxes,        color: "blue" },
  { key: "accessori",  icon: Package,      color: "amber" },
  { key: "sfuso",      icon: AlertTriangle, color: "orange" },
  { key: "onestep",    icon: Sparkles,     color: "pink" },
  { key: "topcoat",    icon: Sparkles,     color: "cyan" },
  { key: "modulo",     icon: Puzzle,       color: "purple" },
  { key: "scatolette", icon: Box,          color: "teal" },
  { key: "etichette",  icon: Tag,          color: "indigo" },
  { key: "lotti",      icon: CalendarX2,   color: "red" },
  { key: "europa",     icon: TrendingDown, color: "rose" },
];

const COLOR_MAP = {
  blue:   { badge: "bg-blue-500/10 border-blue-500/30 text-blue-400",   accent: "bg-blue-400/60",   stat: "text-blue-400" },
  amber:  { badge: "bg-amber-500/10 border-amber-500/30 text-amber-400", accent: "bg-amber-400/60", stat: "text-amber-400" },
  orange: { badge: "bg-orange-500/10 border-orange-500/30 text-orange-400", accent: "bg-orange-400/60", stat: "text-orange-400" },
  pink:   { badge: "bg-pink-500/10 border-pink-500/30 text-pink-400",   accent: "bg-pink-400/60",   stat: "text-pink-400" },
  cyan:   { badge: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",   accent: "bg-cyan-400/60",   stat: "text-cyan-400" },
  purple: { badge: "bg-purple-500/10 border-purple-500/30 text-purple-400", accent: "bg-purple-400/60", stat: "text-purple-400" },
  teal:   { badge: "bg-teal-500/10 border-teal-500/30 text-teal-400",   accent: "bg-teal-400/60",   stat: "text-teal-400" },
  indigo: { badge: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400", accent: "bg-indigo-400/60", stat: "text-indigo-400" },
  red:    { badge: "bg-red-500/10 border-red-500/30 text-red-400",     accent: "bg-red-400/60",     stat: "text-red-400" },
  rose:   { badge: "bg-rose-500/10 border-rose-500/30 text-rose-400",   accent: "bg-rose-400/60",   stat: "text-rose-400" },
};

function classifySource(source, tipo) {
  if (!source) {
    if (tipo === "BUYBOX_LOST" || tipo === "LISTING_CHANGED") return "europa";
    if (tipo === "STOCK_LOW") return "europa";
    return "europa";
  }
  if (source === "prodotti") return "prodotti";
  if (source === "accessori") return "accessori";
  if (source === "sfuso" || source === "sfuso_copertura") return "sfuso";
  if (source === "lotto_scadenza") return "lotti";
  if (source === "onestep") return "onestep";
  if (source === "topcoat") return "topcoat";
  if (source === "scatolette") return "scatolette";
  if (source === "etichette") return "etichette";
  if (source.startsWith("modulo:")) return "modulo";
  return "europa";
}

function formatTs(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TIPO_ICON = {
  BUYBOX_LOST: TrendingDown,
  LISTING_CHANGED: AlertTriangle,
  STOCK_LOW: Package,
  SFUSO_INSUFFICIENTE: AlertTriangle,
  LOTTO_IN_SCADENZA: Clock,
  LOTTO_SCADUTO: CalendarX2,
};

/* ── Componente principale ──────────────────────────────────── */
const CentroAlert = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const CATEGORIES = CATEGORY_KEYS.map(c => ({ ...c, label: t(`centroAlert.cat_${c.key}`) }));
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rigenerando, setRigenerando] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [filterStato, setFilterStato] = useState("non_letti");
  const [search, setSearch] = useState("");

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (filterStato === "non_letti") params.set("letto", "0");
      if (filterStato === "letti") params.set("letto", "1");
      const res = await fetch(`/api/v2/europa/alert-events?${params}`);
      if (!res.ok) throw new Error("Errore fetch");
      const json = await res.json();
      setAlerts(json.events ?? []);
    } catch {
      toast.error(t("centroAlert.toast_error_load"));
    } finally {
      setLoading(false);
    }
  }, [filterStato, t]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const segnaLetto = async (id) => {
    await fetch(`/api/v2/europa/alert-events/${id}/letto`, { method: "PATCH" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const segnaTuttiLetti = async () => {
    await fetch("/api/v2/europa/alert-events/leggi-tutti", { method: "PATCH" });
    setAlerts([]);
    toast.success(t("centroAlert.toast_tutti_letti"));
  };

  const rigeneraAlert = async () => {
    setRigenerando(true);
    try {
      const res = await fetch("/api/v2/europa/alert-events/rigenera-stock", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore");
      toast.success(t("centroAlert.toast_scansione", { tot: json.totaleScansionati, nuovi: json.alertAperti?.delta ?? 0 }));
      await fetchAlerts();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRigenerando(false);
    }
  };

  // Filtra
  const filtered = alerts.filter((a) => {
    const cat = classifySource(a.source, a.tipo);
    if (filterCat !== "all" && cat !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!a.asin?.toLowerCase().includes(s) && !a.messaggio?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Raggruppa per categoria
  const grouped = {};
  for (const cat of CATEGORIES) grouped[cat.key] = [];
  for (const a of filtered) {
    const cat = classifySource(a.source, a.tipo);
    if (grouped[cat]) grouped[cat].push(a);
  }

  // Conteggi per stat
  const counts = {};
  for (const a of alerts) {
    const cat = classifySource(a.source, a.tipo);
    counts[cat] = (counts[cat] || 0) + 1;
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")} type="button" title={t("common.back")} className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <Bell className="w-[18px] h-[18px] text-amber-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">{t("centroAlert.title")}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{t("centroAlert.topbar_eyebrow")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button onClick={rigeneraAlert} disabled={rigenerando} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-[12px] font-medium transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${rigenerando ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{t("centroAlert.btn_rigenera")}</span>
            </button>
            {filterStato === "non_letti" && alerts.length > 0 && (
              <button onClick={segnaTuttiLetti} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-[12px] font-medium transition-all">
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("centroAlert.btn_tutti_letti")}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("centroAlert.page_eyebrow")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("centroAlert.hero_title_main")} <span className="text-slate-500">{t("centroAlert.hero_title_suffix")}</span>
          </h1>
        </div>
      </section>

      {/* === Content === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {CATEGORIES.map((cat) => {
            const c = COLOR_MAP[cat.color];
            const Icon = cat.icon;
            const n = counts[cat.key] || 0;
            const isActive = filterCat === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setFilterCat(isActive ? "all" : cat.key)}
                type="button"
                className={`relative rounded-lg border px-4 py-4 flex flex-col items-center text-center transition-all ${
                  isActive
                    ? `${c.badge} ring-1 ring-current`
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${n > 0 ? c.stat : "text-slate-600"}`} />
                <span className={`text-2xl font-bold tabular-nums ${n > 0 ? c.stat : "text-slate-600"}`}>{n}</span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mt-1 leading-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filtri */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder={t("centroAlert.search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-md bg-slate-900/60 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-md p-0.5">
            {[
              { key: "non_letti", label: t("centroAlert.filter_non_letti") },
              { key: "letti", label: t("centroAlert.filter_letti") },
              { key: "tutti", label: t("centroAlert.filter_tutti") },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setFilterStato(s.key)}
                type="button"
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  filterStato === s.key
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {filterCat !== "all" && (
            <button onClick={() => setFilterCat("all")} type="button" className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white transition-colors">
              <Filter className="w-3 h-3" />
              {t("centroAlert.btn_remove_filter")}
            </button>
          )}
        </div>

        {/* Lista raggruppata */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">{t("centroAlert.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">{t("centroAlert.empty_text")}</p>
          </div>
        ) : (
          CATEGORIES.filter((cat) => filterCat === "all" || filterCat === cat.key)
            .filter((cat) => grouped[cat.key].length > 0)
            .map((cat) => {
              const c = COLOR_MAP[cat.color];
              const Icon = cat.icon;
              const items = grouped[cat.key];
              return (
                <div key={cat.key} className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.accent}`} />
                  <div className="px-5 sm:px-6 py-4">
                    {/* Category header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-md border ${c.badge} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">{cat.label}</h2>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{items.length}</span>
                      </div>
                    </div>

                    {/* Alert list */}
                    <div className="space-y-1">
                      {items.map((alert) => {
                        const tipoCfg = TIPO_ICON[alert.tipo];
                        const TipoIcon = tipoCfg || AlertTriangle;
                        return (
                          <div key={alert.id} className="flex items-start gap-3 px-3 py-3 rounded-md hover:bg-slate-800/30 transition-colors group">
                            <TipoIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.stat}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{alert.asin}</span>
                                {alert.nome && (
                                  <span className="text-xs text-slate-300 font-medium truncate max-w-[200px]">{alert.nome}</span>
                                )}
                                {alert.source?.startsWith("modulo:") && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400">
                                    {alert.source.replace("modulo:", "")}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.messaggio}</p>
                              <p className="text-[11px] text-slate-600 mt-1">{formatTs(alert.created_at)}</p>
                            </div>
                            {!alert.letto && (
                              <button
                                onClick={() => segnaLetto(alert.id)}
                                className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-emerald-400 transition-all mt-0.5"
                                title={t("centroAlert.title_segna_letto")}
                              >
                                <CheckCheck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>&copy; {new Date().getFullYear()} Nexus &middot; {t("centroAlert.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default CentroAlert;
