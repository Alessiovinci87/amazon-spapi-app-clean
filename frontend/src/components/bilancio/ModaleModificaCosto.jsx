import { useState } from "react";
import { toast } from "sonner";

export default function ModaleModificaCosto({ riga, onClose, onUpdate }) {
  const [costo, setCosto] = useState(riga.costo_unitario);

  async function salva() {
    try {
      const res = await fetch("/api/v2/bilancio/catalogo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: riga.tipo,
          id_riferimento: riga.id_riferimento,
          costo: Number(costo),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Costo aggiornato");
        onUpdate();
        onClose();
      } else {
        toast.error(json.error || "Errore salvataggio");
      }
    } catch (err) {
      toast.error("Errore di connessione");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-96 space-y-4">
        <h2 className="text-lg font-semibold text-white">
          Modifica costo — {riga.nome}
        </h2>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Costo unitario</label>
          <input
            type="number"
            step="0.01"
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-sm hover:text-white transition-colors">
            Annulla
          </button>
          <button onClick={salva} type="button" className="px-4 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium transition-all">
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
