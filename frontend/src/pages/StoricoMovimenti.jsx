import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, History, Filter, Search, X, Calendar, Package, TrendingUp, TrendingDown, FileText, User } from "lucide-react";

const StoricoMovimenti = () => {
  const [movimenti, setMovimenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroFrom, setFiltroFrom] = useState("");
  const [filtroTo, setFiltroTo] = useState("");
  const [prodottoSelezionato, setProdottoSelezionato] = useState(null);
  const [prodottiDisponibili, setProdottiDisponibili] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovimenti = async () => {
      try {
        const res = await fetch("/api/v2/storico");
        const data = await res.json();
        setMovimenti(data);
      } catch (err) {
        console.error("❌ Errore recupero storico globale:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovimenti();
  }, []);

  useEffect(() => {
    // carica i prodotti disponibili
    fetch("/api/v2/inventario/nomi")
      .then((res) => res.json())
      .then((data) => setProdottiDisponibili(data))
      .catch((err) => console.error("Errore caricamento nomi prodotti:", err));
  }, []);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  // Badge tipo movimento
  const getTipoMovimentoBadge = (mov) => {
    const tipo = mov.direzione || mov.tipo;
    
    if (tipo === "RETTIFICA +") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
          <TrendingUp className="w-4 h-4" />
          RETTIFICA +
        </span>
      );
    }
    
    if (tipo === "RETTIFICA -") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-600 text-white rounded-full text-sm font-semibold">
          <TrendingDown className="w-4 h-4" />
          RETTIFICA -
        </span>
      );
    }
    
    return (
      <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-semibold">
        {tipo}
      </span>
    );
  };

  // Applica i filtri
  const movimentiFiltrati = movimenti.filter((m) => {
    // filtro per prodotto solo se selezionato
    if (prodottoSelezionato) {
      if (m.nome_prodotto !== prodottoSelezionato.nome) {
        return false;
      }
    }

    // filtro per date
    const dataMov = new Date(m.created_at);
    const fromOk = filtroFrom ? dataMov >= new Date(filtroFrom) : true;
    const toOk = filtroTo ? dataMov <= new Date(filtroTo) : true;

    return fromOk && toOk;
  });

  // Statistiche
  const getTotaleRettifichePositive = () => {
    return movimentiFiltrati.filter(m => m.direzione === "RETTIFICA +").length;
  };

  const getTotaleRettificheNegative = () => {
    return movimentiFiltrati.filter(m => m.direzione === "RETTIFICA -").length;
  };

  const getTotaleAltri = () => {
    return movimentiFiltrati.filter(m => m.direzione !== "RETTIFICA +" && m.direzione !== "RETTIFICA -").length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-6 bg-zinc-800 rounded-2xl mb-4">
            <Package className="w-20 h-20 text-zinc-600 mx-auto animate-pulse" />
          </div>
          <p className="text-zinc-400 text-xl font-medium">Caricamento storico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <History className="w-8 h-8 text-blue-400" />
                Storico Globale Movimenti
              </h1>
              <p className="text-zinc-400">Cronologia completa di tutti i movimenti di magazzino</p>
            </div>
            
            <button
              onClick={() => navigate("/magazzino")}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna a Magazzino
            </button>
          </div>
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-blue-600 rounded-full">
                <History className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{movimentiFiltrati.length}</p>
            <p className="text-sm text-blue-200 font-medium">Totali</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-green-600 rounded-full">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{getTotaleRettifichePositive()}</p>
            <p className="text-sm text-green-200 font-medium">Rettifiche +</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border border-orange-700/50 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-orange-600 rounded-full">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{getTotaleRettificheNegative()}</p>
            <p className="text-sm text-orange-200 font-medium">Rettifiche -</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-purple-600 rounded-full">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{getTotaleAltri()}</p>
            <p className="text-sm text-purple-200 font-medium">Altri</p>
          </div>
        </div>

        {/* ========== FILTRI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-blue-400" />
            Filtra Movimenti
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ricerca prodotto */}
            <div className="relative">
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <Search className="w-4 h-4" />
                Cerca Prodotto
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filtroNome.trim()) {
                      e.preventDefault();
                      const match = movimenti.find(
                        (m) =>
                          m.nome_prodotto &&
                          m.nome_prodotto.toLowerCase().includes(filtroNome.toLowerCase())
                      );
                      if (match) setProdottoSelezionato(match);
                    }
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-10 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Es. Antimicotico"
                />
                <Search className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {filtroNome && (
                  <button
                    onClick={() => {
                      setFiltroNome("");
                      setProdottoSelezionato(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Suggerimenti */}
              {filtroNome.length > 1 && (
                <ul className="absolute z-10 bg-zinc-800 border border-zinc-700 w-full mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {prodottiDisponibili
                    .filter((p) =>
                      p.nome.toLowerCase().includes(filtroNome.toLowerCase())
                    )
                    .map((p) => (
                      <li
                        key={p.asin}
                        className="p-3 cursor-pointer hover:bg-zinc-700 text-white border-b border-zinc-700 last:border-b-0 transition-colors"
                        onClick={() => {
                          setProdottoSelezionato(p);
                          setFiltroNome(p.nome);
                        }}
                      >
                        <p className="font-medium">{p.nome}</p>
                        <p className="text-xs text-zinc-400">ASIN: {p.asin}</p>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Da data */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Da Data
              </label>
              <input
                type="date"
                value={filtroFrom}
                onChange={(e) => setFiltroFrom(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* A data */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                A Data
              </label>
              <input
                type="date"
                value={filtroTo}
                onChange={(e) => setFiltroTo(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Indicatori filtri attivi */}
          {(prodottoSelezionato || filtroFrom || filtroTo) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-400">Filtri attivi:</span>
              {prodottoSelezionato && (
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs font-medium flex items-center gap-1">
                  Prodotto: {prodottoSelezionato.nome}
                  <button onClick={() => {
                    setProdottoSelezionato(null);
                    setFiltroNome("");
                  }} className="hover:text-blue-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filtroFrom && (
                <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs font-medium flex items-center gap-1">
                  Da: {filtroFrom}
                  <button onClick={() => setFiltroFrom("")} className="hover:text-purple-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filtroTo && (
                <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs font-medium flex items-center gap-1">
                  A: {filtroTo}
                  <button onClick={() => setFiltroTo("")} className="hover:text-purple-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setProdottoSelezionato(null);
                  setFiltroNome("");
                  setFiltroFrom("");
                  setFiltroTo("");
                }}
                className="text-sm text-red-400 hover:text-red-300 underline ml-2"
              >
                Rimuovi tutti i filtri
              </button>
            </div>
          )}
        </div>

        {/* ========== PRODOTTO SELEZIONATO ========== */}
        {prodottoSelezionato && (
          <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 border border-blue-700/50 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <img
                src={`/images/${prodottoSelezionato.asin}.jpg`}
                alt={prodottoSelezionato.nome}
                className="w-24 h-24 object-cover rounded-lg border-2 border-blue-600"
                onError={(e) => { e.target.src = "/images/placeholder.jpg"; }}
              />
              <div>
                <p className="text-xs text-blue-400 font-semibold mb-1">PRODOTTO SELEZIONATO</p>
                <h3 className="text-xl font-bold text-white mb-1">{prodottoSelezionato.nome}</h3>
                <p className="text-sm text-zinc-400">ASIN: {prodottoSelezionato.asin}</p>
              </div>
            </div>
          </div>
        )}

        {/* ========== LISTA MOVIMENTI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <History className="w-5 h-5 text-blue-400" />
              Lista Movimenti
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-normal">
                {movimentiFiltrati.length}
              </span>
            </h2>
          </div>

          {movimentiFiltrati.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block p-6 bg-zinc-800 rounded-2xl mb-4">
                <Package className="w-20 h-20 text-zinc-600 mx-auto" />
              </div>
              <p className="text-zinc-400 text-xl font-medium mb-2">Nessun movimento trovato</p>
              <p className="text-zinc-500 text-sm mb-4">Non ci sono movimenti registrati con i filtri attuali</p>
              {(prodottoSelezionato || filtroFrom || filtroTo) && (
                <button
                  onClick={() => {
                    setProdottoSelezionato(null);
                    setFiltroNome("");
                    setFiltroFrom("");
                    setFiltroTo("");
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  Rimuovi i filtri
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {movimentiFiltrati.map((mov) => (
                <div
                  key={mov.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-900/20 transition-all cursor-pointer"
                  onClick={() => toggleExpand(mov.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Info Principale */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {mov.nome_prodotto || mov.asin_prodotto}
                          </h3>
                          <p className="text-sm text-zinc-400">ASIN: {mov.asin_prodotto}</p>
                        </div>
                        {getTipoMovimentoBadge(mov)}
                      </div>

                      {/* Dettagli espansi */}
                      {expanded[mov.id] && (
                        <div className="space-y-3 pt-3 border-t border-zinc-700">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="bg-zinc-900 rounded-lg p-3">
                              <p className="text-zinc-400 text-xs mb-1">Delta</p>
                              <p className="text-white font-bold text-lg">{mov.dettagli?.delta}</p>
                            </div>
                            <div className="bg-zinc-900 rounded-lg p-3">
                              <p className="text-zinc-400 text-xs mb-1">Valore Finale</p>
                              <p className="text-white font-bold text-lg">{mov.dettagli?.finale}</p>
                            </div>
                            <div className="bg-zinc-900 rounded-lg p-3">
                              <p className="text-zinc-400 text-xs mb-1">Operatore</p>
                              <p className="text-white font-medium">{mov.dettagli?.operatore || "-"}</p>
                            </div>
                            <div className="bg-zinc-900 rounded-lg p-3">
                              <p className="text-zinc-400 text-xs mb-1">Data</p>
                              <p className="text-white font-medium text-xs">{formatDate(mov.created_at)}</p>
                            </div>
                          </div>

                          {mov.dettagli?.nota && (
                            <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                              <p className="text-xs text-blue-400 font-semibold mb-1 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                Nota:
                              </p>
                              <p className="text-sm text-blue-100">{mov.dettagli.nota}</p>
                            </div>
                          )}

                          {mov.accessori?.length > 0 && (
                            <div className="p-3 bg-purple-900/20 border border-purple-700/30 rounded-lg">
                              <p className="text-xs text-purple-400 font-semibold mb-2 flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Accessori movimentati:
                              </p>
                              <ul className="space-y-1">
                                {mov.accessori.map((acc, idx) => (
                                  <li key={idx} className="text-sm text-purple-100 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                    {acc.asin_accessorio} → <span className={acc.qty > 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>{acc.qty > 0 ? `+${acc.qty}` : acc.qty}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Data e toggle */}
                    <div className="flex-shrink-0 flex items-center gap-4">
                      {!expanded[mov.id] && (
                        <div className="text-right bg-zinc-900 rounded-lg p-3 border border-zinc-700">
                          <p className="text-xs text-zinc-400 mb-1 font-medium">Data Movimento</p>
                          <p className="text-sm text-white font-semibold">{formatDate(mov.created_at)}</p>
                        </div>
                      )}
                      <span className="text-blue-400 text-2xl">
                        {expanded[mov.id] ? "▲" : "▼"}
                      </span>
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

export default StoricoMovimenti;