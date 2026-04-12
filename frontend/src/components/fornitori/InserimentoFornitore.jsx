import React, { useState } from "react";
import { Plus } from "lucide-react";

const InserimentoFornitore = ({ onFornitoreAggiunto }) => {
  const [fornitore, setFornitore] = useState({
    nome: "",
    partitaIva: "",
    indirizzo: "",
    email: "",
    telefono: "",
  });

  const salvaFornitore = async () => {
    await fetch("/api/v2/fornitori", {
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
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-6 mt-8">
      <h2 className="text-lg font-semibold mb-4 text-slate-100 flex items-center gap-2">
        <Plus size={18} className="text-emerald-400" />
        Inserisci Nuovo Fornitore
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          placeholder="Nome"
          value={fornitore.nome}
          onChange={(e) => setFornitore({ ...fornitore, nome: e.target.value })}
        />
        <input
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          placeholder="Partita IVA"
          value={fornitore.partitaIva}
          onChange={(e) => setFornitore({ ...fornitore, partitaIva: e.target.value })}
        />
        <input
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          placeholder="Indirizzo"
          value={fornitore.indirizzo}
          onChange={(e) => setFornitore({ ...fornitore, indirizzo: e.target.value })}
        />
        <input
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          placeholder="Email"
          value={fornitore.email}
          onChange={(e) => setFornitore({ ...fornitore, email: e.target.value })}
        />
        <input
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          placeholder="Telefono"
          value={fornitore.telefono}
          onChange={(e) => setFornitore({ ...fornitore, telefono: e.target.value })}
        />
      </div>

      <button
        onClick={salvaFornitore}
        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-sm font-medium transition-colors"
      >
        Salva Fornitore
      </button>
    </div>
  );
};

export default InserimentoFornitore;
