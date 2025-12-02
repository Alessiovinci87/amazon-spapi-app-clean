import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const StoricoSpedizioni = () => {
  const [storico, setStorico] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/v2/spedizioni/storico")
      .then((res) => res.json())
      .then((data) => setStorico(data));
  }, []);

  return (
    <div className="p-6 w-full">

      <h1 className="text-xl font-bold text-white mb-4 text-center">
        📜 Storico Spedizioni
      </h1>
      <div className="mb-4 text-center ">
  <label className="text-white mr-2">Filtra per Paese:</label>
  <select
    onChange={(e) => {
      const value = e.target.value;
      fetch(`/api/v2/spedizioni/storico${value ? `?paese=${value}` : ""}`)
        .then((res) => res.json())
        .then((data) => setStorico(data));
    }}
    className="bg-grey-800 text-white p-2 rounded"
  >
    <option value="">Tutti</option>
    <option value="IT">Italia</option>
    <option value="FR">Francia</option>
    <option value="ES">Spagna</option>
    <option value="DE">Germania</option>
    <option value="BE">Belgio</option>
    <option value="NL">Olanda</option>
    <option value="SE">Svezia</option>
    <option value="PL">Polonia</option>
    <option value="IE">Irlanda</option>
  </select>
</div>

      <button
        onClick={() => navigate("/spedizioni")}
        className="mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors self-start"
      >
        ⬅️ Torna a Gestione Spedizioni
      </button>


      <div className="space-y-4">
        {storico.map((s) => (
          <div
            key={s.id}
            className="bg-zinc-800 p-4 rounded shadow text-white w-full"
          >
            {/* Riga principale */}
            <div className="flex flex-wrap justify-between gap-4 text-sm mb-2">
              <span>📅 {s.data_operazione}</span>
              <span>🔢 {s.progressivo}</span>
              <span>🌍 {s.paese}</span>
              <span>📦 Stato: {s.stato}</span>
              <span>👤 {s.operatore || "-"}</span>
              <span>📝 {s.note || "-"}</span>
            </div>

            {/* Dettaglio prodotti */}
            {s.righe && s.righe.length > 0 && (
              <div className="mt-2 pl-2 border-t border-zinc-700 pt-2">
                {s.righe.map((r, i) => (
                  <div key={i} className="text-sm">
                    ➡️ <span className="font-semibold">{r.prodotto_nome}</span>{" "}
                    — {r.quantita} pezzi
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoricoSpedizioni;
