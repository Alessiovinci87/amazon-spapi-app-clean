import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const CATEGORIE = ["acquisto", "spedizione", "rettifica", "produzione", "scarto", "altro"];

export default function MovimentiTable() {
  const [righe, setRighe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoria: "acquisto", importo: "", descrizione: "", operatore: "admin" });

  async function carica() {
    setLoading(true);
    try {
      const res = await fetch("/api/v2/bilancio/movimenti");
      const json = await res.json();
      if (json.ok) setRighe(json.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  useEffect(() => { carica(); }, []);

  async function aggiungi() {
    if (!form.importo) { toast.info("Inserisci un importo"); return; }
    try {
      const res = await fetch("/api/v2/bilancio/movimenti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Movimento registrato");
        setForm({ categoria: "acquisto", importo: "", descrizione: "", operatore: "admin" });
        setShowForm(false);
        carica();
      } else toast.error(json.error);
    } catch { toast.error("Errore registrazione"); }
  }

  async function elimina(id) {
    try {
      const res = await fetch(`/api/v2/bilancio/movimenti/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) { toast.success("Eliminato"); carica(); }
    } catch { toast.error("Errore eliminazione"); }
  }

  const totaleEntrate = righe.filter(r => r.importo > 0).reduce((s, r) => s + r.importo, 0);
  const totaleUscite = righe.filter(r => r.importo < 0).reduce((s, r) => s + Math.abs(r.importo), 0);

  if (loading) return <p className="text-sm text-slate-500">Caricamento...</p>;

  return (
    <div className="space-y-3">
      {/* Riepilogo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400">Entrate</p>
          <p className="text-lg font-semibold text-emerald-400 tabular-nums">{"\u20AC"} {totaleEntrate.toFixed(2)}</p>
        </div>
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-md px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-rose-400">Uscite</p>
          <p className="text-lg font-semibold text-rose-400 tabular-nums">{"\u20AC"} {totaleUscite.toFixed(2)}</p>
        </div>
      </div>

      {/* Pulsante aggiungi */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-medium transition-all">
          <Plus className="w-3.5 h-3.5" />
          Aggiungi movimento
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white capitalize">
              {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="Importo (- per uscite)" value={form.importo} onChange={e => setForm({ ...form, importo: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500" />
            <input type="text" placeholder="Descrizione" value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500" />
            <input type="text" placeholder="Operatore" value={form.operatore} onChange={e => setForm({ ...form, operatore: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={aggiungi} type="button" className="px-4 py-2 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-medium">Registra</button>
            <button onClick={() => setShowForm(false)} type="button" className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium hover:text-white">Annulla</button>
          </div>
        </div>
      )}

      {/* Tabella */}
      {righe.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Nessun movimento registrato.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500">Data</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500">Categoria</th>
                <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wider text-slate-500">Importo</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500">Descrizione</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500">Operatore</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {righe.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-3 py-2 text-xs text-slate-400 font-mono">{r.data ? new Date(r.data).toLocaleDateString("it-IT") : "—"}</td>
                  <td className="px-3 py-2 text-xs capitalize text-slate-300">{r.categoria}</td>
                  <td className={`px-3 py-2 text-sm font-medium tabular-nums text-right ${r.importo >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {r.importo >= 0 ? "+" : ""}{"\u20AC"} {Number(r.importo).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">{r.descrizione || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r.operatore}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => elimina(r.id)} type="button" className="text-slate-600 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
