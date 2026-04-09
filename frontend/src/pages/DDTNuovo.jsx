import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const [brand, setBrand] = useState("");
  const [numeroDDT, setNumeroDDT] = useState("");
  const [numeroAmazon, setNumeroAmazon] = useState("");
  const [data, setData] = useState("");
  const [paese, setPaese] = useState("");
  const [centro, setCentro] = useState("");
  const [trasportatore, setTrasportatore] = useState("");
  const [trasportatoreCustom, setTrasportatoreCustom] = useState("");
  const [tracking, setTracking] = useState("");

  const [righe, setRighe] = useState([
    { asin: "", sku: "", prodottoNome: "", quantita: "", cartone: "", pacco: "" },
  ]);

  const aggiungiRiga = () => {
    setRighe([...righe, { asin: "", sku: "", prodottoNome: "", quantita: 0, cartone: 0, pacco: 0 }]);
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
      toast.error("Errore nella generazione del PDF");
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
            <button onClick={() => navigate("/uffici/ddt")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
              <FileText className="w-[18px] h-[18px] text-emerald-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Nuovo DDT Generico</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Nexus · Documenti di Trasporto</span>
            </div>
          </div>
          <button onClick={() => navigate("/uffici/ddt")} type="button" className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> DDT
          </button>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">DDT Personalizzato</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Crea un documento di trasporto <span className="text-slate-500">— generico.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Compila i dati del documento, seleziona brand e trasportatore, aggiungi i prodotti e genera il PDF.
          </p>
        </div>
      </section>

      {/* === Form === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Brand */}
          <SectionCard accent="emerald" icon={Building2} eyebrow="Step 1" title="Seleziona Brand">
            <select className={`${inputCls} appearance-none cursor-pointer`} value={brand} onChange={(e) => setBrand(e.target.value)} required>
              <option value="">-- Seleziona Brand --</option>
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
          <SectionCard accent="blue" icon={FileText} eyebrow="Step 2" title="Informazioni Documento">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><Hash className="w-3 h-3" /> Numero DDT <span className="text-rose-400">*</span></label>
                <input type="text" placeholder="es. DDT-2025-001" className={inputCls} value={numeroDDT} onChange={(e) => setNumeroDDT(e.target.value)} required />
              </div>
              <div>
                <label className={labelCls}><Hash className="w-3 h-3" /> Rif. Amazon</label>
                <input type="text" placeholder="Riferimento Amazon (opzionale)" className={inputCls} value={numeroAmazon} onChange={(e) => setNumeroAmazon(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}><Calendar className="w-3 h-3" /> Data <span className="text-rose-400">*</span></label>
                <input type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} onFocus={(e) => e.target.showPicker && e.target.showPicker()} required />
              </div>
              <div>
                <label className={labelCls}><MapPin className="w-3 h-3" /> Paese <span className="text-rose-400">*</span></label>
                <select className={`${inputCls} appearance-none cursor-pointer`} value={paese} onChange={(e) => { setPaese(e.target.value); setCentro(""); }} required>
                  <option value="">-- Seleziona --</option>
                  {paesiOrdinati.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className={labelCls}><Building2 className="w-3 h-3" /> Centro Logistico <span className="text-rose-400">*</span></label>
              <textarea className={inputCls} value={centro} onChange={(e) => setCentro(e.target.value)} placeholder="Indirizzo completo del centro logistico..." rows={3} required />
            </div>
          </SectionCard>

          {/* Trasporto */}
          <SectionCard accent="violet" icon={Truck} eyebrow="Step 3" title="Informazioni Trasporto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Corriere <span className="text-rose-400">*</span></label>
                <select className={`${inputCls} appearance-none cursor-pointer`} value={trasportatore} onChange={(e) => { setTrasportatore(e.target.value); if (e.target.value !== "ALTRO") setTrasportatoreCustom(""); }} required>
                  <option value="">-- Seleziona --</option>
                  {corrieriPredefiniti.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="ALTRO">Altro...</option>
                </select>
              </div>
              {trasportatore === "ALTRO" && (
                <div>
                  <label className={labelCls}>Nome Trasportatore</label>
                  <input type="text" placeholder="Inserisci nome" className={inputCls} value={trasportatoreCustom} onChange={(e) => setTrasportatoreCustom(e.target.value)} />
                </div>
              )}
              <div>
                <label className={labelCls}>Numero Tracking</label>
                <input type="text" placeholder="Codice tracking (opzionale)" className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} />
              </div>
            </div>
          </SectionCard>

          {/* Prodotti */}
          <SectionCard
            accent="amber"
            icon={Package}
            eyebrow="Step 4"
            title="Prodotti"
            badge={
              <button type="button" onClick={aggiungiRiga} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all">
                <Plus className="w-3.5 h-3.5" /> Aggiungi
              </button>
            }
          >
            <div className="space-y-3">
              {righe.map((r, i) => (
                <div key={i} className="relative bg-slate-800/40 border border-slate-700/60 rounded-md p-4">
                  {righe.length > 1 && (
                    <button type="button" onClick={() => rimuoviRiga(i)} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Rimuovi">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 pr-8">
                    <input type="text" placeholder="ASIN" className={rowInputCls} value={r.asin} onChange={(e) => aggiornaRiga(i, "asin", e.target.value)} />
                    <input type="text" placeholder="SKU" className={rowInputCls} value={r.sku} onChange={(e) => aggiornaRiga(i, "sku", e.target.value)} />
                    <input type="text" placeholder="Nome prodotto" className={`lg:col-span-2 ${rowInputCls}`} value={r.prodottoNome} onChange={(e) => aggiornaRiga(i, "prodottoNome", e.target.value)} />
                    <input type="number" min="0" placeholder="Qty" className={rowInputCls} value={r.quantita} onChange={(e) => aggiornaRiga(i, "quantita", Number(e.target.value))} />
                    <input type="number" min="0" placeholder="Cartone" className={rowInputCls} value={r.cartone} onChange={(e) => aggiornaRiga(i, "cartone", Number(e.target.value))} />
                  </div>
                  <div className="mt-3">
                    <input type="text" placeholder="N. Pacco (lettere e numeri)" className={`w-full ${rowInputCls}`} value={r.pacco} onChange={(e) => aggiornaRiga(i, "pacco", e.target.value)} />
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
            Genera PDF DDT
          </button>
        </form>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>Nexus · DDT Generico</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DDTNuovo;
