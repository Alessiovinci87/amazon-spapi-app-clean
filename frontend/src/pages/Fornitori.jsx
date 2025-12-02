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
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Fornitori = () => {
  const navigate = useNavigate();
  const [formAperto, setFormAperto] = useState(null); // "fornitore", "ordine", "lista", "storico", "gestione", null

  const toggleForm = (formName) => {
    if (formAperto === formName) {
      setFormAperto(null); // chiude se già aperto
    } else {
      setFormAperto(formName); // apre il form selezionato e chiude gli altri
    }
  };

  const sections = [
    {
      id: "fornitore",
      title: "Aggiungi Fornitore",
      description: "Registra un nuovo fornitore",
      icon: Users,
      color: "from-yellow-500 to-amber-600",
      hoverColor: "hover:from-yellow-600 hover:to-amber-700",
      iconBg: "bg-yellow-500/10",
      iconColor: "text-yellow-400"
    },
    {
      id: "ordine",
      title: "Crea Ordine",
      description: "Nuovo ordine fornitore",
      icon: ShoppingCart,
      color: "from-green-500 to-emerald-600",
      hoverColor: "hover:from-green-600 hover:to-emerald-700",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-400"
    },
    {
      id: "lista",
      title: "Elenco Fornitori",
      description: "Visualizza tutti i fornitori",
      icon: List,
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:from-blue-600 hover:to-blue-700",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400"
    },
    {
      id: "storico",
      title: "Storico Ordini",
      description: "Consulta ordini passati",
      icon: Archive,
      color: "from-purple-500 to-purple-600",
      hoverColor: "hover:from-purple-600 hover:to-purple-700",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400"
    },
    {
      id: "gestione",
      title: "Gestione Prodotti",
      description: "Collega prodotti ai fornitori",
      icon: Link2,
      color: "from-orange-500 to-orange-600",
      hoverColor: "hover:from-orange-600 hover:to-orange-700",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-400"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="w-full space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Gestione Fornitori</h1>
                <p className="text-zinc-400 mt-1">Gestisci fornitori, ordini e prodotti</p>
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

        {/* ========== SECTION BUTTONS ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const isOpen = formAperto === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => toggleForm(section.id)}
                className={`group relative bg-zinc-900 border-2 rounded-xl p-6 transition-all ${
                  isOpen 
                    ? 'border-white shadow-xl scale-[1.02]' 
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Icon Badge */}
                <div className={`w-14 h-14 rounded-xl ${section.iconBg} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-7 h-7 ${section.iconColor}`} />
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
                      <ChevronUp className="w-5 h-5" />
                      <span className="text-sm font-medium">Chiudi</span>
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
                  <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                )}
              </button>
            );
          })}
        </div>

        {/* ========== DYNAMIC CONTENT ========== */}
        {formAperto && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
              {(() => {
                const section = sections.find(s => s.id === formAperto);
                const Icon = section?.icon;
                return (
                  <>
                    <div className={`w-10 h-10 rounded-lg ${section?.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${section?.iconColor}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{section?.title}</h2>
                      <p className="text-sm text-zinc-400">{section?.description}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="border-t border-zinc-800 pt-6">
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
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Seleziona una sezione
            </h3>
            <p className="text-zinc-400 text-sm">
              Clicca su una delle card sopra per iniziare a gestire fornitori e ordini
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fornitori;