import React, { useState } from "react";
import {
  sommaPerTipo,
  calcolaCostoTotale,
  calcolaMargine,
  calcolaMargineMultiplo,
  calcolaPubblicitaMax,
  calcolaPercentualeCosto,
  calcolaUtileEffettivo,
  calcolaPrezzoMinimo,
  sommaTotFattura
} from '../utils/formuleCalcoli';
import PageTopBar from "../components/PageTopBar";
import {
  DollarSign,
  TrendingUp,
  FileText,
  RotateCcw,
  Calculator,
  Package,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

/* ── Dati iniziali fornitori ─────────────────────────────── */

const initialFornitoriRows = [
  { tipo: "a", fornitore: "Materia Prima Completa", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "Materia Prima Sfusa", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "confezione (boccetta/vaso)", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "confezionamento", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "confezione secondaria (scatola)", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "Etichette prodotto", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "Etichette", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "b", fornitore: "Commissioni Amazon no iva", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "Etichetta + bustina amazon codebar", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "Spedizione ad Amazon", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "Spedizione Pics", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "packagin spedizione box o busta", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "imballo e cancelleria", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "eventuale costo stoccaggio", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
];

/* ── Stili input ─────────────────────────────────────────── */

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-colors tabular-nums";
const inputReadOnly = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white tabular-nums cursor-not-allowed";
const tableInputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-colors";

/* ── InputField ──────────────────────────────────────────── */

function InputField({ label, value, onChange, readOnly, highlight, icon: Icon }) {
  let cls = readOnly ? inputReadOnly : inputCls;
  if (highlight === "orange") cls += " !border-orange-500 ring-2 ring-orange-500/20";
  if (highlight === "green") cls += " !border-emerald-500 ring-2 ring-emerald-500/20";

  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      <input
        type="number"
        className={cls}
        value={typeof value === "number" ? value.toFixed(2) : value}
        onChange={onChange}
        readOnly={readOnly}
      />
    </div>
  );
}

/* ── Componente principale ───────────────────────────────── */

const FbaGestioneProdotti = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rows, setRows] = useState(initialFornitoriRows);

  const [costoProdotto, setCostoProdotto] = useState({
    prodotto: "",
    prezzoVenditaIvato: 0,
    ivaProdotto: 22,
    costoPubblicitarioEffettivo: 0,
    altreSpese: 0,
  });

  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    setResetting(true);
    setCostoProdotto({ prodotto: "", prezzoVenditaIvato: 0, ivaProdotto: 22, costoPubblicitarioEffettivo: 0, altreSpese: 0 });
    setRows(initialFornitoriRows.map((r) => ({ ...r, codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" })));
    setTimeout(() => setResetting(false), 100);
  };

  // Valori calcolati dalle righe fornitori + input manuali
  const costoBase = sommaPerTipo(rows, "a", "imponibile");
  const commissioni = sommaPerTipo(rows, "b", "imponibile");
  const speseSpedizione = sommaPerTipo(rows, "c", "imponibile");

  const costoTotale = calcolaCostoTotale(costoBase, commissioni, speseSpedizione);
  const margineNoIva = calcolaMargine(costoProdotto.prezzoVenditaIvato, costoProdotto.ivaProdotto, costoTotale);
  const prezzoMinimoPubblico = calcolaPrezzoMinimo(costoTotale, costoProdotto.ivaProdotto);
  const percentualeUtile = calcolaPercentualeCosto(margineNoIva, costoTotale);
  const utileEffettivo = calcolaUtileEffettivo(margineNoIva, costoProdotto.costoPubblicitarioEffettivo);

  const margineX2 = calcolaMargineMultiplo(costoBase, 2);
  const margineX3 = calcolaMargineMultiplo(costoBase, 3);
  const margineX4 = calcolaMargineMultiplo(costoBase, 4);
  const pubblicitaMaxX2 = calcolaPubblicitaMax(margineNoIva, costoBase, 2);
  const pubblicitaMaxX3 = calcolaPubblicitaMax(margineNoIva, costoBase, 3);
  const pubblicitaMaxX4 = calcolaPubblicitaMax(margineNoIva, costoBase, 4);

  const handleInputChange = (field, value) => {
    setCostoProdotto((prev) => ({ ...prev, [field]: value }));
  };

  const handleFornitoriChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    newRows[index].totFattura = sommaTotFattura(newRows[index]);
    setRows(newRows);
  };

  // Colorazione righe tabella per tipo
  const rowBg = { a: "bg-emerald-500/5 hover:bg-emerald-500/10", b: "bg-rose-500/5 hover:bg-rose-500/10", c: "bg-blue-500/5 hover:bg-blue-500/10" };
  const badgeCls = { a: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", b: "bg-rose-500/10 border-rose-500/30 text-rose-400", c: "bg-blue-500/10 border-blue-500/30 text-blue-400" };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <PageTopBar
        icon={Calculator}
        iconAccent="rose"
        eyebrow={t("fbaGestioneProdotti.topbar_eyebrow")}
        title={t("fbaGestioneProdotti.topbar_title")}
        backTo="/dashboard"
        actions={
          <button onClick={handleReset} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-[12px] font-medium transition-all">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("fbaGestioneProdotti.btn_reset")}</span>
          </button>
        }
      />

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("fbaGestioneProdotti.page_eyebrow")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("fbaGestioneProdotti.hero_title_main")} <span className="text-slate-500">{t("fbaGestioneProdotti.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("fbaGestioneProdotti.intro")}
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* ========== RIEPILOGO KPI ========== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { label: t("fbaGestioneProdotti.kpi_prezzo_ivato"), value: costoProdotto.prezzoVenditaIvato, prefix: "€", color: "blue" },
            { label: t("fbaGestioneProdotti.kpi_margine_no_iva"), value: margineNoIva, prefix: "€", color: "orange" },
            { label: t("fbaGestioneProdotti.kpi_costo_pubbl"), value: costoProdotto.costoPubblicitarioEffettivo, prefix: "€", color: "rose" },
            { label: t("fbaGestioneProdotti.kpi_utile_perc"), value: percentualeUtile, suffix: "%", color: "amber" },
            { label: t("fbaGestioneProdotti.kpi_utile"), value: utileEffettivo, prefix: "€", color: "emerald" },
          ].map((kpi) => {
            const colorMap = {
              blue: "border-blue-500/40 bg-blue-500/5",
              orange: "border-orange-500/40 bg-orange-500/5",
              rose: "border-rose-500/40 bg-rose-500/5",
              amber: "border-amber-500/40 bg-amber-500/5",
              emerald: "border-emerald-500/40 bg-emerald-500/5",
            };
            const textMap = {
              blue: "text-blue-400",
              orange: "text-orange-400",
              rose: "text-rose-400",
              amber: "text-amber-400",
              emerald: "text-emerald-400",
            };
            return (
              <div key={kpi.label} className={`relative rounded-lg border ${colorMap[kpi.color]} px-4 py-4 sm:py-5 flex flex-col items-center justify-center text-center`}>
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-2 leading-tight">{kpi.label}</span>
                <span className={`text-xl sm:text-2xl font-bold tabular-nums ${textMap[kpi.color]}`}>
                  {kpi.prefix && <span className="text-sm font-medium mr-0.5">{kpi.prefix}</span>}
                  {typeof kpi.value === "number" ? kpi.value.toFixed(2) : kpi.value}
                  {kpi.suffix && <span className="text-sm font-medium ml-0.5">{kpi.suffix}</span>}
                </span>
              </div>
            );
          })}
        </div>

        {/* ========== COSTO PRODOTTO ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Colonna sinistra — Costo Prodotto */}
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
            <div className="px-5 sm:px-6 py-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-md border bg-blue-500/10 border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">{t("fbaGestioneProdotti.section_calcolo_eyebrow")}</div>
                  <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">{t("fbaGestioneProdotti.section_costo_title")}</h2>
                </div>
              </div>

              {/* Nome prodotto */}
              <div className="mb-4">
                <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Package className="w-3 h-3" /> {t("fbaGestioneProdotti.lbl_nome_prodotto")}
                </label>
                <input
                  type="text"
                  className={inputCls}
                  value={costoProdotto.prodotto}
                  onChange={(e) => handleInputChange("prodotto", e.target.value)}
                  placeholder={t("fbaGestioneProdotti.ph_nome_prodotto")}
                />
              </div>

              {/* Input modificabili — questi determinano i KPI in alto */}
              <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-400/70 mb-2">{t("fbaGestioneProdotti.lbl_input_modificabili", "Valori modificabili")}</div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <InputField label={t("fbaGestioneProdotti.lbl_prezzo_ivato")} value={costoProdotto.prezzoVenditaIvato} onChange={(e) => handleInputChange("prezzoVenditaIvato", parseFloat(e.target.value) || 0)} />
                <InputField label={t("fbaGestioneProdotti.lbl_costo_pubbl")} value={costoProdotto.costoPubblicitarioEffettivo} onChange={(e) => handleInputChange("costoPubblicitarioEffettivo", parseFloat(e.target.value) || 0)} />
                <InputField label={t("fbaGestioneProdotti.lbl_altre_spese")} value={costoProdotto.altreSpese} onChange={(e) => handleInputChange("altreSpese", parseFloat(e.target.value) || 0)} icon={DollarSign} />
                <InputField label={t("fbaGestioneProdotti.lbl_iva_prodotto")} value={costoProdotto.ivaProdotto} onChange={(e) => handleInputChange("ivaProdotto", parseFloat(e.target.value) || 0)} />
              </div>

              {/* Valori di supporto (calcolati) */}
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("fbaGestioneProdotti.lbl_valori_calcolati", "Valori calcolati (dettaglio)")}</div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label={t("fbaGestioneProdotti.lbl_prodotto_a")} value={costoBase} readOnly icon={DollarSign} />
                <InputField label={t("fbaGestioneProdotti.lbl_commissioni")} value={commissioni} readOnly />
                <InputField label={t("fbaGestioneProdotti.lbl_spese_spedizione")} value={speseSpedizione} readOnly />
                <InputField label={t("fbaGestioneProdotti.lbl_costo_totale")} value={costoTotale} readOnly />
                <InputField label={t("fbaGestioneProdotti.lbl_prezzo_minimo")} value={prezzoMinimoPubblico} readOnly />
              </div>
              <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
                {t("fbaGestioneProdotti.nota_kpi_in_alto", "Prezzo IVATO · Margine no IVA · Costo pubbl · % utile · Utile effettivo sono evidenziati nelle card in alto.")}
              </p>
            </div>
          </div>

          {/* Colonna destra — Margini e Pubblicita */}
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />
            <div className="px-5 sm:px-6 py-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-md border bg-amber-500/10 border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">{t("fbaGestioneProdotti.section_analisi_eyebrow")}</div>
                  <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">{t("fbaGestioneProdotti.section_margini_title")}</h2>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div />
                <div className="text-center text-[11px] font-semibold text-amber-400 uppercase tracking-wider">2X</div>
                <div className="text-center text-[11px] font-semibold text-amber-400 uppercase tracking-wider">3X</div>
                <div className="text-center text-[11px] font-semibold text-amber-400 uppercase tracking-wider">4X</div>

                <div className="text-[11px] font-semibold text-white uppercase tracking-wider flex items-center">{t("fbaGestioneProdotti.row_margine")}</div>
                <div className="px-3 py-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-white text-center text-sm font-semibold tabular-nums">{margineX2.toFixed(2)}</div>
                <div className="px-3 py-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-white text-center text-sm font-semibold tabular-nums">{margineX3.toFixed(2)}</div>
                <div className="px-3 py-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-white text-center text-sm font-semibold tabular-nums">{margineX4.toFixed(2)}</div>

                <div className="text-[11px] font-semibold text-white uppercase tracking-wider flex items-center">{t("fbaGestioneProdotti.row_pubbl_max")}</div>
                <div className={`px-3 py-2.5 rounded-md border text-center text-sm font-semibold tabular-nums ${pubblicitaMaxX2 >= 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                  {pubblicitaMaxX2.toFixed(2)}
                </div>
                <div className={`px-3 py-2.5 rounded-md border text-center text-sm font-semibold tabular-nums ${pubblicitaMaxX3 >= 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                  {pubblicitaMaxX3.toFixed(2)}
                </div>
                <div className={`px-3 py-2.5 rounded-md border text-center text-sm font-semibold tabular-nums ${pubblicitaMaxX4 >= 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                  {pubblicitaMaxX4.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== GESTIONE FORNITORI ========== */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-emerald-500/10 border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">{t("fbaGestioneProdotti.section_fornitori_eyebrow")}</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">{t("fbaGestioneProdotti.section_fornitori_title")}</h2>
              </div>
            </div>

            <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">{t("fbaGestioneProdotti.th_tipo")}</th>
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">{t("fbaGestioneProdotti.th_fornitore")}</th>
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">{t("fbaGestioneProdotti.th_codice")}</th>
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">{t("fbaGestioneProdotti.th_data")}</th>
                    <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">{t("fbaGestioneProdotti.th_imponibile")}</th>
                    <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">{t("fbaGestioneProdotti.th_iva_pagata")}</th>
                    <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">{t("fbaGestioneProdotti.th_tot_fattura")}</th>
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium">{t("fbaGestioneProdotti.th_note")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rows.map((row, i) => (
                    <tr key={i} className={`transition-colors ${rowBg[row.tipo] || ""}`}>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${badgeCls[row.tipo] || "bg-slate-500/10 border-slate-500/30 text-slate-400"}`}>
                          {row.tipo.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-white font-medium text-xs whitespace-nowrap">{row.fornitore}</td>
                      <td className="px-3 py-2.5">
                        <input type="text" value={row.codice} onChange={(e) => handleFornitoriChange(i, "codice", e.target.value)} className={tableInputCls} />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="date" value={row.data} onChange={(e) => handleFornitoriChange(i, "data", e.target.value)} className={tableInputCls} />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" value={row.imponibile} onChange={(e) => handleFornitoriChange(i, "imponibile", e.target.value)} className={`${tableInputCls} text-right`} />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" value={row.ivaPagata} onChange={(e) => handleFornitoriChange(i, "ivaPagata", e.target.value)} className={`${tableInputCls} text-right`} />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" value={row.totFattura} readOnly className={`${tableInputCls} text-right cursor-not-allowed`} />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="text" value={row.note} onChange={(e) => handleFornitoriChange(i, "note", e.target.value)} className={tableInputCls} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} {t("fbaGestioneProdotti.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default FbaGestioneProdotti;
