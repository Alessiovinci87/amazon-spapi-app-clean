import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Plus, Link2 } from "lucide-react";
import { creaNuovaCard } from "../../utils/creaNuovaCard";

const FORMATI = ["12ML", "100ML", "5L"];
const CATEGORIE = [
  "PREPARATORI UNGHIE",
  "OLI CUTICOLE",
  "TRATTAMENTI UNGHIE",
  "SEMIPERMANENTE ONE STEP",
  "TOP / BASE COAT UV",
];

const inputClass =
  "w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder-slate-600";
const labelClass =
  "block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5";

const NuovoProdottoModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    nome: "",
    asin: "",
    sku: "",
    formato: "12ML",
    categoria: "",
    isKit: false,
  });
  const [sfusiLiberi, setSfusiLiberi] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v2/sfuso/liberi")
      .then(async (res) => {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          const listaSfusi = Array.isArray(data)
            ? data
            : Array.isArray(data.sfusiLiberi)
              ? data.sfusiLiberi
              : [];
          if (listaSfusi.length > 0) setSfusiLiberi(listaSfusi);
        } catch (err) {
          console.error("❌ Errore parsing JSON:", err);
        }
      })
      .catch((err) => console.error("❌ Errore fetch:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = await creaNuovaCard("inventario", form);
    if (data?.necessitaSfuso && data.sfusiLiberi?.length) {
      setSfusiLiberi(data.sfusiLiberi);
    } else if (data?.ok || data?.message?.includes("successo")) {
      onSuccess();
      onClose();
      setForm({ nome: "", asin: "", sku: "", formato: "12ML", categoria: "", isKit: false });
    }
    setLoading(false);
  };

  const handleAssociaSfuso = async (id_sfuso) => {
    setLoading(true);
    const payload = { ...form, id_sfuso_collegato: id_sfuso };
    try {
      const data = await creaNuovaCard("inventario", payload);
      if (data) {
        if (form.asin && id_sfuso) {
          try {
            await fetch(`/api/v2/sfuso/${id_sfuso}/asin`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ asin: form.asin }),
            });
          } catch (err) {
            console.error("❌ Errore aggiornamento asin nello sfuso:", err);
          }
        }
        if (typeof onSuccess === "function") onSuccess();
        onClose();
      } else {
        toast.error("Errore durante l'associazione dello sfuso al prodotto.");
      }
    } catch (err) {
      console.error("❌ Errore associazione sfuso:", err);
      toast.error("Errore durante la creazione del nuovo inventario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-slate-900 border border-slate-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Plus className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-0.5">Nuovo</div>
              <h2 className="text-base font-semibold text-white">Aggiungi prodotto</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body scrollabile */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form onSubmit={handleSubmit} className="space-y-4" id="nuovo-prodotto-form">
            <div>
              <label className={labelClass}>Nome prodotto *</label>
              <input
                name="nome"
                placeholder="Es. Smalto rosso 12 ml"
                value={form.nome}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>ASIN *</label>
                <input
                  name="asin"
                  placeholder="B0..."
                  value={form.asin}
                  onChange={handleChange}
                  className={`${inputClass} font-mono`}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>SKU</label>
                <input
                  name="sku"
                  placeholder="SKU interno"
                  value={form.sku}
                  onChange={handleChange}
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Formato</label>
                <select name="formato" value={form.formato} onChange={handleChange} className={inputClass}>
                  {FORMATI.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Categoria</label>
                <select name="categoria" value={form.categoria} onChange={handleChange} className={inputClass}>
                  <option value="">— seleziona —</option>
                  {CATEGORIE.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                name="isKit"
                checked={form.isKit}
                onChange={handleChange}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/30"
              />
              <span className="text-xs text-slate-300">È un kit</span>
            </label>
          </form>

          {/* Sfusi liberi */}
          {sfusiLiberi.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] uppercase tracking-[0.12em] text-amber-300 font-medium">
                  Collega uno sfuso libero
                </span>
              </div>
              <ul className="max-h-48 overflow-y-auto space-y-2 -mx-1 px-1">
                {sfusiLiberi.map((s) => (
                  <li
                    key={s.id}
                    className="flex justify-between items-center px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-white truncate">{s.nome_prodotto}</div>
                      <div className="text-[10px] text-slate-500 tabular-nums mt-0.5">
                        {s.litri_disponibili} L disponibili
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssociaSfuso(s.id)}
                      type="button"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-[11px] font-medium transition-all flex-shrink-0 ml-2"
                    >
                      <Link2 className="w-3 h-3" />
                      Collega
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="submit"
            form="nuovo-prodotto-form"
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {loading ? "Salvataggio…" : "Salva prodotto"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NuovoProdottoModal;
