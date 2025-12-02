import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
} from "lucide-react";

import { useEffect, useState } from "react";




const Magazzino = () => {
  const navigate = useNavigate();

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
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
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

        {/* ========== HEADER ========== */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-zinc-900 rounded-xl border border-zinc-800 p-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-xl">
                <Package className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Dashboard Magazzino</h1>
                <p className="text-zinc-400 mt-1">Gestione completa del tuo magazzino</p>
              </div>
            </div>

            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white font-medium transition-all"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </motion.div>

        {/* ========== STATISTICHE RAPIDE ========== */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <motion.div variants={itemVariants} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Prodotti Totali</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">
                  {stats.prodottiTotali}
                </p>

              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span>+12% questo mese</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Spedizioni Attive</p>
                <p className="text-3xl font-bold text-blue-400 mt-1">
                  {stats.spedizioniAttive}
                </p>

              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm text-blue-400">
              <TrendingUp className="w-4 h-4" />
              <span>In elaborazione</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">In Produzione</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">
                  {stats.produzioniAttive}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Factory className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm text-purple-400">
              <TrendingUp className="w-4 h-4" />
              <span>Lavorazione attiva</span>
            </div>
          </motion.div>
        </motion.div>

        {/* ========== SEZIONE MAGAZZINO ========== */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Magazzino</h2>
              <p className="text-sm text-zinc-400">Gestione inventario e materiali</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/inventario")}
              className="group bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/20 transition-all">
                  <Package className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Prodotti</p>
                  <p className="text-xs text-zinc-400 mt-1">Gestisci inventario</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>

            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/accessori")}
              className="group bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/20 transition-all">
                  <Boxes className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Accessori</p>
                  <p className="text-xs text-zinc-400 mt-1">Componenti extra</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>

            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/scatolette")}
              className="group bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/20 transition-all">
                  <Tag className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Scatolette</p>
                  <p className="text-xs text-zinc-400 mt-1">Contenitori</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>

            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/etichette")}
              className="group bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/20 transition-all">
                  <Sticker className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Etichette</p>
                  <p className="text-xs text-zinc-400 mt-1">Label e tag</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>

            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/sfuso")}
              className="group bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/20 transition-all">
                  <Beaker className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Sfuso</p>
                  <p className="text-xs text-zinc-400 mt-1">Materiale liquido</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* ========== SEZIONE LOGISTICA ========== */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Logistica</h2>
              <p className="text-sm text-zinc-400">Spedizioni e documenti di trasporto</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/spedizioni")}
              className="group bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-xl p-8 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/20 transition-all">
                    <Truck className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-lg">Gestione Spedizioni</p>
                    <p className="text-sm text-zinc-400 mt-1">Traccia e gestisci le spedizioni</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>

            <motion.button
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => navigate("/ddt-index")}
              className="group bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-xl p-8 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/20 transition-all">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-lg">Genera DDT</p>
                    <p className="text-sm text-zinc-400 mt-1">Documenti di trasporto</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* ========== SEZIONE PRODUZIONE ========== */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Factory className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Produzione</h2>
              <p className="text-sm text-zinc-400">Gestione processi produttivi</p>
            </div>
          </div>

          <motion.button
            variants={itemVariants}
            whileHover={cardHover}
            onClick={() => navigate("/gestione-produzione")}
            className="group w-full bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 rounded-xl p-8 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/20 transition-all">
                  <Factory className="w-8 h-8 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white text-lg">Gestione Produzione</p>
                  <p className="text-sm text-zinc-400 mt-1">Pianifica e monitora la produzione</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.button>
        </motion.div>

        {/* ========== QUICK LINKS ========== */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Archive className="w-5 h-5 text-zinc-400" />
            Link Rapidi
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => navigate("/storico")}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white transition-all"
            >
              📜 Storico Movimenti
            </button>
            <button
              onClick={() => navigate("/storico-sfuso")}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white transition-all"
            >
              🧪 Storico Sfuso
            </button>
            <button
              onClick={() => navigate("/storico-produzioni-sfuso")}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white transition-all"
            >
              📦 Storico Produzioni
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white transition-all"
            >
              ⚙️ Impostazioni
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Magazzino;