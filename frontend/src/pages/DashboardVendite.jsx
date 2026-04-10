import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShoppingCart,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Globe,
  Package,
  DollarSign,
  Eye,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function fmtEuro(n) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);
}

function fmtNum(n) {
  return new Intl.NumberFormat("it-IT").format(n || 0);
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`;
}

const COUNTRY_FLAG = {
  IT: "🇮🇹", FR: "🇫🇷", DE: "🇩🇪", ES: "🇪🇸",
  UK: "🇬🇧", NL: "🇳🇱", BE: "🇧🇪", PL: "🇵🇱",
};

function DeltaBadge({ current, previous, isCurrency = false }) {
  if (!previous || previous === 0) return null;
  const delta = current - previous;
  const pct = Math.round((delta / previous) * 100);
  const positive = delta >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${positive ? "text-emerald-400" : "text-rose-400"}`}>
      {positive ? "+" : ""}{pct}%
    </span>
  );
}

const DashboardVendite = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [compare, setCompare] = useState(null);
  const [margins, setMargins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState("overview");

  const fetchData = useCallback(async () => {
    try {
      const [resSummary, resCompare, resMargins] = await Promise.all([
        fetch("/api/v2/reports-amazon/sales-traffic/summary"),
        fetch("/api/v2/reports-amazon/sales-traffic/compare"),
        fetch("/api/v2/reports-amazon/sales-traffic/margins"),
      ]);
      if (resSummary.ok) setData(await resSummary.json());
      if (resCompare.ok) setCompare(await resCompare.json());
      if (resMargins.ok) { const j = await resMargins.json(); setMargins(j.data || []); }
    } catch {
      toast.error("Errore nel caricamento dati vendite");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncSales = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/v2/reports-amazon/sales-traffic/update", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore");
      toast.success("Aggiornamento vendite avviato in background");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const totals = data?.totals || {};
  const perMarketplace = data?.perMarketplace || [];
  const topAsin = data?.topAsin || [];
  const perData = data?.perData || [];

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
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-[18px] h-[18px] text-emerald-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Dashboard Vendite</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Amazon SP-API</span>
            </div>
          </div>
          <button onClick={syncSales} disabled={syncing} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-[12px] font-medium transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{syncing ? "Aggiornamento..." : "Aggiorna dati"}</span>
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Analytics</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Vendite <span className="text-slate-500">— overview multi-marketplace.</span>
          </h1>
        </div>
      </section>

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {loading ? (
          <div className="text-center py-16 text-slate-500">Caricamento...</div>
        ) : !data || totals.unita_totali === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">Nessun dato di vendita. Clicca "Aggiorna dati" per importare da Amazon.</p>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: DollarSign, label: "Fatturato", value: fmtEuro(totals.fatturato_totale), accent: "emerald" },
                { icon: ShoppingCart, label: "Unita vendute", value: fmtNum(totals.unita_totali), accent: "blue" },
                { icon: Package, label: "ASIN attivi", value: totals.asin_attivi, accent: "cyan" },
                { icon: Globe, label: "Marketplace", value: totals.marketplace_attivi, accent: "violet" },
              ].map((s) => (
                <div key={s.label} className="relative rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-4 flex flex-col items-center text-center">
                  <s.icon className={`w-5 h-5 mb-2 text-${s.accent}-400`} />
                  <span className={`text-xl sm:text-2xl font-bold tabular-nums text-${s.accent}-400`}>{s.value}</span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mt-1">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-md p-0.5 w-fit">
              {[
                { key: "overview", label: "Per marketplace" },
                { key: "prodotti", label: "Top prodotti" },
                { key: "trend", label: "Per data" },
                { key: "confronto", label: "Confronto periodi" },
                { key: "margini", label: "Margini" },
              ].map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} type="button" className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${tab === t.key ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Per marketplace */}
            {tab === "overview" && (
              <div className="space-y-4">
                {/* Grafico a barre */}
                {perMarketplace.length > 0 && (
                  <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
                    <div className="px-5 py-4">
                      <h2 className="text-sm font-semibold text-white mb-4">Fatturato e unita per marketplace</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={perMarketplace.map((mp) => ({ name: `${COUNTRY_FLAG[mp.country] || ""} ${mp.country}`, Fatturato: Math.round(mp.fatturato * 100) / 100, Unita: mp.unita }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                          <Bar yAxisId="left" dataKey="Fatturato" fill="#34d399" radius={[4, 4, 0, 0]} opacity={0.8} />
                          <Bar yAxisId="right" dataKey="Unita" fill="#60a5fa" radius={[4, 4, 0, 0]} opacity={0.8} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Card marketplace */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {perMarketplace.map((mp) => (
                    <div key={mp.country} className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-all">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
                      <div className="px-4 py-3 flex items-center gap-3">
                        <span className="text-xl">{COUNTRY_FLAG[mp.country] || "🌍"}</span>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">{mp.country} · {mp.asin_count} ASIN</p>
                          <p className="text-sm font-semibold text-emerald-400 tabular-nums">{fmtEuro(mp.fatturato)}</p>
                          <p className="text-xs text-blue-400 tabular-nums">{fmtNum(mp.unita)} unita</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Top prodotti */}
            {tab === "prodotti" && (
              <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                        <th className="px-4 py-3 text-left w-8">#</th>
                        <th className="px-4 py-3 text-left">ASIN</th>
                        <th className="px-4 py-3 text-right">Fatturato</th>
                        <th className="px-4 py-3 text-right">Unita</th>
                        <th className="px-4 py-3 text-right">Sessioni</th>
                        <th className="px-4 py-3 text-right">Conv. %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {topAsin.map((p, i) => (
                        <tr key={p.asin} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-slate-600 tabular-nums">{i + 1}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{p.asin}</span>
                            {p.sku && <span className="ml-2 text-xs text-slate-600">{p.sku}</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-semibold tabular-nums">{fmtEuro(p.fatturato)}</td>
                          <td className="px-4 py-3 text-right text-blue-400 tabular-nums">{fmtNum(p.unita)}</td>
                          <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{fmtNum(p.sessioni)}</td>
                          <td className="px-4 py-3 text-right text-amber-400 tabular-nums">{p.conv_rate_avg}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Per data (trend) */}
            {tab === "trend" && (
              <div className="space-y-4">
                {/* Grafico area trend */}
                {perData.length > 0 && (
                  <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
                    <div className="px-5 py-4">
                      <h2 className="text-sm font-semibold text-white mb-4">Trend fatturato e unita</h2>
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={[...perData].reverse().map((d) => ({ data: fmtDate(d.date), Fatturato: Math.round((d.fatturato || 0) * 100) / 100, Unita: d.unita || 0, Sessioni: d.sessioni || 0 }))}>
                          <defs>
                            <linearGradient id="gradFatt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradUnita" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="data" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                          <Area yAxisId="left" type="monotone" dataKey="Fatturato" stroke="#34d399" fill="url(#gradFatt)" strokeWidth={2} />
                          <Area yAxisId="right" type="monotone" dataKey="Unita" stroke="#60a5fa" fill="url(#gradUnita)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Tabella dettaglio */}
                <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                          <th className="px-4 py-3 text-left">Data</th>
                          <th className="px-4 py-3 text-right">Fatturato</th>
                          <th className="px-4 py-3 text-right">Unita</th>
                          <th className="px-4 py-3 text-right">Sessioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {perData.map((d) => (
                          <tr key={d.date} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtDate(d.date)}</td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-semibold tabular-nums">{fmtEuro(d.fatturato)}</td>
                            <td className="px-4 py-3 text-right text-blue-400 tabular-nums">{fmtNum(d.unita)}</td>
                            <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{fmtNum(d.sessioni)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Confronto periodi */}
            {tab === "confronto" && compare && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Settimana */}
                <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
                  <div className="px-5 py-4">
                    <h2 className="text-sm font-semibold text-white mb-4">Questa settimana vs precedente</h2>
                    <div className="space-y-4">
                      {[
                        { label: "Fatturato", curr: compare.thisWeek?.fatturato, prev: compare.lastWeek?.fatturato, fmt: fmtEuro },
                        { label: "Unita", curr: compare.thisWeek?.unita, prev: compare.lastWeek?.unita, fmt: fmtNum },
                        { label: "Sessioni", curr: compare.thisWeek?.sessioni, prev: compare.lastWeek?.sessioni, fmt: fmtNum },
                      ].map((m) => (
                        <div key={m.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-500">{m.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white tabular-nums">{m.fmt(m.curr)}</span>
                              <DeltaBadge current={m.curr} previous={m.prev} />
                            </div>
                          </div>
                          <div className="flex gap-1 h-2">
                            <div className="flex-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-600/60 rounded-full" style={{ width: `${m.prev && m.curr ? Math.min(100, Math.round((m.prev / Math.max(m.curr, m.prev)) * 100)) : 0}%` }} />
                            </div>
                            <div className="flex-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-400/60 rounded-full" style={{ width: `${m.curr && m.prev ? Math.min(100, Math.round((m.curr / Math.max(m.curr, m.prev)) * 100)) : 0}%` }} />
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                            <span>Precedente: {m.fmt(m.prev)}</span>
                            <span>Attuale</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mese */}
                <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
                  <div className="px-5 py-4">
                    <h2 className="text-sm font-semibold text-white mb-4">Questo mese vs precedente</h2>
                    <div className="space-y-4">
                      {[
                        { label: "Fatturato", curr: compare.thisMonth?.fatturato, prev: compare.lastMonth?.fatturato, fmt: fmtEuro },
                        { label: "Unita", curr: compare.thisMonth?.unita, prev: compare.lastMonth?.unita, fmt: fmtNum },
                        { label: "Sessioni", curr: compare.thisMonth?.sessioni, prev: compare.lastMonth?.sessioni, fmt: fmtNum },
                      ].map((m) => (
                        <div key={m.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-500">{m.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white tabular-nums">{m.fmt(m.curr)}</span>
                              <DeltaBadge current={m.curr} previous={m.prev} />
                            </div>
                          </div>
                          <div className="flex gap-1 h-2">
                            <div className="flex-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-600/60 rounded-full" style={{ width: `${m.prev && m.curr ? Math.min(100, Math.round((m.prev / Math.max(m.curr, m.prev)) * 100)) : 0}%` }} />
                            </div>
                            <div className="flex-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-400/60 rounded-full" style={{ width: `${m.curr && m.prev ? Math.min(100, Math.round((m.curr / Math.max(m.curr, m.prev)) * 100)) : 0}%` }} />
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                            <span>Precedente: {m.fmt(m.prev)}</span>
                            <span>Attuale</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Margini */}
            {tab === "margini" && (
              <div className="space-y-4">
                {margins.length === 0 ? (
                  <div className="text-center py-16">
                    <DollarSign className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500">Nessun dato margine disponibile.</p>
                    <p className="text-xs text-slate-600 mt-1">Servono dati vendite + commissioni FBA + costi in Bilancio.</p>
                  </div>
                ) : (
                  <>
                    {/* Grafico margini */}
                    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
                      <div className="px-5 py-4">
                        <h2 className="text-sm font-semibold text-white mb-4">Margine per prodotto (top 15)</h2>
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={margins.slice(0, 15).map((m) => ({ asin: m.asin.slice(-5), Fatturato: m.fatturato, Fees: m.fee_totale, Costo: m.costo_totale, Margine: m.margine }))} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                            <YAxis dataKey="asin" type="category" tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }} width={50} />
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                            <Bar dataKey="Margine" fill="#34d399" radius={[0, 4, 4, 0]} opacity={0.8} />
                            <Bar dataKey="Fees" fill="#f87171" radius={[0, 4, 4, 0]} opacity={0.6} />
                            <Bar dataKey="Costo" fill="#fbbf24" radius={[0, 4, 4, 0]} opacity={0.6} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Tabella margini */}
                    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-800 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                              <th className="px-4 py-3 text-left">ASIN</th>
                              <th className="px-4 py-3 text-right">Unita</th>
                              <th className="px-4 py-3 text-right">Fatturato</th>
                              <th className="px-4 py-3 text-right">Fees Amazon</th>
                              <th className="px-4 py-3 text-right">Costo prod.</th>
                              <th className="px-4 py-3 text-right">Margine</th>
                              <th className="px-4 py-3 text-right">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {margins.map((m) => (
                              <tr key={m.asin} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{m.asin}</span>
                                  {m.sku && <span className="ml-2 text-xs text-slate-600">{m.sku}</span>}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-300 tabular-nums">{fmtNum(m.unita)}</td>
                                <td className="px-4 py-3 text-right text-emerald-400 font-semibold tabular-nums">{fmtEuro(m.fatturato)}</td>
                                <td className="px-4 py-3 text-right text-rose-400 tabular-nums">{fmtEuro(m.fee_totale)}</td>
                                <td className="px-4 py-3 text-right text-amber-400 tabular-nums">{fmtEuro(m.costo_totale)}</td>
                                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${m.margine >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtEuro(m.margine)}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${m.margine_pct >= 20 ? "bg-emerald-500/10 text-emerald-400" : m.margine_pct >= 0 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                                    {m.margine_pct}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>&copy; {new Date().getFullYear()} Nexus &middot; Dashboard Vendite</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DashboardVendite;
