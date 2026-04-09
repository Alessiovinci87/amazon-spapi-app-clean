import React, { useState } from "react";
import { Edit3, X } from "lucide-react";

const inputClass =
  "w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all";
const labelClass =
  "block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5";

const RettificaModal = ({ asin, valoreAttuale, onClose, onConferma }) => {
  const [nuovoPronto, setNuovoPronto] = useState(valoreAttuale);
  const [nota, setNota] = useState("");
  const [operatore, setOperatore] = useState("");
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  const handleSubmit = async () => {
    if (!nota.trim() || !operatore.trim()) {
      setErrore("Nota e operatore sono obbligatori");
      return;
    }
    setErrore("");
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/inventario/${asin}/pronto`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pronto: Number(nuovoPronto), note: nota, operatore }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nella rettifica");
      onConferma(data);
      onClose();
    } catch (err) {
      console.error("❌ Errore rettifica:", err);
      setErrore(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-0.5">Modifica</div>
              <h2 className="text-base font-semibold text-white">Rettifica quantità</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className={labelClass}>Nuovo valore pronto</label>
            <input
              type="number"
              value={nuovoPronto}
              onChange={(e) => setNuovoPronto(e.target.value)}
              className={`${inputClass} tabular-nums`}
            />
          </div>

          <div>
            <label className={labelClass}>Nota (obbligatoria)</label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>Operatore</label>
            <select
              value={operatore}
              onChange={(e) => setOperatore(e.target.value)}
              className={inputClass}
            >
              <option value="">— seleziona —</option>
              <option value="Guido">Guido</option>
              <option value="David">David</option>
              <option value="Alessio">Alessio</option>
              <option value="Tony">Tony</option>
            </select>
          </div>

          {errore && (
            <div className="px-3 py-2 rounded-md bg-rose-500/5 border border-rose-500/30">
              <p className="text-xs text-rose-300">{errore}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex gap-2 justify-end">
          <button
            onClick={onClose}
            type="button"
            disabled={loading}
            className="px-3 py-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all disabled:opacity-50"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {loading ? "Salvataggio…" : "Conferma"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RettificaModal;
