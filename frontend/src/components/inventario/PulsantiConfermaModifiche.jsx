import React from "react";
import { Save, X, Download } from "lucide-react";

const PulsantiConfermaModifiche = ({
  modificheInCorso,
  storico,
  onConferma,
  onAnnulla,
  onEsporta,
}) => {
  return (
    <div className="mt-2 flex flex-col sm:flex-row gap-2">
      <button
        onClick={onConferma}
        disabled={!modificheInCorso}
        type="button"
        title={!modificheInCorso ? "Nessuna modifica da salvare" : "Conferma modifiche"}
        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/10 disabled:hover:border-emerald-500/40"
      >
        <Save className="w-3.5 h-3.5" />
        Conferma modifiche
      </button>

      <button
        onClick={onAnnulla}
        disabled={!modificheInCorso}
        type="button"
        title={!modificheInCorso ? "Nessuna modifica da annullare" : "Annulla modifiche"}
        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-500/10 disabled:hover:border-rose-500/40"
      >
        <X className="w-3.5 h-3.5" />
        Annulla modifiche
      </button>

      <button
        onClick={onEsporta}
        disabled={storico.length === 0}
        type="button"
        title={storico.length === 0 ? "Nessuno storico da esportare" : "Esporta storico modifiche CSV"}
        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-500/10 disabled:hover:border-blue-500/40"
      >
        <Download className="w-3.5 h-3.5" />
        Esporta CSV
      </button>
    </div>
  );
};

export default PulsantiConfermaModifiche;
