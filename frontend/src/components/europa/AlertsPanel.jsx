import { useState, useEffect } from "react";
import {
  Bell, CheckCheck, Filter,
  PackageX, AlertTriangle, Trophy, FileEdit, FlaskConical, CalendarX, CalendarClock,
  TrendingUp, MessageSquareWarning,
} from "lucide-react";
import { toast } from "sonner";

// Meta per ogni tipo di alert: label, accent color (slate palette), icona.
// I colori sono un "sistema": rose=critico, amber=warning, sky=info, violet=neutro.
const TIPO_META = {
  STOCK_LOW:            { label: "Stock basso",            accent: "rose",   Icon: PackageX },
  SFUSO_INSUFFICIENTE:  { label: "Sfuso insufficiente",    accent: "rose",   Icon: FlaskConical },
  LOTTO_SCADUTO:        { label: "Lotto scaduto",          accent: "rose",   Icon: CalendarX },
  LOTTO_IN_SCADENZA:    { label: "Lotto in scadenza",      accent: "amber",  Icon: CalendarClock },
  BUYBOX_LOST:          { label: "Buy Box persa",          accent: "amber",  Icon: Trophy },
  LISTING_CHANGED:      { label: "Listing modificato",     accent: "sky",    Icon: FileEdit },
  PRICE_CHANGED:        { label: "Prezzo cambiato",        accent: "violet", Icon: TrendingUp },
  NEW_NEGATIVE_FEEDBACK:{ label: "Nuovo feedback 1–3★",    accent: "rose",   Icon: MessageSquareWarning },
};
const DEFAULT_META = { label: "Alert", accent: "slate", Icon: AlertTriangle };

// Mappa accent -> classi Tailwind (statiche per evitare di perderle in purge)
const ACCENT_CLASSES = {
  rose:   { bar: "bg-rose-500",   badge: "bg-rose-500/10 border-rose-500/30 text-rose-300",   icon: "text-rose-400" },
  amber:  { bar: "bg-amber-500",  badge: "bg-amber-500/10 border-amber-500/30 text-amber-300", icon: "text-amber-400" },
  sky:    { bar: "bg-sky-500",    badge: "bg-sky-500/10 border-sky-500/30 text-sky-300",       icon: "text-sky-400" },
  violet: { bar: "bg-violet-500", badge: "bg-violet-500/10 border-violet-500/30 text-violet-300", icon: "text-violet-400" },
  slate:  { bar: "bg-slate-600",  badge: "bg-slate-800 border-slate-700 text-slate-300",       icon: "text-slate-400" },
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
      {/* Filtri — card con barra accent violet */}
      <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500" />
        <div className="pl-5 pr-4 py-3 flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filtroLetto}
            onChange={e => setFiltroLetto(e.target.value)}
            className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/60"
          >
            <option value="0">Non letti</option>
            <option value="1">Letti</option>
            <option value="all">Tutti</option>
          </select>

          {asinList?.length > 0 && (
            <select
              value={filtroAsin}
              onChange={e => setFiltroAsin(e.target.value)}
              className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500/60"
            >
              <option value="">Tutti gli ASIN</option>
              {asinList.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}

          <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 ml-2">
            {total} totali · <span className="text-amber-400 tabular-nums">{nonLetti}</span> non letti
          </span>

          {nonLetti > 0 && (
            <button
              onClick={marcaTuttiLetti}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-md border border-emerald-500/40 hover:border-emerald-400/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Segna tutti letti ({nonLetti})
            </button>
          )}
        </div>
      </div>

      {/* Lista eventi */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-8 text-center text-slate-500 animate-pulse">
            Caricamento…
          </div>
        ) : events.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-lg p-12 text-center">
            <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              Nessun alert{filtroLetto === "0" ? " non letto" : ""}
            </p>
          </div>
        ) : (
          events.map(ev => {
            const meta = TIPO_META[ev.tipo] || DEFAULT_META;
            const accent = ACCENT_CLASSES[meta.accent];
            const Icon = meta.Icon;
            const isRead = !!ev.letto;

            return (
              <div
                key={ev.id}
                className={`relative bg-slate-900/60 border rounded-lg overflow-hidden transition-all ${
                  isRead ? "border-slate-800 opacity-50" : "border-slate-800"
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isRead ? "bg-slate-700" : accent.bar}`} />
                <div className="pl-5 pr-4 py-3 flex items-start gap-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isRead ? "text-slate-500" : accent.icon}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-medium uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border ${accent.badge}`}>
                        {meta.label}
                      </span>
                      {ev.asin && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {ev.asin}
                        </span>
                      )}
                      {ev.marketplace_id && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {ev.marketplace_id}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 leading-snug">{ev.messaggio}</p>
                    {ev.valore_attuale && (
                      <p className="text-xs mt-1 text-slate-500 tabular-nums">
                        Valore: <span className="text-slate-300">{ev.valore_attuale}</span>
                        {ev.valore_precedente ? <> · precedente: <span className="text-slate-400">{ev.valore_precedente}</span></> : null}
                      </p>
                    )}
                    <p className="text-[11px] mt-1 text-slate-600 tabular-nums">
                      {new Date(ev.created_at).toLocaleString("it-IT")}
                    </p>
                  </div>
                  {!isRead && (
                    <button
                      onClick={() => marcaLetto(ev.id)}
                      className="flex-shrink-0 text-[11px] px-2 py-1 rounded-md border border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Segna letto
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {total > events.length && (
        <p className="text-center text-xs text-slate-500 tabular-nums">
          Mostrati {events.length} di {total} alert
        </p>
      )}
    </div>
  );
}
