function MarketplaceCard({ marketplace }) {
  return (
    <div className="bg-zinc-800 p-5 rounded-lg mb-5 shadow-lg w-full max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold text-white">
          {marketplace.name} <span className="text-zinc-400">({marketplace.countryCode})</span>
        </h2>
        <span className="text-xs text-zinc-500 select-all">{marketplace.id}</span>
      </div>
      <p className="text-gray-300 mb-1">
        <strong>Dominio:</strong> {marketplace.domainName}
      </p>
      <p className="text-gray-300 mb-1">
        <strong>Lingua:</strong> {marketplace.defaultLanguageCode}
      </p>
      <p className="text-gray-300">
        <strong>Valuta:</strong> {marketplace.defaultCurrencyCode}
      </p>
    </div>
  );
}

export default MarketplaceCard;
