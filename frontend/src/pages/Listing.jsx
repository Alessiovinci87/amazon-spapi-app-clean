import React, { useState, useEffect, useRef } from "react";
import ListingHome from "../components/listing/ListingHome";
import { PAESI as paesi } from "../utils/paesi";
import { fetchProdottiMock, filtraProdotti, contaProdottiPerPaese } from "../utils/gestioneListing";
import { 
  Search, 
  Globe, 
  ShoppingCart, 
  TrendingUp,
  Package,
  CheckCircle,
  MapPin
} from "lucide-react";

const Listing = () => {
  const [prodotti, setProdotti] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [paese, setPaese] = useState("");
  const sectionRef = useRef(null);

  useEffect(() => {
    fetchProdottiMock(setProdotti);
  }, []);

  const handlePaeseClick = (codice) => {
    setPaese(codice);
    setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const prodottiFiltrati = filtraProdotti(prodotti, paese, filtro);

  // Calcola statistiche
  const totalePaesi = paesi.length;
  const totaleAsin = paesi.reduce((acc, p) => acc + contaProdottiPerPaese(prodotti, p.codice), 0);
  const paesiAttivi = paesi.filter(p => contaProdottiPerPaese(prodotti, p.codice) > 0).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Listing Prodotti</h1>
                <p className="text-zinc-400 mt-1">Gestione marketplace internazionali</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm text-zinc-400">Marketplace Totali</p>
                <p className="text-2xl font-bold text-blue-400">{totalePaesi}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-sm text-zinc-400">Marketplace Attivi</p>
                <p className="text-2xl font-bold text-emerald-400">{paesiAttivi}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-sm text-zinc-400">ASIN Totali</p>
                <p className="text-2xl font-bold text-purple-400">{totaleAsin}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========== BARRA RICERCA ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" />
            Ricerca Prodotti
          </h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Seleziona il Marketplace e poi filtra per nome, ASIN, SKU..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
              aria-label="Filtro prodotti"
            />
          </div>
          {filtro && (
            <p className="text-sm text-zinc-400 mt-2">
              🔍 Ricerca attiva: "<span className="text-blue-400 font-semibold">{filtro}</span>"
            </p>
          )}
        </div>

        {/* ========== TITOLO SEZIONE MARKETPLACE ========== */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl border border-blue-500/30 p-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Seleziona Marketplace</h2>
              <p className="text-blue-100 text-sm mt-1">
                Clicca su un paese per visualizzare i prodotti listati
              </p>
            </div>
          </div>
        </div>

        {/* ========== GRIGLIA PAESI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {paesi.map((p) => {
              const asinCount = contaProdottiPerPaese(prodotti, p.codice);
              const isSelected = paese === p.codice;
              const isActive = asinCount > 0;

              return (
                <button
                  key={p.codice}
                  onClick={() => handlePaeseClick(p.codice)}
                  className={`relative group cursor-pointer rounded-xl p-6 h-48 flex flex-col items-center justify-between shadow-lg transition-all duration-300
                    ${isSelected 
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 ring-4 ring-blue-400 scale-105" 
                      : isActive
                        ? "bg-gradient-to-br from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 border border-zinc-700 hover:scale-105 hover:shadow-xl"
                        : "bg-zinc-800 border border-zinc-700 opacity-60 hover:opacity-80"
                    }`}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Seleziona marketplace ${p.codice}`}
                >
                  {/* Badge Selezionato */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}

                  {/* Codice Paese */}
                  <div className={`text-lg font-bold ${isSelected ? "text-white" : "text-zinc-300"}`}>
                    {p.codice}
                  </div>

                  {/* Bandiera */}
                  <div className="my-2">
                    <img
                      src={`https://flagcdn.com/w80/${p.bandiera}.png`}
                      alt={`Bandiera ${p.codice}`}
                      className="w-16 h-auto rounded shadow-md"
                      loading="lazy"
                    />
                  </div>

                  {/* ASIN Count */}
                  <div className={`text-center ${isSelected ? "text-white" : "text-zinc-400"}`}>
                    <p className="text-xs font-medium mb-1">ASIN Attivi</p>
                    <p className={`text-2xl font-bold ${isSelected ? "text-white" : isActive ? "text-blue-400" : "text-zinc-500"}`}>
                      {asinCount}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className={`text-xs rounded-full px-3 py-1 font-medium ${
                    isSelected 
                      ? "bg-white/20 text-white" 
                      : isActive 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                        : "bg-zinc-700 text-zinc-500"
                  }`}>
                    {isActive ? "✓ Attivo" : "Inattivo"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========== RISULTATI RICERCA ========== */}
        {paese && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Prodotti {paese}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    {prodottiFiltrati.length} prodott{prodottiFiltrati.length === 1 ? "o" : "i"} trovat{prodottiFiltrati.length === 1 ? "o" : "i"}
                  </p>
                </div>
              </div>

              {/* Badge Paese Selezionato */}
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <img
                  src={`https://flagcdn.com/w20/${paesi.find(p => p.codice === paese)?.bandiera}.png`}
                  alt={`Bandiera ${paese}`}
                  className="w-5 h-auto"
                />
                <span className="text-blue-400 font-semibold">{paese}</span>
              </div>
            </div>

            {prodottiFiltrati.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-zinc-600" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">
                  Nessun prodotto trovato
                </h4>
                <p className="text-zinc-400 text-sm">
                  Nessun prodotto corrisponde ai criteri di ricerca per {paese}
                </p>
                {filtro && (
                  <button
                    onClick={() => setFiltro("")}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-all"
                  >
                    Rimuovi Filtro
                  </button>
                )}
              </div>
            ) : (
              <section ref={sectionRef}>
                <ListingHome
                  prodotti={prodottiFiltrati}
                  paese={paese}
                  filtro={filtro}
                  totaleProdotti={prodottiFiltrati.length}
                />
              </section>
            )}
          </div>
        )}

        {/* ========== EMPTY STATE INIZIALE ========== */}
        {!paese && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Seleziona un Marketplace
            </h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Clicca su uno dei marketplace sopra per visualizzare i prodotti listati e gestire il tuo inventario internazionale
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Listing;