import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

const MARKETPLACE_IDS = [
  { id: null,              key: "mp_all" },
  { id: "APJ6JRA9NG5V4",   key: "mp_it" },
  { id: "A13V1IB3VIYZZH",  key: "mp_fr" },
  { id: "A1PA6795UKMFR9",  key: "mp_de" },
  { id: "A1RKKUPIHCS9HS",  key: "mp_es" },
  { id: "A1F83G8C2ARO7P",  key: "mp_uk" },
  { id: "A1805IZSGTT6HS",  key: "mp_nl" },
  { id: "AMEN7PMS3EDWL",   key: "mp_be" },
  { id: "A2NODRKZP88ZB9",  key: "mp_se" },
  { id: "A1C3SOZRARQ6R3",  key: "mp_pl" },
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
  const { t } = useTranslation();
  const { asin } = useParams();
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const TIPI = [
    { value: "STOCK_LOW",       label: t("europaAlertConfig.tipo_stock_low_label"),       desc: t("europaAlertConfig.tipo_stock_low_desc") },
    { value: "BUYBOX_LOST",     label: t("europaAlertConfig.tipo_buybox_lost_label"),     desc: t("europaAlertConfig.tipo_buybox_lost_desc") },
    { value: "LISTING_CHANGED", label: t("europaAlertConfig.tipo_listing_changed_label"), desc: t("europaAlertConfig.tipo_listing_changed_desc") },
  ];

  const MARKETPLACES = MARKETPLACE_IDS.map(m => ({ id: m.id, label: t(`europaAlertConfig.${m.key}`) }));

  async function caricaRegole() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/europa/alert-rules?asin=${asin}`);
      setRules(await res.json());
    } catch {
      toast.error(t("europaAlertConfig.toast_err_load"));
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
      toast.success(t("europaAlertConfig.toast_rule_saved"));
      setForm(DEFAULT_FORM);
      await caricaRegole();
    } catch (err) {
      toast.error(`${t("common.error")}: ${err.message}`);
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
      toast.error(t("europaAlertConfig.toast_err_update_rule"));
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
      toast.error(t("europaAlertConfig.toast_err_update_soglia"));
    }
  }

  async function eliminaRegola(id) {
    if (!window.confirm(t("europaAlertConfig.confirm_delete"))) return;
    try {
      await fetch(`/api/v2/europa/alert-rules/${id}`, { method: "DELETE" });
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success(t("europaAlertConfig.toast_rule_deleted"));
    } catch {
      toast.error(t("europaAlertConfig.toast_err_delete"));
    }
  }

  useEffect(() => { caricaRegole(); }, [asin]);

  const marketplaceLabel = (id) => MARKETPLACES.find(m => m.id === id)?.label ?? id ?? t("common.tutti");
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
              title={t("common.back")}
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <Bell className="w-[18px] h-[18px] text-amber-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">{t("europaAlertConfig.topbar_title")}</span>
              <span
                className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1 font-mono cursor-pointer hover:text-slate-300 transition-colors"
                onClick={() => navigator.clipboard.writeText(asin)}
                title={t("europaAlertConfig.title_copy")}
              >
                {asin}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-amber-400 font-medium">
                {t("europaAlertConfig.badge_attive", { n: rules.filter(r => r.abilitato).length })}
              </span>
            </div>
            <button
              onClick={() => navigate("/europe/dashboard")}
              type="button"
              title={t("common.logout")}
              className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      {/* === Hero compatto === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
            {t("europaAlertConfig.hero_eyebrow")}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("europaAlertConfig.hero_title_main")} <span className="text-slate-500">{t("europaAlertConfig.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("europaAlertConfig.hero_desc")}
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <div className="relative flex-1 px-6 sm:px-10 lg:px-16 py-4 pb-12">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* === Aggiungi regola === */}
          <SectionCard accent="amber" eyebrow={t("europaAlertConfig.new_rule_eyebrow")} title={t("europaAlertConfig.new_rule_title")} icon={Plus}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>{t("europaAlertConfig.lbl_tipo")}</label>
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
                <label className={labelClass}>{t("europaAlertConfig.lbl_marketplace")}</label>
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
                  <label className={labelClass}>{t("europaAlertConfig.lbl_soglia")}</label>
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
                <span className="text-xs text-slate-300">{t("europaAlertConfig.attiva_subito")}</span>
              </label>
              <button
                onClick={salvaRegola}
                disabled={saving}
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? t("europaAlertConfig.btn_saving") : t("europaAlertConfig.btn_save_rule")}
              </button>
            </div>
          </SectionCard>

          {/* === Regole esistenti === */}
          <SectionCard accent="violet" eyebrow={t("europaAlertConfig.rules_eyebrow")} title={t("europaAlertConfig.rules_title")} icon={Bell}>
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader className="w-4 h-4 text-violet-400 animate-spin" />
                <span className="text-sm text-slate-500">{t("common.loading")}</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                <p className="text-sm text-slate-500">{t("europaAlertConfig.empty_rules")}</p>
                <p className="text-xs text-slate-600 mt-1">{t("europaAlertConfig.empty_rules_hint")}</p>
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
                          <span className="text-[11px] text-slate-600">{t("europaAlertConfig.unita")}</span>
                        </div>
                      )}

                      <Toggle checked={active} onChange={() => toggleRegola(rule)} />

                      <button
                        onClick={() => eliminaRegola(rule.id)}
                        type="button"
                        title={t("europaAlertConfig.title_delete_rule")}
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
          <span>© {new Date().getFullYear()} {t("europaAlertConfig.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
}
