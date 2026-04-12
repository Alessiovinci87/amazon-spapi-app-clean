import React, { useState, useRef, useEffect } from "react";

const paesi = [
  { codice: "IT", nome: "Italia" },
  { codice: "FR", nome: "Francia" },
  { codice: "DE", nome: "Germania" },
  { codice: "ES", nome: "Spagna" },
  { codice: "UK", nome: "Regno Unito" },
  { codice: "NL", nome: "Paesi Bassi" },
  { codice: "SE", nome: "Svezia" },
  { codice: "PL", nome: "Polonia" },
  { codice: "BE", nome: "Belgio" },
  { codice: "IE", nome: "Irlanda" },
];

const DropdownLinguePortal = ({ paese, setPaese }) => {
  const [aperto, setAperto] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const chiudiDropdown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setAperto(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setAperto(false);
    };

    document.addEventListener("mousedown", chiudiDropdown);
    document.addEventListener("touchstart", chiudiDropdown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", chiudiDropdown);
      document.removeEventListener("touchstart", chiudiDropdown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const seleziona = (valore) => {
    setPaese(valore);
    setAperto(false);
  };

  return (
    <div ref={ref} className="relative inline-block text-left mb-6">
      <button
        onClick={() => setAperto((a) => !a)}
        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition font-medium text-sm text-slate-200 flex items-center gap-2"
        aria-haspopup="listbox"
        aria-expanded={aperto}
        type="button"
      >
        <img
          src={`https://flagcdn.com/w20/${paese.toLowerCase()}.png`}
          alt={`${paese} flag`}
          className="w-5 h-4 rounded-sm"
          loading="lazy"
        />
        {paese}
      </button>

      {aperto && (
        <div
          className="absolute left-0 mt-2 w-48 rounded-lg shadow-lg bg-slate-800 border border-slate-700 z-50 max-h-64 overflow-y-auto"
          role="listbox"
          tabIndex={-1}
        >
          {paesi.map(({ codice, nome }) => (
            <button
              key={codice}
              onClick={() => seleziona(codice)}
              className={`flex items-center gap-3 w-full px-4 py-2 hover:bg-slate-700 transition text-left text-sm ${
                codice === paese ? "text-indigo-400 font-semibold" : "text-slate-200"
              }`}
              role="option"
              aria-selected={codice === paese}
              type="button"
            >
              <img
                src={`https://flagcdn.com/w20/${codice.toLowerCase()}.png`}
                alt={`${nome} flag`}
                className="w-5 h-4 rounded-sm"
                loading="lazy"
              />
              {nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownLinguePortal;
