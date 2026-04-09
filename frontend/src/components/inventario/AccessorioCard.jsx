// src/components/inventario/AccessorioCard.jsx
import React, { useState, useEffect } from "react";
import { Edit3, X, Package, ImageOff } from "lucide-react";

const normalizzaAsinAccessorio = (nome, asin_accessorio) => {
  return asin_accessorio || nome.replace(/\s+/g, "_").toUpperCase();
};

// === Modale rettifica accessorio ===
const RettificaModal = ({ asin, valoreAttuale, onClose, onConferma }) => {
  const [nuovoPronto, setNuovoPronto] = useState(valoreAttuale);
  const [nota, setNota] = useState("");
  const [operatore, setOperatore] = useState("");
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  const handleSubmit = async () => {
    if (!nota.trim() || !operatore.trim()) {
      setErrore("Nota e operatore sono obbligatori");
      return;
    }
    setErrore("");
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/accessori/${asin}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantita: Number(nuovoPronto),
          note: nota,
          operatore,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nella rettifica");
      onConferma(data);
      onClose();
    } catch (err) {
      console.error("❌ Errore rettifica:", err);
      setErrore(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1">Modifica</div>
            <h2 className="text-base font-semibold text-white">Rettifica quantità</h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
              Nuovo valore pronto
            </label>
            <input
              type="number"
              value={nuovoPronto}
              onChange={(e) => setNuovoPronto(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all tabular-nums"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
              Nota (obbligatoria)
            </label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
              Operatore
            </label>
            <select
              value={operatore}
              onChange={(e) => setOperatore(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
            >
              <option value="">— seleziona —</option>
              <option value="Guido">Guido</option>
              <option value="David">David</option>
              <option value="Alessio">Alessio</option>
              <option value="Tony">Tony</option>
            </select>
          </div>

          {errore && (
            <div className="px-3 py-2 rounded-md bg-rose-500/5 border border-rose-500/30">
              <p className="text-xs text-rose-300">{errore}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-800 flex gap-2 justify-end">
          <button
            onClick={onClose}
            type="button"
            disabled={loading}
            className="px-3 py-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all disabled:opacity-50"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {loading ? "Salvataggio…" : "Conferma"}
          </button>
        </div>
      </div>
    </div>
  );
};

// === Card accessorio ===
const AccessorioCard = ({
  asin_accessorio,
  nome,
  quantita,
  soglia_minima: sogliaProp = 0,
  immagine,
  fetchAccessori,
  layout = "default",
}) => {
  const asinAccessorioFinale = normalizzaAsinAccessorio(nome, asin_accessorio);

  const [quantitaLocale, setQuantitaLocale] = useState(quantita || 0);
  const [sogliaLocale, setSogliaLocale] = useState(sogliaProp || 0);
  const [editSoglia, setEditSoglia] = useState(false);
  const [sogliaInput, setSogliaInput] = useState(String(sogliaProp || 0));
  const [showRettifica, setShowRettifica] = useState(false);

  useEffect(() => {
    setQuantitaLocale(quantita || 0);
  }, [quantita]);

  useEffect(() => {
    setSogliaLocale(sogliaProp || 0);
    setSogliaInput(String(sogliaProp || 0));
  }, [sogliaProp]);

  const sottoSoglia = sogliaLocale > 0 && quantitaLocale < sogliaLocale;
  const stockBasso = sottoSoglia || (quantitaLocale > 0 && quantitaLocale < 50);
  const stockZero  = quantitaLocale === 0;

  const salvaSoglia = async () => {
    const val = Math.max(0, parseInt(sogliaInput, 10) || 0);
    try {
      const res = await fetch(`/api/v2/accessori/${asinAccessorioFinale}/soglia`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soglia_minima: val }),
      });
      if (!res.ok) throw new Error("Errore");
      setSogliaLocale(val);
      setEditSoglia(false);
    } catch { /* silenzioso */ }
  };

  // === Layout small (griglia compatta) ===
  if (layout === "small") {
    return (
      <>
        <div className="relative bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-lg overflow-hidden transition-all flex flex-col">
          <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${
            stockZero ? "bg-rose-500/60" : stockBasso ? "bg-amber-500/60" : "bg-emerald-500/40"
          }`} />
          <div className="flex-1 flex flex-col items-center text-center p-5">
            <div className="w-20 h-20 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden mb-3">
              {immagine ? (
                <img src={immagine} alt={nome} className="w-full h-full object-contain" loading="lazy" />
              ) : (
                <ImageOff className="w-6 h-6 text-slate-700" />
              )}
            </div>
            <h3 className="text-sm font-medium text-white mb-1 line-clamp-2">{nome}</h3>
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1">Quantità</p>
            <p className={`text-lg font-semibold tabular-nums ${
              stockZero ? "text-rose-400" : stockBasso ? "text-amber-400" : "text-emerald-400"
            }`}>
              {quantitaLocale}
            </p>
            {sottoSoglia && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-400 font-medium">
                sotto soglia ({sogliaLocale})
              </span>
            )}
            {/* Soglia inline */}
            <div className="mt-2 flex items-center justify-center gap-1">
              {editSoglia ? (
                <>
                  <input
                    type="number"
                    min="0"
                    value={sogliaInput}
                    onChange={(e) => setSogliaInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && salvaSoglia()}
                    className="w-14 px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs text-center tabular-nums focus:outline-none focus:border-amber-500/50"
                    autoFocus
                  />
                  <button onClick={salvaSoglia} type="button" className="text-emerald-400 hover:text-emerald-300 text-[10px] font-medium">OK</button>
                  <button onClick={() => { setEditSoglia(false); setSogliaInput(String(sogliaLocale)); }} type="button" className="text-slate-500 hover:text-slate-300 text-[10px]">✕</button>
                </>
              ) : (
                <button
                  onClick={() => setEditSoglia(true)}
                  type="button"
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                  title="Imposta soglia minima"
                >
                  Soglia: {sogliaLocale > 0 ? sogliaLocale : "—"}
                </button>
              )}
            </div>
          </div>
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowRettifica(true)}
              type="button"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Rettifica
            </button>
          </div>
        </div>

        {showRettifica && (
          <RettificaModal
            asin={asinAccessorioFinale}
            valoreAttuale={quantitaLocale}
            onClose={() => setShowRettifica(false)}
            onConferma={(data) => setQuantitaLocale(data.pronto ?? data.quantita ?? quantitaLocale)}
          />
        )}
      </>
    );
  }

  // === Layout default (riga estesa, omogeneo a ProdottoCard) ===
  return (
    <>
      <div className="relative bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-lg overflow-hidden transition-all">
        {/* Bordo sinistro stato stock */}
        <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${
          stockZero ? "bg-rose-500/60" : stockBasso ? "bg-amber-500/60" : "bg-emerald-500/40"
        }`} />

        <div className="flex items-center gap-5 sm:gap-6 px-6 sm:px-8 py-6 sm:py-7">
          {/* Immagine */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0">
            {immagine ? (
              <img src={immagine} alt={nome} className="w-full h-full object-contain" loading="lazy" />
            ) : (
              <Package className="w-9 h-9 text-slate-700" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold text-white truncate mb-2.5 leading-tight">
              {nome}
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-xs">
                {asinAccessorioFinale}
              </span>
              <span className="text-sm text-slate-500">
                Quantità{" "}
                <span className={`font-semibold tabular-nums text-base ${
                  stockZero ? "text-rose-400" : stockBasso ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {quantitaLocale}
                </span>
              </span>
              {sottoSoglia && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-400 font-medium">
                  sotto soglia ({sogliaLocale})
                </span>
              )}
              {/* Soglia inline */}
              <div className="flex items-center gap-1">
                {editSoglia ? (
                  <>
                    <input
                      type="number"
                      min="0"
                      value={sogliaInput}
                      onChange={(e) => setSogliaInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && salvaSoglia()}
                      className="w-14 px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs text-center tabular-nums focus:outline-none focus:border-amber-500/50"
                      autoFocus
                    />
                    <button onClick={salvaSoglia} type="button" className="text-emerald-400 hover:text-emerald-300 text-[10px] font-medium">OK</button>
                    <button onClick={() => { setEditSoglia(false); setSogliaInput(String(sogliaLocale)); }} type="button" className="text-slate-500 hover:text-slate-300 text-[10px]">✕</button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditSoglia(true)}
                    type="button"
                    className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    title="Imposta soglia minima"
                  >
                    Soglia: {sogliaLocale > 0 ? sogliaLocale : "—"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Azione rapida */}
          <div className="flex-shrink-0">
            <button
              onClick={() => setShowRettifica(true)}
              type="button"
              title="Rettifica quantità"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rettifica</span>
            </button>
          </div>
        </div>
      </div>

      {showRettifica && (
        <RettificaModal
          asin={asinAccessorioFinale}
          valoreAttuale={quantitaLocale}
          onClose={() => setShowRettifica(false)}
          onConferma={(data) => setQuantitaLocale(data.pronto ?? data.quantita ?? quantitaLocale)}
        />
      )}
    </>
  );
};

export default AccessorioCard;
