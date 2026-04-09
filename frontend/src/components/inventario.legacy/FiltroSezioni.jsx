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

  // Espone caricaModuli al parent via callback (per refresh dopo creazione)
  useEffect(() => {
    if (typeof onNuovoModulo === "function") {
      // Niente — il parent può forzare il refresh chiamando un proprio meccanismo
    }
  }, [onNuovoModulo]);

  return (
    <nav
      className="mb-4 flex gap-3 overflow-x-auto no-scrollbar justify-center flex-wrap"
      aria-label="Filtri sezione prodotti"
    >
      {FILTRI_FISSI.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setSezioneAttiva(key)}
          className={`whitespace-nowrap px-4 py-2 rounded font-semibold transition-colors flex-shrink-0
            ${sezioneAttiva === key
              ? "bg-purple-700 text-white"
              : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
            }`}
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
            className={`whitespace-nowrap px-4 py-2 rounded font-semibold transition-colors flex-shrink-0
              ${sezioneAttiva === key
                ? "bg-purple-700 text-white"
                : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
              }`}
            type="button"
          >
            {m.icona} {m.label}
          </button>
        );
      })}

      {/* Pulsante "+" per creare nuovo modulo */}
      <button
        onClick={() => onNuovoModulo?.(caricaModuli)}
        className="whitespace-nowrap px-3 py-2 rounded font-semibold bg-zinc-800 border-2 border-dashed border-zinc-600 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-500 hover:text-white transition-colors flex-shrink-0 flex items-center gap-1"
        type="button"
        title="Crea nuovo modulo personalizzato"
      >
        <Plus className="w-4 h-4" />
      </button>
    </nav>
  );
};

export default FiltroSezioni;
