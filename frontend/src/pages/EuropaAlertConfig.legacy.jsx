import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Bell } from "lucide-react";
import { toast } from "sonner";

const TIPI = [
  { value: "STOCK_LOW",       label: "Stock sotto soglia",   desc: "Scatta quando le unità FBA scendono sotto il valore impostato" },
  { value: "BUYBOX_LOST",     label: "Buy Box persa",        desc: "Scatta quando perdi la Buy Box su un marketplace" },
  { value: "LISTING_CHANGED", label: "Listing modificato",   desc: "Scatta se titolo o prezzo vengono modificati" },
];

const MARKETPLACES = [
  { id: null,                label: "Tutti i marketplace" },
  { id: "APJ6JRA9NG5V4",    label: "🇮🇹 Italia" },
  { id: "A13V1IB3VIYZZH",   label: "🇫🇷 Francia" },
  { id: "A1PA6795UKMFR9",   label: "🇩🇪 Germania" },
  { id: "A1RKKUPIHCS9HS",   label: "🇪🇸 Spagna" },
  { id: "A1F83G8C2ARO7P",   label: "🇬🇧 UK" },
  { id: "A1805IZSGTT6HS",   label: "🇳🇱 Paesi Bassi" },
  { id: "AMEN7PMS3EDWL",    label: "🇧🇪 Belgio" },
  { id: "A2NODRKZP88ZB9",   label: "🇸🇪 Svezia" },
  { id: "A1C3SOZRARQ6R3",   label: "🇵🇱 Polonia" },
];

const DEFAULT_FORM = { tipo: "STOCK_LOW", marketplace_id: null, soglia: 10, abilitato: true };

export default function EuropaAlertConfig() {
  const { asin } = useParams();
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  async function caricaRegole() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/europa/alert-rules?asin=${asin}`);
      setRules(await res.json());
    } catch {
      toast.error("Errore caricamento regole");
    } finally {
      setLoading(false);
    }
  }

  async function salvaRegola() {
    setSaving(true);
    try {
      const body = {
        asin,
        tipo: form.tipo,
        marketplace_id: form.marketplace_id || null,
        soglia: Number(form.soglia),
        abilitato: form.abilitato ? 1 : 0,
      };
      const res = await fetch("/api/v2/europa/alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Regola salvata");
      setForm(DEFAULT_FORM);
      await caricaRegole();
    } catch (err) {
      toast.error(`Errore: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleRegola(rule) {
    try {
      await fetch(`/api/v2/europa/alert-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abilitato: rule.abilitato ? 0 : 1 }),
      });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, abilitato: r.abilitato ? 0 : 1 } : r));
    } catch {
      toast.error("Errore aggiornamento regola");
    }
  }

  async function aggiornaSoglia(rule, nuovaSoglia) {
    try {
      await fetch(`/api/v2/europa/alert-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soglia: Number(nuovaSoglia) }),
      });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, soglia: Number(nuovaSoglia) } : r));
    } catch {
      toast.error("Errore aggiornamento soglia");
    }
  }

  async function eliminaRegola(id) {
    try {
      await fetch(`/api/v2/europa/alert-rules/${id}`, { method: "DELETE" });
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success("Regola eliminata");
    } catch {
      toast.error("Errore eliminazione");
    }
  }

  useEffect(() => { caricaRegole(); }, [asin]);

  const marketplaceLabel = (id) => MARKETPLACES.find(m => m.id === id)?.label ?? id ?? "Tutti";

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Configura Alert</h1>
                <p className="text-zinc-500 text-sm font-mono">{asin}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>
          </div>
        </div>

        {/* Aggiungi nuova regola */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Aggiungi regola
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Tipo alert</label>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {TIPI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <p className="text-xs text-zinc-600 mt-1">{TIPI.find(t => t.value === form.tipo)?.desc}</p>
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Marketplace</label>
              <select
                value={form.marketplace_id ?? ""}
                onChange={e => setForm(f => ({ ...f, marketplace_id: e.target.value || null }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {MARKETPLACES.map(m => (
                  <option key={m.id ?? "all"} value={m.id ?? ""}>{m.label}</option>
                ))}
              </select>
            </div>

            {form.tipo === "STOCK_LOW" && (
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Soglia unità (alert se ≤ X)</label>
                <input
                  type="number"
                  min={0}
                  value={form.soglia}
                  onChange={e => setForm(f => ({ ...f, soglia: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, abilitato: !f.abilitato }))}
                  className={`w-10 h-6 rounded-full transition-all relative ${form.abilitato ? "bg-blue-600" : "bg-zinc-700"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.abilitato ? "left-5" : "left-1"}`} />
                </div>
                <span className="text-sm text-zinc-300">Attiva subito</span>
              </label>
            </div>
          </div>

          <button
            onClick={salvaRegola}
            disabled={saving}
            className="mt-4 flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm font-medium transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvataggio…" : "Salva regola"}
          </button>
        </div>

        {/* Regole esistenti */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Regole configurate</h2>
          {loading ? (
            <p className="text-zinc-500 text-sm animate-pulse">Caricamento…</p>
          ) : rules.length === 0 ? (
            <p className="text-zinc-500 text-sm">Nessuna regola configurata per questo ASIN.</p>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => {
                const tipoInfo = TIPI.find(t => t.value === rule.tipo);
                return (
                  <div key={rule.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${rule.abilitato ? "bg-zinc-800/50 border-zinc-700" : "bg-zinc-900 border-zinc-800 opacity-60"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{tipoInfo?.label ?? rule.tipo}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded-full text-zinc-400">
                          {marketplaceLabel(rule.marketplace_id)}
                        </span>
                        {rule.tipo === "STOCK_LOW" && (
                          <span className="text-xs text-zinc-500">soglia: </span>
                        )}
                      </div>
                    </div>

                    {/* Soglia modificabile inline */}
                    {rule.tipo === "STOCK_LOW" && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500">≤</span>
                        <input
                          type="number"
                          min={0}
                          defaultValue={rule.soglia}
                          onBlur={e => aggiornaSoglia(rule, e.target.value)}
                          className="w-16 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-xs text-zinc-500">unità</span>
                      </div>
                    )}

                    {/* Toggle attivo/disattivo */}
                    <button
                      onClick={() => toggleRegola(rule)}
                      className={`w-10 h-6 rounded-full transition-all relative flex-shrink-0 ${rule.abilitato ? "bg-blue-600" : "bg-zinc-700"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${rule.abilitato ? "left-5" : "left-1"}`} />
                    </button>

                    {/* Elimina */}
                    <button
                      onClick={() => eliminaRegola(rule.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
