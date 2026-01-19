import React, { useEffect, useState } from "react";
import { ArrowLeft, History, Filter, Search, X, TrendingDown, TrendingUp, Package, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StoricoScatolette = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState("");
    const [filterAsin, setFilterAsin] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("http://localhost:3005/api/v2/scatolette/storico");
                const data = await res.json();
                setRows(data);
                setFiltered(data);
            } catch (err) {
                console.error("Errore caricamento storico:", err);
            }
        };

        fetchData();
    }, []);

    // FILTRO
    useEffect(() => {
        let temp = [...rows];

        if (search.trim() !== "") {
            temp = temp.filter(r =>
                r.scatoletta?.toLowerCase().includes(search.toLowerCase()) ||
                r.nota?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (filterAsin.trim() !== "") {
            temp = temp.filter(r => r.asin_prodotto === filterAsin);
        }

        setFiltered(temp);
    }, [search, filterAsin, rows]);

    // Formatta data
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} - ${hours}:${minutes}`;
        } catch (err) {
            return dateString;
        }
    };

    // Statistiche
    const getTotaleCarichi = () => {
        return filtered.filter(r => r.delta > 0).reduce((sum, r) => sum + r.delta, 0);
    };

    const getTotaleScarichi = () => {
        return filtered.filter(r => r.delta < 0).reduce((sum, r) => sum + Math.abs(r.delta), 0);
    };

    const getScatoletteUniche = () => {
        return new Set(filtered.map(r => r.scatoletta)).size;
    };

    // Badge delta
    const getDeltaBadge = (delta) => {
        if (delta > 0) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                    <TrendingUp className="w-4 h-4" />
                    +{delta}
                </span>
            );
        } else if (delta < 0) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-full text-sm font-semibold">
                    <TrendingDown className="w-4 h-4" />
                    {delta}
                </span>
            );
        } else {
            return (
                <span className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded-full text-sm font-semibold">
                    0
                </span>
            );
        }
    };

    // Funzione reset storico
    const handleResetStorico = async () => {
        if (!window.confirm("⚠️ ATTENZIONE!\n\nQuesta operazione cancellerà TUTTO lo storico scatolette in modo permanente.\n\nSei sicuro di voler procedere?")) {
            return;
        }

        try {
            const res = await fetch("http://localhost:3005/api/v2/scatolette/storico/reset", {
                method: "DELETE",
            });

            const data = await res.json();

            if (data.ok) {
                alert("✅ Storico resettato con successo");
                setRows([]);
                setFiltered([]);
            } else {
                alert("❌ Errore nel reset dello storico");
            }
        } catch (err) {
            console.error("Errore reset storico:", err);
            alert("❌ Errore durante il reset");
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
            <div className="max-w-8xl mx-auto space-y-6">

                {/* ========== HEADER ========== */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <History className="w-8 h-8 text-purple-400" />
                                Storico Movimenti Scatolette
                            </h1>
                            <p className="text-zinc-400">Cronologia completa dei movimenti automatici di carico e scarico</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleResetStorico}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Reset Storico
                            </button>
                            
                            <button
                                onClick={() => navigate("/scatolette")}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Torna a Scatolette
                            </button>
                        </div>
                    </div>
                </div>

                {/* ========== STATISTICHE ========== */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-xl p-5 text-center hover:scale-105 transition-transform">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-purple-600 rounded-full">
                                <History className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{filtered.length}</p>
                        <p className="text-sm text-purple-200 font-medium">Movimenti</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-xl p-5 text-center hover:scale-105 transition-transform">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-green-600 rounded-full">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{getTotaleCarichi()}</p>
                        <p className="text-sm text-green-200 font-medium">Scarichi</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-700/50 rounded-xl p-5 text-center hover:scale-105 transition-transform">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-red-600 rounded-full">
                                <TrendingDown className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{getTotaleScarichi()}</p>
                        <p className="text-sm text-red-200 font-medium">Carichi</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl p-5 text-center hover:scale-105 transition-transform">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-blue-600 rounded-full">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{getScatoletteUniche()}</p>
                        <p className="text-sm text-blue-200 font-medium">Scatolette</p>
                    </div>
                </div>

                {/* ========== FILTRI ========== */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                        <Filter className="w-5 h-5 text-blue-400" />
                        Filtra Movimenti
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Ricerca libera */}
                        <div>
                            <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                                <Search className="w-4 h-4" />
                                Cerca per nota o scatoletta
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cerca per nota o nome scatoletta..."
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-10 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <Search className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filtro ASIN */}
                        <div>
                            <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Filtra per ASIN
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Es: B01234ABCD"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    value={filterAsin}
                                    onChange={(e) => setFilterAsin(e.target.value)}
                                />
                                {filterAsin && (
                                    <button
                                        onClick={() => setFilterAsin("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Indicatori filtri attivi */}
                    {(search || filterAsin) && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="text-sm text-zinc-400">Filtri attivi:</span>
                            {search && (
                                <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs font-medium flex items-center gap-1">
                                    Ricerca: {search}
                                    <button onClick={() => setSearch("")} className="hover:text-purple-300">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {filterAsin && (
                                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs font-medium flex items-center gap-1">
                                    ASIN: {filterAsin}
                                    <button onClick={() => setFilterAsin("")} className="hover:text-blue-300">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    setSearch("");
                                    setFilterAsin("");
                                }}
                                className="text-sm text-red-400 hover:text-red-300 underline ml-2"
                            >
                                Rimuovi tutti i filtri
                            </button>
                        </div>
                    )}
                </div>

                {/* ========== LISTA MOVIMENTI (CARDS) ========== */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                            <History className="w-5 h-5 text-purple-400" />
                            Lista Movimenti
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-normal">
                                {filtered.length}
                            </span>
                        </h2>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="inline-block p-6 bg-zinc-800 rounded-2xl mb-4">
                                <Package className="w-20 h-20 text-zinc-600 mx-auto" />
                            </div>
                            <p className="text-zinc-400 text-xl font-medium mb-2">Nessun movimento trovato</p>
                            <p className="text-zinc-500 text-sm mb-4">Non ci sono movimenti registrati con i filtri attuali</p>
                            {(search || filterAsin) && (
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setFilterAsin("");
                                    }}
                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
                                >
                                    Rimuovi i filtri
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map((r) => (
                                <div key={r.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 hover:border-purple-600 hover:shadow-lg hover:shadow-purple-900/20 transition-all">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                                        {/* Info Principale */}
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                                <h3 className="text-lg font-semibold text-white">{r.scatoletta}</h3>
                                                {getDeltaBadge(r.delta)}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                <div className="bg-zinc-900 rounded-lg p-3">
                                                    <p className="text-zinc-400 text-xs mb-1">ASIN</p>
                                                    <p className="text-white font-mono font-semibold">{r.asin_prodotto}</p>
                                                </div>
                                                <div className="bg-zinc-900 rounded-lg p-3">
                                                    <p className="text-zinc-400 text-xs mb-1">Quantità Finale</p>
                                                    <p className="text-white font-bold text-lg">{r.quantita_finale ?? "—"}</p>
                                                </div>
                                                <div className="bg-zinc-900 rounded-lg p-3">
                                                    <p className="text-zinc-400 text-xs mb-1">Operatore</p>
                                                    <p className="text-white font-medium">{r.operatore}</p>
                                                </div>
                                            </div>

                                            {r.nota && (
                                                <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                                                    <p className="text-xs text-blue-400 font-semibold mb-1 flex items-center gap-1">
                                                        📝 Nota:
                                                    </p>
                                                    <p className="text-sm text-blue-100">{r.nota}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Data */}
                                        <div className="flex-shrink-0 text-right bg-zinc-900 rounded-lg p-3 border border-zinc-700">
                                            <p className="text-xs text-zinc-400 mb-1 font-medium">Data Movimento</p>
                                            <p className="text-sm text-white font-semibold">{formatDate(r.created_at)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default StoricoScatolette;