import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  ChevronUp,
  ChevronDown,
  Box,
} from "lucide-react";

import { CORRIERI_PREDEFINITI as corrieriPredefiniti } from "../constants/ddt";

const paesiOrdinati = [
  "Italia", "Francia", "Spagna", "Germania", "Inghilterra",
  "Belgio", "Olanda", "Svezia", "Polonia", "Irlanda",
];

// ========== UTILITY CLASSIFICAZIONE (frontend) ==========
const CAPACITA_BOX = {
  "12ML_SINGOLO": 300,
  "12ML_KIT": 150,
  "100ML": 150,
  "DEFAULT": 150,
};

function detectMultipack(nome) {
  const patterns = [
    /\d+\s*pz/i, /\d+\s*pezzi/i, /\d+\s*x\s/i,
    /\bkit\b/i, /\bset\b/i, /\bcoppia\b/i, /\bduo\b/i, /\btwin\b/i, /\bpack\b/i,
  ];
  for (const p of patterns) if (p.test(nome)) return true;
  const composite = [/base\s*(e|&|\+)\s*top/i, /top\s*(e|&|\+)\s*base/i];
  for (const p of composite) if (p.test(nome)) return true;
  return false;
}

function classificaProdotto(nome) {
  const n = (nome || "").toLowerCase();
  if (/100\s*ml/i.test(n)) return { tipo: "100ML", capacita: CAPACITA_BOX["100ML"] };
  if (/12\s*ml/i.test(n) || /10\s*ml/i.test(n)) {
    return detectMultipack(n)
      ? { tipo: "12ML_KIT", capacita: CAPACITA_BOX["12ML_KIT"] }
      : { tipo: "12ML_SINGOLO", capacita: CAPACITA_BOX["12ML_SINGOLO"] };
  }
  return { tipo: "DEFAULT", capacita: CAPACITA_BOX.DEFAULT };
}

function espandiProdottoInRighe(prodotto) {
  const { capacita } = classificaProdotto(prodotto.prodotto_nome || prodotto.prodottoNome);
  const qty = prodotto.quantita || 0;
  const numBox = Math.ceil(qty / capacita);

  if (numBox <= 1) {
    return [{
      id: `riga-${Date.now()}-${Math.random()}`,
      asin: prodotto.asin || "",
      sku: prodotto.sku || "",
      prodottoNome: prodotto.prodotto_nome || prodotto.prodottoNome || "",
      quantita: qty,
      cartone: "",
      pacco: "",
      isManuallyEdited: false,
    }];
  }

  const righe = [];
  let rimanente = qty;
  for (let i = 0; i < numBox; i++) {
    const qtyBox = Math.min(rimanente, capacita);
    righe.push({
      id: `riga-${Date.now()}-${i}-${Math.random()}`,
      asin: prodotto.asin || "",
      sku: prodotto.sku || "",
      prodottoNome: prodotto.prodotto_nome || prodotto.prodottoNome || "",
      quantita: qtyBox,
      cartone: "",
      pacco: "",
      boxNumero: i + 1,
      boxTotali: numBox,
      isManuallyEdited: false,
    });
    rimanente -= qtyBox;
  }
  return righe;
}

/* ── Shared Nexus classes ─────────────────────────────── */
const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/40 outline-none transition-colors";
const labelCls = "text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium block mb-1.5 flex items-center gap-1.5";

// ========== COMPONENTE ==========
const DDTDettaglio = () => {
  const { idSpedizione, ddtNumero } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [spedizione, setSpedizione] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [numeroDDT, setNumeroDDT] = useState("");
  const [numeroAmazon, setNumeroAmazon] = useState("");
  const [dataDdt, setDataDdt] = useState("");
  const [paese, setPaese] = useState("");
  const [centro, setCentro] = useState("");
  const [trasportatore, setTrasportatore] = useState("");
  const [trasportatoreCustom, setTrasportatoreCustom] = useState("");
  const [tracking, setTracking] = useState("");
  const [righe, setRighe] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resSped = await fetch("/api/v2/ddt/prebolle");
        const prebolle = await resSped.json();
        const found = prebolle.find((s) => s.id === parseInt(idSpedizione));

        if (!found) {
          setError(t("ddtDettaglio.error_not_found"));
          setLoading(false);
          return;
        }
        setSpedizione(found);

        let prodottiDaUsare = [];
        if (ddtNumero) {
          try {
            const resAss = await fetch(`/api/v2/ddt/assegnazioni/${idSpedizione}/${ddtNumero}`);
            const dataAss = await resAss.json();
            if (dataAss.ok && dataAss.righe?.length > 0) {
              prodottiDaUsare = dataAss.righe;
            }
          } catch (e) {
            console.warn("Assegnazioni non trovate, uso prodotti spedizione");
          }
        }

        if (prodottiDaUsare.length === 0) {
          prodottiDaUsare = found.righe || [];
        }

        let righeFinali = [];
        for (const p of prodottiDaUsare) {
          righeFinali = righeFinali.concat(espandiProdottoInRighe(p));
        }
        setRighe(righeFinali);
      } catch (err) {
        console.error("Errore caricamento:", err);
        setError(t("ddtDettaglio.error_generic"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [idSpedizione, ddtNumero]);

  const aggiornaRiga = (index, campo, valore) => {
    const nuoveRighe = [...righe];
    nuoveRighe[index][campo] = valore;
    nuoveRighe[index].isManuallyEdited = true;
    setRighe(nuoveRighe);
  };

  const aggiungiRiga = () => {
    setRighe([...righe, {
      id: `riga-new-${Date.now()}`,
      asin: "", sku: "", prodottoNome: "", quantita: 0, cartone: "", pacco: "",
      isManuallyEdited: true,
    }]);
  };

  const rimuoviRiga = (index) => {
    if (righe.length > 1) setRighe(righe.filter((_, i) => i !== index));
  };

  const duplicaRiga = (index) => {
    const nuovaRiga = { ...righe[index], id: `riga-dup-${Date.now()}`, cartone: "", pacco: "", isManuallyEdited: true };
    const nuoveRighe = [...righe];
    nuoveRighe.splice(index + 1, 0, nuovaRiga);
    setRighe(nuoveRighe);
  };

  const spostaRigaSu = (index) => {
    if (index === 0) return;
    const nuoveRighe = [...righe];
    [nuoveRighe[index - 1], nuoveRighe[index]] = [nuoveRighe[index], nuoveRighe[index - 1]];
    setRighe(nuoveRighe);
  };

  const spostaRigaGiu = (index) => {
    if (index === righe.length - 1) return;
    const nuoveRighe = [...righe];
    [nuoveRighe[index], nuoveRighe[index + 1]] = [nuoveRighe[index + 1], nuoveRighe[index]];
    setRighe(nuoveRighe);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      brand: "pics",
      numeroDDT, numeroAmazon,
      data: dataDdt, paese, centro,
      trasportatore: trasportatore === "ALTRO" ? trasportatoreCustom : trasportatore,
      tracking, righe,
      spedizioneId: idSpedizione,
      spedizioneProgressivo: spedizione?.progressivo,
      ddtNumero: ddtNumero || 1,
    };

    try {
      const res = await fetch("/api/v2/ddt/pics-nails/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const blob = await res.blob();
        window.open(window.URL.createObjectURL(blob), "_blank");
      } else {
        toast.error(t("ddtDettaglio.toast_error_pdf"));
      }
    } catch (err) {
      console.error("Errore generazione PDF:", err);
      toast.error(t("ddtDettaglio.toast_error_pdf_generic"));
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t("ddtDettaglio.loading")}</p>
        </div>
      </div>
    );
  }

  // Errore
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="w-full max-w-lg space-y-4">
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-rose-300 mb-1">{t("ddtDettaglio.error_title")}</h2>
              <p className="text-sm text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/uffici/ddt/prebolle")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/40 text-slate-300 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("ddtDettaglio.btn_torna_lista")}
          </button>
        </div>
      </div>
    );
  }

  const backUrl = ddtNumero ? `/uffici/ddt/scomponi/${idSpedizione}` : "/uffici/ddt/prebolle";

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(backUrl)} type="button" title={t("ddtDettaglio.btn_indietro")} className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
              <FileText className="w-[18px] h-[18px] text-violet-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">
                {t("ddtDettaglio.title_ddt")} {ddtNumero && <span className="text-violet-400">#{ddtNumero}</span>}
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">
                {t("ddtDettaglio.subtitle_spedizione")} {spedizione?.progressivo}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* === Content === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        <div className="space-y-6">

          {/* Info spedizione */}
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
            <div className="px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-violet-500/10 border-violet-500/40 text-violet-400">
                  <CheckCircle className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Spedizione</span>
                  <h3 className="text-sm font-semibold text-white -mt-0.5">{t("ddtDettaglio.info_title")}</h3>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t("ddtDettaglio.info_progressivo"), value: spedizione?.progressivo },
                  { label: t("ddtDettaglio.info_paese"), value: spedizione?.paese },
                  { label: t("ddtDettaglio.info_data_sped"), value: spedizione?.data || "-" },
                  { label: t("ddtDettaglio.info_operatore"), value: spedizione?.operatore || "-" },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                    <p className="text-sm font-medium text-white mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Intestazione brand */}
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />
            <div className="px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-amber-500/10 border-amber-500/40 text-amber-400">
                  <Building2 className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Brand</span>
                  <h3 className="text-sm font-semibold text-white -mt-0.5">{t("ddtDettaglio.intestazione_title")}</h3>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-800/40 border border-slate-700/50 rounded-md">
                <img src="/images/logo.png" alt="Pics Nails" className="h-14 w-auto bg-white p-1.5 rounded-md" />
                <div>
                  <p className="text-sm font-semibold text-white">Pics Nails</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t("ddtDettaglio.intestazione_brand_desc")}</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Informazioni DDT */}
            <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
              <div className="px-6 py-5 sm:px-8 sm:py-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-blue-500/10 border-blue-500/40 text-blue-400">
                    <FileText className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Documento</span>
                    <h3 className="text-sm font-semibold text-white -mt-0.5">{t("ddtDettaglio.info_doc_title")}</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}><Hash className="w-3.5 h-3.5" />{t("ddtDettaglio.lbl_numero_ddt")}</label>
                    <input type="text" placeholder={t("ddtDettaglio.ph_numero_ddt")} className={inputCls} value={numeroDDT} onChange={(e) => setNumeroDDT(e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelCls}><Hash className="w-3.5 h-3.5" />{t("ddtDettaglio.lbl_rif_amazon")}</label>
                    <input type="text" placeholder={t("ddtDettaglio.ph_rif_amazon")} className={inputCls} value={numeroAmazon} onChange={(e) => setNumeroAmazon(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}><Calendar className="w-3.5 h-3.5" />{t("ddtDettaglio.lbl_data")}</label>
                    <input type="date" className={inputCls} value={dataDdt} onChange={(e) => setDataDdt(e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelCls}><MapPin className="w-3.5 h-3.5" />{t("ddtDettaglio.lbl_paese")}</label>
                    <select className={inputCls} value={paese} onChange={(e) => setPaese(e.target.value)} required>
                      <option value="">{t("ddtDettaglio.opt_paese_default")}</option>
                      {paesiOrdinati.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className={labelCls}><Building2 className="w-3.5 h-3.5" />{t("ddtDettaglio.lbl_centro")}</label>
                  <textarea className={inputCls} value={centro} onChange={(e) => setCentro(e.target.value)} placeholder={t("ddtDettaglio.ph_centro")} rows={3} required />
                </div>
              </div>
            </div>

            {/* Trasporto */}
            <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
              <div className="px-6 py-5 sm:px-8 sm:py-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-cyan-500/10 border-cyan-500/40 text-cyan-400">
                    <Truck className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Logistica</span>
                    <h3 className="text-sm font-semibold text-white -mt-0.5">{t("ddtDettaglio.trasporto_title")}</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{t("ddtDettaglio.lbl_corriere")}</label>
                    <select className={inputCls} value={trasportatore} onChange={(e) => { setTrasportatore(e.target.value); if (e.target.value !== "ALTRO") setTrasportatoreCustom(""); }} required>
                      <option value="">{t("ddtDettaglio.opt_trasp_default")}</option>
                      {corrieriPredefiniti.map((c) => <option key={c} value={c}>{c}</option>)}
                      <option value="ALTRO">{t("ddtDettaglio.opt_trasp_altro")}</option>
                    </select>
                  </div>
                  {trasportatore === "ALTRO" && (
                    <div>
                      <label className={labelCls}>{t("ddtDettaglio.lbl_trasp_custom")}</label>
                      <input type="text" placeholder={t("ddtDettaglio.ph_trasp_custom")} className={inputCls} value={trasportatoreCustom} onChange={(e) => setTrasportatoreCustom(e.target.value)} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>{t("ddtDettaglio.lbl_tracking")}</label>
                    <input type="text" placeholder={t("ddtDettaglio.ph_tracking")} className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Prodotti */}
            <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
              <div className="px-6 py-5 sm:px-8 sm:py-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-emerald-500/10 border-emerald-500/40 text-emerald-400">
                      <Package className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Contenuto</span>
                      <h3 className="text-sm font-semibold text-white -mt-0.5">{t("ddtDettaglio.prodotti_title")}</h3>
                    </div>
                    <span className="ml-2 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-xs font-medium tabular-nums">{righe.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={aggiungiRiga}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("ddtDettaglio.btn_aggiungi_prodotto")}
                  </button>
                </div>

                <div className="space-y-3">
                  {righe.map((r, i) => (
                    <div
                      key={r.id}
                      className={`relative bg-slate-800/40 border rounded-md p-4 ${r.isManuallyEdited ? "border-amber-500/40 bg-amber-500/5" : "border-slate-700/50"}`}
                    >
                      {/* Badge modificato */}
                      {r.isManuallyEdited && (
                        <span className="absolute -top-2 left-4 px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] rounded font-medium">
                          {t("ddtDettaglio.badge_modificato")}
                        </span>
                      )}

                      {/* Badge box */}
                      {r.boxTotali && r.boxTotali > 1 && (
                        <span className="absolute -top-2 left-24 px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] rounded font-medium flex items-center gap-1">
                          <Box className="w-3 h-3" />
                          {t("ddtDettaglio.badge_box", { num: r.boxNumero, tot: r.boxTotali })}
                        </span>
                      )}

                      {/* Azioni riga */}
                      <div className="absolute top-3 right-3 flex items-center gap-1">
                        <button type="button" onClick={() => spostaRigaSu(i)} disabled={i === 0} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${i === 0 ? "bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed" : "bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400"}`} title={t("ddtDettaglio.title_sposta_su")}>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => spostaRigaGiu(i)} disabled={i === righe.length - 1} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${i === righe.length - 1 ? "bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed" : "bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400"}`} title={t("ddtDettaglio.title_sposta_giu")}>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => duplicaRiga(i)} className="w-7 h-7 flex items-center justify-center rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 text-violet-400 transition-colors" title={t("ddtDettaglio.title_duplica")}>
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {righe.length > 1 && (
                          <button type="button" onClick={() => rimuoviRiga(i)} className="w-7 h-7 flex items-center justify-center rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-400 transition-colors" title={t("ddtDettaglio.title_elimina")}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Numero riga */}
                      <div className="absolute top-3 left-3 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-semibold text-slate-400 tabular-nums">
                        {i + 1}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 pt-6 pr-36">
                        <input type="text" placeholder={t("ddtDettaglio.ph_asin")} className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/60 outline-none font-mono" value={r.asin} onChange={(e) => aggiornaRiga(i, "asin", e.target.value)} />
                        <input type="text" placeholder={t("ddtDettaglio.ph_sku")} className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/60 outline-none font-mono" value={r.sku} onChange={(e) => aggiornaRiga(i, "sku", e.target.value)} />
                        <input type="text" placeholder={t("ddtDettaglio.ph_nome_prodotto")} className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/60 outline-none" value={r.prodottoNome} onChange={(e) => aggiornaRiga(i, "prodottoNome", e.target.value)} />
                        <input type="number" min="0" placeholder={t("ddtDettaglio.ph_quantita")} className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/60 outline-none tabular-nums" value={r.quantita} onChange={(e) => aggiornaRiga(i, "quantita", Number(e.target.value))} />
                        <input type="number" min="0" placeholder={t("ddtDettaglio.ph_cartone")} className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/60 outline-none tabular-nums" value={r.cartone} onChange={(e) => aggiornaRiga(i, "cartone", e.target.value)} />
                      </div>
                      <div className="mt-3 pr-36">
                        <input type="text" placeholder={t("ddtDettaglio.ph_pacco")} className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/60 outline-none" value={r.pacco} onChange={(e) => aggiornaRiga(i, "pacco", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totali */}
                <div className="mt-5 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-md flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t("ddtDettaglio.totale_unita")}</span>
                  <span className="text-xl font-semibold text-emerald-400 tabular-nums">
                    {righe.reduce((sum, r) => sum + (Number(r.quantita) || 0), 0)} <span className="text-sm text-slate-500">{t("ddtDettaglio.unit_pz")}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 hover:border-violet-400/60 text-violet-300 hover:text-violet-200 rounded-md px-6 py-4 text-sm font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              {t("ddtDettaglio.btn_genera_pdf")}
            </button>
          </form>
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
        <span>&copy; {new Date().getFullYear()} Nexus — DDT</span>
        <span className="font-mono">v2.0</span>
      </footer>
    </div>
  );
};

export default DDTDettaglio;
