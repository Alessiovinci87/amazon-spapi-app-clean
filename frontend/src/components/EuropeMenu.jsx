import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Package,
  FileText,
  Store,
  Star,
  ArrowRight,
  LogOut,
  Truck,
  History,
  Settings,
  Edit3,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const SECTIONS = [
  { to: "/europe/dashboard",       icon: Package,  label: "Magazzino & Alert", desc: "Inventario FBA, listing e alert per marketplace EU", accent: "indigo", code: "01" },
  { to: "/listing",                icon: FileText, label: "Listing",           desc: "Gestione annunci prodotti",                          accent: "blue",   code: "02" },
  { to: "/europe/listing-editor",  icon: Edit3,    label: "Editor Listing",    desc: "Modifica titoli, bullet e descrizioni su Amazon",    accent: "amber",  code: "03" },
  { to: "/marketplaces",           icon: Store,    label: "Marketplace",       desc: "Tutti i marketplace Europa",                         accent: "cyan",   code: "04" },
  { to: "/recensioni",             icon: Star,     label: "Recensioni",        desc: "Gestione feedback clienti",                          accent: "teal",   code: "05" },
];

const QUICK_LINKS = [
  { to: "/inventario", icon: Package,  label: "Inventario generale" },
  { to: "/spedizioni", icon: Truck,    label: "Spedizioni" },
  { to: "/storico",    icon: History,  label: "Storico" },
  { to: "/settings",   icon: Settings, label: "Impostazioni" },
];

const STATS = [
  { icon: Package,  label: "Prodotti",       accent: "indigo", code: "A" },
  { icon: FileText, label: "Listing attivi", accent: "blue",   code: "B" },
  { icon: Store,    label: "Marketplace",    accent: "cyan",   code: "C" },
  { icon: Star,     label: "Recensioni",     accent: "teal",   code: "D" },
];

const ACCENT_BG = {
  indigo: "group-hover:border-indigo-500/40 group-hover:bg-indigo-500/5",
  blue:   "group-hover:border-blue-500/40 group-hover:bg-blue-500/5",
  amber:  "group-hover:border-amber-500/40 group-hover:bg-amber-500/5",
  cyan:   "group-hover:border-cyan-500/40 group-hover:bg-cyan-500/5",
  teal:   "group-hover:border-teal-500/40 group-hover:bg-teal-500/5",
};
const ACCENT_ICON = {
  indigo: "group-hover:text-indigo-400 group-hover:border-indigo-500/40",
  blue:   "group-hover:text-blue-400 group-hover:border-blue-500/40",
  amber:  "group-hover:text-amber-400 group-hover:border-amber-500/40",
  cyan:   "group-hover:text-cyan-400 group-hover:border-cyan-500/40",
  teal:   "group-hover:text-teal-400 group-hover:border-teal-500/40",
};
const STAT_ACCENT = {
  indigo: "text-indigo-400",
  blue:   "text-blue-400",
  cyan:   "text-cyan-400",
  teal:   "text-teal-400",
};

function EuropeMenu() {
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

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
              title="Indietro"
              type="button"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center">
              <Globe className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-white">Europa</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Marketplace EU</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-blue-400 font-medium">9 paesi</span>
            </div>
            <button
              onClick={() => navigate("/")}
              className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
              title="Home"
              type="button"
            >
              <LogOut className="w-3.5 h-3.5" />
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-12 sm:pt-16 lg:pt-20 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-3">
              Modulo
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
              Europa <span className="text-slate-500">— marketplace europei.</span>
            </h1>
            <p className="mt-4 text-[15px] sm:text-base text-slate-400 leading-relaxed max-w-2xl">
              Inventario FBA, listing, marketplace e recensioni dei tuoi prodotti su Amazon Europa
              in un'unica dashboard centralizzata.
            </p>
          </motion.div>
        </div>
      </section>

      {/* === Stats === pannello unico, non clickabile, con stile data-display */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Panoramica
            </div>
            <div className="flex-1 h-px bg-slate-800/60" />
            <div className="text-[10px] font-mono text-slate-600">read-only</div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-slate-900/30 border border-dashed border-slate-800 rounded-lg overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/60">
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="relative px-5 py-4 flex items-center gap-4"
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${STAT_ACCENT[s.accent]} opacity-60`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5 truncate">
                        {s.label}
                      </div>
                      <div className={`text-2xl font-semibold tracking-tight tabular-nums ${STAT_ACCENT[s.accent]}`}>
                        —
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* === Sezioni === */}
      <section className="relative flex-1">
        <div className="px-6 sm:px-10 lg:px-16 pb-12">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Sezioni disponibili
            </div>
            <div className="text-[11px] font-mono text-slate-600">
              {String(SECTIONS.length).padStart(2, "0")} / {String(SECTIONS.length).padStart(2, "0")}
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {SECTIONS.map((m) => {
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

          {/* === Accesso rapido === */}
          <div className="mt-12">
            <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                  Accesso rapido
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                  Azioni frequenti
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Collegamenti veloci alle viste di consultazione.
                </p>
              </div>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {QUICK_LINKS.map((q) => {
                const Icon = q.icon;
                return (
                  <motion.button
                    key={q.to}
                    variants={itemVariants}
                    onClick={() => navigate(q.to)}
                    className="group flex items-center gap-3 px-4 py-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-md transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-md bg-slate-800/60 border border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:border-slate-600 transition-colors">
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors truncate">
                      {q.label}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Europa</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
}

export default EuropeMenu;
