import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { downloadCSV } from "../utils/exportCSV";
import {
  ArrowLeft,
  ShieldAlert,
  Search,
  Download,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ImageOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const fmt = (v) => v?.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0,00";
const fmtInt = (v) => v?.toLocaleString("it-IT") ?? "0";

const RISCHIO_ORDER = { ESAURITO: 0, CRITICO: 1, ATTENZIONE: 2, OK: 3 };
const RISCHIO_CONFIG = {
  ESAURITO:   { color: "bg-rose-500/15 border-rose-500/30 text-rose-400", border: "border-l-rose-500", icon: XCircle, label: "Esaurito" },
  CRITICO:    { color: "bg-rose-500/10 border-rose-500/25 text-rose-400", border: "border-l-rose-500/70", icon: AlertCircle, label: "Critico" },
  ATTENZIONE: { color: "bg-amber-500/10 border-amber-500/25 text-amber-400", border: "border-l-amber-500/70", icon: AlertTriangle, label: "Attenzione" },
  OK:         { color: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400", border: "border-l-emerald-500/70", icon: CheckCircle, label: "OK" },
};

const flagCode = (c) => (c === "GB" ? "gb" : c.toLowerCase());

function KpiTile({ icon: Icon, label, value, accent }) {
  const colors = { rose: "bg-rose-500/10 border-rose-500/40 text-rose-400", amber: "bg-amber-500/10 border-amber-500/40 text-amber-400", emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400", blue: "bg-blue-500/10 border-blue-500/40 text-blue-400" };
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-5 py-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${colors[accent]}`}><Icon className="w-[18px] h-[18px]" /></div>
        <span className="text-xs uppercase tracking-[0.14em] text-slate-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-semibold text-white tabular-nums">{value}</div>
    </div>
  );
}

/* ── Worst risk across countries ── */
function worstRisk(rows) {
  let worst = "OK";
  for (const r of rows) {
    if ((RISCHIO_ORDER[r.rischio] ?? 3) < (RISCHIO_ORDER[worst] ?? 3)) worst = r.rischio;
  }
  return worst;
}

const CopertureFBA = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [selectedCountry, setSelectedCountry] = useState(() => searchParams.get("country") || "");
  const [filterRischio, setFilterRischio] = useState("");
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (selectedCountry) p.set("country", selectedCountry);
    setSearchParams(p, { replace: true });
  }, [search, selectedCountry]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = selectedCountry ? `?country=${selectedCountry}` : "";
      const res = await fetch(`/api/v2/reports-amazon/fba-coverage${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json);
    } catch { toast.error("Errore caricamento copertura FBA"); }
    finally { setLoading(false); }
  }, [selectedCountry]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggle = (asin) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(asin) ? next.delete(asin) : next.add(asin);
    return next;
  });

  // Filtra righe singole, poi raggruppa per ASIN
  const filteredRows = (data?.prodotti || []).filter(p => {
    if (filterRischio && p.rischio !== filterRischio) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.nome?.toLowerCase().includes(q) || p.asin?.toLowerCase().includes(q);
  });

  // Raggruppa per ASIN
  const grouped = {};
  for (const r of filteredRows) {
    if (!grouped[r.asin]) grouped[r.asin] = { asin: r.asin, nome: r.nome, immagine: r.immagine, rows: [] };
    grouped[r.asin].rows.push(r);
  }

  const asinGroups = Object.values(grouped).map(g => {
    const totalStock = g.rows[0]?.eu_stock_totale || g.rows.reduce((s, r) => s + r.stock_fba, 0);
    const totalVel = g.rows.reduce((s, r) => s + r.velocita_giorno, 0);
    const minGiorni = Math.min(...g.rows.map(r => r.giorni_copertura));
    const totalFatturato = g.rows.reduce((s, r) => s + r.fatturato_anno, 0);
    const totalSugg = g.rows.reduce((s, r) => s + r.suggerimento_qty, 0);
    const risk = worstRisk(g.rows);
    return { ...g, totalStock, totalVel, minGiorni, totalFatturato, totalSugg, risk };
  }).sort((a, b) => a.minGiorni - b.minGiorni);

  const handleExport = () => {
    if (!filteredRows.length) return;
    downloadCSV(filteredRows,
      ["asin", "country", "nome", "stock_fba", "velocita_giorno", "giorni_copertura", "suggerimento_qty", "rischio"],
      { asin: "ASIN", country: "Paese", nome: "Prodotto", stock_fba: "Stock FBA", velocita_giorno: "Vendite/giorno", giorni_copertura: "Giorni copertura", suggerimento_qty: "Riordino suggerito", rischio: "Rischio" },
      `copertura_fba_${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success("CSV esportato");
  };

  const kpi = data?.kpi;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Top bar */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")} type="button" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"><ArrowLeft className="w-4 h-4" /></button>
            <div className="w-9 h-9 rounded-md bg-rose-500/10 border border-rose-500/40 flex items-center justify-center flex-shrink-0"><ShieldAlert className="w-[18px] h-[18px] text-rose-400" /></div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Copertura FBA</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Rischio stockout per prodotto</span>
            </div>
          </div>
          <button onClick={handleExport} type="button" className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 transition-colors">
            <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Esporta CSV</span>
          </button>
        </div>
      </header>

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-rose-400 animate-spin" /></div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-500">Nessun dato disponibile</div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiTile icon={XCircle} label="Esauriti" value={kpi.esauriti} accent="rose" />
              <KpiTile icon={AlertCircle} label="Critici (<14gg)" value={kpi.critici} accent="rose" />
              <KpiTile icon={AlertTriangle} label="Attenzione (<30gg)" value={kpi.attenzione} accent="amber" />
              <KpiTile icon={CheckCircle} label="OK (>30gg)" value={kpi.ok} accent="emerald" />
            </div>

            {/* Filtro paese */}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setSelectedCountry("")} type="button" className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${!selectedCountry ? "bg-rose-500/15 border-rose-500/40 text-rose-300" : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300"}`}>Tutti</button>
              {(data.countries || []).map(c => (
                <button key={c} onClick={() => setSelectedCountry(c === selectedCountry ? "" : c)} type="button" className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${selectedCountry === c ? "bg-blue-500/15 border-blue-500/40 text-blue-300" : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300"}`}>
                  <img src={`https://flagcdn.com/24x18/${flagCode(c)}.png`} alt={c} className="w-5 h-3 rounded-sm" />{c}
                </button>
              ))}
            </div>

            {/* Filtro rischio + search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                {["", "ESAURITO", "CRITICO", "ATTENZIONE", "OK"].map(r => (
                  <button key={r} onClick={() => setFilterRischio(r === filterRischio ? "" : r)} type="button" className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${filterRischio === r ? (RISCHIO_CONFIG[r]?.color || "bg-slate-500/15 border-slate-500/40 text-slate-300") : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300"}`}>
                    {r ? RISCHIO_CONFIG[r].label : "Tutti"}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Cerca ASIN o nome..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-md text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-rose-500/60 outline-none" />
              </div>
            </div>

            {/* Cards prodotto */}
            <div className="space-y-3">
              {asinGroups.map(g => {
                const isOpen = expanded.has(g.asin);
                const rc = RISCHIO_CONFIG[g.risk] || RISCHIO_CONFIG.OK;
                const RIcon = rc.icon;
                return (
                  <div key={g.asin} className={`bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden border-l-2 ${rc.border}`}>
                    {/* Header card — cliccabile */}
                    <button type="button" onClick={() => toggle(g.asin)} className="w-full text-left px-5 py-4 sm:px-6 sm:py-5 flex items-center gap-4 hover:bg-slate-800/20 transition-colors">
                      {g.immagine ? (
                        <img src={g.immagine} alt="" className="w-12 h-12 rounded-md object-contain bg-slate-800 flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0"><ImageOff className="w-4 h-4 text-slate-600" /></div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{g.nome || g.asin}</p>
                        <p className="text-[10px] font-mono text-emerald-400 mt-0.5 cursor-pointer hover:text-emerald-300 transition-colors" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(g.asin); toast.success(`ASIN ${g.asin} copiato`); }} title="Clicca per copiare">{g.asin}</p>
                      </div>

                      {/* Stats compatte */}
                      <div className="hidden sm:flex items-center gap-5 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-white tabular-nums">{fmtInt(g.totalStock)}</div>
                          <div className="text-[10px] text-slate-500">Stock EU totale</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-white tabular-nums">{fmt(g.totalVel)}</div>
                          <div className="text-[10px] text-slate-500">Vendite/gg</div>
                        </div>
                        <div className="text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold tabular-nums ${g.minGiorni <= 14 ? "bg-rose-500/15 text-rose-400" : g.minGiorni <= 30 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                            <Clock className="w-3 h-3" />
                            {g.minGiorni >= 999 ? "∞" : `${g.minGiorni}gg`}
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${rc.color}`}>
                          <RIcon className="w-3 h-3" />{rc.label}
                        </span>
                      </div>

                      {/* Mobile stats */}
                      <div className="sm:hidden flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold ${g.minGiorni <= 14 ? "bg-rose-500/15 text-rose-400" : g.minGiorni <= 30 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                          {g.minGiorni >= 999 ? "∞" : `${g.minGiorni}gg`}
                        </span>
                      </div>

                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                    </button>

                    {/* Dettaglio paesi — espanso */}
                    {isOpen && (
                      <div className="border-t border-slate-800 px-5 py-4 sm:px-6">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-700/50">
                                <th className="text-left pb-2 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Paese</th>
                                <th className="text-right pb-2 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Stock FBA</th>
                                <th className="text-right pb-2 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Dettaglio</th>
                                <th className="text-right pb-2 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Vendite/gg</th>
                                <th className="text-center pb-2 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Copertura</th>
                                <th className="text-center pb-2 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Rischio</th>
                                <th className="text-right pb-2 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Riordino</th>
                                <th className="text-right pb-2 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Fatturato</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.rows.map(r => {
                                const rrc = RISCHIO_CONFIG[r.rischio] || RISCHIO_CONFIG.OK;
                                const RRIcon = rrc.icon;
                                return (
                                  <tr key={r.country} className="border-b border-slate-800/30">
                                    <td className="py-2.5 pr-3">
                                      <div className="flex items-center gap-2">
                                        <img src={`https://flagcdn.com/24x18/${flagCode(r.country)}.png`} alt={r.country} className="w-5 h-3 rounded-sm" />
                                        <span className="text-slate-300 font-medium">{r.country}</span>
                                      </div>
                                    </td>
                                    <td className={`py-2.5 text-right tabular-nums font-medium ${r.stock_fba === 0 ? "text-rose-400" : "text-white"}`}>{fmtInt(r.stock_fba)}</td>
                                    <td className="py-2.5 text-right">
                                      <div className="flex flex-col items-end gap-0.5 text-[10px] tabular-nums">
                                        {r.stock_fulfillable > 0 && <span className="text-emerald-400">{fmtInt(r.stock_fulfillable)} vend.</span>}
                                        {r.reserved_qty > 0 && <span className="text-blue-400">{fmtInt(r.reserved_qty)} ris.</span>}
                                        {r.inbound_qty > 0 && <span className="text-amber-400">{fmtInt(r.inbound_qty)} arrivo</span>}
                                        {!r.stock_fulfillable && !r.reserved_qty && !r.inbound_qty && <span className="text-slate-600">—</span>}
                                      </div>
                                    </td>
                                    <td className="py-2.5 text-right tabular-nums text-slate-300">{fmt(r.velocita_giorno)}</td>
                                    <td className="py-2.5 text-center">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tabular-nums ${r.giorni_copertura <= 14 ? "bg-rose-500/15 text-rose-400" : r.giorni_copertura <= 30 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                                        <Clock className="w-3 h-3" />
                                        {r.giorni_copertura >= 999 ? "∞" : `${r.giorni_copertura}gg`}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-center">
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${rrc.color}`}>
                                        <RRIcon className="w-3 h-3" />{rrc.label}
                                      </span>
                                    </td>
                                    <td className={`py-2.5 text-right tabular-nums font-medium ${r.suggerimento_qty > 0 ? "text-amber-400" : "text-slate-600"}`}>
                                      {r.suggerimento_qty > 0 ? `+${fmtInt(r.suggerimento_qty)}` : "—"}
                                    </td>
                                    <td className="py-2.5 text-right tabular-nums text-slate-400">€{fmt(r.fatturato_anno)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Riepilogo bottom */}
                        {g.totalSugg > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-800/30 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">Riordino totale suggerito per raggiungere 60gg di copertura</span>
                            <span className="text-sm font-semibold text-amber-400 tabular-nums">+{fmtInt(g.totalSugg)} pz</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {asinGroups.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">Nessun prodotto trovato.</div>
            )}
          </>
        )}
      </main>

      <footer className="relative border-t border-slate-800 px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
        <span>&copy; {new Date().getFullYear()} Nexus — Copertura FBA</span>
        <span className="font-mono">v2.0</span>
      </footer>
    </div>
  );
};

export default CopertureFBA;
