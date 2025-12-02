import React, { useEffect, useState } from "react";
import { fetchJSON } from "../../utils/api"; // tua funzione fetch
import { API_BASE } from "../../utils/api";

import ModaleModificaCosto from "./ModaleModificaCosto";

export default function CatalogoCostiTable() {
    const [righe, setRighe] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

    const [modale, setModale] = useState(null);

    // ============================
    // 1️⃣ CARICA I DATI
    // ============================
    async function loadData() {
        setLoading(true);
        try {
            const res = await fetchJSON(`${API_BASE}/bilancio/catalogo/dettagli`);
            if (res.ok) setRighe(res.data);
        } catch (err) {
            console.error("Errore load:", err);
        }
        setLoading(false);
    }

    // Load on mount
    useEffect(() => {
        loadData();
    }, []);

    // ============================
    // 2️⃣ SALVA UN SINGOLO COSTO
    // ============================
    async function salvaCosto(riga) {
        setSavingId(riga.id_riferimento);

        const payload = {
            tipo: riga.tipo,
            id_riferimento: riga.id_riferimento,
            costo: riga.costo_unitario,
            note: riga.note,
        };

        try {
            const res = await fetch(`${API_BASE}/bilancio/catalogo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const out = await res.json();
            if (!out.ok) {
                alert("Errore salvataggio: " + out.error);
            }
        } catch (err) {
            alert("Errore: " + err.message);
        }

        setSavingId(null);
        loadData();
    }

    if (loading) return <p>Caricamento...</p>;

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-3">Catalogo Costi</h2>

            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-dark-200">
                        <th className="border p-2">Tipo</th>
                        <th className="border p-2">Nome</th>
                        <th className="border p-2">Q.ta</th>
                        <th className="border p-2">Costo</th>
                        <th className="border p-2">Valore</th>
                        <th className="border p-2">Note</th>
                        <th className="border p-2"></th>
                    </tr>
                </thead>

                <tbody>
                    {righe.map((r) => (
                        <tr key={`${r.tipo}-${r.id_riferimento}`} className="border">
                            <td className="border p-2">{r.tipo}</td>
                            <td className="border p-2">{r.nome}</td>

                            <td className="border p-2 text-center">{r.quantita_disponibile}</td>

                            {/* Costo */}
                            <td className="border p-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={r.costo_unitario}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        setRighe((prev) =>
                                            prev.map((x) =>
                                                x.tipo === r.tipo && x.id_riferimento === r.id_riferimento
                                                    ? { ...x, costo_unitario: value }
                                                    : x
                                            )
                                        );
                                    }}
                                    className="w-20 border rounded px-1"
                                />
                            </td>

                            {/* VALORE TOTALE CALCOLATO */}
                            <td className="border p-2">
                                {(r.costo_unitario * r.quantita_disponibile).toFixed(2)} €
                            </td>

                            {/* NOTE */}
                            <td className="border p-2">
                                <input
                                    type="text"
                                    value={r.note || ""}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setRighe((prev) =>
                                            prev.map((x) =>
                                                x.tipo === r.tipo && x.id_riferimento === r.id_riferimento
                                                    ? { ...x, note: value }
                                                    : x
                                            )
                                        );
                                    }}
                                    className="w-full border rounded px-1"
                                />
                            </td>

                            {/* SALVA */}
                            <td className="border p-2 flex gap-2">

                                <button
                                    onClick={() => salvaCosto(r)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded"
                                    disabled={savingId === r.id_riferimento}
                                >
                                    {savingId === r.id_riferimento ? "..." : "Salva"}
                                </button>

                                <button
                                    onClick={() => setModale(r)}
                                    className="bg-purple-600 text-white px-3 py-1 rounded"
                                >
                                    Modifica
                                </button>

                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {modale && (
  <ModaleModificaCosto
    riga={modale}
    onClose={() => setModale(null)}
    onUpdate={loadData}
  />
)}
        </div>
        
    );
}
