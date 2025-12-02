import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SfusoCard from "../components/sfuso/SfusoCard";
import { triggerReloadInventario } from "../utils/globalEvents";
import { fetchJSON, buildUrl } from "../utils/api";

// ========== FUNZIONE ACCESSORI ==========
function getAccessoryList(formato) {
    const f = formato.toLowerCase();

    if (f === "12ml") return "Boccetta 12ml, Pennellino 12ml, Tappino 12ml, Scatoletta, Etichetta";

    if (f === "100ml") return "Boccetta 100ml, Tappino 100ml, Etichetta";

    if (f.includes("kit") && f.includes("12"))
        return "2× Boccetta 12ml, 2× Pennellino 12ml, 2× Tappino 12ml, 2× Scatoletta, 2× Etichetta";

    if (f.includes("kit") && f.includes("9"))
        return "9× Boccetta 12ml, 9× Pennellino 12ml, 9× Tappino 12ml, 9× Scatoletta, 1× Etichetta Fragranza";

    return "Accessori non definiti";
}

// ========== FUNZIONE PALLINO PRIORITÀ ==========
function getPriorityBadge(priorita) {
    const p = (priorita || "").toLowerCase();

    if (p === "alta") return <span className="text-2xl" title="Priorità Alta">🔴</span>;
    if (p === "media") return <span className="text-2xl" title="Priorità Media">🟠</span>;
    if (p === "bassa") return <span className="text-2xl" title="Priorità Bassa">🟢</span>;

    return <span className="text-2xl" title="Priorità Non Definita">⚪</span>;
}

const GestioneProduzioneMagazzino = () => {
    const navigate = useNavigate();
    const [prenotazioni, setPrenotazioni] = useState([]);
    const [sfusoData, setSfusoData] = useState([]);
    const [filterSearchTerm, setFilterSearchTerm] = useState("");

    // ========== NORMALIZZAZIONE STATI ==========
    const normalizeState = (value) => {
        if (!value) return "pending";
        const normalized = value.toString().toLowerCase().trim();
        const stateMap = {
            "prenotazione": "pending",
            "in lavorazione": "in_corso",
            "confermata": "completato",
            "completato": "completato",
            "annullata": "annullato",
            "annullato": "annullato",
            "pending": "pending",
            "in_corso": "in_corso"
        };
        return stateMap[normalized] || "pending";
    };

    const getStateLabel = (normalizedState) => {
        const labels = {
            "pending": "Prenotazione",
            "in_corso": "In Lavorazione",
            "completato": "Completato",
            "annullato": "Annullato"
        };
        return labels[normalizedState] || normalizedState;
    };

    // ========== FETCH ==========
    const fetchSfuso = async () => {
        try {
            const data = await fetchJSON("sfuso");
            setSfusoData(data);
        } catch (err) {
            console.error("❌ Errore fetch sfuso:", err);
        }
    };

    const fetchPrenotazioni = async () => {
        try {
            const data = await fetchJSON("sfuso/prenotazioni");
            setPrenotazioni(data);
        } catch (err) {
            console.error("❌ Errore fetch prenotazioni:", err);
        }
    };

    const ricaricaDati = async () => {
        await Promise.all([fetchPrenotazioni(), fetchSfuso()]);
    };

    useEffect(() => {
        fetchSfuso();
        fetchPrenotazioni();
    }, []);

    // ========== STORICO ==========
    const registraStoricoProduzione = async (p, evento) => {
        try {
            const payload = {
                id_produzione: p.id_produzione || null,
                id_prenotazione: p.id || null,
                id_sfuso: p.id_sfuso || null,
                asin_prodotto: p.asin_prodotto || null,
                nome_prodotto: p.nome_prodotto || null,
                formato: p.formato || null,
                quantita: Number(p.quantita ?? p.prodotti ?? 0),
                litri_usati: Number(p.litri_usati ?? p.litriImpegnati ?? 0),
                evento: evento.toUpperCase(),
                note: p.note || "",
                operatore: "magazzino"
            };

            await fetch(buildUrl("storico-produzioni-sfuso"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error("❌ Errore registraStoricoProduzione:", err);
        }
    };

    // ========== AGGIORNA STATO ==========
    const handleAggiornaStato = async (id, nuovoStato) => {
        const statoNormalizzato = normalizeState(nuovoStato);

        try {
            const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nuovoStato: statoNormalizzato,
                    operatore: "magazzino"
                }),
            });

            if (!res.ok) throw new Error("Errore aggiornamento stato");

            await ricaricaDati();
        } catch (err) {
            console.error("❌ Errore aggiornamento stato:", err);
            alert("Errore durante aggiornamento stato");
        }
    };

    // ========== MODIFICA QUANTITÀ ==========
    const handleModificaQuantita = async (id, nuovaQuantita) => {
        try {
            const quantitaNumerica = Number(nuovaQuantita);
            if (isNaN(quantitaNumerica) || quantitaNumerica <= 0) {
                alert("Quantità non valida");
                return;
            }

            const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prodotti: quantitaNumerica, operatore: "magazzino" }),
            });

            if (!res.ok) throw new Error();

            await ricaricaDati();
        } catch (err) {
            console.error("❌ Errore modifica quantità:", err);
        }
    };

    // ========== CONFERMA PRODUZIONE ==========
    const handleConfermaProduzione = async (p) => {
        try {
            // 1) CREA PRODUZIONE
            const resCrea = await fetch(buildUrl("produzioni-sfuso/crea-da-prenotazione"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(p)
            });

            const dataCrea = await resCrea.json();
            const idProduzione = dataCrea?.id_produzione;

            if (!idProduzione) {
                alert("❌ ID produzione mancante");
                return;
            }

            // 2) COMPLETA PRODUZIONE
            const res = await fetch(
                buildUrl(`produzioni-sfuso/${idProduzione}/completa`),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ operatore: "magazzino" })
                }
            );

            if (!res.ok) throw new Error();

            // 3) STORICO
            await registraStoricoProduzione({ ...p, id_produzione: idProduzione }, "COMPLETATA");

            // 4) STATO PRENOTAZIONE
            await handleAggiornaStato(p.id, "confermata");

            // 5) REFRESH
            await ricaricaDati();
            triggerReloadInventario();

        } catch (err) {
            console.error("❌ Errore conferma produzione:", err);
            alert("Errore conferma produzione");
        }
    };


    // ========== SALVA NOTA ==========
    const handleSalvaNota = async (id, nota) => {
        try {
            const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note: nota, operatore: "magazzino" }),
            });

            if (!res.ok) throw new Error();

            await fetchPrenotazioni();
        } catch (err) {
            console.error("❌ Errore salvataggio nota:", err);
        }
    };

    // ========== FORMATTAZIONE DATA ==========
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
        } catch (err) {
            return dateString;
        }
    };

    // ========== FILTRI ==========
    const getFilteredPrenotazioni = (stato) => {
        const statoNormalizzato = normalizeState(stato);

        return prenotazioni.filter((p) => {
            if (normalizeState(p.stato) !== statoNormalizzato) return false;
            if (filterSearchTerm.trim()) {
                const term = filterSearchTerm.toLowerCase();
                const nome = (p.nome_prodotto || "").toLowerCase();
                const asin = (p.asin_prodotto || "").toLowerCase();
                if (!nome.includes(term) && !asin.includes(term)) return false;
            }
            return true;
        });
    };

    const prenotazioniInLavorazione = getFilteredPrenotazioni("in_corso");
    const prenotazioniAttive = getFilteredPrenotazioni("pending");

    const toggleExpand = (id) => {
        setPrenotazioni((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, expanded: !p.expanded } : p
            )
        );
    };

    const handleResetProduzioneCounter = async () => {
        if (!window.confirm("⚠️ Attenzione!\n\nQuesto resetterà TUTTE le prenotazioni, le produzioni completate, lo storico e il contatore.\n\nProcedere?"))
            return;

        try {
            const res = await fetch("/api/v2/config/reset-contatore-produzione", {
                method: "POST",
            });

            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            alert("✔️ Reset completato con successo");

            await ricaricaDati();
            triggerReloadInventario();

        } catch (err) {
            console.error("❌ Errore reset:", err);
            alert("Errore durante il reset totale");
        }
    };


    // ============================================================
    // 🔥 RENDER
    // ============================================================

    return (
        <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
            <div className="max-w-8xl mx-auto space-y-6">


                <div className="max-w-8xl mx-auto space-y-6">
                    {/* ========== HEADER ========== */}
                    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">📦 Gestione Produzione Magazzino</h1>
                                <p className="text-zinc-400">Gestisci prenotazioni e produzioni</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate("/storico-produzioni-sfuso")}
                                    className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                                >
                                    📜 Storico Produzioni
                                </button>

                                <button
                                    onClick={() => navigate("/magazzino")}
                                    className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                                >
                                    ⬅️ Magazzino
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ========== FILTRO RICERCA GLOBALE ========== */}
                    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            🔍 Filtra Prenotazioni
                        </h2>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cerca per nome prodotto o ASIN..."
                                value={filterSearchTerm}
                                onChange={(e) => setFilterSearchTerm(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-lg pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            />
                            {filterSearchTerm && (
                                <button
                                    onClick={() => setFilterSearchTerm("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                    title="Cancella filtro"
                                >
                                    ✖
                                </button>
                            )}
                        </div>
                        {filterSearchTerm && (
                            <p className="mt-2 text-sm text-zinc-400">
                                Filtrando per: <strong className="text-emerald-400">{filterSearchTerm}</strong>
                            </p>
                        )}
                    </div>

                    {localStorage.getItem("role") === "ufficio" && (
                        <>
                            {/* ========== SELETTORE PRODOTTO ========== */}
                            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    🎯 Seleziona Prodotto da Produrre
                                </h2>
                                <div className="relative mb-3">
                                    <input
                                        type="text"
                                        placeholder="Cerca per nome, ASIN o SKU..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-lg pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                            title="Cancella"
                                        >
                                            ✖
                                        </button>
                                    )}
                                </div>

                                {/* Lista filtrata prodotti */}
                                {searchTerm.trim() && (
                                    <div className="max-h-64 overflow-y-auto border border-zinc-700 rounded-lg bg-zinc-800">
                                        {(() => {
                                            const filtered = prodotti.filter((p) => {
                                                const term = searchTerm.toLowerCase();
                                                const nome = (p.nome || "").toLowerCase();
                                                const asin = (p.asin || "").toLowerCase();
                                                const sku = (p.sku || "").toLowerCase();

                                                return nome.includes(term) || asin.includes(term) || sku.includes(term);
                                            });

                                            if (filtered.length === 0) {
                                                return (
                                                    <div className="p-4 text-center text-zinc-400">
                                                        Nessun prodotto trovato per "{searchTerm}"
                                                    </div>
                                                );
                                            }

                                            return filtered.map((p) => (
                                                <div
                                                    key={p.asin}
                                                    onClick={() => {
                                                        setSelectedProdotto(p);
                                                        setSearchTerm("");
                                                    }}
                                                    className={`p-3 cursor-pointer hover:bg-zinc-700 transition-colors border-b border-zinc-700 last:border-b-0 ${selectedProdotto?.asin === p.asin ? "bg-emerald-600/20 border-l-4 border-l-emerald-500" : ""
                                                        }`}
                                                >
                                                    <p className="text-sm font-medium text-white">{p.nome}</p>
                                                    <p className="text-xs text-zinc-400">
                                                        ASIN: {p.asin} {p.sku ? `• SKU: ${p.sku}` : ""}
                                                    </p>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}

                                {selectedProdotto && (
                                    <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="text-emerald-400 text-sm">
                                                ✅ Prodotto selezionato: <strong>{selectedProdotto.nome}</strong>
                                            </p>
                                            <p className="text-emerald-300/70 text-xs mt-1">
                                                ASIN: {selectedProdotto.asin} {selectedProdotto.sku ? `• SKU: ${selectedProdotto.sku}` : ""}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedProdotto(null)}
                                            className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                            title="Deseleziona prodotto"
                                        >
                                            ✖ Rimuovi
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* ========== CARD PRODUZIONE PER FORMATO ========== */}
                            <div className="grid md:grid-cols-3 gap-4">
                                <ProduzioneCard
                                    formato="10ml"
                                    selectedProdotto={selectedProdotto}
                                    sfusoData={sfusoData}
                                    onPrenota={handlePrenota}
                                />
                                <ProduzioneCard
                                    formato="12ml"
                                    selectedProdotto={selectedProdotto}
                                    sfusoData={sfusoData}
                                    onPrenota={handlePrenota}
                                />
                                <ProduzioneCard
                                    formato="100ml"
                                    selectedProdotto={selectedProdotto}
                                    sfusoData={sfusoData}
                                    onPrenota={handlePrenota}
                                />
                            </div>
                        </>
                    )}

                    {/* ========== STATISTICHE ========== */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-emerald-500">{prenotazioni.length}</p>
                            <p className="text-sm text-zinc-400 mt-1">Totali</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-blue-500">
                                {prenotazioni.filter((p) => normalizeState(p.stato) === "pending").length}
                            </p>
                            <p className="text-sm text-zinc-400 mt-1">Prenotazioni</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-yellow-500">
                                {prenotazioni.filter((p) => normalizeState(p.stato) === "in_corso").length}
                            </p>
                            <p className="text-sm text-zinc-400 mt-1">In Lavorazione</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-green-500">
                                {prenotazioni.filter((p) => normalizeState(p.stato) === "completato").length}
                            </p>
                            <p className="text-sm text-zinc-400 mt-1">Completate</p>
                        </div>
                    </div>

                    {/* ========== GRIGLIA A DUE COLONNE: PRENOTAZIONI ATTIVE + IN LAVORAZIONE ========== */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* ========== COLONNA SINISTRA: PRENOTAZIONI ATTIVE ========== */}
                        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                            <div className="bg-emerald-600 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    📦 Prenotazioni Attive
                                    <span className="text-sm font-normal opacity-90">
                                        ({prenotazioniAttive.length})
                                    </span>
                                </h2>
                            </div>

                            <div className="p-6">
                                {prenotazioniAttive.length === 0 ? (
                                    <p className="text-zinc-400 text-center py-8">Nessuna prenotazione attiva</p>
                                ) : (
                                    <div className="space-y-6">
                                        {prenotazioniAttive.map((p, idx) => {
                                            const stableKey = p.id ?? p.tempKey ?? `pren-${idx}`;
                                            const hasId = Boolean(p.id);

                                            return (
                                                <div
                                                    key={stableKey}
                                                    className="card-text bg-zinc-800 border-8 border-green-600 rounded-xl p-5 space-y-4 transition-all duration-300"
                                                >

                                                    {/* HEADER: PRIORITÀ + FRECCIA */}
                                                    {/* HEADER: TITOLO + PRIORITÀ + FRECCIA */}
                                                    <div className="flex items-start justify-between gap-3">

                                                        {/* Titolo prodotto */}
                                                        <h3 className="text-lg font-extrabold text-white flex-1 tracking-wide uppercase">
                                                            {(p.nome_prodotto || "-")
                                                                .replace(/\(NUOVO\)|\(VECCHIO\)/gi, "")
                                                                .trim()
                                                                .toUpperCase()}
                                                        </h3>

                                                        {/* Priorità + scritta */}
                                                        <div className="flex items-center gap-2 mr-2">
                                                            {getPriorityBadge(p.priorita)}
                                                            <span className="text-sm text-zinc-300 font-medium">
                                                                {p.priorita
                                                                    ? p.priorita.charAt(0).toUpperCase() + p.priorita.slice(1).toLowerCase()
                                                                    : "N/A"}
                                                            </span>
                                                        </div>

                                                        {/* Freccina toggle */}
                                                        <button
                                                            onClick={() => toggleExpand(p.id)}
                                                            className="text-zinc-400 hover:text-white transition-transform"
                                                        >
                                                            <span
                                                                className={`inline-block transform transition-transform duration-300 ${p.expanded ? "rotate-180" : "rotate-0"
                                                                    }`}
                                                                style={{ fontSize: "22px" }}
                                                            >
                                                                ▼
                                                            </span>
                                                        </button>
                                                    </div>


                                                    {/* QUANTITÀ SEMPRE VISIBILE */}
                                                    <div className="text-center bg-zinc-900 rounded-lg py-3">
                                                        <p className="text-sm text-zinc-400 uppercase tracking-wide mb-1">Quantità</p>
                                                        <p className="text-4xl font-bold" style={{ color: "#00ff99" }}>
                                                            {p.prodotti}
                                                        </p>
                                                    </div>

                                                    {/* --- SEZIONE ESPANDIBILE --- */}
                                                    {p.expanded && (
                                                        <div className="space-y-4 pt-4 border-t border-zinc-700 animate-fadeIn">

                                                            {/* MINI DETTAGLI */}
                                                            <div className="grid grid-cols-2 gap-3 text-base">
                                                                <div className="bg-zinc-900 rounded-lg p-4">
                                                                    <p className="text-zinc-400 text-sm mb-1 font-medium">Formato</p>
                                                                    <p className="text-white font-semibold text-lg">{p.formato}</p>
                                                                </div>

                                                                <div className="bg-zinc-900 rounded-lg p-4">
                                                                    <p className="text-zinc-400 text-sm mb-1 font-medium">Litri</p>
                                                                    <p className="text-emerald-400 font-semibold text-lg">{p.litriImpegnati?.toFixed(1)}</p>
                                                                </div>

                                                                <div className="bg-zinc-900 rounded-lg p-4">
                                                                    <p className="text-zinc-400 text-sm mb-1 font-medium">Lotto</p>
                                                                    <p className="text-white font-semibold text-lg">{p.lotto || "-"}</p>
                                                                </div>

                                                                <div className="bg-zinc-900 rounded-lg p-4">
                                                                    <p className="text-zinc-400 text-sm mb-1 font-medium">Data</p>
                                                                    <p className="text-zinc-300 text-sm">{formatDate(p.dataRichiesta)}</p>
                                                                </div>
                                                            </div>


                                                            {/* ACCESSORI */}
                                                            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                                                                <p className="text-l text-blue-300 font-semibold mb-1">
                                                                    🔧 Accessori per questa produzione:
                                                                </p>
                                                                <p className="text-l text-zinc-300">
                                                                    {getAccessoryList(p.formato)}
                                                                </p>
                                                            </div>

                                                            {/* NOTE */}
                                                            <div className="space-y-2">
                                                                <label className="text-base text-zinc-300 font-semibold">Note:</label>

                                                                <div className="flex flex-col sm:flex-row gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={p.note ?? ""}
                                                                        placeholder="Aggiungi nota..."
                                                                        onChange={(e) =>
                                                                            setPrenotazioni((prev) =>
                                                                                prev.map((row) =>
                                                                                    row.id === p.id ? { ...row, note: e.target.value } : row
                                                                                )
                                                                            )
                                                                        }
                                                                        className="flex-1 bg-zinc-900 border border-zinc-700 
                                                                                    text-white text-lg px-4 py-3 rounded-lg
                                                                                    focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                                                                                    transition-all"
                                                                    />

                                                                    <button
                                                                        onClick={() => handleSalvaNota(p.id, p.note)}
                                                                        className="bg-blue-600 hover:bg-blue-700 
                                                                                px-5 py-3 rounded-lg text-white 
                                                                                text-base font-semibold transition-colors"
                                                                    >
                                                                        💾 Salva
                                                                    </button>
                                                                </div>
                                                            </div>


                                                            {/* PULSANTE AZIONE */}
                                                            <button
                                                                disabled={!hasId}
                                                                title={hasId ? "Metti in lavorazione" : "ID mancante — attendi salvataggio"}
                                                                onClick={() => hasId && handleAggiornaStato(p.id, "in_corso")}
                                                                className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors ${hasId
                                                                    ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                                                    : "bg-zinc-700 cursor-not-allowed text-zinc-500"
                                                                    }`}
                                                            >
                                                                ▶️ In lavorazione
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* ========== COLONNA DESTRA: IN LAVORAZIONE ========== */}
                        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                            <div className="bg-yellow-600 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    ⚙️ In Lavorazione
                                    <span className="text-sm font-normal opacity-90">
                                        ({prenotazioniInLavorazione.length})
                                    </span>
                                </h2>
                            </div>

                            <div className="p-6">
                                {prenotazioniInLavorazione.length === 0 ? (
                                    <p className="text-zinc-400 text-center py-8">Nessuna prenotazione in lavorazione</p>
                                ) : (
                                    <div className="space-y-6">
                                        {prenotazioniInLavorazione.map((p) => {
                                            const sfuso = sfusoData.find((s) => s.id === p.id_sfuso);
                                            let lottoLabel = p.lotto || "-";

                                            if (sfuso) {
                                                if (p.lotto === sfuso.lotto_old) lottoLabel += " (VECCHIO)";
                                                else if (p.lotto === sfuso.lotto) lottoLabel += " (NUOVO)";
                                            }

                                            return (
                                                <div
                                                    key={p.id}
                                                    className="card-text bg-zinc-800 border-8 border-orange-500 rounded-xl p-5 space-y-4 transition-all duration-300"
                                                >

                                                    {/* HEADER: TITOLO + PRIORITÀ + FRECCIA */}
                                                    {/* HEADER: TITOLO + PRIORITÀ + FRECCIA */}
                                                    <div className="flex items-start justify-between gap-3">

                                                        {/* Titolo prodotto */}
                                                        <h3 className="text-lg font-extrabold text-white flex-1 tracking-wide uppercase">
                                                            {(p.nome_prodotto || "-")
                                                                .replace(/\(NUOVO\)|\(VECCHIO\)/gi, "")
                                                                .trim()
                                                                .toUpperCase()}
                                                        </h3>

                                                        {/* Priorità + scritta */}
                                                        <div className="flex items-center gap-2 mr-2">
                                                            {getPriorityBadge(p.priorita)}
                                                            <span className="text-sm text-zinc-300 font-medium">
                                                                {p.priorita
                                                                    ? p.priorita.charAt(0).toUpperCase() + p.priorita.slice(1).toLowerCase()
                                                                    : "N/A"}
                                                            </span>
                                                        </div>

                                                        {/* Freccina toggle */}
                                                        <button
                                                            onClick={() => toggleExpand(p.id)}
                                                            className="text-zinc-400 hover:text-white transition-transform"
                                                        >
                                                            <span
                                                                className={`inline-block transform transition-transform duration-300 ${p.expanded ? "rotate-180" : "rotate-0"
                                                                    }`}
                                                                style={{ fontSize: "22px" }}
                                                            >
                                                                ▼
                                                            </span>
                                                        </button>
                                                    </div>


                                                    {/* QUANTITÀ MODIFICABILE (sempre visibile) */}
                                                    <div className="bg-zinc-900 rounded-lg p-4">
                                                        <p className="text-sm text-zinc-400 uppercase tracking-wide mb-2">Quantità</p>

                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                defaultValue={p.prodotti}
                                                                min="1"
                                                                onChange={(e) => {
                                                                    setPrenotazioni((prev) =>
                                                                        prev.map((row) =>
                                                                            row.id === p.id ? { ...row, nuovaQuantita: e.target.value } : row
                                                                        )
                                                                    );
                                                                }}
                                                                className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-3xl font-bold px-4 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-center"
                                                                style={{ color: "#00ff99" }}
                                                            />

                                                            <button
                                                                onClick={() =>
                                                                    handleModificaQuantita(p.id, p.nuovaQuantita || p.prodotti)
                                                                }
                                                                className="bg-emerald-600 hover:bg-emerald-700 px-4 py-3 rounded-lg text-white transition-colors font-semibold"
                                                                title="Aggiorna quantità"
                                                            >
                                                                ✅
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* --- SEZIONE ESPANDIBILE --- */}
                                                    {p.expanded && (
                                                        <div className="space-y-4 pt-4 border-t border-zinc-700 animate-fadeIn">

                                                            {/* MINI DETTAGLI */}
                                                            <div className="grid grid-cols-2 gap-3 text-base">
                                                                <div className="bg-zinc-900 rounded-lg p-4">
                                                                    <p className="text-zinc-400 text-sm mb-1 font-medium">Formato</p>
                                                                    <p className="text-white font-semibold text-lg">{p.formato}</p>
                                                                </div>

                                                                <div className="bg-zinc-900 rounded-lg p-4">
                                                                    <p className="text-zinc-400 text-sm mb-1 font-medium">Litri</p>
                                                                    <p className="text-emerald-400 font-semibold text-lg">{p.litriImpegnati?.toFixed(1)}</p>
                                                                </div>

                                                                <div className="bg-zinc-900 rounded-lg p-4">
                                                                    <p className="text-zinc-400 text-sm mb-1 font-medium">Lotto</p>
                                                                    <p className="text-white font-semibold text-lg">{p.lotto || "-"}</p>
                                                                </div>

                                                                <div className="bg-zinc-900 rounded-lg p-4">
                                                                    <p className="text-zinc-400 text-sm mb-1 font-medium">Data</p>
                                                                    <p className="text-zinc-300 text-sm">{formatDate(p.dataRichiesta)}</p>
                                                                </div>
                                                            </div>


                                                            {/* ACCESSORI */}
                                                            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                                                                <p className="text-l text-blue-300 font-semibold mb-1">
                                                                    🔧 Accessori per questa produzione:
                                                                </p>
                                                                <p className="text-l text-zinc-300">
                                                                    {getAccessoryList(p.formato)}
                                                                </p>
                                                            </div>

                                                            {/* NOTE PRECEDENTI */}
                                                            {p.note && (
                                                                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
                                                                    <p className="text-xs text-yellow-400 font-semibold mb-1">
                                                                        Note precedenti:
                                                                    </p>
                                                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                                                                        {p.note}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* NUOVA NOTA */}
                                                            <div className="space-y-2">
                                                                <label className="text-sm text-zinc-400 font-medium">Aggiungi Nota:</label>

                                                                <div className="flex flex-col sm:flex-row gap-2">
                                                                    <input
                                                                        type="text"
                                                                        defaultValue=""
                                                                        placeholder="Aggiungi nota..."
                                                                        onChange={(e) =>
                                                                            setPrenotazioni((prev) =>
                                                                                prev.map((row) =>
                                                                                    row.id === p.id
                                                                                        ? { ...row, nuovaNota: e.target.value }
                                                                                        : row
                                                                                )
                                                                            )
                                                                        }
                                                                        className="flex-1 bg-zinc-900 border border-zinc-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                                    />

                                                                    <button
                                                                        onClick={() => handleSalvaNota(p.id, p.nuovaNota)}
                                                                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors font-medium whitespace-nowrap"
                                                                        title="Salva nota"
                                                                    >
                                                                        💾 Salva
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* PULSANTI AZIONE */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <button
                                                                    onClick={() => handleConfermaProduzione(p)}
                                                                    className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg text-white transition-colors font-semibold"
                                                                >
                                                                    ✅ Conferma
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAggiornaStato(p.id, "annullato")}
                                                                    className="w-full bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg text-white transition-colors font-semibold"
                                                                >
                                                                    ❌ Annulla
                                                                </button>
                                                            </div>

                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>


                    </div>

                </div>

            </div>
        </div>
    );
};

export default GestioneProduzioneMagazzino;