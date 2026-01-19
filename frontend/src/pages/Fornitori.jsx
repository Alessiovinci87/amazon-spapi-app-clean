import React, { useState } from "react";
import InserimentoFornitore from "../components/fornitori/InserimentoFornitore";
import InserimentoOrdine from "../components/fornitori/InserimentoOrdine";
import ListaFornitori from "../components/fornitori/ListaFornitori";
import StoricoOrdini from "../components/fornitori/StoricoOrdini";
import GestioneProdottiFornitore from "../components/fornitori/GestioneProdottiFornitore";
import {
  Users,
  ShoppingCart,
  List,
  Archive,
  Link2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Sparkles,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Fornitori = () => {
  const navigate = useNavigate();
  const [formAperto, setFormAperto] = useState(null);

  const toggleForm = (formName) => {
    if (formAperto === formName) {
      setFormAperto(null);
    } else {
      setFormAperto(formName);
    }
  };

  const sections = [
    {
      id: "fornitore",
      title: "Aggiungi Fornitore",
      description: "Registra un nuovo fornitore",
      icon: Users,
      gradient: "from-yellow-600 to-amber-700",
      borderColor: "border-yellow-700/50",
      hoverBorder: "hover:border-yellow-600",
      hoverShadow: "hover:shadow-yellow-900/20",
      iconBg: "bg-yellow-600",
      bgGradient: "from-yellow-900/40 to-yellow-800/20"
    },
    {
      id: "ordine",
      title: "Crea Ordine",
      description: "Nuovo ordine fornitore",
      icon: ShoppingCart,
      gradient: "from-emerald-600 to-emerald-700",
      borderColor: "border-emerald-700/50",
      hoverBorder: "hover:border-emerald-600",
      hoverShadow: "hover:shadow-emerald-900/20",
      iconBg: "bg-emerald-600",
      bgGradient: "from-emerald-900/40 to-emerald-800/20"
    },
    {
      id: "lista",
      title: "Elenco Fornitori",
      description: "Visualizza tutti i fornitori",
      icon: List,
      gradient: "from-blue-600 to-blue-700",
      borderColor: "border-blue-700/50",
      hoverBorder: "hover:border-blue-600",
      hoverShadow: "hover:shadow-blue-900/20",
      iconBg: "bg-blue-600",
      bgGradient: "from-blue-900/40 to-blue-800/20"
    },
    {
      id: "storico",
      title: "Storico Ordini",
      description: "Consulta ordini passati",
      icon: Archive,
      gradient: "from-purple-600 to-purple-700",
      borderColor: "border-purple-700/50",
      hoverBorder: "hover:border-purple-600",
      hoverShadow: "hover:shadow-purple-900/20",
      iconBg: "bg-purple-600",
      bgGradient: "from-purple-900/40 to-purple-800/20"
    },
    {
      id: "gestione",
      title: "Gestione Prodotti",
      description: "Collega prodotti ai fornitori",
      icon: Link2,
      gradient: "from-orange-600 to-orange-700",
      borderColor: "border-orange-700/50",
      hoverBorder: "hover:border-orange-600",
      hoverShadow: "hover:shadow-orange-900/20",
      iconBg: "bg-orange-600",
      bgGradient: "from-orange-900/40 to-orange-800/20"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* ========== HEADER ========== */}
        <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-2xl border border-zinc-800/50 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-2xl">
                  <Users className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-white mb-1">Gestione Fornitori</h1>
                <p className="text-zinc-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Gestisci fornitori, ordini e prodotti
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-xl text-white font-medium transition-all backdrop-blur-sm hover:scale-[1.02]"
            >
              <ArrowLeft className="w-5 h-5" />
              Dashboard
            </button>
          </div>
        </div>

        {/* ========== SECTION BUTTONS ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const isOpen = formAperto === section.id;

            return (
              <button
                key={section.id}
                onClick={() => toggleForm(section.id)}
                className={`group relative overflow-hidden bg-gradient-to-br ${section.bgGradient} border rounded-2xl p-6 transition-all ${isOpen
                    ? `${section.borderColor} shadow-xl hover:shadow-2xl scale-[1.02]`
                    : `border-zinc-800/50 ${section.hoverBorder} ${section.hoverShadow} hover:shadow-lg`
                  }`}
              >
                {/* Glow Effect */}
                {isOpen && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                )}

                {/* Icon Badge */}
                <div className={`relative w-16 h-16 rounded-2xl ${section.iconBg} flex items-center justify-center mx-auto mb-4 shadow-lg ${isOpen ? 'scale-110' : 'group-hover:scale-110'
                  } transition-transform`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-2 text-center">
                  {section.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-zinc-400 text-center mb-4">
                  {section.description}
                </p>

                {/* Toggle Indicator */}
                <div className="flex items-center justify-center">
                  {isOpen ? (
                    <div className="flex items-center gap-2 text-white">
                      <ChevronUp className="w-5 h-5 animate-bounce" />
                      <span className="text-sm font-semibold">Aperto</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-400 group-hover:text-white transition-colors">
                      <ChevronDown className="w-5 h-5" />
                      <span className="text-sm font-medium">Apri</span>
                    </div>
                  )}
                </div>

                {/* Active Indicator */}
                {isOpen && (
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ========== DYNAMIC CONTENT ========== */}
        {formAperto && (
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-8 animate-fadeIn shadow-xl">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-800">
              {(() => {
                const section = sections.find(s => s.id === formAperto);
                const Icon = section?.icon;
                return (
                  <>
                    <div className={`w-14 h-14 rounded-xl ${section?.iconBg} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white mb-1">{section?.title}</h2>
                      <p className="text-sm text-zinc-400">{section?.description}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-400">Attivo</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div>
              {formAperto === "fornitore" && (
                <InserimentoFornitore onFornitoreAggiunto={() => console.log("Fornitore aggiunto")} />
              )}

              {formAperto === "ordine" && (
                <InserimentoOrdine />
              )}

              {formAperto === "lista" && (
                <ListaFornitori />
              )}

              {formAperto === "storico" && (
                <StoricoOrdini />
              )}

              {formAperto === "gestione" && (
                <GestioneProdottiFornitore />
              )}
            </div>
          </div>
        )}

        {/* ========== EMPTY STATE ========== */}
        {!formAperto && (
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-16 text-center">
            <div className="inline-block p-6 bg-zinc-800 rounded-2xl mb-6">
              <Users className="w-20 h-20 text-zinc-600 mx-auto" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Seleziona una sezione per iniziare
            </h3>
            <p className="text-zinc-400 text-base max-w-md mx-auto">
              Clicca su una delle card sopra per gestire fornitori, creare ordini o visualizzare lo storico
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <p className="text-zinc-400 text-xs mb-1">Sezioni</p>
                <p className="text-2xl font-bold text-white">5</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <p className="text-zinc-400 text-xs mb-1">Disponibili</p>
                <p className="text-2xl font-bold text-emerald-400">100%</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <p className="text-zinc-400 text-xs mb-1">Pronto</p>
                <p className="text-2xl font-bold text-blue-400">
                  <CheckCircle className="w-8 h-8 mx-auto" />
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fornitori;