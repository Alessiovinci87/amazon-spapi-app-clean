// frontend/src/components/sfuso/RettificaSfusoModal.jsx
import React, { useState } from "react";

const RettificaSfusoModal = ({ nome, tipo, onConferma, onAnnulla }) => {
  const [quantita, setQuantita] = useState("");
  const [nota, setNota] = useState("");
  const [operatore, setOperatore] = useState("");
  const operatori = ["Guido", "David", "Tony", "Alessio"];

  const handleSubmit = () => {
    const valore = parseFloat(quantita);
    if (isNaN(valore) || valore < 0) return alert("Inserisci una quantità valida.");
    if (!nota.trim()) return alert("Inserisci una nota.");
    if (!operatore) return alert("Seleziona un operatore.");
    onConferma({ quantita: valore, nota: nota.trim(), operatore });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-zinc-800 p-6 rounded-xl shadow-xl w-80">
        <h2 className="text-xl font-bold mb-4 text-white text-center">
          ✏️ Rettifica {tipo === "old" ? "SFUSO_OLD" : "SFUSO_NEW"}<br />per {nome}
        </h2>

        <label className="block text-sm mb-1 text-gray-300">Quantità (L)</label>
        <input
          type="number"
          step="0.1"
          value={quantita}
          onChange={(e) => setQuantita(e.target.value)}
          className="w-full p-2 rounded bg-zinc-700 text-white mb-3 text-right"
        />

        <label className="block text-sm mb-1 text-gray-300">Nota</label>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows="2"
          placeholder="Motivo della rettifica..."
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

export default RettificaSfusoModal;
