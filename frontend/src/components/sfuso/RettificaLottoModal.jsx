// frontend/src/components/sfuso/RettificaLottoModal.jsx
import React, { useState } from "react";

const RettificaLottoModal = ({ nome, onConferma, onAnnulla }) => {
  const [lotto, setLotto] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().split("T")[0]);
  const [operatore, setOperatore] = useState("");

  const operatori = ["Guido", "David", "Tony", "Alessio"];

  const handleSubmit = () => {
    if (!lotto || !data || !operatore) {
      alert("Tutti i campi sono obbligatori.");
      return;
    }
    onConferma({ lotto, data, operatore });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-zinc-800 p-6 rounded-xl shadow-xl w-80">
        <h2 className="text-xl font-bold mb-4 text-white text-center">
          🧾 Rettifica Lotto per {nome}
        </h2>

        <label className="block text-sm mb-1 text-gray-300">Lotto</label>
        <input
          type="text"
          value={lotto}
          onChange={(e) => setLotto(e.target.value)}
          className="w-full p-2 rounded bg-zinc-700 text-white mb-3"
        />

        <label className="block text-sm mb-1 text-gray-300">Data</label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-full p-2 rounded bg-zinc-700 text-white mb-3"
        />

        <label className="block text-sm mb-1 text-gray-300">Operatore</label>
        <select
          value={operatore}
          onChange={(e) => setOperatore(e.target.value)}
          className="w-full p-2 rounded bg-zinc-700 text-white mb-4"
        >
          <option value="">Seleziona...</option>
          {operatori.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>

        <div className="flex justify-between mt-4">
          <button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-semibold w-[48%]"
          >
            ✅ Conferma
          </button>
          <button
            onClick={onAnnulla}
            className="bg-zinc-600 hover:bg-zinc-700 px-4 py-2 rounded text-white font-semibold w-[48%]"
          >
            ❌ Annulla
          </button>
        </div>
      </div>
    </div>
  );
};

export default RettificaLottoModal;
