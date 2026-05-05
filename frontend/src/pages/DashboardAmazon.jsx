import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
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
  LayoutGrid,
  Layers,
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
  // Marketplace Amazon
  { to: "/europe",                 icon: Globe,      key: "europa",         accent: "indigo",  code: "01", group: "marketplace" },
  { to: "/uffici/prezzi",          icon: DollarSign, key: "prezzi",         accent: "emerald", code: "14", group: "marketplace" },
  { to: "/uffici/commissioni",     icon: Percent,    key: "commissioni",    accent: "rose",    code: "15", group: "marketplace" },
  { to: "/uffici/competitor",      icon: Eye,        key: "competitor",     accent: "indigo",  code: "13", group: "marketplace" },
  // Vendite & Analytics
  { to: "/uffici/vendite",         icon: TrendingUp, key: "vendite",        accent: "blue",    code: "10", group: "analytics" },
  { to: "/uffici/profittabilita",  icon: Percent,    key: "profittabilita", accent: "emerald", code: "11", group: "analytics" },
  { to: "/uffici/copertura-fba",   icon: ShieldAlert,key: "copertura_fba",  accent: "rose",    code: "12", group: "analytics" },
  { to: "/uffici/bilancio",        icon: DollarSign, key: "bilancio",       accent: "teal",    code: "09", group: "analytics" },
  // Logistica & Spedizioni
  { to: "/magazzino",              icon: Package,    key: "magazzino",      accent: "emerald", code: "02", group: "logistica" },
  { to: "/uffici/spedizioni",      icon: Truck,      key: "spedizioni",     accent: "violet",  code: "03", group: "logistica" },
  { to: "/uffici/ddt",             icon: FileText,   key: "ddt",            accent: "pink",    code: "06", group: "logistica" },
  { to: "/uffici/tracking17",      icon: Truck,      key: "tracking17",     accent: "blue",    code: "16", group: "logistica" },
  // Operazioni
  { to: "/uffici/produzione",      icon: Wrench,     key: "produzione",     accent: "rose",    code: "05", group: "operazioni" },
  { to: "/uffici/alert-center",    icon: Bell,       key: "alert",          accent: "amber",   code: "04", group: "operazioni" },
  { to: "/uffici/fornitori",       icon: Users,      key: "fornitori",      accent: "orange",  code: "07", group: "operazioni" },
  { to: "/fba-gestione-prodotti",  icon: Box,        key: "fba",            accent: "cyan",    code: "08", group: "operazioni" },
];

const GROUP_ORDER = ["marketplace", "analytics", "logistica", "operazioni"];

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

const LAYOUT_STORAGE_KEY = "dashboardAmazon_layout";

function ModuleCard({ module: m, navigate, t, compact = false }) {
  const Icon = m.icon;
  const a = ACCENT[m.accent];
  return (
    <motion.button
      variants={itemVariants}
      onClick={() => navigate(m.to)}
      className={`group relative flex flex-col items-start text-left ${compact ? "p-4" : "p-5"} bg-slate-900/60 border border-slate-800 border-l-[3px] ${a.border} rounded-lg transition-all duration-200 ${a.hoverBg} ${a.hoverBorder}`}
    >
      <div className={`flex items-center justify-between w-full ${compact ? "mb-3" : "mb-4"}`}>
        <div className={`${compact ? "w-8 h-8" : "w-10 h-10"} rounded-lg ${a.iconBg} border ${a.iconBorder} flex items-center justify-center`}>
          <Icon className={`${compact ? "w-4 h-4" : "w-[18px] h-[18px]"} ${a.iconText}`} />
        </div>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${a.codeBg}`}>{m.code}</span>
      </div>
      <div className={`${compact ? "text-[13px]" : "text-sm"} font-semibold mb-1 ${a.labelColor}`}>{m.label}</div>
      <p className={`text-[11px] text-slate-500 leading-snug ${compact ? "line-clamp-2" : "leading-relaxed"}`}>{m.desc}</p>
      {!compact && (
        <div className="mt-auto pt-4 flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-600 group-hover:text-slate-300 transition-colors">
          {t("dashboardAmazon.cta_apri")}
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </motion.button>
  );
}

const DashboardAmazon = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem(LAYOUT_STORAGE_KEY) || "groups"; }
    catch { return "groups"; }
  });
  useEffect(() => {
    try { localStorage.setItem(LAYOUT_STORAGE_KEY, layout); } catch { /* ignore */ }
  }, [layout]);

  const MODULES = MODULES_META.map((m) => ({
    ...m,
    label: t(`dashboardAmazon.mod_${m.key}_label`),
    desc: t(`dashboardAmazon.mod_${m.key}_desc`),
  }));

  const MODULES_BY_GROUP = GROUP_ORDER.map((g) => ({
    key: g,
    label: t(`dashboardAmazon.group_${g}`, g),
    items: MODULES.filter((m) => m.group === g),
  })).filter((g) => g.items.length > 0);

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

      {/* === Modules === */}
      <section className="relative flex-1">
        <div className="px-6 sm:px-10 lg:px-16 pb-16">
          <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              {t("dashboardAmazon.modules_eyebrow")}
            </div>
            <div className="flex items-center gap-3">
              {/* Layout toggle */}
              <div className="inline-flex items-center bg-slate-900/60 border border-slate-800 rounded-md p-0.5">
                <button
                  onClick={() => setLayout("groups")}
                  title={t("dashboardAmazon.layout_groups", "Per categorie")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] uppercase tracking-wider transition-colors ${
                    layout === "groups"
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {t("dashboardAmazon.layout_groups", "Categorie")}
                </button>
                <button
                  onClick={() => setLayout("grid")}
                  title={t("dashboardAmazon.layout_grid", "Griglia")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] uppercase tracking-wider transition-colors ${
                    layout === "grid"
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  {t("dashboardAmazon.layout_grid", "Griglia")}
                </button>
              </div>
              <div className="text-[11px] font-mono text-slate-600">
                {String(MODULES.length).padStart(2, "0")} / {String(MODULES.length).padStart(2, "0")}
              </div>
            </div>
          </div>

          {layout === "grid" ? (
            <motion.div
              key="grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              {MODULES.map((m) => (
                <ModuleCard key={m.to} module={m} navigate={navigate} t={t} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="groups"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {MODULES_BY_GROUP.map((g) => (
                <motion.div key={g.key} variants={itemVariants}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-medium">
                      {g.label}
                    </div>
                    <div className="flex-1 h-px bg-slate-800" />
                    <div className="text-[10px] font-mono text-slate-600">
                      {String(g.items.length).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {g.items.map((m) => (
                      <ModuleCard key={m.to} module={m} navigate={navigate} t={t} compact />
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
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
