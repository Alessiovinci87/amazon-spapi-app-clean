import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SpedizioneCard from "../components/spedizioni/SpedizioneCard";
import ExportCSVButton from "../components/ui/ExportCSVButton";
import { cleanText } from "../utils/gestioneSpedizioni";
import { fetchJSON } from "../utils/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Truck,
  FileText,
  Package,
  CheckCircle,
  BarChart3,
  Clock,
  Search,
  X,
  LogOut,
} from "lucide-react";

function SectionCard({ accent = "emerald", icon: Icon, eyebrow, title, badge, children }) {
  const bar = { emerald: "bg-emerald-400/60", cyan: "bg-cyan-400/60", violet: "bg-violet-400/60" };
  const iBg = { emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400", cyan: "bg-cyan-500/10 border-cyan-500/40 text-cyan-400", violet: "bg-violet-500/10 border-violet-500/40 text-violet-400" };
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

function StatTile({ icon: Icon, label, value, accent = "emerald" }) {
  const m = { emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400", amber: "bg-amber-500/10 border-amber-500/40 text-amber-400", blue: "bg-blue-500/10 border-blue-500/40 text-blue-400", cyan: "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${m[accent]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{label}</div>
    </div>
  );
}

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60 transition-colors";

const GestioneSpedizioniMagazzino = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const STATI = [
    { key: "TUTTI", label: t("gestioneSpedizioniMagazzino.stato_tutti") },
    { key: "BOZZA", label: t("gestioneSpedizioniMagazzino.stato_bozza") },
    { key: "CONFERMATA", label: t("gestioneSpedizioniMagazzino.stato_confermata") },
    { key: "SPEDITA", label: t("gestioneSpedizioniMagazzino.stato_spedita") },
  ];
  const [spedizioni, setSpedizioni] = useState([]);
  const [filterSearchTerm, setFilterSearchTerm] = useState("");
  const [filterStato, setFilterStato] = useState("TUTTI");

  useEffect(() => {
    // fetchJSON inietta il JWT e lancia se !ok. Se la response non è un
    // array (errore, shape inaspettata) tengo lo stato a [] per evitare
    // il crash su .filter() piu' in basso.
    fetchJSON("spedizioni")
      .then((data) => setSpedizioni(Array.isArray(data) ? data : []))
      .catch(() => setSpedizioni([]));
  }, []);

  const aggiornaSpedizione = async (id, dati) => {
    try {
      const aggiornata = await fetchJSON(`spedizioni/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dati),
      });
      setSpedizioni((p) => p.map((s) => (s.id === id ? aggiornata : s)));
    } catch { toast.error("Errore aggiornamento spedizione"); }
  };

  const confermaSpedizione = async (id) => {
    try {
      const aggiornata = await fetchJSON(`spedizioni/${id}/conferma`, { method: "PATCH" });
      setSpedizioni((p) => p.map((s) => (s.id === id ? aggiornata : s)));
    } catch { toast.error("Errore conferma spedizione"); }
  };

  const eliminaSpedizione = async (id) => {
    try {
      await fetchJSON(`spedizioni/${id}`, { method: "DELETE" });
      setSpedizioni((p) => p.filter((s) => s.id !== id));
    } catch { toast.error("Errore eliminazione spedizione"); }
  };

  const handleExportCSV = (spedizione) => {
    const oggi = new Date();
    const dataStr = `${String(oggi.getDate()).padStart(2, "0")}-${String(oggi.getMonth() + 1).padStart(2, "0")}-${oggi.getFullYear()}`;
    const meta = `Paese: ${spedizione.paese};Data: ${spedizione.data || dataStr};Progressivo: ${spedizione.progressivo}\n\n`;
    const header = "ASIN;Prodotto;Quantità\n";
    const rows = spedizione.righe.map((r) => `${r.asin};"${r.prodotto_nome}";${r.quantita}`).join("\n");
    const blob = new Blob([meta + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `spedizione_${spedizione.progressivo}_${dataStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const spedizioniFiltrate = spedizioni.filter((s) => {
    if (filterStato !== "TUTTI" && s.stato !== filterStato) return false;
    if (filterSearchTerm.trim()) {
      const term = filterSearchTerm.toLowerCase();
      const hay = [(s.paese || ""), (s.progressivo || "").toString(), (s.operatore || ""), ...(s.righe || []).map((r) => r.prodotto_nome || "")].join(" ").toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

  const nBozze = spedizioni.filter((s) => s.stato === "BOZZA").length;
  const nConfermate = spedizioni.filter((s) => s.stato === "CONFERMATA").length;
  const nSpedite = spedizioni.filter((s) => s.stato === "SPEDITA").length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/magazzino")} type="button" title={t("gestioneSpedizioniMagazzino.title_indietro")} className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
              <Truck className="w-[18px] h-[18px] text-emerald-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">{t("gestioneSpedizioniMagazzino.topbar_title")}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{t("gestioneSpedizioniMagazzino.topbar_eyebrow")}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <button onClick={() => navigate("/uffici/spedizioni/storico")} type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 hover:border-violet-400/60 text-violet-300 hover:text-violet-200 text-xs font-medium transition-all">
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("gestioneSpedizioniMagazzino.btn_storico")}</span>
            </button>
            <button onClick={() => navigate("/magazzino")} type="button" className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> {t("gestioneSpedizioniMagazzino.btn_magazzino")}
            </button>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("gestioneSpedizioniMagazzino.page_eyebrow")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("gestioneSpedizioniMagazzino.hero_title_main")} <span className="text-slate-500">{t("gestioneSpedizioniMagazzino.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("gestioneSpedizioniMagazzino.intro")}
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile icon={BarChart3} label={t("gestioneSpedizioniMagazzino.stat_totali")} value={spedizioni.length} accent="blue" />
          <StatTile icon={Clock} label={t("gestioneSpedizioniMagazzino.stat_da_preparare")} value={nBozze} accent="amber" />
          <StatTile icon={Package} label={t("gestioneSpedizioniMagazzino.stat_pronte")} value={nConfermate} accent="cyan" />
          <StatTile icon={CheckCircle} label={t("gestioneSpedizioniMagazzino.stat_spedite")} value={nSpedite} accent="emerald" />
        </div>

        {/* Filtri */}
        <SectionCard accent="cyan" icon={Search} eyebrow={t("gestioneSpedizioniMagazzino.section_filtri_eyebrow")} title={t("gestioneSpedizioniMagazzino.section_filtri_title")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input type="text" placeholder={t("gestioneSpedizioniMagazzino.ph_cerca")} value={filterSearchTerm} onChange={(e) => setFilterSearchTerm(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              {filterSearchTerm && (
                <button onClick={() => setFilterSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select value={filterStato} onChange={(e) => setFilterStato(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
              {STATI.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {(filterSearchTerm || filterStato !== "TUTTI") && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] text-emerald-400">
                {t("gestioneSpedizioniMagazzino.stato_trovate_pre", "Trovate")} <span className="font-semibold">{spedizioniFiltrate.length}</span> {t("gestioneSpedizioniMagazzino.stato_trovate_post", "spedizioni")}
              </p>
              <button onClick={() => { setFilterSearchTerm(""); setFilterStato("TUTTI"); }} type="button" className="text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 font-medium transition-colors">
                {t("gestioneSpedizioniMagazzino.btn_reset_filtri")}
              </button>
            </div>
          )}
        </SectionCard>

        {/* Lista spedizioni */}
        <SectionCard
          accent="emerald"
          icon={Truck}
          eyebrow={t("gestioneSpedizioniMagazzino.section_attive_eyebrow")}
          title={t("gestioneSpedizioniMagazzino.section_gestire_title")}
          badge={
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium tabular-nums">
              {spedizioniFiltrate.length}
            </span>
          }
        >
          {spedizioniFiltrate.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">{t("gestioneSpedizioniMagazzino.empty_title")}</p>
              <p className="text-xs text-slate-600 mt-1">{t("gestioneSpedizioniMagazzino.empty_desc")}</p>
            </div>
          ) : (
            <SpedizioneCard
              spedizioni={spedizioniFiltrate}
              onDelete={eliminaSpedizione}
              onConferma={confermaSpedizione}
              onExport={handleExportCSV}
              onUpdate={aggiornaSpedizione}
            />
          )}
        </SectionCard>

        {/* Export CSV */}
        {spedizioni.length > 0 && (
          <SectionCard accent="violet" icon={FileText} eyebrow={t("gestioneSpedizioniMagazzino.section_esporta_eyebrow")} title={t("gestioneSpedizioniMagazzino.section_export_title")}>
            <ExportCSVButton spedizioni={spedizioni} cleanText={cleanText} />
          </SectionCard>
        )}
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>{t("gestioneSpedizioniMagazzino.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default GestioneSpedizioniMagazzino;
