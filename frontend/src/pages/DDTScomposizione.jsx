import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    FileText,
    Package,
    Split,
    Plus,
    Trash2,
    ChevronRight,
    Loader2,
    AlertCircle,
    CheckCircle,
    MoveRight,
    RefreshCw,
} from "lucide-react";

// ========== LOGICA CLASSIFICAZIONE PRODOTTO ==========
const CAPACITA_BOX = {
    "12ML_SINGOLO": 300,
    "12ML_KIT": 150,
    "100ML": 150,
    "DEFAULT": 150,
};

function detectMultipack(nome) {
    const patterns = [
        /\d+\s*pz/i, /\d+\s*pezzi/i, /\d+\s*x\s/i,
        /\bkit\b/i, /\bset\b/i, /\bcoppia\b/i, /\bduo\b/i, /\btwin\b/i, /\bpack\b/i,
    ];
    for (const p of patterns) if (p.test(nome)) return true;

    const composite = [
        /base\s*(e|&|\+)\s*top/i,
        /top\s*(e|&|\+)\s*base/i,
        /primer\s*(e|&|\+)\s*prep/i,
        /prep\s*(e|&|\+)\s*primer/i,
    ];
    for (const p of composite) if (p.test(nome)) return true;

    return false;
}

function classificaProdotto(nome) {
    const n = (nome || "").toLowerCase();
    if (/100\s*ml/i.test(n)) return { tipo: "100ML", capacita: CAPACITA_BOX["100ML"] };
    if (/12\s*ml/i.test(n) || /10\s*ml/i.test(n)) {
        return detectMultipack(n)
            ? { tipo: "12ML_KIT", capacita: CAPACITA_BOX["12ML_KIT"] }
            : { tipo: "12ML_SINGOLO", capacita: CAPACITA_BOX["12ML_SINGOLO"] };
    }
    return { tipo: "DEFAULT", capacita: CAPACITA_BOX.DEFAULT };
}

function calcolaInfoBox(nome, quantita) {
    const { capacita, tipo } = classificaProdotto(nome);
    const numBox = Math.ceil(quantita / capacita);
    return { capacita, tipo, numBox };
}

const DDTScomposizione = () => {
    const { idSpedizione } = useParams();
    const navigate = useNavigate();

    const [spedizione, setSpedizione] = useState(null);
    const [assegnazioni, setAssegnazioni] = useState([]);
    const [ddtCount, setDdtCount] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    // Modal per dividere quantità
    const [showDividiModal, setShowDividiModal] = useState(false);
    const [dividiTarget, setDividiTarget] = useState(null);
    const [dividiQty1, setDividiQty1] = useState(0);
    const [dividiQty2, setDividiQty2] = useState(0);
    const [dividiDdtDestinazione, setDividiDdtDestinazione] = useState(2);

    // Carica dati spedizione e assegnazioni
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Carica spedizione da prebolle
                const resSped = await fetch("/api/v2/ddt/prebolle");
                const prebolle = await resSped.json();
                const found = prebolle.find((s) => s.id === parseInt(idSpedizione));

                if (!found) {
                    setError("Spedizione non trovata");
                    setLoading(false);
                    return;
                }
                setSpedizione(found);

                // 2. Carica assegnazioni esistenti
                const resAss = await fetch(`http://localhost:3005/api/v2/ddt/assegnazioni/${idSpedizione}`);
                const dataAss = await resAss.json();

                if (dataAss.ok && dataAss.assegnazioni.length > 0) {
                    // Assegnazioni esistenti
                    setAssegnazioni(dataAss.assegnazioni);
                    setDdtCount(dataAss.ddtCount || 1);
                } else {
                    // Crea assegnazioni iniziali
                    await creaAssegnazioniIniziali();
                }
            } catch (err) {
                console.error("Errore caricamento:", err);
                setError("Errore durante il caricamento");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [idSpedizione]);

    // Crea assegnazioni iniziali (tutti al DDT 1)
    const creaAssegnazioniIniziali = async () => {
        try {
            const res = await fetch(`http://localhost:3005/api/v2/ddt/assegnazioni/${idSpedizione}/crea`, {
                method: "POST",
            });
            const data = await res.json();

            if (data.ok) {
                // Ricarica assegnazioni
                const resAss = await fetch(`http://localhost:3005/api/v2/ddt/assegnazioni/${idSpedizione}`);
                const dataAss = await resAss.json();
                setAssegnazioni(dataAss.assegnazioni || []);
                setDdtCount(1);
            }
        } catch (err) {
            console.error("Errore creazione assegnazioni:", err);
        }
    };

    // Aggiungi nuovo DDT
    const aggiungiDDT = () => {
        setDdtCount((prev) => prev + 1);
    };

    // Sposta prodotto a un altro DDT
    const spostaProdotto = async (assegnazioneId, nuovoDdtNumero) => {
        setSaving(true);
        try {
            const res = await fetch(`http://localhost:3005/api/v2/ddt/assegnazioni/${idSpedizione}/sposta`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assegnazioneId, nuovoDdtNumero }),
            });

            // SOSTITUISCI CON:
            if (res.ok) {
                // Ricarica dal server per evitare inconsistenze
                const resAss = await fetch(`http://localhost:3005/api/v2/ddt/assegnazioni/${idSpedizione}`);
                const dataAss = await resAss.json();
                if (dataAss.ok) {
                    setAssegnazioni(dataAss.assegnazioni || []);
                    const maxDdt = Math.max(1, ...dataAss.assegnazioni.map(a => a.ddt_numero));
                    setDdtCount(Math.max(ddtCount, maxDdt));
                }
            }
        } catch (err) {
            console.error("Errore spostamento:", err);
        } finally {
            setSaving(false);
        }
    };

    // Apri modal per dividere quantità
    const apriDividiModal = (assegnazione) => {
        const { capacita, numBox } = calcolaInfoBox(assegnazione.prodotto_nome, assegnazione.quantita);

        // Calcola box completi e eccedenza
        const boxCompleti = Math.floor(assegnazione.quantita / capacita);
        const eccedenza = assegnazione.quantita % capacita;

        // Proponi metà box a ciascuno, eccedenza in DDT1
        const boxDdt1 = Math.ceil(boxCompleti / 2);
        const boxDdt2 = boxCompleti - boxDdt1;

        setDividiTarget({
            ...assegnazione,
            capacitaBox: capacita,
            numBoxTotali: numBox,
            boxCompleti: boxCompleti,
            eccedenza: eccedenza,
        });

        // Quantità iniziale: metà box + eccedenza in DDT1
        setDividiQty1(boxDdt1 * capacita + eccedenza);
        setDividiQty2(boxDdt2 * capacita);
        setDividiDdtDestinazione(ddtCount + 1);
        setShowDividiModal(true);
    };

    // Conferma divisione
    const confermaDivisione = async () => {
        if (!dividiTarget) return;

        // Verifica che la somma sia corretta
        if (dividiQty1 + dividiQty2 !== dividiTarget.quantita) {
            alert(`La somma deve essere ${dividiTarget.quantita}`);
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`http://localhost:3005/api/v2/ddt/assegnazioni/${idSpedizione}/dividi`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assegnazioneId: dividiTarget.id,
                    quantitaDdt1: dividiQty1,
                    quantitaDdt2: dividiQty2,
                    nuovoDdtNumero: dividiDdtDestinazione,
                }),
            });

            if (res.ok) {
                // Ricarica assegnazioni
                const resAss = await fetch(`http://localhost:3005/api/v2/ddt/assegnazioni/${idSpedizione}`);
                const dataAss = await resAss.json();
                setAssegnazioni(dataAss.assegnazioni || []);
                setDdtCount(Math.max(ddtCount, dividiDdtDestinazione));
                setShowDividiModal(false);
            }
        } catch (err) {
            console.error("Errore divisione:", err);
        } finally {
            setSaving(false);
        }
    };

    // Reset assegnazioni
    const resetAssegnazioni = async () => {
        if (!window.confirm("Vuoi eliminare tutte le assegnazioni e ricominciare?")) return;

        setSaving(true);
        try {
            await fetch(`http://localhost:3005/api/v2/ddt/assegnazioni/${idSpedizione}/reset`, {
                method: "DELETE",
            });

            // Ricrea assegnazioni iniziali
            await creaAssegnazioniIniziali();
            setDdtCount(1);
        } catch (err) {
            console.error("Errore reset:", err);
        } finally {
            setSaving(false);
        }
    };

    // Vai a DDTDettaglio per un DDT specifico
    const vaiADettaglio = (ddtNumero) => {
        navigate(`/uffici/ddt/${idSpedizione}/${ddtNumero}`);
    };

    // Raggruppa assegnazioni per DDT
    const assegnazioniPerDDT = {};
    for (let i = 1; i <= ddtCount; i++) {
        assegnazioniPerDDT[i] = assegnazioni.filter((a) => a.ddt_numero === i);
    }

    // Loading
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">Caricamento...</p>
                </div>
            </div>
        );
    }

    // Errore
    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white p-8">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-6 flex items-center gap-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <div>
                            <h2 className="text-xl font-bold text-red-400 mb-2">Errore</h2>
                            <p className="text-red-200">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate("/uffici/ddt/prebolle")}
                        className="mt-6 flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* HEADER */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                                <Split className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Scomponi Spedizione</h1>
                                <p className="text-zinc-400 mt-1">
                                    Spedizione: <span className="text-orange-400 font-semibold">{spedizione?.progressivo}</span>
                                    {" | "}{spedizione?.paese}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={resetAssegnazioni}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white transition-all"
                            >
                                <RefreshCw className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
                                Reset
                            </button>
                            <button
                                onClick={() => navigate("/uffici/ddt/prebolle")}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Indietro
                            </button>
                        </div>
                    </div>
                </div>

                {/* ISTRUZIONI */}
                <div className="bg-gradient-to-r from-orange-900/20 to-amber-900/20 border border-orange-500/30 rounded-xl p-4">
                    <p className="text-orange-200 text-sm">
                        <strong>Come funziona:</strong> Usa i pulsanti per spostare i prodotti tra DDT diversi,
                        oppure clicca "Dividi" per dividere la quantità di un prodotto. Quando sei soddisfatto,
                        clicca "Compila DDT" per procedere.
                    </p>
                </div>

                {/* GRIGLIA DDT */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(ddtCount)].map((_, idx) => {
                        const ddtNum = idx + 1;
                        const prodotti = assegnazioniPerDDT[ddtNum] || [];
                        const totaleQty = prodotti.reduce((s, p) => s + p.quantita, 0);

                        return (
                            <div
                                key={ddtNum}
                                className={`bg-zinc-900 rounded-xl border-2 p-5 ${prodotti.length > 0
                                    ? "border-purple-500/50"
                                    : "border-zinc-700 border-dashed opacity-60"
                                    }`}
                            >
                                {/* Header DDT */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-lg">
                                            {ddtNum}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">DDT {ddtNum}</h3>
                                            <p className="text-sm text-zinc-400">
                                                {prodotti.length} prodotti • {totaleQty} pz
                                            </p>
                                        </div>
                                    </div>

                                    {prodotti.length > 0 && (
                                        <button
                                            onClick={() => vaiADettaglio(ddtNum)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white font-medium transition-all"
                                        >
                                            Compila DDT
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Lista prodotti */}
                                {prodotti.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-500">
                                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Nessun prodotto assegnato</p>
                                        <p className="text-xs mt-1">Sposta qui i prodotti dagli altri DDT</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {prodotti.map((p) => (
                                            <div
                                                key={p.id}
                                                className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium truncate text-sm">
                                                        {p.prodotto_nome}
                                                    </p>
                                                    <p className="text-xs text-zinc-400">
                                                        ASIN: {p.asin || "-"} • SKU: {p.sku || "-"}
                                                    </p>
                                                </div>

                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-emerald-400 font-bold">{p.quantita} pz</p>
                                                </div>

                                                {/* Azioni */}
                                                <div className="flex items-center gap-1">
                                                    {/* Dividi */}
                                                    <button
                                                        onClick={() => apriDividiModal(p)}
                                                        className="w-8 h-8 flex items-center justify-center bg-orange-600 hover:bg-orange-500 rounded-lg text-white transition-all"
                                                        title="Dividi quantità"
                                                    >
                                                        <Split className="w-4 h-4" />
                                                    </button>

                                                    {/* Sposta */}
                                                    {ddtCount > 1 && (
                                                        <select
                                                            onChange={(e) => spostaProdotto(p.id, parseInt(e.target.value))}
                                                            value=""
                                                            className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-xs cursor-pointer appearance-none text-center"
                                                            title="Sposta a DDT..."
                                                        >
                                                            <option value="" disabled>→</option>
                                                            {[...Array(ddtCount)].map((_, i) => {
                                                                const num = i + 1;
                                                                if (num === ddtNum) return null;
                                                                return (
                                                                    <option key={num} value={num}>
                                                                        DDT {num}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Pulsante Aggiungi DDT */}
                    <button
                        onClick={aggiungiDDT}
                        className="bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-700 p-8 flex flex-col items-center justify-center gap-3 hover:border-purple-500/50 hover:bg-zinc-800/50 transition-all group"
                    >
                        <div className="w-14 h-14 rounded-xl bg-zinc-800 group-hover:bg-purple-600 flex items-center justify-center transition-all">
                            <Plus className="w-7 h-7 text-zinc-400 group-hover:text-white" />
                        </div>
                        <span className="text-zinc-400 group-hover:text-white font-medium">
                            Aggiungi DDT {ddtCount + 1}
                        </span>
                    </button>
                </div>

                {/* MODAL DIVIDI */}
                {showDividiModal && dividiTarget && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Split className="w-5 h-5 text-orange-400" />
                                Dividi Quantità
                            </h3>

                            <p className="text-zinc-300 mb-4">
                                <strong>{dividiTarget.prodotto_nome}</strong>
                                <br />
                                <span className="text-zinc-400 text-sm">Quantità totale: {dividiTarget.quantita} pz</span>
                            </p>

                            <div className="space-y-4">
                                {/* Info Box */}
                                <div className="p-3 bg-blue-900/30 border border-blue-700/30 rounded-lg space-y-1">
                                    <p className="text-sm text-blue-300">
                                        <strong>Capacità box:</strong> {dividiTarget.capacitaBox} pz/box
                                    </p>
                                    <p className="text-sm text-blue-300">
                                        <strong>Box completi:</strong> {dividiTarget.boxCompleti} box ({dividiTarget.boxCompleti * dividiTarget.capacitaBox} pz)
                                    </p>
                                    {dividiTarget.eccedenza > 0 && (
                                        <p className="text-sm text-yellow-300">
                                            <strong>⚠️ Eccedenza:</strong> {dividiTarget.eccedenza} pz (da assegnare manualmente)
                                        </p>
                                    )}
                                    <p className="text-sm text-blue-300">
                                        <strong>Totale:</strong> {dividiTarget.quantita} pz
                                    </p>
                                </div>

                                {/* Pulsanti rapidi per box completi */}
                                {dividiTarget.boxCompleti > 1 && (
                                    <div className="p-3 bg-zinc-800 rounded-lg">
                                        <p className="text-xs text-zinc-400 mb-2">Divisione rapida per box:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {[...Array(dividiTarget.boxCompleti + 1)].map((_, i) => {
                                                const boxInDdt1 = i;
                                                const boxInDdt2 = dividiTarget.boxCompleti - i;
                                                const qtyDdt1 = boxInDdt1 * dividiTarget.capacitaBox;
                                                const qtyDdt2 = boxInDdt2 * dividiTarget.capacitaBox;

                                                return (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => {
                                                            setDividiQty1(qtyDdt1);
                                                            setDividiQty2(qtyDdt2 + dividiTarget.eccedenza);
                                                        }}
                                                        className={`px-3 py-1 rounded text-xs font-medium transition-all ${dividiQty1 === qtyDdt1 || dividiQty1 === qtyDdt1 + dividiTarget.eccedenza
                                                                ? "bg-purple-600 text-white"
                                                                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                                            }`}
                                                    >
                                                        {boxInDdt1}+{boxInDdt2}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {dividiTarget.eccedenza > 0 && (
                                            <p className="text-xs text-yellow-400 mt-2">
                                                + {dividiTarget.eccedenza} pz eccedenza (assegnata sotto)
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Input quantità DDT1 */}
                                <div>
                                    <label className="text-sm text-zinc-400 block mb-1">
                                        Quantità in DDT {dividiTarget.ddt_numero}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={dividiTarget.quantita}
                                        value={dividiQty1}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value) || 0;
                                            setDividiQty1(v);
                                            setDividiQty2(dividiTarget.quantita - v);
                                        }}
                                        className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2 text-white"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">
                                        = {Math.floor(dividiQty1 / dividiTarget.capacitaBox)} box
                                        {dividiQty1 % dividiTarget.capacitaBox > 0 && (
                                            <span className="text-yellow-400"> + {dividiQty1 % dividiTarget.capacitaBox} pz eccedenza</span>
                                        )}
                                    </p>
                                </div>

                                {/* Input quantità DDT destinazione */}
                                <div>
                                    <label className="text-sm text-zinc-400 block mb-1">
                                        Quantità in DDT destinazione
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={dividiTarget.quantita}
                                        value={dividiQty2}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value) || 0;
                                            setDividiQty2(v);
                                            setDividiQty1(dividiTarget.quantita - v);
                                        }}
                                        className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2 text-white"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">
                                        = {Math.floor(dividiQty2 / dividiTarget.capacitaBox)} box
                                        {dividiQty2 % dividiTarget.capacitaBox > 0 && (
                                            <span className="text-yellow-400"> + {dividiQty2 % dividiTarget.capacitaBox} pz eccedenza</span>
                                        )}
                                    </p>
                                </div>

                                {/* Verifica somma */}
                                <div className={`text-sm p-2 rounded ${dividiQty1 + dividiQty2 === dividiTarget.quantita
                                        ? "bg-emerald-900/30 text-emerald-400"
                                        : "bg-red-900/30 text-red-400"
                                    }`}>
                                    Somma: {dividiQty1} + {dividiQty2} = {dividiQty1 + dividiQty2} / {dividiTarget.quantita} pz
                                    {dividiQty1 + dividiQty2 === dividiTarget.quantita && " ✓"}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowDividiModal(false)}
                                    className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={confermaDivisione}
                                    disabled={dividiQty1 + dividiQty2 !== dividiTarget.quantita || saving}
                                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-lg text-white font-medium"
                                >
                                    {saving ? "Salvataggio..." : "Conferma Divisione"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DDTScomposizione;