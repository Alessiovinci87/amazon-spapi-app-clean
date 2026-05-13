import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, Plus, RefreshCw, Trash2, ChevronRight, AlertCircle, Package, X, Search, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import PageTopBar from "../components/PageTopBar";

const STEPS = [
  { id: "items", label: "1. Articoli" },
  { id: "packing", label: "2. Pacchi" },
  { id: "placement", label: "3. Centro" },
  { id: "transport", label: "4. Trasporto" },
  { id: "delivery", label: "5. Consegna" },
  { id: "labels", label: "6. Etichette" },
  { id: "done", label: "Spedita" },
];

const STATUS_BADGE = {
  DRAFT: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  PLAN_CREATED: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  PACKING_CONFIRMED: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  PLACEMENT_CONFIRMED: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  TRANSPORT_CONFIRMED: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  DELIVERY_CONFIRMED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  VOIDED: "bg-rose-500/20 text-rose-300 border-rose-500/40",
};

const MARKETPLACES = [
  { id: "APJ6JRA9NG5V4", label: "Italia (IT)" },
  { id: "A1RKKUPIHCS9HS", label: "Spagna (ES)" },
  { id: "A13V1IB3VIYZZH", label: "Francia (FR)" },
  { id: "A1PA6795UKMFR9", label: "Germania (DE)" },
  { id: "A1805IZSGTT6HS", label: "Olanda (NL)" },
  { id: "A1F83G8C2ARO7P", label: "UK" },
];

const DEFAULT_SOURCE = {
  name: "Pics Srl",
  addressLine1: "Via dei Fabbri snc",
  city: "Alghero",
  stateOrProvinceCode: "SS",
  postalCode: "07041",
  countryCode: "IT",
  email: "info@picsnails.com",
  phoneNumber: "",
  companyName: "Pics Srl",
};

const inputCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60";
const labelCls = "text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block";

function newItemId() {
  return `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SpedizioneAmazon() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [testMode, setTestMode] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/v2/inbound/plans");
      setPlans(await r.json());
    } catch (err) {
      toast.error("Errore nel caricamento dei piani inbound");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    fetch("/api/v2/inbound/config")
      .then((r) => r.json())
      .then((d) => setTestMode(!!d.testMode))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PageTopBar icon={Send} iconAccent="emerald" eyebrow="Operazioni" title="Spedizione ad Amazon FBA" />

      <main className="px-6 sm:px-10 lg:px-16 py-8 space-y-6">
        {testMode && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="text-amber-300 font-semibold uppercase tracking-wider">Modalità Test attiva</span>
              <span className="text-amber-200/80 ml-2">Nessuna chiamata reale ad Amazon. Le risposte sono mock per test UI.</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">Piani spedizione</h2>
          <div className="flex gap-2">
            <button
              onClick={loadPlans}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuovo piano
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
          {plans.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Nessun piano spedizione creato ancora. Clicca <span className="text-emerald-400">+ Nuovo piano</span> per iniziare.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 border-b border-slate-800">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Marketplace</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Step corrente</th>
                  <th className="px-4 py-3">Creato</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{p.id}</td>
                    <td className="px-4 py-3">{p.name || <span className="text-slate-500">—</span>}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.marketplace_id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-medium border ${
                          STATUS_BADGE[p.status] || "bg-slate-700/40 text-slate-300 border-slate-600"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {STEPS.find((s) => s.id === p.current_step)?.label || p.current_step}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.created_at}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/uffici/spedizione-amazon/${p.id}`)}
                          className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 text-xs"
                        >
                          Apri <ChevronRight className="w-3 h-3" />
                        </button>
                        {p.status === "DRAFT" && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Eliminare piano #${p.id}?`)) return;
                              await fetch(`/api/v2/inbound/plans/${p.id}`, { method: "DELETE" });
                              loadPlans();
                            }}
                            className="text-rose-400 hover:text-rose-300 p-1"
                            title="Elimina bozza"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showCreate && (
        <CreatePlanModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadPlans();
          }}
        />
      )}
    </div>
  );
}

function CreatePlanModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [marketplaceId, setMarketplaceId] = useState(MARKETPLACES[0].id);
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [items, setItems] = useState([{ _id: newItemId(), msku: "", asin: "", quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  // Catalogo prodotti per autocomplete
  const [prodotti, setProdotti] = useState([]);
  useEffect(() => {
    fetch("/api/v2/magazzino")
      .then((r) => r.json())
      .then((j) => setProdotti(j?.data || []))
      .catch(() => {});
  }, []);

  const addRow = () =>
    setItems((prev) => [...prev, { _id: newItemId(), msku: "", asin: "", quantity: 1 }]);
  const removeRow = (id) => setItems((prev) => prev.filter((it) => it._id !== id));
  const updateRow = (id, patch) =>
    setItems((prev) => prev.map((it) => (it._id === id ? { ...it, ...patch } : it)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanItems = items
      .filter((it) => it.msku && it.quantity > 0)
      .map((it) => ({ asin: it.asin || null, msku: it.msku, quantity: Number(it.quantity) }));
    if (cleanItems.length === 0) return toast.error("Aggiungi almeno una riga valida (SKU + qta)");
    if (!source.addressLine1 || !source.city) return toast.error("Indirizzo origine incompleto");

    setSubmitting(true);
    try {
      const r1 = await fetch("/api/v2/inbound/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, marketplaceId, sourceAddress: source, items: cleanItems }),
      });
      if (!r1.ok) {
        const err = await r1.json().catch(() => ({}));
        throw new Error(err.error || "Errore creazione bozza");
      }
      const { id: planId } = await r1.json();
      toast.success(`Bozza piano #${planId} salvata`);

      const r2 = await fetch(`/api/v2/inbound/plans/${planId}/create-on-amazon`, { method: "POST" });
      const out = await r2.json();
      if (!r2.ok) {
        toast.warning("Bozza salvata, ma Amazon ha risposto con errore", { description: out.error });
      } else {
        toast.success(`Piano creato su Amazon (${out.amazonPlanId})`);
      }
      onCreated();
    } catch (err) {
      toast.error(err.message || "Errore generico");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Nuovo piano spedizione FBA
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Anagrafica piano */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nome piano (opzionale)</label>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Rifornimento IT marzo"
              />
            </div>
            <div>
              <label className={labelCls}>Marketplace di destinazione</label>
              <select
                className={inputCls}
                value={marketplaceId}
                onChange={(e) => setMarketplaceId(e.target.value)}
              >
                {MARKETPLACES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Indirizzo origine */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.16em] text-slate-500 mb-3">Indirizzo di origine</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Ragione sociale</label>
                <input
                  className={inputCls}
                  value={source.name}
                  onChange={(e) => setSource({ ...source, name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Indirizzo</label>
                <input
                  className={inputCls}
                  value={source.addressLine1}
                  onChange={(e) => setSource({ ...source, addressLine1: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Città</label>
                <input
                  className={inputCls}
                  value={source.city}
                  onChange={(e) => setSource({ ...source, city: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Provincia</label>
                  <input
                    className={inputCls}
                    value={source.stateOrProvinceCode}
                    onChange={(e) => setSource({ ...source, stateOrProvinceCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>CAP</label>
                  <input
                    className={inputCls}
                    value={source.postalCode}
                    onChange={(e) => setSource({ ...source, postalCode: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Paese (ISO 2)</label>
                <input
                  className={inputCls}
                  value={source.countryCode}
                  onChange={(e) => setSource({ ...source, countryCode: e.target.value.toUpperCase() })}
                  maxLength={2}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  className={inputCls}
                  value={source.email}
                  onChange={(e) => setSource({ ...source, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Articoli */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs uppercase tracking-[0.16em] text-slate-500">Articoli da spedire</h4>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-3.5 h-3.5" />
                Aggiungi riga
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <ItemRow
                  key={it._id}
                  item={it}
                  prodotti={prodotti}
                  onChange={(patch) => updateRow(it._id, patch)}
                  onRemove={() => removeRow(it._id)}
                  canRemove={items.length > 1}
                />
              ))}
            </div>
          </div>

          {/* Azioni */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium text-slate-300 hover:text-white"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Crea piano su Amazon
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ItemRow({ item, prodotti, onChange, onRemove, canRemove }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState(item.msku || "");

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return prodotti
      .filter(
        (p) =>
          (p.sku || "").toLowerCase().includes(q) ||
          (p.asin || "").toLowerCase().includes(q) ||
          (p.nome || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [search, prodotti]);

  const pick = (p) => {
    setSearch(p.sku || p.asin);
    onChange({ msku: p.sku || p.asin, asin: p.asin });
    setShowDropdown(false);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-7 relative">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className={`${inputCls} pl-8`}
            placeholder="Cerca SKU / ASIN / nome…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onChange({ msku: e.target.value });
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
        </div>
        {showDropdown && matches.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {matches.map((p) => (
              <button
                key={p.asin}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs border-b border-slate-800 last:border-0"
              >
                <div className="text-white font-medium truncate">{p.nome || p.asin}</div>
                <div className="text-slate-500 font-mono text-[10px] mt-0.5">
                  SKU: {p.sku || "—"} · ASIN: {p.asin}
                </div>
              </button>
            ))}
          </div>
        )}
        {item.asin && (
          <div className="text-[10px] text-slate-500 mt-1 font-mono">ASIN: {item.asin}</div>
        )}
      </div>
      <div className="col-span-3">
        <input
          type="number"
          min="1"
          className={inputCls}
          placeholder="Q.tà"
          value={item.quantity}
          onChange={(e) => onChange({ quantity: e.target.value })}
        />
      </div>
      <div className="col-span-2 flex justify-end">
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-rose-400 hover:text-rose-300"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
