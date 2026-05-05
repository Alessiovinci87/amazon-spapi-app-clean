import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, Download, Calendar, RefreshCw, ArrowLeft, History,
  Package, Clock, User, FileText, AlertTriangle, Trash2, CheckCircle, XCircle, Loader, X, Search,
} from 'lucide-react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

/* ── Helpers ─────────────────────────────────────────────── */

const formatDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors";

const statoMappato = { creata: "in_corso", aggiornata: "in_corso", completata: "completato", eliminata: "annullato", annullata: "annullato" };
const getStatoFromEvento = (eventoRaw) => { if (!eventoRaw) return "in_corso"; const key = String(eventoRaw).toLowerCase().trim(); return statoMappato[key] || key; };

/* ── Shared UI ──────────────────────────────────────────── */

function StatTile({ icon: Icon, label, value, accent = "violet" }) {
  const m = { violet: "bg-violet-500/10 border-violet-500/40 text-violet-400", emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400", amber: "bg-amber-500/10 border-amber-500/40 text-amber-400", rose: "bg-rose-500/10 border-rose-500/40 text-rose-400" };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${m[accent]}`}><Icon className="w-[18px] h-[18px]" /></div>
      </div>
      <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function StatoBadge({ stato }) {
  const map = {
    completato: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    in_corso: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    annullato: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    pending: "bg-slate-500/10 border-slate-500/30 text-slate-400",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${map[stato] || map.pending}`}>{stato.replace("_", " ").toUpperCase()}</span>;
}

/* ── Componente principale ───────────────────────────────── */

const StoricoProduzioniSfuso = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMagazzino = localStorage.getItem("auth") === "magazzino";
  const [searchParams] = useSearchParams();
  const [produzioni, setProduzioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [selectedStato, setSelectedStato] = useState('tutti');
  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetInCorso, setResetInCorso] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => { const stato = searchParams.get('stato'); if (stato) setSelectedStato(stato); }, [searchParams]);
  useEffect(() => { fetchProduzioni(); }, []);

  const fetchProduzioni = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v2/produzioni-sfuso/storico/");
      if (!response.ok) throw new Error("Errore nel caricamento");
      const json = await response.json();
      const sorted = Array.isArray(json.data) ? json.data.sort((a, b) => new Date(b.data_evento) - new Date(a.data_evento)) : [];
      setProduzioni(sorted);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const toggleCard = (id) => { setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] })); };
  const toggleNote = (id) => { setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] })); };

  const groupedProduzioni = produzioni.reduce((acc, p) => { const key = p.id_produzione ?? p.id; if (!acc[key]) acc[key] = []; acc[key].push(p); return acc; }, {});
  Object.keys(groupedProduzioni).forEach((id) => { groupedProduzioni[id].sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento)); });

  const produzioniArr = Object.entries(groupedProduzioni).map(([id, records]) => ({ idProduzione: id, records, firstRecord: records[0], lastRecord: records[records.length - 1] }));
  const produzioniOrdinate = produzioniArr.sort((a, b) => new Date(b.lastRecord.data_evento) - new Date(a.lastRecord.data_evento));

  const filteredProduzioni = produzioniOrdinate.filter((p) => {
    const stato = getStatoFromEvento(p.lastRecord.evento);
    if (selectedStato !== "tutti" && stato !== selectedStato) return false;
    const dateToCheck = new Date(p.lastRecord.data_evento);
    if (dataInizio && dateToCheck < new Date(dataInizio)) return false;
    if (dataFine && dateToCheck > new Date(dataFine)) return false;
    return true;
  });

  const exportToCSV = () => {
    const headers = ["ID Record", "ID Produzione", "Nome Prodotto", "ASIN", "Formato", "Quantita", "Evento", "Operatore", "Note", "Data"];
    const rows = filteredProduzioni.flatMap((p) => p.records.map((r) => [r.id, p.idProduzione, r.nome_prodotto, r.asin_prodotto, r.formato, r.quantita, r.evento, r.operatore || "", r.note || "", r.data_evento]));
    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `produzioni_sfuso_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  };

  const handleResetStorico = async () => {
    try {
      setResetInCorso(true);
      const res = await fetch("/api/v2/storico/reset", { method: "DELETE" });
      if (!res.ok) throw new Error("Errore nel reset storico");
      setShowResetModal(false); setResetSuccess(true); await fetchProduzioni();
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (err) { console.error("Errore reset storico:", err.message); } finally { setResetInCorso(false); }
  };

  const hasFilters = selectedStato !== "tutti" || dataInizio || dataFine;
  const clearFilters = () => { setSelectedStato("tutti"); setDataInizio(""); setDataFine(""); };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-slate-700 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-slate-500">Caricamento storico...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-rose-500/5 border border-rose-500/30 rounded-lg p-8 text-center max-w-md w-full">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-white mb-2">Errore di caricamento</h2>
          <p className="text-sm text-rose-300 mb-4">{error}</p>
          <button onClick={fetchProduzioni} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm font-medium transition-all">
            <RefreshCw className="w-4 h-4" /> Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/magazzino/sfuso")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
              <History className="w-[18px] h-[18px] text-violet-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Storico Produzioni</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Cronologia produzioni sfuso</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button onClick={exportToCSV} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[12px] font-medium transition-all">
              <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Esporta CSV</span>
            </button>
            <button onClick={() => setShowResetModal(true)} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[12px] font-medium transition-all">
              <Trash2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Magazzino</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Storico Produzioni Sfuso <span className="text-slate-500">— cronologia completa.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Cronologia completa delle produzioni. Filtra per stato o periodo.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Success message */}
        {resetSuccess && (
          <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 text-sm font-medium">Storico eliminato con successo</p>
          </div>
        )}

        {/* Statistiche */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={Package} label="Totali" value={filteredProduzioni.length} accent="violet" />
          <StatTile icon={CheckCircle} label="Completate" value={filteredProduzioni.filter((p) => getStatoFromEvento(p.lastRecord.evento) === "completato").length} accent="emerald" />
          <StatTile icon={Clock} label="In corso" value={filteredProduzioni.filter((p) => getStatoFromEvento(p.lastRecord.evento) === "in_corso").length} accent="amber" />
          <StatTile icon={XCircle} label="Annullate" value={filteredProduzioni.filter((p) => getStatoFromEvento(p.lastRecord.evento) === "annullato").length} accent="rose" />
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
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Filtra produzioni</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2">Stato</label>
                <select value={selectedStato} onChange={(e) => setSelectedStato(e.target.value)} className={inputCls + " cursor-pointer"}>
                  <option value="tutti">Tutti</option>
                  <option value="completato">Completato</option>
                  <option value="in_corso">In Corso</option>
                  <option value="annullato">Annullato</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Data inizio</label>
                <input type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Data fine</label>
                <input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} className={inputCls} />
              </div>
            </div>

            {hasFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Filtri attivi:</span>
                {selectedStato !== "tutti" && (
                  <span className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-md text-[11px] font-medium flex items-center gap-1.5">
                    {selectedStato} <button onClick={() => setSelectedStato("tutti")} className="hover:text-violet-200"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {dataInizio && (
                  <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-md text-[11px] font-medium flex items-center gap-1.5">
                    Da: {dataInizio} <button onClick={() => setDataInizio("")} className="hover:text-blue-200"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {dataFine && (
                  <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-md text-[11px] font-medium flex items-center gap-1.5">
                    A: {dataFine} <button onClick={() => setDataFine("")} className="hover:text-blue-200"><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button onClick={clearFilters} className="text-[11px] text-rose-400 hover:text-rose-300 ml-2 underline underline-offset-2">Rimuovi tutti</button>
              </div>
            )}
          </div>
        </div>

        {/* Lista produzioni */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-violet-500/10 border-violet-500/30 flex items-center justify-center flex-shrink-0">
                <History className="w-4 h-4 text-violet-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Produzioni</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Lista produzioni</h2>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[11px] font-medium tabular-nums">{filteredProduzioni.length}</span>
            </div>

            {filteredProduzioni.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-1">Nessuna produzione trovata</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-medium transition-all">Rimuovi i filtri</button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProduzioni.map((p) => {
                  const { idProduzione, records = [], firstRecord, lastRecord } = p;
                  let qtyStart = firstRecord?.quantitaPrima ?? firstRecord?.quantita;
                  let qtyEnd = lastRecord?.quantitaDopo ?? lastRecord?.quantita;
                  if (lastRecord.evento?.toUpperCase() === "ANNULLATA") qtyEnd = qtyStart - lastRecord.quantita;
                  if (!lastRecord || records.length === 0) return null;
                  const expanded = expandedCards[idProduzione];
                  const stato = getStatoFromEvento(lastRecord.evento);
                  const diff = (qtyEnd || 0) - (qtyStart || 0);

                  return (
                    <div key={idProduzione} className="relative bg-slate-800/40 border border-slate-700/60 rounded-md hover:border-slate-600 transition-all">
                      {/* Header */}
                      <div className="px-5 py-4 cursor-pointer" onClick={() => toggleCard(idProduzione)}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-1">
                              <h3 className="text-sm font-semibold text-white truncate">{lastRecord.nome_prodotto}</h3>
                              <StatoBadge stato={stato} />
                            </div>
                            <p className="text-xs text-slate-500 font-mono">ID: {idProduzione}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {!expanded && <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap hidden sm:inline">{formatDate(lastRecord.data_evento)}</span>}
                            <button type="button" className="text-slate-500 hover:text-slate-200 transition-colors">
                              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: "Qta iniziale", value: qtyStart },
                            { label: "Qta finale", value: qtyEnd },
                            { label: "Variazione", value: diff > 0 ? `+${diff}` : diff, color: diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-slate-400" },
                            { label: "Modifiche", value: records.length - 1 },
                          ].map((item) => (
                            <div key={item.label} className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{item.label}</p>
                              <p className={`text-sm font-medium tabular-nums ${item.color || "text-white"}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dettagli espansi */}
                      {expanded && (
                        <div className="px-5 pb-5 space-y-3 border-t border-slate-700/60 pt-4">
                          {records.map((r, i) => {
                            const isUp = i > 0 && r.quantita > records[i - 1].quantita;
                            const isDown = i > 0 && r.quantita < records[i - 1].quantita;
                            const borderCls = isUp ? "border-emerald-500/20 bg-emerald-500/5" : isDown ? "border-rose-500/20 bg-rose-500/5" : "border-slate-700/40 bg-slate-800/40";

                            return (
                              <div key={r.id} className={`rounded-md border px-4 py-3 ${borderCls}`}>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                                  {[
                                    { label: "Evento", value: r.evento },
                                    { label: "Quantita", value: r.quantita },
                                    { label: "Operatore", value: r.operatore || "-" },
                                    { label: "Data", value: formatDate(r.data_evento) },
                                  ].map((item) => (
                                    <div key={item.label} className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                                      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{item.label}</p>
                                      <p className="text-sm text-white font-medium truncate">{item.value}</p>
                                    </div>
                                  ))}
                                </div>

                                {r.note && (
                                  <div>
                                    <button onClick={() => toggleNote(r.id)} type="button" className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                                      <FileText className="w-3 h-3" /> {expandedNotes[r.id] ? "Nascondi note" : "Mostra note"}
                                    </button>
                                    {expandedNotes[r.id] && (
                                      <div className="mt-2 bg-blue-500/5 border border-blue-500/20 rounded-md px-4 py-2.5">
                                        <p className="text-[10px] uppercase tracking-[0.14em] text-blue-400 mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Nota</p>
                                        <p className="text-[13px] text-blue-200/80">{r.note}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Storico Produzioni</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>

      {/* === Modal Reset === */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md shadow-2xl">
            <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <h2 className="text-base font-semibold text-white">Reset Totale Storico</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-400 leading-relaxed">
                Questa azione e <strong className="text-white">irreversibile</strong>. Tutti i dati dello storico produzioni verranno eliminati permanentemente.
              </p>
            </div>
            <div className="border-t border-slate-800 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setShowResetModal(false)} disabled={resetInCorso} type="button" className="px-4 py-2 rounded-md bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-all disabled:opacity-40">Annulla</button>
              <button onClick={handleResetStorico} disabled={resetInCorso} type="button" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm font-medium transition-all disabled:opacity-40">
                {resetInCorso ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Eliminazione...</> : <><Trash2 className="w-3.5 h-3.5" /> Conferma Reset</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoricoProduzioniSfuso;
