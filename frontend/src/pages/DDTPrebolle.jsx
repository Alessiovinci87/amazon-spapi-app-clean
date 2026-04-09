import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Package,
  Calendar,
  User,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  X,
  LogOut,
} from "lucide-react";

const Flag = ({ code, className = "h-3.5 w-auto inline-block align-middle" }) => {
  const map = { IT: "it", FR: "fr", ES: "es", DE: "de", BE: "be", NL: "nl", SE: "se", PL: "pl", IE: "ie" };
  const c = map[(code || "").toUpperCase()] || code?.toLowerCase();
  return c ? <img src={`https://flagcdn.com/24x18/${c}.png`} alt={code} className={className} /> : null;
};

function StatTile({ icon: Icon, label, value, accent = "violet" }) {
  const m = {
    violet: "bg-violet-500/10 border-violet-500/40 text-violet-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    blue: "bg-blue-500/10 border-blue-500/40 text-blue-400",
  };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${m[accent]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{label}</div>
    </div>
  );
}

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors";

const DDTPrebolle = () => {
  const navigate = useNavigate();
  const [prebolle, setPrebolle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPrebolle = async () => {
      try {
        const res = await fetch("/api/v2/ddt/prebolle");
        if (!res.ok) throw new Error("Errore caricamento prebolle");
        const data = await res.json();
        setPrebolle(data);
      } catch (err) {
        setError("Impossibile caricare le spedizioni");
      } finally {
        setLoading(false);
      }
    };
    fetchPrebolle();
  }, []);

  const prebolleFiltrate = prebolle.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const progressivo = (p.progressivo || "").toString().toLowerCase();
    const paese = (p.paese || "").toLowerCase();
    const operatore = (p.operatore || "").toLowerCase();
    const prodotti = (p.righe || []).map((r) => r.prodotto_nome?.toLowerCase() || "").join(" ");
    return progressivo.includes(term) || paese.includes(term) || operatore.includes(term) || prodotti.includes(term);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Caricamento spedizioni...</p>
        </div>
      </div>
    );
  }

  const totProdotti = prebolle.reduce((s, p) => s + (p.righe?.length || 0), 0);
  const totPezzi = prebolle.reduce((s, p) => s + (p.righe?.reduce((a, r) => a + (r.quantita || 0), 0) || 0), 0);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/uffici/ddt")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
              <FileText className="w-[18px] h-[18px] text-violet-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">DDT Pics Nails</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Nexus · Documenti di Trasporto</span>
            </div>
          </div>
          <button onClick={() => navigate("/uffici/ddt")} type="button" className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> DDT
          </button>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">DDT Aziendale</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Seleziona una spedizione <span className="text-slate-500">— per generare il DDT.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Scegli tra le spedizioni confermate per creare il documento di trasporto con intestazione Pics Nails.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">

        {/* Errore */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-5 py-3 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile icon={CheckCircle} label="Prebolle totali" value={prebolle.length} accent="violet" />
          <StatTile icon={Package} label="Prodotti totali" value={totProdotti} accent="emerald" />
          <StatTile icon={Package} label="Pezzi totali" value={totPezzi} accent="blue" />
        </div>

        {/* Search */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
          <div className="px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md border bg-violet-500/10 border-violet-500/40 text-violet-400 flex items-center justify-center flex-shrink-0">
                <Search className="w-[18px] h-[18px]" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">Cerca Spedizione</h2>
            </div>
            <div className="relative">
              <input type="text" placeholder="Cerca per progressivo, paese, operatore o prodotto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="mt-3 text-[11px] text-violet-400">
                Trovate <span className="font-semibold">{prebolleFiltrate.length}</span> spedizioni
              </div>
            )}
          </div>
        </div>

        {/* Lista prebolle */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
          <div className="px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md border bg-violet-500/10 border-violet-500/40 text-violet-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Spedizioni</div>
                  <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">Confermate</h2>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[11px] font-medium tabular-nums">
                {prebolleFiltrate.length}
              </span>
            </div>

            {prebolleFiltrate.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {searchTerm ? "Nessuna spedizione trovata" : "Nessuna spedizione confermata"}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {searchTerm ? "Prova con un termine diverso" : "Conferma delle spedizioni dalla sezione Spedizioni"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prebolleFiltrate.map((prebolla) => (
                  <button
                    key={prebolla.id}
                    onClick={() => navigate(`/uffici/ddt/scomponi/${prebolla.id}`)}
                    type="button"
                    className="group bg-slate-800/40 border border-slate-700/60 hover:border-violet-500/50 rounded-md px-5 py-4 text-left transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Flag code={prebolla.paese} className="h-4 w-auto" />
                        <div>
                          <h3 className="text-sm font-semibold text-white">{prebolla.progressivo}</h3>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium">
                            {prebolla.stato}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    </div>

                    <div className="space-y-1.5 text-[13px]">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{prebolla.data || "Data non specificata"}</span>
                      </div>
                      {prebolla.operatore && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <User className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{prebolla.operatore}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-400">
                        <Package className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          {prebolla.righe?.length || 0} prodotti · {prebolla.righe?.reduce((s, r) => s + (r.quantita || 0), 0) || 0} pezzi
                        </span>
                      </div>
                    </div>

                    {prebolla.righe && prebolla.righe.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/60">
                        <div className="flex flex-wrap gap-1.5">
                          {prebolla.righe.slice(0, 3).map((riga, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-700/60 text-slate-300 rounded text-[11px] truncate max-w-[140px]">
                              {riga.prodotto_nome}
                            </span>
                          ))}
                          {prebolla.righe.length > 3 && (
                            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded text-[11px]">
                              +{prebolla.righe.length - 3}
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
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>Nexus · DDT Pics Nails</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DDTPrebolle;
