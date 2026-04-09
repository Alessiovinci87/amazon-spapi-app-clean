import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [isMagazzino, setIsMagazzino] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

 

  const handleAmazonAccess = () => {
    localStorage.clear();
    localStorage.setItem("auth", "amazon");
    localStorage.setItem("role", "ufficio");
    navigate("/dashboard");
  };

  const handleMagazzinoAccess = () => {
    localStorage.clear();
    localStorage.setItem("auth", "magazzino");
    localStorage.setItem("role", "magazzino");
    setIsMagazzino(true);
  };

  // 🔹 Funzione per tornare alla selezione iniziale
  const handleBackToSelection = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("role");
    setIsMagazzino(false);
    setShowLogin(false);
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
    <div className="relative flex items-center justify-center min-h-screen bg-zinc-950 text-white overflow-hidden px-4 py-8">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-purple-900/10 to-zinc-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-5xl"
      >

        {/* ========== INITIAL SELECTION ========== */}
        {!isMagazzino && !showLogin && (
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-10 shadow-2xl">
            {/* Logo Header with enhanced styling */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative inline-block mb-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
                  <ShoppingCart className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl font-extrabold mb-3"
              >
                <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                  Nexus
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-zinc-400"
              >
                Sistema di gestione completo per il tuo business Amazon
              </motion.p>
            </div>

            <div className="space-y-5">
              <p className="text-zinc-300 text-center mb-8 text-lg font-medium">Seleziona l'area a cui desideri accedere</p>

              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMagazzinoAccess}
                className="group w-full flex items-center justify-between p-8 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Warehouse className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-white mb-1">Accesso Magazzino</p>
                    <p className="text-emerald-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Gestione inventario, produzione e spedizioni
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-7 h-7 text-white group-hover:translate-x-2 transition-transform relative z-10" />
              </motion.button>

              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowLogin(true)}
                className="group w-full flex items-center justify-between p-8 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-white mb-1">Accesso Amazon</p>
                    <p className="text-purple-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Dashboard completa SP-API e analytics
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-7 h-7 text-white group-hover:translate-x-2 transition-transform relative z-10" />
              </motion.button>
            </div>
          </div>
        )}

        {/* ========== LOGIN FORM ========== */}
        {showLogin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-10 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Accesso Amazon</h2>
                  <p className="text-zinc-400">Inserisci le credenziali di accesso</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setPassword("");
                  setError("");
                }}
                className="w-12 h-12 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors group"
              >
                <X className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-3">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAmazonAccess()}
                    className="w-full px-5 py-4 pr-14 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-lg"
                    placeholder="Inserisci la password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </button>
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-xs">!</span>
                    {error}
                  </motion.p>
                )}
              </div>

              <button
                onClick={handleAmazonAccess}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 rounded-xl px-6 py-4 font-bold text-lg transition-all shadow-lg hover:shadow-xl group"
              >
                <LogIn className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                Accedi alla Dashboard
              </button>
            </div>
          </motion.div>
        )}

        {/* ========== MAGAZZINO DASHBOARD ========== */}
        {isMagazzino && (
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-10 shadow-2xl">
            

            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="relative inline-block mb-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl">
                  <Warehouse className="w-10 h-10 text-white" />
                </div>
              </motion.div>

              <h2 className="text-4xl font-extrabold text-white mb-3">Dashboard Magazzino</h2>
              <p className="text-zinc-400 text-lg">Accesso rapido alle funzionalità operative</p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/magazzino")}
                className="group w-full flex items-center justify-between p-7 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-emerald-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Warehouse className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white mb-1">Magazzino</p>
                    <p className="text-sm text-zinc-400">Gestione completa magazzino e giacenze</p>
                  </div>
                </div>
                <ArrowRight className="w-7 h-7 text-zinc-400 group-hover:text-emerald-400 group-hover:translate-x-2 transition-all" />
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/magazzino/inventario")}
                className="group w-full flex items-center justify-between p-7 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-blue-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Package className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white mb-1">Inventario</p>
                    <p className="text-sm text-zinc-400">Gestione prodotti e controllo giacenze</p>
                  </div>
                </div>
                <ArrowRight className="w-7 h-7 text-zinc-400 group-hover:text-blue-400 group-hover:translate-x-2 transition-all" />
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/magazzino/spedizioni")}
                className="group w-full flex items-center justify-between p-7 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-purple-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Truck className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white mb-1">Spedizioni</p>
                    <p className="text-sm text-zinc-400">Gestione spedizioni e tracking</p>
                  </div>
                </div>
                <ArrowRight className="w-7 h-7 text-zinc-400 group-hover:text-purple-400 group-hover:translate-x-2 transition-all" />
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/magazzino/produzione")}
                className="group w-full flex items-center justify-between p-7 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-pink-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-pink-500/10"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-8 h-8 text-pink-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white mb-1">Produzione</p>
                    <p className="text-sm text-zinc-400">Gestione produzione e lavorazioni</p>
                  </div>
                </div>
                <ArrowRight className="w-7 h-7 text-zinc-400 group-hover:text-pink-400 group-hover:translate-x-2 transition-all" />
              </motion.button>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Home;