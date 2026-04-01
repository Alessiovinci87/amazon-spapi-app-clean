import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    ArrowLeft,
    History,
    Filter,
    Search,
    X,
    Package,
    CheckCircle,
    Clock,
    AlertCircle,
    BarChart3,
    Save,
    Play,
    XCircle,
    FileText,
    Target,
    Beaker,
    RotateCcw
} from "lucide-react";
import ProduzioneCard from "../components/produzione/ProduzioneCard";
import { triggerReloadInventario } from "../utils/globalEvents";
import { fetchJSON, buildUrl } from "../utils/api";
import { normalizeState, getStateLabel } from "../utils/statoUtils";

const GestioneProduzione = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isUffici = location.pathname.startsWith('/uffici');
    const [prenotazioni, setPrenotazioni] = useState([]);
    const [sfusoData, setSfusoData] = useState([]);
    const [selectedProdotto, setSelectedProdotto] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [prodotti, setProdotti] = useState([]);
    const [filterSearchTerm, setFilterSearchTerm] = useState("");
    const [produzioneCounter, setProduzioneCounter] = useState(0);

    // ========== FETCH DATI ==========
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

    const fetchProdotti = async () => {
        try {
            const data = await fetchJSON("magazzino");
            setProdotti(data || []);
        } catch (err) {
            console.error("❌ Errore fetch prodotti:", err);
        }
    };

    const fetchProduzioneCounter = async () => {
        try {
            const data = await fetchJSON("config/produzione-counter");
            setProduzioneCounter(data.value ?? 0);
        } catch (err) {
            console.error("❌ Errore fetch contatore produzione:", err);
        }
    };

    const ricaricaDati = async () => {
        await Promise.all([fetchPrenotazioni(), fetchSfuso()]);
    };

    useEffect(() => {
        fetchSfuso();
        fetchPrenotazioni();
        fetchProdotti();
        fetchProduzioneCounter();
    }, []);

    const normalizzaAzione = (val) => {
        if (!val) return "CREATA";
        const upper = val.toUpperCase();
        if (["CREATA", "AGGIORNATA", "COMPLETATA", "ANNULLATA"].includes(upper)) {
            return upper;
        }
        return "AGGIORNATA";
    };

    // ========== STORICO PRODUZIONI ==========
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
                operatore: "admin"
            };


            const res = await fetch(buildUrl("storico-produzioni-sfuso"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const text = await res.text();
            if (!res.ok) {
                console.error("⚠️ Errore registrazione storico:", text);
                return;
            }

        } catch (err) {
            console.error("❌ Errore registraStoricoProduzione:", err);
        }
    };

    // ========== GESTIONE STATO PRENOTAZIONE ==========
    const handleAggiornaStato = async (id, nuovoStato) => {
        if (!id) {
            console.warn("⚠️ handleAggiornaStato: ID prenotazione mancante!");
            return;
        }

        const statoNormalizzato = normalizeState(nuovoStato);

        try {
            const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nuovoStato: statoNormalizzato,
                    operatore: "admin"
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("❌ Errore aggiornamento stato:", data);
                throw new Error("Errore aggiornamento stato");
            }


            if (statoNormalizzato === "annullato") {
                const prenotazione = prenotazioni.find(p => p.id === id);
                if (prenotazione) {
                    if (statoNormalizzato === "annullato") {
                        const pren = prenotazioni.find(p => p.id === id);
                        if (pren) {
                            await fetch(buildUrl("storico-prenotazioni"), {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    id_prenotazione: id,
                                    asin_prodotto: pren.asin_prodotto,
                                    nome_prodotto: pren.nome_prodotto,
                                    formato: pren.formato,
                                    quantita: pren.prodotti || pren.quantita || 0,
                                    evento: "AGGIORNATA",
                                    operatore: "admin",
                                    note: "Modifica quantità prenotazione"
                                })
                            });
                        }
                    }
                }
            }

            await ricaricaDati();
        } catch (err) {
            console.error("❌ Errore aggiornamento stato:", err);
            alert("Errore durante l'aggiornamento dello stato");
        }
    };

    // ========== MODIFICA QUANTITÀ ==========
    const handleModificaQuantita = async (id, nuovaQuantita) => {
        try {
            const quantitaNumerica = Number(nuovaQuantita);
            if (isNaN(quantitaNumerica) || quantitaNumerica <= 0) {
                alert("⚠️ Quantità non valida");
                return;
            }

            const oldRes = await fetch(buildUrl(`sfuso/prenotazione/${id}`));
            const oldData = await oldRes.json();

            if (!oldData || !oldData.data) {
                alert("Errore: impossibile recuperare la prenotazione iniziale");
                return;
            }

            const quantitaPrima = Number(oldData.data.prodotti);

            const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prodotti: quantitaNumerica,
                    operatore: "admin",
                }),
            });

            if (!res.ok) throw new Error("Errore modifica quantità");

            const resPren = await fetch(buildUrl(`sfuso/prenotazione/${id}`));
            const prenAgg = await resPren.json();

            if (!prenAgg || !prenAgg.data) {
                alert("Errore recupero prenotazione aggiornata");
                return;
            }

            const pren = prenAgg.data;

            await registraStoricoProduzione(
                {
                    ...pren,
                    id_produzione: pren.id_produzione || null,
                    quantita: quantitaNumerica,
                    note: `da ${quantitaPrima} a ${quantitaNumerica}`,
                },
                "AGGIORNATA"
            );

            await ricaricaDati();
            alert("✅ Quantità aggiornata e registrata nello storico");
        } catch (err) {
            console.error("❌ Errore modifica quantità:", err);
            alert("Errore durante la modifica della quantità");
        }
    };

    // ========== CONFERMA PRODUZIONE ==========
    const handleConfermaProduzione = async (prenotazione) => {
        try {
            const resPren = await fetch(buildUrl(`sfuso/prenotazione/${prenotazione.id}`));
            const prenAgg = await resPren.json();

            if (!prenAgg || !prenAgg.data) {
                alert("Errore recupero prenotazione aggiornata");
                return;
            }

            const pren = prenAgg.data;

            const resCrea = await fetch(buildUrl("produzioni-sfuso/crea-da-prenotazione"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pren)
            });

            if (!resCrea.ok) {
                const text = await resCrea.text();
                alert("Errore creazione produzione:\n" + text);
                return;
            }

            const dataCrea = await resCrea.json();
            const idProduzione = dataCrea?.id_produzione || dataCrea?.data?.id_produzione;

            if (!idProduzione) {
                alert("❌ Errore: ID produzione mancante.");
                return;
            }

            const resCompleta = await fetch(
                buildUrl(`produzioni-sfuso/${idProduzione}/completa`),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ operatore: "admin" }),
                }
            );

            if (!resCompleta.ok) {
                const errText = await resCompleta.text();
                alert("Errore completamento produzione:\n" + errText);
                return;
            }

            const resPrenUpdated = await fetch(buildUrl(`sfuso/prenotazione/${prenotazione.id}`));
            const prenAggUpdated = await resPrenUpdated.json();
            const prenUpdated = prenAggUpdated.data;

            if (!prenAggUpdated || !prenAggUpdated.data) {
                alert("Errore nel ricaricare la prenotazione aggiornata");
                return;
            }

            await registraStoricoProduzione(
                {
                    ...prenUpdated,
                    id_produzione: idProduzione
                },
                "COMPLETATA"
            );

            await handleAggiornaStato(pren.id, "CONFERMATA");
            triggerReloadInventario();
            await ricaricaDati();

            setPrenotazioni(prev => prev.filter(p => p.id !== prenotazione.id));
            alert("✅ Produzione completata");
        } catch (err) {
            console.error("❌ Errore generale handleConfermaProduzione:", err);
            alert("Errore durante la conferma produzione");
        }
    };

    // ========== NUOVA PRENOTAZIONE ==========
    const handleNewPrenotazione = async (newRow) => {
        setPrenotazioni((prev) => [...prev, newRow]);
        try {
            await fetchSfuso();
        } catch (err) {
            console.error("❌ Errore aggiornamento dati sfuso:", err);
        }
    };

    const handlePrenota = async (prenotazione) => {
        try {
            const res = await fetch("/api/v2/sfuso/prenotazione", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...prenotazione,
                    stato: normalizeState("prenotazione"),
                }),
            });

            if (!res.ok) throw new Error("Errore creazione prenotazione");

            const data = await res.json();

            if (data?.prenotazione) {
                setPrenotazioni((prev) => {
                    const esiste = prev.some(
                        (row) => row.id && data.prenotazione.id && Number(row.id) === Number(data.prenotazione.id)
                    );
                    if (esiste) return prev;
                    return [...prev, data.prenotazione];
                });
            }

            await ricaricaDati();
        } catch (err) {
            console.error("❌ Errore handlePrenota:", err);
            alert("Errore durante la creazione della prenotazione");
        }
    };

    const handleResetProduzioneCounter = async () => {
        if (!window.confirm("⚠️ Questo resetterà TUTTO: prenotazioni, produzioni, storico, contatore.\nProcedere?"))
            return;

        try {
            const res = await fetch(buildUrl("config/reset-contatore-produzione"), {
                method: "POST"
            });

            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            alert("✔ Reset completato");
            window.location.reload();
        } catch (err) {
            console.error("❌ Errore reset:", err);
            alert("Errore durante il reset totale");
        }
    };

    // ========== SALVATAGGIO NOTE ==========
    const handleSalvaNota = async (id, nota) => {
        try {
            const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note: nota, operatore: "admin" }),
            });
            if (!res.ok) throw new Error("Errore salvataggio nota");
            await fetchPrenotazioni();
            alert("✅ Nota salvata");
        } catch (err) {
            console.error("❌ Errore salvataggio nota:", err);
            alert("Errore salvataggio nota");
        }
    };

    // ========== FILTRI ==========
    const getFilteredPrenotazioni = (stato) => {
        const statoNormalizzato = normalizeState(stato);
        return prenotazioni.filter((p) => {
            if (normalizeState(p.stato) !== statoNormalizzato) return false;
            if (filterSearchTerm.trim()) {
                const term = filterSearchTerm.toLowerCase();
                const nomeProdotto = (p.nome_prodotto || "").toLowerCase();
                const asinProdotto = (p.asin_prodotto || "").toLowerCase();
                if (!nomeProdotto.includes(term) && !asinProdotto.includes(term)) {
                    return false;
                }
            }
            return true;
        });
    };

    const prenotazioniInLavorazione = getFilteredPrenotazioni("in_corso");
    const prenotazioniAttive = getFilteredPrenotazioni("pending");

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
            <div className="max-w-8xl mx-auto space-y-6">

                {/* ========== HEADER ========== */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <Beaker className="w-8 h-8 text-purple-400" />
                                Gestione Produzione
                            </h1>
                            <p className="text-zinc-400">Gestisci prenotazioni e produzioni</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => navigate(isUffici ? "/uffici/storici/movimenti" : "/magazzino/storici/sfuso")}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-colors"
                            >
                                <History className="w-4 h-4" />
                                Storico Produzioni
                            </button>

                            <button
                                onClick={() => navigate(isUffici ? "/dashboard" : "/magazzino")}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {isUffici ? "Dashboard" : "Magazzino"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ========== FILTRO RICERCA ========== */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                        <Filter className="w-5 h-5 text-purple-400" />
                        Filtra Prenotazioni
                    </h2>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Cerca per nome prodotto o ASIN..."
                            value={filterSearchTerm}
                            onChange={(e) => setFilterSearchTerm(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white px-12 py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        />
                        <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        {filterSearchTerm && (
                            <button
                                onClick={() => setFilterSearchTerm("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {filterSearchTerm && (
                        <div className="mt-3 px-3 py-2 bg-purple-900/20 border border-purple-700/30 rounded-lg">
                            <p className="text-sm text-purple-400">
                                Filtrando per: <strong>{filterSearchTerm}</strong>
                            </p>
                        </div>
                    )}
                </div>

                {/* ========== SELETTORE PRODOTTO (solo per ufficio) ========== */}
                {localStorage.getItem("role") === "ufficio" && (
                    <>
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                                <Target className="w-5 h-5 text-emerald-400" />
                                Seleziona Prodotto da Produrre
                            </h2>

                            <div className="relative mb-3">
                                <input
                                    type="text"
                                    placeholder="Cerca per nome, ASIN o SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 text-white px-12 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                />
                                <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

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
                                <div className="mt-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="text-emerald-400 font-semibold flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            Prodotto selezionato: <strong>{selectedProdotto.nome}</strong>
                                        </p>
                                        <p className="text-emerald-300/70 text-sm mt-1">
                                            ASIN: {selectedProdotto.asin} {selectedProdotto.sku ? `• SKU: ${selectedProdotto.sku}` : ""}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedProdotto(null)}
                                        className="flex items-center gap-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        Rimuovi
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* CARD PRODUZIONE PER FORMATO */}
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

                {/* ========== RESET CONTATORE (solo per ufficio) ========== */}
                {localStorage.getItem("role") === "ufficio" && (
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <RotateCcw className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-white font-semibold">Reset Totale Sistema</p>
                                <p className="text-zinc-400 text-sm">Elimina tutte le prenotazioni, produzioni e storico</p>
                            </div>
                        </div>
                        <button
                            onClick={handleResetProduzioneCounter}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors ${prenotazioniAttive.length === 0 && prenotazioniInLavorazione.length === 0
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-zinc-700 cursor-not-allowed opacity-50"
                                }`}
                            disabled={prenotazioniAttive.length > 0 || prenotazioniInLavorazione.length > 0}
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset Contatore
                        </button>
                    </div>
                )}

                {/* ========== STATISTICHE ========== */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-purple-600 rounded-full">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{prenotazioni.length}</p>
                        <p className="text-sm text-purple-200 font-medium">Totali</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-blue-600 rounded-full">
                                <AlertCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">
                            {prenotazioni.filter((p) => normalizeState(p.stato) === "pending").length}
                        </p>
                        <p className="text-sm text-blue-200 font-medium">Prenotazioni</p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-yellow-600 rounded-full">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">
                            {prenotazioni.filter((p) => normalizeState(p.stato) === "in_corso").length}
                        </p>
                        <p className="text-sm text-yellow-200 font-medium">In Lavorazione</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-green-600 rounded-full">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">
                            {prenotazioni.filter((p) => normalizeState(p.stato) === "completato").length}
                        </p>
                        <p className="text-sm text-green-200 font-medium">Completate</p>
                    </div>
                </div>

                {/* ========== IN LAVORAZIONE ========== */}
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-6 py-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock className="w-6 h-6" />
                            In Lavorazione
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                {prenotazioniInLavorazione.length}
                            </span>
                        </h2>
                    </div>

                    <div className="p-6">
                        {prenotazioniInLavorazione.length === 0 ? (
                            <div className="text-center py-12">
                                <Clock className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-400">Nessuna prenotazione in lavorazione</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-zinc-800 text-white">
                                            <th className="p-4 text-left rounded-tl-lg">Nome Prodotto</th>
                                            <th className="p-4 text-left">Formato</th>
                                            <th className="p-4 text-left">Quantità</th>
                                            <th className="p-4 text-left">Lotto</th>
                                            <th className="p-4 text-left">Note</th>
                                            <th className="p-4 text-left rounded-tr-lg">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-700">
                                        {prenotazioniInLavorazione.map((p) => (
                                            <React.Fragment key={p.id}>
                                                <tr className="hover:bg-zinc-800/50 transition-colors">
                                                    <td className="p-4 text-white font-medium">
                                                        {(p.nome_prodotto || "-").replace(/\(NUOVO\)|\(VECCHIO\)/gi, "").trim()}
                                                    </td>
                                                    <td className="p-4 text-zinc-300">{p.formato}</td>
                                                    <td className="p-4">
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
                                                                className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 rounded-lg w-24 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                                                            />
                                                            <button
                                                                onClick={() => handleModificaQuantita(p.id, p.nuovaQuantita || p.prodotti)}
                                                                className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-zinc-300">
                                                        {p.lotto || "-"}{" "}
                                                        {(() => {
                                                            const sfuso = sfusoData.find((s) => s.id === p.id_sfuso);
                                                            if (!sfuso) return "";
                                                            if (p.lotto === sfuso.lotto_old) return "(VECCHIO)";
                                                            if (p.lotto === sfuso.lotto) return "(NUOVO)";
                                                            return "";
                                                        })()}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                defaultValue=""
                                                                placeholder="Aggiungi nota..."
                                                                onChange={(e) =>
                                                                    setPrenotazioni((prev) =>
                                                                        prev.map((row) =>
                                                                            row.id === p.id ? { ...row, nuovaNota: e.target.value } : row
                                                                        )
                                                                    )
                                                                }
                                                                className="flex-1 bg-zinc-800 border border-zinc-700 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                            />
                                                            <button
                                                                onClick={() => handleSalvaNota(p.id, p.nuovaNota)}
                                                                className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleConfermaProduzione(p)}
                                                                className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                                Conferma
                                                            </button>
                                                            <button
                                                                onClick={() => handleAggiornaStato(p.id, "annullato")}
                                                                className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                                Annulla
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {p.note && (
                                                    <tr className="bg-yellow-900/10">
                                                        <td colSpan="6" className="p-4">
                                                            <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                                                                <p className="text-xs text-yellow-400 font-semibold mb-1">Note precedenti:</p>
                                                                <p className="text-sm text-yellow-100">{p.note}</p>
                                                            </div>
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
                </div>

                {/* ========== PRENOTAZIONI ATTIVE ========== */}
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Package className="w-6 h-6" />
                            Prenotazioni Attive
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                {prenotazioniAttive.length}
                            </span>
                        </h2>
                    </div>

                    <div className="p-6">
                        {prenotazioniAttive.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-400">Nessuna prenotazione attiva</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-zinc-800 text-white">
                                            <th className="p-4 text-left rounded-tl-lg">Nome Prodotto</th>
                                            <th className="p-4 text-left">Formato</th>
                                            <th className="p-4 text-left">Litri</th>
                                            <th className="p-4 text-left">Lotto</th>
                                            <th className="p-4 text-left">Prodotti</th>
                                            <th className="p-4 text-left">Priorità</th>
                                            <th className="p-4 text-left">Data</th>
                                            <th className="p-4 text-left">Note</th>
                                            <th className="p-4 text-left rounded-tr-lg">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-700">
                                        {prenotazioniAttive.map((p, idx) => {
                                            const stableKey = p.id ?? p.tempKey ?? `pren-${idx}`;
                                            const hasId = Boolean(p.id);

                                            return (
                                                <tr key={stableKey} className="hover:bg-zinc-800/50 transition-colors">
                                                    <td className="p-4 text-white font-medium">
                                                        {(p.nome_prodotto || "-").replace(/\(NUOVO\)|\(VECCHIO\)/gi, "").trim()}
                                                    </td>
                                                    <td className="p-4 text-zinc-300">{p.formato}</td>
                                                    <td className="p-4 text-emerald-400 font-semibold">
                                                        {p.litriImpegnati?.toFixed(1)}
                                                    </td>
                                                    <td className="p-4 text-zinc-300">{p.lotto || "-"}</td>
                                                    <td className="p-4 text-white font-bold">{p.prodotti}</td>
                                                    <td className="p-4 text-zinc-300">{p.priorita}</td>
                                                    <td className="p-4 text-zinc-400 text-xs">{p.dataRichiesta}</td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
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
                                                                className="flex-1 bg-zinc-800 border border-zinc-700 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                            />
                                                            <button
                                                                onClick={() => handleSalvaNota(p.id, p.note)}
                                                                className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <button
                                                            disabled={!hasId}
                                                            onClick={() => hasId && handleAggiornaStato(p.id, "in_corso")}
                                                            className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-colors ${hasId
                                                                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                                                : "bg-zinc-700 cursor-not-allowed text-zinc-500"
                                                                }`}
                                                        >
                                                            <Play className="w-4 h-4" />
                                                            In lavorazione
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GestioneProduzione;