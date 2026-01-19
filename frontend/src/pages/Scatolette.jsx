import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import {
  ArrowLeft,
  Package,
  Edit3,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Box,
  Truck
} from "lucide-react";



const Scatolette = () => {
  const [rows, setRows] = useState([]);
  const [expandedCards, setExpandedCards] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchScatolette = async () => {
      try {
        const res = await fetch("http://localhost:3005/api/v2/scatolette"); // ⬅️ PERCORSO COMPLETO
        const data = await res.json();
        console.log("📦 Dati ricevuti:", data); // ⬅️ DEBUG
        setRows(data);
      } catch (err) {
        console.error("Errore caricamento scatolette:", err);
      }
    };

    fetchScatolette();
  }, []);


  const toggleCardExpansion = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleChange = (id, field, value) => {
    setRows(prevRows =>
      prevRows.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const handleRettifica = async (row) => {
    const nuovaQuantita = prompt(
      `Rettifica quantità per "${row.nome_prodotto}".\nQuantità attuale: ${row.quantita}`,
      row.quantita
    );

    if (nuovaQuantita === null) return;

    try {
      const res = await fetch(`http://localhost:3005/api/v2/scatolette/${row.id}`, { // ⬅️ PERCORSO COMPLETO
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantita: Number(nuovaQuantita) }),
      });

      if (!res.ok) throw new Error("Errore aggiornamento quantità");

      // aggiorna lo state locale
      setRows(prev =>
        prev.map(r =>
          r.id === row.id ? { ...r, quantita: Number(nuovaQuantita) } : r
        )
      );

      alert("✅ Quantità aggiornata");
    } catch (err) {
      console.error("Errore aggiornamento:", err);
      alert("Errore aggiornamento quantità");
    }
  };



  // Filtro ricerca
  const filteredRows = rows.filter(row =>
    row.nome_prodotto?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcola statistiche
  const totalScatolette = filteredRows.reduce((acc, row) => {
    const qty = typeof row.quantita === 'string' ? 0 : row.quantita;
    return acc + qty;
  }, 0);

  const scatoletteBasse = filteredRows.filter(row =>
    typeof row.quantita === 'number' && row.quantita > 0 && row.quantita < 2000
  ).length;

  const scatoletteEsaurite = filteredRows.filter(row =>
    row.quantita === 0
  ).length;

  const getQuantitaColor = (quantita) => {
    if (quantita === 0) return "text-red-400 bg-red-500/10 border-red-500/30";
    if (typeof quantita === 'number' && quantita < 2000) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  };

  const getQuantitaIcon = (quantita) => {
    if (quantita === 0) return <AlertCircle className="w-4 h-4" />;
    if (typeof quantita === 'number' && quantita < 2000) return <TrendingUp className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                <Box className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Gestione Scatolette</h1>
                <p className="text-zinc-400 mt-1">Inventario packaging e materiali</p>
              </div>
            </div>

            <button
              onClick={() => navigate("/magazzino")}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
            >
              <ArrowLeft className="w-4 h-4" />
              Magazzino
            </button>

            <button
              onClick={() => navigate("/scatolette/storico")}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
            >
              <History className="w-4 h-4" />
              Storico Scatolette
            </button>

          </div>
        </div>

        {/* ========== BARRA RICERCA ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <label className="text-sm font-medium text-zinc-400 block mb-2">
            🔍 Cerca Scatoletta
          </label>
          <input
            type="text"
            placeholder="Cerca per nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          />
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-sm text-zinc-400">Totale Scatolette</p>
                <p className="text-2xl font-bold text-emerald-400">{totalScatolette.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-600/10 border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-sm text-zinc-400">Scorte Basse (&lt;2000)</p>
                <p className="text-2xl font-bold text-yellow-400">{scatoletteBasse}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-rose-600/10 border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-sm text-zinc-400">Esaurite</p>
                <p className="text-2xl font-bold text-red-400">{scatoletteEsaurite}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========== CONTATORE ========== */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl border border-purple-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">📦</span>
              <div>
                <h2 className="text-2xl font-bold text-white">Scatolette in Inventario</h2>
                <p className="text-purple-100 text-sm mt-1">
                  {filteredRows.length} tipo{filteredRows.length === 1 ? "" : "logi"}a di scatolett{filteredRows.length === 1 ? "a" : "e"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========== CARD SCATOLETTE ========== */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredRows.map((row) => {
            const isExpanded = expandedCards[row.id];

            return (
              <div
                key={row.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all"
              >
                {/* Header sempre visibile */}
                <div
                  className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  onClick={() => toggleCardExpansion(row.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Icona */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Package className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate capitalize">
                        {row.nome_prodotto}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getQuantitaColor(row.quantita)}`}>
                          {getQuantitaIcon(row.quantita)}
                          {row.quantita} pz
                        </span>
                      </div>
                    </div>

                    {/* Pulsante espandi */}
                    <button
                      className="flex-shrink-0 p-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCardExpansion(row.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-white" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Contenuto espandibile */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-4">
                    {/* Quantità Principale */}
                    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                      <h4 className="text-sm font-semibold text-purple-400 mb-3">Quantità Disponibile</h4>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={row.quantita}
                          onChange={(e) => handleChange(row.id, "quantita", e.target.value)}
                          className="flex-1 px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white font-bold text-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <button
                          onClick={() => handleRettifica(row)}
                          className="flex items-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                          Rettifica
                        </button>
                      </div>
                    </div>

                    {/* Campi Aggiuntivi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-zinc-400 block mb-2">Colonna 1</label>
                        <input
                          type="text"
                          value={row.colonna1 || ""}
                          onChange={(e) => handleChange(row.id, "colonna1", e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Valore..."
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 block mb-2">6 Mesi</label>
                        <input
                          type="text"
                          value={row.mesi8 || ""}
                          onChange={(e) => handleChange(row.id, "mesi8", e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Valore..."
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 block mb-2">Ordine Sigma</label>
                        <input
                          type="text"
                          value={row.ordineSigma || ""}
                          onChange={(e) => handleChange(row.id, "ordineSigma", e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="N. Ordine..."
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 block mb-2">Ordine Packly</label>
                        <input
                          type="text"
                          value={row.ordinePackly || ""}
                          onChange={(e) => handleChange(row.id, "ordinePackly", e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="N. Ordine..."
                        />
                      </div>
                    </div>

                    {/* Data Ordine e 6 mesi new */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <h4 className="text-sm font-semibold text-blue-400">Info Ordine</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-zinc-400 block mb-2">Data Ordine</label>
                          <input
                            type="date"
                            value={row.dataOrdine || ""}
                            onChange={(e) => handleChange(row.id, "dataOrdine", e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400 block mb-2">6 Mesi (New)</label>
                          <input
                            type="text"
                            value={row.mesi8new || ""}
                            onChange={(e) => handleChange(row.id, "mesi8new", e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Valore..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Alert se quantità bassa o esaurita */}
                    {row.quantita === 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400 text-sm font-medium">
                          ⚠️ Scatoletta esaurita - Riordinare urgentemente
                        </p>
                      </div>
                    )}

                    {typeof row.quantita === 'number' && row.quantita > 0 && row.quantita < 2000 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-yellow-400" />
                        <p className="text-yellow-400 text-sm font-medium">
                          ⚡ Scorte in esaurimento - Considera un riordino
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ========== EMPTY STATE ========== */}
        {filteredRows.length === 0 && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Nessuna scatoletta trovata
            </h3>
            <p className="text-zinc-400 text-sm">
              Prova a modificare i termini di ricerca
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scatolette;