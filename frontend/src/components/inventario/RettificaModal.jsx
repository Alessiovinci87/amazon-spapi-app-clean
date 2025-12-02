import React, { useState } from "react";

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-800 text-white rounded-xl p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4">Rettifica Quantità</h2>

        <div className="mb-3">
          <label className="block text-sm mb-1">Nuovo valore pronto</label>
          <input
            type="number"
            value={nuovoPronto}
            onChange={(e) => setNuovoPronto(e.target.value)}
            className="w-full p-2 rounded bg-zinc-700 text-white"
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm mb-1">Nota (obbligatoria)</label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full p-2 rounded bg-zinc-700 text-white"
            rows={2}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-1">Operatore</label>
          <select
            value={operatore}
            onChange={(e) => setOperatore(e.target.value)}
            className="w-full p-2 rounded bg-zinc-700 text-white"
          >
            <option value="">-- Seleziona --</option>
            <option value="Guido">Guido</option>
            <option value="David">David</option>
            <option value="Alessio">Alessio</option>
            <option value="Tony">Tony</option>
          </select>
        </div>

        {errore && <p className="text-red-400 text-sm mb-2">{errore}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-zinc-600 hover:bg-zinc-700 px-4 py-2 rounded"
            type="button"
            disabled={loading}
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            type="button"
            disabled={loading}
          >
            {loading ? "Salvataggio..." : "Conferma"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RettificaModal;
