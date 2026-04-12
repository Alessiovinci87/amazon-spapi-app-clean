function MarketplaceCard({ marketplace }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-lg mb-5 w-full max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold text-slate-100">
          {marketplace.name} <span className="text-slate-500">({marketplace.countryCode})</span>
        </h2>
        <span className="text-xs text-slate-500 font-mono select-all">{marketplace.id}</span>
      </div>
      <p className="text-slate-300 mb-1">
        <strong className="text-slate-400">Dominio:</strong> {marketplace.domainName}
      </p>
      <p className="text-slate-300 mb-1">
        <strong className="text-slate-400">Lingua:</strong> {marketplace.defaultLanguageCode}
      </p>
      <p className="text-slate-300">
        <strong className="text-slate-400">Valuta:</strong> {marketplace.defaultCurrencyCode}
      </p>
    </div>
  );
}

export default MarketplaceCard;
