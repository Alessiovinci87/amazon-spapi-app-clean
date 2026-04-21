import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Package,
  Truck,
  FileText,
  Users,
  Box,
  Globe,
  Bell,
  Wrench,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Percent,
  ShieldAlert,
  Eye,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const MODULES_META = [
  { to: "/europe",                 icon: Globe,      key: "europa",     accent: "indigo",  code: "01" },
  { to: "/magazzino",              icon: Package,    key: "magazzino",  accent: "emerald", code: "02" },
  { to: "/uffici/spedizioni",      icon: Truck,      key: "spedizioni", accent: "violet",  code: "03" },
  { to: "/uffici/alert-center",    icon: Bell,       key: "alert",      accent: "amber",   code: "04" },
  { to: "/uffici/produzione",      icon: Wrench,     key: "produzione", accent: "rose",    code: "05" },
  { to: "/uffici/ddt",             icon: FileText,   key: "ddt",        accent: "pink",    code: "06" },
  { to: "/uffici/fornitori",       icon: Users,      key: "fornitori",  accent: "orange",  code: "07" },
  { to: "/fba-gestione-prodotti",  icon: Box,        key: "fba",        accent: "cyan",    code: "08" },
  { to: "/uffici/bilancio",        icon: DollarSign, key: "bilancio",   accent: "teal",    code: "09" },
  { to: "/uffici/vendite",         icon: TrendingUp, key: "vendite",    accent: "blue",    code: "10" },
  { to: "/uffici/profittabilita",  icon: Percent,    key: "profittabilita", accent: "emerald", code: "11" },
  { to: "/uffici/copertura-fba",  icon: ShieldAlert, key: "copertura_fba", accent: "rose",    code: "12" },
  { to: "/uffici/competitor",     icon: Eye,         key: "competitor",    accent: "indigo",  code: "13" },
];

const ACCENT = {
  indigo:  { border: "border-l-indigo-400/50",  iconBg: "bg-indigo-400/[0.06]",  iconBorder: "border-indigo-400/20",  iconText: "text-indigo-300/70",  hoverBg: "hover:bg-indigo-400/[0.04]",   hoverBorder: "hover:border-indigo-400/25",  labelColor: "text-indigo-300/80",  codeBg: "bg-indigo-400/[0.06] text-indigo-300/60" },
  emerald: { border: "border-l-emerald-400/50", iconBg: "bg-emerald-400/[0.06]", iconBorder: "border-emerald-400/20", iconText: "text-emerald-300/70", hoverBg: "hover:bg-emerald-400/[0.04]",  hoverBorder: "hover:border-emerald-400/25", labelColor: "text-emerald-300/80", codeBg: "bg-emerald-400/[0.06] text-emerald-300/60" },
  violet:  { border: "border-l-violet-400/50",  iconBg: "bg-violet-400/[0.06]",  iconBorder: "border-violet-400/20",  iconText: "text-violet-300/70",  hoverBg: "hover:bg-violet-400/[0.04]",   hoverBorder: "hover:border-violet-400/25",  labelColor: "text-violet-300/80",  codeBg: "bg-violet-400/[0.06] text-violet-300/60" },
  amber:   { border: "border-l-amber-400/50",   iconBg: "bg-amber-400/[0.06]",   iconBorder: "border-amber-400/20",   iconText: "text-amber-300/70",   hoverBg: "hover:bg-amber-400/[0.04]",    hoverBorder: "hover:border-amber-400/25",   labelColor: "text-amber-300/80",   codeBg: "bg-amber-400/[0.06] text-amber-300/60" },
  rose:    { border: "border-l-rose-400/50",    iconBg: "bg-rose-400/[0.06]",    iconBorder: "border-rose-400/20",    iconText: "text-rose-300/70",    hoverBg: "hover:bg-rose-400/[0.04]",     hoverBorder: "hover:border-rose-400/25",    labelColor: "text-rose-300/80",    codeBg: "bg-rose-400/[0.06] text-rose-300/60" },
  pink:    { border: "border-l-pink-400/50",    iconBg: "bg-pink-400/[0.06]",    iconBorder: "border-pink-400/20",    iconText: "text-pink-300/70",    hoverBg: "hover:bg-pink-400/[0.04]",     hoverBorder: "hover:border-pink-400/25",    labelColor: "text-pink-300/80",    codeBg: "bg-pink-400/[0.06] text-pink-300/60" },
  orange:  { border: "border-l-orange-400/50",  iconBg: "bg-orange-400/[0.06]",  iconBorder: "border-orange-400/20",  iconText: "text-orange-300/70",  hoverBg: "hover:bg-orange-400/[0.04]",   hoverBorder: "hover:border-orange-400/25",  labelColor: "text-orange-300/80",  codeBg: "bg-orange-400/[0.06] text-orange-300/60" },
  cyan:    { border: "border-l-cyan-400/50",    iconBg: "bg-cyan-400/[0.06]",    iconBorder: "border-cyan-400/20",    iconText: "text-cyan-300/70",    hoverBg: "hover:bg-cyan-400/[0.04]",     hoverBorder: "hover:border-cyan-400/25",    labelColor: "text-cyan-300/80",    codeBg: "bg-cyan-400/[0.06] text-cyan-300/60" },
  teal:    { border: "border-l-teal-400/50",    iconBg: "bg-teal-400/[0.06]",    iconBorder: "border-teal-400/20",    iconText: "text-teal-300/70",    hoverBg: "hover:bg-teal-400/[0.04]",     hoverBorder: "hover:border-teal-400/25",    labelColor: "text-teal-300/80",    codeBg: "bg-teal-400/[0.06] text-teal-300/60" },
  blue:    { border: "border-l-blue-400/50",    iconBg: "bg-blue-400/[0.06]",    iconBorder: "border-blue-400/20",    iconText: "text-blue-300/70",    hoverBg: "hover:bg-blue-400/[0.04]",     hoverBorder: "hover:border-blue-400/25",    labelColor: "text-blue-300/80",    codeBg: "bg-blue-400/[0.06] text-blue-300/60" },
};

const DashboardAmazon = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const MODULES = MODULES_META.map((m) => ({
    ...m,
    label: t(`dashboardAmazon.mod_${m.key}_label`),
    desc: t(`dashboardAmazon.mod_${m.key}_desc`),
  }));

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

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-12 sm:pt-16 lg:pt-20 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-3">
              {t("dashboardAmazon.hero_eyebrow")}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
              {t("dashboardAmazon.hero_title_main")} <span className="text-slate-500">{t("dashboardAmazon.hero_title_suffix")}</span>
            </h1>
            <p className="mt-4 text-[15px] sm:text-base text-slate-400 leading-relaxed max-w-2xl">
              {t("dashboardAmazon.hero_desc")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* === Modules grid 5x2 === */}
      <section className="relative flex-1">
        <div className="px-6 sm:px-10 lg:px-16 pb-16">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              {t("dashboardAmazon.modules_eyebrow")}
            </div>
            <div className="text-[11px] font-mono text-slate-600">
              {String(MODULES.length).padStart(2, "0")} / {String(MODULES.length).padStart(2, "0")}
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          >
            {MODULES.map((m) => {
              const Icon = m.icon;
              const a = ACCENT[m.accent];
              return (
                <motion.button
                  key={m.to}
                  variants={itemVariants}
                  onClick={() => navigate(m.to)}
                  className={`group relative flex flex-col items-start text-left p-5 bg-slate-900/60 border border-slate-800 border-l-[3px] ${a.border} rounded-lg transition-all duration-200 ${a.hoverBg} ${a.hoverBorder}`}
                >
                  {/* Top row: icon + code */}
                  <div className="flex items-center justify-between w-full mb-4">
                    <div className={`w-10 h-10 rounded-lg ${a.iconBg} border ${a.iconBorder} flex items-center justify-center`}>
                      <Icon className={`w-[18px] h-[18px] ${a.iconText}`} />
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${a.codeBg}`}>
                      {m.code}
                    </span>
                  </div>

                  {/* Label + desc */}
                  <div className={`text-sm font-semibold mb-1 ${a.labelColor}`}>{m.label}</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{m.desc}</p>

                  {/* CTA */}
                  <div className="mt-auto pt-4 flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-600 group-hover:text-slate-300 transition-colors">
                    {t("dashboardAmazon.cta_apri")}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} {t("dashboardAmazon.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DashboardAmazon;
