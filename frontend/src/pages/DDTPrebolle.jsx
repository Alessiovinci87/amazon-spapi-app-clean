import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Package,
  MapPin,
  Calendar,
  User,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  X,
  Filter,
} from "lucide-react";

const DDTPrebolle = () => {
  const navigate = useNavigate();
  const [prebolle, setPrebolle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch prebolle (spedizioni confermate)
  useEffect(() => {
    const fetchPrebolle = async () => {
      try {
        const res = await fetch("/api/v2/ddt/prebolle");
        if (!res.ok) throw new Error("Errore caricamento prebolle");
        const data = await res.json();
        setPrebolle(data);
      } catch (err) {
        console.error("Errore fetch prebolle:", err);
        setError("Impossibile caricare le spedizioni");
      } finally {
        setLoading(false);
      }
    };
    fetchPrebolle();
  }, []);

  // Funzione per ottenere bandiera emoji
  const getPaeseBadge = (paese) => {
    const flags = {
      "IT": "🇮🇹",
      "FR": "🇫🇷",
      "ES": "🇪🇸",
      "DE": "🇩🇪",
      "BE": "🇧🇪",
      "NL": "🇳🇱",
      "SE": "🇸🇪",
      "PL": "🇵🇱",
      "IE": "🇮🇪"
    };
    return flags[paese] || "🌍";
  };

  // Filtro ricerca
  const prebolleFiltrate = prebolle.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const progressivo = (p.progressivo || "").toString().toLowerCase();
    const paese = (p.paese || "").toLowerCase();
    const operatore = (p.operatore || "").toLowerCase();
    const prodotti = (p.righe || [])
      .map((r) => r.prodotto_nome?.toLowerCase() || "")
      .join(" ");

    return (
      progressivo.includes(term) ||
      paese.includes(term) ||
      operatore.includes(term) ||
      prodotti.includes(term)
    );
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Caricamento spedizioni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">DDT Pics Nails</h1>
                <p className="text-zinc-400 mt-1">Seleziona una spedizione per generare il DDT</p>
              </div>
            </div>

            <button
              onClick={() => navigate("/uffici/ddt")}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>
          </div>
        </div>

        {/* ========== ERRORE ========== */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* ========== FILTRO RICERCA ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-purple-400" />
            Cerca Spedizione
          </h2>

          <div className="relative">
            <input
              type="text"
              placeholder="Cerca per progressivo, paese, operatore o prodotto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white px-12 py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
            <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {searchTerm && (
            <div className="mt-3 px-3 py-2 bg-purple-900/20 border border-purple-700/30 rounded-lg">
              <p className="text-sm text-purple-400">
                Trovate <strong>{prebolleFiltrate.length}</strong> spedizioni
              </p>
            </div>
          )}
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-xl p-5 text-center">
            <p className="text-4xl font-bold text-white mb-1">{prebolle.length}</p>
            <p className="text-sm text-purple-200 font-medium">Prebolle Totali</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-700/30 rounded-xl p-5 text-center">
            <p className="text-4xl font-bold text-white mb-1">
              {prebolle.reduce((sum, p) => sum + (p.righe?.length || 0), 0)}
            </p>
            <p className="text-sm text-emerald-200 font-medium">Prodotti Totali</p>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/30 rounded-xl p-5 text-center">
            <p className="text-4xl font-bold text-white mb-1">
              {prebolle.reduce((sum, p) => 
                sum + (p.righe?.reduce((s, r) => s + (r.quantita || 0), 0) || 0), 0
              )}
            </p>
            <p className="text-sm text-blue-200 font-medium">Pezzi Totali</p>
          </div>
        </div>

        {/* ========== LISTA PREBOLLE ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
            <CheckCircle className="w-5 h-5 text-purple-400" />
            Spedizioni Confermate
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-normal">
              {prebolleFiltrate.length}
            </span>
          </h2>

          {prebolleFiltrate.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400 text-lg">
                {searchTerm ? "Nessuna spedizione trovata" : "Nessuna spedizione confermata"}
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                {searchTerm 
                  ? "Prova con un termine diverso" 
                  : "Conferma delle spedizioni dalla sezione Spedizioni"
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prebolleFiltrate.map((prebolla) => (
                <button
                  key={prebolla.id}
                  onClick={() => navigate(`/uffici/ddt/scomponi/${prebolla.id}`)}
                  className="group bg-zinc-800 border border-zinc-700 hover:border-purple-500/50 rounded-xl p-5 text-left transition-all hover:shadow-lg hover:shadow-purple-500/10"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getPaeseBadge(prebolla.paese)}</span>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {prebolla.progressivo}
                        </h3>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                          {prebolla.stato}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="w-4 h-4" />
                      <span>{prebolla.data || "Data non specificata"}</span>
                    </div>

                    {prebolla.operatore && (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <User className="w-4 h-4" />
                        <span>{prebolla.operatore}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-zinc-400">
                      <Package className="w-4 h-4" />
                      <span>
                        {prebolla.righe?.length || 0} prodotti · {" "}
                        {prebolla.righe?.reduce((s, r) => s + (r.quantita || 0), 0) || 0} pezzi
                      </span>
                    </div>
                  </div>

                  {/* Preview prodotti */}
                  {prebolla.righe && prebolla.righe.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-700">
                      <p className="text-xs text-zinc-500 mb-2">Prodotti:</p>
                      <div className="flex flex-wrap gap-2">
                        {prebolla.righe.slice(0, 3).map((riga, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-zinc-700 text-zinc-300 rounded text-xs truncate max-w-[150px]"
                          >
                            {riga.prodotto_nome}
                          </span>
                        ))}
                        {prebolla.righe.length > 3 && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                            +{prebolla.righe.length - 3} altri
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DDTPrebolle;