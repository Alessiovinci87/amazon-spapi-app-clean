import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  Package,
  Truck,
  MapPin,
  Calendar,
  Building2,
  Hash,
  X,
  Download,
  LogOut,
} from "lucide-react";

import { BRAND_CONFIG as brandConfig, CORRIERI_PREDEFINITI as corrieriPredefiniti } from "../constants/ddt";

/* ── Stili condivisi ─────────────────────────────────────── */
const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60 transition-colors";
const labelCls = "text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5";

function SectionCard({ accent = "emerald", icon: Icon, eyebrow, title, badge, children }) {
  const bar = { emerald: "bg-emerald-400/60", blue: "bg-blue-400/60", violet: "bg-violet-400/60", amber: "bg-amber-400/60" };
  const iBg = { emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400", blue: "bg-blue-500/10 border-blue-500/40 text-blue-400", violet: "bg-violet-500/10 border-violet-500/40 text-violet-400", amber: "bg-amber-500/10 border-amber-500/40 text-amber-400" };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${bar[accent]}`} />
      <div className="px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 ${iBg[accent]}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{eyebrow}</div>}
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">{title}</h2>
            </div>
          </div>
          {badge}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Componente principale ───────────────────────────────── */

const DDTNuovo = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = Boolean(editId);

  const [brand, setBrand] = useState("");
  const [numeroDDT, setNumeroDDT] = useState("");
  const [numeroAmazon, setNumeroAmazon] = useState("");
  const [data, setData] = useState("");
  const [paese, setPaese] = useState("");
  const [centro, setCentro] = useState("");
  const [trasportatore, setTrasportatore] = useState("");
  const [trasportatoreCustom, setTrasportatoreCustom] = useState("");
  const [tracking, setTracking] = useState("");

  const newRigaId = () => `riga-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const [righe, setRighe] = useState([
    { _id: newRigaId(), asin: "", sku: "", prodottoNome: "", quantita: "", cartone: "", pacco: "", lotto: "", tracking: "" },
  ]);
  const [trackingOpen, setTrackingOpen] = useState(new Set());

  const toggleTracking = (id) => {
    setTrackingOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const res = await fetch(`/api/v2/ddt/storico/${editId}`);
        if (!res.ok) throw new Error("fetch");
        const d = await res.json();
        setBrand(d.brand || "");
        setNumeroDDT(d.numeroDDT || "");
        setNumeroAmazon(d.numeroAmazon || "");
        setData(d.data || "");
        setPaese(d.paese || "");
        setCentro(d.centro || "");
        const tr = d.trasportatore || "";
        const predef = ["DHL", "UPS", "FEDEX", "GLS", "BRT", "SDA", "TNT", "POSTE"];
        if (tr && !predef.includes(tr.toUpperCase())) {
          setTrasportatore("ALTRO");
          setTrasportatoreCustom(tr);
        } else {
          setTrasportatore(tr);
        }
        setTracking(d.tracking || "");
        if (Array.isArray(d.righe) && d.righe.length) {
          const nuoveRighe = d.righe.map((r) => ({
            _id: newRigaId(),
            asin: r.asin || "", sku: r.sku || "", prodottoNome: r.prodottoNome || "",
            quantita: r.quantita ?? "", cartone: r.cartone || "", pacco: r.pacco || "", lotto: r.lotto || "",
            tracking: r.tracking || "",
          }));
          setRighe(nuoveRighe);
          const openIds = new Set(nuoveRighe.filter((r) => r.tracking).map((r) => r._id));
          setTrackingOpen(openIds);
        }
      } catch {
        toast.error(t("ddtNuovo.toast_error_load", "Errore caricamento DDT"));
      }
    })();
  }, [editId, t]);

  const aggiungiRiga = () => {
    setRighe([...righe, { _id: newRigaId(), asin: "", sku: "", prodottoNome: "", quantita: "", cartone: "", pacco: "", lotto: "", tracking: "" }]);
  };

  const rimuoviRiga = (index) => {
    if (righe.length > 1) setRighe(righe.filter((_, i) => i !== index));
  };

  const aggiornaRiga = (index, campo, valore) => {
    const nuoveRighe = [...righe];
    nuoveRighe[index][campo] = valore;
    setRighe(nuoveRighe);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      brand, numeroDDT, numeroAmazon, data, paese, centro,
      trasportatore: trasportatore === "ALTRO" ? trasportatoreCustom : trasportatore,
      tracking, righe,
    };

    if (isEdit) {
      const up = await fetch(`/api/v2/ddt/storico/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!up.ok) {
        toast.error(t("ddtNuovo.toast_error_update", "Errore aggiornamento DDT"));
        return;
      }
      toast.success(t("ddtNuovo.toast_updated", "DDT aggiornato"));
      try {
        const pdfRes = await fetch(`/api/v2/ddt/storico/${editId}/pdf`);
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          window.open(window.URL.createObjectURL(blob), "_blank");
        }
      } catch { toast.error(t("ddtNuovo.toast_error_pdf_open", "Errore apertura PDF aggiornato")); }
      return;
    }

    const res = await fetch("/api/v2/ddt/generico/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } else {
      let detail = "";
      try {
        const j = await res.json();
        if (Array.isArray(j?.errors)) {
          detail = j.errors.map((e) => `${e.path}: ${e.message}`).join(" · ");
        } else if (j?.message) {
          detail = j.message;
        }
      } catch {}
      toast.error(detail ? `${t("ddtNuovo.toast_error_pdf")} — ${detail}` : t("ddtNuovo.toast_error_pdf"));
      console.error("DDT PDF 400:", detail);
    }
  };

  const paesiOrdinati = ["Italia", "Francia", "Spagna", "Germania", "Inghilterra", "Belgio", "Olanda", "Svezia", "Polonia", "Irlanda"];

  const rowInputCls = "bg-slate-700/60 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60 transition-colors";

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/uffici/ddt")} type="button" title={t("ddtNuovo.topbar_back")} className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
              <FileText className="w-[18px] h-[18px] text-emerald-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">{t("ddtNuovo.topbar_title")}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{t("ddtNuovo.topbar_eyebrow")}</span>
            </div>
          </div>
          <button onClick={() => navigate("/uffici/ddt")} type="button" className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> {t("ddtNuovo.topbar_ddt")}
          </button>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("ddtNuovo.hero_eyebrow")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("ddtNuovo.hero_title_main")} <span className="text-slate-500">{t("ddtNuovo.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("ddtNuovo.hero_desc")}
          </p>
        </div>
      </section>

      {/* === Form === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Brand */}
          <SectionCard accent="emerald" icon={Building2} eyebrow={t("ddtNuovo.step1_eyebrow")} title={t("ddtNuovo.step1_title")}>
            <select className={`${inputCls} appearance-none cursor-pointer`} value={brand} onChange={(e) => setBrand(e.target.value)} required>
              <option value="">{t("ddtNuovo.opt_brand_default")}</option>
              {Object.keys(brandConfig).map((key) => (
                <option key={key} value={key}>{brandConfig[key].nome}</option>
              ))}
            </select>

            {brand && (
              <div className="mt-4 flex items-center gap-4 bg-slate-800/40 border border-slate-700/60 rounded-md px-5 py-4">
                <img src={brandConfig[brand].logo} alt={brandConfig[brand].nome} className="h-14 w-auto object-contain bg-white p-2 rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{brandConfig[brand].nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{brandConfig[brand].intestazione}</p>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Info documento */}
          <SectionCard accent="blue" icon={FileText} eyebrow={t("ddtNuovo.step2_eyebrow")} title={t("ddtNuovo.step2_title")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><Hash className="w-3 h-3" /> {t("ddtNuovo.lbl_numero_ddt")} <span className="text-rose-400">*</span></label>
                <input type="text" placeholder={t("ddtNuovo.ph_numero_ddt")} className={inputCls} value={numeroDDT} onChange={(e) => setNumeroDDT(e.target.value)} required />
              </div>
              <div>
                <label className={labelCls}><Hash className="w-3 h-3" /> {t("ddtNuovo.lbl_rif_amazon")}</label>
                <input type="text" placeholder={t("ddtNuovo.ph_rif_amazon")} className={inputCls} value={numeroAmazon} onChange={(e) => setNumeroAmazon(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}><Calendar className="w-3 h-3" /> {t("ddtNuovo.lbl_data")} <span className="text-rose-400">*</span></label>
                <input type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} onClick={(e) => { try { e.target.showPicker?.(); } catch {} }} required />
              </div>
              <div>
                <label className={labelCls}><MapPin className="w-3 h-3" /> {t("ddtNuovo.lbl_paese")} <span className="text-rose-400">*</span></label>
                <select className={`${inputCls} appearance-none cursor-pointer`} value={paese} onChange={(e) => { setPaese(e.target.value); setCentro(""); }} required>
                  <option value="">{t("ddtNuovo.opt_paese_default")}</option>
                  {paesiOrdinati.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className={labelCls}><Building2 className="w-3 h-3" /> {t("ddtNuovo.lbl_centro")} <span className="text-rose-400">*</span></label>
              <textarea className={inputCls} value={centro} onChange={(e) => setCentro(e.target.value)} placeholder={t("ddtNuovo.ph_centro")} rows={3} required />
            </div>
          </SectionCard>

          {/* Trasporto */}
          <SectionCard accent="violet" icon={Truck} eyebrow={t("ddtNuovo.step3_eyebrow")} title={t("ddtNuovo.step3_title")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("ddtNuovo.lbl_corriere")} <span className="text-rose-400">*</span></label>
                <select className={`${inputCls} appearance-none cursor-pointer`} value={trasportatore} onChange={(e) => { setTrasportatore(e.target.value); if (e.target.value !== "ALTRO") setTrasportatoreCustom(""); }} required>
                  <option value="">{t("ddtNuovo.opt_corriere_default")}</option>
                  {corrieriPredefiniti.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="ALTRO">{t("ddtNuovo.opt_corriere_altro")}</option>
                </select>
              </div>
              {trasportatore === "ALTRO" && (
                <div>
                  <label className={labelCls}>{t("ddtNuovo.lbl_trasp_nome")}</label>
                  <input type="text" placeholder={t("ddtNuovo.ph_trasp_nome")} className={inputCls} value={trasportatoreCustom} onChange={(e) => setTrasportatoreCustom(e.target.value)} />
                </div>
              )}
              <div>
                <label className={labelCls}>{t("ddtNuovo.lbl_tracking")}</label>
                <input type="text" placeholder={t("ddtNuovo.ph_tracking")} className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} />
              </div>
            </div>
          </SectionCard>

          {/* Prodotti */}
          <SectionCard
            accent="amber"
            icon={Package}
            eyebrow={t("ddtNuovo.step4_eyebrow")}
            title={t("ddtNuovo.step4_title")}
            badge={
              <button type="button" onClick={aggiungiRiga} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all">
                <Plus className="w-3.5 h-3.5" /> {t("ddtNuovo.btn_aggiungi")}
              </button>
            }
          >
            <div className="space-y-3">
              {righe.map((r, i) => (
                <div key={r._id} className="relative bg-slate-800/40 border border-slate-700/60 rounded-md p-4">
                  {righe.length > 1 && (
                    <button type="button" onClick={() => rimuoviRiga(i)} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title={t("ddtNuovo.title_rimuovi")}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 pr-8">
                    <input type="text" placeholder={t("ddtNuovo.ph_asin")} className={rowInputCls} value={r.asin} onChange={(e) => aggiornaRiga(i, "asin", e.target.value)} />
                    <input type="text" placeholder={t("ddtNuovo.ph_sku")} className={rowInputCls} value={r.sku} onChange={(e) => aggiornaRiga(i, "sku", e.target.value)} />
                    <input type="text" placeholder={t("ddtNuovo.ph_nome_prodotto")} className={`lg:col-span-2 ${rowInputCls}`} value={r.prodottoNome} onChange={(e) => aggiornaRiga(i, "prodottoNome", e.target.value)} />
                    <input type="number" min="0" placeholder={t("ddtNuovo.ph_qty")} className={rowInputCls} value={r.quantita} onChange={(e) => aggiornaRiga(i, "quantita", Number(e.target.value))} />
                    <input type="number" min="0" placeholder={t("ddtNuovo.ph_cartone")} className={rowInputCls} value={r.cartone} onChange={(e) => aggiornaRiga(i, "cartone", Number(e.target.value))} />
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" placeholder={t("ddtNuovo.ph_pacco")} className={rowInputCls} value={r.pacco} onChange={(e) => aggiornaRiga(i, "pacco", e.target.value)} />
                    <input type="text" placeholder={t("ddtNuovo.ph_lotto")} className={rowInputCls} value={r.lotto} onChange={(e) => aggiornaRiga(i, "lotto", e.target.value)} />
                  </div>
                  <div className="mt-3">
                    {(trackingOpen.has(r._id) || r.tracking) ? (
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-violet-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Tracking UPS (specifico per questa riga)"
                          className={`flex-1 ${rowInputCls}`}
                          value={r.tracking}
                          onChange={(e) => aggiornaRiga(i, "tracking", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => { aggiornaRiga(i, "tracking", ""); toggleTracking(r._id); }}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Rimuovi tracking"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleTracking(r._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 hover:border-violet-400/60 text-violet-300 hover:text-violet-200 text-xs font-medium transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Aggiungi tracking UPS
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Submit */}
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            {isEdit ? t("ddtNuovo.btn_aggiorna_pdf", "Aggiorna e rigenera PDF") : t("ddtNuovo.btn_genera_pdf")}
          </button>
        </form>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>{t("ddtNuovo.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DDTNuovo;
