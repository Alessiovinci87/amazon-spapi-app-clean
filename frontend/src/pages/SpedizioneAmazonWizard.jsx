import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Loader2, CheckCircle2, AlertCircle, Package, MapPin, Truck, Calendar, FileText, Play, RefreshCw, Box, Plus, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useOperationPolling } from "../hooks/useOperationPolling";

const STEPS = [
  { id: "items",     label: "Articoli",     icon: Package },
  { id: "packing",   label: "Pre-packing",  icon: Package },
  { id: "placement", label: "Centro",       icon: MapPin },
  { id: "boxing",    label: "Imballaggio",  icon: Box },
  { id: "transport", label: "Trasporto",    icon: Truck },
  { id: "delivery",  label: "Consegna",     icon: Calendar },
  { id: "labels",    label: "Etichette",    icon: FileText },
  { id: "done",      label: "Spedita",      icon: CheckCircle2 },
];

export default function SpedizioneAmazonWizard() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testMode, setTestMode] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/v2/inbound/plans/${planId}`);
      if (!r.ok) throw new Error("Piano non trovato");
      setPlan(await r.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetch("/api/v2/inbound/config").then((r) => r.json()).then((d) => setTestMode(!!d.testMode)).catch(() => {});
  }, [planId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }
  if (error || !plan) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-6 h-6 text-rose-400 mb-2" />
          <p className="text-rose-300">{error || "Piano non disponibile"}</p>
          <button
            onClick={() => navigate("/uffici/spedizione-amazon")}
            className="mt-4 text-xs text-slate-300 hover:text-white inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Torna alla lista
          </button>
        </div>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.id === plan.current_step);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/uffici/spedizione-amazon")}
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
              <Send className="w-[18px] h-[18px] text-emerald-400" />
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-white">
                Piano #{plan.id} {plan.name && <span className="text-slate-500">— {plan.name}</span>}
              </div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">
                {plan.amazon_plan_id || "Bozza locale"}
              </div>
            </div>
          </div>
          {plan.amazon_plan_id && (
            <button
              onClick={async () => {
                try {
                  const r = await fetch(`/api/v2/inbound/plans/${plan.id}/sync`, { method: "POST" });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.error || "Errore sync");
                  if (d.errored) {
                    toast.error("Piano in ERRORE su Amazon", { description: d.reason, duration: 12000 });
                  } else {
                    toast.success(`Sincronizzato: step ${d.current_step} (${d.shipments} shipment)`);
                  }
                  load();
                } catch (e) { toast.error(e.message); }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              title="Legge lo stato reale da Amazon e allinea il wizard locale"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sincronizza con Amazon
            </button>
          )}
        </div>
      </header>

      {/* Stepper */}
      <div className="px-6 sm:px-10 lg:px-16 py-6 border-b border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs ${
                    done
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                      : active
                      ? "bg-blue-500/15 border-blue-500/50 text-blue-200 font-semibold"
                      : "bg-slate-900 border-slate-800 text-slate-500"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-px w-6 ${done ? "bg-emerald-500/40" : "bg-slate-800"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <main className="px-6 sm:px-10 lg:px-16 py-8 space-y-6">
        {testMode && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="text-amber-300 font-semibold uppercase tracking-wider">Modalità Test</span>
              <span className="text-amber-200/80 ml-2">Le chiamate ad Amazon sono mock — nulla viene realmente inviato.</span>
            </div>
          </div>
        )}
        {plan.status === "VOIDED" && (
          <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span className="text-rose-300 font-semibold uppercase tracking-wider text-xs">Piano non recuperabile</span>
            </div>
            <p className="text-xs text-rose-200/90 ml-8">
              Amazon ha marcato questo piano come <span className="font-mono">ERRORED</span>. Cause tipiche: MSKU non
              corrispondente a un listing attivo del seller, marketplace sbagliato, ASIN non vendibile sul tuo account.
              Non e' possibile proseguire qui — torna alla lista, elimina questo piano e creane uno nuovo con MSKU validi.
            </p>
            <button
              onClick={() => navigate("/uffici/spedizione-amazon")}
              className="mt-3 ml-8 px-3 py-1.5 text-xs bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded text-rose-200"
            >
              Torna alla lista
            </button>
          </div>
        )}
        <StepContent plan={plan} reload={load} />
      </main>
    </div>
  );
}

function StepContent({ plan, reload }) {
  switch (plan.current_step) {
    case "items":
      return <ItemsRecap plan={plan} reload={reload} />;
    case "packing":
      return (
        <AsyncOptionsStep
          plan={plan}
          reload={reload}
          title="Genera opzioni di packing"
          description="Amazon analizza gli articoli e propone uno o piu' modi di raggrupparli in cartoni."
          startUrl={`/api/v2/inbound/plans/${plan.id}/packing/start`}
          optionsUrl={`/api/v2/inbound/plans/${plan.id}/packing/options`}
          confirmUrl={`/api/v2/inbound/plans/${plan.id}/packing/confirm`}
          optionsKey="packingOptions"
          idKey="packingOptionId"
          renderOption={(opt) => (
            <>
              <div className="text-xs font-mono text-white">{opt.packingOptionId}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {opt.packingGroups?.length || 0} gruppi · {opt.status || "—"}
              </div>
            </>
          )}
          confirmBody={(id) => ({ packingOptionId: id })}
        />
      );
    case "placement":
      return (
        <AsyncOptionsStep
          plan={plan}
          reload={reload}
          title="Scegli il centro logistico Amazon"
          description="Amazon assegnera' una o piu' destinazioni FBA. Selezionane una (eventuali fee placement sono indicate)."
          startUrl={`/api/v2/inbound/plans/${plan.id}/placement/start`}
          optionsUrl={`/api/v2/inbound/plans/${plan.id}/placement/options`}
          confirmUrl={`/api/v2/inbound/plans/${plan.id}/placement/confirm`}
          optionsKey="placementOptions"
          idKey="placementOptionId"
          renderOption={(opt) => (
            <>
              <div className="text-xs font-mono text-white">{opt.placementOptionId}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {opt.shipmentIds?.length || 0} shipment · {opt.status || "—"}
              </div>
              {opt.fees && opt.fees.length > 0 && (
                <div className="text-[11px] text-amber-400 mt-1">
                  Fee: {opt.fees.map((f) => `${f.type} ${f.value?.amount} ${f.value?.code}`).join(", ")}
                </div>
              )}
            </>
          )}
          confirmBody={(id) => ({ placementOptionId: id })}
        />
      );
    case "boxing":
      return <BoxingStep plan={plan} reload={reload} />;
    case "transport":
      return <TransportStep plan={plan} reload={reload} />;
    case "delivery":
      return <DeliveryStep plan={plan} reload={reload} />;
    case "labels":
      return <LabelsStep plan={plan} reload={reload} />;
    case "done":
      return (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Spedizione completata</h3>
          <p className="text-sm text-emerald-300/80 mt-2">Il piano è confermato e le etichette scaricate.</p>
        </div>
      );
    default:
      return <PlaceholderStep step={plan.current_step} />;
  }
}

// Componente generico riusabile per i step: avvia operazione → polling → lista opzioni → conferma
function AsyncOptionsStep({
  plan, reload, title, description,
  startUrl, optionsUrl, confirmUrl,
  optionsKey, idKey,
  renderOption, confirmBody,
  startBody = null,
}) {
  const [opId, setOpId] = useState(null);
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const { status, error, elapsed } = useOperationPolling(opId);

  useEffect(() => {
    if (status === "SUCCESS" && !options) {
      fetch(optionsUrl).then((r) => r.json())
        .then((d) => setOptions(d?.[optionsKey] || []))
        .catch((e) => toast.error("Errore lista opzioni: " + e.message));
    }
  }, [status, options, optionsUrl, optionsKey]);

  const start = async () => {
    try {
      const r = await fetch(startUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: startBody ? JSON.stringify(startBody) : undefined,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore avvio");
      if (d.skipped) {
        toast.info(d.reason || "Step saltato automaticamente da Amazon");
        reload();
        return;
      }
      setOpId(d.operationId);
      toast.info("Operazione avviata su Amazon…");
    } catch (e) { toast.error(e.message); }
  };

  const confirm = async () => {
    if (!selected) return;
    setConfirming(true);
    try {
      const r = await fetch(confirmUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmBody(selected)),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Errore conferma");
      }
      toast.success("Opzione confermata");
      reload();
    } catch (e) { toast.error(e.message); }
    finally { setConfirming(false); }
  };

  if (!opId) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-8">
        <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
        <p className="text-xs text-slate-400 mb-6">{description}</p>
        <button onClick={start}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
          <Play className="w-3.5 h-3.5" /> Avvia
        </button>
      </div>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-8 text-center">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-blue-200">Amazon sta elaborando…</h3>
        <p className="text-xs text-blue-300/70 mt-2">Tempo trascorso: {elapsed}s</p>
      </div>
    );
  }
  if (status === "FAILED" || error) {
    // Auto-skip: se Amazon dice che lo step e' gia' fatto, sincronizziamo e avanziamo
    const msg = (error || "").toLowerCase();
    const isAlreadyDone = /read-only|cannot be modified|does not support|already (confirmed|completed)/i.test(msg);

    if (isAlreadyDone) {
      return (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-6">
          <AlertCircle className="w-6 h-6 text-amber-400 mb-2" />
          <h3 className="text-sm font-semibold text-amber-300">Step gia' completato lato Amazon</h3>
          <p className="text-xs text-amber-200/80 mt-1">{error}</p>
          <p className="text-xs text-amber-200/60 mt-2">
            Amazon ha gia' definito questo step automaticamente. Clicca per sincronizzare e procedere.
          </p>
          <button
            onClick={async () => {
              try {
                const r = await fetch(`/api/v2/inbound/plans/${plan.id}/sync`, { method: "POST" });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || "Errore sync");
                toast.success(`Sincronizzato: step ${d.current_step}`);
                reload();
              } catch (e) { toast.error(e.message); }
            }}
            className="mt-4 px-3 py-1.5 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded text-emerald-300"
          >
            Sincronizza e avanza
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-6">
        <AlertCircle className="w-6 h-6 text-rose-400 mb-2" />
        <h3 className="text-sm font-semibold text-rose-300">Operazione fallita</h3>
        <p className="text-xs text-rose-300/70 mt-1">{error}</p>
        <button onClick={() => { setOpId(null); setOptions(null); }}
          className="mt-4 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-md text-slate-200">Riprova</button>
      </div>
    );
  }
  if (status === "SUCCESS" && options) {
    if (options.length === 0) return <div className="text-slate-400 text-sm">Nessuna opzione disponibile.</div>;
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Seleziona un'opzione</h3>
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt[idKey]}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selected === opt[idKey] ? "bg-emerald-500/10 border-emerald-500/50" : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}>
              <input type="radio" name="opt" value={opt[idKey]} checked={selected === opt[idKey]}
                onChange={() => setSelected(opt[idKey])} className="mt-1" />
              <div className="flex-1">{renderOption(opt)}</div>
            </label>
          ))}
        </div>
        <div className="flex justify-end">
          <button onClick={confirm} disabled={!selected || confirming}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed">
            {confirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Conferma
          </button>
        </div>
      </div>
    );
  }
  return null;
}

// Step Transport: "Use Your Own Carrier" - tu prenoti DHL/UPS a parte
function TransportStep({ plan, reload }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const defaultReady = new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10);

  const [readyDate, setReadyDate] = useState(defaultReady);
  const [contactName, setContactName] = useState("Pics Srl");
  const [contactPhone, setContactPhone] = useState("0799731078");
  const [contactEmail, setContactEmail] = useState("info@picsnails.com");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!readyDate) return toast.error("Data ready-to-ship obbligatoria");
    if (!contactName || !contactPhone || !contactEmail) return toast.error("Compila tutti i contatti");
    setSubmitting(true);
    try {
      const r = await fetch(`/api/v2/inbound/plans/${plan.id}/transport/use-your-own-carrier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readyToShipDate: readyDate,
          contactName, contactPhone, contactEmail,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore configurazione trasporto");
      toast.success(`Trasporto confermato per ${d.shipments} shipment`);
      reload();
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Trasporto — Use Your Own Carrier</h3>
        <p className="text-xs text-slate-400">
          Sei tu che prenoti il corriere (DHL, UPS, GLS, ecc.) — Amazon ti chiede solo data pronta-spedizione e contatti per il pickup.
          Inserirai i tracking numbers dopo aver ricevuto la spedizione dal vettore.
        </p>
        <p className="text-[11px] text-amber-400 mt-2">
          ⚙ Fase 2 prevede anche Amazon Partnered Carrier UPS (Amazon prenota a tariffa scontata).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-1.5">Data pronta-spedizione</label>
          <input type="date" min={todayStr} value={readyDate}
            onChange={(e) => setReadyDate(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-1.5">Nome contatto</label>
          <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-1.5">Telefono</label>
          <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-1.5">Email</label>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" />
        </div>
      </div>

      <div className="flex justify-end pt-3 border-t border-slate-800">
        <button onClick={submit} disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 disabled:opacity-50">
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Configura trasporto (può richiedere 10-30 secondi)
        </button>
      </div>
    </div>
  );
}

// Step Delivery: si applica per ogni shipment generato
function DeliveryStep({ plan, reload }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    fetch(`/api/v2/inbound/plans/${plan.id}/summary`)
      .then((r) => r.json())
      .then((d) => { setShipments(d?.inboundPlan?.shipments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [plan.id]);

  const confirmAll = async () => {
    // Per ogni shipment: start + (skippiamo lista per MVP, ne scegliamo la prima)
    for (const s of shipments) {
      setConfirmingId(s.shipmentId);
      try {
        await fetch(`/api/v2/inbound/plans/${plan.id}/delivery/${s.shipmentId}/start`, { method: "POST" });
        // attesa polling: per MVP semplifichiamo non gestendolo qui
        const r = await fetch(`/api/v2/inbound/plans/${plan.id}/delivery/${s.shipmentId}/options`);
        const d = await r.json();
        const first = d?.deliveryWindowOptions?.[0];
        if (first) {
          await fetch(`/api/v2/inbound/plans/${plan.id}/delivery/${s.shipmentId}/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deliveryWindowOptionId: first.deliveryWindowOptionId }),
          });
        }
      } catch (e) { toast.error(`Shipment ${s.shipmentId}: ${e.message}`); }
    }
    setConfirmingId(null);
    toast.success("Finestre di consegna confermate");
    reload();
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-blue-400" />;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white">Finestre di consegna</h3>
      <p className="text-xs text-slate-400">
        Amazon richiede una finestra di consegna per ogni shipment. Nel MVP prendiamo la prima disponibile per ogni shipment.
      </p>
      <div className="space-y-2">
        {shipments.map((s) => (
          <div key={s.shipmentId} className="flex items-center justify-between p-3 rounded border border-slate-800 bg-slate-900/50">
            <div className="text-xs">
              <div className="font-mono text-white">{s.shipmentId}</div>
              <div className="text-slate-500 mt-1">{s.destination?.address?.city || "—"} · {s.status}</div>
            </div>
            {confirmingId === s.shipmentId && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
          </div>
        ))}
      </div>
      <button onClick={confirmAll}
        className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
        Conferma prime finestre disponibili
      </button>
    </div>
  );
}

// Step Labels: per ogni shipment scarica labels
function LabelsStep({ plan, reload }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v2/inbound/plans/${plan.id}/summary`)
      .then((r) => r.json())
      .then((d) => { setShipments(d?.inboundPlan?.shipments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [plan.id]);

  const download = async (shipmentId) => {
    try {
      const r = await fetch(`/api/v2/inbound/shipments/${shipmentId}/labels?planId=${plan.id}&pageType=PackageLabel_Thermal&labelType=BARCODE_2D`);
      const d = await r.json();
      if (d.documentDownloads && d.documentDownloads[0]?.downloadURL) {
        window.open(d.documentDownloads[0].downloadURL, "_blank");
      } else {
        toast.error("Nessuna URL di download nelle labels");
      }
    } catch (e) { toast.error(e.message); }
  };

  const finalize = async () => {
    await fetch(`/api/v2/inbound/plans/${plan.id}/mark-done`, { method: "POST" });
    toast.success("Spedizione finalizzata");
    reload();
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-blue-400" />;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white">Etichette spedizione</h3>

      {/* Istruzioni di stampa */}
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Istruzioni di stampa</h4>
        </div>
        <ul className="text-[11px] text-amber-200/90 space-y-1 ml-6 list-disc">
          <li>Stampa su <span className="font-semibold">stampante termica 10×15 cm</span> (Zebra, Brother QL, equivalenti)</li>
          <li>Imposta dimensione pagina <span className="font-semibold">100×150 mm</span> (formato termico)</li>
          <li><span className="font-semibold">NON usare "Adatta alla pagina" / "Fit to page"</span> — stampa <span className="font-semibold">al 100% / "Actual size"</span></li>
          <li>Non riconvertire il PDF (no salva-come-immagine, no screenshot): manda il PDF direttamente alla stampante</li>
          <li>Verifica che il codice a barre sia nitido e leggibile prima di chiudere il cartone</li>
        </ul>
      </div>

      <p className="text-xs text-slate-400">Scarica le etichette PDF di ogni shipment. Verranno aperte in una nuova scheda.</p>
      <div className="space-y-2">
        {shipments.map((s) => (
          <div key={s.shipmentId} className="flex items-center justify-between p-3 rounded border border-slate-800 bg-slate-900/50">
            <div className="text-xs">
              <div className="font-mono text-white">{s.shipmentId}</div>
              <div className="text-slate-500 mt-1">{s.destination?.address?.city || "—"}</div>
            </div>
            <button onClick={() => download(s.shipmentId)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded">
              <FileText className="w-3.5 h-3.5" /> Scarica labels
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-2 border-t border-slate-800">
        <button onClick={finalize}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5" /> Finalizza spedizione
        </button>
      </div>
    </div>
  );
}

function ItemsRecap({ plan, reload }) {
  const [sending, setSending] = useState(false);
  const isDraft = !plan.amazon_plan_id;

  const createOnAmazon = async () => {
    setSending(true);
    try {
      const r = await fetch(`/api/v2/inbound/plans/${plan.id}/create-on-amazon`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore");
      toast.success(`Piano creato su Amazon (${d.amazonPlanId})`);
      reload();
    } catch (e) { toast.error(e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Articoli del piano</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 border-b border-slate-800">
            <th className="py-2">MSKU</th>
            <th className="py-2">ASIN</th>
            <th className="py-2 text-right">Quantità</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {(plan.items || []).map((it) => (
            <tr key={it.id}>
              <td className="py-2 font-mono text-xs">{it.msku}</td>
              <td className="py-2 font-mono text-xs text-slate-400">{it.asin || "—"}</td>
              <td className="py-2 text-right">{it.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between">
        <div className="text-xs">
          {isDraft ? (
            <span className="text-amber-300">⚠ Piano in bozza locale — non ancora inviato ad Amazon</span>
          ) : (
            <span className="text-emerald-300">✓ Piano registrato su Amazon ({plan.amazon_plan_id})</span>
          )}
        </div>
        <button
          onClick={createOnAmazon}
          disabled={sending || !isDraft}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isDraft ? "Crea piano su Amazon e procedi" : "Procedi a Pacchi →"}
        </button>
      </div>
    </div>
  );
}

function PackingStep({ plan, reload }) {
  const [opId, setOpId] = useState(null);
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const { status, error, elapsed } = useOperationPolling(opId);

  // Quando il polling segna SUCCESS, fetch della lista opzioni
  useEffect(() => {
    if (status === "SUCCESS" && !options) {
      fetch(`/api/v2/inbound/plans/${plan.id}/packing/options`)
        .then((r) => r.json())
        .then((d) => setOptions(d?.packingOptions || []))
        .catch((e) => toast.error("Errore lista packing options: " + e.message));
    }
  }, [status, options, plan.id]);

  const start = async () => {
    try {
      const r = await fetch(`/api/v2/inbound/plans/${plan.id}/packing/start`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore avvio packing");
      setOpId(d.operationId);
      toast.info("Generazione packing options avviata su Amazon…");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const confirm = async () => {
    if (!selected) return;
    setConfirming(true);
    try {
      const r = await fetch(`/api/v2/inbound/plans/${plan.id}/packing/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packingOptionId: selected }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Errore conferma");
      }
      toast.success("Opzione packing confermata");
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setConfirming(false);
    }
  };

  // Stato iniziale: nessuna operazione avviata
  if (!opId) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-8">
        <h3 className="text-sm font-semibold text-white mb-2">Genera opzioni di packing</h3>
        <p className="text-xs text-slate-400 mb-6">
          Amazon analizzerà gli articoli del piano e proporrà uno o più modi di raggrupparli in cartoni. Operazione asincrona, può richiedere 5-30 secondi.
        </p>
        <button
          onClick={start}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
        >
          <Play className="w-3.5 h-3.5" />
          Avvia generatePackingOptions
        </button>
      </div>
    );
  }

  // In attesa risposta Amazon
  if (status === "IN_PROGRESS") {
    return (
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-8 text-center">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-blue-200">Amazon sta calcolando le opzioni di packing…</h3>
        <p className="text-xs text-blue-300/70 mt-2">Tempo trascorso: {elapsed}s</p>
      </div>
    );
  }

  if (status === "FAILED" || error) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-6">
        <AlertCircle className="w-6 h-6 text-rose-400 mb-2" />
        <h3 className="text-sm font-semibold text-rose-300">Operazione fallita</h3>
        <p className="text-xs text-rose-300/70 mt-1">{error}</p>
        <button
          onClick={() => { setOpId(null); setOptions(null); }}
          className="mt-4 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-md text-slate-200"
        >
          Riprova
        </button>
      </div>
    );
  }

  // Mostra opzioni
  if (status === "SUCCESS" && options) {
    if (options.length === 0) {
      return <div className="text-slate-400 text-sm">Nessuna opzione di packing disponibile.</div>;
    }
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Scegli un'opzione di packing</h3>
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.packingOptionId}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selected === opt.packingOptionId
                  ? "bg-emerald-500/10 border-emerald-500/50"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <input
                type="radio"
                name="packing"
                value={opt.packingOptionId}
                checked={selected === opt.packingOptionId}
                onChange={() => setSelected(opt.packingOptionId)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="text-xs font-mono text-white">{opt.packingOptionId}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {opt.packingGroups?.length || 0} gruppi · Status: {opt.status || "—"}
                </div>
                {opt.fees && opt.fees.length > 0 && (
                  <div className="text-[11px] text-amber-400 mt-1">
                    Fee: {opt.fees.map((f) => `${f.type} ${f.value?.amount} ${f.value?.code}`).join(", ")}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            onClick={confirm}
            disabled={!selected || confirming}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Conferma opzione
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Step Imballaggio: dichiara dimensioni/peso cartoni + tipo spedizione
function BoxingStep({ plan, reload }) {
  const [shippingMode, setShippingMode] = useState("GROUND_SMALL_PARCEL");
  const [shipments, setShipments] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [boxes, setBoxes] = useState([
    { _id: Math.random().toString(36).slice(2), length: 30, width: 20, height: 15, weight: 5, quantity: 1, msku: plan.items?.[0]?.msku || "", itemQty: plan.items?.[0]?.quantity || 1, expiration: plan.items?.[0]?.expiration || "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/v2/inbound/plans/${plan.id}/summary`)
      .then((r) => r.json())
      .then((d) => { setShipments(d?.shipments || d?.inboundPlan?.shipments || []); setLoadingShipments(false); })
      .catch(() => setLoadingShipments(false));
  }, [plan.id]);

  const addBox = () => setBoxes((prev) => [...prev, { ...prev[prev.length - 1], _id: Math.random().toString(36).slice(2) }]);
  const removeBox = (id) => setBoxes((prev) => prev.length > 1 ? prev.filter((b) => b._id !== id) : prev);
  const updateBox = (id, patch) => setBoxes((prev) => prev.map((b) => (b._id === id ? { ...b, ...patch } : b)));

  const totalUnits = boxes.reduce((tot, b) => tot + (Number(b.quantity) || 1) * (Number(b.itemQty) || 0), 0);

  const submit = async () => {
    if (shipments.length === 0) return toast.error("Nessuno shipment trovato");
    if (boxes.length === 0) return toast.error("Aggiungi almeno un cartone");
    if (boxes.some((b) => !b.msku || !b.itemQty)) return toast.error("Compila SKU e quantità per ogni cartone");

    setSubmitting(true);
    try {
      const packageGroupings = shipments.map((s) => ({
        shipmentId: s.shipmentId,
        boxes: boxes.map((b) => ({
          weight: { value: Number(b.weight), unit: "KG" },
          dimensions: { length: Number(b.length), width: Number(b.width), height: Number(b.height), unit: "CENTIMETERS" },
          quantity: Number(b.quantity) || 1,
          contentInformationSource: "BOX_CONTENT_PROVIDED",
          items: [
            {
              msku: b.msku,
              quantity: Number(b.itemQty),
              prepOwner: "SELLER",
              labelOwner: "SELLER",
              ...(b.expiration ? { expiration: b.expiration } : {}),
            },
          ],
        })),
      }));

      const r = await fetch(`/api/v2/inbound/plans/${plan.id}/boxing/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingMode, packageGroupings }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore configurazione imballaggio");
      toast.success("Imballaggio dichiarato — passo a Trasporto");
      reload();
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  if (loadingShipments) return <Loader2 className="w-6 h-6 animate-spin text-blue-400" />;

  const inp = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-white";
  const lbl = "text-[9px] uppercase tracking-[0.14em] text-slate-500 block mb-1";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-sm font-semibold text-white mb-2">Tipo di spedizione</h3>
        <p className="text-xs text-slate-400 mb-4">Scegli come arriveranno i tuoi cartoni al centro Amazon. Influenza le opzioni di trasporto disponibili.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${shippingMode === "GROUND_SMALL_PARCEL" ? "bg-emerald-500/10 border-emerald-500/50" : "bg-slate-900/60 border-slate-800 hover:border-slate-700"}`}>
            <input type="radio" name="mode" value="GROUND_SMALL_PARCEL" checked={shippingMode === "GROUND_SMALL_PARCEL"} onChange={(e) => setShippingMode(e.target.value)} className="mt-1" />
            <div>
              <div className="text-sm font-semibold text-white">Piccoli colli (SPD)</div>
              <div className="text-[11px] text-slate-400 mt-1">Cartoni singoli (max ~22 kg, max ~63 cm lato). Tipico per DHL/UPS/GLS Express.</div>
            </div>
          </label>
          <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${shippingMode === "LESS_THAN_TRUCKLOAD" ? "bg-emerald-500/10 border-emerald-500/50" : "bg-slate-900/60 border-slate-800 hover:border-slate-700"}`}>
            <input type="radio" name="mode" value="LESS_THAN_TRUCKLOAD" checked={shippingMode === "LESS_THAN_TRUCKLOAD"} onChange={(e) => setShippingMode(e.target.value)} className="mt-1" />
            <div>
              <div className="text-sm font-semibold text-white">Carico completo (LTL)</div>
              <div className="text-[11px] text-slate-400 mt-1">Pallet o gruppi di cartoni pesanti. Tipico per spedizioni a peso elevato. Richiede info pallet (Fase 2).</div>
              {shippingMode === "LESS_THAN_TRUCKLOAD" && (
                <div className="text-[10px] text-amber-400 mt-2">⚠ MVP: dichiari comunque i cartoni qui sotto. Pallet info non ancora supportata.</div>
              )}
            </div>
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Cartoni</h3>
            <p className="text-[11px] text-slate-500 mt-1">Dichiara peso, dimensioni e contenuto di ogni cartone. Totale unità: <span className="text-emerald-400 font-mono">{totalUnits}</span></p>
          </div>
          <button onClick={addBox} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
            <Plus className="w-3.5 h-3.5" /> Aggiungi cartone
          </button>
        </div>

        <div className="space-y-3">
          {boxes.map((b, idx) => (
            <div key={b._id} className="border border-slate-800 rounded-lg p-3 bg-slate-900/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300">Cartone {idx + 1}</span>
                {boxes.length > 1 && (
                  <button onClick={() => removeBox(b._id)} className="p-1 text-rose-400 hover:text-rose-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-2">
                  <label className={lbl}>Lung. cm</label>
                  <input type="number" min="1" className={inp} value={b.length} onChange={(e) => updateBox(b._id, { length: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Largh. cm</label>
                  <input type="number" min="1" className={inp} value={b.width} onChange={(e) => updateBox(b._id, { width: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Alt. cm</label>
                  <input type="number" min="1" className={inp} value={b.height} onChange={(e) => updateBox(b._id, { height: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Peso kg</label>
                  <input type="number" min="0.1" step="0.1" className={inp} value={b.weight} onChange={(e) => updateBox(b._id, { weight: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>N° cartoni uguali</label>
                  <input type="number" min="1" className={inp} value={b.quantity} onChange={(e) => updateBox(b._id, { quantity: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Q.tà per cartone</label>
                  <input type="number" min="1" className={inp} value={b.itemQty} onChange={(e) => updateBox(b._id, { itemQty: e.target.value })} />
                </div>
                <div className="col-span-7">
                  <label className={lbl}>SKU contenuto</label>
                  <select className={inp} value={b.msku} onChange={(e) => {
                    const it = (plan.items || []).find((x) => x.msku === e.target.value);
                    updateBox(b._id, { msku: e.target.value, expiration: it?.expiration || b.expiration });
                  }}>
                    <option value="">— scegli —</option>
                    {(plan.items || []).map((it) => (
                      <option key={it.id} value={it.msku}>{it.msku} {it.asin ? `(${it.asin})` : ""} — disp. {it.quantity}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-5">
                  <label className={lbl}>Scadenza lotto</label>
                  <input type="date" className={inp} value={b.expiration || ""} onChange={(e) => updateBox(b._id, { expiration: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={submit} disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 disabled:opacity-50">
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Salva imballaggio e passa a Trasporto
        </button>
      </div>
    </div>
  );
}

function PlaceholderStep({ step }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
      <AlertCircle className="w-5 h-5 text-amber-400 mb-2" />
      <p className="text-xs text-amber-200">
        Step <span className="font-semibold">{step}</span> in fase di sviluppo. Sarà disponibile nei prossimi commit.
      </p>
    </div>
  );
}
