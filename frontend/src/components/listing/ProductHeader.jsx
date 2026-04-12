const ProductHeader = ({ asin, image, prezzo, buyBox, stock }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center bg-slate-900/60 border border-slate-800 p-4 rounded-lg max-w-xl mx-auto gap-6">
      <img
        src={image}
        alt={`Immagine prodotto ASIN ${asin}`}
        className="w-32 h-32 object-contain rounded-md flex-shrink-0"
      />
      <div className="flex flex-col sm:flex-row sm:space-x-10 w-full justify-center">
        <div className="flex flex-col space-y-1 text-slate-100">
          <span className="text-xs uppercase text-slate-500 font-semibold tracking-wide">ASIN</span>
          <span className="text-lg font-medium font-mono">{asin}</span>
        </div>
        <div className="flex flex-col space-y-1 text-slate-100">
          <span className="text-xs uppercase text-slate-500 font-semibold tracking-wide">Prezzo</span>
          <span className="text-lg font-medium tabular-nums">{prezzo ? `$${prezzo}` : "N/A"}</span>
        </div>
        <div className="flex flex-col space-y-1 text-slate-100">
          <span className="text-xs uppercase text-slate-500 font-semibold tracking-wide">Buy Box</span>
          <span
            className={`text-lg font-medium ${
              buyBox ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {buyBox ? "Si" : "No"}
          </span>
        </div>
        <div className="flex flex-col space-y-1 text-slate-100">
          <span className="text-xs uppercase text-slate-500 font-semibold tracking-wide">Stock</span>
          <span className="text-lg font-medium tabular-nums">{stock}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductHeader;
