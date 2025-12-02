const CountryDetails = ({ bandiera, prezzo, buyBox, stock, commissioni }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-md bg-gray-100 shadow-sm">
      {/* Bandiera */}
      <img
        src={bandiera}
        alt="Bandiera"
        className="w-8 h-6 object-cover rounded-sm flex-shrink-0"
      />

      {/* Dati in griglia responsiva */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full text-sm">
        <div>Prezzo: {prezzo ? `$${prezzo}` : "N/A"}</div>
        <div className={buyBox ? "text-green-600 font-semibold" : "text-red-500"}>
          Buy Box: {buyBox ? "Sì" : "No"}
        </div>
        <div>Stock: {stock ?? "N/A"}</div>
        <div>
          Commissioni: {commissioni !== null && commissioni !== undefined ? `${commissioni} €` : "N/A"}
        </div>
      </div>
    </div>
  );
};

export default CountryDetails;
