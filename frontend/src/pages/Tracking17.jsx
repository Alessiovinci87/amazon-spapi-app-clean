import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Truck,
  PackageSearch,
  RefreshCw,
  Trash2,
  PlusCircle,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageCheck,
  Loader2,
  ExternalLink,
  X,
  MapPin,
  Building2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { fetchJSON, API_BASE } from "../utils/api";
import QuotaBadge from "../components/tracking17/QuotaBadge";

// =============================================================
// Mappa status -> meta UI
// =============================================================
const STATUS_META = {
  Delivered:           { icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  OutForDelivery:      { icon: Truck,        cls: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  InTransit:           { icon: Truck,        cls: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  AvailableForPickup:  { icon: PackageCheck, cls: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
  InfoReceived:        { icon: Clock,        cls: "text-slate-300 bg-slate-500/10 border-slate-500/30" },
  DeliveryFailure:     { icon: AlertTriangle,cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  Exception:           { icon: AlertTriangle,cls: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  Expired:             { icon: AlertTriangle,cls: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30" },
  NotFound:            { icon: AlertTriangle,cls: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
};

const STATUS_LABEL_IT = {
  NotFound: "Non trovato",
  InfoReceived: "In elaborazione",
  InTransit: "In transito",
  Expired: "Scaduto",
  AvailableForPickup: "Pronto al ritiro",
  OutForDelivery: "In consegna",
  DeliveryFailure: "Consegna fallita",
  Delivered: "Consegnato",
  Exception: "Eccezione",
};

const STAGE_LABEL_IT = {
  InfoReceived: "Informazioni ricevute",
  InTransit: "In transito",
  PickedUp: "Ritirato",
  OutForDelivery: "In consegna",
  Delivered: "Consegnato",
  Exception: "Eccezione",
  AvailableForPickup: "Pronto al ritiro",
  DeliveryFailure: "Consegna fallita",
  Returning: "In rientro",
  Returned: "Restituito",
};

function fmtDateTime(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function StatusBadge({ status, size = "sm" }) {
  const meta = STATUS_META[status] || { icon: Clock, cls: "text-slate-400 bg-slate-500/10 border-slate-500/30" };
  const Icon = meta.icon;
  const label = STATUS_LABEL_IT[status] || status || "—";
  const sz = size === "lg"
    ? "px-3 py-1 text-sm gap-2"
    : "px-2 py-0.5 text-[11px] gap-1.5";
  const iconSize = size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <span className={`inline-flex items-center rounded border font-medium ${sz} ${meta.cls}`}>
      <Icon className={iconSize} />
      {label}
    </span>
  );
}

function SectionCard({ accent = "blue", icon: Icon, eyebrow, title, action, children }) {
  const accentMap = {
    blue:    "bg-blue-400/60",
    emerald: "bg-emerald-400/60",
    amber:   "bg-amber-400/60",
    violet:  "bg-violet-400/60",
  };
  const iconBg = {
    blue:    "bg-blue-500/10 border-blue-500/40 text-blue-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    amber:   "bg-amber-500/10 border-amber-500/40 text-amber-400",
    violet:  "bg-violet-500/10 border-violet-500/40 text-violet-400",
  };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentMap[accent]}`} />
      <div className="px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 ${iconBg[accent]}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{eyebrow}</div>
              )}
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">{title}</h2>
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

// =============================================================
// Helper: POST register / refresh che restituisce SEMPRE il body JSON
// (anche su 400/429/500). fetchJSON invece lancia su HTTP error.
// =============================================================
async function apiCall(path, options = {}) {
  const url = (API_BASE || "/api/v2").replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
  const token = localStorage.getItem("nexus_token");
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  let body = {};
  try { body = await res.json(); } catch { /* no body */ }
  return { status: res.status, ok: res.ok, body };
}

const Tracking17 = () => {
  const navigate = useNavigate();
  const [tutti, setTutti] = useState([]);
  const [suggerimenti, setSuggerimenti] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [search, setSearch] = useState("");
  const [quotaTick, setQuotaTick] = useState(0);

  // Form aggiunta manuale
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualNumber, setManualNumber] = useState("");
  const [manualNota, setManualNota] = useState("");
  const [manualCarrier, setManualCarrier] = useState("");
  const [manualError, setManualError] = useState(null);
  const [manualNeedsCarrier, setManualNeedsCarrier] = useState(false);

  // Drawer dettaglio
  const [detail, setDetail] = useState(null); // tracking object
  const detailKeyRef = useRef(null); // tracking_number attualmente aperto, per scartare fetch obsoleti

  // Conferma eliminazione (modal in stile Nexus invece di confirm() nativo)
  const [deleteConfirm, setDeleteConfirm] = useState(null); // tracking_number da eliminare

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sugg] = await Promise.all([
        fetchJSON("tracking17/tutti"),
        fetchJSON("tracking17/suggerimenti-ddt"),
      ]);
      setTutti(Array.isArray(list) ? list : []);
      setSuggerimenti(Array.isArray(sugg) ? sugg : []);
    } catch (err) {
      console.error(err);
      toast.error("Errore caricamento tracking");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Carica corrieri al primo apri del form manuale
  useEffect(() => {
    if (!showAddManual || carriers.length > 0) return;
    fetchJSON("tracking17/carriers")
      .then((c) => setCarriers(Array.isArray(c) ? c : []))
      .catch(() => {});
  }, [showAddManual, carriers.length]);

  const setBusyFor = (num, action) =>
    setBusy((b) => ({ ...b, [num]: action }));
  const clearBusy = (num) =>
    setBusy((b) => { const c = { ...b }; delete c[num]; return c; });

  const doRegister = async ({ tracking_number, ddt_id = null, nota = null, carrier = null }) => {
    const { status, body } = await apiCall("tracking17/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking_number, ddt_id, nota, carrier }),
    });
    return { status, body };
  };

  const registerFromSuggestion = async (s) => {
    setBusyFor(s.tracking_number, "register");
    try {
      const { status, body } = await doRegister({
        tracking_number: s.tracking_number,
        ddt_id: s.ddt_id,
      });
      if (status === 429) {
        toast.error("Quota 17TRACK esaurita");
      } else if (!body.ok) {
        toast.error(body.error || `Errore registrazione (HTTP ${status})`);
      } else if (body.pending) {
        toast.info(body.message || "Tracking registrato — info in arrivo");
      } else {
        toast.success(`Tracking ${s.tracking_number} registrato`);
      }
      await loadAll();
      setQuotaTick((x) => x + 1);
    } finally {
      clearBusy(s.tracking_number);
    }
  };

  const refreshTracking = async (tracking_number) => {
    setBusyFor(tracking_number, "refresh");
    try {
      await fetchJSON(`tracking17/refresh/${encodeURIComponent(tracking_number)}`, { method: "POST" });
      toast.success(`Aggiornato ${tracking_number}`);
      await loadAll();
    } catch (err) {
      toast.error(err?.message || "Errore aggiornamento");
    } finally {
      clearBusy(tracking_number);
    }
  };

  // Apre il modal di conferma eliminazione
  const requestDeleteTracking = (tracking_number) => {
    setDeleteConfirm(tracking_number);
  };

  // Esegue l'eliminazione effettiva (chiamato dal modal di conferma)
  const performDelete = async () => {
    const tracking_number = deleteConfirm;
    if (!tracking_number) return;
    setDeleteConfirm(null);
    setBusyFor(tracking_number, "delete");
    try {
      await fetchJSON(`tracking17/${encodeURIComponent(tracking_number)}`, { method: "DELETE" });
      toast.success("Tracking eliminato");
      await loadAll();
      if (detail?.tracking_number === tracking_number) closeDetail();
    } catch (err) {
      toast.error(err?.message || "Errore eliminazione");
    } finally {
      clearBusy(tracking_number);
    }
  };

  const submitManual = async () => {
    const num = manualNumber.trim();
    if (num.length < 4) {
      setManualError("Tracking number troppo corto");
      return;
    }
    setManualError(null);
    setBusyFor(num, "register");
    try {
      const { status, body } = await doRegister({
        tracking_number: num,
        nota: manualNota.trim() || null,
        carrier: manualCarrier ? Number(manualCarrier) : null,
      });

      if (status === 429) {
        setManualError("Quota 17TRACK esaurita");
        toast.error("Quota 17TRACK esaurita");
        return;
      }

      if (!body.ok) {
        setManualError(body.error || `Errore (HTTP ${status})`);
        if (body.needs_carrier) {
          setManualNeedsCarrier(true);
          toast.error("Corriere non rilevato automaticamente. Selezionalo manualmente.");
        } else {
          toast.error(body.error || "Errore registrazione");
        }
        return;
      }

      if (body.pending) toast.info(body.message || "Tracking registrato — info in arrivo");
      else toast.success(`Tracking ${num} registrato`);

      await loadAll();
      setQuotaTick((x) => x + 1);
      setManualNumber("");
      setManualNota("");
      setManualCarrier("");
      setManualNeedsCarrier(false);
      setManualError(null);
      setShowAddManual(false);
    } finally {
      clearBusy(num);
    }
  };

  const closeManual = () => {
    setShowAddManual(false);
    setManualNumber("");
    setManualNota("");
    setManualCarrier("");
    setManualError(null);
    setManualNeedsCarrier(false);
  };

  const openDetail = async (t) => {
    detailKeyRef.current = t.tracking_number;
    setDetail(t); // mostra subito i dati cachati
    // se gli eventi non sono cachati, fai un refresh on-demand
    if (!Array.isArray(t.events) || t.events.length === 0) {
      try {
        await fetchJSON(`tracking17/refresh/${encodeURIComponent(t.tracking_number)}`, { method: "POST" });
        const list = await fetchJSON("tracking17/tutti");
        setTutti(Array.isArray(list) ? list : []);
        // Se nel frattempo l'utente ha aperto un altro tracking o chiuso il drawer,
        // scarta il risultato per evitare overwrite
        if (detailKeyRef.current !== t.tracking_number) return;
        const fresh = (Array.isArray(list) ? list : []).find((x) => x.tracking_number === t.tracking_number);
        if (fresh) setDetail(fresh);
      } catch { /* ignora, mostra cache */ }
    }
  };

  const closeDetail = () => {
    detailKeyRef.current = null;
    setDetail(null);
  };

  const filteredTutti = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tutti;
    return tutti.filter((t) =>
      [t.tracking_number, t.status_label, t.ddt_numero, t.ddt_brand, t.nota, t.provider_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [tutti, search]);

  const stats = useMemo(() => {
    const out = { totale: tutti.length, in_transito: 0, consegnati: 0, problemi: 0 };
    for (const t of tutti) {
      if (t.status === "Delivered") out.consegnati++;
      else if (t.status === "Exception" || t.status === "DeliveryFailure" || t.status === "NotFound") out.problemi++;
      else if (t.status === "InTransit" || t.status === "OutForDelivery" || t.status === "InfoReceived" || t.status === "AvailableForPickup") out.in_transito++;
    }
    return out;
  }, [tutti]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* === Header === */}
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-950/85 border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-md border border-slate-800 hover:border-slate-700 hover:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Indietro"
              aria-label="Torna indietro"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Logistica</div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white">Tracking 17TRACK</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <QuotaBadge refreshKey={quotaTick} />
            <button
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Ricarica
            </button>
            <button
              onClick={() => setShowAddManual((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-500/10 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20 text-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Aggiungi manuale
            </button>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-6 sm:px-8 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Totali" value={stats.totale} accent="blue" />
            <KpiCard label="In transito" value={stats.in_transito} accent="sky" />
            <KpiCard label="Consegnati" value={stats.consegnati} accent="emerald" />
            <KpiCard label="Problemi" value={stats.problemi} accent="rose" />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 sm:px-8 py-6 space-y-6">

        {/* === Form aggiunta manuale === */}
        {showAddManual && (
          <div className="bg-slate-900/60 border border-indigo-500/30 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Registra tracking manuale</h3>
              </div>
              <button
                type="button"
                onClick={closeManual}
                className="text-slate-500 hover:text-white"
                aria-label="Chiudi form aggiunta manuale"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={manualNumber}
                onChange={(e) => { setManualNumber(e.target.value); setManualError(null); setManualNeedsCarrier(false); }}
                placeholder="Tracking number"
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-white placeholder-slate-600 focus:border-indigo-500/60 focus:outline-none"
              />
              <input
                value={manualNota}
                onChange={(e) => setManualNota(e.target.value)}
                placeholder="Nota (opzionale)"
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-white placeholder-slate-600 focus:border-indigo-500/60 focus:outline-none"
              />
              <select
                value={manualCarrier}
                onChange={(e) => setManualCarrier(e.target.value)}
                className={`px-3 py-2 bg-slate-950 border rounded-md text-sm text-white focus:outline-none ${manualNeedsCarrier ? "border-amber-500/60" : "border-slate-800 focus:border-indigo-500/60"}`}
              >
                <option value="">Corriere (auto-rileva)</option>
                {carriers.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  onClick={submitManual}
                  disabled={!manualNumber.trim() || !!busy[manualNumber.trim()]}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-500/50 text-indigo-200 hover:bg-indigo-500/30 text-sm transition-colors disabled:opacity-50"
                >
                  {busy[manualNumber.trim()] === "register"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <PlusCircle className="w-4 h-4" />}
                  Registra
                </button>
              </div>
            </div>
            {manualError && (
              <div className="mt-3 px-3 py-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{manualError}</div>
                  {manualNeedsCarrier && (
                    <div className="text-rose-200/80 mt-1">
                      17TRACK non è riuscito a riconoscere il corriere dal numero. Selezionalo dal menu sopra e riprova.
                    </div>
                  )}
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-3">
              ⚠️ La registrazione consuma 1 quota di 17TRACK solo se va a buon fine. Errori di formato o corriere non consumano quota.
            </p>
          </div>
        )}

        {/* === Tracking attivi === */}
        <SectionCard
          accent="blue"
          icon={Truck}
          eyebrow={`${tutti.length} totali`}
          title="Tracking monitorati"
          action={
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca tracking, DDT, corriere…"
                className="pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-white placeholder-slate-600 focus:border-indigo-500/60 focus:outline-none w-64"
              />
            </div>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento…
            </div>
          ) : filteredTutti.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              {search ? "Nessun tracking corrisponde alla ricerca." : "Nessun tracking ancora registrato."}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.14em] text-slate-500 border-b border-slate-800">
                    <th className="text-left py-2 px-2 font-medium">Tracking</th>
                    <th className="text-left py-2 px-2 font-medium">Stato</th>
                    <th className="text-left py-2 px-2 font-medium">Ultimo evento</th>
                    <th className="text-left py-2 px-2 font-medium">DDT</th>
                    <th className="text-left py-2 px-2 font-medium">Aggiornato</th>
                    <th className="text-right py-2 px-2 font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTutti.map((t) => {
                    const isBusy = !!busy[t.tracking_number];
                    const ev = t.latest_event || {};
                    return (
                      <tr
                        key={t.id}
                        onClick={() => openDetail(t)}
                        className="border-b border-slate-900 hover:bg-slate-900/40 align-top cursor-pointer"
                      >
                        <td className="py-2.5 px-2">
                          <div className="font-mono text-xs text-white">{t.tracking_number}</div>
                          {t.provider_name && (
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{t.provider_name}</div>
                          )}
                          {t.nota && <div className="text-[11px] text-slate-500 mt-0.5">📝 {t.nota}</div>}
                        </td>
                        <td className="py-2.5 px-2">
                          <StatusBadge status={t.status} />
                          {t.error && t.status === "NotFound" && (
                            <div className="text-[11px] text-rose-400 mt-1 max-w-xs">{t.error}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          {ev.description ? (
                            <>
                              <div className="text-slate-200 text-[12px] leading-snug max-w-md line-clamp-2">{ev.description}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {ev.location && <span>{ev.location} · </span>}
                                {fmtDateTime(ev.time_iso)}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-slate-300 text-xs">
                          {t.ddt_numero ? (
                            <>
                              <div>{t.ddt_numero}</div>
                              {t.ddt_brand && <div className="text-slate-500">{t.ddt_brand}</div>}
                            </>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 text-[11px] whitespace-nowrap">
                          {fmtDateTime(t.last_update)}
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <a
                              href={`https://t.17track.net/it#nums=${encodeURIComponent(t.tracking_number)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Apri su 17track.net"
                              aria-label={`Apri ${t.tracking_number} su 17track.net`}
                              className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => refreshTracking(t.tracking_number)}
                              disabled={isBusy}
                              title="Aggiorna stato"
                              aria-label={`Aggiorna stato tracking ${t.tracking_number}`}
                              className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-slate-800 hover:border-blue-500/40 hover:bg-blue-500/10 text-slate-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                            >
                              {busy[t.tracking_number] === "refresh"
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RefreshCw className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDeleteTracking(t.tracking_number)}
                              disabled={isBusy}
                              title="Elimina tracking"
                              aria-label={`Elimina tracking ${t.tracking_number}`}
                              className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 transition-colors disabled:opacity-50"
                            >
                              {busy[t.tracking_number] === "delete"
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* === Suggerimenti dai DDT === */}
        <SectionCard
          accent="amber"
          icon={PackageSearch}
          eyebrow={`${suggerimenti.length} non registrati`}
          title="Tracking dai DDT da registrare"
        >
          {suggerimenti.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              Nessun nuovo tracking da registrare. Tutti i tracking presenti nei DDT sono già monitorati.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.14em] text-slate-500 border-b border-slate-800">
                    <th className="text-left py-2 px-2 font-medium">Tracking</th>
                    <th className="text-left py-2 px-2 font-medium">DDT</th>
                    <th className="text-left py-2 px-2 font-medium">Brand</th>
                    <th className="text-left py-2 px-2 font-medium">Paese</th>
                    <th className="text-left py-2 px-2 font-medium">Trasportatore</th>
                    <th className="text-left py-2 px-2 font-medium">Data DDT</th>
                    <th className="text-right py-2 px-2 font-medium">Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {suggerimenti.map((s) => {
                    const isBusy = busy[s.tracking_number] === "register";
                    return (
                      <tr key={`${s.tracking_number}-${s.ddt_id}`} className="border-b border-slate-900 hover:bg-slate-900/40">
                        <td className="py-2 px-2 font-mono text-xs text-white">{s.tracking_number}</td>
                        <td className="py-2 px-2 text-slate-300">{s.ddt_numero || "—"}</td>
                        <td className="py-2 px-2 text-slate-400">{s.ddt_brand || "—"}</td>
                        <td className="py-2 px-2 text-slate-400">{s.ddt_paese || "—"}</td>
                        <td className="py-2 px-2 text-slate-400">{s.ddt_trasportatore || "—"}</td>
                        <td className="py-2 px-2 text-slate-400">{fmtDate(s.ddt_data)}</td>
                        <td className="py-2 px-2 text-right">
                          <button
                            onClick={() => registerFromSuggestion(s)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs transition-colors disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                            Registra
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

      </main>

      {/* === Drawer dettaglio === */}
      {detail && (
        <DetailDrawer
          tracking={detail}
          onClose={closeDetail}
          onRefresh={async () => {
            const trackingNumber = detail.tracking_number;
            await refreshTracking(trackingNumber);
            // Ricarica la versione fresca nel drawer (solo se ancora aperto su questo tracking)
            const list = await fetchJSON("tracking17/tutti").catch(() => []);
            if (detailKeyRef.current !== trackingNumber) return;
            const fresh = (Array.isArray(list) ? list : []).find((x) => x.tracking_number === trackingNumber);
            if (fresh) setDetail(fresh);
          }}
          refreshing={busy[detail.tracking_number] === "refresh"}
        />
      )}

      {/* === Conferma eliminazione === */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Eliminare il tracking?"
          description={
            <>
              Stai per eliminare il tracking{" "}
              <span className="font-mono text-white">{deleteConfirm}</span>.
              <br />
              Verrà rimosso anche dal monitoraggio 17TRACK.
              <br />
              <span className="text-rose-300/80 text-xs">L'operazione non è reversibile.</span>
            </>
          }
          confirmLabel="Elimina"
          danger
          onConfirm={performDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

// =============================================================
// Drawer dettaglio tracking — timeline eventi + milestone + meta
// =============================================================
function DetailDrawer({ tracking, onClose, onRefresh, refreshing }) {
  const events = Array.isArray(tracking.events) ? tracking.events : [];
  const milestone = Array.isArray(tracking.milestone) ? tracking.milestone : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl bg-slate-950 border-l border-slate-800 h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur bg-slate-950/90 border-b border-slate-800 px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Tracking</div>
            <div className="font-mono text-sm text-white truncate">{tracking.tracking_number}</div>
            <div className="mt-2"><StatusBadge status={tracking.status} size="lg" /></div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Aggiorna"
              aria-label="Aggiorna stato tracking"
              className="w-9 h-9 rounded-md border border-slate-800 hover:border-blue-500/40 hover:bg-blue-500/10 text-slate-400 hover:text-blue-300 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi pannello dettaglio"
              className="w-9 h-9 rounded-md border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <MetaItem label="Corriere" value={tracking.provider_name || (tracking.carrier ? `Carrier ${tracking.carrier}` : "—")} icon={Building2} />
            <MetaItem label="DDT" value={tracking.ddt_numero || "—"} subValue={tracking.ddt_brand} />
            <MetaItem label="Aggiornato" value={fmtDateTime(tracking.last_update)} />
            <MetaItem label="Registrato" value={fmtDateTime(tracking.registered_at)} />
            {tracking.nota && (
              <div className="col-span-2 px-3 py-2 rounded-md bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Nota</div>
                <div className="text-sm text-slate-200 mt-0.5">{tracking.nota}</div>
              </div>
            )}
            {tracking.error && tracking.status === "NotFound" && (
              <div className="col-span-2 px-3 py-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>{tracking.error}</div>
              </div>
            )}
            {tracking.status === "InfoReceived" && events.length === 0 && (
              <div className="col-span-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>Il corriere non ha ancora caricato eventi per questa spedizione. Riprova fra qualche minuto.</div>
              </div>
            )}
          </div>

          {/* Milestone */}
          {milestone.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-2">Milestone</h3>
              <div className="flex flex-wrap gap-2">
                {milestone.map((m, i) => (
                  <div key={`${m.key_stage || "stage"}-${m.time_iso || i}`} className="px-3 py-1.5 rounded-md border border-slate-800 bg-slate-900/40">
                    <div className="text-[11px] text-slate-400">{STAGE_LABEL_IT[m.key_stage] || m.key_stage}</div>
                    <div className="text-[10px] text-slate-500">{fmtDateTime(m.time_iso)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-3">Storico spedizione</h3>
            {events.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Nessun evento registrato.</p>
            ) : (
              <ol className="relative border-l border-slate-800 ml-2 space-y-4">
                {events.map((e, idx) => {
                  const meta = STATUS_META[e.stage] || STATUS_META.InfoReceived;
                  const Icon = meta.icon;
                  const isFirst = idx === 0;
                  return (
                    <li key={`${e.time_iso || "no-time"}-${idx}`} className="ml-4">
                      <span className={`absolute -left-[9px] flex items-center justify-center w-[18px] h-[18px] rounded-full border ${meta.cls}`}>
                        <Icon className="w-2.5 h-2.5" />
                      </span>
                      <div className={`text-[11px] uppercase tracking-wider ${isFirst ? "text-emerald-300" : "text-slate-500"}`}>
                        {fmtDateTime(e.time_iso)}
                        {isFirst && <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px]">ATTUALE</span>}
                      </div>
                      <div className="text-sm text-white mt-0.5 leading-snug">{e.description || "—"}</div>
                      {(e.location || e.address) && (
                        <div className="flex items-center gap-1 text-[12px] text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {[e.location, e.address?.country, e.address?.city].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="pt-2">
            <a
              href={`https://t.17track.net/it#nums=${encodeURIComponent(tracking.tracking_number)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Apri su 17track.net
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// ConfirmDialog — modal di conferma in stile Nexus
// =============================================================
function ConfirmDialog({ title, description, confirmLabel = "Conferma", cancelLabel = "Annulla", danger = false, onConfirm, onCancel }) {
  // Chiudi con ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
      else if (e.key === "Enter") onConfirm?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onConfirm, onCancel]);

  const accentBtn = danger
    ? "bg-rose-500/20 border-rose-500/50 text-rose-200 hover:bg-rose-500/30"
    : "bg-indigo-500/20 border-indigo-500/50 text-indigo-200 hover:bg-indigo-500/30";
  const accentIcon = danger
    ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
    : "bg-indigo-500/10 border-indigo-500/40 text-indigo-400";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400/60" style={{ display: danger ? "block" : "none" }} />
        <div className="px-6 py-5">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 ${accentIcon}`}>
              <AlertTriangle className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="confirm-title" className="text-base font-semibold text-white tracking-tight">{title}</h2>
              <div className="text-sm text-slate-400 mt-1.5 leading-relaxed">{description}</div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 rounded-md border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-sm transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              autoFocus
              className={`px-3 py-2 rounded-md border text-sm transition-colors ${accentBtn}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value, subValue, icon: Icon }) {
  return (
    <div className="px-3 py-2 rounded-md bg-slate-900/60 border border-slate-800">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-sm text-slate-100 mt-0.5 truncate">{value}</div>
      {subValue && <div className="text-[11px] text-slate-500">{subValue}</div>}
    </div>
  );
}

function KpiCard({ label, value, accent = "blue" }) {
  const accentMap = {
    blue:    "border-blue-500/30 bg-blue-500/5 text-blue-300",
    sky:     "border-sky-500/30 bg-sky-500/5 text-sky-300",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    rose:    "border-rose-500/30 bg-rose-500/5 text-rose-300",
  };
  return (
    <div className={`px-4 py-3 rounded-md border ${accentMap[accent]}`}>
      <div className="text-[10px] uppercase tracking-[0.14em] opacity-80">{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

export default Tracking17;
