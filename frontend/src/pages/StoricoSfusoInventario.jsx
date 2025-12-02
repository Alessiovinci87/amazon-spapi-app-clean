// frontend/src/pages/StoricoSfusoInventario.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const StoricoSfusoInventario = () => {
    const navigate = useNavigate();
    const [movimenti, setMovimenti] = useState([]);
    const [formatoFiltro, setFormatoFiltro] = useState("tutti");
    const [fornitoreFiltro, setFornitoreFiltro] = useState("tutti");
    const [tipoFiltro, setTipoFiltro] = useState("tutti");
    const [campoFiltro, setCampoFiltro] = useState("tutti");
    const [ricerca, setRicerca] = useState("");
    const [dataDa, setDataDa] = useState("");
    const [dataA, setDataA] = useState("");

    // 🔹 Carica dati reali dal backend
    const fetchStorico = async () => {
        try {
            const res = await fetch("/api/v2/sfuso/storico-inventario");
            if (!res.ok) throw new Error("Errore nel caricamento dello storico sfuso");
            const data = await res.json();
            setMovimenti(data);
            console.log("📦 Dati ricevuti dallo storico:", data);
        } catch (err) {
            console.error("❌ Errore fetch storico sfuso:", err);
        }
    };

    useEffect(() => {
        fetchStorico();
    }, []);

    // 🔹 Funzione reset storico
    const handleResetStorico = async () => {
        const password = prompt("Inserisci la password per cancellare lo storico:");
        if (password !== "1234") {
            alert("❌ Password errata!");
            return;
        }

        if (!window.confirm("⚠️ Sei sicuro di voler cancellare tutto lo storico?")) return;

        try {
            const res = await fetch("/api/v2/sfuso/storico-inventario/reset", {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Errore durante la cancellazione dello storico");
            alert("✅ Storico cancellato con successo!");
            setMovimenti([]);
        } catch (err) {
            console.error("❌ Errore reset storico:", err);
            alert("Errore durante la cancellazione dello storico.");
        }
    };

    // 🔹 Estrai lista fornitori unici per filtro
    const fornitori = [
        "tutti",
        ...new Set(movimenti.map((m) => m.fornitore).filter(Boolean)),
    ];

    // 🔹 Filtro principale
    const movimentiFiltrati = movimenti.filter((m) => {
        const matchFormato =
            formatoFiltro === "tutti" ||
            (m.formato || "").toLowerCase().includes(formatoFiltro);

        const matchFornitore =
            fornitoreFiltro === "tutti" ||
            (m.fornitore || "").toLowerCase() === fornitoreFiltro.toLowerCase();

        const matchTipo = tipoFiltro === "tutti" || m.tipo === tipoFiltro;

        const matchCampo =
            campoFiltro === "tutti" ||
            (campoFiltro === "sfuso" && m.campo === "litri_disponibili") ||
            (campoFiltro === "lotto" && m.campo === "lotto");

        const matchRicerca =
            (m.nome || "").toLowerCase().includes(ricerca.toLowerCase()) ||
            (m.fornitore || "").toLowerCase().includes(ricerca.toLowerCase());

        const matchData =
            (!dataDa || new Date(m.data) >= new Date(dataDa)) &&
            (!dataA || new Date(m.data) <= new Date(dataA));

        return (
            matchFormato &&
            matchFornitore &&
            matchTipo &&
            matchCampo &&
            matchRicerca &&
            matchData
        );
    });

    return (
        <div className="p-6 text-white space-y-6">
            {/* 🔙 Barra superiore */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">📜 Storico Sfuso — Inventario</h1>
                <div className="flex gap-3">
                    <button
                        onClick={handleResetStorico}
                        className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded font-semibold"
                    >
                        🧹 Reset Storico
                    </button>
                    <button
                        onClick={() => navigate("/sfuso")}
                        className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded"
                    >
                        ⬅️ Torna a Gestione Sfuso
                    </button>
                </div>
            </div>

            {/* 🔎 Filtri */}
            <div className="bg-zinc-800 p-4 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                    <label className="block text-sm mb-1">Formato</label>
                    <select
                        value={formatoFiltro}
                        onChange={(e) => setFormatoFiltro(e.target.value)}
                        className="w-full bg-zinc-700 text-white p-2 rounded"
                    >
                        <option value="tutti">Tutti</option>
                        <option value="12ml">12 ml</option>
                        <option value="100ml">100 ml</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm mb-1">Campo modificato</label>
                    <select
                        value={campoFiltro}
                        onChange={(e) => setCampoFiltro(e.target.value)}
                        className="w-full bg-zinc-700 text-white p-2 rounded"
                    >
                        <option value="tutti">Tutti</option>
                        <option value="sfuso">Sfuso</option>
                        <option value="lotto">Lotto</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm mb-1">Fornitore</label>
                    <select
                        value={fornitoreFiltro}
                        onChange={(e) => setFornitoreFiltro(e.target.value)}
                        className="w-full bg-zinc-700 text-white p-2 rounded"
                    >
                        {fornitori.map((f, i) => (
                            <option key={i} value={f}>
                                {f === "tutti" ? "Tutti" : f}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm mb-1">Tipo movimento</label>
                    <select
                        value={tipoFiltro}
                        onChange={(e) => setTipoFiltro(e.target.value)}
                        className="w-full bg-zinc-700 text-white p-2 rounded"
                    >
                        <option value="tutti">Tutti</option>
                        <option value="CARICO DDT">Carico DDT</option>
                        <option value="RETTIFICA">Rettifica</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm mb-1">Ricerca</label>
                    <input
                        type="text"
                        placeholder="Cerca per nome o ASIN/SKU..."
                        value={ricerca}
                        onChange={(e) => setRicerca(e.target.value)}
                        className="w-full bg-zinc-700 text-white p-2 rounded"
                    />
                </div>

                <div className="flex gap-2 col-span-full sm:col-span-2">
                    <div className="flex flex-col flex-1">
                        <label className="block text-sm mb-1">Da</label>
                        <input
                            type="date"
                            value={dataDa}
                            onChange={(e) => setDataDa(e.target.value)}
                            className="bg-zinc-700 text-white p-2 rounded"
                        />
                    </div>
                    <div className="flex flex-col flex-1">
                        <label className="block text-sm mb-1">A</label>
                        <input
                            type="date"
                            value={dataA}
                            onChange={(e) => setDataA(e.target.value)}
                            className="bg-zinc-700 text-white p-2 rounded"
                        />
                    </div>
                </div>
            </div>

            {/* 📋 Tabella storico */}
            <div className="overflow-x-auto rounded-lg border border-zinc-700 shadow">
                <table className="min-w-full text-sm">
                    <thead className="bg-zinc-700 text-left">
                        <tr>
                            <th className="p-2 border border-zinc-600">Data</th>
                            <th className="p-2 border border-zinc-600">Tipo</th>
                            <th className="p-2 border border-zinc-600">Campo</th>
                            <th className="p-2 border border-zinc-600">Prodotto</th>
                            <th className="p-2 border border-zinc-600">Formato</th>
                            <th className="p-2 border border-zinc-600">Lotto</th>
                            <th className="p-2 border border-zinc-600">Fornitore</th>
                            <th className="p-2 border border-zinc-600 text-center">
                                Quantità Rettifica
                            </th>
                            <th className="p-2 border border-zinc-600">Operatore</th>
                            <th className="p-2 border border-zinc-600">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movimentiFiltrati.map((m) => {
                            let rowColor = "bg-zinc-900";
                            if (m.tipo === "CARICO DDT") rowColor = "bg-green-900/40";
                            else if (m.tipo === "RETTIFICA" && m.campo === "litri_disponibili")
                                rowColor = "bg-zinc-700/40";
                            else if (m.tipo === "RETTIFICA" && m.campo === "lotto")
                                rowColor = "bg-amber-900/30";

                            return (
                                <tr key={m.id} className={`border-t border-zinc-700 ${rowColor}`}>
                                    <td className="p-2 border border-zinc-700">
                                        {new Date(m.data).toLocaleDateString("it-IT", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td className="p-2 border border-zinc-700 font-semibold">{m.tipo}</td>
                                    <td className="p-2 border border-zinc-700 italic text-zinc-300">
                                        {m.campo === "litri_disponibili"
                                            ? "SFUSO"
                                            : m.campo === "lotto"
                                            ? "LOTTO"
                                            : "-"}
                                    </td>
                                    <td className="p-2 border border-zinc-700">{m.nome || "-"}</td>
                                    <td className="p-2 border border-zinc-700">{m.formato || "-"}</td>
                                    <td className="p-2 border border-zinc-700">{m.lotto || "-"}</td>
                                    <td className="p-2 border border-zinc-700">{m.fornitore || "-"}</td>
                                    <td className="p-2 border border-zinc-700 text-center">
                                        {m.quantita || m.nuovoValore || m.valore
                                            ? m.campo === "litri_disponibili"
                                                ? `${m.quantita ?? m.nuovoValore ?? m.valore} L`
                                                : m.quantita ?? m.nuovoValore ?? m.valore
                                            : "-"}
                                    </td>
                                    <td className="p-2 border border-zinc-700">
                                        {m.operatore || "-"}
                                    </td>
                                    <td className="p-2 border border-zinc-700">
                                        {m.note || m.nota || "-"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StoricoSfusoInventario;
