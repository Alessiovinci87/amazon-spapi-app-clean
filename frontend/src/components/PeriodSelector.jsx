import { useState } from "react";
import { Calendar, X } from "lucide-react";

// =============================================================
// Selettore periodo riusabile
// Usato da Panoramica e DashboardProfitability per allineare KPI ai
// dati Amazon (sales_daily) sul range scelto.
//
// Range output (dispatched via onChange):
//   { presetId, from, to }   con from/to in formato YYYY-MM-DD
//
// Note:
//  - "Oggi/Ieri/Altroieri": ritornano lo stesso giorno come from=to.
//    Per essere "near real-time" servirà un endpoint che usa Orders API
//    (in arrivo); per ora i dati provengono da sales_daily che ha
//    fisiologicamente 24-72h di lag.
//  - I preset >=7gg usano sempre l'intervallo da today-N a ieri.
// =============================================================

const fmtYmd = (d) => d.toISOString().slice(0, 10);
const ymdOffset = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return fmtYmd(d);
};
const yearStart = () => fmtYmd(new Date(new Date().getFullYear(), 0, 1));

export const PERIOD_PRESETS = [
  { id: "today",     label: "Oggi",          from: () => ymdOffset(0),   to: () => ymdOffset(0) },
  { id: "yesterday", label: "Ieri",          from: () => ymdOffset(1),   to: () => ymdOffset(1) },
  { id: "d2",        label: "Altroieri",     from: () => ymdOffset(2),   to: () => ymdOffset(2) },
  { id: "d7",        label: "7 giorni",      from: () => ymdOffset(7),   to: () => ymdOffset(1) },
  { id: "d15",       label: "15 giorni",     from: () => ymdOffset(15),  to: () => ymdOffset(1) },
  { id: "d30",       label: "30 giorni",     from: () => ymdOffset(30),  to: () => ymdOffset(1) },
  { id: "d60",       label: "60 giorni",     from: () => ymdOffset(60),  to: () => ymdOffset(1) },
  { id: "d90",       label: "90 giorni",     from: () => ymdOffset(90),  to: () => ymdOffset(1) },
  { id: "m6",        label: "6 mesi",        from: () => ymdOffset(180), to: () => ymdOffset(1) },
  { id: "m12",       label: "12 mesi",       from: () => ymdOffset(365), to: () => ymdOffset(1) },
  { id: "ytd",       label: "Anno corrente", from: () => yearStart(),    to: () => ymdOffset(0) },
];

/**
 * Restituisce { from, to } per un preset id. Se id="custom" usa fallback.
 */
export function rangeFor(presetId, fallbackCustom) {
  if (presetId === "custom" && fallbackCustom?.from && fallbackCustom?.to) {
    return { from: fallbackCustom.from, to: fallbackCustom.to };
  }
  const p = PERIOD_PRESETS.find((x) => x.id === presetId) || PERIOD_PRESETS[3];
  return { from: p.from(), to: p.to() };
}

/**
 * Props:
 *  - value: { presetId, from, to }
 *  - onChange: ({ presetId, from, to }) => void
 *  - accent: "indigo" | "violet" | "emerald" | ...
 *  - rangeInfo: stringa libera mostrata a destra (es "Dati Amazon fino al 03/05")
 */
export default function PeriodSelector({ value, onChange, accent = "indigo", rangeInfo }) {
  const [showCustom, setShowCustom] = useState(false);
  const [draft, setDraft] = useState({
    from: value?.from || "",
    to: value?.to || "",
  });

  const accentMap = {
    indigo:  "bg-indigo-500/20 border-indigo-500/50 text-indigo-200",
    violet:  "bg-violet-500/20 border-violet-500/50 text-violet-200",
    emerald: "bg-emerald-500/20 border-emerald-500/50 text-emerald-200",
    blue:    "bg-blue-500/20 border-blue-500/50 text-blue-200",
  };
  const activeCls = accentMap[accent] || accentMap.indigo;

  const handlePreset = (id) => {
    const r = rangeFor(id);
    onChange({ presetId: id, from: r.from, to: r.to });
    setShowCustom(false);
  };

  const applyCustom = () => {
    if (!draft.from || !draft.to) return;
    let from = draft.from, to = draft.to;
    if (from > to) [from, to] = [to, from];
    onChange({ presetId: "custom", from, to });
    setShowCustom(false);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Periodo</div>
        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          {value?.from && value?.to && (
            <span>{value.from} → {value.to}</span>
          )}
          {rangeInfo}
        </div>
      </div>
      {/* Mobile/tablet (<lg): dropdown nativo + bottone custom separato */}
      <div className="flex lg:hidden items-stretch gap-2">
        <select
          value={value?.presetId === "custom" ? "__custom__" : (value?.presetId || "d7")}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") {
              setShowCustom(true);
            } else {
              handlePreset(v);
            }
          }}
          className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
        >
          {PERIOD_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
          <option value="__custom__">
            {value?.presetId === "custom" ? `Custom: ${value.from} → ${value.to}` : "Custom…"}
          </option>
        </select>
        <button
          type="button"
          onClick={() => setShowCustom((s) => !s)}
          className={`inline-flex items-center gap-1 px-3 py-2 rounded text-xs uppercase tracking-wider transition-colors flex-shrink-0 ${
            value?.presetId === "custom"
              ? activeCls
              : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          aria-label="Personalizza date"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop (>=lg): chip orizzontali */}
      <div className="hidden lg:flex items-center gap-1.5 flex-wrap">
        {PERIOD_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handlePreset(p.id)}
            className={`px-2.5 py-1 rounded text-[11px] uppercase tracking-wider transition-colors ${
              value?.presetId === p.id
                ? activeCls
                : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom((s) => !s)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] uppercase tracking-wider transition-colors ${
            value?.presetId === "custom"
              ? activeCls
              : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-3 h-3" />
          {value?.presetId === "custom" ? `${value.from} → ${value.to}` : "Custom"}
        </button>
      </div>

      {showCustom && (
        <div className="mt-3 p-3 bg-slate-950/60 border border-slate-800 rounded-md flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider">Da</span>
          <input
            type="date"
            value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
          />
          <span className="text-[11px] text-slate-500 uppercase tracking-wider">A</span>
          <input
            type="date"
            value={draft.to}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
          />
          <button
            type="button"
            onClick={applyCustom}
            disabled={!draft.from || !draft.to}
            className={`px-3 py-1 rounded text-xs uppercase tracking-wider hover:bg-opacity-30 disabled:opacity-50 ${activeCls}`}
          >
            Applica
          </button>
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            className="px-2 py-1 text-slate-500 hover:text-slate-300"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
