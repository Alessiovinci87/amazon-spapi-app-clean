import React, { useEffect, useState } from "react";
import { ArrowLeft, History, Search, X, TrendingDown, TrendingUp, Package, Trash2, FileText, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

/* ── Helpers ─────────────────────────────────────────────── */

const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
        const d = new Date(dateString);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch { return dateString; }
};

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors";

/* ── Shared UI ──────────────────────────────────────────── */

function StatTile({ icon: Icon, label, value, accent = "violet" }) {
    const m = {
        violet:  "bg-violet-500/10 border-violet-500/40 text-violet-400",
        emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
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

function DeltaBadge({ delta }) {
    if (delta > 0) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-emerald-500/10 border-emerald-500/30 text-emerald-400"><TrendingUp className="w-3 h-3" />+{delta}</span>;
    }
    if (delta < 0) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-rose-500/10 border-rose-500/30 text-rose-400"><TrendingDown className="w-3 h-3" />{delta}</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium bg-slate-500/10 border-slate-500/30 text-slate-400">0</span>;
}

/* ── Componente principale ───────────────────────────────── */

const StoricoScatolette = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isMagazzino = location.pathname.startsWith("/magazzino");
    const [rows, setRows] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState("");
    const [filterAsin, setFilterAsin] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/v2/scatolette/storico");
                const data = await res.json();
                setRows(data);
                setFiltered(data);
            } catch (err) {
                console.error("Errore caricamento storico:", err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        let temp = [...rows];
        if (search.trim()) temp = temp.filter((r) => r.scatoletta?.toLowerCase().includes(search.toLowerCase()) || r.nota?.toLowerCase().includes(search.toLowerCase()));
        if (filterAsin.trim()) temp = temp.filter((r) => r.asin_prodotto === filterAsin);
        setFiltered(temp);
    }, [search, filterAsin, rows]);

    const handleResetStorico = async () => {
        if (!window.confirm("ATTENZIONE!\n\nQuesta operazione cancellera TUTTO lo storico scatolette in modo permanente.\n\nSei sicuro di voler procedere?")) return;
        try {
            const res = await fetch("/api/v2/scatolette/storico/reset", { method: "DELETE" });
            const data = await res.json();
            if (data.ok) { toast.success("Storico resettato con successo"); setRows([]); setFiltered([]); }
            else toast.error("Errore nel reset dello storico");
        } catch (err) { console.error("Errore reset storico:", err); toast.error("Errore durante il reset"); }
    };

    const totCarichi = filtered.filter((r) => r.delta > 0).reduce((s, r) => s + r.delta, 0);
    const totScarichi = filtered.filter((r) => r.delta < 0).reduce((s, r) => s + Math.abs(r.delta), 0);
    const scatoletteUniche = new Set(filtered.map((r) => r.scatoletta)).size;
    const hasFilters = search || filterAsin;
    const clearFilters = () => { setSearch(""); setFilterAsin(""); };

    return (
        <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
            {/* Texture grid */}
            <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

            {/* === Top bar === */}
            <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => navigate("/scatolette")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
                            <History className="w-[18px] h-[18px] text-violet-400" />
                        </div>
                        <div className="flex flex-col leading-none min-w-0">
                            <span className="text-[15px] font-semibold tracking-tight text-white truncate">Storico Scatolette</span>
                            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Movimenti carico e scarico</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <button onClick={handleResetStorico} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-[12px] font-medium transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Reset Storico</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* === Hero === */}
            <section className="relative">
                <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Magazzino</div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
                        Storico Movimenti Scatolette <span className="text-slate-500">— carico e scarico.</span>
                    </h1>
                    <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
                        Cronologia completa dei movimenti automatici di carico e scarico.
                    </p>
                </div>
            </section>

            {/* === Contenuto === */}
            <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

                {/* Statistiche */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatTile icon={History} label="Movimenti" value={filtered.length} accent="violet" />
                    <StatTile icon={TrendingUp} label="Carichi" value={totCarichi} accent="emerald" />
                    <StatTile icon={TrendingDown} label="Scarichi" value={totScarichi} accent="rose" />
                    <StatTile icon={Package} label="Scatolette" value={scatoletteUniche} accent="blue" />
                </div>

                {/* Filtri */}
                <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
                    <div className="px-5 sm:px-6 py-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-md border bg-violet-500/10 border-violet-500/30 flex items-center justify-center flex-shrink-0">
                                <Search className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Filtri</div>
                                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Filtra movimenti</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2 flex items-center gap-1.5">
                                    <Search className="w-3 h-3" /> Cerca per nota o scatoletta
                                </label>
                                <div className="relative">
                                    <input type="text" placeholder="Cerca..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
                                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                    {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"><X className="w-4 h-4" /></button>}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2 flex items-center gap-1.5">
                                    <Package className="w-3 h-3" /> Filtra per ASIN
                                </label>
                                <div className="relative">
                                    <input type="text" placeholder="Es: B01234ABCD" value={filterAsin} onChange={(e) => setFilterAsin(e.target.value)} className={`${inputCls} pr-9`} />
                                    {filterAsin && <button onClick={() => setFilterAsin("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"><X className="w-4 h-4" /></button>}
                                </div>
                            </div>
                        </div>

                        {hasFilters && (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-500">Filtri attivi:</span>
                                {search && (
                                    <span className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-md text-[11px] font-medium flex items-center gap-1.5">
                                        {search}
                                        <button onClick={() => setSearch("")} className="hover:text-violet-200"><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                                {filterAsin && (
                                    <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-md text-[11px] font-medium flex items-center gap-1.5">
                                        ASIN: {filterAsin}
                                        <button onClick={() => setFilterAsin("")} className="hover:text-blue-200"><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                                <button onClick={clearFilters} className="text-[11px] text-rose-400 hover:text-rose-300 ml-2 underline underline-offset-2">Rimuovi tutti</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lista movimenti */}
                <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
                    <div className="px-5 sm:px-6 py-5">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-8 h-8 rounded-md border bg-violet-500/10 border-violet-500/30 flex items-center justify-center flex-shrink-0">
                                <History className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Movimenti</div>
                                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Lista movimenti</h2>
                            </div>
                            <span className="px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[11px] font-medium tabular-nums">{filtered.length}</span>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="py-12 text-center">
                                <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                <p className="text-sm text-slate-500 mb-1">Nessun movimento trovato</p>
                                {hasFilters && (
                                    <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-medium transition-all">
                                        Rimuovi i filtri
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map((r) => (
                                    <div key={r.id} className="relative bg-slate-800/40 border border-slate-700/60 rounded-md hover:border-slate-600 transition-all">
                                        <div className="px-5 py-4">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-3 flex-wrap mb-1">
                                                        <h3 className="text-sm font-semibold text-white">{r.scatoletta}</h3>
                                                        <DeltaBadge delta={r.delta} />
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-mono">{r.asin_prodotto}</p>
                                                </div>
                                                <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap flex-shrink-0 hidden sm:inline">
                                                    {formatDate(r.created_at)}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Quantita finale</p>
                                                    <p className="text-sm text-white font-medium tabular-nums">{r.quantita_finale ?? "—"}</p>
                                                </div>
                                                <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5 flex items-center gap-1"><User className="w-3 h-3" /> Operatore</p>
                                                    <p className="text-sm text-white font-medium">{r.operatore || "-"}</p>
                                                </div>
                                                <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2 sm:hidden col-span-2">
                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Data</p>
                                                    <p className="text-sm text-white font-medium font-mono">{formatDate(r.created_at)}</p>
                                                </div>
                                            </div>

                                            {r.nota && (
                                                <div className="mt-3 bg-blue-500/5 border border-blue-500/20 rounded-md px-4 py-2.5">
                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-blue-400 mb-1 flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> Nota
                                                    </p>
                                                    <p className="text-[13px] text-blue-200/80">{r.nota}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* === Footer === */}
            <footer className="relative border-t border-slate-800 bg-slate-900/40">
                <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
                    <span>© {new Date().getFullYear()} Nexus · Storico Scatolette</span>
                    <span className="font-mono">v2.0</span>
                </div>
            </footer>
        </div>
    );
};

export default StoricoScatolette;
