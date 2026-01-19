import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

import {
  Package,
  Boxes,
  Tag,
  Sticker,
  Truck,
  FileText,
  Factory,
  Home,
  Beaker,
  ArrowRight,
  Archive,
  TrendingUp,
  BarChart3,
  Clock,
  Sparkles,
  Zap,
  ChevronRight,
} from "lucide-react";

import { useEffect, useState } from "react";

const Magazzino = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMagazzinoAuth = localStorage.getItem("auth") === "magazzino";

  const [stats, setStats] = useState({
    prodottiTotali: 0,
    spedizioniAttive: 0,
    produzioniAttive: 0,
  });

  useEffect(() => {
    fetch("http://localhost:3005/api/statistiche")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Errore statistiche:", err));
  }, []);

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

  const cardHover = {
    scale: 1.03,
    y: -4,
    transition: { duration: 0.2 },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 md:px-8 py-8">
      <div className="max-w-8xl mx-auto space-y-8">

        {/* ========== HEADER CON GRADIENT ========== */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-2xl border border-zinc-800/50 p-8 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-2xl">
                  <Package className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <div>
                <h1 className="text-4xl font-extrabold text-white mb-1">Dashboard Magazzino</h1>
                <p className="text-zinc-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Centro di controllo operativo
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(isMagazzinoAuth ? "/" : "/dashboard")}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-xl text-white font-medium transition-all backdrop-blur-sm"
            >
              <Home className="w-5 h-5" />
              Torna Indietro
            </button>
          </div>
        </motion.div>

        {/* ========== STATISTICHE CON GRADIENTI ========== */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          <motion.div 
            variants={itemVariants}
            className="relative overflow-hidden bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-700/30 rounded-2xl p-6 hover:shadow-lg hover:shadow-emerald-900/20 transition-all group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-400">
                  ATTIVO
                </div>
              </div>
              <p className="text-zinc-400 text-sm mb-1">Prodotti Totali</p>
              <p className="text-4xl font-extrabold text-white mb-3">
                {stats.prodottiTotali}
              </p>
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span>+12% questo mese</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="relative overflow-hidden bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/30 rounded-2xl p-6 hover:shadow-lg hover:shadow-blue-900/20 transition-all group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Truck className="w-7 h-7 text-blue-400" />
                </div>
                <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-semibold text-blue-400">
                  IN CORSO
                </div>
              </div>
              <p className="text-zinc-400 text-sm mb-1">Spedizioni Attive</p>
              <p className="text-4xl font-extrabold text-white mb-3">
                {stats.spedizioniAttive}
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <Clock className="w-4 h-4" />
                <span>In elaborazione</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="relative overflow-hidden bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-6 hover:shadow-lg hover:shadow-purple-900/20 transition-all group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-purple-500/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Factory className="w-7 h-7 text-purple-400" />
                </div>
                <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs font-semibold text-purple-400">
                  ATTIVO
                </div>
              </div>
              <p className="text-zinc-400 text-sm mb-1">In Produzione</p>
              <p className="text-4xl font-extrabold text-white mb-3">
                {stats.produzioniAttive}
              </p>
              <div className="flex items-center gap-2 text-sm text-purple-400">
                <Zap className="w-4 h-4" />
                <span>Lavorazione attiva</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ========== SEZIONE MAGAZZINO CON CARD MIGLIORATE ========== */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Gestione Magazzino</h2>
                <p className="text-sm text-zinc-400">Inventario e materiali di consumo</p>
              </div>
            </div>
            <BarChart3 className="w-6 h-6 text-zinc-600" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/inventario")}
              className="group relative overflow-hidden bg-zinc-800/50 border border-zinc-700/50 hover:border-emerald-500/50 rounded-xl p-6 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all" />
              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 group-hover:scale-110 transition-all">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Prodotti</p>
                  <p className="text-xs text-zinc-400 mt-1">Gestisci inventario</p>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.button>

            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/accessori")}
              className="group relative overflow-hidden bg-zinc-800/50 border border-zinc-700/50 hover:border-emerald-500/50 rounded-xl p-6 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all" />
              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 group-hover:scale-110 transition-all">
                  <Boxes className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Accessori</p>
                  <p className="text-xs text-zinc-400 mt-1">Componenti extra</p>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.button>

            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/scatolette")}
              className="group relative overflow-hidden bg-zinc-800/50 border border-zinc-700/50 hover:border-emerald-500/50 rounded-xl p-6 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all" />
              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 group-hover:scale-110 transition-all">
                  <Tag className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Scatolette</p>
                  <p className="text-xs text-zinc-400 mt-1">Contenitori</p>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.button>

            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/etichette")}
              className="group relative overflow-hidden bg-zinc-800/50 border border-zinc-700/50 hover:border-emerald-500/50 rounded-xl p-6 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all" />
              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 group-hover:scale-110 transition-all">
                  <Sticker className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Etichette</p>
                  <p className="text-xs text-zinc-400 mt-1">Label e tag</p>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.button>

            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/sfuso")}
              className="group relative overflow-hidden bg-zinc-800/50 border border-zinc-700/50 hover:border-emerald-500/50 rounded-xl p-6 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all" />
              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 group-hover:scale-110 transition-all">
                  <Beaker className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Sfuso</p>
                  <p className="text-xs text-zinc-400 mt-1">Materiale liquido</p>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* ========== SEZIONI LOGISTICA E PRODUZIONE SIDE BY SIDE ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LOGISTICA */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Logistica</h2>
                <p className="text-sm text-zinc-400">Spedizioni e documenti</p>
              </div>
            </div>

            <div className="space-y-4">
              <motion.button
                variants={itemVariants}
                whileHover={cardHover}
                onClick={() => navigate("/spedizioni")}
                className="group w-full relative overflow-hidden bg-zinc-800/50 border border-zinc-700/50 hover:border-blue-500/50 rounded-xl p-6 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-blue-500/10 transition-all" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 group-hover:scale-110 transition-all">
                      <Truck className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white text-lg">Gestione Spedizioni</p>
                      <p className="text-sm text-zinc-400 mt-1">Traccia e gestisci le spedizioni</p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-blue-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.button>

              <motion.button
                variants={itemVariants}
                whileHover={cardHover}
                onClick={() => navigate("/ddt-index")}
                className="group w-full relative overflow-hidden bg-zinc-800/50 border border-zinc-700/50 hover:border-blue-500/50 rounded-xl p-6 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-blue-500/10 transition-all" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 group-hover:scale-110 transition-all">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white text-lg">Genera DDT</p>
                      <p className="text-sm text-zinc-400 mt-1">Documenti di trasporto</p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-blue-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.button>
            </div>
          </motion.div>

          {/* PRODUZIONE */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Factory className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Produzione</h2>
                <p className="text-sm text-zinc-400">Processi produttivi</p>
              </div>
            </div>

            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/gestione-produzione")}
              className="group w-full relative overflow-hidden bg-zinc-800/50 border border-zinc-700/50 hover:border-purple-500/50 rounded-xl p-6 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-purple-500/10 transition-all" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/30 group-hover:scale-110 transition-all">
                    <Factory className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-lg">Gestione Produzione</p>
                    <p className="text-sm text-zinc-400 mt-1">Pianifica e monitora la produzione</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-purple-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.button>

            {/* Spazio per futuri pulsanti produzione */}
            <div className="mt-4 p-6 bg-zinc-800/30 border border-zinc-700/30 rounded-xl">
              <p className="text-sm text-zinc-500 text-center flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Altre funzioni in arrivo
              </p>
            </div>
          </motion.div>
        </div>

        {/* ========== LINK RAPIDI RIDISEGNATI ========== */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Archive className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Accesso Rapido</h3>
              <p className="text-sm text-zinc-400">Storici e impostazioni</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.button
              variants={itemVariants}
              onClick={() => navigate("/storico")}
              className="group flex flex-col items-center gap-3 p-5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-orange-500/50 rounded-xl transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-sm font-medium text-white text-center">Storico Movimenti</span>
            </motion.button>

            <motion.button
              variants={itemVariants}
              onClick={() => navigate("/storico-sfuso")}
              className="group flex flex-col items-center gap-3 p-5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-orange-500/50 rounded-xl transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Beaker className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-sm font-medium text-white text-center">Storico Sfuso</span>
            </motion.button>

            <motion.button
              variants={itemVariants}
              onClick={() => navigate("/storico-produzioni-sfuso")}
              className="group flex flex-col items-center gap-3 p-5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-orange-500/50 rounded-xl transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-sm font-medium text-white text-center">Storico Produzioni</span>
            </motion.button>

            <motion.button
              variants={itemVariants}
              onClick={() => navigate("/settings")}
              className="group flex flex-col items-center gap-3 p-5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-orange-500/50 rounded-xl transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Archive className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-sm font-medium text-white text-center">Impostazioni</span>
            </motion.button>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Magazzino;