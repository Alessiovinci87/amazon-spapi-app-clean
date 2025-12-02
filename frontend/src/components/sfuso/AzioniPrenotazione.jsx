const AzioniPrenotazione = ({ stato, id, onAggiorna }) => {
  const statoNorm = (stato || "").toUpperCase();

  return (
    <div className="flex gap-2 justify-center">
      {statoNorm === "PRENOTAZIONE" && (
        <>
          <button
            onClick={() => onAggiorna(id, "IN LAVORAZIONE")}
            className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded"
          >
            ⚙️ In lavorazione
          </button>
          <button
            onClick={() => onAggiorna(id, "ANNULLATA")}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
          >
            ❌ Annulla
          </button>
        </>
      )}

      {statoNorm === "IN LAVORAZIONE" && (
        <>
          <button
            onClick={() => onAggiorna(id, "CONFERMATA")}
            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
          >
            ✅ Conferma
          </button>
          <button
            onClick={() => onAggiorna(id, "ANNULLATA")}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
          >
            ❌ Annulla
          </button>
        </>
      )}

      {statoNorm === "CONFERMATA" && (
        <span className="text-green-400 font-semibold">✅ Confermata</span>
      )}

      {statoNorm === "ANNULLATA" && (
        <span className="text-red-400 font-semibold">❌ Annullata</span>
      )}
    </div>
  );
};

export default AzioniPrenotazione;
