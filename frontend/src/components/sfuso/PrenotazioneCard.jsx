// components/sfuso/PrenotazioneCard.jsx
import React, { useState, useEffect } from "react";

const PrenotazioneCard = ({ prenotazione, onAggiornaStato, onModificaQuantita }) => {
  const [expanded, setExpanded] = useState(false);
  const [storico, setStorico] = useState([]);

  const toggleExpand = () => setExpanded((prev) => !prev);

  // 🔹 Carica i movimenti relativi alla prenotazione
  useEffect(() => {
    if (expanded) {
      fetch("/api/v2/sfuso/storico")
        .then((res) => res.json())
        .then((data) => {
          const movimentiPren = data.find(
            (m) => m.id_prenotazione === prenotazione.id
          );
          setStorico(movimentiPren ? movimentiPren.movimenti : []);
        })
        .catch((err) =>
          console.error("❌ Errore caricamento storico prenotazione:", err)
        );
    }
  }, [expanded, prenotazione.id]);

  const stato = (prenotazione.stato || "").toUpperCase();
  const coloreStato =
    stato === "CONFERMATA"
      ? "bg-green-600"
      : stato === "IN LAVORAZIONE"
      ? "bg-yellow-600"
      : stato === "ANNULLATA"
      ? "bg-red-600"
      : "bg-zinc-600";

  return (
    <div className="bg-zinc-800 rounded-lg shadow border border-zinc-700">
      {/* intestazione card */}
      <div
        className="flex justify-between items-center p-4 cursor-pointer"
        onClick={toggleExpand}
      >
        <div>
          <p className="font-semibold text-lg">{prenotazione.formato}</p>
          <p className="text-sm text-zinc-400">
            Lotto: {prenotazione.lotto || "-"} | Prodotti: {prenotazione.prodotti}
          </p>
          <p className="text-xs text-zinc-500">
            Data: {prenotazione.dataRichiesta}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`${coloreStato} px-3 py-1 rounded text-white text-sm`}
          >
            {prenotazione.stato}
          </span>
          <span className="text-yellow-400 text-lg">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* sezione espansa */}
      {expanded && (
        <div className="p-4 border-t border-zinc-700 bg-zinc-900 text-sm">
          <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-3">
            <p>
              <strong>Priorità:</strong> {prenotazione.priorita}
            </p>
            <p>
              <strong>Litri impegnati:</strong>{" "}
              {prenotazione.litriImpegnati?.toFixed(2)}
            </p>
            <p>
              <strong>Operatore:</strong> {prenotazione.operatore || "admin"}
            </p>
          </div>

          {/* 🔹 Pulsanti azione */}
          <div className="flex gap-3 mb-4">
            {stato === "PRENOTAZIONE" && (
              <button
                onClick={() =>
                  onAggiornaStato(prenotazione.id, "In lavorazione")
                }
                className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-white"
              >
                ▶️ In lavorazione
              </button>
            )}

            {stato === "IN LAVORAZIONE" && (
              <>
                <button
                  onClick={() => onAggiornaStato(prenotazione.id, "Confermata")}
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white"
                >
                  ✅ Conferma
                </button>
                <button
                  onClick={() => onAggiornaStato(prenotazione.id, "Annullata")}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white"
                >
                  ❌ Annulla
                </button>
              </>
            )}
          </div>

          {/* 🔹 Storico collegato */}
          {storico.length > 0 ? (
            <div className="space-y-2">
              {storico.map((mov, idx) => (
                <div
                  key={idx}
                  className="border border-zinc-700 rounded p-3 bg-zinc-800"
                >
                  <p className="text-zinc-300">
                    <strong>{mov.tipo}</strong> – {mov.stato} (
                    {mov.data})
                  </p>
                  <p className="text-zinc-400 text-sm">
                    Lotto: {mov.lotto || "-"} | Prodotti: {mov.prodotti} | Operatore:{" "}
                    {mov.operatore}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 italic">
              Nessun movimento registrato per questa prenotazione.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PrenotazioneCard;
