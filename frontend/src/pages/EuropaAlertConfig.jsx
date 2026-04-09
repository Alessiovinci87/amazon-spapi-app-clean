import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Bell,
  LogOut,
  Loader,
} from "lucide-react";
import { toast } from "sonner";

const TIPI = [
  { value: "STOCK_LOW",       label: "Stock sotto soglia",  desc: "Scatta quando le unità FBA scendono sotto il valore impostato" },
  { value: "BUYBOX_LOST",     label: "Buy Box persa",       desc: "Scatta quando perdi la Buy Box su un marketplace" },
  { value: "LISTING_CHANGED", label: "Listing modificato",  desc: "Scatta se titolo o prezzo vengono modificati" },
];

const MARKETPLACES = [
  { id: null,              label: "Tutti i marketplace" },
  { id: "APJ6JRA9NG5V4",  label: "🇮🇹 Italia" },
  { id: "A13V1IB3VIYZZH", label: "🇫🇷 Francia" },
  { id: "A1PA6795UKMFR9", label: "🇩🇪 Germania" },
  { id: "A1RKKUPIHCS9HS", label: "🇪🇸 Spagna" },
  { id: "A1F83G8C2ARO7P", label: "🇬🇧 UK" },
  { id: "A1805IZSGTT6HS", label: "🇳🇱 Paesi Bassi" },
  { id: "AMEN7PMS3EDWL",  label: "🇧🇪 Belgio" },
  { id: "A2NODRKZP88ZB9", label: "🇸🇪 Svezia" },
  { id: "A1C3SOZRARQ6R3", label: "🇵🇱 Polonia" },
];

const DEFAULT_FORM = { tipo: "STOCK_LOW", marketplace_id: null, soglia: 10, abilitato: true };

const inputClass =
  "w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all";
const labelClass =
  "block text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5";

// === Toggle compatto ===
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 border ${
        checked
          ? "bg-amber-500/30 border-amber-500/60"
          : "bg-slate-800 border-slate-700"
      }`}
    >
      <div
        className={`absolute top-[2px] w-3.5 h-3.5 rounded-full transition-all ${
          checked ? "left-[18px] bg-amber-300" : "left-[2px] bg-slate-500"
        }`}
      />
    </button>
  );
}

// === SectionCard ===
const SECTION_ACCENTS = {
  amber:  { bar: "bg-amber-400",  icon: "text-amber-400",  bgIcon: "bg-amber-500/10 border-amber-500/30" },
  violet: { bar: "bg-violet-400", icon: "text-violet-400", bgIcon: "bg-violet-500/10 border-violet-500/30" },
};

function SectionCard({ accent, eyebrow, title, icon: Icon, children }) {
  const a = SECTION_ACCENTS[accent] ?? SECTION_ACCENTS.amber;
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar}/60`} />
      <div className="px-5 sm:px-6 py-5">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-8 h-8 rounded-md border ${a.bgIcon} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${a.icon}`} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">
              {eyebrow}
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-tight">{title}</h2>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

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
    if (!window.confirm("Eliminare questa regola?")) return;
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
  const tipoCorrente = TIPI.find(t => t.value === form.tipo);

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

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/europe/dashboard")}
              type="button"
              title="Indietro"
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <Bell className="w-[18px] h-[18px] text-amber-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Configura Alert</span>
              <span
                className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1 font-mono cursor-pointer hover:text-slate-300 transition-colors"
                onClick={() => navigator.clipboard.writeText(asin)}
                title="Clicca per copiare"
              >
                {asin}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-amber-400 font-medium">
                {rules.filter(r => r.abilitato).length} attive
              </span>
            </div>
            <button
              onClick={() => navigate("/europe/dashboard")}
              type="button"
              title="Esci"
              className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* === Hero compatto === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
            Alert Europa
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Regole alert <span className="text-slate-500">— per ASIN.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Configura le condizioni che fanno scattare gli alert per questo prodotto su uno o più marketplace.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <div className="relative flex-1 px-6 sm:px-10 lg:px-16 py-4 pb-12">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* === Aggiungi regola === */}
          <SectionCard accent="amber" eyebrow="Nuova regola" title="Aggiungi una condizione" icon={Plus}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Tipo alert</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className={inputClass}
                >
                  {TIPI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {tipoCorrente && (
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{tipoCorrente.desc}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Marketplace</label>
                <select
                  value={form.marketplace_id ?? ""}
                  onChange={e => setForm(f => ({ ...f, marketplace_id: e.target.value || null }))}
                  className={inputClass}
                >
                  {MARKETPLACES.map(m => (
                    <option key={m.id ?? "all"} value={m.id ?? ""}>{m.label}</option>
                  ))}
                </select>
              </div>

              {form.tipo === "STOCK_LOW" ? (
                <div>
                  <label className={labelClass}>Soglia unità (alert se ≤)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.soglia}
                    onChange={e => setForm(f => ({ ...f, soglia: e.target.value }))}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <Toggle
                  checked={form.abilitato}
                  onChange={() => setForm(f => ({ ...f, abilitato: !f.abilitato }))}
                />
                <span className="text-xs text-slate-300">Attiva subito</span>
              </label>
              <button
                onClick={salvaRegola}
                disabled={saving}
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Salvataggio…" : "Salva regola"}
              </button>
            </div>
          </SectionCard>

          {/* === Regole esistenti === */}
          <SectionCard accent="violet" eyebrow="Configurate" title="Regole attive" icon={Bell}>
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader className="w-4 h-4 text-violet-400 animate-spin" />
                <span className="text-sm text-slate-500">Caricamento…</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                <p className="text-sm text-slate-500">Nessuna regola configurata per questo ASIN.</p>
                <p className="text-xs text-slate-600 mt-1">Aggiungi una regola sopra per iniziare.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => {
                  const tipoInfo = TIPI.find(t => t.value === rule.tipo);
                  const active = !!rule.abilitato;
                  return (
                    <div
                      key={rule.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-md border transition-all ${
                        active
                          ? "bg-slate-950/40 border-slate-800"
                          : "bg-slate-950/20 border-slate-800/60 opacity-60"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {tipoInfo?.label ?? rule.tipo}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                            {marketplaceLabel(rule.marketplace_id)}
                          </span>
                        </div>
                      </div>

                      {/* Soglia editabile inline */}
                      {rule.tipo === "STOCK_LOW" && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[11px] text-slate-600">≤</span>
                          <input
                            type="number"
                            min={0}
                            defaultValue={rule.soglia}
                            onBlur={e => aggiornaSoglia(rule, e.target.value)}
                            className="w-16 px-2 py-1 rounded bg-slate-950/60 border border-slate-800 text-white text-xs text-center tabular-nums focus:outline-none focus:border-amber-500/50"
                          />
                          <span className="text-[11px] text-slate-600">unità</span>
                        </div>
                      )}

                      <Toggle checked={active} onChange={() => toggleRegola(rule)} />

                      <button
                        onClick={() => eliminaRegola(rule.id)}
                        type="button"
                        title="Elimina regola"
                        className="w-8 h-8 rounded-md border border-slate-800 bg-slate-900 hover:bg-rose-500/10 hover:border-rose-500/40 text-slate-500 hover:text-rose-400 transition-colors flex items-center justify-center flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Alert config</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
}
