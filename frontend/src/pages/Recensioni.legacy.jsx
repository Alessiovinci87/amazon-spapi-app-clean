import React, { useState, useEffect } from "react";
import DropdownLinguePortal from "../components/DropdownLinguePortal";
import { 
  ArrowLeft, 
  Star, 
  Filter, 
  MessageSquare,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Recensioni = () => {
  const navigate = useNavigate();
  const [dati, setDati] = useState({});
  const [paese, setPaese] = useState("IT");
  const [selectedStars, setSelectedStars] = useState([]);
  const asin = "B0BY9Q4KTT";

  useEffect(() => {
    fetch("/data/reviews_snapshot.json")
      .then((res) => res.json())
      .then((data) => setDati(data));
  }, []);

  const tutte = dati[paese]?.[asin] || [];

  const toggleFiltro = (stella) => {
    setSelectedStars((prev) =>
      prev.includes(stella)
        ? prev.filter((s) => s !== stella)
        : [...prev, stella]
    );
  };

  const filtrate = selectedStars.length
    ? tutte.filter((r) => selectedStars.includes(r.stelle))
    : tutte;

  // Calcola statistiche
  const stats = {
    totale: tutte.length,
    media: tutte.length > 0 
      ? (tutte.reduce((sum, r) => sum + r.stelle, 0) / tutte.length).toFixed(1)
      : 0,
    distribuzione: [5, 4, 3, 2, 1].map(stella => ({
      stelle: stella,
      count: tutte.filter(r => r.stelle === stella).length,
      percentuale: tutte.length > 0
        ? ((tutte.filter(r => r.stelle === stella).length / tutte.length) * 100).toFixed(0)
        : 0
    }))
  };

  const getStarColor = (stelle) => {
    if (stelle >= 4) return "text-green-400";
    if (stelle === 3) return "text-yellow-400";
    return "text-red-400";
  };

  const getStarBg = (stelle) => {
    if (stelle >= 4) return "bg-green-500/10 border-green-500/30";
    if (stelle === 3) return "bg-yellow-500/10 border-yellow-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="w-full space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg">
                <Star className="w-7 h-7 text-white fill-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white">Recensioni Prodotto</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-zinc-400 text-sm">ASIN:</span>
                  <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-amber-400 font-mono text-sm">
                    {asin}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <DropdownLinguePortal paese={paese} setPaese={setPaese} />
              <button
                onClick={() => navigate("/europe")}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              >
                <ArrowLeft className="w-4 h-4" />
                Europa
              </button>
            </div>
          </div>
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-amber-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.totale}</p>
            <p className="text-sm text-zinc-400">Recensioni Totali</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-white">{stats.media}</p>
              <p className="text-xl text-yellow-400">⭐</p>
            </div>
            <p className="text-sm text-zinc-400">Valutazione Media</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white">{filtrate.length}</p>
            <p className="text-sm text-zinc-400">
              {selectedStars.length > 0 ? "Recensioni Filtrate" : "Tutte Visualizzate"}
            </p>
          </div>
        </div>

        {/* ========== DISTRIBUZIONE STELLE ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Distribuzione Valutazioni
          </h2>
          <div className="space-y-3">
            {stats.distribuzione.map(({ stelle, count, percentuale }) => (
              <div key={stelle} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-20">
                  <span className="text-sm font-medium text-white">{stelle}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="flex-1 h-8 bg-zinc-800 rounded-lg overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 transition-all duration-500"
                    style={{ width: `${percentuale}%` }}
                  />
                </div>
                <div className="w-16 text-right">
                  <span className="text-sm font-semibold text-white">{count}</span>
                  <span className="text-xs text-zinc-400 ml-1">({percentuale}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========== FILTRI STELLE ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <Filter className="w-5 h-5 text-emerald-400" />
              Filtra per Valutazione
            </h2>
            {selectedStars.length > 0 && (
              <button
                onClick={() => setSelectedStars([])}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancella filtri
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            {[5, 4, 3, 2, 1].map((stella) => {
              const isSelected = selectedStars.includes(stella);
              const count = tutte.filter(r => r.stelle === stella).length;
              
              return (
                <button
                  key={stella}
                  onClick={() => toggleFiltro(stella)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                    isSelected
                      ? "bg-yellow-500 border-yellow-500 text-black scale-105"
                      : "bg-zinc-800 border-zinc-700 text-white hover:border-yellow-500/50"
                  }`}
                  aria-pressed={isSelected}
                  type="button"
                >
                  <span className="text-lg">{stella}</span>
                  <Star className={`w-4 h-4 ${isSelected ? "fill-black" : "fill-yellow-400 text-yellow-400"}`} />
                  <span className="text-sm">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========== RECENSIONI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Recensioni
            {selectedStars.length > 0 && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-normal">
                Filtrate: {filtrate.length}
              </span>
            )}
          </h2>

          {filtrate.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 text-lg">Nessuna recensione trovata</p>
              <p className="text-zinc-500 text-sm mt-2">
                {selectedStars.length > 0 
                  ? "Prova a modificare i filtri selezionati"
                  : "Non ci sono recensioni disponibili per questo prodotto"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtrate.map((r) => (
                <article
                  key={r.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 hover:border-zinc-600 transition-all"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-lg border ${getStarBg(r.stelle)}`}>
                      <span className={`font-bold ${getStarColor(r.stelle)}`}>{r.stelle}</span>
                      <Star className={`w-4 h-4 ${getStarColor(r.stelle)} fill-current`} />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2">
                    {r.titolo}
                  </h3>

                  <p className="text-sm text-zinc-300 leading-relaxed line-clamp-4">
                    {r.testo}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Recensioni;