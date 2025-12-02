import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const StoricoAccessori = () => {
  const [movimenti, setMovimenti] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
  const fetchStorico = async () => {
    try {
      const res = await fetch("/api/v2/accessori/storico");  // ✅ endpoint corretto
      if (!res.ok) throw new Error("Errore caricamento storico accessori");
      const data = await res.json();
      setMovimenti(data);
    } catch (err) {
      console.error("❌ Errore storico accessori:", err);
    }
  };

  fetchStorico();
}, []);


  return (
    <div className="p-6 text-white">
      {/* Pulsante torna indietro */}
      <button
        onClick={() => navigate("/accessori")}
        className="mb-6 px-4 py-2 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
      >
        ⬅️ Torna a Accessori
      </button>

      <h1 className="text-3xl font-bold text-center mb-6">
        📜 Storico Accessori
      </h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-700 text-sm text-left">
          <thead className="bg-zinc-800 text-gray-300">
            <tr>
              <th className="px-3 py-2 border">ASIN</th>
              <th className="px-3 py-2 border">Nome</th>
              <th className="px-3 py-2 border">Quantità Precedente</th>
              <th className="px-3 py-2 border">Quantità Nuova</th>
              <th className="px-3 py-2 border">Nota</th>
              <th className="px-3 py-2 border">Operatore</th>
              <th className="px-3 py-2 border">Data</th>
            </tr>
          </thead>
          <tbody>
            {movimenti.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  Nessun movimento registrato
                </td>
              </tr>
            ) : (
              movimenti.map((m, i) => (
                <tr key={i} className="bg-zinc-900">
                  <td className="px-3 py-2 border">{m.asin_accessorio}</td>
                  <td className="px-3 py-2 border">{m.nome}</td>
                  <td className="px-3 py-2 border">{m.quantita_precedente}</td>
                  <td className="px-3 py-2 border">{m.quantita_nuova}</td>
                  <td className="px-3 py-2 border">{m.nota}</td>
                  <td className="px-3 py-2 border">{m.operatore}</td>
                  <td className="px-3 py-2 border">
                    {new Date(m.data).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StoricoAccessori;
