import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Clock,
  Package,
  Calendar,
} from "lucide-react";

const MARKETPLACES = [
  { code: "ALL", label: "Tutti" },
  { code: "IT",  label: "Italia" },
  { code: "DE",  label: "Germania" },
  { code: "FR",  label: "Francia" },
  { code: "ES",  label: "Spagna" },
  { code: "UK",  label: "UK" },
];

const fmtInt = (v) => v == null ? "—" : Number(v).toLocaleString("it-IT");
const fmtNum = (v, dec = 1) => v == null ? "—" : Number(v).toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso + "T00:00:00").toLocaleDateString("it-IT"); } catch { return iso; }
};
const flagCode = (c) => ({ UK: "gb", GB: "gb" }[c] || c?.toLowerCase());

const URGENCY_STYLE = {
  critical: { bg: "bg-rose-500/10 border-rose-500/40 text-rose-300", dot: "bg-rose-400", label: "Critico" },
  high:     { bg: "bg-orange-500/10 border-orange-500/40 text-orange-300", dot: "bg-orange-400", label: "Alto" },
  medium:   { bg: "bg-amber-500/10 border-amber-500/40 text-amber-300", dot: "bg-amber-400", label: "Medio" },
  low:      { bg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300", dot: "bg-emerald-400", label: "Basso" },
  none:     { bg: "bg-slate-700/20 border-slate-700/40 text-slate-400", dot: "bg-slate-600", label: "N/D" },
};

export default function PrevisioneDomanda() {
  const navigate = useNavigate();
  const [windowDays, setWindowDays] = useState(30);
  const [leadTimeDays, setLeadTimeDays] = useState(14);
  const [country, setCountry] = useState("ALL");
  const [minDaysLeft, setMinDaysLeft] = useState("");
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        windowDays: String(windowDays),
        leadTimeDays: String(leadTimeDays),
      });
      if (country && country !== "ALL") params.append("country", country);
      if (minDaysLeft !== "") params.append("minDaysLeft", String(minDaysLeft));
      const r = await fetch(`/api/v2/forecast/stock?${params.toString()}`, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) { toast.error(j.error || "Errore caricamento"); return; }
      setItems(j.items);
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [windowDays, leadTimeDays, country, minDaysLeft]);

  useEffect(() => { load(); }, [load]);

  const filteredItems = useMemo(() => {
    let arr = items;
    if (onlyUrgent) arr = arr.filter(i => i.urgenza === "critical" || i.urgenza === "high");
    const q = filter.trim().toLowerCase();
    if (q) arr = arr.filter(i =>
      (i.asin || "").toLowerCase().includes(q) ||
      (i.sku || "").toLowerCase().includes(q) ||
      (i.product_name || "").toLowerCase().includes(q)
    );
    return arr;
  }, [items, filter, onlyUrgent]);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
    for (const i of items) c[i.urgenza] = (c[i.urgenza] || 0) + 1;
    return c;
  }, [items]);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Top bar */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-200 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center">
            <TrendingUp className="w-[18px] h-[18px] text-amber-400" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-white">Previsione domanda</span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Quando riordinare · giorni di stock</span>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 pb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Analytics</div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight">
            Quanti giorni di stock ti rimangono <span className="text-slate-500">e quando conviene riordinare</span>
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Calcoliamo la velocità di vendita media sugli ultimi <strong>{windowDays}</strong> giorni, stimiamo i giorni di stock residui (includendo inbound) e proponiamo una data di riordino considerando il lead time di <strong>{leadTimeDays}</strong> giorni.
          </p>
        </div>
      </section>

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-4 pb-16 space-y-6">

        {/* Controlli */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />
          <div className="px-6 py-5 sm:px-8 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Finestra storica (gg)</label>
                <input type="number" min={1} max={180} value={windowDays} onChange={e => setWindowDays(Math.max(1, Math.min(180, parseInt(e.target.value) || 30)))}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/60 tabular-nums" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5"><Package className="w-3 h-3" /> Lead time (gg)</label>
                <input type="number" min={0} max={120} value={leadTimeDays} onChange={e => setLeadTimeDays(Math.max(0, Math.min(120, parseInt(e.target.value) || 14)))}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/60 tabular-nums" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Marketplace</label>
                <select value={country} onChange={e => setCountry(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/60 appearance-none cursor-pointer">
                  {MARKETPLACES.map(m => <option key={m.code} value={m.code}>{m.code} · {m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Max giorni residui</label>
                <input type="number" placeholder="tutti" value={minDaysLeft} onChange={e => setMinDaysLeft(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/60 tabular-nums" />
              </div>
              <div className="flex items-end">
                <button onClick={load} disabled={loading} type="button" className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-300 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Ricarica
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <input type="text" placeholder="Cerca ASIN / SKU / nome" value={filter} onChange={e => setFilter(e.target.value)}
                className="flex-1 min-w-[220px] bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/60" />
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={onlyUrgent} onChange={e => setOnlyUrgent(e.target.checked)} className="accent-rose-500" />
                Solo urgenti (critico + alto)
              </label>
            </div>
          </div>
        </div>

        {/* Riepilogo urgenze */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["critical", "high", "medium", "low", "none"].map(u => {
            const s = URGENCY_STYLE[u];
            return (
              <div key={u} className={`rounded-md border p-3 ${s.bg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-[10px] uppercase tracking-wider">{s.label}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums mt-1">{counts[u] || 0}</div>
              </div>
            );
          })}
        </div>

        {/* Tabella */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />
          <div className="px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md border bg-amber-500/10 border-amber-500/40 text-amber-400 flex items-center justify-center">
                <Calendar className="w-[18px] h-[18px]" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Risultati</span>
                <h3 className="text-sm font-semibold text-white -mt-0.5">Previsione per ASIN ({filteredItems.length})</h3>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-amber-400 animate-spin" /></div>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-slate-500 py-6">Nessun risultato con i filtri correnti.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <th className="py-2 pr-3">Urgenza</th>
                      <th className="py-2 pr-3">Paese</th>
                      <th className="py-2 pr-3">Prodotto</th>
                      <th className="py-2 pr-3 text-right">Stock</th>
                      <th className="py-2 pr-3 text-right">In arrivo</th>
                      <th className="py-2 pr-3 text-right">Vel./gg</th>
                      <th className="py-2 pr-3 text-right">Gg residui</th>
                      <th className="py-2 pr-3">Riordina entro</th>
                      <th className="py-2 pr-3 text-right">Qty suggerita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredItems.map(r => {
                      const s = URGENCY_STYLE[r.urgenza] || URGENCY_STYLE.none;
                      return (
                        <tr key={`${r.asin}-${r.country}`} className="hover:bg-slate-800/20">
                          <td className="py-2 pr-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${s.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {s.label}
                            </span>
                          </td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-1.5">
                              <img src={`https://flagcdn.com/24x18/${flagCode(r.country)}.png`} alt={r.country} className="w-5 h-3 rounded-sm" />
                              <span className="text-slate-300 text-[11px]">{r.country}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-3 min-w-[220px]">
                            <div className="flex flex-col">
                              <span className="text-white line-clamp-1" title={r.product_name}>{r.product_name || "—"}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{r.asin}{r.sku ? ` · ${r.sku}` : ""}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.stock_disponibile)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-400">{r.stock_inbound > 0 ? `+${fmtInt(r.stock_inbound)}` : "—"}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-amber-300">{fmtNum(r.velocita_giornaliera, 2)}</td>
                          <td className={`py-2 pr-3 text-right tabular-nums font-semibold ${r.urgenza === "critical" ? "text-rose-300" : r.urgenza === "high" ? "text-orange-300" : "text-white"}`}>{fmtNum(r.giorni_residui, 1)}</td>
                          <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{fmtDate(r.riordina_entro)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-emerald-300 font-semibold">{r.qty_suggerita > 0 ? fmtInt(r.qty_suggerita) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div>
                Urgenza:
                <span className="mx-1 text-rose-300">Critico</span> (stock finisce prima del lead time) ·
                <span className="mx-1 text-orange-300">Alto</span> (entro 2× lead time) ·
                <span className="mx-1 text-amber-300">Medio</span> (entro 3× lead time) ·
                <span className="mx-1 text-emerald-300">Basso</span>.
                Qty suggerita copre lead time + 30 giorni di buffer.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
