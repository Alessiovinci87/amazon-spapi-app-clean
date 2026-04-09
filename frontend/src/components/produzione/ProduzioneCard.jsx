import React, { useState } from "react";
import { Beaker, Hash, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const inputCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-colors";

const selectCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-colors cursor-pointer";

const formatoConfig = {
  "10ml": { color: "blue", icon: "10" },
  "12ml": { color: "amber", icon: "12" },
  "100ml": { color: "emerald", icon: "100" },
};

const ProduzioneCard = ({ formato, selectedProdotto, sfusoData, onPrenota }) => {
  const [pezzi, setPezzi] = useState("");
  const [priorita, setPriorita] = useState("Media");
  const [note, setNote] = useState("");

  const sfusoCollegato = sfusoData.find((s) => {
    if (!selectedProdotto || !s.asin_collegati) return false;
    const asinList = JSON.parse(s.asin_collegati || "[]");
    return (
      s.formato?.toLowerCase() === formato?.toLowerCase() &&
      asinList.some(
        (asin) => asin?.toLowerCase() === selectedProdotto.asin?.toLowerCase()
      )
    );
  });

  const lottoNew = sfusoCollegato?.lotto || "-";
  const lottoOld = sfusoCollegato?.lotto_old || "-";
  const litriNew = sfusoCollegato?.litri_disponibili?.toFixed(2) || "0.00";
  const litriOld = sfusoCollegato?.litri_disponibili_old?.toFixed(2) || "0.00";

  const handlePrenota = () => {
    if (!selectedProdotto) {
      toast.warning("Seleziona prima un prodotto dall'inventario.");
      return;
    }
    if (!sfusoCollegato) {
      toast.error("Nessun sfuso collegato trovato per questo formato.");
      return;
    }
    if (!pezzi || pezzi <= 0) {
      toast.warning("Inserisci un numero valido di pezzi.");
      return;
    }

    const prenotazione = {
      formato,
      pezzi: Number(pezzi),
      priorita,
      note,
      lotto: lottoNew,
      asin_prodotto: selectedProdotto.asin,
      id_sfuso: sfusoCollegato.id,
    };

    onPrenota(prenotazione);
    setPezzi("");
    setNote("");
    setPriorita("Media");
  };

  const cfg = formatoConfig[formato.toLowerCase()] || formatoConfig["10ml"];

  const colorMap = {
    blue: {
      border: "border-blue-500/30",
      accent: "bg-blue-400/60",
      badge: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      btn: "bg-blue-600 hover:bg-blue-500 border-blue-500/40",
    },
    amber: {
      border: "border-amber-500/30",
      accent: "bg-amber-400/60",
      badge: "bg-amber-500/10 border-amber-500/30 text-amber-400",
      btn: "bg-amber-600 hover:bg-amber-500 border-amber-500/40",
    },
    emerald: {
      border: "border-emerald-500/30",
      accent: "bg-emerald-400/60",
      badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      btn: "bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40",
    },
  };

  const c = colorMap[cfg.color];

  const prioritaColors = {
    Alta: "text-rose-400",
    Media: "text-amber-400",
    Bassa: "text-slate-400",
  };

  return (
    <div className={`relative bg-slate-900/60 border border-slate-800 ${c.border} rounded-lg overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.accent}`} />

      <div className="px-5 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-md border ${c.badge} flex items-center justify-center flex-shrink-0`}>
            <span className="text-xs font-bold">{cfg.icon}</span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Formato</div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Produzione {formato.toUpperCase()}</h2>
          </div>
        </div>

        {/* Lotto info */}
        {sfusoCollegato ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-slate-800/40 rounded-md px-3 py-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Lotto OLD</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-300">{lottoOld}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 tabular-nums">{litriOld} L</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-slate-800/40 rounded-md px-3 py-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Lotto NEW</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-300">{lottoNew}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${c.badge} tabular-nums`}>{litriNew} L</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/30 rounded-md px-3 py-3 text-center">
            <p className="text-xs text-slate-500 italic">Nessun sfuso trovato per questo formato.</p>
          </div>
        )}

        {/* Input pezzi */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Hash className="w-3 h-3" /> N° Pezzi
          </label>
          <input
            type="number"
            placeholder="Pezzi da produrre"
            value={pezzi}
            onChange={(e) => setPezzi(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Select priorità */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5">Priorità</label>
          <div className="relative">
            <select
              value={priorita}
              onChange={(e) => setPriorita(e.target.value)}
              className={`${selectCls} ${prioritaColors[priorita] || ""}`}
            >
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Bassa">Bassa</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3 h-3" /> Note
          </label>
          <textarea
            placeholder="Aggiungi note (opzionale)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Button */}
        <button
          onClick={handlePrenota}
          className={`w-full ${c.btn} border text-white text-sm font-medium py-2.5 rounded-md transition-colors`}
        >
          Prenota produzione
        </button>
      </div>
    </div>
  );
};

export default ProduzioneCard;
