import React, { useState, useEffect } from "react";

const GestioneProdottiFornitore = () => {
  const [fornitori, setFornitori] = useState([]);
  const [prodottiSfuso, setProdottiSfuso] = useState([]);
  const [fornitoreSelezionato, setFornitoreSelezionato] = useState("");
  const [prodottiAssociati, setProdottiAssociati] = useState([]);
  const [ricercaProdotto, setRicercaProdotto] = useState("");
  const [prodottoSelezionato, setProdottoSelezionato] = useState(null);
  const [prezzo, setPrezzo] = useState("");
  const [note, setNote] = useState("");

  // 🔹 Carica fornitori e prodotti sfuso
  useEffect(() => {
    fetch("http://localhost:3005/api/v2/fornitori")
      .then((r) => r.json())
      .then(setFornitori)
      .catch((e) => console.error("Errore fornitori:", e));

    fetch("http://localhost:3005/api/v2/prodotti-sfuso")
      .then((r) => r.json())
      .then(setProdottiSfuso)
      .catch((e) => console.error("Errore prodotti sfuso:", e));
  }, []);

  // 🔹 Quando seleziono un fornitore, carico i suoi prodotti collegati
  const caricaProdottiAssociati = async (idFornitore) => {
    if (!idFornitore) return;
    const res = await fetch(`http://localhost:3005/api/v2/fornitori-prodotti/${idFornitore}/catalogo`);
    const data = await res.json();
    setProdottiAssociati(data.associati);
    setProdottiSfuso(data.disponibili);
  };

  const handleAssocia = async () => {
    if (!fornitoreSelezionato || !prodottoSelezionato) {
      alert("Seleziona fornitore e prodotto!");
      return;
    }

    const body = {
      id_sfuso: prodottoSelezionato.id,
      prezzo: prezzo || 0,
      note,
    };

    const res = await fetch(`/api/v2/fornitori-prodotti/${fornitoreSelezionato}/prodotti`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      alert("✅ Prodotto associato con successo!");
      setPrezzo("");
      setNote("");
      setProdottoSelezionato(null);
      setRicercaProdotto(""); // pulisce solo il campo ricerca
      caricaProdottiAssociati(fornitoreSelezionato);
    } else {
      alert("❌ Errore durante l'associazione");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminare l'associazione?")) return;
    await fetch(`/api/v2/fornitori-prodotti/${id}`, { method: "DELETE" });
    caricaProdottiAssociati(fornitoreSelezionato);
  };

  // 🔹 Filtro ricerca prodotto
  const prodottiFiltrati = prodottiSfuso.filter((p) =>
    p.nome.toLowerCase().includes(ricercaProdotto.toLowerCase())
  );

  return (
    <div className="bg-white/10 p-6 rounded-lg text-white mt-8">
      <h2 className="text-2xl font-bold mb-4">🔗 Gestione Prodotti Fornitore</h2>

      {/* Selezione fornitore */}
      <div className="mb-4">
        <label className="block mb-1">Fornitore</label>
        <select
          className="p-2 bg-zinc-800 border border-zinc-700 rounded w-full"
          value={fornitoreSelezionato}
          onChange={(e) => {
            setFornitoreSelezionato(e.target.value);
            caricaProdottiAssociati(e.target.value);
          }}
        >
          <option value="">-- Seleziona un fornitore --</option>
          {fornitori.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Ricerca prodotto */}
      <div className="mb-4">
        <label className="block mb-1">Cerca prodotto sfuso</label>
        <input
          type="text"
          value={ricercaProdotto}
          onChange={(e) => setRicercaProdotto(e.target.value)}
          placeholder="Es. Cleaner, Primer..."
          className="p-2 bg-zinc-800 border border-zinc-700 rounded w-full"
        />
        {ricercaProdotto && (
          <div className="max-h-40 overflow-y-auto bg-zinc-900 mt-2 rounded">
            {prodottiFiltrati.slice(0, 10).map((p) => (
              <div
                key={p.id}
                className="p-2 hover:bg-zinc-700 cursor-pointer text-sm"
                onClick={() => {
                  setProdottoSelezionato(p);
                  setRicercaProdotto(p.nome);
                }}
              >
                {p.nome} ({p.formato})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dettagli e prezzo */}
      {prodottoSelezionato && (
        <div className="mb-4 border border-zinc-700 p-3 rounded">
          <p>
            <strong>Prodotto selezionato:</strong> {prodottoSelezionato.nome} ({prodottoSelezionato.formato})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <input
              type="number"
              placeholder="Prezzo"
              value={prezzo}
              onChange={(e) => setPrezzo(e.target.value)}
              className="p-2 bg-zinc-800 border border-zinc-700 rounded"
            />
            <input
              type="text"
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="p-2 bg-zinc-800 border border-zinc-700 rounded"
            />
          </div>
          <button
            onClick={handleAssocia}
            className="mt-3 bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            ➕ Associa prodotto
          </button>
        </div>
      )}

      {/* Elenco prodotti già associati */}
      {prodottiAssociati.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">📦 Prodotti associati</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800">
                <th className="p-2 text-left">Nome</th>
                <th className="p-2">Formato</th>
                <th className="p-2">Prezzo</th>
                <th className="p-2">Note</th>
                <th className="p-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {prodottiAssociati.map((p) => (
                <tr key={p.id} className="border-b border-zinc-700">
                  <td className="p-2">{p.nome}</td>
                  <td className="p-2 text-center">{p.formato}</td>
                  <td className="p-2 text-center">€ {p.prezzo?.toFixed(2)}</td>
                  <td className="p-2">{p.note || "-"}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GestioneProdottiFornitore;
