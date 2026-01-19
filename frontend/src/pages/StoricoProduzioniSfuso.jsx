import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Calendar, 
  RefreshCw, 
  ArrowLeft,
  History,
  Filter,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Trash2,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StoricoProduzioniSfuso = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchProduzioni();
  }, []);

  /* ========== FETCH DATI ========== */
  const fetchProduzioni = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3005/api/v2/produzioni-sfuso/storico/");
      if (!response.ok) throw new Error("Errore nel caricamento");
      
      const json = await response.json();
      const sorted = Array.isArray(json.data)
        ? json.data.sort((a, b) => new Date(b.data_evento) - new Date(a.data_evento))
        : [];
      
      setProduzioni(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ========== ESPANDI CARD ========== */
  const toggleCard = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleNote = (id) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /* ========== GROUP BY ID PRODUZIONE ========== */
  const groupedProduzioni = produzioni.reduce((acc, p) => {
    const key = p.id_produzione ?? p.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  Object.keys(groupedProduzioni).forEach(id => {
    groupedProduzioni[id].sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento));
  });

  /* ========== CREA PRODUZIONI ARRAY ========== */
  const produzioniArr = Object.entries(groupedProduzioni).map(([id, records]) => {
    const firstRecord = records[0];
    const lastRecord = records[records.length - 1];
    return { idProduzione: id, records, firstRecord, lastRecord };
  });

  const produzioniOrdinate = produzioniArr.sort((a, b) => {
    return new Date(b.lastRecord.data_evento) - new Date(a.lastRecord.data_evento);
  });

  /* ========== STATO LOGICO ========== */
  const statoMappato = {
    creata: "in_corso",
    aggiornata: "in_corso",
    completata: "completato",
    eliminata: "annullato",
    annullata: "annullato",
  };

  const getStatoFromEvento = (eventoRaw) => {
    if (!eventoRaw) return "in_corso";
    const key = String(eventoRaw).toLowerCase().trim();
    return statoMappato[key] || key;
  };

  /* ========== FILTRI ========== */
  const filteredProduzioni = produzioniOrdinate.filter(p => {
    const { lastRecord } = p;
    const stato = getStatoFromEvento(lastRecord.evento);
    
    if (selectedStato !== "tutti" && stato !== selectedStato) return false;
    
    const dateToCheck = new Date(lastRecord.data_evento);
    if (dataInizio && dateToCheck < new Date(dataInizio)) return false;
    if (dataFine && dateToCheck > new Date(dataFine)) return false;
    
    return true;
  });

  /* ========== EXPORT CSV ========== */
  const exportToCSV = () => {
    const headers = [
      "ID Record", "ID Produzione", "Nome Prodotto", "ASIN", "Formato",
      "Quantità", "Evento", "Operatore", "Note", "Data"
    ];

    const rows = filteredProduzioni.flatMap(p =>
      p.records.map(r => [
        r.id, p.idProduzione, r.nome_prodotto, r.asin_prodotto, r.formato,
        r.quantita, r.evento, r.operatore || "", r.note || "", r.data_evento
      ])
    );

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `produzioni_sfuso_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  /* ========== FORMAT DATE ========== */
  const formatDate = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  };

  /* ========== COLOR STATE ========== */
  const getStatoColor = (stato) => {
    return {
      completato: "bg-green-600 text-white",
      in_corso: "bg-yellow-600 text-white",
      annullato: "bg-red-600 text-white",
      pending: "bg-zinc-600 text-white"
    }[stato] || "bg-zinc-600 text-white";
  };

  const getStatoBorderColor = (stato) => {
    return {
      completato: "border-green-700/50",
      in_corso: "border-yellow-700/50",
      annullato: "border-red-700/50",
      pending: "border-zinc-700/50"
    }[stato] || "border-zinc-700/50";
  };

  /* ========== RESET STORICO ========== */
  const handleResetStorico = async () => {
    try {
      setResetInCorso(true);
      const res = await fetch("http://localhost:3005/api/v2/storico/reset", {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Errore nel reset storico");
      
      setShowResetModal(false);
      setResetSuccess(true);
      await fetchProduzioni();
      
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (err) {
      console.error("❌ Errore reset storico:", err.message);
    } finally {
      setResetInCorso(false);
    }
  };

  /* ========== LOADING STATE ========== */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-6 bg-zinc-800 rounded-2xl mb-4">
            <Loader className="w-20 h-20 text-zinc-600 mx-auto animate-spin" />
          </div>
          <p className="text-zinc-400 text-xl font-medium">Caricamento storico...</p>
        </div>
      </div>
    );
  }

  /* ========== ERROR STATE ========== */
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">Errore di Caricamento</h2>
            <p className="text-red-300 mb-6">{error}</p>
            <button
              onClick={fetchProduzioni}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium mx-auto transition-colors"
            >
              <RefreshCw className="w-5 h-5" /> Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ========== MAIN RENDER ========== */
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* SUCCESS MESSAGE */}
        {resetSuccess && (
          <div className="bg-green-600 border border-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-6 h-6" />
            <span className="font-semibold">Storico eliminato con successo</span>
          </div>
        )}

        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <History className="w-8 h-8 text-purple-400" />
                Storico Produzioni Sfuso
              </h1>
              <p className="text-zinc-400">Cronologia completa delle produzioni</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Reset Storico
              </button>
              
              <button
                onClick={() => navigate("/sfuso")}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Torna a Sfuso
              </button>
            </div>
          </div>
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-purple-600 rounded-full">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{filteredProduzioni.length}</p>
            <p className="text-sm text-purple-200 font-medium">Totali</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-green-600 rounded-full">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {filteredProduzioni.filter(p => getStatoFromEvento(p.lastRecord.evento) === "completato").length}
            </p>
            <p className="text-sm text-green-200 font-medium">Completate</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-yellow-600 rounded-full">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {filteredProduzioni.filter(p => getStatoFromEvento(p.lastRecord.evento) === "in_corso").length}
            </p>
            <p className="text-sm text-yellow-200 font-medium">In Corso</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-red-600 rounded-full">
                <XCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {filteredProduzioni.filter(p => getStatoFromEvento(p.lastRecord.evento) === "annullato").length}
            </p>
            <p className="text-sm text-red-200 font-medium">Annullate</p>
          </div>
        </div>

        {/* ========== FILTRI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-purple-400" />
            Filtra Produzioni
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Stato */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                Stato
              </label>
              <select
                value={selectedStato}
                onChange={(e) => setSelectedStato(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all cursor-pointer"
              >
                <option value="tutti">Tutti</option>
                <option value="completato">Completato</option>
                <option value="in_corso">In Corso</option>
                <option value="annullato">Annullato</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Data Inizio */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Inizio
              </label>
              <input
                type="date"
                value={dataInizio}
                onChange={(e) => setDataInizio(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>

            {/* Data Fine */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Fine
              </label>
              <input
                type="date"
                value={dataFine}
                onChange={(e) => setDataFine(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>

            {/* Export */}
            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                <Download className="w-5 h-5" /> Esporta CSV
              </button>
            </div>
          </div>
        </div>

        {/* ========== LISTA PRODUZIONI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <History className="w-5 h-5 text-purple-400" />
              Lista Produzioni
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-normal">
                {filteredProduzioni.length}
              </span>
            </h2>
          </div>

          {filteredProduzioni.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block p-6 bg-zinc-800 rounded-2xl mb-4">
                <Package className="w-20 h-20 text-zinc-600 mx-auto" />
              </div>
              <p className="text-zinc-400 text-xl font-medium mb-2">Nessuna produzione trovata</p>
              <p className="text-zinc-500 text-sm">Non ci sono produzioni registrate con i filtri attuali</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProduzioni.map(p => {
                const { idProduzione, records = [], firstRecord, lastRecord } = p;
                
                let qtyStart = firstRecord?.quantitaPrima ?? firstRecord?.quantita;
                let qtyEnd = lastRecord?.quantitaDopo ?? lastRecord?.quantita;
                
                if (lastRecord.evento?.toUpperCase() === "ANNULLATA") {
                  qtyEnd = qtyStart - lastRecord.quantita;
                }
                
                if (!lastRecord || records.length === 0) return null;
                
                const expanded = expandedCards[idProduzione];
                const stato = getStatoFromEvento(lastRecord.evento);

                return (
                  <div
                    key={idProduzione}
                    className={`bg-zinc-800 border rounded-xl overflow-hidden hover:border-purple-600 hover:shadow-lg hover:shadow-purple-900/20 transition-all ${getStatoBorderColor(stato)}`}
                  >
                    {/* HEADER CARD */}
                    <div
                      onClick={() => toggleCard(idProduzione)}
                      className="px-6 py-4 cursor-pointer hover:bg-zinc-750 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Info Principale */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <h3 className="text-lg font-bold text-white mb-1">
                                {lastRecord.nome_prodotto}
                              </h3>
                              <p className="text-sm text-zinc-400">ID Produzione: {idProduzione}</p>
                            </div>
                            <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getStatoColor(stato)}`}>
                              {stato.replace("_", " ").toUpperCase()}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="bg-zinc-900 rounded-lg p-2">
                              <p className="text-zinc-400 text-xs">Quantità Iniziale</p>
                              <p className="text-white font-semibold">{qtyStart}</p>
                            </div>
                            <div className="bg-zinc-900 rounded-lg p-2">
                              <p className="text-zinc-400 text-xs">Quantità Finale</p>
                              <p className="text-white font-semibold">{qtyEnd}</p>
                            </div>
                            <div className="bg-zinc-900 rounded-lg p-2">
                              <p className="text-zinc-400 text-xs">Variazione</p>
                              <p className={`font-bold ${qtyEnd > qtyStart ? 'text-green-400' : qtyEnd < qtyStart ? 'text-red-400' : 'text-zinc-400'}`}>
                                {qtyEnd > qtyStart ? `+${qtyEnd - qtyStart}` : qtyEnd - qtyStart}
                              </p>
                            </div>
                            <div className="bg-zinc-900 rounded-lg p-2">
                              <p className="text-zinc-400 text-xs">Modifiche</p>
                              <p className="text-white font-semibold">{records.length - 1}</p>
                            </div>
                          </div>
                        </div>

                        {/* Data e Toggle */}
                        <div className="flex items-center gap-4">
                          {!expanded && (
                            <div className="text-right bg-zinc-900 rounded-lg p-3 border border-zinc-700">
                              <p className="text-xs text-zinc-400 mb-1 font-medium">Ultima Modifica</p>
                              <p className="text-sm text-white font-semibold">{formatDate(lastRecord.data_evento)}</p>
                            </div>
                          )}
                          <span className="text-purple-400 text-2xl">
                            {expanded ? <ChevronUp /> : <ChevronDown />}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DETTAGLI ESPANSI */}
                    {expanded && (
                      <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-700 space-y-4">
                        {records.map((r, i) => (
                          <div
                            key={r.id}
                            className={`p-4 rounded-lg border ${
                              i > 0
                                ? r.quantita > records[i - 1].quantita
                                  ? "bg-green-900/10 border-green-700/30"
                                  : r.quantita < records[i - 1].quantita
                                  ? "bg-red-900/10 border-red-700/30"
                                  : "bg-zinc-800 border-zinc-700"
                                : "bg-zinc-800 border-zinc-700"
                            }`}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                              <div className="bg-zinc-800 rounded-lg p-3">
                                <p className="text-xs text-zinc-400 mb-1">Evento</p>
                                <p className="text-sm text-white font-medium">{r.evento}</p>
                              </div>
                              <div className="bg-zinc-800 rounded-lg p-3">
                                <p className="text-xs text-zinc-400 mb-1">Quantità</p>
                                <p className="text-sm text-white font-bold">{r.quantita}</p>
                              </div>
                              <div className="bg-zinc-800 rounded-lg p-3">
                                <p className="text-xs text-zinc-400 mb-1">Operatore</p>
                                <p className="text-sm text-white font-medium">{r.operatore || "-"}</p>
                              </div>
                              <div className="bg-zinc-800 rounded-lg p-3">
                                <p className="text-xs text-zinc-400 mb-1">Data</p>
                                <p className="text-sm text-white font-medium text-xs">{formatDate(r.data_evento)}</p>
                              </div>
                            </div>

                            {r.note && (
                              <div>
                                <button
                                  onClick={() => toggleNote(r.id)}
                                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <FileText className="w-4 h-4" />
                                  {expandedNotes[r.id] ? "Nascondi note" : "Mostra note"}
                                </button>
                                {expandedNotes[r.id] && (
                                  <div className="mt-2 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                                    <p className="text-xs text-blue-400 font-semibold mb-1 flex items-center gap-1">
                                      <FileText className="w-3 h-3" />
                                      Nota:
                                    </p>
                                    <p className="text-sm text-blue-100">{r.note}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========== MODAL RESET ========== */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-red-400">Reset Totale Storico</h2>
            </div>
            
            <p className="text-zinc-300 mb-6 leading-relaxed">
              Questa azione è <strong className="text-white">irreversibile</strong>.
              Tutti i dati dello storico produzioni verranno eliminati permanentemente.
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-medium transition-colors"
                onClick={() => setShowResetModal(false)}
                disabled={resetInCorso}
              >
                Annulla
              </button>
              <button
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                onClick={handleResetStorico}
                disabled={resetInCorso}
              >
                {resetInCorso ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Conferma Reset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoricoProduzioniSfuso;