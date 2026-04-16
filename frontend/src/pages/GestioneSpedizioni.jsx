import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SpedizioneCard from "../components/spedizioni/SpedizioneCard";
import ExportCSVButton from "../components/ui/ExportCSVButton";
import { PAESI, cleanText } from "../utils/gestioneSpedizioni";
import { fetchJSON } from "../utils/api";
import {
  ArrowLeft,
  Truck,
  Plus,
  Save,
  FileText,
  Calendar,
  User,
  MapPin,
  Package,
  AlertCircle,
  CheckCircle,
  ClipboardList,
  X,
  Search,
  ShoppingCart,
  BarChart3,
  LogOut,
} from "lucide-react";

/* ── Componenti Nexus locali ─────────────────────────────── */

// Bandierina paese via CDN pubblico flagcdn.com (accetta codice ISO)
const Flag = ({ code, className = "h-3.5 w-auto inline-block" }) => {
  const c = (code || "").toLowerCase();
  return <img src={`https://flagcdn.com/24x18/${c}.png`} alt={code} className={className} />;
};

function SectionCard({ accent = "blue", icon: Icon, eyebrow, title, badge, children }) {
  const bar = { blue: "bg-blue-400/60", emerald: "bg-emerald-400/60", amber: "bg-amber-400/60", violet: "bg-violet-400/60", rose: "bg-rose-400/60" };
  const iBg = { blue: "bg-blue-500/10 border-blue-500/40 text-blue-400", emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400", amber: "bg-amber-500/10 border-amber-500/40 text-amber-400", violet: "bg-violet-500/10 border-violet-500/40 text-violet-400", rose: "bg-rose-500/10 border-rose-500/40 text-rose-400" };
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

function StatTile({ icon: Icon, label, value, accent = "blue" }) {
  const m = { blue: "bg-blue-500/10 border-blue-500/40 text-blue-400", amber: "bg-amber-500/10 border-amber-500/40 text-amber-400", emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400", cyan: "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" };
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

const Flag = ({ code, className = "h-4 w-auto inline-block align-middle" }) => {
  const c = (code || "").toLowerCase();
  return <img src={`https://flagcdn.com/24x18/${c}.png`} alt={code} className={className} />;
};

/* ── Stili input condivisi ──────────────────────────────── */
const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-colors";
const labelCls = "text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5";

/* ── Componente principale ──────────────────────────────── */

const GestioneSpedizioni = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const isUffici = location.pathname.startsWith("/uffici");
  const [inventario, setInventario] = useState([]);
  const [spedizioni, setSpedizioni] = useState([]);

  const [spedizioneInfo, setSpedizioneInfo] = useState({
    paese: "IT",
    data: "",
    operatore: "",
    note: "",
  });

  const [righe, setRighe] = useState([]);
  const [prodottoSelezionato, setProdottoSelezionato] = useState(null);
  const [quantitaInput, setQuantitaInput] = useState("");
  const [filtro, setFiltro] = useState("");
  const [errore, setErrore] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [impegni, setImpegni] = useState({});

  useEffect(() => {
    fetchJSON("impegni")
      .then((d) => setImpegni(d && typeof d === "object" && !Array.isArray(d) ? d : {}))
      .catch(() => setImpegni({}));
  }, []);

  useEffect(() => {
    // fetchJSON estrae automaticamente .data se presente (utils/api.js)
    fetchJSON("magazzino")
      .then((d) => setInventario(Array.isArray(d) ? d : []))
      .catch(() => setInventario([]));
    fetchJSON("spedizioni")
      .then((d) => setSpedizioni(Array.isArray(d) ? d : []))
      .catch(() => setSpedizioni([]));
  }, []);

  const handleInfoChange = (campo, valore) => setSpedizioneInfo((p) => ({ ...p, [campo]: valore }));

  const selezionaProdotto = (prodotto) => {
    setProdottoSelezionato(prodotto);
    setQuantitaInput("");
    setErrore("");
  };

  const deselezionaProdotto = () => {
    setProdottoSelezionato(null);
    setQuantitaInput("");
  };

  const aggiungiRiga = () => {
    if (!prodottoSelezionato) { setErrore(t("gestioneSpedizioni.err_seleziona_prodotto")); return; }
    const quantita = parseInt(quantitaInput, 10);
    if (isNaN(quantita) || quantita <= 0) { setErrore(t("gestioneSpedizioni.err_quantita_valida")); return; }
    if (quantita > prodottoSelezionato.pronto) { setErrore(t("gestioneSpedizioni.err_quantita_superiore", { q: quantita, g: prodottoSelezionato.pronto })); return; }
    setRighe((p) => [...p, { asin: prodottoSelezionato.asin, prodotto_nome: prodottoSelezionato.nome, quantita }]);
    setProdottoSelezionato(null);
    setQuantitaInput("");
    setFiltro("");
    setErrore("");
  };

  const rimuoviRiga = (index) => setRighe((p) => p.filter((_, i) => i !== index));

  const salvaSpedizione = async () => {
    if (salvando) return;
    if (!spedizioneInfo.data || righe.length === 0) { setErrore(t("gestioneSpedizioni.err_data_prodotto")); return; }
    setSalvando(true);
    try {
      const bozza = spedizioni.find((s) => s.stato === "BOZZA" && s.paese === spedizioneInfo.paese);
      if (bozza) {
        const aggiornata = await fetchJSON(`spedizioni/${bozza.id}/righe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ righe }),
        });
        setSpedizioni((p) => p.map((s) => (s.id === bozza.id ? aggiornata : s)));
      } else {
        const nuova = await fetchJSON("spedizioni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...spedizioneInfo, righe }),
        });
        setSpedizioni((p) => [nuova, ...p]);
      }
      fetchJSON("magazzino")
        .then((d) => setInventario(Array.isArray(d) ? d : []))
        .catch(() => {});
      setRighe([]);
      setErrore("");
    } catch { setErrore(t("gestioneSpedizioni.err_salvataggio")); } finally { setSalvando(false); }
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

  const aggiornaSpedizione = async (id, dati) => {
    try {
      const aggiornata = await fetchJSON(`spedizioni/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dati),
      });
      setSpedizioni((p) => p.map((s) => (s.id === id ? aggiornata : s)));
    } catch (err) { console.error("Errore aggiornamento spedizione:", err); }
  };

  const confermaSpedizione = async (id) => {
    try {
      const aggiornata = await fetchJSON(`spedizioni/${id}/conferma`, { method: "PATCH" });
      setSpedizioni((p) => p.map((s) => (s.id === id ? aggiornata : s)));
    } catch (err) { console.error("Errore conferma spedizione:", err); }
  };

  const eliminaTutte = async () => {
    try { await fetchJSON("spedizioni", { method: "DELETE" }); setSpedizioni([]); } catch {}
  };

  const eliminaSpedizione = async (id) => {
    try {
      await fetchJSON(`spedizioni/${id}`, { method: "DELETE" });
      setSpedizioni((p) => p.filter((s) => s.id !== id));
    } catch {}
  };

  const filtroLower = (filtro || "").toLowerCase();
  const prodottiFiltrati = inventario.filter((p) => {
    const n = (p.nome || "").toLowerCase();
    const a = (p.asin || "").toLowerCase();
    const s = (p.sku || "").toLowerCase();
    return n.includes(filtroLower) || a.includes(filtroLower) || s.includes(filtroLower);
  });

  const nBozze = spedizioni.filter((s) => s.stato === "BOZZA").length;
  const nConfermate = spedizioni.filter((s) => s.stato === "CONFERMATA" || s.stato === "SPEDITA").length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(isUffici ? "/dashboard" : "/magazzino")} type="button" title={t("gestioneSpedizioni.title_indietro")} className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <Truck className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">{t("gestioneSpedizioni.topbar_title")}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{isUffici ? t("gestioneSpedizioni.topbar_eyebrow_uffici") : t("gestioneSpedizioni.topbar_eyebrow_magazzino")}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <button onClick={() => navigate("/uffici/spedizioni/storico")} type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 hover:border-violet-400/60 text-violet-300 hover:text-violet-200 text-xs font-medium transition-all">
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("gestioneSpedizioni.btn_storico")}</span>
            </button>
            <button onClick={() => navigate(isUffici ? "/dashboard" : "/magazzino")} type="button" className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              {isUffici ? t("gestioneSpedizioni.btn_dashboard") : t("gestioneSpedizioni.btn_magazzino")}
            </button>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("gestioneSpedizioni.page_eyebrow")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("gestioneSpedizioni.hero_title_main")} <span className="text-slate-500">{t("gestioneSpedizioni.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("gestioneSpedizioni.intro")}
          </p>
        </div>
      </section>

      {/* === Contenuto principale === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">

        {/* Errore */}
        {errore && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-5 py-3 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-300 flex-1">{errore}</p>
            <button onClick={() => setErrore("")} className="text-rose-400 hover:text-rose-200 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile icon={BarChart3} label={t("gestioneSpedizioni.stat_totali")} value={spedizioni.length} accent="blue" />
          <StatTile icon={FileText} label={t("gestioneSpedizioni.stat_bozze")} value={nBozze} accent="amber" />
          <StatTile icon={CheckCircle} label={t("gestioneSpedizioni.stat_confermate")} value={nConfermate} accent="emerald" />
          <StatTile icon={Package} label={t("gestioneSpedizioni.stat_prodotti")} value={inventario.length} accent="cyan" />
        </div>

        {/* Info spedizione */}
        <SectionCard accent="blue" icon={ClipboardList} eyebrow={t("gestioneSpedizioni.section_info_eyebrow")} title={t("gestioneSpedizioni.section_info_title")}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}><MapPin className="w-3 h-3" /> {t("gestioneSpedizioni.lbl_paese")}</label>
              <div className="relative">
                <select className={`${inputCls} pl-10 appearance-none cursor-pointer`} value={spedizioneInfo.paese} onChange={(e) => handleInfoChange("paese", e.target.value)}>
                  {PAESI.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Flag code={spedizioneInfo.paese} className="h-3.5 w-auto" />
                </span>
              </div>
            </div>
            <div>
              <label className={labelCls}><Calendar className="w-3 h-3" /> {t("gestioneSpedizioni.lbl_data")} <span className="text-rose-400">*</span></label>
              <input type="date" required className={inputCls} value={spedizioneInfo.data} onChange={(e) => handleInfoChange("data", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}><User className="w-3 h-3" /> {t("gestioneSpedizioni.lbl_operatore")}</label>
              <input type="text" placeholder={t("gestioneSpedizioni.ph_operatore")} className={inputCls} value={spedizioneInfo.operatore} onChange={(e) => handleInfoChange("operatore", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}><FileText className="w-3 h-3" /> {t("gestioneSpedizioni.lbl_note")}</label>
              <input type="text" placeholder={t("gestioneSpedizioni.ph_note")} className={inputCls} value={spedizioneInfo.note} onChange={(e) => handleInfoChange("note", e.target.value)} />
            </div>
          </div>
        </SectionCard>

        {/* Aggiungi prodotti */}
        <SectionCard accent="emerald" icon={Package} eyebrow={t("gestioneSpedizioni.section_prodotti_eyebrow")} title={t("gestioneSpedizioni.section_prodotti_title")}>

          {/* Prodotto selezionato → quantità + aggiungi */}
          {prodottoSelezionato ? (
            <div className="mb-5">
              <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-lg p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  {prodottoSelezionato.immagine_main ? (
                    <img src={prodottoSelezionato.immagine_main} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-md object-contain bg-white/5 border border-slate-700 flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                      <Package className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-semibold text-white leading-snug">{prodottoSelezionato.nome}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-1">{prodottoSelezionato.asin}</p>
                        {prodottoSelezionato.sku && <p className="text-[11px] text-slate-600 font-mono">SKU: {prodottoSelezionato.sku}</p>}
                      </div>
                      <button onClick={deselezionaProdotto} type="button" className="text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${prodottoSelezionato.pronto > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                        {t("gestioneSpedizioni.lbl_giacenza", { n: prodottoSelezionato.pronto })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex-1 max-w-[160px]">
                        <label className={labelCls}>{t("gestioneSpedizioni.lbl_quantita")}</label>
                        <input
                          type="number"
                          placeholder="0"
                          min="1"
                          max={prodottoSelezionato.pronto}
                          autoFocus
                          className={inputCls}
                          value={quantitaInput}
                          onChange={(e) => setQuantitaInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") aggiungiRiga(); }}
                        />
                      </div>
                      <div className="flex items-end pt-5">
                        <button onClick={aggiungiRiga} type="button" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-sm font-medium transition-all">
                          <Plus className="w-4 h-4" />
                          {t("gestioneSpedizioni.btn_aggiungi")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Barra di ricerca */}
          <div className="mb-4">
            <label className={labelCls}><Search className="w-3 h-3" /> {prodottoSelezionato ? t("gestioneSpedizioni.lbl_cambia_prodotto") : t("gestioneSpedizioni.lbl_cerca_prodotto")}</label>
            <div className="relative">
              <input type="text" placeholder={t("gestioneSpedizioni.ph_digita_cercare")} value={filtro} onChange={(e) => setFiltro(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              {filtro && (
                <button onClick={() => setFiltro("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Griglia risultati ricerca */}
          {filtro.length >= 2 ? (
            prodottiFiltrati.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">{t("gestioneSpedizioni.empty_no_prodotto", { term: filtro })}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {prodottiFiltrati.slice(0, 30).map((p) => {
                  const isSelected = prodottoSelezionato?.asin === p.asin;
                  return (
                    <button
                      key={p.asin || p.id}
                      type="button"
                      onClick={() => selezionaProdotto(p)}
                      className={`group text-left rounded-lg border p-3 transition-all ${
                        isSelected
                          ? "border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                          : "border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70"
                      }`}
                    >
                      {p.immagine_main ? (
                        <img src={p.immagine_main} alt="" className="w-full aspect-square rounded-md object-contain bg-white/5 mb-2" />
                      ) : (
                        <div className="w-full aspect-square rounded-md bg-slate-800 border border-slate-700/50 flex items-center justify-center mb-2">
                          <Package className="w-8 h-8 text-slate-700" />
                        </div>
                      )}
                      <p className="text-[12px] font-medium text-slate-200 leading-snug line-clamp-2 min-h-[2.4em]">{p.nome}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">{p.asin}</p>
                      <span className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${p.pronto > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                        {p.pronto} {t("gestioneSpedizioni.lbl_pezzi")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : filtro.length > 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">{t("gestioneSpedizioni.hint_min_caratteri")}</p>
          ) : !prodottoSelezionato ? (
            <p className="text-sm text-slate-600 text-center py-4">{t("gestioneSpedizioni.hint_inizia_digitare")}</p>
          ) : null}

          {/* Carrello */}
          {righe.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">{t("gestioneSpedizioni.lbl_carrello")}</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium tabular-nums">
                    {righe.length} {righe.length === 1 ? t("gestioneSpedizioni.lbl_prodotti_count_one") : t("gestioneSpedizioni.lbl_prodotti_count_other")}
                  </span>
                </div>
                <button onClick={() => setRighe([])} type="button" className="text-[11px] uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors font-medium flex items-center gap-1">
                  <X className="w-3 h-3" /> {t("gestioneSpedizioni.btn_svuota")}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {righe.map((r, i) => {
                  const img = inventario.find((p) => p.asin === r.asin)?.immagine_main;
                  return (
                    <div key={i} className="bg-slate-800/40 border border-slate-700/60 rounded-md px-4 py-3 flex items-center gap-3">
                      {img ? (
                        <img src={img} alt="" className="w-10 h-10 rounded object-contain bg-white/5 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{r.prodotto_nome}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{r.asin}</p>
                      </div>
                      <span className="text-lg font-semibold text-emerald-400 tabular-nums">{r.quantita}</span>
                      <button onClick={() => rimuoviRiga(i)} type="button" className="text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Totale */}
              <div className="mt-4 flex items-center justify-between bg-slate-800/40 border border-slate-700/60 rounded-md px-5 py-3">
                <span className="text-sm text-slate-400">{t("gestioneSpedizioni.lbl_totale_pezzi")}</span>
                <span className="text-2xl font-semibold text-emerald-400 tabular-nums">
                  {righe.reduce((s, r) => s + r.quantita, 0)}
                </span>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Pulsante salva */}
        <button
          onClick={salvaSpedizione}
          disabled={righe.length === 0 || !spedizioneInfo.data || salvando}
          type="button"
          className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-500/10 disabled:hover:border-blue-500/40 disabled:hover:text-blue-300"
        >
          <Save className="w-4 h-4" />
          {salvando
            ? t("gestioneSpedizioni.btn_salvataggio")
            : righe.length === 0
              ? t("gestioneSpedizioni.btn_aggiungi_per_salvare")
              : !spedizioneInfo.data
                ? t("gestioneSpedizioni.btn_data_per_salvare")
                : t("gestioneSpedizioni.btn_salva", { n: righe.length, label: righe.length === 1 ? t("gestioneSpedizioni.lbl_prodotti_count_one") : t("gestioneSpedizioni.lbl_prodotti_count_other") })}
        </button>

        {/* Lista spedizioni */}
        <SectionCard
          accent="blue"
          icon={Truck}
          eyebrow={t("gestioneSpedizioni.section_attive_eyebrow")}
          title={t("gestioneSpedizioni.section_create_title")}
          badge={
            <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-medium tabular-nums">
              {spedizioni.length}
            </span>
          }
        >
          <SpedizioneCard
            spedizioni={spedizioni}
            onDelete={eliminaSpedizione}
            onDeleteAll={eliminaTutte}
            onConferma={confermaSpedizione}
            onExport={handleExportCSV}
            onUpdate={aggiornaSpedizione}
          />
        </SectionCard>

        {/* Export CSV */}
        {spedizioni.length > 0 && (
          <SectionCard accent="violet" icon={FileText} eyebrow={t("gestioneSpedizioni.section_esporta_eyebrow")} title={t("gestioneSpedizioni.section_export_title")}>
            <ExportCSVButton spedizioni={spedizioni} cleanText={cleanText} />
          </SectionCard>
        )}
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>{t("gestioneSpedizioni.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default GestioneSpedizioni;
