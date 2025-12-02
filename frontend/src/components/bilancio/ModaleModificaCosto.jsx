import React, { useState } from "react";
import { API_BASE, fetchJSON } from "../../utils/api";

export default function ModaleModificaCosto({ riga, onClose, onUpdate }) {
  const [costo, setCosto] = useState(riga.costo_unitario);

  async function salva() {
    const res = await fetchJSON(`${API_BASE}/bilancio/catalogo`, {
      method: "POST",
      body: JSON.stringify({
        tipo: riga.tipo,
        id_riferimento: riga.id_riferimento,
        costo: Number(costo),
      })
    });

    if (res.ok) {
      onUpdate();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 p-6 rounded-xl w-96 border border-zinc-700">

        <h2 className="text-xl font-bold mb-4">
          Modifica costo — {riga.nome}
        </h2>

        <label className="block text-sm text-zinc-400 mb-1">Costo unitario</label>
        <input
          type="number"
          step="0.01"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 mb-4"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-zinc-700 rounded-lg"
            onClick={onClose}
          >
            Annulla
          </button>

          <button
            className="px-4 py-2 bg-emerald-600 rounded-lg"
            onClick={salva}
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
