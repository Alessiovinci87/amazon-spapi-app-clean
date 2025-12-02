import React, { useState } from "react";

const InserimentoFornitore = ({ onFornitoreAggiunto }) => {
  const [fornitore, setFornitore] = useState({
    nome: "",
    partitaIva: "",
    indirizzo: "",
    email: "",
    telefono: "",
  });

  const salvaFornitore = async () => {
    await fetch("http://localhost:3005/api/v2/fornitori", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fornitore),
    });
    if (onFornitoreAggiunto) onFornitoreAggiunto();
    setFornitore({
      nome: "",
      partitaIva: "",
      indirizzo: "",
      email: "",
      telefono: "",
    });
  };

  return (
    <div className="bg-white/10 p-6 rounded-lg mt-8 shadow-md">
      <h2 className="text-xl font-semibold mb-4">➕ Inserisci Nuovo Fornitore</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          className="p-2 rounded bg-zinc-800 text-white border border-zinc-600"
          placeholder="Nome"
          value={fornitore.nome}
          onChange={(e) => setFornitore({ ...fornitore, nome: e.target.value })}
        />
        <input
          className="p-2 rounded bg-zinc-800 text-white border border-zinc-600"
          placeholder="Partita IVA"
          value={fornitore.partitaIva}
          onChange={(e) => setFornitore({ ...fornitore, partitaIva: e.target.value })}
        />
        <input
          className="p-2 rounded bg-zinc-800 text-white border border-zinc-600"
          placeholder="Indirizzo"
          value={fornitore.indirizzo}
          onChange={(e) => setFornitore({ ...fornitore, indirizzo: e.target.value })}
        />
        <input
          className="p-2 rounded bg-zinc-800 text-white border border-zinc-600"
          placeholder="Email"
          value={fornitore.email}
          onChange={(e) => setFornitore({ ...fornitore, email: e.target.value })}
        />
        <input
          className="p-2 rounded bg-zinc-800 text-white border border-zinc-600"
          placeholder="Telefono"
          value={fornitore.telefono}
          onChange={(e) => setFornitore({ ...fornitore, telefono: e.target.value })}
        />
      </div>

      <button
        onClick={salvaFornitore}
        className="mt-4 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
      >
        ✅ Salva Fornitore
      </button>
    </div>
  );
};

export default InserimentoFornitore;
