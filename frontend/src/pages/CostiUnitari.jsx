import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import PageTopBar from "../components/PageTopBar";
import CogsModal from "../components/cogs/CogsModal";
import {
  Coins,
  Loader2,
  RefreshCw,
  Search,
  X,
  Settings as SettingsIcon,
  Check,
  Pencil,
  TrendingUp,
  TrendingDown,
  Image as ImageIcon,
} from "lucide-react";

const MARKETPLACES = [
  { code: "IT", label: "Italia" },
  { code: "DE", label: "Germania" },
  { code: "FR", label: "Francia" },
  { code: "ES", label: "Spagna" },
  { code: "UK", label: "UK" },
  { code: "NL", label: "Olanda" },
  { code: "BE", label: "Belgio" },
  { code: "PL", label: "Polonia" },
];

const fmtEur = (v) =>
  v == null || isNaN(v)
    ? "—"
    : `€ ${Number(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtInt = (v) => (v == null ? "—" : Number(v).toLocaleString("it-IT"));

function marginColor(pct) {
  if (pct == null || isNaN(pct)) return "text-slate-500";
  if (pct >= 30) return "text-emerald-400";
  if (pct >= 15) return "text-amber-400";
  if (pct > 0) return "text-orange-400";
  return "text-rose-400";
}

export default function CostiUnitari() {
  const [marketplace, setMarketplace] = useState("IT");
  const [fulfillment, setFulfillment] = useState("FBA");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // riga corrente nel modale
  const [editingTitleAsin, setEditingTitleAsin] = useState(null);
  const [titleDraft, setTitleDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/v2/cogs/list?marketplace=${marketplace}&fulfillment=${fulfillment}`, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) {
        toast.error(j.error || "Errore caricamento");
        return;
      }
      setRows(j.data || []);
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [marketplace, fulfillment]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.display_title || "").toLowerCase().includes(q) ||
      (r.asin || "").toLowerCase().includes(q) ||
      (r.sku || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const startEditTitle = (row) => {
    setEditingTitleAsin(row.asin);
    setTitleDraft(row.custom_title || "");
  };

  const cancelEditTitle = () => {
    setEditingTitleAsin(null);
    setTitleDraft("");
  };

  const saveTitle = async (asin) => {
    try {
      const r = await fetch(`/api/v2/cogs/custom-title/${asin}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_title: titleDraft }),
      });
      const j = await r.json();
      if (!j.ok) { toast.error(j.error || "Errore salvataggio titolo"); return; }
      toast.success(titleDraft.trim() ? "Titolo personalizzato salvato" : "Titolo personalizzato rimosso");
      setRows(prev => prev.map(p => p.asin === asin
        ? { ...p, custom_title: j.custom_title, display_title: j.custom_title || p.nome }
        : p
      ));
      cancelEditTitle();
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    }
  };

  const onSavedCogs = (savedRow) => {
    // savedRow è il record salvato dal modale (POST /save risponde con il record)
    setRows(prev => prev.map(p => p.asin === savedRow.asin
      ? {
          ...p,
          cogs: {
            wholesale: savedRow.wholesale,
            inspection: savedRow.inspection,
            region_shipping: savedRow.region_shipping,
            import_tax: savedRow.import_tax,
            other_costs: savedRow.other_costs,
            inbound_shipping: savedRow.inbound_shipping,
            total: savedRow.total,
            tag: savedRow.tag,
            note: savedRow.note,
            updated_at: savedRow.updated_at,
          },
          total_cogs: Number((savedRow.total || 0).toFixed(2)),
          margin_eur: p.avg_price > 0 ? Number((p.avg_price - (savedRow.total || 0)).toFixed(2)) : 0,
          margin_pct: p.avg_price > 0 ? Number(((p.avg_price - (savedRow.total || 0)) / p.avg_price * 100).toFixed(2)) : 0,
        }
      : p
    ));
  };

  const onDeletedCogs = (asin) => {
    setRows(prev => prev.map(p => p.asin === asin
      ? { ...p, cogs: null, total_cogs: 0, margin_eur: 0, margin_pct: 0 }
      : p
    ));
  };

  // Statistiche header
  const stats = useMemo(() => {
    const totalProducts = rows.length;
    const withCogs = rows.filter(r => r.cogs).length;
    const totalUnits30d = rows.reduce((s, r) => s + (r.units_30d || 0), 0);
    const totalRevenue30d = rows.reduce((s, r) => s + (r.revenue_30d || 0), 0);
    const totalCost30d = rows.reduce((s, r) => s + (r.total_cogs * r.units_30d || 0), 0);
    return { totalProducts, withCogs, totalUnits30d, totalRevenue30d, totalCost30d };
  }, [rows]);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{
        backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      <PageTopBar
        icon={Coins}
        iconAccent="violet"
        eyebrow="Lancio · costi unitari · COGS"
        title="Costi unitari prodotti"
        backTo="/dashboard"
      />

      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 pb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Lancio</div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight">
            Costi unitari <span className="text-slate-500">· calcola il margine reale a partire dai costi vivi</span>
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Inserisci i COGS dettagliati (acquisto, ispezione, spedizioni, dazi) per ciascun ASIN. La lista è ordinata dal più venduto negli ultimi 30 giorni.
            Il margine viene calcolato come <code className="text-violet-300">(Prezzo medio − COGS) / Prezzo medio</code>.
          </p>
        </div>

        {/* === Filtri & azioni === */}
        <div className="px-6 sm:px-10 lg:px-16 mb-6">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            {/* Marketplace */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">Marketplace</span>
              <select
                value={marketplace}
                onChange={e => setMarketplace(e.target.value)}
                className="bg-slate-900/60 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
              >
                {MARKETPLACES.map(m => (
                  <option key={m.code} value={m.code}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Fulfillment */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">Modalità</span>
              <div className="inline-flex bg-slate-900/60 border border-slate-800 rounded-md p-0.5">
                {["FBA", "FBM"].map(ff => (
                  <button
                    key={ff}
                    onClick={() => setFulfillment(ff)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      fulfillment === ff
                        ? "bg-violet-500/20 text-violet-200 border border-violet-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {ff}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca per ASIN, SKU o titolo..."
                className="w-full bg-slate-900/60 border border-slate-800 rounded-md pl-9 pr-9 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={load}
              disabled={loading}
              className="px-3 py-1.5 rounded-md bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Aggiorna
            </button>
          </div>

          {/* === Stats === */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Prodotti" value={fmtInt(stats.totalProducts)} sub={`${stats.withCogs} con COGS`} color="slate" />
            <StatCard label="Unità 30gg" value={fmtInt(stats.totalUnits30d)} sub="totale venduto" color="emerald" />
            <StatCard label="Ricavi 30gg" value={fmtEur(stats.totalRevenue30d)} sub="da sales_traffic" color="violet" />
            <StatCard label="Costo prodotto" value={fmtEur(stats.totalCost30d)} sub="COGS × unità" color="orange" />
          </div>
        </div>

        {/* === Tabella === */}
        <div className="px-6 sm:px-10 lg:px-16 pb-16">
          <div className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                {rows.length === 0 ? "Nessun prodotto disponibile" : `Nessun risultato per "${search}"`}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2.5 w-12"></th>
                      <th className="px-3 py-2.5 text-left">Prodotto</th>
                      <th className="px-3 py-2.5 text-left">ASIN · SKU</th>
                      <th className="px-3 py-2.5 text-right">Unità 30gg</th>
                      <th className="px-3 py-2.5 text-right">Prezzo medio</th>
                      <th className="px-3 py-2.5 text-right">COGS</th>
                      <th className="px-3 py-2.5 text-right">Margine</th>
                      <th className="px-3 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredRows.map(r => (
                      <tr key={r.asin} className="hover:bg-slate-800/20 transition-colors">
                        {/* Immagine */}
                        <td className="px-3 py-2">
                          {r.immagine ? (
                            <img
                              src={r.immagine}
                              alt=""
                              className="w-10 h-10 rounded object-cover bg-slate-800 border border-slate-700"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-slate-600" />
                            </div>
                          )}
                        </td>

                        {/* Titolo editabile */}
                        <td className="px-3 py-2 max-w-md">
                          {editingTitleAsin === r.asin ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={titleDraft}
                                onChange={e => setTitleDraft(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") saveTitle(r.asin);
                                  if (e.key === "Escape") cancelEditTitle();
                                }}
                                placeholder={r.nome}
                                autoFocus
                                className="flex-1 bg-slate-800 border border-violet-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              />
                              <button
                                onClick={() => saveTitle(r.asin)}
                                className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                                title="Salva"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={cancelEditTitle}
                                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                                title="Annulla"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="group flex items-start gap-1.5">
                              <div className="min-w-0">
                                <div className="text-sm text-white truncate" title={r.display_title}>
                                  {r.display_title}
                                </div>
                                {r.custom_title && (
                                  <div className="text-[10px] text-slate-500 truncate" title={r.nome}>
                                    Amazon: {r.nome}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => startEditTitle(r)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-violet-300 hover:bg-slate-800 transition-opacity"
                                title="Modifica titolo"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* ASIN · SKU */}
                        <td className="px-3 py-2">
                          <div className="text-[11px] font-mono text-slate-400">{r.asin}</div>
                          {r.sku && (
                            <div className="text-[10px] font-mono text-slate-600 mt-0.5">{r.sku}</div>
                          )}
                        </td>

                        {/* Unità 30gg */}
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span className={r.units_30d > 0 ? "text-emerald-300" : "text-slate-600"}>
                            {fmtInt(r.units_30d)}
                          </span>
                        </td>

                        {/* Prezzo medio */}
                        <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                          {r.avg_price > 0 ? fmtEur(r.avg_price) : "—"}
                        </td>

                        {/* COGS */}
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.cogs ? (
                            <span className="text-orange-300">{fmtEur(r.total_cogs)}</span>
                          ) : (
                            <span className="text-slate-600 italic text-[11px]">non impostato</span>
                          )}
                        </td>

                        {/* Margine */}
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.cogs && r.avg_price > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className={`font-medium ${marginColor(r.margin_pct)}`}>
                                {r.margin_pct >= 0 ? "+" : ""}{r.margin_pct.toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-500">{fmtEur(r.margin_eur)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* Ingranaggio */}
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setModal({ row: r, marketplace, fulfillment })}
                            className="p-1.5 rounded text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
                            title="Modifica COGS"
                          >
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {modal && (
        <CogsModal
          row={modal.row}
          marketplace={modal.marketplace}
          initialFulfillment={modal.fulfillment}
          onClose={() => setModal(null)}
          onSaved={onSavedCogs}
          onDeleted={onDeletedCogs}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  const palette = {
    slate: "border-slate-700 text-slate-300",
    emerald: "border-emerald-500/30 text-emerald-300",
    violet: "border-violet-500/30 text-violet-300",
    orange: "border-orange-500/30 text-orange-300",
  }[color] || "border-slate-700 text-slate-300";

  return (
    <div className={`bg-slate-900/40 border rounded-lg px-4 py-3 ${palette}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-1">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
