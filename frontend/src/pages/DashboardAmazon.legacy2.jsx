import { useNavigate } from "react-router-dom";
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

const MODULES = [
  { to: "/europe",                 icon: Globe,      label: "Europa",       desc: "SP-API multi-marketplace",        accent: "indigo",  code: "01" },
  { to: "/magazzino",              icon: Package,    label: "Magazzino",    desc: "Giacenze e movimentazioni",       accent: "emerald", code: "02" },
  { to: "/uffici/spedizioni",      icon: Truck,      label: "Spedizioni",   desc: "Logistica e tracking",            accent: "violet",  code: "03" },
  { to: "/uffici/alert-center",     icon: Bell,       label: "Centro Alert", desc: "Alert stock per categoria",       accent: "amber",   code: "04" },
  { to: "/uffici/produzione",      icon: Wrench,     label: "Produzione",   desc: "Prenotazioni e ordini lavoro",    accent: "rose",    code: "05" },
  { to: "/uffici/ddt",             icon: FileText,   label: "DDT",          desc: "Documenti di trasporto",          accent: "pink",    code: "06" },
  { to: "/uffici/fornitori",       icon: Users,      label: "Fornitori",    desc: "Anagrafica e gestione",           accent: "orange",  code: "07" },
  { to: "/fba-gestione-prodotti",  icon: Box,        label: "FBA Prodotti", desc: "Catalogo Amazon FBA",             accent: "cyan",    code: "08" },
  { to: "/uffici/bilancio",        icon: DollarSign, label: "Bilancio",     desc: "Costi, valore magazzino, movimenti", accent: "emerald", code: "09" },
  { to: "/uffici/vendite",         icon: TrendingUp, label: "Vendite",      desc: "Dashboard vendite e margini",     accent: "blue",    code: "10" },
];

const ACCENT_BG = {
  indigo:  "group-hover:border-indigo-500/40 group-hover:bg-indigo-500/5",
  emerald: "group-hover:border-emerald-500/40 group-hover:bg-emerald-500/5",
  violet:  "group-hover:border-violet-500/40 group-hover:bg-violet-500/5",
  amber:   "group-hover:border-amber-500/40 group-hover:bg-amber-500/5",
  rose:    "group-hover:border-rose-500/40 group-hover:bg-rose-500/5",
  pink:    "group-hover:border-pink-500/40 group-hover:bg-pink-500/5",
  orange:  "group-hover:border-orange-500/40 group-hover:bg-orange-500/5",
  cyan:    "group-hover:border-cyan-500/40 group-hover:bg-cyan-500/5",
  blue:    "group-hover:border-blue-500/40 group-hover:bg-blue-500/5",
};

const ACCENT_ICON = {
  indigo:  "group-hover:text-indigo-400 group-hover:border-indigo-500/40",
  emerald: "group-hover:text-emerald-400 group-hover:border-emerald-500/40",
  violet:  "group-hover:text-violet-400 group-hover:border-violet-500/40",
  amber:   "group-hover:text-amber-400 group-hover:border-amber-500/40",
  rose:    "group-hover:text-rose-400 group-hover:border-rose-500/40",
  pink:    "group-hover:text-pink-400 group-hover:border-pink-500/40",
  orange:  "group-hover:text-orange-400 group-hover:border-orange-500/40",
  cyan:    "group-hover:text-cyan-400 group-hover:border-cyan-500/40",
  blue:    "group-hover:text-blue-400 group-hover:border-blue-500/40",
};

const DashboardAmazon = () => {
  const navigate = useNavigate();

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
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-12 sm:pt-16 lg:pt-20 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-3">
              Dashboard
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
              Pannello <span className="text-slate-500">amministrativo.</span>
            </h1>
            <p className="mt-4 text-[15px] sm:text-base text-slate-400 leading-relaxed max-w-2xl">
              Accesso completo a tutti i moduli operativi e strumenti SP-API.
              Seleziona una sezione per iniziare.
            </p>
          </motion.div>
        </div>
      </section>

      {/* === Modules grid === */}
      <section className="relative flex-1">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pb-16">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Moduli disponibili
            </div>
            <div className="text-[11px] font-mono text-slate-600">
              {String(MODULES.length).padStart(2, "0")} / {String(MODULES.length).padStart(2, "0")}
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <motion.button
                  key={m.to}
                  variants={itemVariants}
                  onClick={() => navigate(m.to)}
                  className={`group relative flex flex-col items-start text-left p-5 sm:p-6 bg-slate-900/60 border border-slate-800 rounded-lg transition-all hover:bg-slate-900 ${ACCENT_BG[m.accent]}`}
                >
                  <div className="flex items-center justify-between w-full mb-6">
                    <div className={`w-11 h-11 rounded-md bg-slate-800/60 border border-slate-700 flex items-center justify-center transition-colors ${ACCENT_ICON[m.accent]}`}>
                      <Icon className="w-5 h-5 text-slate-400 transition-colors" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 group-hover:text-slate-400 transition-colors">
                      {m.code}
                    </span>
                  </div>
                  <div className="text-base font-medium text-white mb-1">{m.label}</div>
                  <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
                  <div className="mt-5 flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-600 group-hover:text-slate-300 transition-colors">
                    Apri
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
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Ufficio</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DashboardAmazon;
