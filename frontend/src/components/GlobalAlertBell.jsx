import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, ExternalLink, CheckCheck, AlertTriangle, TrendingDown, Package, RefreshCw, Sparkles, Puzzle, Boxes, Clock, CalendarX2 } from "lucide-react";
import { toast } from "sonner";
import { useAlertBellHost } from "./AlertBellContext";

const TIPO_CONFIG = {
  BUYBOX_LOST:        { label: "Buy Box persa",       icon: TrendingDown,   color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  LISTING_CHANGED:    { label: "Listing modificato",  icon: AlertTriangle,  color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  STOCK_LOW:          { label: "Stock basso",          icon: Package,        color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  LOTTO_IN_SCADENZA:  { label: "Lotto in scadenza",   icon: Clock,          color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  LOTTO_SCADUTO:      { label: "Lotto scaduto",       icon: CalendarX2,     color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  SFUSO_INSUFFICIENTE:{ label: "Sfuso insufficiente",  icon: AlertTriangle,  color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
};

const SOURCE_CONFIG = {
  prodotti:  { label: "Prodotti",   icon: Boxes,    color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  accessori: { label: "Accessori",  icon: Package,  color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  sfuso:     { label: "Sfuso",      icon: Package,  color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  onestep:   { label: "One Step",   icon: Sparkles, color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20" },
  topcoat:   { label: "Top Coat",   icon: Sparkles, color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20" },
};

function getSourceCfg(source) {
  if (!source) return null;
  if (SOURCE_CONFIG[source]) return SOURCE_CONFIG[source];
  if (source === "sfuso_copertura") return SOURCE_CONFIG["sfuso"];
  if (source === "lotto_scadenza") return { label: "Scadenze Lotti", icon: CalendarX2, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
  if (source.startsWith("modulo:")) return { label: source.replace("modulo:", ""), icon: Puzzle, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" };
  return null;
}

const MP_LABEL = {
  APJ6JRA9NG5V4: "IT", A13V1IB3VIYZZH: "FR", A1PA6795UKMFR9: "DE",
  A1RKKUPIHCS9HS: "ES", A1F83G8C2ARO7P: "GB", A1805IZSGTT6HS: "NL",
  AMEN7PMS3EDWL: "BE", A1C3SOZRARQ6R3: "PL",
};

function formatTs(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GlobalAlertBell({ inline = false }) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [rigenerando, setRigenerando] = useState(false);
  const panelRef = useRef(null);
  const { inlineActive } = useAlertBellHost();

  async function fetchAlerts() {
    try {
      const res = await fetch("/api/v2/europa/alert-events?letto=0&limit=8");
      if (!res.ok) return;
      const json = await res.json();
      const list = json.events ?? [];
      setAlerts(list);
      setUnreadCount(json.total ?? list.length);
    } catch { /* silenzioso */ }
  }

  // Poll ogni 5 minuti + fetch iniziale
  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Chiudi pannello cliccando fuori
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Se siamo nella modalità flottante (default in Layout) e una pagina sta
  // renderizzando un bell inline, non renderizziamo nulla per evitare doppi.
  // ⚠️ Early return DOPO tutti gli hooks per rispettare le rules-of-hooks.
  if (!inline && inlineActive) return null;

  async function segnaLetto(id) {
    await fetch(`/api/v2/europa/alert-events/${id}/letto`, { method: "PATCH" });
    setAlerts(prev => prev.filter(a => a.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function rigeneraAlert() {
    setRigenerando(true);
    try {
      const res = await fetch("/api/v2/europa/alert-events/rigenera-stock", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore");
      const nuovi = json.alertAperti?.delta ?? 0;
      const tot = json.totaleScansionati ?? 0;
      toast.success(
        nuovi > 0
          ? `Scansione completata: ${tot} prodotti, ${nuovi} nuovi alert`
          : `Scansione completata: ${tot} prodotti, nessun nuovo alert`
      );
      await fetchAlerts();
    } catch (e) {
      toast.error(`Rigenera fallito: ${e.message}`);
    } finally {
      setRigenerando(false);
    }
  }

  async function segnaTuttiLetti() {
    setMarking(true);
    try {
      await fetch("/api/v2/europa/alert-events/leggi-tutti", { method: "PATCH" });
      setAlerts([]);
      setUnreadCount(0);
    } finally {
      setMarking(false);
    }
  }

  function vaiADashboard() {
    setOpen(false);
    navigate("/europe/dashboard");
    // Piccolo delay per far montare la pagina, poi simula click su tab Alert
    setTimeout(() => {
      const el = document.querySelector('[data-tab="alert"]');
      if (el) el.click();
    }, 400);
  }

  const wrapperClass = inline
    ? "relative inline-block"
    : "fixed top-4 right-4 z-50";

  // Bottone trigger: rettangolare (inline) o cerchio flottante
  const trigger = inline ? (
    <button
      onClick={() => setOpen(o => !o)}
      className="relative inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 transition-colors"
      title="Notifiche e alert"
      type="button"
    >
      <Bell className={`w-4 h-4 ${unreadCount > 0 ? "text-yellow-400" : "text-slate-400"}`} />
      <span className="text-[11px] uppercase tracking-wider text-slate-400">Alert</span>
      {unreadCount > 0 && (
        <span className="ml-0.5 min-w-[18px] h-[18px] bg-red-500/90 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  ) : (
    <button
      onClick={() => setOpen(o => !o)}
      className="relative w-11 h-11 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all shadow-lg flex items-center justify-center"
      title="Notifiche e alert"
      type="button"
    >
      <Bell className={`w-5 h-5 ${unreadCount > 0 ? "text-yellow-400" : "text-slate-400"}`} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );

  // Posizionamento del dropdown: in modalità inline lo allineiamo sotto il bottone
  const panelClass = inline
    ? "absolute top-11 left-1/2 -translate-x-1/2 w-96 max-w-[92vw] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50"
    : "absolute top-14 right-0 w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden";

  return (
    <div ref={panelRef} className={wrapperClass}>
      {trigger}

      {/* Pannello dropdown */}
      {open && (
        <div className={panelClass}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-400" />
              <span className="font-semibold text-white text-sm">Notifiche</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">
                  {unreadCount} non {unreadCount === 1 ? "letto" : "letti"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={rigeneraAlert}
                disabled={rigenerando}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-50"
                title="Riscansiona tutti i prodotti dei moduli e genera gli alert mancanti"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rigenerando ? "animate-spin" : ""}`} />
                Rigenera
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={segnaTuttiLetti}
                  disabled={marking}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                  title="Segna tutti come letti"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tutti letti
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista alert */}
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Nessun alert non letto</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {alerts.map(alert => {
                  const srcCfg = getSourceCfg(alert.source);
                  const cfg = srcCfg || (TIPO_CONFIG[alert.tipo] ?? { label: alert.tipo, icon: AlertTriangle, color: "text-slate-400", bg: "bg-slate-800 border-slate-700" });
                  const Icon = cfg.icon;
                  const mp = alert.source ? (srcCfg?.label ?? alert.source) : (MP_LABEL[alert.marketplace_id] ?? alert.marketplace_id ?? "EU");
                  return (
                    <div key={alert.id} className={`px-4 py-3 border-l-2 ${cfg.bg} hover:bg-slate-800/30 transition-all`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                              <span className="text-xs text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded">{mp}</span>
                              <span
                                className="text-xs text-slate-600 font-mono hover:text-white cursor-pointer transition-colors"
                                onClick={() => navigator.clipboard.writeText(alert.asin)}
                                title="Copia ASIN"
                              >{alert.asin}</span>
                              {alert.nome && (
                                <span className="text-xs text-slate-400 truncate max-w-[140px]">{alert.nome}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{alert.messaggio}</p>
                            <p className="text-xs text-slate-600 mt-1">{formatTs(alert.created_at)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => segnaLetto(alert.id)}
                          className="flex-shrink-0 text-slate-600 hover:text-green-400 transition-colors mt-0.5"
                          title="Segna come letto"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/30 flex gap-3">
            <button
              onClick={() => { setOpen(false); navigate("/uffici/alert-center"); }}
              className="flex-1 flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Centro Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
