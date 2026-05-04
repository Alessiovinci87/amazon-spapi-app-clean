import React, { useState } from "react";
import { Plus, X, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import AccessorioCard from "./AccessorioCard.jsx";

// === Modale creazione nuovo accessorio ===
const NuovoAccessorioModal = ({ onClose, onCreated }) => {
  const [nome, setNome] = useState("");
  const [asin, setAsin] = useState("");
  const [quantita, setQuantita] = useState("0");
  const [soglia, setSoglia] = useState("0");
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  // Auto-genera ASIN dal nome se l'utente non l'ha modificato manualmente
  const [asinManual, setAsinManual] = useState(false);
  const onChangeNome = (v) => {
    setNome(v);
    if (!asinManual) {
      setAsin(v.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_-]/g, ""));
    }
  };

  const submit = async () => {
    if (!nome.trim()) { setErrore("Il nome è obbligatorio"); return; }
    if (!asin.trim()) { setErrore("Il codice/ASIN è obbligatorio"); return; }
    setErrore("");
    setLoading(true);
    try {
      const token = localStorage.getItem("nexus_token");
      const res = await fetch("/api/v2/accessori", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          asin_accessorio: asin,
          nome,
          quantita: Number(quantita) || 0,
          soglia_minima: Number(soglia) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Errore (HTTP ${res.status})`);
      toast.success(`Accessorio "${data.data?.nome || nome}" creato`);
      onCreated?.();
      onClose();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="relative bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1">Inventario</div>
            <h2 className="text-base font-semibold text-white">Nuovo accessorio</h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
              Nome accessorio
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => onChangeNome(e.target.value)}
              placeholder="Es. Boccetta 50ml"
              className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
              Codice / ASIN <span className="text-slate-600 normal-case tracking-normal">(auto-generato dal nome)</span>
            </label>
            <input
              type="text"
              value={asin}
              onChange={(e) => { setAsin(e.target.value.toUpperCase()); setAsinManual(true); }}
              placeholder="Es. BOCCETTA_50_ML"
              className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
            <p className="text-[10px] text-slate-600 mt-1">Univoco, solo lettere/numeri/underscore. Non modificabile dopo la creazione.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                Quantità iniziale
              </label>
              <input
                type="number"
                min="0"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm tabular-nums focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                Soglia minima
              </label>
              <input
                type="number"
                min="0"
                value={soglia}
                onChange={(e) => setSoglia(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm tabular-nums focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          {errore && (
            <div className="px-3 py-2 rounded-md bg-rose-500/5 border border-rose-500/30">
              <p className="text-xs text-rose-300">{errore}</p>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            Dopo la creazione potrai caricare l'immagine direttamente sulla card.
          </p>
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
            onClick={submit}
            type="button"
            disabled={loading || !nome.trim() || !asin.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all disabled:opacity-50"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            {loading ? "Creazione…" : "Crea accessorio"}
          </button>
        </div>
      </div>
    </div>
  );
};

const InventarioAccessori = ({
  accessori,
  setMostraStoricoAsin,
  fetchAccessori,
  search,
}) => {
  const [showNuovo, setShowNuovo] = useState(false);

  const testo = search?.toLowerCase().trim() || "";

  const filtrati = accessori.filter(
    (a) =>
      !testo ||
      a.nome?.toLowerCase().includes(testo) ||
      a.asin_accessorio?.toLowerCase()?.includes(testo)
  );

  return (
    <div className="space-y-4">
      {/* Toolbar: pulsante creazione */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {filtrati.length} {filtrati.length === 1 ? "accessorio" : "accessori"}
          {testo && ` corrispondenti a "${testo}"`}
        </p>
        <button
          type="button"
          onClick={() => setShowNuovo(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuovo accessorio
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filtrati.map((a) => (
          <AccessorioCard
            key={a.asin_accessorio}
            asin_accessorio={a.asin_accessorio}
            nome={a.nome}
            quantita={a.quantita}
            soglia_minima={a.soglia_minima}
            immagine={a.immagine}
            setMostraStoricoAsin={setMostraStoricoAsin}
            fetchAccessori={fetchAccessori}
          />
        ))}
      </div>

      {showNuovo && (
        <NuovoAccessorioModal
          onClose={() => setShowNuovo(false)}
          onCreated={() => fetchAccessori?.()}
        />
      )}
    </div>
  );
};

export default InventarioAccessori;
