import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LogOut,
  Star,
  Filter,
  MessageSquare,
  BarChart3,
  RefreshCw,
  Loader,
  AlertCircle,
  Check,
  X,
  TrendingUp,
  Package,
  Calendar,
  ChevronRight,
  Globe,
  FileSearch,
} from "lucide-react";
import { toast } from "sonner";

const EU_MARKETPLACES = [
  { code: "IT", label: "Italia" },
  { code: "DE", label: "Germania" },
  { code: "FR", label: "Francia" },
  { code: "ES", label: "Spagna" },
  { code: "UK", label: "UK" },
  { code: "NL", label: "Olanda" },
  { code: "BE", label: "Belgio" },
  { code: "PL", label: "Polonia" },
];

const Flag = ({ code, className = "h-4 w-auto inline-block align-middle" }) => {
  // UK flag su flagcdn è "gb"
  const c = code === "UK" ? "gb" : code.toLowerCase();
  return <img src={`https://flagcdn.com/24x18/${c}.png`} alt={code} className={className} />;
};

// Card sezione con barra accent verticale
function SectionCard({ accent = "amber", icon: Icon, eyebrow, title, action, children }) {
  const accentMap = {
    amber: "bg-amber-400/60",
    yellow: "bg-yellow-400/60",
    emerald: "bg-emerald-400/60",
    blue: "bg-blue-400/60",
    rose: "bg-rose-400/60",
    violet: "bg-violet-400/60",
  };
  const iconBg = {
    amber: "bg-amber-500/10 border-amber-500/40 text-amber-400",
    yellow: "bg-yellow-500/10 border-yellow-500/40 text-yellow-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    blue: "bg-blue-500/10 border-blue-500/40 text-blue-400",
    rose: "bg-rose-500/10 border-rose-500/40 text-rose-400",
    violet: "bg-violet-500/10 border-violet-500/40 text-violet-400",
  };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentMap[accent]}`} />
      <div className="px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 ${iconBg[accent]}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{eyebrow}</div>
              )}
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">{title}</h2>
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent = "amber", hint }) {
  const map = {
    amber: "bg-amber-500/10 border-amber-500/40 text-amber-400",
    yellow: "bg-yellow-500/10 border-yellow-500/40 text-yellow-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    blue: "bg-blue-500/10 border-blue-500/40 text-blue-400",
  };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${map[accent]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        {hint}
      </div>
      <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{label}</div>
    </div>
  );
}

// 730gg rimosso: Amazon CANCELLA i report feedback con range > 365gg.
const PERIODS = [
  { days: 30, label: "30 gg" },
  { days: 90, label: "90 gg" },
  { days: 180, label: "180 gg" },
  { days: 365, label: "1 anno" },
];

export default function Recensioni() {
  const navigate = useNavigate();
  const [marketplace, setMarketplace] = useState("IT");
  // 365gg è il massimo che Amazon accetta per questo report (730gg → CANCELLED)
  const [period, setPeriod] = useState(365);
  const [view, setView] = useState("catalog"); // "catalog" | "list"
  const [asinFilter, setAsinFilter] = useState(null);
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStars, setSelectedStars] = useState([]);
  const [diag, setDiag] = useState(null); // risultato /raw-tsv
  const [diagLoading, setDiagLoading] = useState(false);
  const [reports, setReports] = useState(null); // risultato /diagnose
  const [reportsLoading, setReportsLoading] = useState(false);

  const fetchData = useCallback(
    async (mp, stars = [], asin = null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ marketplace: mp });
        if (stars.length > 0) params.set("stelle", stars.join(","));
        if (asin) params.set("asin", asin);
        const res = await fetch(`/api/v2/feedback?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setData(json);
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchCatalog = useCallback(async (mp) => {
    setLoadingCatalog(true);
    try {
      const res = await fetch(`/api/v2/feedback/catalog?marketplace=${mp}`);
      const json = await res.json();
      if (res.ok && json.ok) setCatalog(json.items || []);
      else setCatalog([]);
    } catch {
      setCatalog([]);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchData(marketplace, selectedStars, asinFilter);
  }, [marketplace, selectedStars, asinFilter, fetchData]);

  useEffect(() => {
    fetchCatalog(marketplace);
  }, [marketplace, fetchCatalog]);

  const onSyncAll = async () => {
    setSyncingAll(true);
    const tid = toast.loading("Sincronizzazione di tutti i marketplace…", {
      description: "Può richiedere qualche minuto (un report per paese)",
    });
    try {
      const res = await fetch("/api/v2/feedback/sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: period }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const errs = json.errors?.length ? ` (${json.errors.length} errori)` : "";
      toast.success(`${json.total} feedback totali${errs}`, { id: tid });
      await Promise.all([
        fetchData(marketplace, selectedStars, asinFilter),
        fetchCatalog(marketplace),
      ]);
    } catch (err) {
      toast.error("Errore sync globale", { id: tid, description: err.message });
    } finally {
      setSyncingAll(false);
    }
  };

  const onListReports = async () => {
    setReportsLoading(true);
    setReports(null);
    const tid = toast.loading(`Elenco report Amazon ${marketplace}…`);
    try {
      const res = await fetch(`/api/v2/feedback/diagnose?marketplace=${marketplace}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setReports(json);
      toast.success(`${json.count} report trovati su Amazon (90gg)`, { id: tid });
    } catch (err) {
      toast.error("Errore elenco report", { id: tid, description: err.message });
    } finally {
      setReportsLoading(false);
    }
  };

  const onDiagnose = async () => {
    setDiagLoading(true);
    setDiag(null);
    const tid = toast.loading(`Scarico TSV diagnostico ${marketplace} (${period}gg)…`);
    try {
      const res = await fetch(`/api/v2/feedback/raw-tsv?marketplace=${marketplace}&days=${period}&preview=8000`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setDiag(json);
      toast.success(`TSV scaricato · ${json.lineCount} righe, ${json.byteLength}B (${json.encoding})`, { id: tid });
    } catch (err) {
      toast.error("Errore diagnostica", { id: tid, description: err.message });
    } finally {
      setDiagLoading(false);
    }
  };

  const onSync = async () => {
    setSyncing(true);
    const tid = toast.loading(`Sincronizzazione feedback ${marketplace} (${period}gg)…`, {
      description: "Il report SP-API può richiedere alcuni minuti",
    });
    try {
      const res = await fetch("/api/v2/feedback/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace, days: period }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success(`Sincronizzati ${json.records} feedback`, { id: tid });
      await Promise.all([
        fetchData(marketplace, selectedStars, asinFilter),
        fetchCatalog(marketplace),
      ]);
    } catch (err) {
      toast.error("Errore sincronizzazione", { id: tid, description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const toggleStar = (s) =>
    setSelectedStars((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const onPickAsin = (asin) => {
    setAsinFilter(asin);
    setView("list");
  };
  const clearAsin = () => setAsinFilter(null);

  const stats = data?.stats || { totale: 0, media: "0.00", distribuzione: [] };
  const feedback = data?.feedback || [];
  const sync = data?.sync;

  const lastSyncLabel = useMemo(() => {
    if (!sync?.last_sync) return null;
    try {
      return new Date(sync.last_sync).toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return sync.last_sync;
    }
  }, [sync]);

  const getStarTone = (stelle) => {
    if (stelle === 3) return { text: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/40", bar: "bg-amber-400/60" };
    if (stelle === 2) return { text: "text-orange-300", bg: "bg-orange-500/10 border-orange-500/40", bar: "bg-orange-400/60" };
    return { text: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/40", bar: "bg-rose-400/60" };
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid sottile */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/europe")}
              type="button"
              title="Indietro"
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <Star className="w-[18px] h-[18px] text-amber-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Feedback negativi</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Nexus · Solo 1–3★ (limite API)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Flag code={marketplace} className="h-3 w-auto" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-amber-400 font-medium">{marketplace}</span>
            </div>
            <button
              onClick={() => navigate("/europe")}
              type="button"
              title="Esci"
              className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* === Hero compatto === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
                Seller feedback · SP-API
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
                Feedback 1–3★ <span className="text-slate-500">— per marketplace.</span>
              </h1>
              <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
                Feedback negativi e neutri lasciati dai compratori al tuo account venditore.
                I <span className="text-slate-300">4–5★ non sono esposti da Amazon via API</span>:
                quello che vedi qui è tutto il disponibile.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] uppercase tracking-[0.12em] text-emerald-400 font-medium">
                  Alert automatico attivo · ogni 4h
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="inline-flex items-center gap-1 p-0.5 rounded-md bg-slate-900/60 border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
                {PERIODS.map((p) => (
                  <button
                    key={p.days}
                    onClick={() => setPeriod(p.days)}
                    type="button"
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      period === p.days
                        ? "bg-amber-500/20 text-amber-200"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onSync}
                  disabled={syncing || syncingAll}
                  type="button"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {syncing ? "Sync…" : `Sync ${marketplace}`}
                </button>
                <button
                  onClick={onSyncAll}
                  disabled={syncing || syncingAll}
                  type="button"
                  title="Sincronizza tutti i marketplace EU"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 hover:border-violet-400/60 text-violet-300 hover:text-violet-200 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncingAll ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  {syncingAll ? "Sync tutti…" : "Sync tutti EU"}
                </button>
                <button
                  onClick={onDiagnose}
                  disabled={syncing || syncingAll || diagLoading || reportsLoading}
                  type="button"
                  title="Scarica il TSV raw del report per ispezionare il contenuto grezzo"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {diagLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <FileSearch className="w-3.5 h-3.5" />}
                  {diagLoading ? "Diagnostica…" : "Diagnostica TSV"}
                </button>
                <button
                  onClick={onListReports}
                  disabled={syncing || syncingAll || diagLoading || reportsLoading}
                  type="button"
                  title="Elenca i report feedback esistenti su Amazon (90gg)"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reportsLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                  {reportsLoading ? "Report…" : "Report Amazon"}
                </button>
              </div>
              {lastSyncLabel && (
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  Ultimo sync: <span className="font-mono text-slate-500">{lastSyncLabel}</span>
                  {sync?.status === "error" && <span className="ml-2 text-rose-400">errore</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* === Tab paesi === */}
      <div className="relative border-b border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="flex gap-1 overflow-x-auto -mb-px scrollbar-none py-2">
            {EU_MARKETPLACES.map((mp) => {
              const active = marketplace === mp.code;
              return (
                <button
                  key={mp.code}
                  onClick={() => setMarketplace(mp.code)}
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap border transition-all ${
                    active
                      ? "bg-amber-500/15 border-amber-500/50 text-amber-200"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <Flag code={mp.code} className="h-3 w-auto" />
                  {mp.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* === Sub-tab Vista === */}
      <div className="relative px-6 sm:px-10 lg:px-16 pt-6">
        <div className="inline-flex items-center gap-1 p-0.5 rounded-md bg-slate-900/60 border border-slate-800">
          <button
            onClick={() => { setView("catalog"); clearAsin(); }}
            type="button"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
              view === "catalog"
                ? "bg-amber-500/20 text-amber-200"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Catalogo
            <span className="text-[10px] font-mono opacity-60">({catalog.length})</span>
          </button>
          <button
            onClick={() => setView("list")}
            type="button"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
              view === "list"
                ? "bg-amber-500/20 text-amber-200"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Cronologico
            <span className="text-[10px] font-mono opacity-60">({stats.totale})</span>
          </button>
        </div>

        {asinFilter && (
          <button
            onClick={clearAsin}
            type="button"
            className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-[11px] font-mono transition-colors"
          >
            <X className="w-3 h-3" />
            ASIN: {asinFilter}
          </button>
        )}
      </div>

      {/* === Banner informativo limite API Amazon === */}
      <div className="relative px-6 sm:px-10 lg:px-16 pt-3 space-y-2">
        <div className="relative bg-amber-500/5 border border-amber-500/20 rounded-md overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400/60" />
          <div className="pl-4 pr-4 py-2.5 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              <span className="font-medium text-amber-300">Cosa vedi qui:</span>{" "}
              <strong>Seller Feedback 1–3★</strong> — feedback sul <em>venditore</em> (spedizione, servizio), dal report
              {" "}<code className="font-mono text-amber-300/80 bg-amber-500/10 px-1 rounded">GET_SELLER_FEEDBACK_DATA</code>.
              {" "}Seller Central: <span className="text-amber-300">Performance → Feedback</span>.
              I 4–5★ non sono esposti via API.
            </p>
          </div>
        </div>
        <div className="relative bg-rose-500/5 border border-rose-500/20 rounded-md overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-rose-400/60" />
          <div className="pl-4 pr-4 py-2.5 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-rose-200/80 leading-relaxed">
              <span className="font-medium text-rose-300">Cosa NON vedi qui:</span>{" "}
              <strong>Product Reviews</strong> (recensioni del <em>prodotto</em>, con titolo/testo/stelle).
              {" "}Seller Central: <span className="text-rose-300">Advertising / Brand → Customer Reviews</span>.
              {" "}<strong>Nessuna API SP-API le espone</strong> — se in Seller Central vedi "20 recensioni 1–3★" sul prodotto, sono queste e non sono scaricabili.
            </p>
          </div>
        </div>
      </div>

      {/* === Pannello report Amazon esistenti === */}
      {reports && (
        <div className="relative px-6 sm:px-10 lg:px-16 pt-4">
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <BarChart3 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-medium">
                    Report feedback su Amazon · {reports.marketplace} · ultimi 90gg
                  </span>
                  <span className="text-[11px] font-mono text-slate-600">{reports.count}</span>
                </div>
                <button onClick={() => setReports(null)} type="button" className="text-slate-500 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {(reports.reports?.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-500">Nessun report su Amazon negli ultimi 90gg.</p>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-auto">
                  {reports.reports.map((r) => {
                    const statusColor =
                      r.status === "DONE" ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/5"
                      : r.status === "CANCELLED" ? "text-amber-300 border-amber-500/30 bg-amber-500/5"
                      : r.status === "FATAL" ? "text-rose-300 border-rose-500/30 bg-rose-500/5"
                      : "text-slate-400 border-slate-700 bg-slate-800/40";
                    return (
                      <div key={r.reportId} className={`px-3 py-2 rounded border text-[11px] font-mono flex flex-wrap items-center gap-x-3 gap-y-1 ${statusColor}`}>
                        <span className="font-semibold">{r.status}</span>
                        <span className="text-slate-500">·</span>
                        <span className="opacity-80">{r.reportId}</span>
                        <span className="text-slate-500">·</span>
                        <span>creato {new Date(r.createdTime).toLocaleString("it-IT")}</span>
                        {r.hasDocument && <span className="text-emerald-400">· doc ✓</span>}
                        {r.dataStartTime && (
                          <span className="text-slate-500">
                            · range {r.dataStartTime.slice(0, 10)} → {r.dataEndTime?.slice(0, 10) || "?"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === Pannello diagnostica TSV === */}
      {diag && (
        <div className="relative px-6 sm:px-10 lg:px-16 pt-4">
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSearch className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-medium">Diagnostica TSV · {diag.marketplace}</span>
                </div>
                <button
                  onClick={() => setDiag(null)}
                  type="button"
                  className="text-slate-500 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {diag.empty ? (
                <p className="text-sm text-amber-300">
                  Report <span className="font-mono">CANCELLED</span>: Amazon non ha dati nel periodo {period}gg.
                  {diag.note && <span className="ml-1 text-slate-500">{diag.note}</span>}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400 mb-3">
                    <div><span className="text-slate-600">bytes:</span> {diag.byteLength}</div>
                    <div><span className="text-slate-600">encoding:</span> {diag.encoding}</div>
                    <div><span className="text-slate-600">gzip:</span> {diag.compressionAlgorithm ?? "no"}</div>
                    <div><span className="text-slate-600">righe:</span> {diag.lineCount}</div>
                    <div className="col-span-2 sm:col-span-4">
                      <span className="text-slate-600">RDT usato:</span>{" "}
                      <span className={diag.usedRdt ? "text-emerald-400" : "text-amber-400"}>
                        {diag.usedRdt ? "sì (token ristretto)" : "no (fallback LWA)"}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <span className="text-slate-600">first bytes (hex):</span> {diag.firstBytes}
                    </div>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-950/60 border border-slate-800 rounded p-3 overflow-auto max-h-[400px] whitespace-pre-wrap break-words">
{diag.tsv}{diag.truncated ? `\n\n… [troncato, ${diag.tsvLength} caratteri totali]` : ""}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === Contenuto === */}
      <div className="relative flex-1 px-6 sm:px-10 lg:px-16 py-6 space-y-6">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader className="w-6 h-6 text-amber-400 animate-spin" />
            <p className="text-slate-500 text-sm">Caricamento feedback…</p>
          </div>
        ) : error ? (
          <div className="relative bg-slate-900/60 border border-rose-500/30 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400/60" />
            <div className="px-6 py-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-white">Errore nel caricamento</div>
                <div className="text-[13px] text-slate-400 mt-1">{error}</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* === Statistiche === */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatTile
                icon={MessageSquare}
                label="Feedback 1–3★ scaricati"
                value={stats.totale}
                accent="amber"
                hint={
                  stats.totale > 0 && (
                    <TrendingUp className="w-4 h-4 text-emerald-400/70" />
                  )
                }
              />
              <StatTile
                icon={Star}
                label="Media sui negativi"
                value={
                  <span className="inline-flex items-baseline gap-1.5">
                    {stats.media}
                    <span className="text-base text-yellow-400">★</span>
                  </span>
                }
                accent="yellow"
              />
              <StatTile
                icon={BarChart3}
                label={selectedStars.length > 0 ? "Filtrati visibili" : "Visualizzati"}
                value={feedback.length}
                accent="blue"
              />
            </div>

            {view === "catalog" ? (
              <SectionCard
                accent="amber"
                icon={Package}
                eyebrow={`${catalog.length} prodotti`}
                title="Catalogo — feedback negativi per ASIN"
              >
                {loadingCatalog ? (
                  <div className="flex items-center justify-center py-10 gap-2">
                    <Loader className="w-4 h-4 text-amber-400 animate-spin" />
                    <span className="text-xs text-slate-500">Caricamento catalogo…</span>
                  </div>
                ) : catalog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-12 h-12 rounded-md bg-slate-800/60 border border-slate-800 flex items-center justify-center">
                      <Package className="w-5 h-5 text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-500">
                      Nessun prodotto in catalogo per {marketplace}.
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Sincronizza il catalogo dalla pagina Europa o avvia un sync feedback.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {catalog.map((p) => {
                      const tone = getStarTone(Math.round(parseFloat(p.media)) || 5);
                      const hasFeedback = p.totale > 0;
                      return (
                        <button
                          key={p.asin}
                          onClick={() => onPickAsin(p.asin)}
                          type="button"
                          className="group relative text-left bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-md overflow-hidden transition-all"
                        >
                          {hasFeedback && (
                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${tone.bar}`} />
                          )}
                          <div className="px-4 py-3 flex items-center gap-3">
                            <div className="w-14 h-14 rounded-md bg-slate-800/80 border border-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.asin} className="w-full h-full object-contain" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-700" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-mono text-emerald-400/80 truncate">{p.asin}</div>
                              <div className="text-[12px] font-medium text-slate-200 line-clamp-2 leading-tight mt-0.5">
                                {p.titolo || <span className="text-slate-600 italic">Senza titolo</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                {hasFeedback ? (
                                  <>
                                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${tone.text}`}>
                                      {p.media}
                                      <Star className="w-3 h-3 fill-current" />
                                    </span>
                                    <span className="text-[10px] text-slate-500 tabular-nums">
                                      {p.totale} feedback
                                    </span>
                                    {(p.distribuzione[1] + p.distribuzione[2]) > 0 && (
                                      <span className="text-[10px] text-rose-400 tabular-nums">
                                        · {p.distribuzione[1] + p.distribuzione[2]} ≤2★
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-600">Nessun feedback</span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            ) : (
              <>
            {/* === Distribuzione === */}
            <SectionCard
              accent="violet"
              icon={BarChart3}
              eyebrow="Statistiche"
              title="Distribuzione negativi (1–3★)"
            >
              {stats.totale === 0 ? (
                <p className="text-sm text-slate-500">
                  Nessun feedback disponibile. Premi <span className="text-amber-300">Sincronizza ora</span> per scaricarli da Amazon.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {stats.distribuzione
                    .filter(({ stelle }) => stelle <= 3)
                    .map(({ stelle, count, percentuale }) => {
                    const tone = getStarTone(stelle);
                    return (
                      <div key={stelle} className="flex items-center gap-4">
                        <div className="flex items-center gap-1 w-14 flex-shrink-0">
                          <span className="text-sm font-medium text-slate-300 tabular-nums">{stelle}</span>
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        </div>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${tone.bar}`}
                            style={{ width: `${percentuale}%` }}
                          />
                        </div>
                        <div className="w-24 text-right text-xs">
                          <span className="font-semibold text-slate-200 tabular-nums">{count}</span>
                          <span className="text-slate-600 ml-1.5 tabular-nums">{percentuale}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* === Filtri === */}
            <SectionCard
              accent="emerald"
              icon={Filter}
              eyebrow="Filtri"
              title="Filtra per valutazione"
              action={
                selectedStars.length > 0 && (
                  <button
                    onClick={() => setSelectedStars([])}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Cancella
                  </button>
                )
              }
            >
              <div className="flex flex-wrap gap-2">
                {[3, 2, 1].map((stella) => {
                  const isSelected = selectedStars.includes(stella);
                  const count = stats.distribuzione.find((d) => d.stelle === stella)?.count ?? 0;
                  const tone = getStarTone(stella);
                  return (
                    <button
                      key={stella}
                      onClick={() => toggleStar(stella)}
                      type="button"
                      aria-pressed={isSelected}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
                        isSelected
                          ? `${tone.bg} ${tone.text}`
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span className="tabular-nums">{stella}</span>
                      <Star className={`w-3.5 h-3.5 ${isSelected ? "fill-current" : "text-yellow-400 fill-yellow-400"}`} />
                      <span className="text-[10px] font-mono opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            {/* === Lista feedback === */}
            <SectionCard
              accent="amber"
              icon={MessageSquare}
              eyebrow={`${feedback.length} risultati`}
              title="Feedback ricevuti"
            >
              {feedback.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-12 h-12 rounded-md bg-slate-800/60 border border-slate-800 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500">
                    {stats.totale === 0
                      ? "Nessun feedback in cache. Sincronizza per scaricarli."
                      : selectedStars.length > 0
                      ? "Nessun feedback corrisponde ai filtri selezionati"
                      : "Nessun feedback disponibile"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {feedback.map((r) => {
                    const tone = getStarTone(r.rating);
                    return (
                      <article
                        key={r.id}
                        className="relative bg-slate-900/60 border border-slate-800 rounded-md overflow-hidden hover:border-slate-700 transition-colors"
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${tone.bar}`} />
                        <div className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${tone.bg} ${tone.text}`}>
                              <span className="tabular-nums">{r.rating}</span>
                              <Star className="w-3 h-3 fill-current" />
                            </div>
                            <span className="text-[10px] font-mono text-slate-600 tabular-nums">{r.date}</span>
                          </div>

                          {r.comments && (
                            <p className="text-[13px] text-slate-300 leading-relaxed line-clamp-4 mb-3">
                              {r.comments}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-slate-800">
                            {r.asin && (
                              <span className="text-[10px] font-mono text-emerald-400/80">{r.asin}</span>
                            )}
                            {r.order_id && (
                              <span className="text-[10px] font-mono text-slate-600">
                                #{r.order_id.slice(-8)}
                              </span>
                            )}
                            {r.response && (
                              <span className="text-[10px] uppercase tracking-wider text-blue-400/80">
                                Risposto
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </SectionCard>
              </>
            )}
          </>
        )}
      </div>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Seller Feedback</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
}
