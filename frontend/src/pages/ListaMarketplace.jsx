import React from "react";
import MarketplaceCard from "../components/listing/MarketplaceCard";
import {
  ArrowLeft,
  Globe,
  MapPin,
  DollarSign,
  TrendingUp,
  Flag,
  Info,
} from "lucide-react";

const marketplaces = [
  { id: "APJ6JRA9NG5V4",  name: "Amazon Italia",   countryCode: "IT", domainName: "amazon.it",     defaultLanguageCode: "it_IT", defaultCurrencyCode: "EUR" },
  { id: "A13V1IB3VIYZZH", name: "Amazon Francia",  countryCode: "FR", domainName: "amazon.fr",     defaultLanguageCode: "fr_FR", defaultCurrencyCode: "EUR" },
  { id: "A1F83G8C2ARO7P", name: "Amazon UK",       countryCode: "GB", domainName: "amazon.co.uk",  defaultLanguageCode: "en_GB", defaultCurrencyCode: "GBP" },
  { id: "A1RKKUPIHCS9HS", name: "Amazon Spagna",   countryCode: "ES", domainName: "amazon.es",     defaultLanguageCode: "es_ES", defaultCurrencyCode: "EUR" },
  { id: "A1PA6795UKMFR9", name: "Amazon Germania", countryCode: "DE", domainName: "amazon.de",     defaultLanguageCode: "de_DE", defaultCurrencyCode: "EUR" },
  { id: "AMEN7PMS3EDWL",  name: "Amazon Belgio",   countryCode: "BE", domainName: "amazon.com.be", defaultLanguageCode: "nl_BE", defaultCurrencyCode: "EUR" },
  { id: "A1805IZSGTT6HS", name: "Amazon Olanda",   countryCode: "NL", domainName: "amazon.nl",     defaultLanguageCode: "nl_NL", defaultCurrencyCode: "EUR" },
  { id: "A2NODRKZP88ZB9", name: "Amazon Svezia",   countryCode: "SE", domainName: "amazon.se",     defaultLanguageCode: "sv_SE", defaultCurrencyCode: "SEK" },
  { id: "A1C3SOZRARQ6R3", name: "Amazon Polonia",  countryCode: "PL", domainName: "amazon.pl",     defaultLanguageCode: "pl_PL", defaultCurrencyCode: "PLN" },
];

function ListaMarketplace({ goBack }) {
  const marketplacesEUR = marketplaces.filter(m => m.defaultCurrencyCode === "EUR");
  const marketplacesOther = marketplaces.filter(m => m.defaultCurrencyCode !== "EUR");
  const totalMarketplaces = marketplaces.length;
  const euroMarketplaces = marketplacesEUR.length;
  const otherCurrencies = [...new Set(marketplaces.map(m => m.defaultCurrencyCode))].length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={goBack} type="button" title="Menu Europa" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <Globe className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Marketplace Europei</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Gestione Marketplace Amazon</span>
            </div>
          </div>
        </div>
      </header>

      {/* === Content === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-md border flex items-center justify-center bg-blue-500/10 border-blue-500/40 text-blue-400">
                <MapPin className="w-[18px] h-[18px]" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{totalMarketplaces}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Marketplace totali</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-md border flex items-center justify-center bg-emerald-500/10 border-emerald-500/40 text-emerald-400">
                <DollarSign className="w-[18px] h-[18px]" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{euroMarketplaces}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Marketplace EUR</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-md border flex items-center justify-center bg-violet-500/10 border-violet-500/40 text-violet-400">
                <Flag className="w-[18px] h-[18px]" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{otherCurrencies}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Valute diverse</div>
          </div>
        </div>

        {/* Sezione EUR */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
          <div className="px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-emerald-500/10 border-emerald-500/40 text-emerald-400">
                <DollarSign className="w-[18px] h-[18px]" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Euro (EUR)</span>
                <h3 className="text-sm font-semibold text-white -mt-0.5">{euroMarketplaces} marketplace disponibili</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketplacesEUR.map((mkt) => (
                <MarketplaceCard key={mkt.id} marketplace={mkt} />
              ))}
            </div>
          </div>
        </div>

        {/* Sezione altre valute */}
        {marketplacesOther.length > 0 && (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
            <div className="px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-violet-500/10 border-violet-500/40 text-violet-400">
                  <TrendingUp className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Altre valute</span>
                  <h3 className="text-sm font-semibold text-white -mt-0.5">{marketplacesOther.length} marketplace</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketplacesOther.map((mkt) => (
                  <MarketplaceCard key={mkt.id} marketplace={mkt} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
          <div className="px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-blue-500/10 border-blue-500/40 text-blue-400">
                <Info className="w-[18px] h-[18px]" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Note</span>
                <h3 className="text-sm font-semibold text-white -mt-0.5">Informazioni Marketplace Europa</h3>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">&#8226;</span>I marketplace EUR condividono la stessa valuta per transazioni semplificate</li>
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">&#8226;</span>UK usa la Sterlina (GBP), Svezia la Corona (SEK) e Polonia lo Zloty (PLN)</li>
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">&#8226;</span>Ogni marketplace ha il proprio ID univoco per le API Amazon</li>
            </ul>
          </div>
        </div>

        {/* Legenda valute */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-lg px-5 py-4">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-400 font-bold text-lg">&#8364;</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-400">EUR — Euro</p>
              <p className="text-[11px] text-slate-500">{euroMarketplaces} marketplace</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-lg px-5 py-4">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 font-bold text-lg">&#163;</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-400">GBP — Sterlina</p>
              <p className="text-[11px] text-slate-500">1 marketplace (UK)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-lg px-5 py-4">
            <div className="w-10 h-10 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
              <span className="text-violet-400 font-bold text-sm">kr/zl</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-400">SEK / PLN</p>
              <p className="text-[11px] text-slate-500">2 marketplace</p>
            </div>
          </div>
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
        <span>&copy; {new Date().getFullYear()} Nexus — Marketplace Europa</span>
        <span className="font-mono">v2.0</span>
      </footer>
    </div>
  );
}

export default ListaMarketplace;
