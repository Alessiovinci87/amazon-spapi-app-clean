import React, { useState } from "react";

const ProduzioneCard = ({ formato, selectedProdotto, sfusoData, onPrenota }) => {
  const [pezzi, setPezzi] = useState("");
  const [priorita, setPriorita] = useState("Media");
  const [note, setNote] = useState("");

  // 🔍 Trova lo sfuso collegato al prodotto selezionato
  const sfusoCollegato = sfusoData.find((s) => {
    if (!selectedProdotto || !s.asin_collegati) return false;

    const asinList = JSON.parse(s.asin_collegati || "[]");
    return (
      s.formato?.toLowerCase() === formato?.toLowerCase() &&
      asinList.some(
        (asin) =>
          asin?.toLowerCase() === selectedProdotto.asin?.toLowerCase()
      )
    );
  });

  // 🔹 Estrai i dati principali (con fallback)
  const lottoNew = sfusoCollegato?.lotto || "-";
  const lottoOld = sfusoCollegato?.lotto_old || "-";
  const litriNew = sfusoCollegato?.litri_disponibili?.toFixed(2) || 0;
  const litriOld = sfusoCollegato?.litri_disponibili_old?.toFixed(2) || 0;

  // 🔹 Gestione prenotazione
  const handlePrenota = () => {
    if (!selectedProdotto) {
      alert("⚠️ Seleziona prima un prodotto dall'inventario.");
      return;
    }

    if (!sfusoCollegato) {
      alert("❌ Nessun sfuso collegato trovato per questo formato.");
      return;
    }

    if (!pezzi || pezzi <= 0) {
      alert("⚠️ Inserisci un numero valido di pezzi.");
      return;
    }

    const prenotazione = {
      formato,
      pezzi: Number(pezzi),
      priorita,
      note,
      lotto: lottoNew,
      asin_prodotto: selectedProdotto.asin,
      id_sfuso: sfusoCollegato.id,
    };

    onPrenota(prenotazione);
    setPezzi("");
    setNote("");
    setPriorita("Media");
  };

  return (
    <div className="bg-zinc-800 p-4 rounded-xl shadow-md mb-6">
      <h2 className="text-lg font-semibold mb-3 text-white">
        🧴 Produzione {formato.toUpperCase()}
      </h2>

      {sfusoCollegato ? (
        <div className="text-sm text-zinc-300 space-y-1 mb-3">
          <p>
            <strong>Lotto OLD:</strong> {lottoOld} |{" "}
            <strong>Disponibili:</strong> {litriOld} L
          </p>
          <p>
            <strong>Lotto NEW:</strong> {lottoNew} |{" "}
            <strong>Disponibili:</strong> {litriNew} L
          </p>
        </div>
      ) : (
        <p className="text-zinc-500 italic mb-2">
          Nessun sfuso trovato per questo formato.
        </p>
      )}

      <input
        type="number"
        placeholder="N° pezzi da produrre"
        value={pezzi}
        onChange={(e) => setPezzi(e.target.value)}
        className="w-full bg-zinc-700 text-white p-2 rounded mb-3"
      />

      <select
        value={priorita}
        onChange={(e) => setPriorita(e.target.value)}
        className="w-full bg-zinc-700 text-white p-2 rounded mb-3"
      >
        <option>Alta</option>
        <option>Media</option>
        <option>Bassa</option>
      </select>

      <textarea
        placeholder="Aggiungi note (opzionale)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full bg-zinc-700 text-white p-2 rounded mb-3"
      />

      <button
        onClick={handlePrenota}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded"
      >
        ➕ Prenota produzione
      </button>
    </div>
  );
};

export default ProduzioneCard;
