import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
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
  Wrench
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLogged, setIsLogged] = useState(false);
  const [isMagazzino, setIsMagazzino] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAmazonAccess = () => {
    localStorage.clear();       // <- AGGIUNGI QUESTO
    localStorage.setItem("auth", "amazon");
    localStorage.setItem("role", "ufficio");
    setIsLogged(true);
  };

  /* const handleAmazonAccess = () => {
    const PASSWORD = import.meta.env.VITE_AMAZON_PASSWORD;

    if (password === PASSWORD) {
      localStorage.setItem("auth", "amazon");
      setIsLogged(true);
    } else {
      setError("Credenziali errate");
    }
  }; */

  const handleMagazzinoAccess = () => {
    localStorage.clear();       // <- AGGIUNGI QUESTO
    localStorage.setItem("auth", "magazzino");
    localStorage.setItem("role", "magazzino");
    setIsMagazzino(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-zinc-950 text-white overflow-hidden px-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-zinc-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-3xl"
      >

        {/* ========== INITIAL SELECTION ========== */}
        {!isLogged && !isMagazzino && !showLogin && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            {/* Logo Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <ShoppingCart className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text mb-2">
                Amazon SP-API Dashboard
              </h1>
              <p className="text-zinc-400">Gestione completa del tuo business Amazon</p>
            </div>

            <div className="space-y-4">
              <p className="text-zinc-300 text-center mb-6">Seleziona l'area a cui desideri accedere</p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMagazzinoAccess}
                className="group w-full flex items-center justify-between p-6 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
                    <Warehouse className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white">Accesso Magazzino</p>
                    <p className="text-sm text-emerald-100">Gestione inventario e spedizioni</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
              </motion.button>




              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowLogin(true)}
                className="group w-full flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 rounded-xl shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
                    <Lock className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white">Accesso Amazon</p>
                    <p className="text-sm text-purple-100">Dashboard completa SP-API</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </div>
        )}

        {/* ========== LOGIN FORM ========== */}
        {showLogin && !isLogged && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Accesso Amazon</h2>
                  <p className="text-sm text-zinc-400">Inserisci le credenziali</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setPassword("");
                  setError("");
                }}
                className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAmazonAccess()}
                    className="w-full px-4 py-3 pr-12 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="Inserisci password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {error && (
                  <p className="text-red-400 text-sm mt-2 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">!</span>
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleAmazonAccess}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 rounded-lg px-6 py-3 font-semibold transition-all"
              >
                <LogIn className="w-5 h-5" />
                Accedi
              </button>
            </div>
          </div>
        )}

        {/* ========== AMAZON DASHBOARD ========== */}
        {isLogged && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Dashboard Amazon</h2>
              <p className="text-zinc-400">Seleziona la sezione da gestire</p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/europe")}
                className="group flex items-center gap-4 p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-blue-500/50 rounded-xl transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-white">Europa</p>
                  <p className="text-sm text-zinc-400">SP-API Dashboard</p>
                </div>
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/inventario")}
                className="group flex items-center gap-4 p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-emerald-500/50 rounded-xl transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-white">Inventario</p>
                  <p className="text-sm text-zinc-400">Gestione merce</p>
                </div>
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/spedizioni")}
                className="group flex items-center gap-4 p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-purple-500/50 rounded-xl transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Truck className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-white">Spedizioni</p>
                  <p className="text-sm text-zinc-400">Logistica</p>
                </div>
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/bilancio")}
                className="group flex items-center gap-4 p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-yellow-500/50 rounded-xl transition-all"
              >

                <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-white">Gestione Bilancio</p>
                  <p className="text-sm text-zinc-400">Valore magazzino e costi</p>
                </div>
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/gestione-produzione")}
                className="group flex items-center gap-4 p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-red-500/50 rounded-xl transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wrench className="w-6 h-6 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-white">Gestione Produzione</p>
                  <p className="text-sm text-zinc-400">Prenotazioni & Produzioni</p>
                </div>
              </motion.button>


              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/ddt-index")}
                className="group flex items-center gap-4 p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-pink-500/50 rounded-xl transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-pink-400" />
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-white">Genera DDT</p>
                  <p className="text-sm text-zinc-400">Documenti</p>
                </div>
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/fornitori")}
                className="group flex items-center gap-4 p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-yellow-500/50 rounded-xl transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-white">Fornitori</p>
                  <p className="text-sm text-zinc-400">Gestione</p>
                </div>
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/fba-gestione-prodotti")}
                className="group flex items-center gap-4 p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-orange-500/50 rounded-xl transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Box className="w-6 h-6 text-orange-400" />
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-white">FBA Prodotti</p>
                  <p className="text-sm text-zinc-400">Amazon FBA</p>
                </div>
              </motion.button>
            </motion.div>
          </div>
        )}

        {/* ========== MAGAZZINO DASHBOARD ========== */}
        {isMagazzino && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Warehouse className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Dashboard Magazzino</h2>
              <p className="text-zinc-400">Accesso rapido alle funzionalità</p>
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
                className="group w-full flex items-center justify-between p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-emerald-500/50 rounded-xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Warehouse className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white">Magazzino</p>
                    <p className="text-sm text-zinc-400">Gestione completa magazzino</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-zinc-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/inventario")}
                className="group w-full flex items-center justify-between p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-blue-500/50 rounded-xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Package className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white">Inventario</p>
                    <p className="text-sm text-zinc-400">Gestione prodotti e giacenze</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-zinc-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </motion.button>



              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/spedizioni")}
                className="group w-full flex items-center justify-between p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-purple-500/50 rounded-xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Truck className="w-7 h-7 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white">Spedizioni</p>
                    <p className="text-sm text-zinc-400">Gestione spedizioni e tracking</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-zinc-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => navigate("/ddt-index")}
                className="group w-full flex items-center justify-between p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-pink-500/50 rounded-xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-7 h-7 text-pink-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white">Genera DDT</p>
                    <p className="text-sm text-zinc-400">Documenti di trasporto</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-zinc-400 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
              </motion.button>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Home;