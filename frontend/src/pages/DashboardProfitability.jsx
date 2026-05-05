import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { downloadCSV } from "../utils/exportCSV";
import PageTopBar from "../components/PageTopBar";
import PeriodSelector, { rangeFor } from "../components/PeriodSelector";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  BarChart3,
  Search,
  Download,
  Loader2,
  AlertCircle,
  ShoppingCart,
  Percent,
  ImageOff,
  ArrowUpDown,
  Calendar,
} from "lucide-react";

/* ── helpers ──────────────────────────────────────────────── */
const fmt = (v) => v?.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0,00";
const fmtInt = (v) => v?.toLocaleString("it-IT") ?? "0";

function MarginBadge({ pct }) {
  if (pct > 30) return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">{pct}%</span>;
  if (pct > 15) return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">{pct}%</span>;
  if (pct > 0) return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/15 border border-orange-500/30 text-orange-400">{pct}%</span>;
  return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400">{pct}%</span>;
}

function KpiCard({ icon: Icon, label, value, accent = "blue", sub }) {
  const colors = {
    blue:    "bg-blue-500/10 border-blue-500/40 text-blue-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    amber:   "bg-amber-500/10 border-amber-500/40 text-amber-400",
    rose:    "bg-rose-500/10 border-rose-500/40 text-rose-400",
    violet:  "bg-violet-500/10 border-violet-500/40 text-violet-400",
  };
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-md border flex items-center justify-center flex-shrink-0 ${colors[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-xs uppercase tracking-[0.14em] text-slate-500 font-medium">{label}</div>
      </div>
      <div className="text-2xl sm:text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1.5">{sub}</div>}
    </div>
  );
}

/* ── sort helpers ─────────────────────────────────────────── */
const SORT_FIELDS = [
  { key: "fatturato",   label: "Ricavo" },
  { key: "margine",     label: "Margine €" },
  { key: "margine_pct", label: "Margine %" },
  { key: "unita",       label: "Unità" },
  { key: "costo_totale", label: "Costo" },
  { key: "fee_totale",  label: "Fee" },
  { key: "stock_fba",   label: "Stock FBA" },
];

/* ══════════════════════════════════════════════════════════ */
const DashboardProfitability = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [selectedCountry, setSelectedCountry] = useState(() => searchParams.get("country") || "");

  // Selettore periodo unificato (allineato a Panoramica)
  const initialPeriod = (() => {
    const fromQS = searchParams.get("from");
    const toQS = searchParams.get("to");
    const preset = searchParams.get("preset");
    if (fromQS && toQS) return { presetId: preset || "custom", from: fromQS, to: toQS };
    const r = rangeFor("d30");
    return { presetId: "d30", from: r.from, to: r.to };
  })();
  const [period, setPeriod] = useState(initialPeriod);
  const dateFrom = period.from;
  const dateTo = period.to;

  const [sortBy, setSortBy] = useState("fatturato");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (selectedCountry) p.set("country", selectedCountry);
    if (period.from) p.set("from", period.from);
    if (period.to) p.set("to", period.to);
    if (period.presetId) p.set("preset", period.presetId);
    setSearchParams(p, { replace: true });
  }, [search, selectedCountry, period]);

  const [syncingFees, setSyncingFees] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (selectedCountry) qp.set("country", selectedCountry);
      if (dateFrom) qp.set("from", dateFrom);
      if (dateTo) qp.set("to", dateTo);
      const qs = qp.toString() ? `?${qp}` : "";
      const res = await fetch(`/api/v2/reports-amazon/profitability${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Errore API");
      setData(json);
    } catch (err) {
      toast.error("Errore caricamento dati profittabilità");
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, dateFrom, dateTo]);

  const syncFees = async () => {
    setSyncingFees(true);
    try {
      const res = await fetch("/api/v2/reports-amazon/fba-fees/update", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        toast.success("Sincronizzazione Fee FBA avviata in background. I dati si aggiorneranno tra qualche minuto.");
      } else {
        toast.error("Errore avvio sync Fee FBA");
      }
    } catch { toast.error("Errore sync Fee FBA"); }
    finally { setSyncingFees(false); }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  const filteredProducts = (data?.prodotti || [])
    .filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return p.nome?.toLowerCase().includes(q) || p.asin?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const mul = sortDir === "desc" ? -1 : 1;
      return ((a[sortBy] || 0) - (b[sortBy] || 0)) * mul;
    });

  const handleExport = () => {
    if (!filteredProducts.length) return;
    downloadCSV(
      filteredProducts,
      ["asin", "sku", "nome", "unita", "fatturato", "prezzo_medio", "costo_unitario", "fee_totale", "costo_totale", "margine", "margine_pct", "stock_fba"],
      { asin: "ASIN", sku: "SKU", nome: "Prodotto", unita: "Unità vendute", fatturato: "Ricavo €", prezzo_medio: "Prezzo medio €", costo_unitario: "Costo unit. €", fee_totale: "Fee FBA €", costo_totale: "Costo prod. €", margine: "Margine €", margine_pct: "Margine %", stock_fba: "Stock FBA" },
      `profittabilita_${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success("CSV esportato");
  };

  const kpi = data?.kpi;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <PageTopBar
        icon={TrendingUp}
        iconAccent="emerald"
        eyebrow="Margine netto per prodotto"
        title="Profittabilità"
        backTo="/dashboard"
        syncing={syncingFees}
        onSyncClick={syncFees}
        syncTitle="Sync Fee FBA"
        actions={
          <button onClick={handleExport} type="button" className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Esporta CSV</span>
          </button>
        }
      />

      {/* === Content === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <p className="text-sm text-slate-400">Nessun dato disponibile. Sincronizza i report di vendita.</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard icon={DollarSign} label="Ricavi totali" value={`€ ${fmt(kpi.ricavi_totali)}`} accent="blue" />
              <KpiCard icon={ShoppingCart} label="Fee Amazon" value={`€ ${fmt(kpi.fee_totali)}`} accent="rose" />
              <KpiCard icon={Package} label="Costi produzione" value={`€ ${fmt(kpi.costi_totali)}`} accent="amber" />
              <KpiCard icon={kpi.margine_netto >= 0 ? TrendingUp : TrendingDown} label="Margine netto" value={`€ ${fmt(kpi.margine_netto)}`} accent={kpi.margine_netto >= 0 ? "emerald" : "rose"} sub={`${kpi.margine_pct}% del fatturato`} />
              <KpiCard icon={BarChart3} label="Unità vendute" value={fmtInt(kpi.unita_totali)} accent="violet" />
              <KpiCard icon={Percent} label="Prodotti" value={fmtInt(kpi.prodotti_count)} accent="blue" sub={`${filteredProducts.filter(p => p.margine_pct < 0).length} in perdita`} />
            </div>

            {/* Barra margine visuale */}
            {kpi.ricavi_totali > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-4">
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Composizione ricavo</div>
                <div className="flex h-6 rounded-md overflow-hidden">
                  <div className="bg-emerald-500/70 transition-all" style={{ width: `${Math.max(0, kpi.margine_pct)}%` }} title={`Margine ${kpi.margine_pct}%`} />
                  <div className="bg-rose-500/70 transition-all" style={{ width: `${Math.min(100, (kpi.fee_totali / kpi.ricavi_totali) * 100)}%` }} title="Fee Amazon" />
                  <div className="bg-amber-500/70 transition-all" style={{ width: `${Math.min(100, (kpi.costi_totali / kpi.ricavi_totali) * 100)}%` }} title="Costi produzione" />
                </div>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/70" /> Margine</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500/70" /> Fee Amazon</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/70" /> Costi prod.</span>
                </div>
              </div>
            )}

            {/* Filtro paese */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedCountry("")}
                type="button"
                className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${!selectedCountry ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300"}`}
              >
                Tutti i paesi
              </button>
              {(data?.countries || []).map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCountry(c === selectedCountry ? "" : c)}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${selectedCountry === c ? "bg-blue-500/15 border-blue-500/40 text-blue-300" : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300"}`}
                >
                  <img src={`https://flagcdn.com/24x18/${c === "UK" ? "gb" : c.toLowerCase()}.png`} alt={c} className="w-5 h-3 rounded-sm" />
                  {c}
                </button>
              ))}
            </div>

            {/* Filtro periodo unificato */}
            <PeriodSelector
              accent="violet"
              value={period}
              onChange={setPeriod}
              rangeInfo={
                <span className="text-[10px] text-slate-600">
                  {data?.stima_proporzionale ? "Stima proporzionale — " : ""}
                  {data?.date_range ? `Dati Amazon dal ${data.date_range.min} al ${data.date_range.max}` : ""}
                </span>
              }
            />

            {/* Search + sort */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cerca per nome, ASIN o SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-md text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/40 outline-none"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {SORT_FIELDS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => toggleSort(f.key)}
                    type="button"
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${sortBy === f.key ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300"}`}
                  >
                    {f.label} {sortBy === f.key && (sortDir === "desc" ? "↓" : "↑")}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabella prodotti */}
            <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium w-8">#</th>
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium">Prodotto</th>
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium text-right">Unità</th>
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium text-right">Ricavo €</th>
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium text-right">Prezzo medio</th>
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium text-right">Costo unit.</th>
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium text-right">Fee FBA</th>
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium text-right">Costo prod.</th>
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium text-right">Margine €</th>
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium text-center">Margine %</th>
                      <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium text-right">Stock FBA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p, i) => {
                      const borderColor = p.margine_pct < 0 ? "border-l-rose-500/70" : p.margine_pct < 15 ? "border-l-amber-500/70" : "border-l-emerald-500/70";
                      return (
                        <tr key={p.asin} className={`border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors border-l-2 ${borderColor}`}>
                          <td className="px-4 py-3 text-slate-600 tabular-nums">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 min-w-[200px]">
                              {p.immagine ? (
                                <img src={p.immagine} alt="" className="w-10 h-10 rounded-md object-contain bg-slate-800 flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0"><ImageOff className="w-4 h-4 text-slate-600" /></div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate max-w-[280px]">{p.nome || p.asin}</p>
                                <p className="text-[10px] font-mono text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors" onClick={() => { navigator.clipboard.writeText(p.asin); toast.success(`ASIN ${p.asin} copiato`); }} title="Clicca per copiare">{p.asin}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-white tabular-nums font-medium">{fmtInt(p.unita)}</td>
                          <td className="px-4 py-3 text-right text-white tabular-nums font-medium">{fmt(p.fatturato)}</td>
                          <td className="px-4 py-3 text-right text-slate-300 tabular-nums">{fmt(p.prezzo_medio)}</td>
                          <td className="px-4 py-3 text-right text-amber-400 tabular-nums">{fmt(p.costo_unitario)}</td>
                          <td className="px-4 py-3 text-right text-rose-400 tabular-nums">{fmt(p.fee_totale)}</td>
                          <td className="px-4 py-3 text-right text-amber-400 tabular-nums">{fmt(p.costo_totale)}</td>
                          <td className={`px-4 py-3 text-right tabular-nums font-semibold ${p.margine >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmt(p.margine)}</td>
                          <td className="px-4 py-3 text-center"><MarginBadge pct={p.margine_pct} /></td>
                          <td className={`px-4 py-3 text-right tabular-nums ${p.stock_fba === 0 ? "text-rose-400" : p.stock_fba < 20 ? "text-amber-400" : "text-slate-300"}`}>{fmtInt(p.stock_fba)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredProducts.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">
                  {search ? "Nessun prodotto trovato con questo filtro." : "Nessun dato di vendita disponibile."}
                </div>
              )}
            </div>

            {/* Note costo mancante */}
            {filteredProducts.some(p => p.costo_unitario === 0) && (
              <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg px-5 py-4">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-300">Costi unitari mancanti</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Alcuni prodotti hanno costo unitario a €0. Il margine reale sarà inferiore a quello mostrato.
                    Vai in <button onClick={() => navigate("/uffici/bilancio")} type="button" className="text-amber-300 hover:text-amber-200 underline">Bilancio</button> per aggiornare i costi.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
        <span>&copy; {new Date().getFullYear()} Nexus — Profittabilità</span>
        <span className="font-mono">v2.0</span>
      </footer>
    </div>
  );
};

export default DashboardProfitability;
