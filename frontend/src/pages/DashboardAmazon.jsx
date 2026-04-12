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
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
};

const MODULES = [
  { to: "/europe",                 icon: Globe,      label: "Europa",       accent: "indigo"  },
  { to: "/magazzino",              icon: Package,    label: "Magazzino",    accent: "emerald" },
  { to: "/uffici/spedizioni",      icon: Truck,      label: "Spedizioni",   accent: "violet"  },
  { to: "/uffici/alert-center",    icon: Bell,       label: "Centro Alert", accent: "amber"   },
  { to: "/uffici/produzione",      icon: Wrench,     label: "Produzione",   accent: "rose"    },
  { to: "/uffici/ddt",             icon: FileText,   label: "DDT",          accent: "pink"    },
  { to: "/uffici/fornitori",       icon: Users,      label: "Fornitori",    accent: "orange"  },
  { to: "/fba-gestione-prodotti",  icon: Box,        label: "FBA Prodotti", accent: "cyan"    },
  { to: "/uffici/bilancio",        icon: DollarSign, label: "Bilancio",     accent: "teal"    },
  { to: "/uffici/vendite",         icon: TrendingUp, label: "Vendite",      accent: "blue"    },
];

const ACCENT = {
  indigo:  { bg: "bg-indigo-500/[0.08]",  border: "border-indigo-500/20",  hoverBg: "hover:bg-indigo-500/[0.15]", hoverBorder: "hover:border-indigo-500/40",  iconColor: "text-indigo-400",  hoverIcon: "group-hover:text-indigo-300",  label: "text-indigo-300",  hoverShadow: "hover:shadow-indigo-500/10"  },
  emerald: { bg: "bg-emerald-500/[0.08]", border: "border-emerald-500/20", hoverBg: "hover:bg-emerald-500/[0.15]", hoverBorder: "hover:border-emerald-500/40", iconColor: "text-emerald-400", hoverIcon: "group-hover:text-emerald-300", label: "text-emerald-300", hoverShadow: "hover:shadow-emerald-500/10" },
  violet:  { bg: "bg-violet-500/[0.08]",  border: "border-violet-500/20",  hoverBg: "hover:bg-violet-500/[0.15]", hoverBorder: "hover:border-violet-500/40",  iconColor: "text-violet-400",  hoverIcon: "group-hover:text-violet-300",  label: "text-violet-300",  hoverShadow: "hover:shadow-violet-500/10"  },
  amber:   { bg: "bg-amber-500/[0.08]",   border: "border-amber-500/20",   hoverBg: "hover:bg-amber-500/[0.15]",  hoverBorder: "hover:border-amber-500/40",   iconColor: "text-amber-400",   hoverIcon: "group-hover:text-amber-300",   label: "text-amber-300",   hoverShadow: "hover:shadow-amber-500/10"   },
  rose:    { bg: "bg-rose-500/[0.08]",    border: "border-rose-500/20",    hoverBg: "hover:bg-rose-500/[0.15]",   hoverBorder: "hover:border-rose-500/40",    iconColor: "text-rose-400",    hoverIcon: "group-hover:text-rose-300",    label: "text-rose-300",    hoverShadow: "hover:shadow-rose-500/10"    },
  pink:    { bg: "bg-pink-500/[0.08]",    border: "border-pink-500/20",    hoverBg: "hover:bg-pink-500/[0.15]",   hoverBorder: "hover:border-pink-500/40",    iconColor: "text-pink-400",    hoverIcon: "group-hover:text-pink-300",    label: "text-pink-300",    hoverShadow: "hover:shadow-pink-500/10"    },
  orange:  { bg: "bg-orange-500/[0.08]",  border: "border-orange-500/20",  hoverBg: "hover:bg-orange-500/[0.15]", hoverBorder: "hover:border-orange-500/40",  iconColor: "text-orange-400",  hoverIcon: "group-hover:text-orange-300",  label: "text-orange-300",  hoverShadow: "hover:shadow-orange-500/10"  },
  cyan:    { bg: "bg-cyan-500/[0.08]",    border: "border-cyan-500/20",    hoverBg: "hover:bg-cyan-500/[0.15]",   hoverBorder: "hover:border-cyan-500/40",    iconColor: "text-cyan-400",    hoverIcon: "group-hover:text-cyan-300",    label: "text-cyan-300",    hoverShadow: "hover:shadow-cyan-500/10"    },
  teal:    { bg: "bg-teal-500/[0.08]",    border: "border-teal-500/20",    hoverBg: "hover:bg-teal-500/[0.15]",   hoverBorder: "hover:border-teal-500/40",    iconColor: "text-teal-400",    hoverIcon: "group-hover:text-teal-300",    label: "text-teal-300",    hoverShadow: "hover:shadow-teal-500/10"    },
  blue:    { bg: "bg-blue-500/[0.08]",    border: "border-blue-500/20",    hoverBg: "hover:bg-blue-500/[0.15]",   hoverBorder: "hover:border-blue-500/40",    iconColor: "text-blue-400",    hoverIcon: "group-hover:text-blue-300",    label: "text-blue-300",    hoverShadow: "hover:shadow-blue-500/10"    },
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

      {/* === Hero compatto === */}
      <section className="relative">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 pt-14 sm:pt-20 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-3">
              Nexus
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Pannello <span className="text-slate-500">amministrativo</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Seleziona un modulo per iniziare
            </p>
          </motion.div>
        </div>
      </section>

      {/* === App launcher grid === */}
      <section className="relative flex-1 flex items-start justify-center">
        <div className="w-full max-w-3xl mx-auto px-6 sm:px-10 pb-16">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 sm:grid-cols-5 gap-4"
          >
            {MODULES.map((m) => {
              const Icon = m.icon;
              const a = ACCENT[m.accent];
              return (
                <motion.button
                  key={m.to}
                  variants={itemVariants}
                  onClick={() => navigate(m.to)}
                  className={`group relative flex flex-col items-center justify-center aspect-square rounded-2xl border ${a.bg} ${a.border} ${a.hoverBg} ${a.hoverBorder} ${a.hoverShadow} hover:shadow-lg transition-all duration-200 hover:scale-[1.04]`}
                >
                  <Icon className={`w-8 h-8 sm:w-9 sm:h-9 ${a.iconColor} ${a.hoverIcon} transition-colors mb-3`} />
                  <span className={`text-[11px] sm:text-xs font-semibold ${a.label} text-center leading-tight px-1`}>
                    {m.label}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Ufficio</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DashboardAmazon;
