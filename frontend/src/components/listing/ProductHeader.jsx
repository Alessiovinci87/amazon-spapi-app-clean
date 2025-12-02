const ProductHeader = ({ asin, image, prezzo, buyBox, stock }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center bg-zinc-800 p-4 rounded-lg shadow-md max-w-xl mx-auto gap-6">
      <img
        src={image}
        alt={`Immagine prodotto ASIN ${asin}`}
        className="w-32 h-32 object-contain rounded-md flex-shrink-0"
      />
      <div className="flex flex-col sm:flex-row sm:space-x-10 w-full justify-center">
        <div className="flex flex-col space-y-1 text-white">
          <span className="text-xs uppercase text-zinc-400 font-semibold">ASIN</span>
          <span className="text-lg font-medium">{asin}</span>
        </div>
        <div className="flex flex-col space-y-1 text-white">
          <span className="text-xs uppercase text-zinc-400 font-semibold">Prezzo</span>
          <span className="text-lg font-medium">{prezzo ? `$${prezzo}` : "N/A"}</span>
        </div>
        <div className="flex flex-col space-y-1 text-white">
          <span className="text-xs uppercase text-zinc-400 font-semibold">Buy Box</span>
          <span
            className={`text-lg font-medium ${
              buyBox ? "text-green-400" : "text-red-500"
            }`}
          >
            {buyBox ? "Sì" : "No"}
          </span>
        </div>
        <div className="flex flex-col space-y-1 text-white">
          <span className="text-xs uppercase text-zinc-400 font-semibold">Stock</span>
          <span className="text-lg font-medium">{stock}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductHeader;
