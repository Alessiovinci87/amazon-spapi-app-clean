import React, { useState, useEffect } from "react";
import { toast } from 'sonner';
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    ArrowLeft,
    History,
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
    RotateCcw,
    Factory,
    LogOut,
    FolderTree,
    Wrench,
} from "lucide-react";
import ProduzioneCard from "../components/produzione/ProduzioneCard";
import { triggerReloadInventario } from "../utils/globalEvents";
import { fetchJSON, buildUrl } from "../utils/api";
import { normalizeState, getStateLabel } from "../utils/statoUtils";

/* ── Shared UI ──────────────────────────────────────────── */

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors";

const SECTION_ACCENTS = {
    indigo:  { bar: "bg-indigo-400",  icon: "text-indigo-400",  bgIcon: "bg-indigo-500/10 border-indigo-500/30" },
    cyan:    { bar: "bg-cyan-400",    icon: "text-cyan-400",    bgIcon: "bg-cyan-500/10 border-cyan-500/30" },
    emerald: { bar: "bg-emerald-400", icon: "text-emerald-400", bgIcon: "bg-emerald-500/10 border-emerald-500/30" },
    yellow:  { bar: "bg-yellow-400",  icon: "text-yellow-400",  bgIcon: "bg-yellow-500/10 border-yellow-500/30" },
    violet:  { bar: "bg-violet-400",  icon: "text-violet-400",  bgIcon: "bg-violet-500/10 border-violet-500/30" },
    rose:    { bar: "bg-rose-400",    icon: "text-rose-400",    bgIcon: "bg-rose-500/10 border-rose-500/30" },
    amber:   { bar: "bg-amber-400",   icon: "text-amber-400",   bgIcon: "bg-amber-500/10 border-amber-500/30" },
    blue:    { bar: "bg-blue-400",    icon: "text-blue-400",    bgIcon: "bg-blue-500/10 border-blue-500/30" },
};

function SectionCard({ accent = "indigo", eyebrow, title, icon: Icon, children }) {
    const a = SECTION_ACCENTS[accent] ?? SECTION_ACCENTS.indigo;
    return (
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar}/60`} />
            <div className="px-5 sm:px-6 py-5">
                {(eyebrow || title) && (
                    <div className="flex items-center gap-3 mb-4">
                        {Icon && (
                            <div className={`w-8 h-8 rounded-md border ${a.bgIcon} flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-4 h-4 ${a.icon}`} />
                            </div>
                        )}
                        <div className="min-w-0">
                            {eyebrow && (
                                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">
                                    {eyebrow}
                                </div>
                            )}
                            {title && (
                                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-tight truncate">
                                    {title}
                                </h2>
                            )}
                        </div>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}

function StatTile({ icon: Icon, label, value, accent = "violet" }) {
    const m = {
        violet:  "bg-violet-500/10 border-violet-500/40 text-violet-400",
        emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
        amber:   "bg-amber-500/10 border-amber-500/40 text-amber-400",
        rose:    "bg-rose-500/10 border-rose-500/40 text-rose-400",
        blue:    "bg-blue-500/10 border-blue-500/40 text-blue-400",
    };
    return (
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
            <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${m[accent]}`}>
                    <Icon className="w-[18px] h-[18px]" />
                </div>
            </div>
            <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{label}</div>
        </div>
    );
}

function PriorityBadge({ priorita }) {
    const { t } = useTranslation();
    const p = (priorita || "").toLowerCase();
    const map = {
        alta:  { cls: "bg-rose-500/10 border-rose-500/30 text-rose-400", label: t("gestioneProduzioneUfficio.priority_alta") },
        media: { cls: "bg-amber-500/10 border-amber-500/30 text-amber-400", label: t("gestioneProduzioneUfficio.priority_media") },
        bassa: { cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", label: t("gestioneProduzioneUfficio.priority_bassa") },
    };
    const b = map[p] || { cls: "bg-slate-500/10 border-slate-500/30 text-slate-400", label: t("gestioneProduzioneUfficio.priority_na") };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${b.cls}`}>{b.label}</span>;
}

/* ── Componente principale ───────────────────────────────── */

const GestioneProduzione = () => {
    const { t } = useTranslation();
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
            console.error("Errore fetch sfuso:", err);
        }
    };

    const fetchPrenotazioni = async () => {
        try {
            const data = await fetchJSON("sfuso/prenotazioni");
            setPrenotazioni(data);
        } catch (err) {
            console.error("Errore fetch prenotazioni:", err);
        }
    };

    const fetchProdotti = async () => {
        try {
            const data = await fetchJSON("magazzino");
            setProdotti(data || []);
        } catch (err) {
            console.error("Errore fetch prodotti:", err);
        }
    };

    const fetchProduzioneCounter = async () => {
        try {
            const data = await fetchJSON("config/produzione-counter");
            setProduzioneCounter(data.value ?? 0);
        } catch (err) {
            console.error("Errore fetch contatore produzione:", err);
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
                console.error("Errore registrazione storico:", text);
                return;
            }
        } catch (err) {
            console.error("Errore registraStoricoProduzione:", err);
        }
    };

    // ========== GESTIONE STATO PRENOTAZIONE ==========
    const handleAggiornaStato = async (id, nuovoStato) => {
        if (!id) {
            console.warn("handleAggiornaStato: ID prenotazione mancante!");
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
                console.error("Errore aggiornamento stato:", data);
                throw new Error("Errore aggiornamento stato");
            }

            if (statoNormalizzato === "annullato") {
                const prenotazione = prenotazioni.find(p => p.id === id);
                if (prenotazione) {
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
                                note: "Modifica quantita prenotazione"
                            })
                        });
                    }
                }
            }

            await ricaricaDati();
        } catch (err) {
            console.error("Errore aggiornamento stato:", err);
            toast.error(t("gestioneProduzioneUfficio.toast_err_stato"));
        }
    };

    // ========== MODIFICA QUANTITA ==========
    const handleModificaQuantita = async (id, nuovaQuantita) => {
        try {
            const quantitaNumerica = Number(nuovaQuantita);
            if (isNaN(quantitaNumerica) || quantitaNumerica <= 0) {
                toast.warning(t("gestioneProduzioneUfficio.toast_err_quantita_non_valida"));
                return;
            }

            const oldRes = await fetch(buildUrl(`sfuso/prenotazione/${id}`));
            const oldData = await oldRes.json();

            if (!oldData || !oldData.data) {
                toast.error(t("gestioneProduzioneUfficio.toast_err_recupero_prenotazione"));
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

            if (!res.ok) throw new Error("Errore modifica quantita");

            const resPren = await fetch(buildUrl(`sfuso/prenotazione/${id}`));
            const prenAgg = await resPren.json();

            if (!prenAgg || !prenAgg.data) {
                toast.error(t("gestioneProduzioneUfficio.toast_err_recupero_aggiornata"));
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
            toast.success(t("gestioneProduzioneUfficio.toast_quantita_aggiornata"));
        } catch (err) {
            console.error("Errore modifica quantita:", err);
            toast.error(t("gestioneProduzioneUfficio.toast_err_modifica_quantita"));
        }
    };

    // ========== CONFERMA PRODUZIONE ==========
    const handleConfermaProduzione = async (prenotazione) => {
        try {
            const resPren = await fetch(buildUrl(`sfuso/prenotazione/${prenotazione.id}`));
            const prenAgg = await resPren.json();

            if (!prenAgg || !prenAgg.data) {
                toast.error(t("gestioneProduzioneUfficio.toast_err_recupero_aggiornata"));
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
                toast.info(t("gestioneProduzioneUfficio.toast_err_creazione_produzione") + text);
                return;
            }

            const dataCrea = await resCrea.json();
            const idProduzione = dataCrea?.id_produzione || dataCrea?.data?.id_produzione;

            if (!idProduzione) {
                toast.error(t("gestioneProduzioneUfficio.toast_err_id_produzione"));
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
                toast.info(t("gestioneProduzioneUfficio.toast_err_completamento") + errText);
                return;
            }

            const resPrenUpdated = await fetch(buildUrl(`sfuso/prenotazione/${prenotazione.id}`));
            const prenAggUpdated = await resPrenUpdated.json();
            const prenUpdated = prenAggUpdated.data;

            if (!prenAggUpdated || !prenAggUpdated.data) {
                toast.error(t("gestioneProduzioneUfficio.toast_err_ricarica_prenotazione"));
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
            toast.success(t("gestioneProduzioneUfficio.toast_produzione_completata"));
        } catch (err) {
            console.error("Errore generale handleConfermaProduzione:", err);
            toast.error(t("gestioneProduzioneUfficio.toast_err_conferma"));
        }
    };

    // ========== NUOVA PRENOTAZIONE ==========
    const handleNewPrenotazione = async (newRow) => {
        setPrenotazioni((prev) => [...prev, newRow]);
        try {
            await fetchSfuso();
        } catch (err) {
            console.error("Errore aggiornamento dati sfuso:", err);
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
            console.error("Errore handlePrenota:", err);
            toast.error(t("gestioneProduzioneUfficio.toast_err_creazione_prenotazione"));
        }
    };

    const handleResetProduzioneCounter = async () => {
        if (!window.confirm(t("gestioneProduzioneUfficio.confirm_reset_totale")))
            return;

        try {
            const res = await fetch(buildUrl("config/reset-contatore-produzione"), {
                method: "POST"
            });

            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            toast.success(t("gestioneProduzioneUfficio.toast_reset_ok"));
            window.location.reload();
        } catch (err) {
            console.error("Errore reset:", err);
            toast.error(t("gestioneProduzioneUfficio.toast_reset_err"));
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
            toast.success(t("gestioneProduzioneUfficio.toast_nota_salvata"));
        } catch (err) {
            console.error("Errore salvataggio nota:", err);
            toast.error(t("gestioneProduzioneUfficio.toast_err_salvataggio_nota"));
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
        <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
            {/* Texture grid */}
            <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

            {/* === Top bar === */}
            <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => navigate(isUffici ? "/dashboard" : "/magazzino")} type="button" title={t("gestioneProduzioneUfficio.title_indietro")} className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
                            <Factory className="w-[18px] h-[18px] text-violet-400" />
                        </div>
                        <div className="flex flex-col leading-none min-w-0">
                            <span className="text-[15px] font-semibold tracking-tight text-white truncate">{t("gestioneProduzioneUfficio.topbar_title")}</span>
                            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{t("gestioneProduzioneUfficio.topbar_eyebrow")}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <button onClick={() => navigate(isUffici ? "/uffici/storici/movimenti" : "/magazzino/storici/sfuso")} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-[12px] font-medium transition-all">
                            <History className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t("gestioneProduzioneUfficio.btn_storico_produzioni")}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* === Hero === */}
            <section className="relative">
                <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("gestioneProduzioneUfficio.page_eyebrow")}</div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
                        {t("gestioneProduzioneUfficio.hero_title_main")} <span className="text-slate-500">{t("gestioneProduzioneUfficio.hero_title_suffix")}</span>
                    </h1>
                    <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
                        {t("gestioneProduzioneUfficio.intro")}
                    </p>
                </div>
            </section>

            {/* === Contenuto === */}
            <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

                {/* Statistiche */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatTile icon={BarChart3} label={t("gestioneProduzioneUfficio.stat_totali")} value={prenotazioni.length} accent="violet" />
                    <StatTile icon={AlertCircle} label={t("gestioneProduzioneUfficio.stat_prenotazioni")} value={prenotazioni.filter((p) => normalizeState(p.stato) === "pending").length} accent="blue" />
                    <StatTile icon={Clock} label={t("gestioneProduzioneUfficio.stat_in_lavorazione")} value={prenotazioni.filter((p) => normalizeState(p.stato) === "in_corso").length} accent="amber" />
                    <StatTile icon={CheckCircle} label={t("gestioneProduzioneUfficio.stat_completate")} value={prenotazioni.filter((p) => normalizeState(p.stato) === "completato").length} accent="emerald" />
                </div>

                {/* Ricerca */}
                <SectionCard accent="violet" eyebrow={t("gestioneProduzioneUfficio.section_ricerca_eyebrow")} title={t("gestioneProduzioneUfficio.section_ricerca_title")} icon={Search}>
                    <div className="relative">
                        <input type="text" placeholder={t("gestioneProduzioneUfficio.ph_cerca_prodotto_asin")} value={filterSearchTerm} onChange={(e) => setFilterSearchTerm(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        {filterSearchTerm && (
                            <button onClick={() => setFilterSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {filterSearchTerm && (
                        <div className="mt-3 px-3 py-2 bg-violet-500/5 border border-violet-500/30 rounded-md">
                            <p className="text-xs text-violet-300">{t("gestioneProduzioneUfficio.filtrando_per")} <strong>{filterSearchTerm}</strong></p>
                        </div>
                    )}
                </SectionCard>

                {/* Selettore prodotto + creazione prenotazione — solo nella pagina Uffici */}
                {isUffici && (
                    <>
                        <SectionCard accent="emerald" eyebrow={t("gestioneProduzioneUfficio.section_nuova_eyebrow")} title={t("gestioneProduzioneUfficio.section_seleziona_title")} icon={Target}>
                            <div className="relative mb-3">
                                <input type="text" placeholder={t("gestioneProduzioneUfficio.ph_cerca_nome_asin_sku")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
                                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {searchTerm.trim() && (
                                <div className="max-h-64 overflow-y-auto border border-slate-700 rounded-md bg-slate-800/60">
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
                                                <div className="p-4 text-center text-slate-500 text-sm">
                                                    {t("gestioneProduzioneUfficio.empty_no_prodotto", { term: searchTerm })}
                                                </div>
                                            );
                                        }

                                        return filtered.map((p) => (
                                            <div
                                                key={p.asin}
                                                onClick={() => { setSelectedProdotto(p); setSearchTerm(""); }}
                                                className={`p-3 cursor-pointer hover:bg-slate-700/60 transition-colors border-b border-slate-700/60 last:border-b-0 ${selectedProdotto?.asin === p.asin ? "bg-emerald-500/10 border-l-2 border-l-emerald-400" : ""}`}
                                            >
                                                <p className="text-sm font-medium text-white">{p.nome}</p>
                                                <p className="text-xs text-slate-400">
                                                    ASIN: {p.asin} {p.sku ? `· SKU: ${p.sku}` : ""}
                                                </p>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}

                            {selectedProdotto && (
                                <div className="mt-3 p-4 bg-emerald-500/5 border border-emerald-500/30 rounded-md flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-emerald-300 font-medium text-sm flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                            <span className="truncate">{selectedProdotto.nome}</span>
                                        </p>
                                        <p className="text-emerald-400/60 text-xs mt-1">
                                            ASIN: {selectedProdotto.asin} {selectedProdotto.sku ? `· SKU: ${selectedProdotto.sku}` : ""}
                                        </p>
                                    </div>
                                    <button onClick={() => setSelectedProdotto(null)} className="flex items-center gap-1 px-3 py-2 rounded-md bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all flex-shrink-0">
                                        <X className="w-3.5 h-3.5" />
                                        {t("gestioneProduzioneUfficio.btn_rimuovi")}
                                    </button>
                                </div>
                            )}
                        </SectionCard>

                        {/* Card produzione per formato */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <ProduzioneCard formato="10ml" selectedProdotto={selectedProdotto} sfusoData={sfusoData} onPrenota={handlePrenota} />
                            <ProduzioneCard formato="12ml" selectedProdotto={selectedProdotto} sfusoData={sfusoData} onPrenota={handlePrenota} />
                            <ProduzioneCard formato="100ml" selectedProdotto={selectedProdotto} sfusoData={sfusoData} onPrenota={handlePrenota} />
                        </div>
                    </>
                )}

                {/* Reset contatore — solo nella pagina Uffici */}
                {isUffici && (
                    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400/60" />
                        <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                                    <RotateCcw className="w-[18px] h-[18px] text-rose-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{t("gestioneProduzioneUfficio.reset_title")}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{t("gestioneProduzioneUfficio.reset_desc")}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleResetProduzioneCounter}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all ${
                                    prenotazioniAttive.length === 0 && prenotazioniInLavorazione.length === 0
                                        ? "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200"
                                        : "bg-slate-800/60 border border-slate-700 text-slate-600 cursor-not-allowed"
                                }`}
                                disabled={prenotazioniAttive.length > 0 || prenotazioniInLavorazione.length > 0}
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                {t("gestioneProduzioneUfficio.btn_reset_contatore")}
                            </button>
                        </div>
                    </div>
                )}

                {/* Griglia due colonne: In Lavorazione + Prenotazioni Attive */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Colonna In Lavorazione */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center">
                                <Clock className="w-[18px] h-[18px] text-amber-400" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{t("gestioneProduzioneUfficio.col_produzione_eyebrow")}</div>
                                <h2 className="text-base font-semibold text-white">{t("gestioneProduzioneUfficio.col_in_lavorazione_title")}</h2>
                            </div>
                            <span className="ml-auto px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-medium tabular-nums">{prenotazioniInLavorazione.length}</span>
                        </div>

                        {prenotazioniInLavorazione.length === 0 ? (
                            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-8 text-center">
                                <Clock className="w-7 h-7 text-slate-700 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">{t("gestioneProduzioneUfficio.empty_no_lavorazione")}</p>
                            </div>
                        ) : (
                            prenotazioniInLavorazione.map((p) => {
                                const cleanName = (p.nome_prodotto || "-").replace(/\(NUOVO\)|\(VECCHIO\)/gi, "").trim();
                                return (
                                    <div key={p.id} className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />
                                        <div className="px-5 py-4 sm:px-6 sm:py-5 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-semibold text-white truncate">{cleanName}</h3>
                                                    <p className="text-xs text-slate-500 mt-1">{t("gestioneProduzioneUfficio.lbl_formato_lotto", { formato: p.formato, lotto: p.lotto || "-" })}</p>
                                                </div>
                                                <span className="text-2xl font-semibold text-white tabular-nums flex-shrink-0">{p.prodotti}</span>
                                            </div>

                                            {/* Quantita */}
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="number" defaultValue={p.prodotti} min="1"
                                                    onChange={(e) => setPrenotazioni((prev) => prev.map((row) => row.id === p.id ? { ...row, nuovaQuantita: e.target.value } : row))}
                                                    className="w-24 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-white text-lg font-semibold text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                                                />
                                                <button onClick={() => handleModificaQuantita(p.id, p.nuovaQuantita || p.prodotti)} type="button" className="px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 transition-all flex-shrink-0">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Note precedenti */}
                                            {p.note && (
                                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-md px-4 py-2.5">
                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-amber-400 mb-1 flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> {t("gestioneProduzioneUfficio.note_precedenti")}
                                                    </p>
                                                    <p className="text-[13px] text-amber-200/80">{p.note}</p>
                                                </div>
                                            )}

                                            {/* Nota input */}
                                            <div className="flex gap-2">
                                                <input type="text" defaultValue="" placeholder={t("gestioneProduzioneUfficio.ph_aggiungi_nota")} onChange={(e) => setPrenotazioni((prev) => prev.map((row) => row.id === p.id ? { ...row, nuovaNota: e.target.value } : row))} className={inputCls} />
                                                <button onClick={() => handleSalvaNota(p.id, p.nuovaNota)} type="button" className="px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400 transition-all flex-shrink-0">
                                                    <Save className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Azioni */}
                                            <div className="flex gap-2">
                                                <button onClick={() => handleConfermaProduzione(p)} type="button" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-sm font-medium transition-all">
                                                    <CheckCircle className="w-4 h-4" /> {t("gestioneProduzioneUfficio.btn_conferma")}
                                                </button>
                                                <button onClick={() => handleAggiornaStato(p.id, "annullato")} type="button" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-sm font-medium transition-all">
                                                    <XCircle className="w-4 h-4" /> {t("gestioneProduzioneUfficio.btn_annulla")}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Colonna Prenotazioni Attive */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
                                <Package className="w-[18px] h-[18px] text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{t("gestioneProduzioneUfficio.col_prenotazioni_eyebrow")}</div>
                                <h2 className="text-base font-semibold text-white">{t("gestioneProduzioneUfficio.col_attive_title")}</h2>
                            </div>
                            <span className="ml-auto px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium tabular-nums">{prenotazioniAttive.length}</span>
                        </div>

                        {prenotazioniAttive.length === 0 ? (
                            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-8 text-center">
                                <Package className="w-7 h-7 text-slate-700 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">{t("gestioneProduzioneUfficio.empty_no_attive")}</p>
                            </div>
                        ) : (
                            prenotazioniAttive.map((p, idx) => {
                                const stableKey = p.id ?? p.tempKey ?? `pren-${idx}`;
                                const hasId = Boolean(p.id);
                                const cleanName = (p.nome_prodotto || "-").replace(/\(NUOVO\)|\(VECCHIO\)/gi, "").trim();

                                return (
                                    <div key={stableKey} className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
                                        <div className="px-5 py-4 sm:px-6 sm:py-5 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-semibold text-white truncate mb-1.5">{cleanName}</h3>
                                                    <PriorityBadge priorita={p.priorita} />
                                                </div>
                                                <span className="text-2xl font-semibold text-white tabular-nums flex-shrink-0">{p.prodotti}</span>
                                            </div>

                                            {/* Info grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { label: t("gestioneProduzioneUfficio.info_formato"), value: p.formato },
                                                    { label: t("gestioneProduzioneUfficio.info_litri"), value: p.litriImpegnati?.toFixed(1) },
                                                    { label: t("gestioneProduzioneUfficio.info_lotto"), value: p.lotto || "-" },
                                                    { label: t("gestioneProduzioneUfficio.info_data"), value: p.dataRichiesta || "-" },
                                                ].map((item) => (
                                                    <div key={item.label} className="bg-slate-800/40 border border-slate-700/60 rounded-md px-3 py-2">
                                                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{item.label}</p>
                                                        <p className="text-sm text-white font-medium truncate">{item.value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Nota input */}
                                            <div className="flex gap-2">
                                                <input type="text" value={p.note ?? ""} placeholder={t("gestioneProduzioneUfficio.ph_aggiungi_nota")} onChange={(e) => setPrenotazioni((prev) => prev.map((row) => row.id === p.id ? { ...row, note: e.target.value } : row))} className={inputCls} />
                                                <button onClick={() => handleSalvaNota(p.id, p.note)} type="button" className="px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400 transition-all flex-shrink-0">
                                                    <Save className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Azione */}
                                            <button
                                                disabled={!hasId}
                                                onClick={() => hasId && handleAggiornaStato(p.id, "in_corso")}
                                                type="button"
                                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <Play className="w-4 h-4" /> {t("gestioneProduzioneUfficio.btn_in_lavorazione")}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            {/* === Footer === */}
            <footer className="relative border-t border-slate-800 bg-slate-900/40">
                <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
                    <span>© {new Date().getFullYear()} {t("gestioneProduzioneUfficio.footer_section")}</span>
                    <span className="font-mono">v2.0</span>
                </div>
            </footer>
        </div>
    );
};

export default GestioneProduzione;
