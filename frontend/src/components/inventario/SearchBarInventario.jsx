import React from "react";
import { Search } from "lucide-react";

const SearchBarInventario = ({ search, setSearch }) => {
  return (
    <div className="relative w-full max-w-xl">
      <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        placeholder="Cerca per nome o ASIN…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Cerca prodotti o accessori per nome o ASIN"
        className="w-full pl-10 pr-3 py-2.5 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
      />
    </div>
  );
};

export default SearchBarInventario;
