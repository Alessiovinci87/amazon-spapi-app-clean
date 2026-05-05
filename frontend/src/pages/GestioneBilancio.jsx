import { useState } from "react";
import { useTranslation } from "react-i18next";
import PageTopBar from "../components/PageTopBar";
import {
  DollarSign,
  Calculator,
  Receipt,
  ChevronDown,
} from "lucide-react";

import CatalogoCostiTable from "../components/bilancio/CatalogoCostiTable";
import RiepilogoValori from "../components/bilancio/RiepilogoValori";
import MovimentiTable from "../components/bilancio/MovimentiTable";

const GestioneBilancio = () => {
  const { t } = useTranslation();
  const [costiOpen, setCostiOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <PageTopBar
        icon={DollarSign}
        iconAccent="emerald"
        eyebrow={t("gestioneBilancio.topbar_eyebrow")}
        title={t("gestioneBilancio.topbar_title")}
        backTo="/dashboard"
      />

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("gestioneBilancio.page_eyebrow")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("gestioneBilancio.hero_title_main")} <span className="text-slate-500">{t("gestioneBilancio.hero_title_suffix")}</span>
          </h1>
        </div>
      </section>

      {/* === Content === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-8">

        {/* Riepilogo valori */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-emerald-500/10 border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">{t("gestioneBilancio.section_dashboard_eyebrow")}</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">{t("gestioneBilancio.section_valore_title")}</h2>
              </div>
            </div>
            <RiepilogoValori />
          </div>
        </div>

        {/* Movimenti economici */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-cyan-500/10 border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">{t("gestioneBilancio.section_registro_eyebrow")}</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">{t("gestioneBilancio.section_movimenti_title")}</h2>
              </div>
            </div>
            <MovimentiTable />
          </div>
        </div>

        {/* Catalogo costi — collassabile */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
          <button
            type="button"
            onClick={() => setCostiOpen(v => !v)}
            aria-expanded={costiOpen}
            className="w-full px-5 sm:px-6 py-5 flex items-center gap-3 text-left hover:bg-slate-800/20 transition-colors"
          >
            <div className="w-8 h-8 rounded-md border bg-violet-500/10 border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <Calculator className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">{t("gestioneBilancio.section_catalogo_eyebrow")}</div>
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">{t("gestioneBilancio.section_costi_title")}</h2>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${costiOpen ? "rotate-180" : ""}`}
            />
          </button>
          {costiOpen && (
            <div className="px-5 sm:px-6 pb-5">
              <CatalogoCostiTable />
            </div>
          )}
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>&copy; {new Date().getFullYear()} {t("gestioneBilancio.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default GestioneBilancio;
