// src/components/inventario/AccessorioCard.jsx
import React, { useState, useEffect } from "react";

const normalizzaAsinAccessorio = (nome, asin_accessorio) => {
  return asin_accessorio || nome.replace(/\s+/g, "_").toUpperCase();
};

const RettificaModal = ({ asin, valoreAttuale, onClose, onConferma }) => {
  const [nuovoPronto, setNuovoPronto] = useState(valoreAttuale);
  const [nota, setNota] = useState("");
  const [operatore, setOperatore] = useState("");
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  const handleSubmit = async () => {
    if (!nota.trim() || !operatore.trim()) {
      setErrore("Nota e operatore sono obbligatori");
      return;
    }
    setErrore("");
    setLoading(true);

    try {
      const res = await fetch(`/api/v2/accessori/${asin}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantita: Number(nuovoPronto),
          note: nota,
          operatore,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nella rettifica");

      onConferma(data);
      onClose();
    } catch (err) {
      console.error("❌ Errore rettifica:", err);
      setErrore(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-800 text-white rounded-xl p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4">Rettifica Quantità</h2>

        <div className="mb-3">
          <label className="block text-sm mb-1">Nuovo valore pronto</label>
          <input
            type="number"
            value={nuovoPronto}
            onChange={(e) => setNuovoPronto(e.target.value)}
            className="w-full p-2 rounded bg-zinc-700 text-white"
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm mb-1">Nota (obbligatoria)</label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full p-2 rounded bg-zinc-700 text-white"
            rows={2}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-1">Operatore</label>
          <select
            value={operatore}
            onChange={(e) => setOperatore(e.target.value)}
            className="w-full p-2 rounded bg-zinc-700 text-white"
          >
            <option value="">-- Seleziona --</option>
            <option value="Guido">Guido</option>
            <option value="David">David</option>
            <option value="Alessio">Alessio</option>
            <option value="Tony">Tony</option>
          </select>
        </div>

        {errore && <p className="text-red-400 text-sm mb-2">{errore}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-zinc-600 hover:bg-zinc-700 px-4 py-2 rounded"
            type="button"
            disabled={loading}
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            type="button"
            disabled={loading}
          >
            {loading ? "Salvataggio..." : "Conferma"}
          </button>
        </div>
      </div>
    </div>
  );
};

const AccessorioCard = ({
  asin_accessorio,
  nome,
  quantita,
  immagine,
  fetchAccessori,
  layout = "default", // "default" o "small"
}) => {
  const asinAccessorioFinale = normalizzaAsinAccessorio(nome, asin_accessorio);

  const [quantitaLocale, setQuantitaLocale] = useState(quantita || 0);
  const [feedbackSalvato, setFeedbackSalvato] = useState(false);
  const [showRettifica, setShowRettifica] = useState(false);

  useEffect(() => {
    setQuantitaLocale(quantita || 0);
  }, [quantita]);

  // --- Layout compatto (griglia quadrata) ---
  // --- Layout largo in riga (tipo rettangolo blu) ---
if (layout === "small") {
  return (
    <div className="bg-zinc-800 text-white rounded-xl shadow-md flex flex-col items-center justify-between p-6 w-full h-68">
      {/* Immagine grande */}
      <img
        src={immagine || "/images/inventario/placeholder.jpg"}
        alt={nome}
        className="w-20 h-20 object-contain mb-4"
        loading="lazy"
      />

      {/* Nome e quantità */}
      <h3 className="text-lg font-bold text-center mb-1">{nome}</h3>
      <p className="text-sm text-yellow-400 mb-3">Q.tà: {quantitaLocale}</p>

      {/* Bottone rettifica */}
      <button
        onClick={() => setShowRettifica(true)}
        className="bg-orange-600 hover:bg-orange-700 px-4 py-2 text-sm rounded w-full"
        type="button"
      >
        ✏️ Rettifica
      </button>

      {showRettifica && (
        <RettificaModal
          asin={asinAccessorioFinale}
          valoreAttuale={quantitaLocale}
          onClose={() => setShowRettifica(false)}
          onConferma={(data) => setQuantitaLocale(data.pronto)}
        />
      )}
    </div>
  );
}


  // --- Layout grande (dettaglio classico) ---
  return (
    <div className="bg-zinc-800 text-white p-4 sm:p-6 rounded-xl shadow-md flex flex-col lg:flex-row gap-6 mb-6 w-full items-center">
      <div className="flex-shrink-0">
        <img
          src={immagine || "/images/inventario/placeholder.jpg"}
          alt={nome}
          className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded"
          loading="lazy"
        />
      </div>

      <div className="flex-1 w-full max-w-full">
        <h2 className="text-xl font-bold mb-2">{nome}</h2>
        <p className="text-sm text-zinc-400 mb-4 truncate">
          ASIN: {asinAccessorioFinale}
        </p>
        <p className="text-sm text-yellow-400 mb-4">
          Quantità disponibile: {quantitaLocale}
        </p>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setShowRettifica(true)}
            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded flex-1"
            type="button"
          >
            ✏️ Rettifica
          </button>
        </div>
      </div>

      {showRettifica && (
        <RettificaModal
          asin={asinAccessorioFinale}
          valoreAttuale={quantitaLocale}
          onClose={() => setShowRettifica(false)}
          onConferma={(data) => setQuantitaLocale(data.pronto)}
        />
      )}
    </div>
  );
};

export default AccessorioCard;
