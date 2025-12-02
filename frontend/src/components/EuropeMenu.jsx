import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Globe, 
  Package, 
  FileText, 
  Store, 
  Star,
  ChevronRight
} from "lucide-react";

function EuropeMenu() {
  const navigate = useNavigate();

  const sections = [
    {
      id: "magazzino",
      title: "Magazzino",
      description: "Gestione inventario Europa",
      icon: Package,
      to: "/inventario-magazzino",
      color: "from-slate-500 to-slate-600",
      hoverColor: "hover:from-slate-600 hover:to-slate-700",
      iconBg: "bg-slate-500/10",
      iconColor: "text-slate-400",
      borderColor: "hover:border-slate-500/50"
    },
    {
      id: "listing",
      title: "Listing",
      description: "Gestione annunci prodotti",
      icon: FileText,
      to: "/listing",
      color: "from-gray-500 to-gray-600",
      hoverColor: "hover:from-gray-600 hover:to-gray-700",
      iconBg: "bg-gray-500/10",
      iconColor: "text-gray-400",
      borderColor: "hover:border-gray-500/50"
    },
    {
      id: "marketplace",
      title: "Marketplace",
      description: "Tutti i marketplace Europa",
      icon: Store,
      to: "/marketplaces",
      color: "from-cyan-500 to-cyan-600",
      hoverColor: "hover:from-cyan-600 hover:to-cyan-700",
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-400",
      borderColor: "hover:border-cyan-500/50"
    },
    {
      id: "recensioni",
      title: "Recensioni",
      description: "Gestione feedback clienti",
      icon: Star,
      to: "/recensioni",
      color: "from-teal-500 to-teal-600",
      hoverColor: "hover:from-teal-600 hover:to-teal-700",
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-400",
      borderColor: "hover:border-teal-500/50"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-8xl space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Europa</h1>
                <p className="text-zinc-400 mt-1">Gestione marketplace europei</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>

        {/* ========== INFO CARD ========== */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Globe className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Amazon Europa</h3>
              <p className="text-zinc-300 text-sm">
                Accedi rapidamente alle sezioni per gestire inventario, listing, marketplace e recensioni 
                dei tuoi prodotti su Amazon Europa.
              </p>
            </div>
          </div>
        </div>

        {/* ========== SECTION GRID ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            
            return (
              <button
                key={section.id}
                onClick={() => navigate(section.to)}
                className={`group bg-zinc-900 border border-zinc-800 ${section.borderColor} rounded-xl p-6 transition-all hover:shadow-xl text-left`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl ${section.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 ${section.iconColor}`} />
                  </div>
                  <ChevronRight className="w-6 h-6 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  {section.title}
                </h3>
                
                <p className="text-sm text-zinc-400">
                  {section.description}
                </p>

                {/* Hover Indicator */}
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-zinc-500 group-hover:text-white transition-colors">
                  <span>Vai alla sezione</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        {/* ========== STATISTICHE RAPIDE ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-slate-500/10 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-400 mb-1">--</p>
            <p className="text-sm text-zinc-400">Prodotti</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-400 mb-1">--</p>
            <p className="text-sm text-zinc-400">Listing Attivi</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
              <Store className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-3xl font-bold text-cyan-400 mb-1">--</p>
            <p className="text-sm text-zinc-400">Marketplace</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-teal-400" />
            </div>
            <p className="text-3xl font-bold text-teal-400 mb-1">--</p>
            <p className="text-sm text-zinc-400">Recensioni</p>
          </div>
        </div>

        {/* ========== QUICK ACTIONS ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            Azioni Rapide
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => navigate("/inventario")}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white transition-all text-left"
            >
              📦 Inventario Generale
            </button>
            <button
              onClick={() => navigate("/spedizioni")}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white transition-all text-left"
            >
              🚚 Spedizioni
            </button>
            <button
              onClick={() => navigate("/storico")}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white transition-all text-left"
            >
              📜 Storico
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white transition-all text-left"
            >
              ⚙️ Impostazioni
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EuropeMenu;