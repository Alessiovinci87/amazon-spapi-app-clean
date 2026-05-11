import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  X,
  Save,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Tag,
} from "lucide-react";

const FIELD_DEFS = [
  { key: "wholesale",        label: "Wholesale",            desc: "Costo di acquisto / produzione unitario" },
  { key: "inspection",       label: "Inspection",           desc: "Costo ispezione qualità" },
  { key: "region_shipping",  label: "Region Shipping",      desc: "Spedizione regionale" },
  { key: "import_tax",       label: "Import Tax",           desc: "Dazi doganali" },
  { key: "other_costs",      label: "Other Product Costs",  desc: "Altri costi variabili" },
  { key: "inbound_shipping", label: "Inbound Shipping to Amz", desc: "Spedizione al magazzino Amazon" },
];

const EMPTY = {
  wholesale: 0,
  inspection: 0,
  region_shipping: 0,
  import_tax: 0,
  other_costs: 0,
  inbound_shipping: 0,
  tag: "",
  note: "",
};

const fmtEur = (v) =>
  v == null || isNaN(v)
    ? "€ 0,00"
    : `€ ${Number(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso.replace(" ", "T"));
    return d.toLocaleDateString("it-IT", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
};

export default function CogsModal({ row, marketplace, initialFulfillment, onClose, onSaved, onDeleted }) {
  const [fulfillment, setFulfillment] = useState(initialFulfillment || "FBA");
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);

  // Carica record COGS per (asin, marketplace, fulfillment)
  const loadCogs = useCallback(async () => {
    setLoading(true);
    setConfirmDelete(false);
    try {
      const r = await fetch(`/api/v2/cogs/${row.asin}/${marketplace}/${fulfillment}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok && j.data) {
        setExistingRecord(j.data);
        setForm({
          wholesale: j.data.wholesale ?? 0,
          inspection: j.data.inspection ?? 0,
          region_shipping: j.data.region_shipping ?? 0,
          import_tax: j.data.import_tax ?? 0,
          other_costs: j.data.other_costs ?? 0,
          inbound_shipping: j.data.inbound_shipping ?? 0,
          tag: j.data.tag ?? "",
          note: j.data.note ?? "",
        });
      } else {
        setExistingRecord(null);
        setForm(EMPTY);
      }
    } catch (e) {
      toast.error(`Errore caricamento: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [row.asin, marketplace, fulfillment]);

  useEffect(() => { loadCogs(); }, [loadCogs]);

  // Chiusura con ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total = useMemo(() => {
    return FIELD_DEFS.reduce((sum, f) => sum + (Number(form[f.key]) || 0), 0);
  }, [form]);

  const setField = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        asin: row.asin,
        marketplace_id: marketplace,
        fulfillment_type: fulfillment,
        wholesale: Number(form.wholesale) || 0,
        inspection: Number(form.inspection) || 0,
        region_shipping: Number(form.region_shipping) || 0,
        import_tax: Number(form.import_tax) || 0,
        other_costs: Number(form.other_costs) || 0,
        inbound_shipping: Number(form.inbound_shipping) || 0,
        tag: form.tag || null,
        note: form.note || null,
      };
      const r = await fetch("/api/v2/cogs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) {
        toast.error(j.error || "Errore salvataggio");
        return;
      }
      toast.success("COGS salvato");
      onSaved && onSaved(j.data);
      onClose();
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setDeleting(true);
    try {
      const r = await fetch(`/api/v2/cogs/${row.asin}/${marketplace}/${fulfillment}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) {
        toast.error(j.error || "Errore eliminazione");
        return;
      }
      toast.success("COGS eliminato");
      onDeleted && onDeleted(row.asin);
      onClose();
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start gap-4 bg-gradient-to-r from-violet-500/5 to-transparent">
          {row.immagine ? (
            <img
              src={row.immagine}
              alt=""
              className="w-16 h-16 rounded-lg object-cover bg-slate-800 border border-slate-700 flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-6 h-6 text-slate-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white truncate">{row.display_title}</h2>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-mono text-slate-400">
              <span>ASIN: {row.asin}</span>
              {row.sku && <span>SKU: {row.sku}</span>}
              <span className="text-violet-400">{marketplace}</span>
            </div>
            {existingRecord && (
              <div className="mt-1.5 text-[10px] text-slate-500">
                Ultimo aggiornamento: {fmtDate(existingRecord.updated_at)}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle FBA/FBM + Tag */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Fulfillment</span>
            <div className="inline-flex bg-slate-800/60 border border-slate-700 rounded-md p-0.5">
              {["FBA", "FBM"].map(ff => (
                <button
                  key={ff}
                  onClick={() => setFulfillment(ff)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    fulfillment === ff
                      ? "bg-violet-500/30 text-violet-100 border border-violet-500/50"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {ff}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={form.tag || ""}
              onChange={e => setField("tag", e.target.value)}
              placeholder="Tag (opzionale)"
              className="flex-1 bg-slate-800/60 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>
        </div>

        {/* Campi COGS */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento...
            </div>
          ) : (
            <div className="space-y-3">
              {FIELD_DEFS.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 font-medium">{f.label}</div>
                    <div className="text-[11px] text-slate-500">{f.desc}</div>
                  </div>
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form[f.key]}
                      onChange={e => setField(f.key, e.target.value)}
                      onFocus={e => e.target.select()}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded px-2 py-1.5 pl-6 text-sm text-white text-right tabular-nums focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>
              ))}

              {/* Totale */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="text-sm text-slate-300 font-medium">
                  Total {fulfillment} COGS
                </div>
                <div className="text-xl font-semibold text-violet-300 tabular-nums">
                  {fmtEur(total)}
                </div>
              </div>

              {/* Note */}
              <div className="mt-3">
                <label className="text-[10px] uppercase tracking-wider text-slate-500">Note</label>
                <textarea
                  value={form.note || ""}
                  onChange={e => setField("note", e.target.value)}
                  placeholder="Note interne (opzionale)"
                  rows={2}
                  className="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer azioni */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <div>
            {existingRecord && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
                  confirmDelete
                    ? "bg-rose-500/30 hover:bg-rose-500/40 border border-rose-500/60 text-rose-200"
                    : "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300"
                } disabled:opacity-50`}
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {confirmDelete ? "Conferma elimina" : "Delete"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-medium transition-all"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-1.5 rounded-md bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/50 text-violet-200 text-xs font-medium transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
