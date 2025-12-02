import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  History,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Package,
  User,
  FileText,
  AlertCircle,
  Plus,
  Minus,
  Settings
} from "lucide-react";

const StoricoPage = () => {
  const { asin } = useParams();
  const navigate = useNavigate();

  const [storico, setStorico] = useState([]);
  const [filtroTesto, setFiltroTesto] = useState("");
  const [dataInizio, setDataInizio] = useState("");
  const [dataFine, setDataFine] = useState("");
  const [prodotto, setProdotto] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!asin) return;
    fetch(`/api/v2/storico`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter(
          (m) => m.asin_prodotto === asin || m.asin_accessorio === asin
        );
        setStorico(filtered);

        const p = data.find((m) => m.asin_prodotto === asin);
        if (p) {
          setProdotto({
            asin: p.asin_prodotto,
            nome: p.nome_prodotto || "Prodotto",
            img: `/images/${p.asin_prodotto}.jpg`,
          });
        }
      })
      .catch((err) =>
        console.error("❌ Errore nel recupero storico prodotto:", err)
      );
  }, [asin]);

  const movimentiFiltrati = storico.filter((m) => {
    const testo = filtroTesto.toLowerCase();
    const asinMov = (m.asin_prodotto || m.asin_accessorio || "").toLowerCase();
    const nome = (m.nome_prodotto || "").toLowerCase();

    const matchTesto =
      asinMov.includes(testo) ||
      nome.includes(testo) ||
      (m.note || "").toLowerCase().includes(testo);

    const dataMov = new Date(m.created_at);
    const matchDataInizio = dataInizio ? dataMov >= new Date(dataInizio) : true;
    const matchDataFine = dataFine ? dataMov <= new Date(dataFine) : true;

    return matchTesto && matchDataInizio && matchDataFine;
  });

  // Accessori legati al movimento
  const getAccessoriPerMovimento = (movId) => {
    const collegati = storico.filter(
      (m) =>
        (m.tipo === "CONSUMO_ACCESSORI" || m.tipo === "REINTEGRO_ACCESSORI") &&
        m.id_riferimento === movId
    );

    if (collegati.length === 0) return null;

    const grouped = {};
    collegati.forEach((acc) => {
      const nome = acc.asin_accessorio || "Accessorio";
      grouped[nome] = (grouped[nome] || 0) + (acc.delta_quantita || 0);
    });

    return grouped;
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Determina tipo, label e colore del movimento
  const getMovimentoInfo = (mov) => {
    let tipoLabel = mov.tipo;
    let colorClass = "from-blue-500/10 to-cyan-600/10 border-blue-500/30";
    let icon = <Settings className="w-5 h-5" />;
    let iconColor = "text-blue-400";

    if (mov.tipo === "RETTIFICA") {
      if (mov.delta_pronto > 0) {
        tipoLabel = "Rettifica Positiva";
        colorClass = "from-emerald-500/10 to-green-600/10 border-emerald-500/30";
        icon = <Plus className="w-5 h-5" />;
        iconColor = "text-emerald-400";
      } else {
        tipoLabel = "Rettifica Negativa";
        colorClass = "from-orange-500/10 to-amber-600/10 border-orange-500/30";
        icon = <Minus className="w-5 h-5" />;
        iconColor = "text-orange-400";
      }
    } else if (mov.tipo === "PRODUZIONE") {
      tipoLabel = "Produzione";
      colorClass = "from-emerald-500/10 to-green-600/10 border-emerald-500/30";
      icon = <TrendingUp className="w-5 h-5" />;
      iconColor = "text-emerald-400";
    }

    return { tipoLabel, colorClass, icon, iconColor };
  };

  // Calcola statistiche
  const totaleMovimenti = movimentiFiltrati.length;
  const rettifichePositive = movimentiFiltrati.filter(m => m.tipo === "RETTIFICA" && m.delta_pronto > 0).length;
  const produzioni = movimentiFiltrati.filter(m => m.tipo === "PRODUZIONE").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <History className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Storico Movimenti</h1>
                <p className="text-zinc-400 mt-1">Cronologia dettagliata prodotto</p>
              </div>
            </div>

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>
          </div>
        </div>

        {/* ========== INFO PRODOTTO ========== */}
        {prodotto && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Immagine */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-zinc-800 border-2 border-zinc-700">
                  <img
                    src={prodotto.img}
                    alt={prodotto.nome}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "/images/no_image2.png";
                    }}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">{prodotto.nome}</h2>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-sm font-medium">
                    ASIN: {prodotto.asin}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <History className="w-8 h-8 text-indigo-400" />
              <div>
                <p className="text-sm text-zinc-400">Movimenti Totali</p>
                <p className="text-2xl font-bold text-indigo-400">{totaleMovimenti}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-sm text-zinc-400">Produzioni</p>
                <p className="text-2xl font-bold text-emerald-400">{produzioni}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-amber-600/10 border border-orange-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Plus className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-sm text-zinc-400">Rettifiche +</p>
                <p className="text-2xl font-bold text-orange-400">{rettifichePositive}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========== FILTRI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-400" />
            Filtra Movimenti
          </h2>

          <div className="space-y-4">
            {/* Ricerca testo */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Cerca per Nome, ASIN o Note..."
                value={filtroTesto}
                onChange={(e) => setFiltroTesto(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {filtroTesto && (
                <button
                  onClick={() => setFiltroTesto("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  ✖
                </button>
              )}
            </div>

            {/* Date range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Inizio
                </label>
                <input
                  type="date"
                  value={dataInizio}
                  onChange={(e) => setDataInizio(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Fine
                </label>
                <input
                  type="date"
                  value={dataFine}
                  onChange={(e) => setDataFine(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Reset filtri */}
            {(filtroTesto || dataInizio || dataFine) && (
              <button
                onClick={() => {
                  setFiltroTesto("");
                  setDataInizio("");
                  setDataFine("");
                }}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white text-sm font-medium transition-all"
              >
                🔄 Reset Filtri
              </button>
            )}
          </div>
        </div>

        {/* ========== LISTA MOVIMENTI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Movimenti ({movimentiFiltrati.length})
          </h2>

          {movimentiFiltrati.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Nessun movimento trovato
              </h3>
              <p className="text-zinc-400 text-sm">
                Prova a modificare i filtri di ricerca
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {movimentiFiltrati.map((mov) => {
                const dataFormattata = mov.created_at
                  ? new Date(mov.created_at).toLocaleString("it-IT")
                  : "-";

                const { tipoLabel, colorClass, icon, iconColor } = getMovimentoInfo(mov);
                const accessori = getAccessoriPerMovimento(mov.id);
                const isExpanded = expanded[mov.id];

                return (
                  <div
                    key={mov.id}
                    className={`bg-gradient-to-br ${colorClass} rounded-xl border overflow-hidden transition-all cursor-pointer hover:shadow-lg`}
                    onClick={() => toggleExpand(mov.id)}
                  >
                    {/* Header sempre visibile */}
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Tipo movimento */}
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center ${iconColor}`}>
                            {icon}
                          </div>
                          <div>
                            <p className={`font-semibold ${iconColor}`}>{tipoLabel}</p>
                            <p className="text-xs text-zinc-400">{dataFormattata}</p>
                          </div>
                        </div>

                        {/* Quantità */}
                        <div className="text-right">
                          <p className="text-sm text-zinc-400">Quantità</p>
                          <p className="text-xl font-bold text-white">
                            {mov.delta_pronto > 0 ? "+" : ""}
                            {mov.delta_pronto ?? mov.delta_quantita ?? "-"}
                          </p>
                        </div>

                        {/* Espandi/Comprimi */}
                        <button
                          className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(mov.id);
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

                    {/* Dettagli espandibili */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-zinc-700/50">
                        {/* Note */}
                        {mov.note && (
                          <div className="pt-3">
                            <div className="flex items-start gap-2 mb-2">
                              <FileText className="w-4 h-4 text-zinc-400 mt-0.5" />
                              <p className="text-sm font-semibold text-zinc-300">Note</p>
                            </div>
                            <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded-lg p-3">
                              {mov.note}
                            </p>
                          </div>
                        )}

                        {/* Operatore */}
                        {mov.operatore && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-zinc-400" />
                            <span className="text-zinc-400">Operatore:</span>
                            <span className="text-white font-medium">{mov.operatore}</span>
                          </div>
                        )}

                        {/* Accessori movimentati */}
                        {accessori && (
                          <div className="bg-zinc-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-blue-400" />
                              <p className="text-sm font-semibold text-blue-400">
                                Accessori Movimentati
                              </p>
                            </div>
                            <ul className="space-y-1">
                              {Object.entries(accessori).map(([nome, qty]) => (
                                <li
                                  key={nome}
                                  className="flex justify-between text-sm text-zinc-300"
                                >
                                  <span>{nome}</span>
                                  <span className={qty > 0 ? "text-emerald-400" : "text-orange-400"}>
                                    {qty > 0 ? `+${qty}` : qty}
                                  </span>
                                </li>
                              ))}
                            </ul>
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
      </div>
    </div>
  );
};

export default StoricoPage;