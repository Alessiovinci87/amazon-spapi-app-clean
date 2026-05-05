import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  X,
  Archive,
  Package,
  ArrowDownUp,
} from "lucide-react";

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors";

const StoricoAccessori = () => {
  const [movimenti, setMovimenti] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isMagazzino = localStorage.getItem("auth") === "magazzino";

  useEffect(() => {
    const fetchStorico = async () => {
      try {
        const res = await fetch("/api/v2/accessori/storico");
        if (!res.ok) throw new Error("Errore caricamento storico accessori");
        const data = await res.json();
        setMovimenti(data);
      } catch (err) {
        console.error("Errore storico accessori:", err);
      }
    };
    fetchStorico();
  }, []);

  const searchTerm = search.trim().toLowerCase();
  const filtered = searchTerm
    ? movimenti.filter(
        (m) =>
          (m.asin_accessorio || "").toLowerCase().includes(searchTerm) ||
          (m.nome || "").toLowerCase().includes(searchTerm) ||
          (m.nota || "").toLowerCase().includes(searchTerm)
      )
    : movimenti;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(isMagazzino ? "/magazzino" : "/accessori")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
              <Archive className="w-[18px] h-[18px] text-violet-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Storico Accessori</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Movimenti e variazioni</span>
            </div>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Magazzino</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Storico Accessori <span className="text-slate-500">— movimenti registrati.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Registro di tutte le variazioni di quantita degli accessori nel tempo.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Contatore */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-blue-400" />
          <div className="px-5 sm:px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                <ArrowDownUp className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">Totale movimenti</div>
                <p className="text-xs text-slate-400 tabular-nums">
                  <span className="text-violet-400 font-medium text-lg">{filtered.length}</span>{" "}
                  {filtered.length !== movimenti.length && <span className="text-slate-600">/ {movimenti.length}</span>}
                  {" "}registrati
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ricerca */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-md border bg-cyan-500/10 border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Ricerca</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-tight truncate">Filtra movimenti</h2>
              </div>
            </div>
            <div className="relative">
              <input type="text" placeholder="Cerca per ASIN, nome o nota..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabella movimenti */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
          {filtered.length === 0 ? (
            <div className="px-5 sm:px-6 py-12 text-center">
              <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nessun movimento registrato</p>
              {searchTerm && <p className="text-xs text-slate-600 mt-1">Prova a modificare i criteri di ricerca</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">ASIN</th>
                    <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Nome</th>
                    <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Precedente</th>
                    <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Nuova</th>
                    <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Nota</th>
                    <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Operatore</th>
                    <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((m, i) => {
                    const diff = (m.quantita_nuova ?? 0) - (m.quantita_precedente ?? 0);
                    const diffColor = diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-slate-500";
                    return (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-emerald-400">{m.asin_accessorio}</td>
                        <td className="px-5 py-3 text-white font-medium">{m.nome}</td>
                        <td className="px-5 py-3 text-right text-slate-400 tabular-nums">{m.quantita_precedente}</td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          <span className="text-white font-medium">{m.quantita_nuova}</span>
                          <span className={`ml-2 text-xs ${diffColor}`}>
                            {diff > 0 ? `+${diff}` : diff < 0 ? diff : "="}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-400 max-w-[200px] truncate">{m.nota || "-"}</td>
                        <td className="px-5 py-3 text-slate-400">{m.operatore || "-"}</td>
                        <td className="px-5 py-3 text-right text-[11px] font-mono text-slate-500 whitespace-nowrap">
                          {new Date(m.data).toLocaleString("it-IT")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Storico Accessori</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default StoricoAccessori;
