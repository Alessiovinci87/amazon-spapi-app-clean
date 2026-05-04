import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  FileText,
  FileCheck,
  Archive,
  ChevronRight,
  LogOut,
} from "lucide-react";

function StatTile({ icon: Icon, label, value, accent = "violet" }) {
  const m = {
    violet: "bg-violet-500/10 border-violet-500/40 text-violet-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    blue: "bg-blue-500/10 border-blue-500/40 text-blue-400",
  };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${m[accent]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{label}</div>
    </div>
  );
}

const DDTIndex = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMagazzino = user?.ruolo === "magazzino";

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
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
              onClick={() => navigate(isMagazzino ? "/magazzino" : "/dashboard")}
              type="button"
              title={t("ddtIndex.topbar_back")}
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
              <FileText className="w-[18px] h-[18px] text-violet-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">{t("ddtIndex.topbar_title")}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{t("ddtIndex.topbar_eyebrow")}</span>
            </div>
          </div>

          <button
            onClick={() => navigate(isMagazzino ? "/magazzino" : "/dashboard")}
            type="button"
            className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t("ddtIndex.topbar_dashboard")}
          </button>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
            {t("ddtIndex.hero_eyebrow")}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("ddtIndex.hero_title_main")} <span className="text-slate-500">{t("ddtIndex.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("ddtIndex.hero_desc")}
          </p>
        </div>
      </section>

      {/* === Contenuto principale === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">

        {/* Opzioni DDT — Pics e Generico solo per ufficio/admin */}
        {!isMagazzino && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* DDT Pics Nails */}
          <button
            onClick={() => navigate("/uffici/ddt/prebolle")}
            type="button"
            className="group relative bg-slate-900/60 border border-slate-800 hover:border-violet-500/50 rounded-lg overflow-hidden text-left transition-all"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
            <div className="px-6 py-6 sm:px-8 sm:py-7">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-violet-400" />
                </div>
                <ChevronRight className="w-5 h-5 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1">{t("ddtIndex.pics_eyebrow")}</div>
              <h3 className="text-lg font-semibold text-white tracking-tight mb-2">{t("ddtIndex.pics_title")}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {t("ddtIndex.pics_desc")}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[11px] font-medium">
                  {t("ddtIndex.pics_tag_template")}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[11px] font-medium">
                  {t("ddtIndex.pics_tag_prebolle")}
                </span>
              </div>
            </div>
          </button>

          {/* DDT Generico */}
          <button
            onClick={() => navigate("/uffici/ddt/nuovo")}
            type="button"
            className="group relative bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 rounded-lg overflow-hidden text-left transition-all"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
            <div className="px-6 py-6 sm:px-8 sm:py-7">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1">{t("ddtIndex.generico_eyebrow")}</div>
              <h3 className="text-lg font-semibold text-white tracking-tight mb-2">{t("ddtIndex.generico_title")}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {t("ddtIndex.generico_desc")}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
                  {t("ddtIndex.generico_tag_flessibile")}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
                  {t("ddtIndex.generico_tag_custom")}
                </span>
              </div>
            </div>
          </button>
        </div>
        )}

        {/* Storico DDT */}
        <button
          onClick={() => navigate("/uffici/ddt/storico")}
          type="button"
          className="group relative w-full bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 rounded-lg overflow-hidden text-left transition-all"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
          <div className="px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                <Archive className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{t("ddtIndex.storico_eyebrow")}</div>
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">{t("ddtIndex.storico_title")}</h3>
                <p className="text-sm text-slate-400 mt-0.5">{t("ddtIndex.storico_desc")}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
        </button>

        {/* Stats — solo ufficio/admin */}
        {!isMagazzino && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile icon={FileCheck} label={t("ddtIndex.stat_pics")} value="--" accent="violet" />
          <StatTile icon={FileText} label={t("ddtIndex.stat_generici")} value="--" accent="emerald" />
          <StatTile icon={Archive} label={t("ddtIndex.stat_totali")} value="--" accent="blue" />
        </div>
        )}
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>{t("ddtIndex.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DDTIndex;
