import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, X } from "lucide-react";

export default function CatalogoCostiTable() {
  const [righe, setRighe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/v2/bilancio/catalogo/dettagli");
      const json = await res.json();
      if (json.ok) setRighe(json.data);
    } catch (err) { console.error("Errore load:", err); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function salvaCosto(riga) {
    setSavingId(`${riga.tipo}-${riga.id_riferimento}`);
    try {
      const res = await fetch("/api/v2/bilancio/catalogo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: riga.tipo, id_riferimento: riga.id_riferimento, costo: riga.costo_unitario, note: riga.note }),
      });
      const json = await res.json();
      if (json.ok) toast.success("Costo salvato");
      else toast.error("Errore salvataggio");
    } catch { toast.error("Errore salvataggio"); }
    setSavingId(null);
    loadData();
  }

  async function popola() {
    try {
      const res = await fetch("/api/v2/bilancio/catalogo/popola", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Catalogo popolato: ${json.inseriti} nuovi, ${json.gia} esistenti`);
        loadData();
      }
    } catch { toast.error("Errore popolamento"); }
  }

  const righeFiltrate = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return righe;
    return righe.filter(r =>
      (r.nome || "").toLowerCase().includes(q) ||
      (r.asin || "").toLowerCase().includes(q) ||
      (r.sku || "").toLowerCase().includes(q)
    );
  }, [righe, search]);

  if (loading) return <p className="text-sm text-slate-500">Caricamento...</p>;

  const tipoColor = { prodotto: "text-emerald-400", accessorio: "text-amber-400", sfuso: "text-blue-400" };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per ASIN, SKU o nome..."
            className="w-full bg-slate-900/60 border border-slate-800 rounded-md pl-9 pr-9 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Cancella"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
            {righeFiltrate.length}/{righe.length}
          </span>
          <button onClick={popola} type="button" className="px-3 py-1.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[11px] font-medium transition-all whitespace-nowrap">
            Popola catalogo
          </button>
        </div>
      </div>

      {righe.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Nessun elemento nel catalogo. Clicca "Popola catalogo" per iniziare.</p>
      ) : righeFiltrate.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Nessun risultato per "{search}".</p>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500">Tipo</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500">Nome</th>
                <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wider text-slate-500">Q.ta</th>
                <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wider text-slate-500">Costo unit.</th>
                <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wider text-slate-500">Valore</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500">Note</th>
                <th className="px-3 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {righeFiltrate.map(r => {
                const key = `${r.tipo}-${r.id_riferimento}`;
                const meta = [r.asin, r.sku].filter(Boolean).join(" · ");
                return (
                  <tr key={key} className="hover:bg-slate-800/20 transition-colors">
                    <td className={`px-3 py-2 text-xs font-medium capitalize ${tipoColor[r.tipo] || "text-slate-400"}`}>{r.tipo}</td>
                    <td className="px-3 py-2">
                      <div className="text-sm text-white">{r.nome}</div>
                      {meta && (
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{meta}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-300 tabular-nums text-right">{r.quantita_disponibile}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number" step="0.01"
                        value={r.costo_unitario}
                        onChange={e => setRighe(prev => prev.map(x => x.tipo === r.tipo && x.id_riferimento === r.id_riferimento ? { ...x, costo_unitario: Number(e.target.value) } : x))}
                        className="w-20 bg-slate-800/60 border border-slate-700 rounded px-2 py-1 text-xs text-white text-right tabular-nums focus:outline-none focus:border-violet-500/50"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-emerald-400 font-medium tabular-nums text-right">
                      {"\u20AC"} {(r.costo_unitario * r.quantita_disponibile).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={r.note || ""}
                        onChange={e => setRighe(prev => prev.map(x => x.tipo === r.tipo && x.id_riferimento === r.id_riferimento ? { ...x, note: e.target.value } : x))}
                        placeholder="—"
                        className="w-full bg-transparent border-none text-xs text-slate-400 focus:outline-none focus:text-white placeholder-slate-600"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => salvaCosto(r)}
                        disabled={savingId === key}
                        type="button"
                        className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-medium transition-all disabled:opacity-50"
                      >
                        {savingId === key ? "..." : "Salva"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
