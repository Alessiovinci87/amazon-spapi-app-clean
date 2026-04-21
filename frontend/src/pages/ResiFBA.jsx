import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  PackageX,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  BarChart3,
  Package,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

const DISPOSITION_COLOR = {
  SELLABLE: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  DAMAGED: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  CUSTOMER_DAMAGED: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  CARRIER_DAMAGED: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  DEFECTIVE: "text-red-400 bg-red-500/10 border-red-500/30",
};

function DispositionBadge({ value }) {
  const cls = DISPOSITION_COLOR[value] || "text-slate-400 bg-slate-500/10 border-slate-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {(value || "N/D").replace(/_/g, " ")}
    </span>
  );
}

const ResiFBA = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({});
  const [reasons, setReasons] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [filterReason, setFilterReason] = useState(() => searchParams.get("reason") || "");
  const [tab, setTab] = useState(() => searchParams.get("tab") || "lista");

  useEffect(() => {
    const p = new URLSearchParams();
    if (tab && tab !== "lista") p.set("tab", tab);
    if (search) p.set("q", search);
    if (filterReason) p.set("reason", filterReason);
    setSearchParams(p, { replace: true });
  }, [tab, search, filterReason]);

  const fetchData = useCallback(async () => {
    try {
      const [resReturns, resReasons, resTop] = await Promise.all([
        fetch(`/api/v2/returns?limit=500`),
        fetch(`/api/v2/returns/reasons`),
        fetch(`/api/v2/returns/top-products?limit=15`),
      ]);
      if (resReturns.ok) {
        const data = await resReturns.json();
        setReturns(data.rows || []);
        setStats(data.stats || {});
      }
      if (resReasons.ok) setReasons(await resReasons.json());
      if (resTop.ok) setTopProducts(await resTop.json());
    } catch {
      toast.error("Errore nel caricamento resi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncReturns = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/v2/returns/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sync");
      toast.success(`Importati ${data.saved || 0} resi da Amazon`);
      await fetchData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = returns.filter((r) => {
    if (filterReason && r.reason !== filterReason) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !r.asin?.toLowerCase().includes(s) &&
        !r.product_name?.toLowerCase().includes(s) &&
        !r.order_id?.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const uniqueReasons = [...new Set(returns.map((r) => r.reason).filter(Boolean))].sort();

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Header */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")} type="button" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-rose-500/10 border border-rose-500/40 flex items-center justify-center flex-shrink-0">
              <PackageX className="w-[18px] h-[18px] text-rose-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Resi FBA</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Amazon SP-API</span>
            </div>
          </div>
          <button onClick={syncReturns} disabled={syncing} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-[12px] font-medium transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{syncing ? "Importazione..." : "Importa da Amazon"}</span>
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Amazon FBA</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Resi FBA <span className="text-slate-500">— analisi e tracciamento.</span>
          </h1>
        </div>
      </section>

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: PackageX, label: "Resi totali", value: stats.totale || 0, accent: "rose" },
            { icon: Package, label: "Pezzi resi", value: stats.pezzi_totali || 0, accent: "amber" },
            { icon: BarChart3, label: "ASIN coinvolti", value: stats.asin_unici || 0, accent: "blue" },
            { icon: AlertTriangle, label: "Motivi diversi", value: stats.motivi_unici || 0, accent: "orange" },
          ].map((s) => (
            <div key={s.label} className="relative rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-4 flex flex-col items-center text-center">
              <s.icon className={`w-5 h-5 mb-2 text-${s.accent}-400`} />
              <span className={`text-2xl font-bold tabular-nums text-${s.accent}-400`}>{s.value}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mt-1">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-md p-0.5 w-fit">
          {[
            { key: "lista", label: "Lista resi" },
            { key: "motivi", label: "Per motivo" },
            { key: "prodotti", label: "Per prodotto" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} type="button" className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${tab === t.key ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Lista */}
        {tab === "lista" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Cerca ASIN, nome, ordine..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-md bg-slate-900/60 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500/60 focus:border-rose-500/60 transition-colors" />
              </div>
              <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)} className="px-3 py-2.5 rounded-md bg-slate-900/60 border border-slate-800 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500/60">
                <option value="">Tutti i motivi</option>
                {uniqueReasons.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {filterReason && (
                <button onClick={() => setFilterReason("")} type="button" className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white transition-colors">
                  <Filter className="w-3 h-3" /> Rimuovi filtro
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-16"><Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-2" /><span className="text-sm text-slate-500">Caricamento...</span></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <PackageX className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500">{returns.length === 0 ? "Nessun reso importato. Clicca \"Importa da Amazon\" per iniziare." : "Nessun reso trovato con i filtri attuali."}</p>
              </div>
            ) : (
              <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400/60" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                        <th className="px-4 py-3 text-left">Data</th>
                        <th className="px-4 py-3 text-left">ASIN</th>
                        <th className="px-4 py-3 text-left">Prodotto</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-left">Motivo</th>
                        <th className="px-4 py-3 text-left">Disposizione</th>
                        <th className="px-4 py-3 text-left">Ordine</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filtered.slice(0, 200).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDate(r.return_date)}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{r.asin}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 max-w-[250px] truncate">{r.product_name || "—"}</td>
                          <td className="px-4 py-3 text-center text-white font-semibold tabular-nums">{r.quantity}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">{r.reason || "—"}</td>
                          <td className="px-4 py-3"><DispositionBadge value={r.disposition} /></td>
                          <td className="px-4 py-3 text-xs text-slate-600 font-mono">{r.order_id || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length > 200 && (
                  <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-800">
                    Mostrati 200 di {filtered.length} risultati
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Tab: Per motivo */}
        {tab === "motivi" && (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />
            <div className="px-5 py-4">
              <h2 className="text-sm font-semibold text-white mb-4">Motivi di reso</h2>
              {reasons.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Nessun dato</p>
              ) : (
                <div className="space-y-2">
                  {reasons.map((r, i) => {
                    const maxTotale = reasons[0]?.totale || 1;
                    const pct = Math.round((r.totale / maxTotale) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-300 truncate">{r.reason || "N/D"}</span>
                            <span className="text-xs text-slate-500 tabular-nums ml-2">{r.totale} pz ({r.occorrenze}x)</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Per prodotto */}
        {tab === "prodotti" && (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
            <div className="px-5 py-4">
              <h2 className="text-sm font-semibold text-white mb-4">Prodotti piu resi</h2>
              {topProducts.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Nessun dato</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p, i) => {
                    const maxTotale = topProducts[0]?.totale || 1;
                    const pct = Math.round((p.totale / maxTotale) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-600 font-mono w-5 text-right tabular-nums">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-xs text-emerald-400">{p.asin}</span>
                              <span className="text-xs text-slate-400 truncate">{p.product_name || ""}</span>
                            </div>
                            <span className="text-xs text-slate-500 tabular-nums ml-2">{p.totale} pz</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>&copy; {new Date().getFullYear()} Nexus &middot; Resi FBA</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default ResiFBA;
