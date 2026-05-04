import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES } from "../i18n";
import {
  ArrowLeft,
  Settings2,
  Moon,
  Sun,
  Check,
  Info,
  Monitor,
  Users,
  Plus,
  Shield,
  ShieldCheck,
  Warehouse,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  Trash2,
  Languages,
} from "lucide-react";

const RUOLO_ICON = { admin: ShieldCheck, ufficio: Shield, magazzino: Warehouse };
const RUOLO_COLOR = {
  admin:     "text-rose-400 bg-rose-500/10 border-rose-500/30",
  ufficio:   "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  magazzino: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

const Settings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user: currentUser } = useAuth();
  const access = localStorage.getItem("auth") || "amazon";
  const backPath = access === "magazzino" ? "/magazzino" : "/dashboard";

  // === Gestione utenti ===
  const [utenti, setUtenti] = useState([]);
  const [loadingUtenti, setLoadingUtenti] = useState(false);
  const [showNuovo, setShowNuovo] = useState(false);
  const [nuovoForm, setNuovoForm] = useState({ username: "", password: "", ruolo: "magazzino", nome: "" });
  const [resetPwId, setResetPwId] = useState(null);
  const [resetPwVal, setResetPwVal] = useState("");
  const isAdmin = currentUser?.ruolo === "admin";

  const fetchUtenti = async () => {
    if (!isAdmin) return;
    setLoadingUtenti(true);
    try {
      const res = await fetch("/api/v2/auth-app/utenti");
      if (!res.ok) return;
      const data = await res.json();
      setUtenti(data.utenti || []);
    } catch { /* silent */ }
    finally { setLoadingUtenti(false); }
  };

  useEffect(() => { fetchUtenti(); }, [isAdmin]);

  const creaNuovoUtente = async () => {
    if (!nuovoForm.username || !nuovoForm.password) { toast.info(t("settings.users.msg_user_credentials_required")); return; }
    try {
      const res = await fetch("/api/v2/auth-app/utenti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuovoForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(t("settings.users.msg_user_created", { username: nuovoForm.username }));
      setNuovoForm({ username: "", password: "", ruolo: "magazzino", nome: "" });
      setShowNuovo(false);
      fetchUtenti();
    } catch (e) { toast.error(e.message); }
  };

  const toggleAttivo = async (id, attivo) => {
    try {
      const res = await fetch(`/api/v2/auth-app/utenti/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attivo: !attivo }),
      });
      if (!res.ok) throw new Error();
      fetchUtenti();
    } catch { toast.error(t("settings.users.msg_error_update")); }
  };

  const cambiaRuolo = async (id, ruolo) => {
    try {
      const res = await fetch(`/api/v2/auth-app/utenti/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruolo }),
      });
      if (!res.ok) throw new Error();
      fetchUtenti();
    } catch { toast.error(t("settings.users.msg_error_role")); }
  };

  const resetPassword = async (id) => {
    if (!resetPwVal || resetPwVal.length < 4) { toast.info(t("settings.users.msg_password_min_length")); return; }
    try {
      const res = await fetch(`/api/v2/auth-app/utenti/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nuovaPassword: resetPwVal }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("settings.users.msg_password_reset"));
      setResetPwId(null);
      setResetPwVal("");
    } catch { toast.error(t("settings.users.msg_error_reset")); }
  };

  const eliminaUtente = async (id, username) => {
    if (!window.confirm(`Eliminare definitivamente l'utente "${username}"? L'operazione non è reversibile.`)) return;
    try {
      const res = await fetch(`/api/v2/auth-app/utenti/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Errore");
      toast.success(`Utente "${username}" eliminato`);
      fetchUtenti();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Grid */}
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
              onClick={() => navigate(backPath)}
              type="button"
              title={t("common.back")}
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-indigo-500/10 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
              <Settings2 className="w-[18px] h-[18px] text-indigo-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">
                {t("settings.title")}
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">
                {t("settings.topbar_eyebrow")}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
            {t("settings.page_eyebrow")}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("settings.title")}{" "}
            <span className="text-slate-500">— {t("settings.subtitle")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("settings.intro")}
          </p>
        </div>
      </section>

      {/* === Content === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-8">
        {/* ────────── TEMA ────────── */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-indigo-500/10 border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Monitor className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">
                  {t("settings.theme.section_eyebrow")}
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  {t("settings.theme.title")}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dark Theme Card */}
              <button
                onClick={() => setTheme("dark")}
                type="button"
                className={`relative rounded-lg border-2 p-4 transition-all text-left ${
                  theme === "dark"
                    ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                    : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
                }`}
              >
                {theme === "dark" && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                {/* Mini preview */}
                <div className="w-full h-24 rounded-md bg-slate-950 border border-slate-700 mb-3 overflow-hidden relative">
                  <div
                    className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                      backgroundSize: "12px 12px",
                    }}
                  />
                  <div className="absolute top-2 left-2 right-2 h-2 rounded-sm bg-slate-800" />
                  <div className="absolute top-6 left-2 w-16 h-8 rounded-sm bg-slate-800/80 border border-slate-700" />
                  <div className="absolute top-6 left-20 w-16 h-8 rounded-sm bg-slate-800/80 border border-slate-700" />
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">{t("settings.theme.dark_label")}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {t("settings.theme.dark_desc")}
                </p>
              </button>

              {/* Light Theme Card */}
              <button
                onClick={() => setTheme("light")}
                type="button"
                className={`relative rounded-lg border-2 p-4 transition-all text-left ${
                  theme === "light"
                    ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                    : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
                }`}
              >
                {theme === "light" && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                {/* Mini preview */}
                <div className="w-full h-24 rounded-md bg-white border border-indigo-200 mb-3 overflow-hidden relative">
                  <div
                    className="absolute inset-0 opacity-[0.08] pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)",
                      backgroundSize: "12px 12px",
                    }}
                  />
                  <div className="absolute top-2 left-2 right-2 h-2 rounded-sm bg-indigo-100" />
                  <div className="absolute top-6 left-2 w-16 h-8 rounded-sm bg-slate-800/80 border border-slate-700" />
                  <div className="absolute top-6 left-20 w-16 h-8 rounded-sm bg-slate-800/80 border border-slate-700" />
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">{t("settings.theme.light_label")}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {t("settings.theme.light_desc")}
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* ────────── LINGUA ────────── */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-cyan-500/10 border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <Languages className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">
                  {t("settings.language.section_eyebrow")}
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  {t("settings.language.title")}
                </h2>
              </div>
            </div>

            <p className="text-[12px] text-slate-400 mb-4">
              {t("settings.language.description")}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = i18n.resolvedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    type="button"
                    className={`relative rounded-lg border-2 px-4 py-3 transition-all text-left ${
                      isActive
                        ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                        : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">{lang.flag}</span>
                      <div>
                        <div className="text-sm font-semibold text-white leading-none">{lang.label}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1 font-mono">{lang.code}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ────────── GESTIONE UTENTI (solo admin) ────────── */}
        {isAdmin && (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400/60" />
            <div className="px-5 sm:px-6 py-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md border bg-rose-500/10 border-rose-500/30 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">{t("settings.users.section_eyebrow")}</div>
                    <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">{t("settings.users.title")}</h2>
                  </div>
                </div>
                <button
                  onClick={() => setShowNuovo(!showNuovo)}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-[12px] font-medium transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("settings.users.new_user")}
                </button>
              </div>

              {/* Form nuovo utente */}
              {showNuovo && (
                <div className="mb-5 p-4 bg-slate-800/40 border border-slate-700 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder={t("settings.users.username")}
                      value={nuovoForm.username}
                      onChange={e => setNuovoForm({ ...nuovoForm, username: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                    />
                    <input
                      type="password"
                      placeholder={t("settings.users.password")}
                      value={nuovoForm.password}
                      onChange={e => setNuovoForm({ ...nuovoForm, password: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                    />
                    <select
                      value={nuovoForm.ruolo}
                      onChange={e => setNuovoForm({ ...nuovoForm, ruolo: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
                    >
                      <option value="magazzino">{t("settings.users.role_magazzino")}</option>
                      <option value="ufficio">{t("settings.users.role_ufficio")}</option>
                      <option value="admin">{t("settings.users.role_admin")}</option>
                    </select>
                    <input
                      type="text"
                      placeholder={t("settings.users.name_optional")}
                      value={nuovoForm.nome}
                      onChange={e => setNuovoForm({ ...nuovoForm, nome: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={creaNuovoUtente} type="button" className="px-4 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium transition-all">
                      {t("settings.users.create_user")}
                    </button>
                    <button onClick={() => setShowNuovo(false)} type="button" className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium transition-all hover:text-white">
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista utenti */}
              {loadingUtenti ? (
                <p className="text-sm text-slate-500">{t("settings.users.loading")}</p>
              ) : (
                <div className="space-y-2">
                  {utenti.map(u => {
                    const RuoloIcon = RUOLO_ICON[u.ruolo] || Shield;
                    const ruoloColor = RUOLO_COLOR[u.ruolo] || RUOLO_COLOR.magazzino;
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <div key={u.id} className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-all ${u.attivo ? "bg-slate-800/30 border-slate-700/60" : "bg-slate-800/10 border-slate-800 opacity-50"}`}>
                        {/* Icona ruolo */}
                        <div className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 ${ruoloColor}`}>
                          <RuoloIcon className="w-4 h-4" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{u.username}</span>
                            {u.nome && <span className="text-xs text-slate-400">{u.nome}</span>}
                            {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">{t("settings.users.you_label")}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <select
                              value={u.ruolo}
                              onChange={e => cambiaRuolo(u.id, e.target.value)}
                              disabled={isSelf}
                              className="bg-transparent border-none text-[11px] uppercase tracking-wider text-slate-500 focus:outline-none cursor-pointer disabled:cursor-default"
                            >
                              <option value="admin">{t("settings.users.role_admin")}</option>
                              <option value="ufficio">{t("settings.users.role_ufficio")}</option>
                              <option value="magazzino">{t("settings.users.role_magazzino")}</option>
                            </select>
                            <span className="text-[10px] text-slate-600 font-mono">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString("it-IT") : ""}
                            </span>
                          </div>
                        </div>

                        {/* Azioni */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Reset password */}
                          {resetPwId === u.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="password"
                                placeholder={t("settings.users.new_password_placeholder")}
                                value={resetPwVal}
                                onChange={e => setResetPwVal(e.target.value)}
                                className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                              />
                              <button onClick={() => resetPassword(u.id)} type="button" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium">OK</button>
                              <button onClick={() => { setResetPwId(null); setResetPwVal(""); }} type="button" className="text-slate-500 text-xs">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResetPwId(u.id)}
                              type="button"
                              title={t("settings.users.title_reset")}
                              className="w-8 h-8 rounded-md border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-500 hover:text-amber-400 transition-colors flex items-center justify-center"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Toggle attivo */}
                          {!isSelf && (
                            <button
                              onClick={() => toggleAttivo(u.id, u.attivo)}
                              type="button"
                              title={u.attivo ? t("settings.users.title_deactivate") : t("settings.users.title_activate")}
                              className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${u.attivo ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "border-slate-700 bg-slate-800/60 text-slate-500 hover:text-white"}`}
                            >
                              {u.attivo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                          )}
                          {/* Elimina utente */}
                          {!isSelf && (
                            <button
                              onClick={() => eliminaUtente(u.id, u.username)}
                              type="button"
                              title="Elimina utente"
                              className="w-8 h-8 rounded-md border border-slate-700 bg-slate-800/60 hover:bg-rose-500/10 hover:border-rose-500/40 text-slate-500 hover:text-rose-400 transition-colors flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ────────── INFO APP ────────── */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-500/40" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-slate-500/10 border-slate-500/30 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-slate-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">
                  {t("settings.info.section_eyebrow")}
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  {t("settings.info.title")}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: t("settings.info.app"), value: "Nexus" },
                { label: t("settings.info.version"), value: "v2.0" },
                { label: t("settings.info.framework"), value: "React + Vite" },
                { label: t("settings.info.backend"), value: "Node.js + Express" },
                { label: t("settings.info.database"), value: "SQLite (WAL)" },
                { label: t("settings.info.integration"), value: "Amazon SP-API" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between bg-slate-800/40 rounded-md px-4 py-3"
                >
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                    {item.label}
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>&copy; {new Date().getFullYear()} Nexus &middot; {t("settings.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Settings;
