import { useEffect, useState } from "react";
import { Send, Plus, RefreshCw, Trash2, ChevronRight, AlertCircle, Package } from "lucide-react";
import { toast } from "sonner";
import PageTopBar from "../components/PageTopBar";

const STEPS = [
  { id: "items", label: "1. Articoli" },
  { id: "packing", label: "2. Pacchi" },
  { id: "placement", label: "3. Centro" },
  { id: "transport", label: "4. Trasporto" },
  { id: "delivery", label: "5. Consegna" },
  { id: "labels", label: "6. Etichette" },
  { id: "done", label: "Spedita" },
];

const STATUS_BADGE = {
  DRAFT: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  PLAN_CREATED: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  PACKING_CONFIRMED: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  PLACEMENT_CONFIRMED: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  TRANSPORT_CONFIRMED: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  DELIVERY_CONFIRMED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  VOIDED: "bg-rose-500/20 text-rose-300 border-rose-500/40",
};

export default function SpedizioneAmazon() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/v2/inbound/plans");
      setPlans(await r.json());
    } catch (err) {
      toast.error("Errore nel caricamento dei piani inbound");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PageTopBar
        icon={Send}
        iconAccent="emerald"
        eyebrow="Operazioni"
        title="Spedizione ad Amazon FBA"
      />

      <main className="px-6 sm:px-10 lg:px-16 py-8 space-y-6">
        {/* Header azioni */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">Piani spedizione</h2>
          <div className="flex gap-2">
            <button
              onClick={loadPlans}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>
            <button
              onClick={() => toast.info("UI di creazione in arrivo — usa /api/v2/inbound/plans POST per test")}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuovo piano
            </button>
          </div>
        </div>

        {/* Banner fase MVP */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/80 space-y-1">
            <p><span className="font-semibold">Funzione in sviluppo (Fase 1 MVP).</span> Endpoint backend attivi su <code className="text-amber-300">/api/v2/inbound</code>. UI completa del wizard in arrivo.</p>
            <p>Per ora la pagina lista i piani salvati e mostra lo stato del flusso. Le chiamate ad Amazon (createInboundPlan, packing, placement, ecc.) sono gia' connesse alla Fulfillment Inbound API v2024-03-20.</p>
          </div>
        </div>

        {/* Lista piani */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
          {plans.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nessun piano spedizione creato ancora.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 border-b border-slate-800">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Marketplace</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Step corrente</th>
                  <th className="px-4 py-3">Creato</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{p.id}</td>
                    <td className="px-4 py-3">{p.name || <span className="text-slate-500">—</span>}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.marketplace_id}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-medium border ${STATUS_BADGE[p.status] || "bg-slate-700/40 text-slate-300 border-slate-600"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{STEPS.find(s => s.id === p.current_step)?.label || p.current_step}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.created_at}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toast.info("Wizard dettaglio in arrivo")}
                        className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 text-xs"
                      >
                        Apri <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
