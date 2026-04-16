import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Package,
  Boxes,
  Tag,
  Sticker,
  Truck,
  FileText,
  Factory,
  Beaker,
  ArrowRight,
  Archive,
  TrendingUp,
  Clock,
  Zap,
  LogOut,
  Warehouse,
  Settings,
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

// Sezioni → moduli
const SECTIONS = [
  {
    eyebrow: "Inventario",
    title: "Materiali e prodotti",
    subtitle: "Gestione di catalogo, accessori e materiali di consumo.",
    columns: "sm:grid-cols-2 lg:grid-cols-5",
    items: [
      { to: "/inventario", icon: Package, label: "Prodotti",  desc: "Catalogo e giacenze",   accent: "emerald", code: "01" },
      { to: "/uffici/inventario?sezione=accessori",  icon: Boxes,   label: "Accessori", desc: "Componenti e ricambi", accent: "emerald", code: "02" },
      { to: "/scatolette", icon: Tag,     label: "Scatolette", desc: "Imballaggi",           accent: "emerald", code: "03" },
      { to: "/etichette",  icon: Sticker, label: "Etichette", desc: "Label e marcatori",    accent: "emerald", code: "04" },
      { to: "/sfuso",      icon: Beaker,  label: "Sfuso",     desc: "Materie prime liquide", accent: "emerald", code: "05" },
    ],
  },
  {
    eyebrow: "Logistica",
    title: "Spedizioni e documenti",
    subtitle: "Gestione delle uscite e generazione DDT.",
    columns: "sm:grid-cols-2",
    items: [
      { to: "/magazzino/spedizioni", icon: Truck, label: "Spedizioni", desc: "Tracking e gestione uscite", accent: "blue", code: "06" },
      { to: "/ddt-index",  icon: FileText, label: "Genera DDT", desc: "Documenti di trasporto",      accent: "blue", code: "07" },
    ],
  },
  {
    eyebrow: "Produzione",
    title: "Lavorazioni",
    subtitle: "Pianificazione e monitoraggio dei processi produttivi.",
    columns: "sm:grid-cols-2",
    items: [
      { to: "/magazzino/produzione", icon: Factory, label: "Gestione Produzione", desc: "Gestisci prenotazioni e produzioni", accent: "violet", code: "08" },
    ],
  },
];

const QUICK_LINKS = [
  { to: "/storico",                  icon: FileText, label: "Storico Movimenti" },
  { to: "/storico-sfuso",            icon: Beaker,   label: "Storico Sfuso" },
  { to: "/storico-produzioni-sfuso", icon: Package,  label: "Storico Produzioni" },
  { to: "/settings",                 icon: Settings, label: "Impostazioni" },
];

const ACCENT_BG = {
  emerald: "group-hover:border-emerald-500/40 group-hover:bg-emerald-500/5",
  blue:    "group-hover:border-blue-500/40 group-hover:bg-blue-500/5",
  violet:  "group-hover:border-violet-500/40 group-hover:bg-violet-500/5",
};
const ACCENT_ICON = {
  emerald: "group-hover:text-emerald-400 group-hover:border-emerald-500/40",
  blue:    "group-hover:text-blue-400 group-hover:border-blue-500/40",
  violet:  "group-hover:text-violet-400 group-hover:border-violet-500/40",
};

const Magazzino = () => {
  const navigate = useNavigate();
  const isMagazzinoAuth = localStorage.getItem("auth") === "magazzino";

  const [stats, setStats] = useState({
    prodottiTotali: 0,
    spedizioniAttive: 0,
    produzioniAttive: 0,
  });

  useEffect(() => {
    fetch("/api/statistiche")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Errore statistiche:", err));
  }, []);

  const handleBack = () => navigate(isMagazzinoAuth ? "/" : "/dashboard");

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
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
              <Warehouse className="w-[18px] h-[18px] text-emerald-400" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-white">Nexus</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Warehouse Module</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-emerald-400 font-medium">Sessione attiva</span>
            </div>
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
              title="Torna indietro"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Esci</span>
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
              Magazzino
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
              Centro di <span className="text-slate-500">controllo operativo.</span>
            </h1>
            <p className="mt-4 text-[15px] sm:text-base text-slate-400 leading-relaxed max-w-2xl">
              Inventario, logistica e produzione in un'unica vista. Tutti gli strumenti
              per gestire le operazioni quotidiane.
            </p>
          </motion.div>
        </div>
      </section>

      {/* === Stats === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pb-10">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-5">
            Panoramica
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <StatCard
              icon={Package}
              label="Prodotti totali"
              value={stats.prodottiTotali}
              hint="+12% questo mese"
              hintIcon={TrendingUp}
              accent="emerald"
              code="A"
            />
            <StatCard
              icon={Truck}
              label="Spedizioni attive"
              value={stats.spedizioniAttive}
              hint="In elaborazione"
              hintIcon={Clock}
              accent="blue"
              code="B"
            />
            <StatCard
              icon={Factory}
              label="In produzione"
              value={stats.produzioniAttive}
              hint="Lavorazione attiva"
              hintIcon={Zap}
              accent="violet"
              code="C"
            />
          </motion.div>
        </div>
      </section>

      {/* === Sezioni di moduli === */}
      <section className="relative flex-1">
        <div className="px-6 sm:px-10 lg:px-16 pb-16 space-y-12">
          {SECTIONS.map((sec) => (
            <div key={sec.title}>
              <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                    {sec.eyebrow}
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                    {sec.title}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{sec.subtitle}</p>
                </div>
                <div className="text-[11px] font-mono text-slate-600">
                  {String(sec.items.length).padStart(2, "0")} {sec.items.length === 1 ? "modulo" : "moduli"}
                </div>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className={`grid grid-cols-1 ${sec.columns} gap-3`}
              >
                {sec.items.map((m) => {
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
          ))}

          {/* === Accesso rapido === */}
          <div>
            <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                  Accesso rapido
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                  Storici e impostazioni
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Collegamenti veloci alle viste di consultazione.
                </p>
              </div>
              <Archive className="w-4 h-4 text-slate-700" />
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
          <span>© {new Date().getFullYear()} Nexus · Magazzino</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

// === StatCard ===
const STAT_ACCENT = {
  emerald: { dot: "bg-emerald-400", text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
  blue:    { dot: "bg-blue-400",    text: "text-blue-400",    border: "border-blue-500/30",    bg: "bg-blue-500/5" },
  violet:  { dot: "bg-violet-400",  text: "text-violet-400",  border: "border-violet-500/30",  bg: "bg-violet-500/5" },
};

function StatCard({ icon: Icon, label, value, hint, hintIcon: HintIcon, accent, code }) {
  const a = STAT_ACCENT[accent];
  return (
    <motion.div
      variants={itemVariants}
      className="relative bg-slate-900/60 border border-slate-800 rounded-lg p-5 sm:p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className={`w-10 h-10 rounded-md bg-slate-800/60 border border-slate-700 flex items-center justify-center`}>
          <Icon className={`w-[18px] h-[18px] ${a.text}`} />
        </div>
        <span className="text-[10px] font-mono text-slate-600">{code}</span>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-3 tabular-nums">
        {value}
      </div>
      <div className={`inline-flex items-center gap-1.5 text-[11px] ${a.text}`}>
        <HintIcon className="w-3 h-3" />
        <span>{hint}</span>
      </div>
    </motion.div>
  );
}

export default Magazzino;
