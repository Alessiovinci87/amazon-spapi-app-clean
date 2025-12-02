import React, { useState } from "react";

const RettificaModal = ({ titolo, campo, valoreAttuale, onClose, onConferma }) => {
  const [valore, setValore] = useState(valoreAttuale);
  const [nota, setNota] = useState("");
  const [operatore, setOperatore] = useState("");

  const handleConferma = () => {
    if (!nota.trim()) {
      alert("⚠️ La nota è obbligatoria");
      return;
    }
    if (!operatore.trim()) {
      alert("⚠️ L'operatore è obbligatorio");
      return;
    }
    onConferma({ campo, nuovoValore: valore, nota, operatore });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-zinc-800 p-6 rounded-xl w-full max-w-md shadow-lg text-white">
        <h2 className="text-xl font-semibold mb-4">✏️ Rettifica {titolo}</h2>

        <label className="block mb-2 text-sm">Nuovo valore</label>
        <input
          type="text"
          value={valore}
          onChange={(e) => setValore(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-zinc-700 text-white"
        />

        <label className="block mb-2 text-sm">Nota (obbligatoria)</label>
        <input
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-zinc-700 text-white"
        />

        <label className="block mb-2 text-sm">Operatore</label>
        <input
          type="text"
          value={operatore}
          onChange={(e) => setOperatore(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-zinc-700 text-white"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-zinc-600 hover:bg-zinc-700 px-4 py-2 rounded"
          >
            ❌ Annulla
          </button>
          <button
            onClick={handleConferma}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            ✅ Conferma
          </button>
        </div>
      </div>
    </div>
  );
};

export default RettificaModal;
