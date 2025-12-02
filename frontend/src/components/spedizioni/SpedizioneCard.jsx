import React, { useState } from "react";

const SpedizioneCard = ({ spedizioni, onDelete, onConferma, onExport, onUpdate }) => {
  if (!spedizioni || spedizioni.length === 0) {
    return <p className="text-gray-400">Nessuna spedizione inserita.</p>;
  }

  return (
    <div className="space-y-4">
      {spedizioni.map((s) => (
        <EditableCard
          key={s.id}
          spedizione={s}
          onDelete={onDelete}
          onConferma={onConferma}
          onExport={onExport}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
};

const EditableCard = ({ spedizione, onDelete, onConferma, onExport, onUpdate }) => {
  const [editMode, setEditMode] = useState(false);
  const [paese, setPaese] = useState(spedizione.paese);
  const [righe, setRighe] = useState(spedizione.righe || []);

  

  const updateQuantita = (index, value) => {
    const nuoveRighe = [...righe];
    nuoveRighe[index].quantita = value;
    setRighe(nuoveRighe);
  };
  

  const removeRiga = (index) => {
    const nuoveRighe = righe.filter((_, i) => i !== index);
    setRighe(nuoveRighe);
  };
  

  const salvaModifiche = () => {
  const conferma = window.confirm("Vuoi salvare le modifiche alla spedizione?");
  if (!conferma) return;

  onUpdate(spedizione.id, { paese, righe });
  setEditMode(false);
};

  return (
    <div className="bg-zinc-700 p-4 rounded-lg shadow flex flex-col gap-2">
      {/* intestazione */}
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">
          📦 Spedizione {spedizione.progressivo} – {paese}
        </h3>
        <span
          className={`px-2 py-1 rounded text-sm ${spedizione.stato === "BOZZA"
              ? "bg-yellow-600 text-white"
              : "bg-green-600 text-white"
            }`}
        >
          {spedizione.stato}
        </span>
      </div>

      {/* dettagli */}
      <p>
        📅 {spedizione.data || "N/D"} | 👷 {spedizione.operatore || "N/D"}
      </p>
      {spedizione.note && <p>📝 {spedizione.note}</p>}

      {/* contenuto card */}
      {editMode ? (
        <>
          {/* modifica paese */}
          <div className="mb-2">
            <label className="mr-2">Paese:</label>
            <input
              type="text"
              value={paese}
              onChange={(e) => setPaese(e.target.value)}
              className="px-2 py-1 rounded text-white"
            />
          </div>

          {/* righe in modifica */}
          <ul className="space-y-1">
            {righe.map((r, i) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="flex-1">{r.prodotto_nome}</span>
                <input
                  type="number"
                  value={r.quantita}
                  onChange={(e) => updateQuantita(i, e.target.value)}
                  className="w-20 px-2 py-1 rounded text-white"
                />
                <button
                  onClick={() => removeRiga(i)}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                >
                  ❌
                </button>
              </li>
            ))}
          </ul>

          {/* bottoni salvataggio */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={salvaModifiche}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
            >
              💾 Salva
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center gap-2"
            >
              <span role="img" aria-label="exit">🚪</span> Esci
            </button>
          </div>
        </>
      ) : (
        <>
          {/* righe prodotto */}
          {spedizione.righe && spedizione.righe.length > 0 && (
            <ul className="list-disc list-inside text-sm space-y-1">
              {spedizione.righe.map((r) => (
                <li key={r.id}>
                  {r.prodotto_nome} – {r.quantita} pezzi
                </li>
              ))}
            </ul>
          )}

          {/* bottoni azione */}
          <div className="flex gap-2 mt-3">
            {spedizione.stato === "BOZZA" && (
              <>
                <button
                  onClick={() => onConferma(spedizione.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                >
                  ✅ Conferma
                </button>
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded"
                >
                  ✏️ Modifica
                </button>
              </>
            )}
            <button
              onClick={() => onDelete(spedizione.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              ❌ Elimina
            </button>
            <button
              onClick={() => onExport(spedizione)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              📥 Esporta CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SpedizioneCard;
