import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

import {
  ShoppingCart,
  Lock,
  Warehouse,
  ArrowRight,
  Eye,
  EyeOff,
  LogIn,
  X,
  User,
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const { login, user, isAuthenticated, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  // Mini-login magazzino: username + password (più operatori distinti)
  const [showMagazzinoLogin, setShowMagazzinoLogin] = useState(false);
  const [magazzinoUsername, setMagazzinoUsername] = useState(
    () => localStorage.getItem("magazzino_last_username") || ""
  );
  const [magazzinoPassword, setMagazzinoPassword] = useState("");
  const [magazzinoError, setMagazzinoError] = useState("");
  const [magazzinoLoading, setMagazzinoLoading] = useState(false);

  const handleMagazzinoLogin = async (e) => {
    e.preventDefault();
    setMagazzinoError("");
    setMagazzinoLoading(true);
    try {
      const u = magazzinoUsername.trim();
      await login(u, magazzinoPassword);
      localStorage.setItem("magazzino_last_username", u);
      setShowMagazzinoLogin(false);
      setMagazzinoPassword("");
      navigate("/magazzino");
    } catch (err) {
      setMagazzinoError(err.message || "Credenziali non valide.");
    } finally {
      setMagazzinoLoading(false);
    }
  };

  // Se già autenticato, reindirizza in base al ruolo
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.ruolo === "magazzino") {
        navigate("/magazzino", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const loggedUser = await login(username, password);
      if (loggedUser.ruolo === "magazzino") {
        setShowLogin(false);
        navigate("/magazzino");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Errore di autenticazione.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">

      {/* ========== INITIAL SELECTION — split-screen ========== */}
      {!showLogin && (
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
                  onClick={() => { setMagazzinoError(""); setMagazzinoPassword(""); setShowMagazzinoLogin(true); }}
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

      {/* ========== MINI-LOGIN MAGAZZINO (solo password) ========== */}
      {showMagazzinoLogin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative bg-slate-900 border border-slate-800 rounded-lg w-full max-w-sm overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1">Accesso magazzino</div>
                <h2 className="text-base font-semibold text-white">Inserisci la password</h2>
              </div>
              <button
                type="button"
                onClick={() => { setShowMagazzinoLogin(false); setMagazzinoPassword(""); setMagazzinoError(""); }}
                className="w-8 h-8 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMagazzinoLogin} className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                  Username operatore
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={magazzinoUsername}
                    onChange={(e) => setMagazzinoUsername(e.target.value)}
                    autoFocus
                    autoComplete="username"
                    className="w-full px-3 py-2 pl-10 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                    placeholder="es. magazzino, guido, david…"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={magazzinoPassword}
                    onChange={(e) => setMagazzinoPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full px-3 py-2 pl-10 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                    placeholder="••••••••"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                </div>
              </div>

              {magazzinoError && (
                <div className="px-3 py-2 rounded-md bg-rose-500/5 border border-rose-500/30">
                  <p className="text-xs text-rose-300">{magazzinoError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={magazzinoLoading || !magazzinoUsername.trim() || !magazzinoPassword}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-sm font-medium transition-all disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {magazzinoLoading ? "Accesso in corso…" : "Entra in magazzino"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Home;