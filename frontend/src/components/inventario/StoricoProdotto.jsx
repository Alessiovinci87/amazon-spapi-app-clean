import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, History, ChevronDown, ChevronUp, Package, ImageOff } from "lucide-react";

const EVENT_ACCENTS = {
  CREATA:           { dot: "bg-amber-400",   text: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  "IN LAVORAZIONE": { dot: "bg-blue-400",    text: "text-blue-300",    bg: "bg-blue-500/10",    border: "border-blue-500/30" },
  COMPLETATA:       { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  ANNULLATA:        { dot: "bg-rose-400",    text: "text-rose-300",    bg: "bg-rose-500/10",    border: "border-rose-500/30" },
};

const StoricoProdotto = () => {
  const { asin } = useParams();
  const navigate = useNavigate();

  const [storico, setStorico] = useState([]);
  const [prodotto, setProdotto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    if (!asin) return;
    setLoading(true);
    axios
      .get(`/api/v2/sfuso/storico_produzioni/${asin}`)
      .then((res) => {
        const data = res.data || [];
        setStorico(data);
        if (data.length > 0) {
          const first = data[0];
          setProdotto({
            asin: first.asin_prodotto,
            nome: first.nome_prodotto || "Prodotto",
            img: `/images/${first.asin_prodotto}.jpg`,
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Errore API storico produzioni:", err);
        setError(err.message || "Errore nel caricamento dello storico");
        setLoading(false);
      });
  }, [asin]);

  if (!asin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center p-6">
        <p className="text-sm">Seleziona un prodotto per vedere lo storico.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid sottile */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top bar */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
            title="Indietro"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center">
            <History className="w-[18px] h-[18px] text-violet-400" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-white">Storico produzioni</span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1 font-mono">{asin}</span>
          </div>
        </div>
      </header>

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        {/* Prodotto header */}
        {prodotto && (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden mb-6">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {prodotto.img ? (
                  <img
                    src={prodotto.img}
                    alt={prodotto.nome}
                    className="w-full h-full object-contain"
                    onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
                  />
                ) : (
                  <ImageOff className="w-5 h-5 text-slate-700" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1">Prodotto</div>
                <h2 className="text-base font-semibold text-white truncate">{prodotto.nome}</h2>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{prodotto.asin}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading / error */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-slate-700 border-t-violet-400 rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Caricamento storico…</p>
          </div>
        )}
        {error && (
          <div className="px-4 py-3 rounded-md bg-rose-500/5 border border-rose-500/30">
            <p className="text-xs text-rose-300">Errore: {error}</p>
          </div>
        )}

        {/* Lista eventi */}
        {!loading && !error && (
          storico.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-8 h-8 mx-auto mb-3 text-slate-700" />
              <p className="text-sm text-slate-500">Nessun evento registrato per questo prodotto.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {storico.map((item) => {
                const dataFormattata = item.data_evento
                  ? new Date(item.data_evento).toLocaleString("it-IT")
                  : "Data non disponibile";
                const a = EVENT_ACCENTS[item.evento] ?? EVENT_ACCENTS["IN LAVORAZIONE"];
                const isOpen = !!expanded[item.id];

                return (
                  <div
                    key={item.id}
                    className="relative bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-lg overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="w-full text-left px-5 py-3 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${a.bg} ${a.border} border`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
                            <span className={`text-[10px] uppercase tracking-[0.12em] font-medium ${a.text}`}>{item.evento}</span>
                          </span>
                          <span className="text-xs text-slate-500">
                            qty <span className="text-slate-200 font-semibold tabular-nums">{item.quantita}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-slate-600">{dataFormattata}</span>
                          {isOpen
                            ? <ChevronUp className="w-4 h-4 text-slate-500" />
                            : <ChevronDown className="w-4 h-4 text-slate-500" />
                          }
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-4 pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <KV label="ID produzione" value={item.id_produzione || "—"} mono />
                        <KV label="ID sfuso"      value={item.id_sfuso}             mono />
                        <KV label="Formato"       value={item.formato || "—"} />
                        <KV label="Litri usati"   value={item.litri_usati} numeric />
                        <KV label="Operatore"     value={item.operatore || "—"} />
                        {item.note && (
                          <div className="sm:col-span-2 mt-1">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1">Note</div>
                            <p className="text-xs text-slate-300 leading-relaxed">{item.note}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>
    </div>
  );
};

function KV({ label, value, mono, numeric }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-0.5">{label}</div>
      <div className={`text-xs text-slate-200 ${mono ? "font-mono" : ""} ${numeric ? "tabular-nums" : ""}`}>{value}</div>
    </div>
  );
}

export default StoricoProdotto;
