import React from "react";

const FiltroSezioni = ({ sezioneAttiva, setSezioneAttiva }) => {
  const filtri = [
    { key: "12ml", label: "12 ml" },
    { key: "100ml", label: "100 ml" },
    { key: "kit", label: "KIT" },
    { key: "5litri", label: "5 litri" },
    { key: "accessori", label: "Accessori" },
  ];

  return (
    <nav
      className="mb-4 flex gap-3 overflow-x-auto no-scrollbar justify-center"
      aria-label="Filtri sezione prodotti"
    >
      {filtri.map(({ key, label }) => (
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
    </nav>
  );
};

export default FiltroSezioni;
