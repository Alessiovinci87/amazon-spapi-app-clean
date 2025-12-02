import React from "react";

const PulsantiConfermaModifiche = ({
  modificheInCorso,
  storico,
  onConferma,
  onAnnulla,
  onEsporta,
}) => {
  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center max-w-7xl mx-auto w-full px-2">
      <button
        onClick={onConferma}
        className="flex-1 bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!modificheInCorso}
        title={!modificheInCorso ? "Nessuna modifica da salvare" : "Conferma modifiche"}
        type="button"
      >
        💾 Conferma modifiche
      </button>

      <button
        onClick={onAnnulla}
        className="flex-1 bg-red-600 hover:bg-red-700 px-6 py-3 rounded text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!modificheInCorso}
        title={!modificheInCorso ? "Nessuna modifica da annullare" : "Annulla modifiche"}
        type="button"
      >
        ❌ Annulla modifiche
      </button>

      <button
        onClick={onEsporta}
        className="flex-1 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={storico.length === 0}
        title={storico.length === 0 ? "Nessuno storico da esportare" : "Esporta storico modifiche CSV"}
        type="button"
      >
        📤 Esporta storico CSV
      </button>
    </div>
  );
};

export default PulsantiConfermaModifiche;
