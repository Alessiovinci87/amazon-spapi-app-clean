import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  FileText, 
  FileCheck, 
  Archive,
  ChevronRight,
  Sparkles
} from "lucide-react";

const DDTIndex = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="w-full max-w-8xl mx-auto space-y-8">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Genera DDT</h1>
                <p className="text-zinc-400 mt-1">Seleziona il tipo di documento da creare</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>
          </div>
        </div>

        {/* ========== INFO CARD ========== */}
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Documenti di Trasporto</h3>
              <p className="text-zinc-300 text-sm">
                Scegli tra DDT Pics Nails per documenti aziendali o DDT Generico per documenti personalizzati. 
                Puoi consultare lo storico di tutti i documenti generati.
              </p>
            </div>
          </div>
        </div>

        {/* ========== OPZIONI DDT ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* DDT Pics Nails */}
          <button
            onClick={() => navigate("/ddt")}
            className="group bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 rounded-xl p-8 transition-all hover:shadow-xl hover:shadow-purple-500/10 text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FileCheck className="w-8 h-8 text-white" />
              </div>
              <ChevronRight className="w-6 h-6 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              DDT Pics Nails
              <span className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-600"></span>
            </h3>
            <p className="text-zinc-400 text-sm mb-4">
              Genera documenti di trasporto per Pics Nails con intestazione aziendale e dati precompilati
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                Aziendale
              </span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                Template Predefinito
              </span>
            </div>
          </button>

          {/* DDT Generico */}
          <button
            onClick={() => navigate("/ddt-nuovo")}
            className="group bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-8 transition-all hover:shadow-xl hover:shadow-emerald-500/10 text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <ChevronRight className="w-6 h-6 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              DDT Generico
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            </h3>
            <p className="text-zinc-400 text-sm mb-4">
              Crea documenti di trasporto personalizzati con intestazioni e informazioni customizzabili
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium">
                Personalizzabile
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium">
                Flessibile
              </span>
            </div>
          </button>
        </div>

        {/* ========== STORICO DDT ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <button
            onClick={() => navigate("/ddt-storico")}
            className="group w-full flex items-center justify-between p-6 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-blue-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Archive className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  Storico DDT
                </h3>
                <p className="text-zinc-400 text-sm">
                  Visualizza tutti i documenti di trasporto generati
                </p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-blue-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* ========== STATISTICHE RAPIDE ========== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
              <FileCheck className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-purple-400 mb-1">--</p>
            <p className="text-sm text-zinc-400">DDT Pics Nails</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-400 mb-1">--</p>
            <p className="text-sm text-zinc-400">DDT Generici</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
              <Archive className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-blue-400 mb-1">--</p>
            <p className="text-sm text-zinc-400">Totali</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DDTIndex;