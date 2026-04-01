// frontend/components/fornitori/ListaFornitori.jsx
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const ListaFornitori = () => {
  const [fornitori, setFornitori] = useState([]);
  const [ordiniFornitore, setOrdiniFornitore] = useState({});
  const [prodottiFornitore, setProdottiFornitore] = useState({});
  const [mostra, setMostra] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [formEdit, setFormEdit] = useState({});

  // 🔹 Carica lista fornitori all'avvio
  useEffect(() => {
    fetch("http://localhost:3005/api/v2/fornitori")
      .then((res) => res.json())
      .then((data) => setFornitori(data))
      .catch((err) => console.error("❌ Errore caricamento fornitori:", err));
  }, []);

  // 🔹 Espande/chiude un fornitore e carica i suoi ordini
  const handleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    try {
      const [ordiniRes, prodottiRes] = await Promise.all([
        fetch(`http://localhost:3005/api/v2/fornitori/${id}/ordini`),
        fetch(`http://localhost:3005/api/v2/fornitori/${id}/prodotti`),
      ]);

      const [ordiniData, prodottiData] = await Promise.all([
        ordiniRes.json(),
        prodottiRes.json(),
      ]);

      setOrdiniFornitore((prev) => ({ ...prev, [id]: ordiniData }));
      setProdottiFornitore((prev) => ({ ...prev, [id]: prodottiData }));
    } catch (err) {
      console.error("❌ Errore caricamento dettagli fornitore:", err);
    }
  };





  // 🔹 Elimina tutti gli ordini del fornitore
  const handleDeleteOrdiniFornitore = async (idFornitore) => {
    if (!window.confirm("Vuoi eliminare tutti gli ordini di questo fornitore?")) return;

    try {
      const res = await fetch(`http://localhost:3005/api/v2/fornitori/${idFornitore}/ordini`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.ok) {
        toast.success("Ordini del fornitore eliminati");
        setOrdiniFornitore((prev) => ({ ...prev, [idFornitore]: [] }));
      } else {
        toast.error("Errore durante l'eliminazione degli ordini");
      }
    } catch (err) {
      console.error("❌ Errore eliminazione ordini fornitore:", err);
    }
  };


  // 🔹 Attiva modalità modifica
  const handleEdit = (f) => {
    setEditId(f.id);
    setFormEdit(f);
  };

  // 🔹 Gestione input form di modifica
  const handleEditChange = (campo, valore) => {
    setFormEdit((prev) => ({ ...prev, [campo]: valore }));
  };

  // 🔹 Salva modifiche
  const salvaModifiche = async () => {
    try {
      const res = await fetch(`http://localhost:3005/api/v2/fornitori/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formEdit),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Fornitore aggiornato correttamente");
        setEditId(null);
        // Aggiorna lista
        const updated = await fetch("http://localhost:3005/api/v2/fornitori").then((r) =>
          r.json()
        );
        setFornitori(updated);
      } else {
        toast.error("Errore durante l'aggiornamento");
      }
    } catch (err) {
      console.error("❌ Errore aggiornamento fornitore:", err);
    }
  };


  // 🔹 Elimina UN ordine dato il suo id (NON il fornitore)
  const handleDeleteOrdine = async (idOrdine, idFornitore) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo ordine?")) return;

    try {
      console.log("🟡 ID ordine da cancellare:", idOrdine);
      const response = await fetch(`http://localhost:3005/api/v2/fornitori/ordini/${idOrdine}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.ok) {
        toast.success("Ordine eliminato correttamente");
        // Rimuovi l'ordine dallo stato locale
        setOrdiniFornitore((prev) => {
          const nuovo = { ...prev };
          delete nuovo[idFornitore];
          return nuovo;
        });

        // 🧹 svuota anche i prodotti collegati
        setProdottiFornitore((prev) => {
          const nuovo = { ...prev };
          delete nuovo[idFornitore];
          return nuovo;
        });

      } else {
        toast.error(data.message || "Errore durante l'eliminazione");
      }
    } catch (err) {
      console.error("❌ Errore eliminazione ordine:", err);
      toast.error("Errore imprevisto durante l'eliminazione");
    }
  };





  return (
    <div className="mb-6">
      {/* 
      <button
        onClick={() => setMostra(!mostra)}
        className="mb-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
      >
        📋 {mostra ? "Nascondi Elenco Fornitori" : "Mostra Elenco Fornitori"}
      </button>
      */}

      {mostra && (
        <div className="overflow-x-auto bg-white/10 rounded-lg p-4">
          <table className="w-full text-white table-auto">
            <thead>
              <tr className="bg-zinc-800 text-sm text-left">
                <th className="p-2">Nome</th>
                <th className="p-2">P.IVA</th>
                <th className="p-2">Indirizzo</th>
                <th className="p-2">Email</th>
                <th className="p-2">Telefono</th>
                <th className="p-2 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {fornitori.map((f) => (
                <React.Fragment key={f.id}>
                  <tr
                    onClick={() => handleExpand(f.id)}
                    className="border-b border-zinc-700 hover:bg-zinc-800 cursor-pointer"
                  >
                    {editId === f.id ? (
                      <>
                        <td className="p-2">
                          <input
                            value={formEdit.nome || ""}
                            onChange={(e) => handleEditChange("nome", e.target.value)}
                            className="bg-zinc-900 text-white p-1 rounded w-full"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={formEdit.partitaIva || ""}
                            onChange={(e) => handleEditChange("partitaIva", e.target.value)}
                            className="bg-zinc-900 text-white p-1 rounded w-full"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={formEdit.indirizzo || ""}
                            onChange={(e) => handleEditChange("indirizzo", e.target.value)}
                            className="bg-zinc-900 text-white p-1 rounded w-full"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={formEdit.email || ""}
                            onChange={(e) => handleEditChange("email", e.target.value)}
                            className="bg-zinc-900 text-white p-1 rounded w-full"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={formEdit.telefono || ""}
                            onChange={(e) => handleEditChange("telefono", e.target.value)}
                            className="bg-zinc-900 text-white p-1 rounded w-full"
                          />
                        </td>
                        <td className="p-2 text-right space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(f);
                            }}
                            className="text-blue-400 hover:text-blue-200"
                          >
                            ✏️
                          </button>
                        </td>


                      </>
                    ) : (
                      <>
                        <td className="p-2 font-semibold">{f.nome}</td>
                        <td className="p-2">{f.partitaIva}</td>
                        <td className="p-2">{f.indirizzo}</td>
                        <td className="p-2">{f.email}</td>
                        <td className="p-2">{f.telefono}</td>
                        <td className="p-2 text-right space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(f);
                            }}
                            className="text-blue-400 hover:text-blue-200"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const lista = ordiniFornitore[f.id] || [];
                              if (!lista.length) {
                                toast.info("Nessun ordine per questo fornitore.");
                                return;
                              }
                              const ordineTarget =
                                lista.find((o) => o.stato === "In attesa") || lista[0]; // priorità a "In attesa", altrimenti il primo
                              handleDeleteOrdine(ordineTarget.id, f.id);
                            }}
                            className="text-red-400 hover:text-red-200"
                          >
                            🗑️
                          </button>

                        </td>
                      </>
                    )}
                  </tr>

                  {expandedId === f.id && (
                    <tr>
                      <td colSpan={6} className="bg-zinc-900 p-4">
                        {/* 🧴 Prodotti del fornitore */}
                        <h4 className="text-lg font-bold mb-2 flex justify-between items-center">
                          <span>🧴 Prodotti trattati da {f.nome}</span>
                          {(ordiniFornitore[f.id] && ordiniFornitore[f.id].length > 0) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const lista = ordiniFornitore[f.id] || [];
                                const ordineTarget =
                                  lista.find((o) => o.stato === "In attesa") || lista[0];
                                if (window.confirm(`Vuoi eliminare l'ordine ${ordineTarget.id}?`)) {
                                  handleDeleteOrdine(ordineTarget.id, f.id);
                                }
                              }}
                              className="text-red-400 hover:text-red-200 text-sm"
                            >
                              🗑️ Elimina ordine
                            </button>
                          )}


                        </h4>

                        {prodottiFornitore[f.id]?.length > 0 ? (
                          <table className="w-full text-sm mb-4 border border-zinc-800">
                            <thead>
                              <tr className="bg-zinc-800">
                                <th className="p-2 text-left">Prodotto</th>
                                <th className="p-2">Formato</th>
                                <th className="p-2">Prezzo (€)</th>
                                <th className="p-2">Note</th>
                              </tr>
                            </thead>
                            <tbody>
                              {prodottiFornitore[f.id].map((p) => {
                                const ordiniProdotto = (ordiniFornitore[f.id] || []).filter(
                                  (o) => Number(o.id_sfuso) === Number(p.id_sfuso || p.id)
                                );

                                return (
                                  <React.Fragment key={p.id_sfuso || p.id}>
                                    {/* Riga principale: prodotto */}
                                    <tr className="border-t border-zinc-800 bg-zinc-900/50">
                                      <td className="p-2 text-left font-semibold">{p.nome}</td>
                                      <td className="p-2 text-center">{p.formato}</td>
                                      <td className="p-2 text-center">€ {p.prezzo}</td>
                                      <td className="p-2">{p.note || "-"}</td>
                                    </tr>

                                    {/* Ordini collegati al prodotto */}
                                    {ordiniProdotto.length > 0 ? (
                                      ordiniProdotto.map((o) => (
                                        <tr key={o.id} className="text-sm border-t border-zinc-800">
                                          <td colSpan={2} className="pl-8 text-zinc-300">
                                            {new Date(o.data_ordine).toLocaleDateString("it-IT")} —{" "}
                                            <span className="text-green-400">
                                              {o.quantita_litri} L
                                            </span>{" "}
                                            — <span className="italic text-yellow-300">{o.stato}</span>
                                          </td>
                                          <td colSpan={2} className="text-right pr-4">
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (
                                                  window.confirm(
                                                    "Eliminare questa riga d'ordine?"
                                                  )
                                                ) {
                                                  const res = await fetch(
                                                    `http://localhost:3005/api/v2/fornitori/ordini/${o.id}`,
                                                    { method: "DELETE" }
                                                  );
                                                  const data = await res.json();
                                                  if (data.ok) {
                                                    toast.success("Riga d'ordine eliminata");
                                                    setOrdiniFornitore((prev) => ({
                                                      ...prev,
                                                      [f.id]: prev[f.id].filter(
                                                        (r) => r.id !== o.id
                                                      ),
                                                    }));
                                                  } else {
                                                    toast.error("Errore eliminazione ordine");
                                                  }
                                                }
                                              }}
                                              className="text-red-400 hover:text-red-200"
                                            >
                                              🗑️
                                            </button>
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr className="border-t border-zinc-800">
                                        <td colSpan={4} className="pl-8 text-gray-500 italic">
                                          Nessun ordine per questo prodotto
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-sm text-gray-400 italic mb-4">
                            Nessun prodotto associato a questo fornitore.
                          </p>
                        )}

                        {/* 🧾 Ordini non associati a nessun prodotto */}
                        {ordiniFornitore[f.id]?.some(
                          (o) =>
                            !(prodottiFornitore[f.id] || []).some(
                              (p) => Number(p.id_sfuso || p.id) === Number(o.id_sfuso)
                            )
                        ) && (
                            <div className="mt-3 bg-zinc-800/60 p-3 rounded">
                              <h5 className="font-semibold text-yellow-300 mb-2">
                                ⚠️ Ordini non associati a un prodotto
                              </h5>
                              <ul className="list-disc pl-5 text-sm space-y-1">
                                {ordiniFornitore[f.id]
                                  .filter(
                                    (o) =>
                                      !(prodottiFornitore[f.id] || []).some(
                                        (p) => Number(p.id_sfuso || p.id) === Number(o.id_sfuso)
                                      )
                                  )
                                  .map((o) => (
                                    <li key={o.id}>
                                      <strong>{o.nome_prodotto}</strong> — {o.quantita_litri} L —{" "}
                                      <span className="italic text-yellow-300">{o.stato}</span>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}



                        {/* 📦 Ordini attivi */}
                        <h4 className="text-lg font-bold mb-2 flex justify-between items-center">

                          <div className="flex gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrdiniFornitore(f.id); // elimina tutti gli ordini del fornitore
                              }}
                              className="text-red-400 hover:text-red-200 text-sm"
                            >
                              🗑️ Elimina tutti
                            </button>
                          </div>
                        </h4>

                       
                      </td>
                    </tr>
                  )}

                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ListaFornitori;
