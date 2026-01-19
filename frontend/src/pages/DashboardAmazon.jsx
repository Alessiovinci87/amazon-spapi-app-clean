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
    DollarSign,
    Wrench,
    LogOut
} from "lucide-react";

const DashboardAmazon = () => {
    const navigate = useNavigate();

    // 🔹 Funzione per tornare alla selezione iniziale
    const handleBackToSelection = () => {
        localStorage.removeItem("auth");
        localStorage.removeItem("role");
        navigate("/");
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
                <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-10 shadow-2xl">
                    {/* Header con pulsante Cambia Accesso */}
                    <div className="flex items-center justify-between mb-6">
                        <div /> {/* Spacer */}
                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleBackToSelection}
                            className="flex items-center gap-2 px-5 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 rounded-xl transition-all group"
                        >
                            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="font-medium">Cambia Accesso</span>
                        </motion.button>
                    </div>
                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                            className="relative inline-block mb-6"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
                            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
                                <ShoppingCart className="w-10 h-10 text-white" />
                            </div>
                        </motion.div>

                        <h2 className="text-4xl font-extrabold text-white mb-3">Dashboard Amazon</h2>
                        <p className="text-zinc-400 text-lg">Seleziona la sezione da gestire</p>
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                        <motion.button
                            variants={itemVariants}
                            onClick={() => navigate("/uffici/listing")}
                            className="group flex flex-col items-start gap-4 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-blue-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-blue-500/10"
                        >
                            <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Globe className="w-7 h-7 text-blue-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-white mb-1">Europa</p>
                                <p className="text-sm text-zinc-400">SP-API Dashboard</p>
                            </div>
                        </motion.button>

                        <motion.button
                            variants={itemVariants}
                            onClick={() => navigate("/magazzino")}
                            className="group flex flex-col items-start gap-4 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-emerald-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-emerald-500/10"
                        >
                            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Package className="w-7 h-7 text-emerald-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-white mb-1">Magazzino</p>
                                <p className="text-sm text-zinc-400">Gestione completa e giacenze</p>
                            </div>
                        </motion.button>

                        <motion.button
                            variants={itemVariants}
                            onClick={() => navigate("/uffici/spedizioni")}
                            className="group flex flex-col items-start gap-4 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-purple-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-purple-500/10"
                        >
                            <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Truck className="w-7 h-7 text-purple-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-white mb-1">Spedizioni</p>
                                <p className="text-sm text-zinc-400">Logistica</p>
                            </div>
                        </motion.button>

                        <motion.button
                            variants={itemVariants}
                            onClick={() => navigate("/uffici/bilancio")}
                            className="group flex flex-col items-start gap-4 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-yellow-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-yellow-500/10"
                        >
                            <div className="w-14 h-14 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <DollarSign className="w-7 h-7 text-yellow-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-white mb-1">Bilancio</p>
                                <p className="text-sm text-zinc-400">Valore e costi</p>
                            </div>
                        </motion.button>

                        <motion.button
                            variants={itemVariants}
                            onClick={() => navigate("/uffici/produzione")}
                            className="group flex flex-col items-start gap-4 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-red-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-red-500/10"
                        >
                            <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Wrench className="w-7 h-7 text-red-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-white mb-1">Produzione</p>
                                <p className="text-sm text-zinc-400">Prenotazioni</p>
                            </div>
                        </motion.button>

                        <motion.button
                            variants={itemVariants}
                            onClick={() => navigate("/uffici/ddt")}
                            className="group flex flex-col items-start gap-4 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-pink-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-pink-500/10"
                        >
                            <div className="w-14 h-14 rounded-xl bg-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FileText className="w-7 h-7 text-pink-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-white mb-1">DDT</p>
                                <p className="text-sm text-zinc-400">Documenti</p>
                            </div>
                        </motion.button>

                        <motion.button
                            variants={itemVariants}
                            onClick={() => navigate("/uffici/fornitori")}
                            className="group flex flex-col items-start gap-4 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-orange-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-orange-500/10"
                        >
                            <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Users className="w-7 h-7 text-orange-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-white mb-1">Fornitori</p>
                                <p className="text-sm text-zinc-400">Gestione</p>
                            </div>
                        </motion.button>

                        <motion.button
                            variants={itemVariants}
                            onClick={() => navigate("/fba-gestione-prodotti")}
                            className="group flex flex-col items-start gap-4 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-cyan-500/50 rounded-2xl transition-all hover:shadow-lg hover:shadow-cyan-500/10"
                        >
                            <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Box className="w-7 h-7 text-cyan-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-white mb-1">FBA Prodotti</p>
                                <p className="text-sm text-zinc-400">Amazon FBA</p>
                            </div>
                        </motion.button>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default DashboardAmazon;