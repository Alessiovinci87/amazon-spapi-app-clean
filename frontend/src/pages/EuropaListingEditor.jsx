import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Globe,
  Search,
  RefreshCw,
  Loader,
  ChevronRight,
  Package,
  X,
} from "lucide-react";

const COUNTRIES = [
  { code: "IT", label: "Italia" },
  { code: "DE", label: "Germania" },
  { code: "FR", label: "Francia" },
  { code: "ES", label: "Spagna" },
  { code: "UK", label: "UK" },
  { code: "NL", label: "Olanda" },
  { code: "BE", label: "Belgio" },
  { code: "PL", label: "Polonia" },
  { code: "SE", label: "Svezia" },
];

const Flag = ({ code, className = "h-3 w-auto" }) => {
  const iso = code === "UK" ? "gb" : code.toLowerCase();
  return <img src={`https://flagcdn.com/24x18/${iso}.png`} alt={code} className={className} />;
};

export default function EuropaListingEditor() {
  const navigate = useNavigate();
  const { country: routeCountry } = useParams();

  const [country, setCountry] = useState(routeCountry?.toUpperCase() || "IT");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [syncState, setSyncState] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const fetchList = useCallback(async (c, q) => {
    setLoading(true);
    try {
      const url = `/api/v2/listings-editor/list?country=${c}&limit=500${q ? `&search=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) {
        setRows(json.rows || []);
        setTotal(json.total || 0);
      } else {
        toast.error(json.error || "Errore caricamento listing");
      }
    } catch {
      toast.error("Errore di rete");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchList(country, search), 250);
    return () => clearTimeout(t);
  }, [country, search, fetchList]);

  // Sync status polling
  useEffect(() => {
    if (!syncing) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v2/listings-editor/sync/status?country=${country}`);
        const json = await res.json();
        if (json.ok) {
          setSyncState(json.state);
          if (json.state && !json.state.running) {
            setSyncing(false);
            if (json.state.error) {
              toast.error(`Sync fallito: ${json.state.error}`);
            } else if (json.state.result) {
              const r = json.state.result;
              toast.success(`Sync ${country} completato: ${r.sku_saved} SKU`);
              fetchList(country, search);
            }
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [syncing, country, search, fetchList]);

  const handleSync = async () => {
    try {
      const res = await fetch(`/api/v2/listings-editor/sync?country=${country}`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setSyncing(true);
        setSyncState({ running: true, startedAt: json.startedAt });
        toast.info(`Sync ${country} avviato in background…`);
      } else {
        toast.error(json.error || "Errore avvio sync");
      }
    } catch {
      toast.error("Errore di rete");
    }
  };

  // Raggruppamento per parent_asin: prodotti con stesso parent_asin stanno insieme
  const grouped = useMemo(() => {
    const groups = new Map();
    for (const r of rows) {
      const key = r.parent_asin || r.asin || r.sku;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    return Array.from(groups.entries()).map(([key, items]) => ({
      parentKey: key,
      items: items.sort((a, b) => (a.title || "").localeCompare(b.title || "")),
    }));
  }, [rows]);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Header */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/europe")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <Globe className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Editor Listing</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Europa · {country}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Editor listing</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Listing per paese <span className="text-slate-500">— modifica titolo, bullet e descrizione.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-3xl">
            Seleziona un paese, sincronizza i listing dal tuo Seller Central, cerca il prodotto e clicca per modificarlo.
          </p>
        </div>
      </section>

      {/* Country tabs */}
      <div className="relative border-b border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="flex gap-1 overflow-x-auto scrollbar-none py-3">
            {COUNTRIES.map((c) => {
              const active = country === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => setCountry(c.code)}
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap border transition-all ${
                    active
                      ? "bg-blue-500/15 border-blue-500/50 text-blue-200"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <Flag code={c.code} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="relative border-b border-slate-800">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per titolo, ASIN, SKU, parent…"
              className="w-full bg-slate-900/60 border border-slate-800 rounded-md pl-9 pr-9 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">{rows.length}/{total}</span>
            <button
              onClick={handleSync}
              disabled={syncing}
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[11px] font-medium transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sync in corso…" : `Sincronizza ${country}`}
            </button>
          </div>
        </div>
        {syncState?.running && (
          <div className="px-6 sm:px-10 lg:px-16 pb-3 text-[11px] text-blue-400">
            Sync avviato a {new Date(syncState.startedAt).toLocaleTimeString()} — attesa ~3 min per country con molti SKU.
          </div>
        )}
      </div>

      {/* Lista */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader className="w-6 h-6 text-blue-400 animate-spin" />
            <p className="text-slate-500 text-sm">Caricamento listing…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-slate-900/60 border border-slate-800 rounded-lg">
            <Package className="w-10 h-10 text-slate-700" />
            <p className="text-sm text-slate-500">
              {total === 0
                ? `Nessun listing in cache per ${country}. Clicca "Sincronizza ${country}" per importare i prodotti da Amazon.`
                : `Nessun risultato per "${search}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.parentKey} className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
                {group.items.length > 1 && (
                  <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Parent</span>
                    <span className="text-[11px] font-mono text-slate-400">{group.parentKey}</span>
                    <span className="text-[10px] text-slate-500">{group.items.length} varianti</span>
                  </div>
                )}
                <div className="divide-y divide-slate-800/60">
                  {group.items.map((r) => {
                    const thumb = r.images?.[0];
                    return (
                      <button
                        key={`${r.sku}-${r.country}`}
                        onClick={() => navigate(`/europe/listing-editor/${country}/${encodeURIComponent(r.sku)}`)}
                        type="button"
                        className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-slate-800/30 transition-colors group"
                      >
                        <div className="w-12 h-12 rounded-md bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate group-hover:text-blue-200 transition-colors">
                            {r.title || <span className="text-slate-600 italic">Senza titolo</span>}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[10px] font-mono text-slate-500">
                            <span>{r.asin || "—"}</span>
                            <span>·</span>
                            <span className="truncate">{r.sku}</span>
                            {r.bullets?.length > 0 && (
                              <>
                                <span>·</span>
                                <span>{r.bullets.length} bullet</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Editor Listing</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
}
