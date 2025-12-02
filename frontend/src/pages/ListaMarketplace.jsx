import React from "react";
import MarketplaceCard from "../components/listing/MarketplaceCard";
import { 
  ArrowLeft, 
  Globe, 
  MapPin,
  TrendingUp,
  DollarSign,
  Flag
} from "lucide-react";

const marketplaces = [
  {
    id: "APJ6JRA9NG5V4",
    name: "Amazon Italia",
    countryCode: "IT",
    domainName: "amazon.it",
    defaultLanguageCode: "it_IT",
    defaultCurrencyCode: "EUR",
  },
  {
    id: "A13V1IB3VIYZZH",
    name: "Amazon Francia",
    countryCode: "FR",
    domainName: "amazon.fr",
    defaultLanguageCode: "fr_FR",
    defaultCurrencyCode: "EUR",
  },
  {
    id: "A1F83G8C2ARO7P",
    name: "Amazon UK",
    countryCode: "GB",
    domainName: "amazon.co.uk",
    defaultLanguageCode: "en_GB",
    defaultCurrencyCode: "GBP",
  },
  {
    id: "A1RKKUPIHCS9HS",
    name: "Amazon Spagna",
    countryCode: "ES",
    domainName: "amazon.es",
    defaultLanguageCode: "es_ES",
    defaultCurrencyCode: "EUR",
  },
  {
    id: "A1PA6795UKMFR9",
    name: "Amazon Germania",
    countryCode: "DE",
    domainName: "amazon.de",
    defaultLanguageCode: "de_DE",
    defaultCurrencyCode: "EUR",
  },
  {
    id: "AMEN7PMS3EDWL",
    name: "Amazon Belgio",
    countryCode: "BE",
    domainName: "amazon.com.be",
    defaultLanguageCode: "nl_BE",
    defaultCurrencyCode: "EUR",
  },
  {
    id: "A1805IZSGTT6HS",
    name: "Amazon Olanda",
    countryCode: "NL",
    domainName: "amazon.nl",
    defaultLanguageCode: "nl_NL",
    defaultCurrencyCode: "EUR",
  },
  {
    id: "A2NODRKZP88ZB9",
    name: "Amazon Svezia",
    countryCode: "SE",
    domainName: "amazon.se",
    defaultLanguageCode: "sv_SE",
    defaultCurrencyCode: "SEK",
  },
  {
    id: "A1C3SOZRARQ6R3",
    name: "Amazon Polonia",
    countryCode: "PL",
    domainName: "amazon.pl",
    defaultLanguageCode: "pl_PL",
    defaultCurrencyCode: "PLN",
  },
];

function ListaMarketplace({ goBack }) {
  // Raggruppa per valuta
  const marketplacesEUR = marketplaces.filter(m => m.defaultCurrencyCode === "EUR");
  const marketplacesOther = marketplaces.filter(m => m.defaultCurrencyCode !== "EUR");

  // Conta marketplace per tipo
  const totalMarketplaces = marketplaces.length;
  const euroMarketplaces = marketplacesEUR.length;
  const otherCurrencies = [...new Set(marketplaces.map(m => m.defaultCurrencyCode))].length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Marketplace Europei</h1>
                <p className="text-zinc-400 mt-1">Gestione marketplace Amazon Europa</p>
              </div>
            </div>

            <button
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              type="button"
              aria-label="Torna al Menu Europa"
            >
              <ArrowLeft className="w-4 h-4" />
              Menu Europa
            </button>
          </div>
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm text-zinc-400">Marketplace Totali</p>
                <p className="text-2xl font-bold text-blue-400">{totalMarketplaces}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-sm text-zinc-400">Marketplace EUR</p>
                <p className="text-2xl font-bold text-emerald-400">{euroMarketplaces}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Flag className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-sm text-zinc-400">Valute Diverse</p>
                <p className="text-2xl font-bold text-purple-400">{otherCurrencies}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========== SEZIONE MARKETPLACE EUR ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Marketplace con Euro (EUR)</h2>
              <p className="text-sm text-zinc-400">{euroMarketplaces} marketplace disponibili</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketplacesEUR.map((mkt) => (
              <MarketplaceCard key={mkt.id} marketplace={mkt} />
            ))}
          </div>
        </div>

        {/* ========== SEZIONE ALTRE VALUTE ========== */}
        {marketplacesOther.length > 0 && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Altre Valute</h2>
                <p className="text-sm text-zinc-400">{marketplacesOther.length} marketplace con valute diverse</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketplacesOther.map((mkt) => (
                <MarketplaceCard key={mkt.id} marketplace={mkt} />
              ))}
            </div>
          </div>
        )}

        {/* ========== INFO BOX ========== */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-500/30 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Globe className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                💡 Informazioni Marketplace Europa
              </h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>I marketplace EUR condividono la stessa valuta per transazioni semplificate</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>UK usa la Sterlina (GBP), Svezia la Corona (SEK) e Polonia lo Złoty (PLN)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Ogni marketplace ha il proprio ID univoco per le API Amazon</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ========== LEGENDA VALUTE ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Legenda Valute
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-lg">€</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">EUR - Euro</p>
                <p className="text-xs text-zinc-400">{euroMarketplaces} marketplace</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-lg">£</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-400">GBP - Sterlina</p>
                <p className="text-xs text-zinc-400">1 marketplace (UK)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-purple-400 font-bold text-sm">kr/zł</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-400">SEK/PLN</p>
                <p className="text-xs text-zinc-400">2 marketplace</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListaMarketplace;