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
  { to: "/europe",                 icon: Globe,      label: "Europa",       desc: "SP-API multi-marketplace",           accent: "indigo",  code: "01" },
  { to: "/magazzino",              icon: Package,    label: "Magazzino",    desc: "Giacenze e movimentazioni",          accent: "emerald", code: "02" },
  { to: "/uffici/spedizioni",      icon: Truck,      label: "Spedizioni",   desc: "Logistica e tracking",               accent: "violet",  code: "03" },
  { to: "/uffici/alert-center",    icon: Bell,       label: "Centro Alert", desc: "Alert stock per categoria",          accent: "amber",   code: "04" },
  { to: "/uffici/produzione",      icon: Wrench,     label: "Produzione",   desc: "Prenotazioni e ordini lavoro",       accent: "rose",    code: "05" },
  { to: "/uffici/ddt",             icon: FileText,   label: "DDT",          desc: "Documenti di trasporto",             accent: "pink",    code: "06" },
  { to: "/uffici/fornitori",       icon: Users,      label: "Fornitori",    desc: "Anagrafica e gestione",              accent: "orange",  code: "07" },
  { to: "/fba-gestione-prodotti",  icon: Box,        label: "FBA Prodotti", desc: "Catalogo Amazon FBA",                accent: "cyan",    code: "08" },
  { to: "/uffici/bilancio",        icon: DollarSign, label: "Bilancio",     desc: "Costi, valore magazzino, movimenti", accent: "teal",    code: "09" },
  { to: "/uffici/vendite",         icon: TrendingUp, label: "Vendite",      desc: "Dashboard vendite e margini",        accent: "blue",    code: "10" },
];

const ACCENT = {
  indigo:  { border: "border-l-indigo-500",  iconBg: "bg-indigo-500/10",  iconBorder: "border-indigo-500/30",  iconText: "text-indigo-400",  hoverBg: "hover:bg-indigo-500/5",   hoverBorder: "hover:border-indigo-500/30",  labelColor: "text-indigo-400",  codeBg: "bg-indigo-500/10 text-indigo-400" },
  emerald: { border: "border-l-emerald-500", iconBg: "bg-emerald-500/10", iconBorder: "border-emerald-500/30", iconText: "text-emerald-400", hoverBg: "hover:bg-emerald-500/5",  hoverBorder: "hover:border-emerald-500/30", labelColor: "text-emerald-400", codeBg: "bg-emerald-500/10 text-emerald-400" },
  violet:  { border: "border-l-violet-500",  iconBg: "bg-violet-500/10",  iconBorder: "border-violet-500/30",  iconText: "text-violet-400",  hoverBg: "hover:bg-violet-500/5",   hoverBorder: "hover:border-violet-500/30",  labelColor: "text-violet-400",  codeBg: "bg-violet-500/10 text-violet-400" },
  amber:   { border: "border-l-amber-500",   iconBg: "bg-amber-500/10",   iconBorder: "border-amber-500/30",   iconText: "text-amber-400",   hoverBg: "hover:bg-amber-500/5",    hoverBorder: "hover:border-amber-500/30",   labelColor: "text-amber-400",   codeBg: "bg-amber-500/10 text-amber-400" },
  rose:    { border: "border-l-rose-500",    iconBg: "bg-rose-500/10",    iconBorder: "border-rose-500/30",    iconText: "text-rose-400",    hoverBg: "hover:bg-rose-500/5",     hoverBorder: "hover:border-rose-500/30",    labelColor: "text-rose-400",    codeBg: "bg-rose-500/10 text-rose-400" },
  pink:    { border: "border-l-pink-500",    iconBg: "bg-pink-500/10",    iconBorder: "border-pink-500/30",    iconText: "text-pink-400",    hoverBg: "hover:bg-pink-500/5",     hoverBorder: "hover:border-pink-500/30",    labelColor: "text-pink-400",    codeBg: "bg-pink-500/10 text-pink-400" },
  orange:  { border: "border-l-orange-500",  iconBg: "bg-orange-500/10",  iconBorder: "border-orange-500/30",  iconText: "text-orange-400",  hoverBg: "hover:bg-orange-500/5",   hoverBorder: "hover:border-orange-500/30",  labelColor: "text-orange-400",  codeBg: "bg-orange-500/10 text-orange-400" },
  cyan:    { border: "border-l-cyan-500",    iconBg: "bg-cyan-500/10",    iconBorder: "border-cyan-500/30",    iconText: "text-cyan-400",    hoverBg: "hover:bg-cyan-500/5",     hoverBorder: "hover:border-cyan-500/30",    labelColor: "text-cyan-400",    codeBg: "bg-cyan-500/10 text-cyan-400" },
  teal:    { border: "border-l-teal-500",    iconBg: "bg-teal-500/10",    iconBorder: "border-teal-500/30",    iconText: "text-teal-400",    hoverBg: "hover:bg-teal-500/5",     hoverBorder: "hover:border-teal-500/30",    labelColor: "text-teal-400",    codeBg: "bg-teal-500/10 text-teal-400" },
  blue:    { border: "border-l-blue-500",    iconBg: "bg-blue-500/10",    iconBorder: "border-blue-500/30",    iconText: "text-blue-400",    hoverBg: "hover:bg-blue-500/5",     hoverBorder: "hover:border-blue-500/30",    labelColor: "text-blue-400",    codeBg: "bg-blue-500/10 text-blue-400" },
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
        <div className="px-6 sm:px-10 lg:px-16 pt-12 sm:pt-16 lg:pt-20 pb-10">
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

      {/* === Modules grid 5x2 === */}
      <section className="relative flex-1">
        <div className="px-6 sm:px-10 lg:px-16 pb-16">
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
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Ufficio</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DashboardAmazon;
