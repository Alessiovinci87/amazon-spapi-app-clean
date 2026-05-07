import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageTopBar from "../components/PageTopBar";
import PeriodSelector, { rangeFor } from "../components/PeriodSelector";
import {
  LayoutDashboard,
  TrendingUp, TrendingDown, Minus,
  ShoppingCart, Euro, Package, RotateCcw,
  Bell, AlertTriangle, CheckCircle2, Clock, Activity,
  Truck, FileText, Tag, Factory, Globe, Users,
  ArrowRight, RefreshCw, Info,
} from "lucide-react";

// =============================================================
// Helpers
// =============================================================
const fmtNum = (n) =>
  typeof n === "number" ? n.toLocaleString("it-IT") : "—";
const fmtEur = (n) =>
  typeof n === "number"
    ? "€ " + n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
const fmtPct = (n) => (typeof n === "number" ? `${n > 0 ? "+" : ""}${n.toFixed(1)}%` : "—");
const fmtDateTime = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const hoursSince = (s) => {
  if (!s) return Infinity;
  const d = new Date(String(s).replace(" ", "T"));
  if (isNaN(d)) return Infinity;
  return (Date.now() - d.getTime()) / 3_600_000;
};

const SYNC_LABEL = {
  asin_daily: "Vendite ASIN",
  sales_traffic: "Sales Traffic",
  catalog_info: "Catalogo",
  inventory_amazon: "Inventario FBA",
  fba_returns: "Resi FBA",
  buybox: "Buy Box",
  fees: "Fee FBA",
  feedback: "Feedback",
  product_catalog: "Product Catalog",
  alert_engine: "Alert Engine",
  ledger_summary: "Ledger Summary",
  "catalogo-info": "Catalogo Info",
  "prezzi-buybox": "Prezzi & Buy Box",
  "stock-fba": "Stock FBA",
  "stock-ledger": "Stock Ledger",
  "sales-traffic": "Vendite & Traffico",
  "fba-fees": "Fee FBA",
};

// Bandiera unicode da country code
const flagEmoji = (cc) => {
  if (!cc) return "🌍";
  // Mappa country marketplace abbreviati alle bandiere
  const map = { IT: "🇮🇹", FR: "🇫🇷", DE: "🇩🇪", ES: "🇪🇸", UK: "🇬🇧", GB: "🇬🇧",
    NL: "🇳🇱", BE: "🇧🇪", PL: "🇵🇱", SE: "🇸🇪" };
  return map[cc.toUpperCase()] || "🌍";
};


// =============================================================
// UI atoms
// =============================================================
function KpiTile({ icon: Icon, label, value, deltaPct, suffix, accent = "blue", onClick }) {
  const accentMap = {
    blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-400",    bar: "bg-blue-400/60" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", bar: "bg-emerald-400/60" },
    rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/30",    text: "text-rose-400",    bar: "bg-rose-400/60" },
    amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-400",   bar: "bg-amber-400/60" },
    indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/30",  text: "text-indigo-400",  bar: "bg-indigo-400/60" },
  };
  const a = accentMap[accent] || accentMap.blue;
  const trend = typeof deltaPct === "number"
    ? deltaPct > 0
      ? { Icon: TrendingUp, cls: "text-emerald-400" }
      : deltaPct < 0
        ? { Icon: TrendingDown, cls: "text-rose-400" }
        : { Icon: Minus, cls: "text-slate-500" }
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative bg-slate-900/60 border border-slate-800 rounded-lg p-4 text-left transition-all ${onClick ? "hover:border-slate-700 hover:bg-slate-900/80" : ""}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar} rounded-l-lg`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${a.bg} ${a.border}`}>
          <Icon className={`w-[18px] h-[18px] ${a.text}`} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trend.cls}`}>
            <trend.Icon className="w-3.5 h-3.5" />
            {fmtPct(deltaPct)}
          </span>
        )}
      </div>
      <div className="text-2xl sm:text-3xl font-semibold text-white tabular-nums tracking-tight">
        {value}
        {suffix && <span className="text-base text-slate-500 ml-1">{suffix}</span>}
      </div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{label}</div>
    </button>
  );
}

function StatusPill({ icon: Icon, label, value, hint, level = "ok", onClick }) {
  // level: ok | warn | bad | info
  const map = {
    ok:   { dot: "bg-emerald-400",  text: "text-emerald-300",  border: "border-emerald-500/25" },
    warn: { dot: "bg-amber-400",    text: "text-amber-300",    border: "border-amber-500/30" },
    bad:  { dot: "bg-rose-400",     text: "text-rose-300",     border: "border-rose-500/30" },
    info: { dot: "bg-slate-400",    text: "text-slate-300",    border: "border-slate-700" },
  };
  const m = map[level] || map.info;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-start gap-3 px-3 py-2.5 rounded-md border bg-slate-900/40 hover:bg-slate-900 transition-colors text-left w-full ${m.border}`}
    >
      <div className="relative flex-shrink-0 mt-0.5">
        <Icon className={`w-4 h-4 ${m.text}`} />
        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${m.dot}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
        <div className={`text-sm font-medium truncate ${m.text}`}>{value}</div>
        {hint && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{hint}</div>}
      </div>
      {onClick && <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 flex-shrink-0 mt-1" />}
    </button>
  );
}

function SectionCard({ title, eyebrow, action, children, accent = "indigo" }) {
  const map = {
    indigo: "bg-indigo-400/60",
    rose:   "bg-rose-400/60",
    amber:  "bg-amber-400/60",
    blue:   "bg-blue-400/60",
  };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${map[accent] || map.indigo}`} />
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{eyebrow}</div>}
          <h3 className="text-sm font-semibold text-white tracking-tight truncate">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

const ALERT_ICON = {
  BUYBOX_LOST: TrendingDown,
  LISTING_CHANGED: AlertTriangle,
  STOCK_LOW: Package,
  LOTTO_IN_SCADENZA: Clock,
  LOTTO_SCADUTO: AlertTriangle,
  SFUSO_INSUFFICIENTE: AlertTriangle,
};

// =============================================================
// Pagina
// =============================================================
const Panoramica = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selettore periodo: di default "Oggi" (situazione live)
  const initial = rangeFor("today");
  const [period, setPeriod] = useState({ presetId: "today", from: initial.from, to: initial.to });
  const currentRange = period;

  const load = useCallback(async (force = false) => {
    try {
      const params = new URLSearchParams();
      if (currentRange.from) params.set("from", currentRange.from);
      if (currentRange.to) params.set("to", currentRange.to);
      if (force) params.set("refresh", "1");
      const url = "/api/v2/dashboard/overview?" + params.toString();
      // Timeout di sicurezza 30s per evitare stati "syncing" stuck
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      let res;
      try {
        res = await fetch(url, { signal: ctrl.signal });
      } finally {
        clearTimeout(timer);
      }
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setData(j);
    } catch (err) {
      const msg = err?.name === "AbortError" ? "Timeout caricamento" : (err?.message || err);
      toast.error(`Panoramica: ${msg}`);
    }
  }, [currentRange]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // Polling automatico finché il backend sta arricchendo gli ordini live in
  // background. Ricarica i numeri ogni 4s. Si ferma quando data.live.refreshing
  // diventa false (= la cache è completamente popolata).
  const isBgRefreshing = !!data?.live?.refreshing;
  useEffect(() => {
    if (!isBgRefreshing) return;
    const id = setInterval(() => { load(false); }, 4000);
    return () => clearInterval(id);
  }, [isBgRefreshing, load]);

  // Auto-refresh ogni 60s mentre la pagina è aperta: il cron sul backend gira
  // ogni 2 min, quindi 60s ci garantisce di non perdere mai un ciclo.
  useEffect(() => {
    const id = setInterval(() => { load(false); }, 60000);
    return () => clearInterval(id);
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Durata minima animazione 700ms anche se la fetch è velocissima (cache).
    const minDuration = new Promise((r) => setTimeout(r, 700));
    try {
      await Promise.all([load(true), minDuration]);
    } finally {
      setRefreshing(false);
    }
  };

  // Il sync gira se: (a) c'è un refresh manuale in corso, (b) il backend
  // sta arricchendo la cache via Orders API in background.
  const syncSpinning = refreshing || isBgRefreshing;

  // ===== derived =====
  const kpi = data?.kpi;
  const sistema = data?.sistema || {};
  const alerts = data?.alerts || { items: [], unread_total: 0 };
  const operazioni = data?.operazioni || {};

  // Sync: prendi il run più recente ed evidenzia se vecchio
  const lastSync = useMemo(() => {
    const arr = sistema.sync || [];
    if (!arr.length) return null;
    return arr.reduce((acc, x) => {
      const ah = hoursSince(acc?.last_run);
      const xh = hoursSince(x.last_run);
      return xh < ah ? x : acc;
    });
  }, [sistema.sync]);
  const syncHoursAgo = lastSync ? hoursSince(lastSync.last_run) : Infinity;

  // ===== Pill helpers =====
  const trackingLevel = sistema.tracking?.problemi > 0 ? "bad"
                      : sistema.tracking?.in_transit > 0 ? "info" : "ok";
  const etichetteLevel = sistema.etichette?.tipi_in_debito > 0 || sistema.etichette?.esaurite > 0 ? "warn"
                       : sistema.etichette?.sotto_soglia > 0 ? "info" : "ok";
  const buyboxLevel = sistema.buybox?.persi > 0 ? "bad" : "ok";
  const ddtLevel = sistema.ddt?.senza_tracking > 0 ? "warn" : "ok";
  const produzioniLevel = sistema.produzioni?.in_lavorazione > 0 ? "info" : "ok";
  const ordiniLevel = sistema.ordini_fornitori?.in_attesa > 0 ? "info" : "ok";
  const syncLevel = !lastSync ? "info"
                   : syncHoursAgo > 24 ? "bad"
                   : syncHoursAgo > 6 ? "warn"
                   : lastSync.last_status === "error" ? "bad"
                   : "ok";

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <PageTopBar
        icon={LayoutDashboard}
        iconAccent="indigo"
        eyebrow="Operazioni"
        title="Panoramica"
        backTo="/dashboard"
        syncing={syncSpinning}
        onSyncClick={handleRefresh}
        syncTitle={isBgRefreshing ? "Aggiornamento in corso (Amazon Orders API)…" : "Aggiorna panoramica"}
      />

      <main className="relative flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            Caricamento panoramica…
          </div>
        ) : (
          <>
            {/* === Selettore periodo === */}
            <PeriodSelector
              accent="indigo"
              value={period}
              onChange={setPeriod}
              rangeInfo={
                <>
                  {data?.live?.applied && data.live.range && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Activity className="w-3 h-3 animate-pulse" />
                      live: {fmtDate(data.live.range.from)} → {fmtDate(data.live.range.to)}
                    </span>
                  )}
                  {data?.range?.data_lag && data.range.last_available_date && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Info className="w-3 h-3" />
                      report Amazon fino al {fmtDate(data.range.last_available_date)}
                    </span>
                  )}
                </>
              }
            />

            {/* === 1) KPI === */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  KPI · vs periodo precedente di stessa durata
                </div>
                <div className="text-[10px] text-slate-600">
                  Aggiornato: {data?.generated_at ? fmtDateTime(data.generated_at) : "—"}{data?.cached ? " (cache)" : ""}
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiTile
                  icon={Euro} label="Vendite (€)" accent="emerald"
                  value={fmtEur(kpi?.revenue?.value)} deltaPct={kpi?.revenue?.delta_pct}
                  onClick={() => navigate("/uffici/vendite")}
                />
                <KpiTile
                  icon={ShoppingCart} label="Ordini" accent="blue"
                  value={fmtNum(kpi?.orders?.value)} deltaPct={kpi?.orders?.delta_pct}
                  onClick={() => navigate("/uffici/vendite")}
                />
                <KpiTile
                  icon={Package} label="Unità vendute" accent="indigo"
                  value={fmtNum(kpi?.units?.value)} deltaPct={kpi?.units?.delta_pct}
                  onClick={() => navigate("/uffici/vendite")}
                />
                <KpiTile
                  icon={RotateCcw} label="Resi (unità)" accent="rose"
                  value={fmtNum(kpi?.returns_units?.value)} deltaPct={kpi?.returns_units?.delta_pct}
                  suffix={kpi?.returns_pct != null ? `· ${kpi.returns_pct}%` : null}
                  onClick={() => navigate("/uffici/resi-fba")}
                />
              </div>
            </div>

            {/* === 1b) Per paese === */}
            {Array.isArray(data?.per_country) && data.per_country.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-3">
                  Vendite per paese
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-900/40">
                        <th className="text-left py-2 px-3 font-medium">Paese</th>
                        <th className="text-right py-2 px-3 font-medium">Vendite (€)</th>
                        <th className="text-right py-2 px-3 font-medium">Ordini</th>
                        <th className="text-right py-2 px-3 font-medium">Unità</th>
                        <th className="text-right py-2 px-3 font-medium">Resi</th>
                        <th className="text-right py-2 px-3 font-medium">% sul tot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totRev = data.per_country.reduce((a, c) => a + (c.revenue || 0), 0);
                        return data.per_country.map((c) => (
                          <tr key={c.country} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-2">
                                <span className="text-base">{flagEmoji(c.country)}</span>
                                <span className="text-slate-300 font-medium">{c.country}</span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-300 tabular-nums">{fmtEur(c.revenue)}</td>
                            <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{fmtNum(c.orders)}</td>
                            <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{fmtNum(c.units)}</td>
                            <td className="py-2 px-3 text-right text-rose-300 tabular-nums">
                              {fmtNum(c.returns_units || 0)}
                              {c.returns_pct != null && <span className="text-slate-500 text-[11px] ml-1">({c.returns_pct}%)</span>}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-400 tabular-nums">
                              {totRev > 0 ? `${((c.revenue / totRev) * 100).toFixed(1)}%` : "—"}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* === 2) Stato sistema === */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-3">Stato sistema</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <StatusPill
                  icon={Activity}
                  label="Ultimo sync"
                  value={lastSync ? (SYNC_LABEL[lastSync.sync_id] || lastSync.sync_id) : "Nessun sync"}
                  hint={lastSync ? fmtDateTime(lastSync.last_run) : "—"}
                  level={syncLevel}
                  onClick={() => navigate("/uffici/sync")}
                />
                <StatusPill
                  icon={Truck}
                  label="Tracking"
                  value={`${sistema.tracking?.in_transit || 0} in transito`}
                  hint={sistema.tracking?.problemi ? `${sistema.tracking.problemi} con problemi` : `${sistema.tracking?.consegnati || 0} consegnati`}
                  level={trackingLevel}
                  onClick={() => navigate("/uffici/tracking17")}
                />
                <StatusPill
                  icon={Tag}
                  label="Etichette"
                  value={sistema.etichette?.tipi_in_debito ? `${sistema.etichette.tipi_in_debito} tipi · ${fmtNum(sistema.etichette.totale_pezzi)} da stampare` : "Nessun debito"}
                  hint={sistema.etichette?.sotto_soglia ? `${sistema.etichette.sotto_soglia} sotto soglia · ${sistema.etichette.esaurite} esaurite` : null}
                  level={etichetteLevel}
                  onClick={() => navigate("/etichette")}
                />
                <StatusPill
                  icon={Globe}
                  label="Buy Box"
                  value={sistema.buybox?.persi ? `${sistema.buybox.persi} listing senza Buy Box` : "Tutto OK"}
                  hint={`su ${sistema.buybox?.totali || 0} listing`}
                  level={buyboxLevel}
                  onClick={() => navigate("/uffici/listing")}
                />
                <StatusPill
                  icon={Factory}
                  label="Produzioni"
                  value={`${sistema.produzioni?.in_lavorazione || 0} in lavorazione`}
                  hint={`${sistema.produzioni?.prenotazioni_attive || 0} prenotazioni in coda`}
                  level={produzioniLevel}
                  onClick={() => navigate("/uffici/produzione")}
                />
                <StatusPill
                  icon={FileText}
                  label="DDT"
                  value={sistema.ddt?.senza_tracking ? `${sistema.ddt.senza_tracking} senza tracking` : "Tutti tracciati"}
                  hint={`${sistema.ddt?.totale || 0} totali`}
                  level={ddtLevel}
                  onClick={() => navigate("/uffici/ddt/storico")}
                />
                <StatusPill
                  icon={Users}
                  label="Ordini fornitori"
                  value={`${sistema.ordini_fornitori?.in_attesa || 0} in attesa`}
                  level={ordiniLevel}
                  onClick={() => navigate("/uffici/fornitori")}
                />
                <StatusPill
                  icon={Bell}
                  label="Alert non letti"
                  value={`${alerts.unread_total}`}
                  level={alerts.unread_total > 0 ? "warn" : "ok"}
                  onClick={() => navigate("/uffici/alert-center")}
                />
              </div>
            </div>

            {/* === 3) Alert recenti + Operazioni in corso === */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Alert */}
              <SectionCard
                accent="rose"
                eyebrow={`${alerts.unread_total} non letti`}
                title="Ultimi alert"
                action={
                  <button
                    type="button"
                    onClick={() => navigate("/uffici/alert-center")}
                    className="text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 inline-flex items-center gap-1"
                  >
                    Centro Alert <ArrowRight className="w-3 h-3" />
                  </button>
                }
              >
                {alerts.items.length === 0 ? (
                  <div className="py-6 text-center text-sm text-slate-500">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400/50" />
                    Nessun alert non letto
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {alerts.items.map((a) => {
                      const Icon = ALERT_ICON[a.tipo] || AlertTriangle;
                      return (
                        <div key={a.id} className="flex items-start gap-2.5 px-2 py-1.5 rounded hover:bg-slate-800/40 transition-colors">
                          <Icon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-slate-400">{a.asin}</span>
                              {a.nome && <span className="text-xs text-slate-300 truncate">{a.nome}</span>}
                              {a.marketplace_id && (
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                                  {a.marketplace_id.slice(-2)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">{a.messaggio}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5">{fmtDateTime(a.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {/* Operazioni in corso */}
              <SectionCard
                accent="amber"
                eyebrow="Da gestire"
                title="Operazioni in corso"
              >
                <div className="space-y-3">
                  {/* DDT da completare */}
                  {operazioni.ddt_da_completare?.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-amber-400 inline-flex items-center gap-1">
                          <FileText className="w-3 h-3" /> DDT senza tracking
                        </span>
                        <button onClick={() => navigate("/uffici/ddt/storico")} className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300 inline-flex items-center gap-1">
                          tutti <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {operazioni.ddt_da_completare.map((d) => (
                          <div key={d.id} className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-slate-800/40 border border-slate-800">
                            <span className="text-slate-400 font-mono">{d.numeroDDT}</span>
                            <span className="text-slate-500">{d.brand}</span>
                            <span className="text-slate-500 ml-auto">{fmtDate(d.data)}</span>
                            <span className="text-slate-300 tabular-nums">{d.totUnita} pz</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Produzioni in lavorazione */}
                  {operazioni.prenotazioni_in_lavorazione?.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-violet-400 inline-flex items-center gap-1">
                          <Factory className="w-3 h-3" /> Produzioni in lavorazione
                        </span>
                        <button onClick={() => navigate("/uffici/produzione")} className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300 inline-flex items-center gap-1">
                          tutte <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {operazioni.prenotazioni_in_lavorazione.map((p) => (
                          <div key={p.id} className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-slate-800/40 border border-slate-800">
                            <span className="text-slate-400 font-mono">{p.asin_prodotto}</span>
                            <span className="text-slate-300 truncate flex-1">{p.nome_prodotto}</span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">{p.formato}</span>
                            <span className="text-slate-300 tabular-nums">{p.prodotti} pz</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ordini fornitori in attesa */}
                  {operazioni.ordini_in_attesa?.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-orange-400 inline-flex items-center gap-1">
                          <Users className="w-3 h-3" /> Ordini fornitori in attesa
                        </span>
                        <button onClick={() => navigate("/uffici/fornitori")} className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300 inline-flex items-center gap-1">
                          tutti <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {operazioni.ordini_in_attesa.map((o) => (
                          <div key={o.id} className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-slate-800/40 border border-slate-800">
                            <span className="text-slate-300 truncate flex-1">{o.fornitore || "Fornitore #" + o.id_fornitore}</span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">{o.stato}</span>
                            <span className="text-slate-400 tabular-nums">{o.quantita_litri} L</span>
                            <span className="text-slate-500 ml-1">{fmtDate(o.data_ordine)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!operazioni.ddt_da_completare?.length &&
                    !operazioni.prenotazioni_in_lavorazione?.length &&
                    !operazioni.ordini_in_attesa?.length) && (
                    <div className="py-6 text-center text-sm text-slate-500">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400/50" />
                      Nessuna operazione in corso
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </main>

      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Panoramica</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Panoramica;
