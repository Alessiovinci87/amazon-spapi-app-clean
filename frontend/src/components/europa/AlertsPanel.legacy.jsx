import { useState, useEffect } from "react";
import { Bell, CheckCheck, Filter } from "lucide-react";
import { toast } from "sonner";

const TIPO_LABEL = {
  STOCK_LOW:       "Stock basso",
  BUYBOX_LOST:     "Buy Box persa",
  LISTING_CHANGED: "Listing modificato",
};

const TIPO_COLOR = {
  STOCK_LOW:       "bg-red-500/10 border-red-500/20 text-red-300",
  BUYBOX_LOST:     "bg-orange-500/10 border-orange-500/20 text-orange-300",
  LISTING_CHANGED: "bg-blue-500/10 border-blue-500/20 text-blue-300",
};

export default function AlertsPanel({ asinList }) {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filtroLetto, setFiltroLetto] = useState("0");
  const [filtroAsin, setFiltroAsin] = useState("");

  async function caricaEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (filtroLetto !== "all") params.set("letto", filtroLetto);
      if (filtroAsin) params.set("asin", filtroAsin);
      const res = await fetch(`/api/v2/europa/alert-events?${params}`);
      const json = await res.json();
      setEvents(json.events ?? []);
      setTotal(json.total ?? 0);
    } catch {
      toast.error("Errore caricamento alert");
    } finally {
      setLoading(false);
    }
  }

  async function marcaLetto(id) {
    await fetch(`/api/v2/europa/alert-events/${id}/letto`, { method: "PATCH" });
    setEvents(prev => prev.map(e => e.id === id ? { ...e, letto: 1 } : e));
  }

  async function marcaTuttiLetti() {
    await fetch("/api/v2/europa/alert-events/leggi-tutti", { method: "PATCH" });
    setEvents(prev => prev.map(e => ({ ...e, letto: 1 })));
    toast.success("Tutti gli alert segnati come letti");
  }

  useEffect(() => { caricaEvents(); }, [filtroLetto, filtroAsin]);

  const nonLetti = events.filter(e => !e.letto).length;

  return (
    <div className="space-y-4">
      {/* Filtri */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-zinc-500" />
        <select
          value={filtroLetto}
          onChange={e => setFiltroLetto(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
        >
          <option value="0">Non letti</option>
          <option value="1">Letti</option>
          <option value="all">Tutti</option>
        </select>

        {asinList.length > 0 && (
          <select
            value={filtroAsin}
            onChange={e => setFiltroAsin(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="">Tutti gli ASIN</option>
            {asinList.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {nonLetti > 0 && (
          <button
            onClick={marcaTuttiLetti}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            Segna tutti letti ({nonLetti})
          </button>
        )}
      </div>

      {/* Lista eventi */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 animate-pulse">
            Caricamento…
          </div>
        ) : events.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <Bell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Nessun alert{filtroLetto === "0" ? " non letto" : ""}</p>
          </div>
        ) : (
          events.map(ev => (
            <div
              key={ev.id}
              className={`border rounded-xl p-4 flex items-start gap-3 transition-all ${
                ev.letto
                  ? "bg-zinc-900 border-zinc-800 opacity-60"
                  : `${TIPO_COLOR[ev.tipo] ?? "bg-zinc-800/50 border-zinc-700 text-zinc-200"} border`
              }`}
            >
              <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    {TIPO_LABEL[ev.tipo] ?? ev.tipo}
                  </span>
                  <span className="text-xs font-mono text-zinc-500">{ev.asin}</span>
                </div>
                <p className="text-sm">{ev.messaggio}</p>
                {ev.valore_attuale && (
                  <p className="text-xs mt-1 opacity-60">
                    Valore: {ev.valore_attuale}
                    {ev.valore_precedente ? ` (precedente: ${ev.valore_precedente})` : ""}
                  </p>
                )}
                <p className="text-xs mt-1 opacity-50">
                  {new Date(ev.created_at).toLocaleString("it-IT")}
                </p>
              </div>
              {!ev.letto && (
                <button
                  onClick={() => marcaLetto(ev.id)}
                  className="flex-shrink-0 text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-all"
                >
                  Letto
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {total > events.length && (
        <p className="text-center text-sm text-zinc-500">
          Mostrati {events.length} di {total} alert
        </p>
      )}
    </div>
  );
}
