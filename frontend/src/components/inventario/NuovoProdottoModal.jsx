import React, { useState, useEffect } from "react";
import { creaNuovaCard } from "../../utils/creaNuovaCard";

const NuovoProdottoModal = ({ onClose, onSuccess }) => {
    console.log("🟢 Modale aperta — NuovoProdottoModal montato");
    const [form, setForm] = useState({
        nome: "",
        asin: "",
        sku: "",
        formato: "12ML",
        categoria: "",
        isKit: false,
    });
    const [sfusiLiberi, setSfusiLiberi] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🔹 Recupera sfusi liberi appena la modale si apre
    useEffect(() => {
        console.log("🔁 Avvio fetch per /api/v2/sfuso/liberi...");

        fetch("http://localhost:3005/api/v2/sfuso/liberi")
            .then(async (res) => {
                const text = await res.text();
                console.log("📡 Risposta raw:", text);

                try {
                    const data = JSON.parse(text);

                    // ✅ Gestione flessibile (oggetto o array)
                    const listaSfusi = Array.isArray(data)
                        ? data
                        : Array.isArray(data.sfusiLiberi)
                            ? data.sfusiLiberi
                            : [];

                    if (listaSfusi.length > 0) {
                        setSfusiLiberi(listaSfusi);
                        console.log("✅ Sfusi caricati nel state:", listaSfusi.length);
                    } else {
                        console.warn("⚠️ Nessun sfuso trovato.");
                    }
                } catch (err) {
                    console.error("❌ Errore parsing JSON:", err);
                }
            })
            .catch((err) => console.error("❌ Errore fetch:", err));
    }, []);



    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = await creaNuovaCard("inventario", form);



        // ⚠️ Controlla se il backend chiede associazione sfuso
        if (data?.necessitaSfuso && data.sfusiLiberi?.length) {
            setSfusiLiberi(data.sfusiLiberi);
        } else if (data?.ok || data?.message?.includes("successo")) {
            onSuccess();
            onClose();
            setForm({ nome: "", asin: "", sku: "", formato: "12ML", categoria: "", isKit: false });
        }

        setLoading(false);
    };

    const handleAssociaSfuso = async (id_sfuso) => {
    setLoading(true);

    // ✅ Aggiungiamo i campi richiesti
    const payload = {
        nome: form.nome,
        formato: form.formato,
        asin: form.asin,
        sku: form.sku,
        categoria: form.categoria,
        isKit: form.isKit,
        id_sfuso_collegato: id_sfuso,
    };

    console.log("📦 Invio payload associazione sfuso:", payload);

    try {
        const data = await creaNuovaCard("inventario", payload);

        if (data) {
            console.log("✅ Prodotto associato correttamente:", data);

            // 🔄 Aggiorna asin_collegato nello sfuso
            if (form.asin && id_sfuso) {
                try {
                    console.log(`🟣 Invio PATCH /api/v2/sfuso/${id_sfuso}/asin per ASIN ${form.asin}`);
                    const res = await fetch(`http://localhost:3005/api/v2/sfuso/${id_sfuso}/asin`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ asin: form.asin }),
                    });
                    const json = await res.json();

                    if (json.ok) {
                        console.log(`✅ ASIN ${form.asin} aggiornato correttamente nello sfuso ID ${id_sfuso}`);
                    } else {
                        console.warn("⚠️ PATCH completata ma risposta non OK:", json);
                    }
                } catch (err) {
                    console.error("❌ Errore aggiornamento asin nello sfuso:", err);
                }
            }

            // 🔁 Ricarica la lista dei prodotti e sfusi nel parent
            if (typeof onSuccess === "function") onSuccess();

            onClose();
        } else {
            toast.error("Errore durante l'associazione dello sfuso al prodotto.");
        }

    } catch (err) {
        console.error("❌ Errore associazione sfuso:", err);
        toast.error("Errore durante la creazione del nuovo inventario.");
    } finally {
        setLoading(false);
    }
};


    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-zinc-800 text-white rounded-xl shadow-lg p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">➕ Aggiungi nuovo prodotto</h2>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        name="nome"
                        placeholder="Nome prodotto"
                        value={form.nome}
                        onChange={handleChange}
                        className="w-full p-2 rounded bg-zinc-700"
                        required
                    />

                    <input
                        name="asin"
                        placeholder="ASIN"
                        value={form.asin}
                        onChange={handleChange}
                        className="w-full p-2 rounded bg-zinc-700"
                        required
                    />

                    <input
                        name="sku"
                        placeholder="SKU"
                        value={form.sku}
                        onChange={handleChange}
                        className="w-full p-2 rounded bg-zinc-700"
                    />

                    <select
                        name="formato"
                        value={form.formato}
                        onChange={handleChange}
                        className="w-full p-2 rounded bg-zinc-700"
                    >
                        <option value="12ML">12 ML</option>
                        <option value="100ML">100 ML</option>
                        <option value="5L">5 Litri</option>
                    </select>

                    {/* 🔽 Menu a tendina categorie */}
                    <select
                        name="categoria"
                        value={form.categoria}
                        onChange={handleChange}
                        className="w-full p-2 rounded bg-zinc-700"
                    >
                        <option value="">-- Seleziona categoria --</option>
                        <option value="PREPARATORI UNGHIE">PREPARATORI UNGHIE</option>
                        <option value="OLI CUTICOLE">OLI CUTICOLE</option>
                        <option value="TRATTAMENTI UNGHIE">TRATTAMENTI UNGHIE</option>
                        <option value="SEMIPERMANENTE ONE STEP">SEMIPERMANENTE ONE STEP</option>
                        <option value="TOP / BASE COAT UV">TOP / BASE COAT UV</option>
                    </select>

                    {/* 🔹 Selezione sfuso collegato */}
                    {/* 🔹 Selezione sfuso collegato */}
                    {Array.isArray(sfusiLiberi) && sfusiLiberi.length >= 0 && (
                        <div className="mt-2">

                        </div>
                    )}



                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="isKit"
                            checked={form.isKit}
                            onChange={handleChange}
                        />
                        È un kit
                    </label>

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-zinc-600 rounded hover:bg-zinc-500"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 rounded hover:bg-green-500"
                        >
                            {loading ? "Salvataggio..." : "Salva"}
                        </button>
                    </div>
                </form>

                {/* 🔹 Mostra elenco sfusi liberi se necessario */}
                {sfusiLiberi.length > 0 && (
                    <div className="mt-6 border-t border-zinc-600 pt-4">
                        <h3 className="text-lg font-semibold mb-2 text-yellow-400">
                            Seleziona uno sfuso da collegare:
                        </h3>
                        <ul className="max-h-60 overflow-auto space-y-1">
                            {sfusiLiberi.map((s) => (
                                <li
                                    key={s.id}
                                    className="flex justify-between items-center bg-zinc-700 p-2 rounded"
                                >
                                    <span>
                                        {s.nome_prodotto} ({s.litri_disponibili} L)
                                    </span>
                                    <button
                                        onClick={() => handleAssociaSfuso(s.id)}
                                        className="bg-indigo-600 px-2 py-1 rounded hover:bg-indigo-500"
                                    >
                                        Collega
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NuovoProdottoModal;
