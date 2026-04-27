import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Copy,
  RefreshCw,
} from "lucide-react";

function SubmissionStatusBadge({ sku, country }) {
  const [state, setState] = useState({ loading: true, status: null, issues: [], cached: null, error: null });
  const [open, setOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const r = await fetch(`/api/v2/listings-editor/status?sku=${encodeURIComponent(sku)}&country=${country}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Errore");
      setState({ loading: false, status: j.status, issues: j.issues || [], cached: j.cached, error: null });
    } catch (e) {
      setState({ loading: false, status: null, issues: [], cached: null, error: e.message });
    }
  }, [sku, country]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const s = (state.status || "").toUpperCase();
  const lastSub = state.cached?.last_submission_id;
  const lastAt = state.cached?.last_status_at;

  let color = "slate";
  let label = state.loading ? "…" : (state.status || "N/D");
  if (state.error) { color = "rose"; label = "Errore"; }
  else if (s === "BUYABLE" || s === "DISCOVERABLE") { color = "emerald"; label = s; }
  else if (s === "INCOMPLETE" || s === "INACTIVE") { color = "amber"; label = s; }

  const cls = {
    slate: "bg-slate-800/60 border-slate-700 text-slate-300",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
    amber: "bg-amber-500/10 border-amber-500/40 text-amber-300",
    rose: "bg-rose-500/10 border-rose-500/40 text-rose-300",
  }[color];

  const errCount = state.issues.filter((i) => (i.severity || "").toUpperCase() === "ERROR").length;
  const warnCount = state.issues.filter((i) => (i.severity || "").toUpperCase() === "WARNING").length;

  const hasIssues = state.issues.length > 0;

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => hasIssues && setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] font-mono ${cls} ${hasIssues ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
        title={lastSub ? `Submission: ${lastSub} · ${lastAt || ""}` : ""}
      >
        <span className="text-[10px] uppercase tracking-[0.14em] opacity-70">Stato</span>
        <span className="font-semibold">{label}</span>
        {errCount > 0 && <span className="text-rose-400">· {errCount} err</span>}
        {warnCount > 0 && <span className="text-amber-400">· {warnCount} warn</span>}
      </button>
      <button
        type="button"
        onClick={fetchStatus}
        disabled={state.loading}
        title="Aggiorna stato"
        className="w-7 h-7 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center disabled:opacity-40"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${state.loading ? "animate-spin" : ""}`} />
      </button>
      {open && hasIssues && (
        <div className="absolute right-0 top-full mt-2 w-[min(480px,90vw)] max-h-[60vh] overflow-auto rounded-md border border-slate-700 bg-slate-900 shadow-xl z-50 p-3 space-y-2">
          {state.issues.map((iss, i) => {
            const sev = (iss.severity || "").toUpperCase();
            const c = sev === "ERROR" ? "text-rose-300 border-rose-500/40 bg-rose-500/5"
                    : sev === "WARNING" ? "text-amber-300 border-amber-500/40 bg-amber-500/5"
                    : "text-slate-300 border-slate-700 bg-slate-800/40";
            return (
              <div key={i} className={`border rounded-md p-2 text-[11px] ${c}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] uppercase opacity-80">{sev || "INFO"}</span>
                  {iss.code && <span className="font-mono text-[10px] opacity-60">· {iss.code}</span>}
                </div>
                <div className="text-[12px] leading-snug">{iss.message}</div>
                {Array.isArray(iss.attributeNames) && iss.attributeNames.length > 0 && (
                  <div className="mt-1 font-mono text-[10px] opacity-70">attr: {iss.attributeNames.join(", ")}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Pattern: pittogrammi estesi (emoji), altri simboli (So), simboli modificatori (Sk).
// Catturano ● ★ ✓ ✗ ■ ▶ → ⇒ ♥ emoji colorate, dingbats, frecce, geometrici, ecc.
const SUSPICIOUS_RE = /[\p{Extended_Pictographic}\p{So}\p{Sk}]/gu;

function stripSuspicious(text) {
  if (typeof text !== "string") return text;
  return text.replace(SUSPICIOUS_RE, "").replace(/\s{2,}/g, " ").trim();
}

function findSuspiciousChars(payload) {
  const report = [];
  const scan = (label, txt) => {
    if (typeof txt !== "string") return;
    const matches = txt.match(SUSPICIOUS_RE);
    if (matches && matches.length) report.push({ field: label, chars: [...new Set(matches)] });
  };
  if (payload.title !== undefined) scan("titolo", payload.title);
  if (payload.description !== undefined) scan("descrizione", payload.description);
  if (Array.isArray(payload.bullets)) {
    payload.bullets.forEach((b, i) => scan(`bullet ${i + 1}`, b));
  }
  return report;
}

function pickLargestImages(urls) {
  if (!Array.isArray(urls)) return [];
  // Amazon: la URL "nuda" (senza modificatori _SL/_SX/ecc.) è la full-res.
  // Teniamo solo quelle. Se per qualche motivo non ce ne sono, fallback alle originali.
  const hasSizeMod = (url) => /[._](?:SL|SX|SY|UF|UL|UY|UX|AC)\d*_/i.test(url);
  const bare = urls.filter((u) => u && !hasSizeMod(u));
  return bare.length ? bare : urls.filter(Boolean);
}

function CopyField({ label, value }) {
  if (!value) return null;
  const copy = () => {
    navigator.clipboard?.writeText(value);
    toast.success(`${label} copiato`);
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={`Copia ${label}`}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 text-[12px] font-mono text-slate-200 transition-colors"
    >
      <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="truncate max-w-[220px]">{value}</span>
      <Copy className="w-3 h-3 text-slate-500" />
    </button>
  );
}

export default function EuropaListingItemEditor() {
  const { t } = useTranslation();
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
        toast.error(json.error || t("europaListingItemEditor.toast_err_not_found"));
      }
    } catch {
      toast.error(t("europaListingItemEditor.toast_err_network"));
    } finally {
      setLoading(false);
    }
  }, [decodedSku, country, t]);

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
      toast.error(t("europaListingItemEditor.toast_max_bullets"));
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
      // Invio SOLO i campi realmente modificati: Amazon rivalida tutti i campi
      // inclusi nel PATCH, quindi evitiamo errori su bullet/descrizione se abbiamo
      // toccato solo il titolo.
      const newTitle = form.title.trim();
      const newBullets = form.bullets.map((b) => b.trim()).filter(Boolean);
      const newDescription = form.description.trim();
      const origTitle = (data.title || "").trim();
      const origBullets = (data.bullets || []).map((b) => (b || "").trim()).filter(Boolean);
      const origDescription = (data.description || "").trim();

      const payload = {};
      if (newTitle !== origTitle) payload.title = newTitle;
      if (JSON.stringify(newBullets) !== JSON.stringify(origBullets)) payload.bullets = newBullets;
      if (newDescription !== origDescription) payload.description = newDescription;

      if (Object.keys(payload).length === 0) {
        toast.info(t("europaListingItemEditor.toast_no_changes", "Nessuna modifica da inviare"));
        setSaving(false);
        return;
      }

      // Pre-check: Amazon rifiuta pittogrammi/emoji/simboli Unicode nei testi
      const suspicious = findSuspiciousChars(payload);
      if (suspicious.length > 0) {
        const summary = suspicious.map((s) => `${s.field}: "${s.chars.join(" ")}"`).join(" · ");
        const proceed = window.confirm(
          `Ho trovato caratteri che Amazon potrebbe rifiutare (emoji/simboli):\n\n${summary}\n\nVuoi pulirli automaticamente e inviare?`
        );
        if (!proceed) { setSaving(false); return; }
        if (payload.title) payload.title = stripSuspicious(payload.title);
        if (payload.description) payload.description = stripSuspicious(payload.description);
        if (payload.bullets) payload.bullets = payload.bullets.map(stripSuspicious).map((s) => s.trim()).filter(Boolean);
        setForm((f) => ({
          ...f,
          title: payload.title ?? f.title,
          description: payload.description ?? f.description,
          bullets: payload.bullets ?? f.bullets,
        }));
      }

      const res = await fetch(`/api/v2/listings-editor/item?sku=${encodeURIComponent(decodedSku)}&country=${country}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        const err = json.error || json.result?.data || t("europaListingItemEditor.err_unknown");
        const errStr = typeof err === "string" ? err : JSON.stringify(err);

        // Rilevo il blocco Product Listing role
        if (errStr.includes("InvalidInput") || errStr.includes("Invalid parameters")) {
          setSaveError({
            type: "role_missing",
            message: t("europaListingItemEditor.err_role_missing"),
          });
        } else {
          setSaveError({ type: "generic", message: errStr });
        }
        toast.error(t("europaListingItemEditor.toast_save_failed"));
      } else {
        toast.success(json.submissionId
          ? t("europaListingItemEditor.toast_save_ok_id", { id: json.submissionId.slice(0, 8) })
          : t("europaListingItemEditor.toast_save_ok"));
        await load();
      }
    } catch (e) {
      setSaveError({ type: "generic", message: e.message });
      toast.error(t("europaListingItemEditor.toast_err_network"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-6 h-6 text-blue-400 animate-spin" />
          <p className="text-slate-500 text-sm">{t("europaListingItemEditor.loading")}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <p className="text-slate-400">{t("europaListingItemEditor.not_found")}</p>
          <button onClick={() => navigate(`/europe/listing-editor/${country}`)} className="text-blue-400 text-sm underline">{t("europaListingItemEditor.back_to_list")}</button>
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
            <button onClick={() => navigate(`/europe/listing-editor/${country}`)} type="button" title={t("common.back")} className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <FileText className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">{t("europaListingItemEditor.topbar_title")}</span>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-mono">{country}</span>
                <CopyField label="ASIN" value={data.asin} />
                <CopyField label="SKU" value={decodedSku} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SubmissionStatusBadge sku={decodedSku} country={country} />
            {dirty && (
              <button onClick={handleReset} type="button" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] uppercase tracking-wider transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
                {t("common.cancel")}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/50 text-blue-200 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t("europaListingItemEditor.btn_save_amazon")}
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
                {saveError.type === "role_missing" ? t("europaListingItemEditor.err_role_title") : t("europaListingItemEditor.err_save_title")}
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
            <span>{t("europaListingItemEditor.last_submission")}: <span className="font-mono">{data.last_submission_id.slice(0, 16)}…</span></span>
            {data.last_status && <span className="text-emerald-400">· {t("europaListingItemEditor.stato")}: {data.last_status}</span>}
            {data.last_status_at && <span className="text-emerald-500">· {new Date(data.last_status_at).toLocaleString()}</span>}
          </div>
        </div>
      )}

      {/* Contenuto */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Immagini (read-only) */}
          {(() => {
            const cleanImages = pickLargestImages(data.images);
            if (!cleanImages.length) return null;
            return (
              <Section icon={ImageIcon} accent="cyan" title={t("europaListingItemEditor.sec_immagini")} eyebrow={t("europaListingItemEditor.n_immagini", { n: cleanImages.length })}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {cleanImages.slice(0, 16).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-md bg-slate-800 border border-slate-700 hover:border-slate-500 overflow-hidden transition-colors">
                      <img src={url} alt="" className="w-full h-full object-contain" />
                    </a>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-slate-600">{t("europaListingItemEditor.images_future")}</p>
              </Section>
            );
          })()}

          {/* Titolo */}
          <Section icon={FileText} accent="blue" title={t("europaListingItemEditor.sec_titolo")}>
            <textarea
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-[15px] text-white resize-y focus:outline-none focus:border-blue-500/50"
              placeholder={t("europaListingItemEditor.ph_titolo")}
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>{t("europaListingItemEditor.consigliato_titolo")}</span>
              <span className={form.title.length > 200 ? "text-rose-400" : "tabular-nums"}>{form.title.length}</span>
            </div>
          </Section>

          {/* Bullet points */}
          <Section
            icon={List}
            accent="emerald"
            title={t("europaListingItemEditor.sec_bullet")}
            eyebrow={`${form.bullets.length}/5`}
            action={
              form.bullets.length < 5 && (
                <button onClick={handleBulletAdd} type="button" className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  <Plus className="w-3 h-3" />
                  {t("europaListingItemEditor.btn_add")}
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
                    placeholder={t("europaListingItemEditor.ph_bullet", { n: i + 1 })}
                  />
                  <button
                    onClick={() => handleBulletRemove(i)}
                    type="button"
                    title={t("europaListingItemEditor.title_remove")}
                    className="flex-shrink-0 w-8 h-8 rounded-md border border-slate-800 bg-slate-900 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 transition-colors flex items-center justify-center mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* Descrizione */}
          <Section icon={AlignLeft} accent="violet" title={t("europaListingItemEditor.sec_descrizione")}>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={10}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 resize-y focus:outline-none focus:border-violet-500/50"
              placeholder={t("europaListingItemEditor.ph_descrizione")}
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>{t("europaListingItemEditor.consigliato_desc")}</span>
              <span className={form.description.length > 2000 ? "text-rose-400" : "tabular-nums"}>{form.description.length}</span>
            </div>
          </Section>
        </div>
      </main>

      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} {t("europaListingItemEditor.footer_section")}</span>
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
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">&nbsp;</div>
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
