import React from "react";

const SearchBarInventario = ({ search, setSearch }) => {
  return (
    <div className="mb-4 w-full max-w-lg mx-auto">
      <input
        type="search"
        placeholder="🔍 Cerca per nome o ASIN"
        className="w-full p-2 rounded bg-zinc-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Cerca prodotti o accessori per nome o ASIN"
      />
    </div>
  );
};

export default SearchBarInventario;
