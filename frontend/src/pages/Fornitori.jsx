import React, { useState } from "react";
import InserimentoFornitore from "../components/fornitori/InserimentoFornitore";
import InserimentoOrdine from "../components/fornitori/InserimentoOrdine";
import ListaFornitori from "../components/fornitori/ListaFornitori";
import StoricoOrdini from "../components/fornitori/StoricoOrdini";
import GestioneProdottiFornitore from "../components/fornitori/GestioneProdottiFornitore";
import PageTopBar from "../components/PageTopBar";
import {
  Users,
  ShoppingCart,
  List,
  Archive,
  Link2,
  ArrowRight,
  FolderTree,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/* ── Shared UI ──────────────────────────────────────────── */

const SECTION_ACCENTS = {
  amber:   { bar: "bg-amber-400",   icon: "text-amber-400",   bgIcon: "bg-amber-500/10 border-amber-500/30",   cardHover: "group-hover:border-amber-500/40 group-hover:bg-amber-500/5",   iconHover: "group-hover:text-amber-400 group-hover:border-amber-500/40" },
  emerald: { bar: "bg-emerald-400", icon: "text-emerald-400", bgIcon: "bg-emerald-500/10 border-emerald-500/30", cardHover: "group-hover:border-emerald-500/40 group-hover:bg-emerald-500/5", iconHover: "group-hover:text-emerald-400 group-hover:border-emerald-500/40" },
  blue:    { bar: "bg-blue-400",    icon: "text-blue-400",    bgIcon: "bg-blue-500/10 border-blue-500/30",       cardHover: "group-hover:border-blue-500/40 group-hover:bg-blue-500/5",    iconHover: "group-hover:text-blue-400 group-hover:border-blue-500/40" },
  violet:  { bar: "bg-violet-400",  icon: "text-violet-400",  bgIcon: "bg-violet-500/10 border-violet-500/30",   cardHover: "group-hover:border-violet-500/40 group-hover:bg-violet-500/5", iconHover: "group-hover:text-violet-400 group-hover:border-violet-500/40" },
  orange:  { bar: "bg-orange-400",  icon: "text-orange-400",  bgIcon: "bg-orange-500/10 border-orange-500/30",   cardHover: "group-hover:border-orange-500/40 group-hover:bg-orange-500/5", iconHover: "group-hover:text-orange-400 group-hover:border-orange-500/40" },
};

const ACTIVE_ACCENTS = {
  amber:   { border: "border-amber-500/40 bg-amber-500/5",   iconBorder: "border-amber-500/40", iconText: "text-amber-400" },
  emerald: { border: "border-emerald-500/40 bg-emerald-500/5", iconBorder: "border-emerald-500/40", iconText: "text-emerald-400" },
  blue:    { border: "border-blue-500/40 bg-blue-500/5",     iconBorder: "border-blue-500/40",   iconText: "text-blue-400" },
  violet:  { border: "border-violet-500/40 bg-violet-500/5",  iconBorder: "border-violet-500/40", iconText: "text-violet-400" },
  orange:  { border: "border-orange-500/40 bg-orange-500/5",  iconBorder: "border-orange-500/40", iconText: "text-orange-400" },
};

const Fornitori = () => {
  const { t } = useTranslation();
  const [formAperto, setFormAperto] = useState(null);

  const sections = [
    { id: "fornitore", title: t("fornitori.card_fornitore_title"), desc: t("fornitori.card_fornitore_desc"), icon: Users,        accent: "amber",   code: "01" },
    { id: "ordine",    title: t("fornitori.card_ordine_title"),    desc: t("fornitori.card_ordine_desc"),    icon: ShoppingCart, accent: "emerald", code: "02" },
    { id: "lista",     title: t("fornitori.card_lista_title"),     desc: t("fornitori.card_lista_desc"),     icon: List,         accent: "blue",    code: "03" },
    { id: "storico",   title: t("fornitori.card_storico_title"),   desc: t("fornitori.card_storico_desc"),   icon: Archive,      accent: "violet",  code: "04" },
    { id: "gestione",  title: t("fornitori.card_gestione_title"),  desc: t("fornitori.card_gestione_desc"),  icon: Link2,        accent: "orange",  code: "05" },
  ];

  const toggleForm = (formName) => {
    setFormAperto(formAperto === formName ? null : formName);
  };

  const activeSection = sections.find((s) => s.id === formAperto);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <PageTopBar
        icon={Users}
        iconAccent="amber"
        eyebrow={t("fornitori.topbar_eyebrow")}
        title={t("fornitori.topbar_title")}
        backTo="/dashboard"
      />

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("fornitori.page_eyebrow")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("fornitori.hero_title_main")} <span className="text-slate-500">{t("fornitori.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("fornitori.intro")}
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Sezioni */}
        <div>
          <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1.5">{t("fornitori.sez_eyebrow")}</div>
              <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">{t("fornitori.sez_title")}</h2>
              <p className="text-sm text-slate-500 mt-1">{t("fornitori.sez_desc")}</p>
            </div>
            <div className="text-[11px] font-mono text-slate-600">
              {String(sections.length).padStart(2, "0")} {t("fornitori.moduli_count")}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = formAperto === s.id;
              const acc = SECTION_ACCENTS[s.accent];
              const act = ACTIVE_ACCENTS[s.accent];

              return (
                <button
                  key={s.id}
                  onClick={() => toggleForm(s.id)}
                  type="button"
                  className={`group relative flex flex-col items-start text-left p-5 sm:p-6 rounded-lg transition-all ${
                    isActive
                      ? `bg-slate-900 ${act.border}`
                      : `bg-slate-900/60 border border-slate-800 hover:bg-slate-900 ${acc.cardHover}`
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-6">
                    <div className={`w-11 h-11 rounded-md flex items-center justify-center transition-colors ${
                      isActive
                        ? `${acc.bgIcon}`
                        : `bg-slate-800/60 border border-slate-700 ${acc.iconHover}`
                    }`}>
                      <Icon className={`w-5 h-5 transition-colors ${isActive ? acc.icon : "text-slate-400"}`} />
                    </div>
                    <span className={`text-[10px] font-mono transition-colors ${isActive ? "text-slate-400" : "text-slate-600 group-hover:text-slate-400"}`}>
                      {s.code}
                    </span>
                  </div>
                  <div className="text-base font-medium text-white mb-1">{s.title}</div>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                  <div className={`mt-5 flex items-center gap-1 text-[11px] uppercase tracking-wider transition-colors ${
                    isActive ? `${acc.icon}` : "text-slate-600 group-hover:text-slate-300"
                  }`}>
                    {isActive ? t("fornitori.cta_attivo") : t("fornitori.cta_apri")}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  {isActive && (
                    <div className="absolute top-3 right-3">
                      <div className={`w-2 h-2 rounded-full ${acc.bar} animate-pulse`} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenuto dinamico */}
        {formAperto && activeSection && (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${SECTION_ACCENTS[activeSection.accent].bar}/60`} />
            <div className="px-5 sm:px-6 py-5">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
                {(() => {
                  const Icon = activeSection.icon;
                  const acc = SECTION_ACCENTS[activeSection.accent];
                  return (
                    <>
                      <div className={`w-8 h-8 rounded-md border ${acc.bgIcon} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${acc.icon}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">
                          {t("fornitori.sezione_attiva")}
                        </div>
                        <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-tight truncate">
                          {activeSection.title}
                        </h2>
                      </div>
                    </>
                  );
                })()}
              </div>

              {formAperto === "fornitore" && <InserimentoFornitore onFornitoreAggiunto={() => console.log("Fornitore aggiunto")} />}
              {formAperto === "ordine" && <InserimentoOrdine />}
              {formAperto === "lista" && <ListaFornitori />}
              {formAperto === "storico" && <StoricoOrdini />}
              {formAperto === "gestione" && <GestioneProdottiFornitore />}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!formAperto && (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700/60" />
            <div className="px-5 sm:px-6 py-12 text-center">
              <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-2">
                {t("fornitori.empty_title")}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {t("fornitori.empty_desc")}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} {t("fornitori.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Fornitori;
