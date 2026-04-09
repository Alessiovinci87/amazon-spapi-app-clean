import React, { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";

const FILTRI_FISSI = [
  { key: "12ml",      label: "12 ml" },
  { key: "100ml",     label: "100 ml" },
  { key: "kit",       label: "KIT" },
  { key: "5litri",    label: "5 litri" },
  { key: "accessori", label: "Accessori" },
  { key: "onestep",   label: "💅 One Step" },
  { key: "topcoat",   label: "✨ Top Coat" },
];

const FiltroSezioni = ({ sezioneAttiva, setSezioneAttiva, onNuovoModulo }) => {
  const [moduliCustom, setModuliCustom] = useState([]);

  const caricaModuli = useCallback(async () => {
    try {
      const res = await fetch("/api/v2/moduli");
      const json = await res.json();
      setModuliCustom(Array.isArray(json) ? json : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { caricaModuli(); }, [caricaModuli]);

  const baseClass =
    "whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0 border";
  const activeClass =
    "bg-indigo-500/15 border-indigo-500/50 text-indigo-200";
  const inactiveClass =
    "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-200";

  return (
    <nav
      className="flex gap-2 overflow-x-auto no-scrollbar flex-wrap"
      aria-label="Filtri sezione prodotti"
    >
      {FILTRI_FISSI.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setSezioneAttiva(key)}
          className={`${baseClass} ${sezioneAttiva === key ? activeClass : inactiveClass}`}
          aria-pressed={sezioneAttiva === key}
          type="button"
        >
          {label}
        </button>
      ))}

      {/* Moduli custom dinamici */}
      {moduliCustom.map(m => {
        const key = `modulo:${m.slug}`;
        return (
          <button
            key={key}
            onClick={() => setSezioneAttiva(key)}
            className={`${baseClass} ${sezioneAttiva === key ? activeClass : inactiveClass}`}
            type="button"
          >
            <span className="mr-1">{m.icona}</span>
            {m.label}
          </button>
        );
      })}

      {/* Pulsante "+" per creare nuovo modulo */}
      <button
        onClick={() => onNuovoModulo?.(caricaModuli)}
        type="button"
        title="Crea nuovo modulo personalizzato"
        className="whitespace-nowrap px-2.5 py-1.5 rounded-md border border-dashed border-slate-700 bg-slate-900/40 text-slate-500 hover:bg-slate-800 hover:border-slate-600 hover:text-slate-300 transition-colors flex-shrink-0 flex items-center"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </nav>
  );
};

export default FiltroSezioni;
