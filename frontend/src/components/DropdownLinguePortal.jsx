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
        className="px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-md hover:bg-zinc-700 transition font-semibold flex items-center gap-2"
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
          className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-zinc-800 border border-zinc-600 z-50 max-h-64 overflow-y-auto"
          role="listbox"
          tabIndex={-1}
        >
          {paesi.map(({ codice, nome }) => (
            <button
              key={codice}
              onClick={() => seleziona(codice)}
              className={`flex items-center gap-3 w-full px-4 py-2 hover:bg-zinc-700 transition text-left ${
                codice === paese ? "text-purple-400 font-bold" : "text-white"
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
