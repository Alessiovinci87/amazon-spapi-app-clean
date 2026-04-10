import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

import {
  ShoppingCart,
  Package,
  Truck,
  FileText,
  Users,
  Box,
  Globe,
  Lock,
  Warehouse,
  ArrowRight,
  Eye,
  EyeOff,
  LogIn,
  X,
  Wrench,
  DollarSign,
  BarChart3,
  TrendingUp,
  Sparkles,
  Home as HomeIcon,
  LogOut,
  User,
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const { login, logout, user, isAuthenticated, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [isMagazzino, setIsMagazzino] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Se già autenticato, reindirizza in base al ruolo
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.ruolo === "magazzino") {
        setIsMagazzino(true);
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const loggedUser = await login(username, password);
      if (loggedUser.ruolo === "magazzino") {
        setIsMagazzino(true);
        setShowLogin(false);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Errore di autenticazione.");
    }
  };

  // 🔹 Funzione per tornare alla selezione iniziale
  const handleBackToSelection = () => {
    logout();
    setIsMagazzino(false);
    setShowLogin(false);
    setUsername("");
    setPassword("");
    setError("");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">

      {/* ========== INITIAL SELECTION — split-screen ========== */}
      {!isMagazzino && !showLogin && (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">

          {/* === Brand panel === */}
          <aside className="relative flex flex-col justify-between bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 px-6 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
            {/* Texture grid sottile */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Top: brand */}
            <div className="relative flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-indigo-500/10 border border-indigo-500/40 flex items-center justify-center">
                <ShoppingCart className="w-[18px] h-[18px] text-indigo-400" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-semibold tracking-tight text-white">Nexus</span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Operations Platform</span>
              </div>
            </div>

            {/* Center: claim */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative max-w-xl my-12 lg:my-0"
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
                Gestione operativa<br />
                <span className="text-slate-400">unificata.</span>
              </h1>
              <p className="mt-5 text-[15px] sm:text-base text-slate-400 leading-relaxed max-w-md">
                Inventario, produzione, spedizioni e marketplace Amazon in un'unica piattaforma.
                Strumenti pensati per chi lavora ogni giorno con i numeri reali.
              </p>

              <div className="mt-10 grid grid-cols-3 gap-px bg-slate-800 border border-slate-800 rounded-lg overflow-hidden max-w-md">
                {[
                  { k: "FBA", v: "9 paesi" },
                  { k: "Moduli", v: "Custom" },
                  { k: "Real-time", v: "Alert" },
                ].map((x) => (
                  <div key={x.k} className="bg-slate-900 px-3 py-3 text-center">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500">{x.k}</div>
                    <div className="text-sm font-medium text-slate-200 mt-0.5">{x.v}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Bottom: meta */}
            <div className="relative flex items-center justify-between text-[11px] text-slate-600">
              <span>© {new Date().getFullYear()} Nexus</span>
              <span className="font-mono">v2.0</span>
            </div>
          </aside>

          {/* === Access panel === */}
          <main className="flex items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-16">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="w-full max-w-md"
            >
              <div className="mb-8">
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
                  Accesso
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                  Seleziona la tua area di lavoro
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  Le funzionalità disponibili dipendono dal ruolo selezionato.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setShowLogin(true)}
                  className="group w-full flex items-center gap-4 px-5 py-4 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/5 transition-colors">
                    <Warehouse className="w-[18px] h-[18px] text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">Magazzino</span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">Operatore</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      Inventario, produzione, spedizioni
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>

                <button
                  onClick={() => setShowLogin(true)}
                  className="group w-full flex items-center gap-4 px-5 py-4 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:border-indigo-500/40 group-hover:bg-indigo-500/5 transition-colors">
                    <Lock className="w-[18px] h-[18px] text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">Ufficio / Admin</span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">Login</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      Dashboard, analytics, gestione completa
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Hai problemi di accesso? Contatta l'amministratore di sistema.
                </p>
              </div>
            </motion.div>
          </main>
        </div>
      )}

      {/* ========== MAGAZZINO DASHBOARD — full-page ========== */}
      {isMagazzino && (
        <div className="relative min-h-screen flex flex-col">
          {/* Texture grid sottile sull'intera pagina */}
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
            <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
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
                  onClick={handleBackToSelection}
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                  title="Torna alla selezione"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Esci</span>
                </button>
              </div>
            </div>
          </header>

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
                  Operazioni di <span className="text-slate-500">magazzino.</span>
                </h1>
                <p className="mt-4 text-[15px] sm:text-base text-slate-400 leading-relaxed max-w-2xl">
                  Tutto ciò che serve per gestire giacenze, lavorazioni e spedizioni quotidiane.
                  Seleziona uno dei moduli sottostanti per iniziare.
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
                <div className="text-[11px] font-mono text-slate-600">03 / 03</div>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                {[
                  {
                    to: "/magazzino",
                    icon: Warehouse,
                    label: "Magazzino",
                    desc: "Giacenze, ubicazioni e movimentazioni",
                    accent: "emerald",
                    code: "01",
                  },
                  {
                    to: "/magazzino/spedizioni",
                    icon: Truck,
                    label: "Spedizioni",
                    desc: "DDT, tracking e partenze",
                    accent: "violet",
                    code: "02",
                  },
                  {
                    to: "/magazzino/produzione",
                    icon: FileText,
                    label: "Produzione",
                    desc: "Lavorazioni e ordini di produzione",
                    accent: "rose",
                    code: "03",
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  const accentMap = {
                    emerald: "group-hover:border-emerald-500/40 group-hover:bg-emerald-500/5",
                    blue:    "group-hover:border-blue-500/40 group-hover:bg-blue-500/5",
                    violet:  "group-hover:border-violet-500/40 group-hover:bg-violet-500/5",
                    rose:    "group-hover:border-rose-500/40 group-hover:bg-rose-500/5",
                  };
                  const iconAccent = {
                    emerald: "group-hover:text-emerald-400 group-hover:border-emerald-500/40",
                    blue:    "group-hover:text-blue-400 group-hover:border-blue-500/40",
                    violet:  "group-hover:text-violet-400 group-hover:border-violet-500/40",
                    rose:    "group-hover:text-rose-400 group-hover:border-rose-500/40",
                  };
                  return (
                    <motion.button
                      key={m.to}
                      variants={itemVariants}
                      onClick={() => navigate(m.to)}
                      className={`group relative flex flex-col items-start text-left p-5 sm:p-6 bg-slate-900/60 border border-slate-800 rounded-lg transition-all hover:bg-slate-900 ${accentMap[m.accent]}`}
                    >
                      <div className="flex items-center justify-between w-full mb-6">
                        <div className={`w-11 h-11 rounded-md bg-slate-800/60 border border-slate-700 flex items-center justify-center transition-colors ${iconAccent[m.accent]}`}>
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
              <span>© {new Date().getFullYear()} Nexus · Operatore</span>
              <span className="font-mono">v2.0</span>
            </div>
          </footer>
        </div>
      )}

      {/* ========== LOGIN AMAZON — split-screen ========== */}
      {showLogin && (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">

          {/* === Brand panel === */}
          <aside className="relative flex flex-col justify-between bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 px-6 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Top: brand */}
            <div className="relative flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-indigo-500/10 border border-indigo-500/40 flex items-center justify-center">
                <Lock className="w-[18px] h-[18px] text-indigo-400" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-semibold tracking-tight text-white">Nexus</span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Amazon SP-API</span>
              </div>
            </div>

            {/* Center: claim */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative max-w-xl my-12 lg:my-0"
            >
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-5">
                <Lock className="w-3 h-3 text-indigo-400" />
                <span className="text-[11px] uppercase tracking-[0.12em] text-indigo-400 font-medium">Area riservata</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
                Dashboard<br />
                <span className="text-slate-400">amministrativa.</span>
              </h1>
              <p className="mt-5 text-[15px] sm:text-base text-slate-400 leading-relaxed max-w-md">
                Accesso completo a inventario marketplace, listing, prezzi, alert e analytics
                multi-paese. L'autenticazione è richiesta per ogni sessione.
              </p>

              <div className="mt-10 grid grid-cols-3 gap-px bg-slate-800 border border-slate-800 rounded-lg overflow-hidden max-w-md">
                {[
                  { k: "Auth", v: "JWT" },
                  { k: "Sessione", v: "8 ore" },
                  { k: "Ruoli", v: "3 livelli" },
                ].map((x) => (
                  <div key={x.k} className="bg-slate-900 px-3 py-3 text-center">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500">{x.k}</div>
                    <div className="text-sm font-medium text-slate-200 mt-0.5">{x.v}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Bottom: meta */}
            <div className="relative flex items-center justify-between text-[11px] text-slate-600">
              <span>© {new Date().getFullYear()} Nexus</span>
              <span className="font-mono">v2.0</span>
            </div>
          </aside>

          {/* === Form panel === */}
          <main className="flex items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-16">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="w-full max-w-md"
            >
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
                    Autenticazione
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                    Accedi al tuo account
                  </h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Inserisci le credenziali per accedere alla piattaforma.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowLogin(false);
                    setPassword("");
                    setError("");
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                  title="Chiudi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                      className="w-full px-4 py-3 pl-11 rounded-md bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                      placeholder="admin"
                    />
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 rounded-md bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md bg-rose-500/5 border border-rose-500/30"
                    >
                      <span className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-rose-300 leading-relaxed">{error}</span>
                    </motion.div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/40 hover:border-indigo-400/60 text-indigo-300 hover:text-indigo-200 rounded-md px-4 py-3 text-sm font-medium transition-all disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? "Accesso in corso…" : "Accedi"}
                  {!loading && <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Hai dimenticato la password? Contatta l'amministratore di sistema per il reset.
                </p>
              </div>
            </motion.div>
          </main>
        </div>
      )}
    </div>
  );
};

export default Home;