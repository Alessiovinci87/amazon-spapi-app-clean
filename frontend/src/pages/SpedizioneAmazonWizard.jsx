import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Loader2, CheckCircle2, AlertCircle, Package, MapPin, Truck, Calendar, FileText, Play,
} from "lucide-react";
import { toast } from "sonner";
import { useOperationPolling } from "../hooks/useOperationPolling";

const STEPS = [
  { id: "items",     label: "Articoli",   icon: Package },
  { id: "packing",   label: "Pacchi",     icon: Package },
  { id: "placement", label: "Centro",     icon: MapPin },
  { id: "transport", label: "Trasporto",  icon: Truck },
  { id: "delivery",  label: "Consegna",   icon: Calendar },
  { id: "labels",    label: "Etichette",  icon: FileText },
  { id: "done",      label: "Spedita",    icon: CheckCircle2 },
];

export default function SpedizioneAmazonWizard() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      <main className="px-6 sm:px-10 lg:px-16 py-8">
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
      return <PackingStep plan={plan} reload={reload} />;
    case "placement":
    case "transport":
    case "delivery":
    case "labels":
      return <PlaceholderStep step={plan.current_step} />;
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

function ItemsRecap({ plan }) {
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
      <div className="mt-5 text-xs text-slate-500">
        Il piano è stato creato su Amazon. Procedi allo step <span className="text-blue-300">Pacchi</span> per generare le opzioni di packing.
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
