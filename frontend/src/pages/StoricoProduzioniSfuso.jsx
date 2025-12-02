import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Download, Calendar, RefreshCw } from 'lucide-react';

const StoricoProduzioniSfuso = () => {
  const [produzioni, setProduzioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandedCards, setExpandedCards] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});

  const [selectedStato, setSelectedStato] = useState('tutti');
  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');

  useEffect(() => {
    fetchProduzioni();
  }, []);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetInCorso, setResetInCorso] = useState(false);

  const [resetSuccess, setResetSuccess] = useState(false);



  /* =========================================================
     FETCH DATI BACKEND
  ========================================================= */
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

  /* =========================================================
     ESPANDI CARD
  ========================================================= */
  const toggleCard = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleNote = (id) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /* =========================================================
     GROUP BY ID PRODUZIONE
  ========================================================= */
  const groupedProduzioni = produzioni.reduce((acc, p) => {
    const key = p.id_produzione ?? p.id;

    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  /* =========================================================
   ORDINA OGNI GRUPPO PER DATA (ASC)
========================================================= */
  Object.keys(groupedProduzioni).forEach(id => {
    groupedProduzioni[id].sort((a, b) => {
      return new Date(a.data_evento) - new Date(b.data_evento);
    });
  });


  /* =========================================================
     CREA FIRST E LAST RECORD PER OGNI PRODUZIONE
  ========================================================= */
  const produzioniArr = Object.entries(groupedProduzioni).map(([id, records]) => {
    const firstRecord = records[0];  // più vecchio
    const lastRecord = records[records.length - 1]; // più recente (stato finale)
    return { idProduzione: id, records, firstRecord, lastRecord };
  });


  /* =========================================================
     ORDINA PRODUZIONI PER LAST RECORD (DESC)
  ========================================================= */
  const produzioniOrdinate = produzioniArr.sort((a, b) => {
    return new Date(b.lastRecord.data_evento) - new Date(a.lastRecord.data_evento);
  });



  /* =========================================================
     STATO LOGICO
  ========================================================= */
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

    return statoMappato[key] || key; // fallback intelligente
  };



  /* =========================================================
    FILTRI SU PRODUZIONI ORDINATE (USANDO LAST RECORD)
 ========================================================= */
  const filteredProduzioni = produzioniOrdinate.filter(p => {
    const { lastRecord, firstRecord } = p;

    // filtro stato
    const stato = getStatoFromEvento(lastRecord.evento);
    if (selectedStato !== "tutti" && stato !== selectedStato) return false;

    // filtro date
    const dateToCheck = new Date(lastRecord.data_evento);

    if (dataInizio && dateToCheck < new Date(dataInizio)) return false;
    if (dataFine && dateToCheck > new Date(dataFine)) return false;

    return true;
  });



  /* =========================================================
   EXPORT CSV (NUOVA VERSIONE)
========================================================= */
  const exportToCSV = () => {
    const headers = [
      "ID Record",
      "ID Produzione",
      "Nome Prodotto",
      "ASIN",
      "Formato",
      "Quantità",
      "Evento",
      "Operatore",
      "Note",
      "Data"
    ];

    const rows = filteredProduzioni.flatMap(p =>
      p.records.map(r => [
        r.id,
        p.idProduzione,
        r.nome_prodotto,
        r.asin_prodotto,
        r.formato,
        r.quantita,
        r.evento,
        r.operatore || "",
        r.note || "",
        r.data_evento
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
    link.download = `produzioni_sfuso_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    link.click();
  };


  /* =========================================================
     DATE FORMAT
  ========================================================= */
  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /* =========================================================
     COLOR STATE
  ========================================================= */
  const getStatoColor = (stato) => {
    return {
      completato: "bg-green-500/20 text-green-400 border-green-500/30",
      in_corso: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      annullato: "bg-red-500/20 text-red-400 border-red-500/30",
      pending: "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }[stato] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  /* =========================================================
     LOADING UI
  ========================================================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-zinc-400">Caricamento...</div>
      </div>
    );
  }

  /* =========================================================
     ERROR UI
  ========================================================= */
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8">
        <div className="max-w-xl mx-auto bg-red-900/20 p-6 rounded-lg border border-red-600/30">
          <h2 className="text-red-400 font-semibold mb-2">Errore</h2>
          <p className="text-red-300">{error}</p>

          <button
            onClick={fetchProduzioni}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Riprova
          </button>
        </div>
      </div>
    );
  }

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

      // nasconde messaggio dopo 3s
      setTimeout(() => setResetSuccess(false), 3000);


    } catch (err) {
      console.error("❌ Errore reset storico:", err.message);
    } finally {
      setResetInCorso(false);
    }
  };


  /* =========================================================
   MODAL RESET STORICO
========================================================= */
  const resetModal = showResetModal && (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl text-red-400 font-bold mb-3">⚠️ Reset Totale Storico</h2>
        <p className="text-zinc-300 mb-6">
          Questa azione è <strong>irreversibile</strong>.<br />
          Tutti i dati dello storico produzioni verranno eliminati.
        </p>

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg"
            onClick={() => setShowResetModal(false)}
          >
            Annulla
          </button>
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            onClick={handleResetStorico}
            disabled={resetInCorso}
          >
            {resetInCorso ? "Eliminazione..." : "Conferma"}
          </button>
        </div>
      </div>
    </div>
  );


  /* =========================================================
     RENDER UI
  ========================================================= */
  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {resetSuccess && (
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg border border-green-400 animate-fade-in">
            ✅ Storico eliminato con successo
          </div>
        )}


        {/* HEADER */}
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h1 className="text-3xl text-white font-bold">📦 Storico Produzioni</h1>
          <p className="text-zinc-400">Visualizza lo storico delle produzioni</p>
        </div>

        {resetModal}


        {/* FILTRI */}
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h2 className="text-xl mb-4 text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            Filtri
          </h2>

          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowResetModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-4 rounded-lg text-sm"
            >
              🗑️ Reset Storico
            </button>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Stato */}
            <div>
              <label className="text-sm text-zinc-400">Stato</label>
              <select
                value={selectedStato}
                onChange={(e) => setSelectedStato(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-white px-3 py-2"
              >
                <option value="tutti">Tutti</option>
                <option value="completato">Completato</option>
                <option value="in_corso">In Corso</option>
                <option value="annullato">Annullato</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Date Inizio */}
            <div>
              <label className="text-sm text-zinc-400">Data Inizio</label>
              <input
                type="date"
                value={dataInizio}
                onChange={(e) => setDataInizio(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-white px-3 py-2"
              />
            </div>

            {/* Date Fine */}
            <div>
              <label className="text-sm text-zinc-400">Data Fine</label>
              <input
                type="date"
                value={dataFine}
                onChange={(e) => setDataFine(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-white px-3 py-2"
              />
            </div>

            {/* EXPORT */}
            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Esporta CSV
              </button>
            </div>
          </div>
        </div>

        {/* STATISTICHE */}
        {/* STATISTICHE */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            n={filteredProduzioni.length}
            label="Produzioni Totali"
            color="emerald"
          />

          <StatCard
            n={filteredProduzioni.filter(p => getStatoFromEvento(p.lastRecord.evento) === "completato").length}
            label="Completate"
            color="green"
          />

          <StatCard
            n={filteredProduzioni.filter(p => getStatoFromEvento(p.lastRecord.evento) === "in_corso").length}
            label="In Corso"
            color="yellow"
          />

          <StatCard
            n={filteredProduzioni.filter(p => getStatoFromEvento(p.lastRecord.evento) === "annullato").length}
            label="Annullate"
            color="red"
          />
        </div>


        {/* LISTA PRODUZIONI */}
        <ProduzioniList
          filteredProduzioni={filteredProduzioni}
          expandedCards={expandedCards}
          expandedNotes={expandedNotes}
          toggleCard={toggleCard}
          toggleNote={toggleNote}
          getStatoColor={getStatoColor}
          getStatoFromEvento={getStatoFromEvento}
          formatDate={formatDate}
        />

      </div>
    </div>
  );
};

/* =========================================================
   COMPONENTI AUSILIARI
========================================================= */

const StatCard = ({ n, label, color }) => {
  const colors = {
    emerald: "text-emerald-500",
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500"
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
      <p className={`text-3xl font-bold ${colors[color] || "text-white"}`}>{n}</p>
      <p className="text-sm text-zinc-400 mt-1">{label}</p>
    </div>
  );
};

const ProduzioniList = ({
  filteredProduzioni,
  expandedCards,
  expandedNotes,
  toggleCard,
  toggleNote,
  getStatoColor,
  getStatoFromEvento,
  formatDate,
}) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
    {filteredProduzioni.length === 0 ? (
      <div className="p-6 text-center text-zinc-500">Nessuna produzione trovata</div>
    ) : (
      <div className="p-6 space-y-4">
        {filteredProduzioni.map(p => {
          const {
            idProduzione,
            records = [],
            firstRecord,
            lastRecord
          } = p;

          // Quantità iniziale e finale corrette
          let qtyStart = firstRecord?.quantitaPrima ?? firstRecord?.quantita;
          let qtyEnd = lastRecord?.quantitaDopo ?? lastRecord?.quantita;

          // 🔥 Se ANNULLATA → mostra come variazione negativa
          if (lastRecord.evento?.toUpperCase() === "ANNULLATA") {
            qtyEnd = qtyStart - lastRecord.quantita; // es: 323 - 323 = 0
          }


          if (!lastRecord || records.length === 0) {
            return null; // salta card non valida
          }

          const recordHeader = lastRecord;
          const expanded = expandedCards[idProduzione];

          return (
            <div
              key={idProduzione}
              className={`rounded-lg overflow-hidden border bg-zinc-800 ${getStatoFromEvento(lastRecord.evento) === "completato"
                ? "border-green-700"
                : getStatoFromEvento(lastRecord.evento) === "in_corso"
                  ? "border-yellow-600"
                  : getStatoFromEvento(lastRecord.evento) === "annullato"
                    ? "border-red-600"
                    : "border-blue-600/50"
                }`}
            >


              {/* HEADER */}
              <div
                onClick={() => toggleCard(idProduzione)}
                className="px-4 py-3 cursor-pointer hover:bg-zinc-800"
              >
                {/* RIGA 1 */}
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-semibold">
                    {lastRecord.nome_prodotto} — ID {idProduzione}

                  </h3>

                  <span
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md border shadow-sm 
                   ${getStatoColor(getStatoFromEvento(lastRecord.evento))}`}
                  >
                    {getStatoFromEvento(lastRecord.evento).replace("_", " ").toUpperCase()}
                  </span>

                </div>

                {/* RIGA RIASSUNTO */}
                <div className="mt-1 text-[11px] text-zinc-500 flex gap-6 pl-1">
                  <span>
                    Quantità:{" "}
                    <strong className="text-zinc-300">
                      {qtyStart} → {qtyEnd}
                    </strong>
                  </span>

                  <span>
                    Modifiche:{" "}
                    <strong className="text-zinc-300">
                      {records.length - 1}
                    </strong>
                  </span>

                  <span>
                    Ultima modifica:{" "}
                    <strong className="text-zinc-300">
                      {formatDate(lastRecord?.data_evento)}
                    </strong>
                  </span>
                </div>

                {/* RIGA 2 */}
                <div className="flex justify-between items-center mt-1">

                  <div className="text-zinc-400 text-sm flex gap-4">
                    <span>
                      Quantità: <strong className="text-emerald-400">{qtyEnd}</strong>
                    </span>
                    <span>
                      Formato: <strong>{lastRecord.formato}</strong>
                    </span>
                    <span>ID: {idProduzione}</span>
                  </div>

                  {/* BADGE VARIAZIONE QUANTITÀ */}
                  {lastRecord.quantita !== firstRecord.quantita && (
                    <div
                      className={`text-xs font-semibold px-2 py-1 rounded border ${lastRecord.quantita > firstRecord.quantita
                        ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                        : "border-orange-500 text-orange-400 bg-orange-500/10"
                        }`}
                    >
                      {lastRecord.quantita > firstRecord.quantita
                        ? `+${lastRecord.quantita - firstRecord.quantita}`
                        : `-${firstRecord.quantita - lastRecord.quantita}`}
                    </div>
                  )}


                  {expanded ? (
                    <ChevronUp className="text-zinc-300" />
                  ) : (
                    <ChevronDown className="text-zinc-300" />
                  )}
                </div>
                {/* INFO FIRST RECORD */}
                <div className="mt-1 text-xs text-zinc-500 flex gap-6 pl-1">
                  <span>
                    Quantità iniziale:{" "}
                    <strong className="text-zinc-400">{qtyStart}</strong>
                  </span>
                  <span>
                    Creata il:{" "}

                    <strong className="text-zinc-400">
                      {formatDate(firstRecord?.data_evento)}
                    </strong>
                  </span>
                </div>
                {/* MODIFICHE / NUMERO RECORD */}
                <div className="mt-1 text-[11px] text-zinc-600 pl-1">
                  <span>
                    Modifiche:{" "}
                    <strong className="text-zinc-400">{records.length - 1}</strong>
                    {" "} (record totali: {records.length})
                  </span>
                </div>

                {/* VARIAZIONE QUANTITÀ (solo se diversa) */}
                {qtyStart !== qtyEnd && (
                  <div className="mt-1 text-[11px] text-sky-500 pl-1">
                    Variazione quantità:{" "}
                    <strong>
                      {qtyEnd > qtyStart ? `+${qtyEnd - qtyStart}` : qtyEnd - qtyStart}
                    </strong>
                  </div>
                )}



              </div>




              {/* DETTAGLI */}
              {expanded && (
                <div className="p-4 bg-zinc-900 border-t border-zinc-700 space-y-4">
                  {records.map((r, i) => (
                    <div
                      key={r.id}
                      className={`
                            ${i > 0 ? "border-t border-zinc-700 pt-4" : ""}
                            ${i > 0
                          ? r.quantita > records[i - 1].quantita
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : r.quantita < records[i - 1].quantita
                              ? "bg-orange-500/10 border-orange-500/30"
                              : ""
                          : ""
                        }
  `}
                    >

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoCard label="ASIN" value={r.asin_prodotto} />
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                          <p className="text-xs text-zinc-500">Evento</p>
                          <p className="text-sm text-white font-medium flex items-center gap-2">
                            {r.evento}
                            <span
                              className={`px-2 py-0.5 text-[10px] rounded border ${getStatoColor(getStatoFromEvento(r.evento))}`}
                            >
                              {getStatoFromEvento(r.evento).replace("_", " ").toUpperCase()}
                            </span>
                          </p>
                        </div>

                        <InfoCard label="Operatore" value={r.operatore || "-"} />
                        <InfoCard label="Data" value={formatDate(r.data_evento)} />
                        <InfoCard label="Formato" value={r.formato || "-"} />
                        <InfoCard label="ID Record" value={r.id} />
                      </div>

                      {r.note && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleNote(r.id)}
                            className="text-emerald-400 text-sm flex gap-2 items-center"
                          >
                            📝 {expandedNotes[r.id] ? "Nascondi note" : "Mostra note"}
                          </button>

                          {expandedNotes[r.id] && (
                            <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm">
                              {r.note}
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
);

const InfoCard = ({ label, value }) => (
  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
    <p className="text-xs text-zinc-500">{label}</p>
    <p className="text-sm text-white font-medium">{value}</p>
  </div>
);

export default StoricoProduzioniSfuso;
