import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Package,
  Split,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  LogOut,
} from "lucide-react";

/* ── Logica classificazione prodotto ─────────────────────── */
const CAPACITA_BOX = { "12ML_SINGOLO": 300, "12ML_KIT": 150, "100ML": 150, DEFAULT: 150 };

function detectMultipack(nome) {
  const patterns = [/\d+\s*pz/i, /\d+\s*pezzi/i, /\d+\s*x\s/i, /\bkit\b/i, /\bset\b/i, /\bcoppia\b/i, /\bduo\b/i, /\btwin\b/i, /\bpack\b/i];
  for (const p of patterns) if (p.test(nome)) return true;
  const composite = [/base\s*(e|&|\+)\s*top/i, /top\s*(e|&|\+)\s*base/i, /primer\s*(e|&|\+)\s*prep/i, /prep\s*(e|&|\+)\s*primer/i];
  for (const p of composite) if (p.test(nome)) return true;
  return false;
}

function classificaProdotto(nome) {
  const n = (nome || "").toLowerCase();
  if (/100\s*ml/i.test(n)) return { tipo: "100ML", capacita: CAPACITA_BOX["100ML"] };
  if (/12\s*ml/i.test(n) || /10\s*ml/i.test(n)) return detectMultipack(n) ? { tipo: "12ML_KIT", capacita: CAPACITA_BOX["12ML_KIT"] } : { tipo: "12ML_SINGOLO", capacita: CAPACITA_BOX["12ML_SINGOLO"] };
  return { tipo: "DEFAULT", capacita: CAPACITA_BOX.DEFAULT };
}

function calcolaInfoBox(nome, quantita) {
  const { capacita, tipo } = classificaProdotto(nome);
  return { capacita, tipo, numBox: Math.ceil(quantita / capacita) };
}

/* ── Stili condivisi ─────────────────────────────────────── */
const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/60 focus:border-amber-500/60 transition-colors";

/* ── Componente principale ───────────────────────────────── */

const DDTScomposizione = () => {
  const { idSpedizione } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [spedizione, setSpedizione] = useState(null);
  const [assegnazioni, setAssegnazioni] = useState([]);
  const [ddtCount, setDdtCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showDividiModal, setShowDividiModal] = useState(false);
  const [dividiTarget, setDividiTarget] = useState(null);
  const [dividiQty1, setDividiQty1] = useState(0);
  const [dividiQty2, setDividiQty2] = useState(0);
  const [dividiDdtDestinazione, setDividiDdtDestinazione] = useState(2);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resSped = await fetch("/api/v2/ddt/prebolle");
        const prebolle = await resSped.json();
        const found = prebolle.find((s) => s.id === parseInt(idSpedizione));
        if (!found) { setError(t("ddtScomposizione.error_not_found")); setLoading(false); return; }
        setSpedizione(found);

        const resAss = await fetch(`/api/v2/ddt/assegnazioni/${idSpedizione}`);
        const dataAss = await resAss.json();
        if (dataAss.ok && dataAss.assegnazioni.length > 0) {
          setAssegnazioni(dataAss.assegnazioni);
          setDdtCount(dataAss.ddtCount || 1);
        } else {
          await creaAssegnazioniIniziali();
        }
      } catch { setError(t("ddtScomposizione.error_generic")); } finally { setLoading(false); }
    };
    fetchData();
  }, [idSpedizione]);

  const creaAssegnazioniIniziali = async () => {
    try {
      const res = await fetch(`/api/v2/ddt/assegnazioni/${idSpedizione}/crea`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const resAss = await fetch(`/api/v2/ddt/assegnazioni/${idSpedizione}`);
        const dataAss = await resAss.json();
        setAssegnazioni(dataAss.assegnazioni || []);
        setDdtCount(1);
      }
    } catch {}
  };

  const aggiungiDDT = () => setDdtCount((p) => p + 1);

  const spostaProdotto = async (assegnazioneId, nuovoDdtNumero) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v2/ddt/assegnazioni/${idSpedizione}/sposta`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assegnazioneId, nuovoDdtNumero }) });
      if (res.ok) {
        const resAss = await fetch(`/api/v2/ddt/assegnazioni/${idSpedizione}`);
        const dataAss = await resAss.json();
        if (dataAss.ok) {
          setAssegnazioni(dataAss.assegnazioni || []);
          const maxDdt = Math.max(1, ...dataAss.assegnazioni.map((a) => a.ddt_numero));
          setDdtCount(Math.max(ddtCount, maxDdt));
        }
      }
    } catch {} finally { setSaving(false); }
  };

  const apriDividiModal = (assegnazione) => {
    const { capacita } = calcolaInfoBox(assegnazione.prodotto_nome, assegnazione.quantita);
    const boxCompleti = Math.floor(assegnazione.quantita / capacita);
    const eccedenza = assegnazione.quantita % capacita;
    const boxDdt1 = Math.ceil(boxCompleti / 2);
    const boxDdt2 = boxCompleti - boxDdt1;
    setDividiTarget({ ...assegnazione, capacitaBox: capacita, boxCompleti, eccedenza });
    setDividiQty1(boxDdt1 * capacita + eccedenza);
    setDividiQty2(boxDdt2 * capacita);
    setDividiDdtDestinazione(ddtCount + 1);
    setShowDividiModal(true);
  };

  const confermaDivisione = async () => {
    if (!dividiTarget) return;
    if (dividiQty1 + dividiQty2 !== dividiTarget.quantita) { toast.info(t("ddtScomposizione.toast_sum_required", { n: dividiTarget.quantita })); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/v2/ddt/assegnazioni/${idSpedizione}/dividi`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assegnazioneId: dividiTarget.id, quantitaDdt1: dividiQty1, quantitaDdt2: dividiQty2, nuovoDdtNumero: dividiDdtDestinazione }) });
      if (res.ok) {
        const resAss = await fetch(`/api/v2/ddt/assegnazioni/${idSpedizione}`);
        const dataAss = await resAss.json();
        setAssegnazioni(dataAss.assegnazioni || []);
        setDdtCount(Math.max(ddtCount, dividiDdtDestinazione));
        setShowDividiModal(false);
      }
    } catch {} finally { setSaving(false); }
  };

  const resetAssegnazioni = async () => {
    if (!window.confirm(t("ddtScomposizione.confirm_reset"))) return;
    setSaving(true);
    try {
      await fetch(`/api/v2/ddt/assegnazioni/${idSpedizione}/reset`, { method: "DELETE" });
      await creaAssegnazioniIniziali();
      setDdtCount(1);
    } catch {} finally { setSaving(false); }
  };

  const vaiADettaglio = (ddtNumero) => navigate(`/uffici/ddt/${idSpedizione}/${ddtNumero}`);

  const assegnazioniPerDDT = {};
  for (let i = 1; i <= ddtCount; i++) assegnazioniPerDDT[i] = assegnazioni.filter((a) => a.ddt_numero === i);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t("ddtScomposizione.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full space-y-4">
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-5 py-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
          <button onClick={() => navigate("/uffici/ddt/prebolle")} type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-medium transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> {t("ddtScomposizione.btn_torna_lista")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/uffici/ddt/prebolle")} type="button" title={t("ddtScomposizione.topbar_back")} className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <Split className="w-[18px] h-[18px] text-amber-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">{t("ddtScomposizione.topbar_title")}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{t("ddtScomposizione.topbar_eyebrow")}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button onClick={resetAssegnazioni} disabled={saving} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${saving ? "animate-spin" : ""}`} /> {t("ddtScomposizione.btn_reset")}
            </button>
            <button onClick={() => navigate("/uffici/ddt/prebolle")} type="button" className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> {t("ddtScomposizione.topbar_prebolle")}
            </button>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("ddtScomposizione.hero_eyebrow")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Spedizione <span className="text-amber-400">{spedizione?.progressivo}</span> <span className="text-slate-500">— {spedizione?.paese}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("ddtScomposizione.hero_desc")}
          </p>
        </div>
      </section>

      {/* === Griglia DDT === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(ddtCount)].map((_, idx) => {
            const ddtNum = idx + 1;
            const prodotti = assegnazioniPerDDT[ddtNum] || [];
            const totaleQty = prodotti.reduce((s, p) => s + p.quantita, 0);
            const hasProducts = prodotti.length > 0;

            return (
              <div key={ddtNum} className={`relative bg-slate-900/60 border rounded-lg overflow-hidden ${hasProducts ? "border-slate-800" : "border-dashed border-slate-700/60 opacity-60"}`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${hasProducts ? "bg-violet-400/60" : "bg-slate-700/40"}`} />
                <div className="px-6 py-5 sm:px-8 sm:py-6">
                  {/* Header DDT */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center text-violet-400 font-semibold text-lg tabular-nums">
                        {ddtNum}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{t("ddtScomposizione.ddt_num_title", { num: ddtNum })}</h3>
                        <p className="text-[11px] text-slate-500">{t("ddtScomposizione.ddt_num_subtitle", { prodotti: prodotti.length, qty: totaleQty })}</p>
                      </div>
                    </div>
                    {hasProducts && (
                      <button onClick={() => vaiADettaglio(ddtNum)} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 hover:border-violet-400/60 text-violet-300 hover:text-violet-200 text-xs font-medium transition-all">
                        {t("ddtScomposizione.btn_compila_ddt")} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Prodotti */}
                  {!hasProducts ? (
                    <div className="text-center py-8">
                      <Package className="w-7 h-7 text-slate-700 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">{t("ddtScomposizione.empty_no_products")}</p>
                      <p className="text-[11px] text-slate-700 mt-0.5">{t("ddtScomposizione.empty_no_products_hint")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {prodotti.map((p) => (
                        <div key={p.id} className="bg-slate-800/40 border border-slate-700/60 rounded-md px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{p.prodotto_nome}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {p.asin || "-"} · {p.sku || "-"}
                            </p>
                          </div>
                          <span className="text-base font-semibold text-emerald-400 tabular-nums flex-shrink-0">{p.quantita}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => apriDividiModal(p)} type="button" className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 transition-colors" title={t("ddtScomposizione.title_dividi")}>
                              <Split className="w-3.5 h-3.5" />
                            </button>
                            {ddtCount > 1 && (
                              <select onChange={(e) => spostaProdotto(p.id, parseInt(e.target.value))} value="" className="w-7 h-7 bg-blue-500/10 border border-blue-500/40 rounded-md text-blue-400 text-[10px] cursor-pointer appearance-none text-center" title={t("ddtScomposizione.title_sposta")}>
                                <option value="" disabled>&#8594;</option>
                                {[...Array(ddtCount)].map((_, i) => {
                                  const num = i + 1;
                                  if (num === ddtNum) return null;
                                  return <option key={num} value={num}>{t("ddtScomposizione.ddt_num_title", { num })}</option>;
                                })}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Aggiungi DDT */}
          <button onClick={aggiungiDDT} type="button" className="group bg-slate-900/30 border-2 border-dashed border-slate-700/40 hover:border-violet-500/40 rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-all">
            <div className="w-11 h-11 rounded-md bg-slate-800 group-hover:bg-violet-500/10 border border-slate-700 group-hover:border-violet-500/40 flex items-center justify-center transition-all">
              <Plus className="w-5 h-5 text-slate-500 group-hover:text-violet-400 transition-colors" />
            </div>
            <span className="text-sm text-slate-500 group-hover:text-violet-300 font-medium transition-colors">
              {t("ddtScomposizione.btn_add_ddt", { num: ddtCount + 1 })}
            </span>
          </button>
        </div>
      </main>

      {/* === Modal Dividi === */}
      {showDividiModal && dividiTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center">
                  <Split className="w-[18px] h-[18px] text-amber-400" />
                </div>
                <h3 className="text-base font-semibold text-white">{t("ddtScomposizione.modal_title")}</h3>
              </div>
              <button onClick={() => setShowDividiModal(false)} type="button" className="text-slate-500 hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-white font-medium mb-1">{dividiTarget.prodotto_nome}</p>
            <p className="text-[11px] text-slate-500 mb-4">{t("ddtScomposizione.modal_qty_totale", { qty: dividiTarget.quantita })}</p>

            <div className="space-y-4">
              {/* Info box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-md px-4 py-3 space-y-1 text-[13px]">
                <p className="text-blue-300">{t("ddtScomposizione.modal_capacita_box")} <span className="font-semibold">{dividiTarget.capacitaBox}</span> {t("ddtScomposizione.modal_capacita_unit")}</p>
                <p className="text-blue-300">{t("ddtScomposizione.modal_box_completi")} <span className="font-semibold">{dividiTarget.boxCompleti}</span> ({dividiTarget.boxCompleti * dividiTarget.capacitaBox} {t("ddtScomposizione.modal_eccedenza_pz")})</p>
                {dividiTarget.eccedenza > 0 && (
                  <p className="text-amber-300">{t("ddtScomposizione.modal_eccedenza")} <span className="font-semibold">{dividiTarget.eccedenza}</span> {t("ddtScomposizione.modal_eccedenza_pz")}</p>
                )}
              </div>

              {/* Quick split buttons */}
              {dividiTarget.boxCompleti > 1 && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-md px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("ddtScomposizione.modal_quick_split")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...Array(dividiTarget.boxCompleti + 1)].map((_, i) => {
                      const boxDdt1 = i;
                      const boxDdt2 = dividiTarget.boxCompleti - i;
                      const qtyDdt1 = boxDdt1 * dividiTarget.capacitaBox;
                      return (
                        <button key={i} type="button" onClick={() => { setDividiQty1(qtyDdt1); setDividiQty2(boxDdt2 * dividiTarget.capacitaBox + dividiTarget.eccedenza); }}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all border ${dividiQty1 === qtyDdt1 ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-slate-700/60 border-slate-600 text-slate-400 hover:text-slate-200"}`}>
                          {boxDdt1}+{boxDdt2}
                        </button>
                      );
                    })}
                  </div>
                  {dividiTarget.eccedenza > 0 && (
                    <p className="text-[11px] text-amber-400 mt-2">{t("ddtScomposizione.modal_eccedenza_note", { n: dividiTarget.eccedenza })}</p>
                  )}
                </div>
              )}

              {/* Qty inputs */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">{t("ddtScomposizione.modal_lbl_qty_origine", { num: dividiTarget.ddt_numero })}</label>
                <input type="number" min="0" max={dividiTarget.quantita} value={dividiQty1} onChange={(e) => { const v = parseInt(e.target.value) || 0; setDividiQty1(v); setDividiQty2(dividiTarget.quantita - v); }} className={inputCls} />
                <p className="text-[11px] text-slate-500 mt-1">
                  {t("ddtScomposizione.modal_box_calc", { n: Math.floor(dividiQty1 / dividiTarget.capacitaBox) })}
                  {dividiQty1 % dividiTarget.capacitaBox > 0 && <span className="text-amber-400">{t("ddtScomposizione.modal_box_calc_extra", { n: dividiQty1 % dividiTarget.capacitaBox })}</span>}
                </p>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">{t("ddtScomposizione.modal_lbl_qty_dest")}</label>
                <input type="number" min="0" max={dividiTarget.quantita} value={dividiQty2} onChange={(e) => { const v = parseInt(e.target.value) || 0; setDividiQty2(v); setDividiQty1(dividiTarget.quantita - v); }} className={inputCls} />
                <p className="text-[11px] text-slate-500 mt-1">
                  {t("ddtScomposizione.modal_box_calc", { n: Math.floor(dividiQty2 / dividiTarget.capacitaBox) })}
                  {dividiQty2 % dividiTarget.capacitaBox > 0 && <span className="text-amber-400">{t("ddtScomposizione.modal_box_calc_extra", { n: dividiQty2 % dividiTarget.capacitaBox })}</span>}
                </p>
              </div>

              {/* Verifica */}
              <div className={`text-sm px-4 py-2.5 rounded-md border ${dividiQty1 + dividiQty2 === dividiTarget.quantita ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                {t("ddtScomposizione.modal_somma", { a: dividiQty1, b: dividiQty2, tot: dividiQty1 + dividiQty2, target: dividiTarget.quantita })}
                {dividiQty1 + dividiQty2 === dividiTarget.quantita && t("ddtScomposizione.modal_somma_ok")}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDividiModal(false)} type="button" className="flex-1 px-4 py-2.5 rounded-md bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-sm font-medium transition-colors">
                {t("ddtScomposizione.modal_btn_annulla")}
              </button>
              <button onClick={confermaDivisione} disabled={dividiQty1 + dividiQty2 !== dividiTarget.quantita || saving} type="button" className="flex-1 px-4 py-2.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? t("ddtScomposizione.modal_btn_saving") : t("ddtScomposizione.modal_btn_conferma")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>{t("ddtScomposizione.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DDTScomposizione;
