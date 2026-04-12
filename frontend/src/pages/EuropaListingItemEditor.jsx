import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader,
  FileText,
  List,
  AlignLeft,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Plus,
  Trash2,
} from "lucide-react";

export default function EuropaListingItemEditor() {
  const navigate = useNavigate();
  const { country, sku } = useParams();
  const decodedSku = decodeURIComponent(sku || "");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ title: "", bullets: [], description: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/listings-editor/item?sku=${encodeURIComponent(decodedSku)}&country=${country}`);
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
        setForm({
          title: json.data.title || "",
          bullets: json.data.bullets?.length ? [...json.data.bullets] : [""],
          description: json.data.description || "",
        });
      } else {
        toast.error(json.error || "Listing non trovato");
      }
    } catch {
      toast.error("Errore di rete");
    } finally {
      setLoading(false);
    }
  }, [decodedSku, country]);

  useEffect(() => { load(); }, [load]);

  const dirty = data && (
    form.title !== (data.title || "") ||
    form.description !== (data.description || "") ||
    JSON.stringify(form.bullets.filter(Boolean)) !== JSON.stringify(data.bullets || [])
  );

  const handleReset = () => {
    if (!data) return;
    setForm({
      title: data.title || "",
      bullets: data.bullets?.length ? [...data.bullets] : [""],
      description: data.description || "",
    });
    setSaveError(null);
  };

  const handleBulletChange = (i, v) => {
    setForm((f) => ({ ...f, bullets: f.bullets.map((b, idx) => (idx === i ? v : b)) }));
  };

  const handleBulletAdd = () => {
    if (form.bullets.length >= 5) {
      toast.error("Amazon permette max 5 bullet point");
      return;
    }
    setForm((f) => ({ ...f, bullets: [...f.bullets, ""] }));
  };

  const handleBulletRemove = (i) => {
    setForm((f) => ({ ...f, bullets: f.bullets.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        title: form.title.trim() || undefined,
        bullets: form.bullets.map((b) => b.trim()).filter(Boolean),
        description: form.description.trim() || undefined,
      };

      const res = await fetch(`/api/v2/listings-editor/item?sku=${encodeURIComponent(decodedSku)}&country=${country}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        const err = json.error || json.result?.data || "Errore sconosciuto";
        const errStr = typeof err === "string" ? err : JSON.stringify(err);

        // Rilevo il blocco Product Listing role
        if (errStr.includes("InvalidInput") || errStr.includes("Invalid parameters")) {
          setSaveError({
            type: "role_missing",
            message:
              "Amazon ha rifiutato la modifica con errore generico 'InvalidInput'. Quasi sicuramente manca il ruolo \"Product Listing\" sull'app SP-API. Vai in Seller Central → Apps & Services → Develop Apps, trova la tua app e richiedi l'approvazione del ruolo 'Product Listing'. L'approvazione Amazon richiede qualche giorno.",
          });
        } else {
          setSaveError({ type: "generic", message: errStr });
        }
        toast.error("Salvataggio fallito");
      } else {
        toast.success(`Modifiche inviate ad Amazon${json.submissionId ? ` (submissionId: ${json.submissionId.slice(0, 8)}…)` : ""}`);
        await load();
      }
    } catch (e) {
      setSaveError({ type: "generic", message: e.message });
      toast.error("Errore di rete");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-6 h-6 text-blue-400 animate-spin" />
          <p className="text-slate-500 text-sm">Caricamento listing…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <p className="text-slate-400">Listing non trovato</p>
          <button onClick={() => navigate(`/europe/listing-editor/${country}`)} className="text-blue-400 text-sm underline">Torna alla lista</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Header */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(`/europe/listing-editor/${country}`)} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <FileText className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Modifica listing</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1 font-mono truncate">{country} · {data.asin || "—"} · {decodedSku}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {dirty && (
              <button onClick={handleReset} type="button" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] uppercase tracking-wider transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
                Annulla
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/50 text-blue-200 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salva su Amazon
            </button>
          </div>
        </div>
      </header>

      {/* Save error banner */}
      {saveError && (
        <div className="relative border-b border-rose-500/30 bg-rose-500/5">
          <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-rose-200 mb-1">
                {saveError.type === "role_missing" ? "Ruolo Product Listing mancante" : "Errore salvataggio"}
              </div>
              <p className="text-[13px] text-rose-300/80 leading-relaxed">{saveError.message}</p>
            </div>
            <button onClick={() => setSaveError(null)} type="button" className="text-rose-400 hover:text-rose-200 flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Last submission info */}
      {data.last_submission_id && !saveError && (
        <div className="relative border-b border-emerald-500/20 bg-emerald-500/5">
          <div className="px-6 sm:px-10 lg:px-16 py-3 flex items-center gap-3 text-[12px] text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Ultimo invio: <span className="font-mono">{data.last_submission_id.slice(0, 16)}…</span></span>
            {data.last_status && <span className="text-emerald-400">· stato: {data.last_status}</span>}
            {data.last_status_at && <span className="text-emerald-500">· {new Date(data.last_status_at).toLocaleString()}</span>}
          </div>
        </div>
      )}

      {/* Contenuto */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Immagini (read-only) */}
          {data.images?.length > 0 && (
            <Section icon={ImageIcon} accent="cyan" title="Immagini" eyebrow={`${data.images.length} immagini`}>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {data.images.slice(0, 16).map((url, i) => (
                  <div key={i} className="aspect-square rounded-md bg-slate-800 border border-slate-700 overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-600">La modifica immagini arriverà in una fase successiva.</p>
            </Section>
          )}

          {/* Titolo */}
          <Section icon={FileText} accent="blue" title="Titolo prodotto">
            <textarea
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-[15px] text-white resize-y focus:outline-none focus:border-blue-500/50"
              placeholder="Titolo del prodotto"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>Consigliato: max 200 caratteri</span>
              <span className={form.title.length > 200 ? "text-rose-400" : "tabular-nums"}>{form.title.length}</span>
            </div>
          </Section>

          {/* Bullet points */}
          <Section
            icon={List}
            accent="emerald"
            title="Bullet points"
            eyebrow={`${form.bullets.length}/5`}
            action={
              form.bullets.length < 5 && (
                <button onClick={handleBulletAdd} type="button" className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  <Plus className="w-3 h-3" />
                  Aggiungi
                </button>
              )
            }
          >
            <div className="space-y-2">
              {form.bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold flex items-center justify-center mt-1 tabular-nums">
                    {i + 1}
                  </span>
                  <textarea
                    value={b}
                    onChange={(e) => handleBulletChange(i, e.target.value)}
                    rows={2}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 resize-y focus:outline-none focus:border-emerald-500/50"
                    placeholder={`Bullet point ${i + 1}`}
                  />
                  <button
                    onClick={() => handleBulletRemove(i)}
                    type="button"
                    title="Rimuovi"
                    className="flex-shrink-0 w-8 h-8 rounded-md border border-slate-800 bg-slate-900 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 transition-colors flex items-center justify-center mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* Descrizione */}
          <Section icon={AlignLeft} accent="violet" title="Descrizione">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={10}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 resize-y focus:outline-none focus:border-violet-500/50"
              placeholder="Descrizione del prodotto"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>Consigliato: max 2000 caratteri</span>
              <span className={form.description.length > 2000 ? "text-rose-400" : "tabular-nums"}>{form.description.length}</span>
            </div>
          </Section>
        </div>
      </main>

      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Editor Listing</span>
          <span className="font-mono">{data.updated_at}</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// SectionCard riusata (simile a PaginaListing)
// ============================================================
const ACCENTS = {
  blue:    { bar: "bg-blue-400/60",    iconBg: "bg-blue-500/10 border-blue-500/30",    iconColor: "text-blue-400" },
  emerald: { bar: "bg-emerald-400/60", iconBg: "bg-emerald-500/10 border-emerald-500/30", iconColor: "text-emerald-400" },
  violet:  { bar: "bg-violet-400/60",  iconBg: "bg-violet-500/10 border-violet-500/30",  iconColor: "text-violet-400" },
  cyan:    { bar: "bg-cyan-400/60",    iconBg: "bg-cyan-500/10 border-cyan-500/30",    iconColor: "text-cyan-400" },
};

function Section({ icon: Icon, accent = "blue", title, eyebrow, action, children }) {
  const a = ACCENTS[accent] || ACCENTS.blue;
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar}`} />
      <div className="px-5 sm:px-6 py-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-md border ${a.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${a.iconColor}`} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Modifica</div>
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                {title}
                {eyebrow && <span className="ml-2 text-[11px] font-mono text-slate-500">{eyebrow}</span>}
              </h2>
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
