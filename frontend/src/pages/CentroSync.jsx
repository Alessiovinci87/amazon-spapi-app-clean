import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Zap,
  Package,
  DollarSign,
  BarChart3,
  Bell,
  Settings2,
} from "lucide-react";

const CATEGORIA_ICON = {
  "Inventario Amazon": Package,
  "Prezzi e Listing": DollarSign,
  "Vendite e Analisi": BarChart3,
  "Alert e Feedback": Bell,
};

const CATEGORIA_ACCENT = {
  "Inventario Amazon": { bar: "bg-blue-400/60", icon: "bg-blue-500/10 border-blue-500/40 text-blue-400", progress: "bg-blue-500" },
  "Prezzi e Listing": { bar: "bg-violet-400/60", icon: "bg-violet-500/10 border-violet-500/40 text-violet-400", progress: "bg-violet-500" },
  "Vendite e Analisi": { bar: "bg-emerald-400/60", icon: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400", progress: "bg-emerald-500" },
  "Alert e Feedback": { bar: "bg-amber-400/60", icon: "bg-amber-500/10 border-amber-500/40 text-amber-400", progress: "bg-amber-500" },
};

// Durata stimata per sync (secondi) — per la barra di progresso
const DURATA_STIMATA = {
  "stock-fba": 400,
  "stock-ledger": 400,
  "prezzi-buybox": 500,
  "catalogo-info": 900,
  "listing-cache": 900,
  "sales-traffic": 900,
  "fba-fees": 15,
  "alert-check": 60,
  "feedback-all": 300,
  "resi-fba": 300,
};

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  return `${Math.floor(hours / 24)}gg fa`;
}

function formatElapsed(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

const CentroSync = () => {
  const navigate = useNavigate();
  const [syncs, setSyncs] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v2/sync/status");
      const json = await res.json();
      if (json.ok) setSyncs(json.syncs);
    } catch {}
    setLoading(false);
  }, []);

  // Polling: 2s se c'è almeno un sync running, altrimenti stop
  useEffect(() => {
    fetchStatus();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchStatus]);

  useEffect(() => {
    const hasRunning = syncs.some(s => s.running);
    if (hasRunning && !pollingRef.current) {
      pollingRef.current = setInterval(fetchStatus, 2000);
    } else if (!hasRunning && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [syncs, fetchStatus]);

  const triggerSync = async (id, nome) => {
    try {
      const res = await fetch(`/api/v2/sync/trigger/${id}`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        toast.success(`${nome} avviato`);
        fetchStatus(); // refresh immediato
      } else {
        toast.error(json.error || `Errore avvio ${nome}`);
      }
    } catch { toast.error(`Errore avvio ${nome}`); }
  };

  // Raggruppa per categoria
  const grouped = {};
  for (const s of syncs) {
    if (!grouped[s.categoria]) grouped[s.categoria] = [];
    grouped[s.categoria].push(s);
  }

  const runningCount = syncs.filter(s => s.running).length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Top bar */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/settings")} type="button" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
              <RefreshCw className={`w-[18px] h-[18px] text-cyan-400 ${runningCount > 0 ? "animate-spin" : ""}`} />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Centro Sincronizzazioni</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">
                {runningCount > 0 ? `${runningCount} sync in corso...` : "Gestione sync Amazon SP-API"}
              </span>
            </div>
          </div>
          {runningCount > 0 && (
            <span className="px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium tabular-nums animate-pulse">
              {runningCount} attivi
            </span>
          )}
        </div>
      </header>

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
        ) : (
          Object.entries(grouped).map(([categoria, items]) => {
            const CatIcon = CATEGORIA_ICON[categoria] || Settings2;
            const accent = CATEGORIA_ACCENT[categoria] || CATEGORIA_ACCENT["Inventario Amazon"];

            return (
              <div key={categoria} className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent.bar}`} />
                <div className="px-6 py-5 sm:px-8 sm:py-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 ${accent.icon}`}>
                      <CatIcon className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Sincronizzazione</span>
                      <h3 className="text-sm font-semibold text-white -mt-0.5">{categoria}</h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map(s => {
                      const durata = DURATA_STIMATA[s.id] || 120;
                      const progressPct = s.running ? Math.min(95, (s.elapsed_seconds / durata) * 100) : 0;

                      return (
                        <div key={s.id} className={`rounded-lg border transition-all ${s.running ? "border-cyan-500/30 bg-cyan-500/5" : "border-slate-700/50 bg-slate-800/20"}`}>
                          <div className="flex items-center gap-4 px-4 py-3">
                            {/* Status icon */}
                            <div className="flex-shrink-0">
                              {s.running ? (
                                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                              ) : s.ultimo_status === "error" ? (
                                <XCircle className="w-5 h-5 text-rose-400" />
                              ) : s.ultimo_run ? (
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Clock className="w-5 h-5 text-slate-600" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">{s.nome}</span>
                                {s.cron && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-medium text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                                    <Zap className="w-2.5 h-2.5" /> Auto
                                  </span>
                                )}
                                {s.running && (
                                  <span className="text-[10px] text-cyan-400 tabular-nums">{formatElapsed(s.elapsed_seconds)}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{s.descrizione}</p>
                              <div className="flex items-center gap-3 mt-1 text-[10px]">
                                {s.cron && <span className="text-cyan-400/70">{s.cron}</span>}
                                {s.ultimo_run && !s.running && (
                                  <span className={s.ultimo_status === "error" ? "text-rose-400/70" : "text-slate-500"}>
                                    Ultimo: {timeAgo(s.ultimo_run)} {s.run_count > 0 && `(${s.run_count}x)`}
                                  </span>
                                )}
                                {!s.ultimo_run && !s.running && <span className="text-slate-600">Mai eseguito</span>}
                              </div>
                            </div>

                            {/* Trigger button */}
                            {s.triggerabile && (
                              <button
                                onClick={() => triggerSync(s.id, s.nome)}
                                disabled={s.running}
                                type="button"
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors flex-shrink-0 ${s.running ? "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed" : "bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-400/60 text-cyan-300 hover:text-cyan-200"}`}
                              >
                                {s.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                {s.running ? "In corso" : "Avvia"}
                              </button>
                            )}
                            {!s.triggerabile && (
                              <span className="text-[10px] text-slate-600 flex-shrink-0">Solo auto</span>
                            )}
                          </div>

                          {/* Progress bar */}
                          {s.running && (
                            <div className="px-4 pb-3">
                              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${accent.progress}`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                                <span>Stima: ~{Math.ceil(durata / 60)} min</span>
                                <span className="tabular-nums">{Math.round(progressPct)}%</span>
                              </div>
                            </div>
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

      <footer className="relative border-t border-slate-800 px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
        <span>&copy; {new Date().getFullYear()} Nexus — Centro Sincronizzazioni</span>
        <span className="font-mono">v2.0</span>
      </footer>
    </div>
  );
};

export default CentroSync;
