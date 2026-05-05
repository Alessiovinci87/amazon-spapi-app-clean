import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import PageTopBar from "../components/PageTopBar";
import {
  History,
  Plus,
  Trash2,
  Search,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Pencil,
  DollarSign,
  Star,
  MessageSquare,
  Package,
  Tag,
  Zap,
  Truck,
  Clock,
  BarChart3,
  Info,
} from "lucide-react";

const MARKETPLACES = ["IT", "FR", "ES", "DE", "UK"];
const flagCode = (c) => ({ UK: "gb", GB: "gb" }[c] || c?.toLowerCase());
const fmtNum = (v, dec = 2) => v == null ? "—" : Number(v).toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtInt = (v) => v == null ? "—" : Number(v).toLocaleString("it-IT");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const CHANGE_META = {
  title_changed:    { label: "Titolo modificato",  color: "amber",   Icon: Pencil },
  price_changed:    { label: "Prezzo cambiato",    color: "emerald", Icon: DollarSign },
  rating_changed:   { label: "Rating cambiato",    color: "yellow",  Icon: Star },
  reviews_changed:  { label: "Recensioni",         color: "sky",     Icon: MessageSquare },
  brand_changed:    { label: "Brand cambiato",     color: "indigo",  Icon: Tag },
  disappeared:      { label: "ASIN sparito",       color: "rose",    Icon: AlertTriangle },
  reappeared:       { label: "ASIN riapparso",     color: "emerald", Icon: Sparkles },
  prime_lost:       { label: "Prime perso",        color: "rose",    Icon: Zap },
  prime_gained:     { label: "Prime ottenuto",     color: "emerald", Icon: Zap },
  fba_lost:         { label: "Passato a FBM",      color: "amber",   Icon: Truck },
  fba_gained:       { label: "Passato a FBA",      color: "emerald", Icon: Truck },
};

const colorClasses = (c) => ({
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-400",   ring: "ring-amber-500/20" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  yellow:  { bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  text: "text-yellow-400",  ring: "ring-yellow-500/20" },
  sky:     { bg: "bg-sky-500/10",     border: "border-sky-500/30",     text: "text-sky-400",     ring: "ring-sky-500/20" },
  indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/30",  text: "text-indigo-400",  ring: "ring-indigo-500/20" },
  rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/30",    text: "text-rose-400",    ring: "ring-rose-500/20" },
}[c] || { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-400", ring: "ring-slate-500/20" });

function ChangeRow({ change }) {
  const meta = CHANGE_META[change.change_type] || { label: change.change_type, color: "slate", Icon: Eye };
  const cc = colorClasses(meta.color);
  const { Icon } = meta;

  let detail = null;
  try {
    if (change.change_type === "title_changed" && change.details) {
      const d = JSON.parse(change.details);
      detail = (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {(d.removed || []).map((w, i) => (
            <span key={`r-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 line-through">−{w}</span>
          ))}
          {(d.added || []).map((w, i) => (
            <span key={`a-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">+{w}</span>
          ))}
        </div>
      );
    } else if (change.change_type === "price_changed") {
      const d = change.details ? JSON.parse(change.details) : {};
      const up = d.delta > 0;
      detail = (
        <div className="flex items-center gap-2 mt-1 text-xs">
          <span className="text-slate-400 line-through">€ {fmtNum(parseFloat(change.old_value))}</span>
          <span className="text-slate-500">→</span>
          <span className="text-white font-semibold">€ {fmtNum(parseFloat(change.new_value))}</span>
          <span className={`flex items-center gap-0.5 text-[10px] font-medium ${up ? "text-rose-400" : "text-emerald-400"}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {up ? "+" : ""}{d.delta} € ({up ? "+" : ""}{d.pct}%)
          </span>
        </div>
      );
    } else if (change.change_type === "reviews_changed") {
      const d = change.details ? JSON.parse(change.details) : {};
      detail = (
        <div className="text-xs mt-1 text-slate-400">
          {fmtInt(parseInt(change.old_value))} → <span className="text-white">{fmtInt(parseInt(change.new_value))}</span>{" "}
          <span className={d.delta > 0 ? "text-emerald-400" : "text-rose-400"}>({d.delta > 0 ? "+" : ""}{d.delta})</span>
        </div>
      );
    } else if (change.change_type === "rating_changed") {
      detail = <div className="text-xs mt-1 text-slate-400">{change.old_value} ★ → <span className="text-white">{change.new_value} ★</span></div>;
    } else if (change.change_type === "brand_changed") {
      detail = <div className="text-xs mt-1"><span className="text-slate-400 line-through">{change.old_value}</span> → <span className="text-white">{change.new_value}</span></div>;
    }
  } catch {}

  return (
    <div className={`flex items-start gap-3 p-3 rounded-md border ${cc.border} ${cc.bg}`}>
      <div className={`w-8 h-8 rounded-md border ${cc.border} ${cc.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${cc.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider font-semibold ${cc.text}`}>{meta.label}</span>
          <span className="text-[10px] text-slate-500">{fmtDate(change.date)}</span>
          <a href={`https://www.amazon.${change.marketplace === "UK" ? "co.uk" : change.marketplace === "IT" ? "it" : change.marketplace.toLowerCase()}/dp/${change.asin}`} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-0.5">
            {change.asin} <ExternalLink className="w-2.5 h-2.5" />
          </a>
          {change.best_posizione != null && (
            <span
              title={change.best_keyword ? `Posizione migliore fra le keyword monitorate: #${change.best_posizione} su "${change.best_keyword}"` : `Posizione attuale: #${change.best_posizione}`}
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 font-semibold inline-flex items-center gap-1"
            >
              #{change.best_posizione}
              {change.best_keyword && <span className="text-amber-400/70 font-normal normal-case">· {change.best_keyword}</span>}
            </span>
          )}
        </div>
        {change.titolo_attuale && <div className="text-xs text-slate-300 truncate mt-0.5">{change.titolo_attuale}</div>}
        {detail}
      </div>
      {change.image_url && (
        <img src={change.image_url} alt="" className="w-12 h-12 rounded object-cover border border-slate-700/50 flex-shrink-0" onError={e => e.currentTarget.style.display = "none"} />
      )}
    </div>
  );
}

function Sparkline({ values, color = "#a78bfa", height = 32, width = 180, invert = false }) {
  if (!values || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const norm = (v - min) / range;
    const y = invert ? norm * (height - 4) + 2 : (1 - norm) * (height - 4) + 2;
    return `${i * step},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {values.length === 1 && <circle cx="0" cy={height/2} r="2" fill={color} />}
    </svg>
  );
}

function SalesPanel({ asin, marketplace }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/competitor/tracked/${asin}/sales-estimate?marketplace=${marketplace}&days=${days}`);
      const json = await res.json();
      setData(json);
    } catch {} finally { setLoading(false); }
  }, [asin, marketplace, days]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div className="flex items-center gap-2 py-2"><Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" /><span className="text-[11px] text-slate-500">Calcolo stima vendite...</span></div>;
  if (!data) return null;

  const trendLabel = { up: "↑ in calo BSR (vendite ↑)", down: "↓ BSR in salita (vendite ↓)", stable: "→ stabile" }[data.trend] || "—";
  const trendColor = data.trend === "up" ? "text-emerald-400" : data.trend === "down" ? "text-rose-400" : "text-slate-400";
  const bsrSeries = (data.series || []).map(s => s.bsr);
  const salesSeries = (data.series || []).map(s => s.sales_per_day);

  return (
    <div className="rounded-md border border-violet-500/20 bg-violet-500/5 p-3">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <span className="text-[11px] uppercase tracking-wider text-violet-300 font-semibold">Stima vendite</span>
          <span className={`text-[10px] font-medium ${trendColor}`}>{trendLabel}</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-700 rounded-md p-0.5">
          {[7, 30, 90, 365].map(d => (
            <button key={d} onClick={() => setDays(d)} type="button" className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${days === d ? "bg-violet-500/20 text-violet-200" : "text-slate-500 hover:text-slate-300"}`}>
              {d === 365 ? "Tutto" : `${d}gg`}
            </button>
          ))}
        </div>
      </div>

      {data.snapshots_count === 0 ? (
        <p className="text-[11px] text-slate-500 italic">{data.note}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500">Vendite/giorno</p>
              <p className="text-lg font-bold text-white tabular-nums">~{data.avg_sales_per_day}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500">Totale stimato</p>
              <p className="text-lg font-bold text-white tabular-nums">~{fmtInt(data.total_estimated)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500">Fatturato stim.</p>
              <p className="text-lg font-bold text-emerald-400 tabular-nums">{data.revenue_estimated != null ? `€ ${fmtInt(data.revenue_estimated)}` : "—"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500">BSR medio</p>
              <p className="text-lg font-bold text-white tabular-nums">#{fmtInt(data.bsr_avg)}</p>
              <p className="text-[9px] text-slate-500 tabular-nums">min #{fmtInt(data.bsr_min)} · max #{fmtInt(data.bsr_max)}</p>
            </div>
          </div>

          {bsrSeries.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-900/40 rounded p-2">
                <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Trend BSR ({bsrSeries.length} pt)</p>
                <Sparkline values={bsrSeries} color="#fb7185" invert />
              </div>
              <div className="bg-slate-900/40 rounded p-2">
                <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Trend vendite stimate</p>
                <Sparkline values={salesSeries} color="#34d399" />
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded p-2 leading-relaxed">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div>
              <p>
                <strong>Periodo richiesto:</strong> {data.days_requested === 365 ? "tutto" : `${data.days_requested}gg`} ·
                <strong> Effettivamente coperto:</strong> {data.days_available}gg con {data.snapshots_count} snapshot reali
                {data.days_available < data.days_requested && data.days_requested !== 365 && (
                  <span className="text-rose-400"> ({data.days_requested - data.days_available}gg mancanti, ASIN tracciato da meno tempo)</span>
                )}
              </p>
              <p className="mt-1 text-rose-400/90 font-semibold">
                ⚠ Stima molto approssimativa. La curva BSR→vendite è generica (non per categoria); errore tipico ±50-300% nelle nicchie. Usa solo per il <strong>trend</strong> (frecce ↑↓), <strong>non per le cifre</strong>.
              </p>
              <p className="mt-1 text-slate-500">
                Per dati di vendita realistici dei competitor servirebbe Keepa API (~€15/mese) o le proprie vendite via Sales & Traffic Report (solo per i tuoi ASIN).
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const CompetitorStorico = () => {
  const [loading, setLoading] = useState(true);
  const [tracked, setTracked] = useState([]);
  const [changes, setChanges] = useState([]);
  const [days, setDays] = useState(30);

  // Aggiungi ASIN
  const [newAsin, setNewAsin] = useState("");
  const [newMkt, setNewMkt] = useState("IT");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);

  // Snapshot manuale
  const [snapshotting, setSnapshotting] = useState(false);

  // Dettaglio ASIN espanso
  const [expandedAsin, setExpandedAsin] = useState(null);
  const [historyByAsin, setHistoryByAsin] = useState({});
  const [changesByAsin, setChangesByAsin] = useState({});
  // Gruppi keyword espansi
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const toggleGroup = (k) => setExpandedGroups(prev => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  const load = useCallback(async () => {
    try {
      const [resT, resC] = await Promise.all([
        fetch("/api/v2/competitor/tracked", { cache: "no-store" }),
        fetch(`/api/v2/competitor/changes?days=${days}`, { cache: "no-store" }),
      ]);
      const jt = await resT.json(), jc = await resC.json();
      if (jt.ok) setTracked(jt.tracked);
      if (jc.ok) setChanges(jc.changes);
    } catch { toast.error("Errore caricamento"); }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const addAsin = async () => {
    const a = newAsin.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(a)) { toast.error("ASIN non valido (10 caratteri)"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/v2/competitor/tracked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin: a, marketplace: newMkt, note: newNote.trim() || undefined }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`ASIN ${a} aggiunto e snapshot catturato`);
        setNewAsin(""); setNewNote("");
        load();
      } else toast.error(json.message || json.error);
    } catch { toast.error("Errore aggiunta ASIN"); }
    finally { setAdding(false); }
  };

  const removeAsin = async (id) => {
    try {
      await fetch(`/api/v2/competitor/tracked/${id}`, { method: "DELETE" });
      load();
    } catch {}
  };

  const removeByKeyword = async (keyword, marketplace, count) => {
    if (!window.confirm(`Rimuovere ${count} ASIN tracciati della keyword "${keyword}" (${marketplace})?\n\nGli ASIN potranno rientrare automaticamente dopo il prossimo snapshot keyword se sono ancora nei top-20.`)) return;
    try {
      const res = await fetch(`/api/v2/competitor/tracked-by-keyword?keyword_source=${encodeURIComponent(keyword)}&marketplace=${marketplace}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) { toast.success(`Rimossi ${json.rimossi} ASIN dal tracking`); load(); }
      else toast.error(json.error || "Errore");
    } catch { toast.error("Errore rimozione"); }
  };

  const checkAsinNow = async (asin, marketplace) => {
    const t = toast.loading(`Aggiornamento ${asin}...`);
    try {
      const res = await fetch("/api/v2/competitor/tracked/check-asin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin, marketplace }),
      });
      const json = await res.json();
      if (json.ok) {
        const n = (json.changes || []).length;
        toast.success(n > 0 ? `${asin}: ${n} modifich${n === 1 ? "a" : "e"} rilevat${n === 1 ? "a" : "e"}` : `${asin}: nessuna modifica`, { id: t });
        load();
        if (expandedAsin === `${asin}-${marketplace}`) loadAsinDetail(asin, marketplace);
      } else toast.error(json.error || "Errore", { id: t });
    } catch { toast.error("Errore aggiornamento", { id: t }); }
  };

  const runSnapshotAll = async (force = false) => {
    setSnapshotting(true);
    const t = toast.loading(force ? "Aggiornamento forzato tutti gli ASIN…" : "Aggiornamento ASIN non ancora controllati oggi…");
    try {
      const res = await fetch("/api/v2/competitor/tracked/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (json.ok) {
        const parts = [`${json.count} ASIN aggiornati`];
        if (json.skipped) parts.push(`${json.skipped} già fatti oggi`);
        if (json.errori) parts.push(`${json.errori} errori`);
        parts.push(`${json.changes} modifiche`);
        toast.success(parts.join(" · "), { id: t });
        load();
      } else toast.error(json.error || json.message, { id: t });
    } catch { toast.error("Errore snapshot", { id: t }); }
    finally { setSnapshotting(false); }
  };

  const loadAsinDetail = async (asin, marketplace) => {
    try {
      const [rh, rc] = await Promise.all([
        fetch(`/api/v2/competitor/tracked/${asin}/history?marketplace=${marketplace}`, { cache: "no-store" }),
        fetch(`/api/v2/competitor/tracked/${asin}/changes?marketplace=${marketplace}`, { cache: "no-store" }),
      ]);
      const jh = await rh.json(), jc = await rc.json();
      const key = `${asin}-${marketplace}`;
      if (jh.ok) setHistoryByAsin(p => ({ ...p, [key]: jh.snapshots }));
      if (jc.ok) setChangesByAsin(p => ({ ...p, [key]: jc.changes }));
    } catch {}
  };

  const toggleExpand = (asin, marketplace) => {
    const key = `${asin}-${marketplace}`;
    if (expandedAsin === key) { setExpandedAsin(null); return; }
    setExpandedAsin(key);
    if (!historyByAsin[key]) loadAsinDetail(asin, marketplace);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <PageTopBar
        icon={History}
        iconAccent="violet"
        eyebrow="Modifiche, sparizioni, nuovi ingressi"
        title="Storico Competitor"
        backTo="/uffici/competitor"
        syncing={snapshotting}
        onSyncClick={() => runSnapshotAll(false)}
        syncTitle="Aggiorna ASIN non controllati oggi"
        actions={
          <button onClick={() => runSnapshotAll(true)} disabled={snapshotting} type="button" title="Ri-scansiona TUTTI gli ASIN anche se già controllati oggi" className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${snapshotting ? "bg-slate-800 border border-slate-700 text-slate-500" : "bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200"}`}>
            <RefreshCw className="w-3.5 h-3.5" />
            Forza
          </button>
        }
      />

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
        ) : (
          <>
            {/* Aggiungi ASIN */}
            <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
              <div className="px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-md border bg-violet-500/10 border-violet-500/40 text-violet-400 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Tracking</span>
                    <h3 className="text-sm font-semibold text-white -mt-0.5">Aggiungi ASIN da monitorare</h3>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={newAsin}
                    onChange={e => setNewAsin(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && addAsin()}
                    placeholder="ASIN (es. B0XXXXXXXX)"
                    maxLength={10}
                    className="w-[200px] bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono focus:ring-1 focus:ring-violet-500/60 outline-none"
                  />
                  <select value={newMkt} onChange={e => setNewMkt(e.target.value)} className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2.5 text-sm text-white outline-none">
                    {MARKETPLACES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input
                    type="text"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Note (opzionale, es. competitor diretto)"
                    className="flex-1 min-w-[200px] bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
                  />
                  <button onClick={addAsin} disabled={adding || !newAsin.trim()} type="button" className="flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 text-violet-300 transition-colors">
                    {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Aggiungi e snapshot
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Gli ASIN dai top-20 delle keyword monitorate vengono aggiunti automaticamente. Aggiungi qui ASIN extra che vuoi seguire.</p>
              </div>
            </div>

            {/* Feed modifiche */}
            <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />
              <div className="px-6 py-5 sm:px-8">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md border bg-amber-500/10 border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Feed</span>
                      <h3 className="text-sm font-semibold text-white -mt-0.5">Modifiche recenti ({changes.length})</h3>
                    </div>
                  </div>
                  <select value={days} onChange={e => setDays(parseInt(e.target.value))} className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white outline-none">
                    <option value={7}>Ultimi 7 giorni</option>
                    <option value={30}>Ultimi 30 giorni</option>
                    <option value={90}>Ultimi 90 giorni</option>
                    <option value={365}>Ultimo anno</option>
                  </select>
                </div>
                {changes.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">Nessuna modifica rilevata. Le modifiche compaiono dopo almeno due snapshot dello stesso ASIN.</p>
                ) : (
                  <div className="space-y-2">
                    {changes.map(c => <ChangeRow key={c.id} change={c} />)}
                  </div>
                )}
              </div>
            </div>

            {/* Lista ASIN tracciati raggruppata per keyword */}
            <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
              <div className="px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-md border bg-cyan-500/10 border-cyan-500/40 text-cyan-400 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Tracking attivo</span>
                    <h3 className="text-sm font-semibold text-white -mt-0.5">ASIN tracciati per keyword ({tracked.length})</h3>
                  </div>
                </div>
                {tracked.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">Nessun ASIN tracciato. Aggiungine uno sopra o lancia "Aggiorna conteggi" sulla pagina principale per popolare automaticamente.</p>
                ) : (
                  (() => {
                    const groups = {};
                    for (const t of tracked) {
                      const k = `${t.keyword_source || "__manuali__"}|${t.marketplace}`;
                      if (!groups[k]) groups[k] = { keyword: t.keyword_source || "", marketplace: t.marketplace, items: [] };
                      groups[k].items.push(t);
                    }
                    const sortedKeys = Object.keys(groups).sort((a, b) => {
                      const A = groups[a], B = groups[b];
                      if (!A.keyword && B.keyword) return 1;
                      if (A.keyword && !B.keyword) return -1;
                      return (A.keyword || "").localeCompare(B.keyword || "") || A.marketplace.localeCompare(B.marketplace);
                    });
                    return (
                      <div className="space-y-3">
                        {sortedKeys.map(gKey => {
                          const g = groups[gKey];
                          const isGroupOpen = expandedGroups.has(gKey);
                          const sparitiCount = g.items.filter(i => i.last_status === "sparito").length;
                          const isManual = !g.keyword;
                          const kwCreated = g.items.find(i => i.keyword_created_at)?.keyword_created_at;
                          return (
                            <div key={gKey} className="rounded-lg border border-slate-700/50 bg-slate-800/10">
                              <div className="flex items-center gap-3 px-4 py-3">
                                <button onClick={() => toggleGroup(gKey)} type="button" className="flex-1 flex items-center gap-3 text-left min-w-0">
                                  <img src={`https://flagcdn.com/24x18/${flagCode(g.marketplace)}.png`} alt={g.marketplace} className="w-5 h-3 rounded-sm flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {isManual ? (
                                        <span className="text-sm font-medium text-violet-300">Manuali</span>
                                      ) : (
                                        <span className="text-sm font-medium text-white">{g.keyword}</span>
                                      )}
                                      {kwCreated && !isManual && (
                                        <span className="text-[10px] text-slate-500" title={`Monitoraggio creato il ${fmtDate(kwCreated)}`}>
                                          creata {fmtDate(kwCreated)}
                                        </span>
                                      )}
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold">{g.items.length} ASIN</span>
                                      {sparitiCount > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold">{sparitiCount} spariti</span>
                                      )}
                                    </div>
                                  </div>
                                  {isGroupOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                </button>
                                {!isManual && (
                                  <button onClick={() => removeByKeyword(g.keyword, g.marketplace, g.items.length)} type="button" title={`Rimuovi tutti i ${g.items.length} ASIN tracciati di questa keyword`} className="w-8 h-8 rounded-md border border-slate-700 flex items-center justify-center text-slate-500 hover:text-rose-400 hover:border-rose-500/40 transition-colors flex-shrink-0">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {isGroupOpen && (
                                <div className="border-t border-slate-700/30 px-3 py-3 space-y-2">
                                  {g.items
                                    .slice()
                                    .sort((a, b) => {
                                      const pa = a.posizione, pb = b.posizione;
                                      if (pa != null && pb != null) return pa - pb;
                                      if (pa != null) return -1;
                                      if (pb != null) return 1;
                                      return (b.last_checked_at || "").localeCompare(a.last_checked_at || "");
                                    })
                                    .map(t => {
                                      const key = `${t.asin}-${t.marketplace}`;
                                      const isOpen = expandedAsin === key;
                                      const history = historyByAsin[key] || [];
                                      const asinChanges = changesByAsin[key] || [];
                                      const sparito = t.last_status === "sparito";
                                      return (
                                        <div key={t.id} className={`rounded-lg border transition-all ${sparito ? "border-rose-500/30 bg-rose-500/5" : "border-slate-700/50 bg-slate-800/20"}`}>
                                          <div className="flex items-center gap-3 px-4 py-3">
                                            {t.posizione != null && (
                                              <span className="w-8 text-center text-[11px] font-bold text-amber-400 tabular-nums flex-shrink-0">#{t.posizione}</span>
                                            )}
                                            {t.image_url ? (
                                              <img src={t.image_url} alt="" className="w-12 h-12 rounded object-cover border border-slate-700/50 flex-shrink-0" onError={e => e.currentTarget.style.display = "none"} />
                                            ) : (
                                              <div className="w-12 h-12 rounded border border-slate-700/50 bg-slate-800/40 flex items-center justify-center flex-shrink-0">
                                                <ImageIcon className="w-4 h-4 text-slate-600" />
                                              </div>
                                            )}
                                            <button onClick={() => toggleExpand(t.asin, t.marketplace)} type="button" className="flex-1 flex items-center gap-3 text-left min-w-0">
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="font-mono text-emerald-400 text-[11px]">{t.asin}</span>
                                                  {t.brand && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">{t.brand}</span>}
                                                  {t.is_prime === 1 && <span title="Prime" className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 font-bold inline-flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />Prime</span>}
                                                  {t.is_fba === 1 && <span title="Fulfilled by Amazon" className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">FBA</span>}
                                                  {t.is_fba === 0 && <span title="Fulfilled by Merchant" className="text-[9px] px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/30 text-slate-400">FBM</span>}
                                                  {t.handling_max_hours != null && (
                                                    <span title={`Tempo di evasione: ${t.handling_min_hours ?? 0}-${t.handling_max_hours} ore`} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/40 border border-slate-600/40 text-slate-300 inline-flex items-center gap-0.5">
                                                      <Clock className="w-2.5 h-2.5" />{t.handling_max_hours <= 24 ? "≤24h" : `${t.handling_max_hours}h`}
                                                    </span>
                                                  )}
                                                  {t.source === "auto" && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/30 text-slate-400">auto</span>}
                                                  {sparito && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold">SPARITO</span>}
                                                </div>
                                                <div className="text-xs text-white truncate mt-0.5">{t.titolo || <span className="text-slate-500 italic">Mai scansionato</span>}</div>
                                                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-500">
                                                  {t.prezzo != null && <span>€ {fmtNum(t.prezzo)}</span>}
                                                  {t.last_checked_at && <span>ultimo check: {fmtDate(t.last_checked_at)}</span>}
                                                  {t.note && <span className="italic">"{t.note}"</span>}
                                                </div>
                                              </div>
                                              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                            </button>
                                            <a href={`https://www.amazon.${t.marketplace === "UK" ? "co.uk" : t.marketplace.toLowerCase()}/dp/${t.asin}`} target="_blank" rel="noreferrer" title="Apri su Amazon" className="w-8 h-8 rounded-md border border-slate-700 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                                              <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                            <button onClick={() => checkAsinNow(t.asin, t.marketplace)} title="Aggiorna ora" type="button" className="w-8 h-8 rounded-md border border-slate-700 flex items-center justify-center text-slate-500 hover:text-violet-400 transition-colors">
                                              <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => removeAsin(t.id)} title="Rimuovi dal tracking" type="button" className="w-8 h-8 rounded-md border border-slate-700 flex items-center justify-center text-slate-500 hover:text-rose-400 transition-colors">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>

                                          {isOpen && (
                                            <div className="border-t border-slate-700/30 px-4 py-3 space-y-3">
                                              {!historyByAsin[key] ? (
                                                <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 text-violet-400 animate-spin" /><span className="text-[11px] text-slate-500">Caricamento storico...</span></div>
                                              ) : (
                                                <>
                                                  {asinChanges.length > 0 && (
                                                    <div>
                                                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Cronologia modifiche ({asinChanges.length})</p>
                                                      <div className="space-y-1.5">
                                                        {asinChanges.map(c => <ChangeRow key={c.id} change={{ ...c, titolo_attuale: t.titolo, image_url: t.image_url }} />)}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {history.length > 0 && (
                                                    <div>
                                                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Snapshot ({history.length})</p>
                                                      <div className="overflow-x-auto">
                                                        <table className="w-full text-[11px]">
                                                          <thead>
                                                            <tr className="text-left text-slate-500 border-b border-slate-700/30">
                                                              <th className="py-1.5 pr-3">Data</th>
                                                              <th className="py-1.5 pr-3">Titolo</th>
                                                              <th className="py-1.5 pr-3 text-right">Prezzo</th>
                                                              <th className="py-1.5 pr-3 text-right">BSR</th>
                                                              <th className="py-1.5 pr-2 text-center">Prime</th>
                                                              <th className="py-1.5 pr-2 text-center">Evasione</th>
                                                              <th className="py-1.5">Stato</th>
                                                            </tr>
                                                          </thead>
                                                          <tbody>
                                                            {history.map((s, i) => (
                                                              <tr key={i} className="border-b border-slate-800/30 last:border-0">
                                                                <td className="py-1.5 pr-3 text-slate-400">{fmtDate(s.date)}</td>
                                                                <td className="py-1.5 pr-3 text-slate-300 max-w-md truncate">{s.titolo || "—"}</td>
                                                                <td className="py-1.5 pr-3 text-right text-white font-mono">{s.prezzo != null ? `€ ${fmtNum(s.prezzo)}` : "—"}</td>
                                                                <td className="py-1.5 pr-3 text-right text-slate-400 font-mono">{s.bsr != null ? `#${fmtInt(s.bsr)}` : "—"}</td>
                                                                <td className="py-1.5 pr-2 text-center">
                                                                  {s.is_prime === 1 ? <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 font-bold">P</span>
                                                                   : s.is_prime === 0 ? <span className="text-slate-600">—</span>
                                                                   : <span className="text-slate-700">?</span>}
                                                                  {s.is_fba === 1 && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">FBA</span>}
                                                                  {s.is_fba === 0 && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-slate-500/10 border border-slate-500/30 text-slate-400">FBM</span>}
                                                                </td>
                                                                <td className="py-1.5 pr-2 text-center text-slate-400 font-mono">{s.handling_max_hours != null ? `${s.handling_max_hours}h` : "—"}</td>
                                                                <td className="py-1.5">
                                                                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${s.stato === "sparito" ? "bg-rose-500/10 text-rose-400 border border-rose-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"}`}>
                                                                    {s.stato}
                                                                  </span>
                                                                </td>
                                                              </tr>
                                                            ))}
                                                          </tbody>
                                                        </table>
                                                      </div>
                                                    </div>
                                                  )}
                                                  {asinChanges.length === 0 && history.length <= 1 && (
                                                    <p className="text-[11px] text-slate-500 italic">Servono almeno 2 snapshot per rilevare modifiche.</p>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="relative border-t border-slate-800 px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
        <span>&copy; {new Date().getFullYear()} Nexus — Storico Competitor</span>
        <span className="font-mono">v2.0</span>
      </footer>
    </div>
  );
};

export default CompetitorStorico;
