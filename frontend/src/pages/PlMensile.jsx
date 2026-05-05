import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import PageTopBar from "../components/PageTopBar";
import {
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

const MARKETPLACES = [
  { code: "", label: "Tutti" },
  { code: "IT", label: "Italia" },
  { code: "DE", label: "Germania" },
  { code: "FR", label: "Francia" },
  { code: "ES", label: "Spagna" },
  { code: "GB", label: "UK" },
];

const fmtEur = (v) => v == null ? "—" : `€ ${Number(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtInt = (v) => v == null ? "—" : Number(v).toLocaleString("it-IT");

export default function PlMensile() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [country, setCountry] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (country) params.append("country", country);
      const r = await fetch(`/api/v2/reports-amazon/pl-monthly?${params.toString()}`, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) { toast.error(j.error || "Errore"); return; }
      setData(j);
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [year, country]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data?.items) return;
    const headers = ["Mese", "Unità", "ASIN attivi", "Ricavi", "Costi prodotto", "Fee Amazon", "Costi totali", "Margine netto", "Margine %"];
    const rows = data.items.map(r => [
      r.mese, r.unita, r.asin_count,
      r.ricavi.toFixed(2), r.costi_prodotto.toFixed(2), r.fee_amazon.toFixed(2),
      r.costi_totali.toFixed(2), r.margine_netto.toFixed(2), r.margine_pct.toFixed(1),
    ]);
    const t = data.totali;
    rows.push(["TOTALE", t.unita, "", t.ricavi.toFixed(2), t.costi_prodotto.toFixed(2), t.fee_amazon.toFixed(2), t.costi_totali.toFixed(2), t.margine_netto.toFixed(2), t.margine_pct.toFixed(1)]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pl_mensile_${year}${country ? `_${country}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const items = data?.items || [];
  const totali = data?.totali;
  // Calcolo delta mensile per trend (confronto con mese precedente)
  const withTrend = items.map((r, i) => {
    const prev = i > 0 ? items[i - 1] : null;
    const deltaPct = prev && prev.ricavi > 0 ? ((r.ricavi - prev.ricavi) / prev.ricavi) * 100 : null;
    return { ...r, deltaPct };
  });

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <PageTopBar
        icon={FileSpreadsheet}
        iconAccent="emerald"
        eyebrow="Profit & Loss · ricavi · costi · margine"
        title="Report P&L mensile"
        backTo="/dashboard"
      />

      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 pb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Analytics</div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight">
            P&L mese per mese <span className="text-slate-500">· esporta CSV per il commercialista</span>
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Riepilogo mensile dei ricavi da Amazon, costi prodotto (da <code className="text-emerald-300">bilancio_catalogo</code>), fee stimate e margine netto. Selezionabile per anno e marketplace.
          </p>
        </div>
      </section>

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-4 pb-16 space-y-6">

        {/* Controlli */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
          <div className="px-6 py-5 sm:px-8 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Anno</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:ring-1 focus:ring-emerald-500/60">
                {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Marketplace</label>
              <select value={country} onChange={e => setCountry(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:ring-1 focus:ring-emerald-500/60">
                {MARKETPLACES.map(m => <option key={m.code} value={m.code}>{m.label}</option>)}
              </select>
            </div>
            <button onClick={load} disabled={loading} type="button" className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/40 text-emerald-300 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Ricarica
            </button>
            <button onClick={exportCsv} disabled={!data} type="button" className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/40 text-sky-300 disabled:opacity-50">
              <Download className="w-4 h-4" />
              Esporta CSV
            </button>
          </div>
        </div>

        {/* KPI totali anno */}
        {totali && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Ricavi", value: fmtEur(totali.ricavi), color: "sky" },
              { label: "Costi prodotto", value: fmtEur(totali.costi_prodotto), color: "orange" },
              { label: "Fee Amazon", value: fmtEur(totali.fee_amazon), color: "rose" },
              { label: "Margine netto", value: fmtEur(totali.margine_netto), color: totali.margine_netto >= 0 ? "emerald" : "rose" },
              { label: "Margine %", value: `${totali.margine_pct}%`, color: totali.margine_pct >= 0 ? "emerald" : "rose" },
            ].map(k => {
              const cls = { sky: "border-sky-500/40 text-sky-300", orange: "border-orange-500/40 text-orange-300", rose: "border-rose-500/40 text-rose-300", emerald: "border-emerald-500/40 text-emerald-300" };
              return (
                <div key={k.label} className={`rounded-md border bg-slate-900/40 p-3 ${cls[k.color]}`}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{k.label}</div>
                  <div className="text-lg font-bold tabular-nums mt-1">{k.value}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabella mensile */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
          <div className="px-6 py-5 sm:px-8">
            {loading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>
            ) : !data ? (
              <p className="text-sm text-slate-500 py-6">Nessun dato.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <th className="py-2 pr-3">Mese</th>
                      <th className="py-2 pr-3 text-right">Unità</th>
                      <th className="py-2 pr-3 text-right">ASIN</th>
                      <th className="py-2 pr-3 text-right">Ricavi</th>
                      <th className="py-2 pr-3 text-right">Δ vs prec.</th>
                      <th className="py-2 pr-3 text-right">Costo prodotto</th>
                      <th className="py-2 pr-3 text-right">Fee Amazon</th>
                      <th className="py-2 pr-3 text-right">Margine netto</th>
                      <th className="py-2 pr-3 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {withTrend.map(r => {
                      const marginCls = r.margine_netto > 0 ? "text-emerald-300" : r.margine_netto < 0 ? "text-rose-300" : "text-slate-400";
                      const deltaCls = r.deltaPct == null ? "text-slate-600" : r.deltaPct > 0 ? "text-emerald-400" : r.deltaPct < 0 ? "text-rose-400" : "text-slate-500";
                      const DeltaIcon = r.deltaPct == null ? Minus : r.deltaPct > 0 ? TrendingUp : r.deltaPct < 0 ? TrendingDown : Minus;
                      return (
                        <tr key={r.mese} className={`hover:bg-slate-800/20 ${r.ricavi === 0 ? "opacity-40" : ""}`}>
                          <td className="py-2 pr-3 text-white font-medium capitalize">{r.mese_label}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.unita)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-400">{fmtInt(r.asin_count)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtEur(r.ricavi)}</td>
                          <td className={`py-2 pr-3 text-right tabular-nums ${deltaCls}`}>
                            {r.deltaPct != null ? (
                              <span className="inline-flex items-center gap-1 justify-end">
                                <DeltaIcon className="w-3 h-3" />
                                {r.deltaPct > 0 ? "+" : ""}{r.deltaPct.toFixed(1)}%
                              </span>
                            ) : "—"}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-orange-300">{fmtEur(r.costi_prodotto)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-rose-300">{fmtEur(r.fee_amazon)}</td>
                          <td className={`py-2 pr-3 text-right tabular-nums font-semibold ${marginCls}`}>{fmtEur(r.margine_netto)}</td>
                          <td className={`py-2 pr-3 text-right tabular-nums ${marginCls}`}>{r.margine_pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {totali && (
                    <tfoot>
                      <tr className="border-t-2 border-emerald-500/30 bg-emerald-500/5 text-white font-semibold">
                        <td className="py-2 pr-3 uppercase text-[11px] tracking-wider">Totale {year}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(totali.unita)}</td>
                        <td />
                        <td className="py-2 pr-3 text-right tabular-nums">{fmtEur(totali.ricavi)}</td>
                        <td />
                        <td className="py-2 pr-3 text-right tabular-nums text-orange-300">{fmtEur(totali.costi_prodotto)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-rose-300">{fmtEur(totali.fee_amazon)}</td>
                        <td className={`py-2 pr-3 text-right tabular-nums ${totali.margine_netto >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtEur(totali.margine_netto)}</td>
                        <td className={`py-2 pr-3 text-right tabular-nums ${totali.margine_pct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{totali.margine_pct}%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Note: le fee Amazon sono stimate con la media storica per ASIN (tabella <code className="text-slate-400">fba_fees</code>). Il costo prodotto viene dal <code className="text-slate-400">bilancio_catalogo</code>. Il P&L qui è indicativo — per scopi contabili usa il report ufficiale Amazon.
        </p>
      </main>
    </div>
  );
}
