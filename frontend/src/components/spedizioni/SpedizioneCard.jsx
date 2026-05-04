import React, { useState, useEffect } from "react";
import {
  Package, Truck, Calendar, User, FileText, CheckCircle,
  Edit3, Trash2, Download, X, Save, ChevronDown, ChevronUp,
} from "lucide-react";

const Flag = ({ code, className = "h-3.5 w-auto inline-block" }) => {
  const c = (code || "").toLowerCase();
  return <img src={`https://flagcdn.com/24x18/${c}.png`} alt={code} className={className} />;
};

const PAESI_MAP = {
  IT: "Italia", FR: "Francia", ES: "Spagna", DE: "Germania",
  UK: "Regno Unito", NL: "Olanda", BE: "Belgio", SE: "Svezia",
  PL: "Polonia", IE: "Irlanda",
};

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-colors";

const SpedizioneCard = ({ spedizioni, onDelete, onConferma, onExport, onUpdate }) => {
  if (!spedizioni || spedizioni.length === 0) {
    return (
      <div className="text-center py-8">
        <Truck className="w-8 h-8 text-slate-700 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Nessuna spedizione creata.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {spedizioni.map((s) => (
        <EditableCard
          key={s.id}
          spedizione={s}
          onDelete={onDelete}
          onConferma={onConferma}
          onExport={onExport}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
};

const EditableCard = ({ spedizione, onDelete, onConferma, onExport, onUpdate }) => {
  const [editMode, setEditMode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [paese, setPaese] = useState(spedizione.paese);
  const [righe, setRighe] = useState(spedizione.righe || []);
  const [saving, setSaving] = useState(false);

  // Risincronizza lo state locale quando la prop cambia (es. dopo refetch
  // del parent post-salvataggio): senza questo, righe/paese restano fermi
  // al valore del primo mount e la card mostra dati stale.
  useEffect(() => {
    if (!editMode) {
      setPaese(spedizione.paese);
      setRighe(spedizione.righe || []);
    }
  }, [spedizione.id, spedizione.paese, spedizione.righe, editMode]);

  const isBozza = spedizione.stato === "BOZZA";
  const totPezzi = (spedizione.righe || []).reduce((s, r) => s + (r.quantita || 0), 0);

  const statusColor = isBozza
    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";

  const updateQuantita = (index, value) => {
    const nuove = [...righe];
    nuove[index] = { ...nuove[index], quantita: parseInt(value, 10) || 0 };
    setRighe(nuove);
  };

  const removeRiga = (index) => setRighe(righe.filter((_, i) => i !== index));

  const salvaModifiche = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdate(spedizione.id, { paese, righe });
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleConferma = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onConferma(spedizione.id);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onDelete(spedizione.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg overflow-hidden">
      {/* Header — sempre visibile */}
      <button
        type="button"
        onClick={() => !editMode && setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Flag code={spedizione.paese} className="h-4 w-auto" />
          <span className="text-sm font-semibold text-white tracking-tight">
            {spedizione.progressivo}
          </span>
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:inline">
          {PAESI_MAP[spedizione.paese] || spedizione.paese}
        </span>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 hidden sm:flex">
          <Calendar className="w-3 h-3" />
          {spedizione.data || "N/D"}
        </div>

        {spedizione.operatore && (
          <div className="items-center gap-1.5 text-[11px] text-slate-500 hidden md:flex">
            <User className="w-3 h-3" />
            {spedizione.operatore}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-slate-400 tabular-nums hidden sm:inline">
            {(spedizione.righe || []).length} {(spedizione.righe || []).length === 1 ? "prodotto" : "prodotti"} · {totPezzi} pz
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${statusColor}`}>
            {spedizione.stato}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {/* Body — espandibile */}
      {expanded && (
        <div className="border-t border-slate-700/60 px-5 py-4">

          {spedizione.note && (
            <div className="flex items-start gap-2 mb-4 text-[12px] text-slate-400">
              <FileText className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
              {spedizione.note}
            </div>
          )}

          {editMode ? (
            /* ── Modalità modifica ── */
            <>
              <div className="mb-4">
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Paese</label>
                <input type="text" value={paese} onChange={(e) => setPaese(e.target.value)} className={`${inputCls} max-w-[200px]`} />
              </div>

              <div className="space-y-2 mb-4">
                {righe.map((r, i) => (
                  <div key={r.id || i} className="flex items-center gap-3 bg-slate-900/40 border border-slate-700/40 rounded-md px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{r.prodotto_nome}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.asin}</p>
                    </div>
                    <input
                      type="number"
                      value={r.quantita}
                      onChange={(e) => updateQuantita(i, e.target.value)}
                      min="1"
                      className={`${inputCls} w-20 text-center`}
                    />
                    <button onClick={() => removeRiga(i)} type="button" className="text-slate-500 hover:text-rose-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={salvaModifiche}
                  disabled={saving}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Salvataggio..." : "Salva"}
                </button>
                <button
                  onClick={() => { setEditMode(false); setRighe(spedizione.righe || []); setPaese(spedizione.paese); }}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all"
                >
                  Annulla
                </button>
              </div>
            </>
          ) : (
            /* ── Modalità visualizzazione ── */
            <>
              <div className="space-y-1.5 mb-4">
                {(spedizione.righe || []).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 bg-slate-900/40 border border-slate-700/40 rounded-md px-4 py-2.5">
                    <Package className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{r.prodotto_nome}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.asin}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400 tabular-nums">{r.quantita} pz</span>
                  </div>
                ))}
              </div>

              {/* Azioni */}
              <div className="flex flex-wrap items-center gap-2">
                {isBozza && (
                  <>
                    <button
                      onClick={handleConferma}
                      disabled={saving}
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {saving ? "..." : "Conferma"}
                    </button>
                    <button
                      onClick={() => setEditMode(true)}
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Modifica
                    </button>
                  </>
                )}
                <button
                  onClick={() => onExport(spedizione)}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-xs font-medium transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Elimina
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SpedizioneCard;
