import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search, RefreshCw, Bell, Package,
  TrendingUp, ChevronDown, ChevronUp,
  Settings, Image, Star, FileText, Globe,
  EyeOff, RotateCcw,
} from "lucide-react";
import AlertsPanel from "../components/europa/AlertsPanel";
import PageTopBar from "../components/PageTopBar";
import { toast } from "sonner";

const Flag = ({ code, className = "h-4 w-auto inline-block align-middle" }) => (
  <img src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`} alt={code} className={className} />
);

// Fallback tassi verso EUR se il fetch live fallisce (Frankfurter/ECB via /api/v2/europa/fx-rates)
const FALLBACK_TO_EUR = { EUR: 1, GBP: 1.17, PLN: 0.23, SEK: 0.087 };
const CURRENCY_SYMBOL = { EUR: '€', GBP: '£', PLN: 'zł', SEK: 'kr' };
function formatPrice(prezzo, currency, rates = FALLBACK_TO_EUR) {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const nativeStr = `${sym}${prezzo.toFixed(2)}`;
  if (currency === 'EUR') return { native: nativeStr, eur: null };
  const eur = (prezzo * (rates[currency] ?? FALLBACK_TO_EUR[currency] ?? 1)).toFixed(2);
  return { native: nativeStr, eur: `≈€${eur}` };
}

export default function EuropaDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const TABS = [
    { id: "catalogo", label: t("europaDashboard.tab_catalogo"), icon: Package },
    { id: "alert",    label: t("europaDashboard.tab_alert"),    icon: Bell },
  ];

  const [tab, setTab] = useState("catalogo");
  const [syncingImmagini, setSyncingImmagini] = useState(false);
  const [syncingLedger, setSyncingLedger] = useState(false);
  const [syncingPrezzi, setSyncingPrezzi] = useState(false);
  // Versione cache immagini per-card: aumentata dopo "Sync immagini" così le card espanse refetchano
  const [imagesVersion, setImagesVersion] = useState(0);

  // Listing nascosti
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [hiddenList, setHiddenList] = useState([]);
  const [hiddenLoading, setHiddenLoading] = useState(false);

  async function caricaHidden() {
    setHiddenLoading(true);
    try {
      const r = await fetch("/api/v2/europa/catalogo/hidden");
      const j = await r.json();
      setHiddenList(Array.isArray(j) ? j : []);
    } catch {
      toast.error("Errore caricamento listing nascosti");
    } finally {
      setHiddenLoading(false);
    }
  }

  async function ripristinaHidden(asin) {
    try {
      const r = await fetch("/api/v2/europa/catalogo/unhide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "errore");
      setHiddenList(prev => prev.filter(h => h.asin !== asin));
      toast.success(`ASIN ${asin} ripristinato`);
      caricaCatalogo();
    } catch (err) {
      toast.error(`Ripristino fallito: ${err.message}`);
    }
  }

  async function nascondiAsin(asin) {
    try {
      const r = await fetch("/api/v2/europa/catalogo/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "errore");
      toast.success(`ASIN ${asin} nascosto`);
      caricaCatalogo();
    } catch (err) {
      toast.error(`Operazione fallita: ${err.message}`);
    }
  }

  useEffect(() => { if (hiddenOpen) caricaHidden(); }, [hiddenOpen]);

  // Tassi di cambio verso EUR (live dal backend, cache 24h)
  const [fxRates, setFxRates] = useState(FALLBACK_TO_EUR);
  const [fxInfo, setFxInfo]   = useState(null); // { fetchedAt, stale, source }
  useEffect(() => {
    fetch("/api/v2/europa/fx-rates")
      .then(r => r.json())
      .then(j => {
        if (j?.rates) setFxRates(j.rates);
        setFxInfo({ fetchedAt: j?.fetchedAt, stale: !!j?.stale, source: j?.source });
      })
      .catch(() => {/* usa fallback */});
  }, []);

  // Catalogo (da DB)
  const [catalogo, setCatalogo] = useState([]);
  const [catalogoLoading, setCatalogoLoading] = useState(true);
  const [searchCatalogo, setSearchCatalogo] = useState("");

  // ASIN espanso nel catalogo
  const [espanso, setEspanso] = useState(null);

  // Sync stock di tutto il catalogo
  const [syncingCatalogo, setSyncingCatalogo] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null); // { done, total, label }
  const [syncLabel, setSyncLabel] = useState("");

  // Timestamp ultimo sync (stock / prezzi / immagini)
  // Dichiarato DOPO gli useState dei sync, altrimenti TDZ nel useEffect di refresh.
  const [lastSync, setLastSync] = useState({ stock: null, prezzi: null, immagini: null });
  async function caricaLastSync() {
    try {
      const r = await fetch("/api/v2/europa/last-sync");
      const j = await r.json();
      setLastSync({ stock: j?.stock, prezzi: j?.prezzi, immagini: j?.immagini });
    } catch { /* ignore */ }
  }
  useEffect(() => { caricaLastSync(); }, []);
  // Aggiorna dopo ogni sync manuale
  useEffect(() => {
    if (!syncingCatalogo && !syncingLedger && !syncingImmagini && !syncingPrezzi) caricaLastSync();
  }, [syncingCatalogo, syncingLedger, syncingImmagini, syncingPrezzi]);

  async function caricaCatalogo() {
    setCatalogoLoading(true);
    try {
      const q = searchCatalogo ? `?search=${encodeURIComponent(searchCatalogo)}` : "";
      const res = await fetch(`/api/v2/europa/catalogo${q}`);
      const json = await res.json();
      setCatalogo(Array.isArray(json) ? json : []);
    } catch {
      toast.error(t("europaDashboard.toast_err_load_catalogo"));
    } finally {
      setCatalogoLoading(false);
    }
  }

  useEffect(() => { caricaCatalogo(); }, [searchCatalogo]);

  async function pollJob(statoUrl, onProgress, onDone, onError) {
    // Aspetta che il job risulti avviato (max 12s)
    let started = false;
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const json = await fetch(statoUrl).then(r => r.json());
        if (json.avviato) { started = true; break; }
      } catch { /* riprova */ }
    }
    if (!started) { onError({ error: t("europaDashboard.err_job_not_started") }); return; }

    // Polling finché running === false
    for (let i = 0; i < 400; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const json = await fetch(statoUrl).then(r => r.json());
        // Backend riavviato: avviato torna false dopo essere stato true → stop
        if (!json.avviato && !json.running) {
          onError({ error: t("europaDashboard.err_server_restart") });
          return;
        }
        if (onProgress) onProgress(json);
        if (!json.running && json.avviato) {
          if (json.error) onError(json);
          else onDone(json);
          return;
        }
      } catch { /* rete, riprova */ }
    }
    onError({ error: t("europaDashboard.err_timeout_polling") });
  }

  async function syncLedger() {
    if (!window.confirm(t("europaDashboard.confirm_ledger"))) return;
    setSyncingLedger(true);
    toast.info(t("europaDashboard.toast_ledger_started"));
    try {
      const res = await fetch("/api/v2/europa/ledger-stock", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (!json.avviato && json.messaggio) { toast.warning(json.messaggio); setSyncingLedger(false); return; }
      setSyncLabel(t("europaDashboard.sync_label_stock_paese"));
      setSyncProgress({ done: 0, total: 1 });
      pollJob(
        "/api/v2/europa/ledger-stock/stato",
        null,
        (stato) => {
          if (stato.righeAggiornate > 0) {
            toast.success(t("europaDashboard.toast_stock_paese_ok", { n: stato.righeAggiornate }));
            caricaCatalogo();
          } else {
            toast.warning(stato.avviso ?? t("europaDashboard.toast_ledger_no_data"));
          }
          setSyncingLedger(false);
          setSyncProgress(null);
        },
        (stato) => {
          toast.error(`${t("europaDashboard.toast_ledger_failed")}: ${stato.error}`);
          setSyncingLedger(false);
          setSyncProgress(null);
        }
      );
    } catch (err) {
      toast.error(`${t("europaDashboard.toast_ledger_failed")}: ${err.message}`);
      setSyncingLedger(false);
    }
  }

  async function syncImmagini() {
    setSyncingImmagini(true);
    toast.info(t("europaDashboard.toast_sync_immagini_started"));
    try {
      const res = await fetch("/api/v2/europa/sync-catalog-info", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("europaDashboard.err_server"));
      if (!json.avviato && json.messaggio) { toast.warning(json.messaggio); setSyncingImmagini(false); return; }
      setSyncLabel(t("europaDashboard.sync_label_immagini"));
      pollJob(
        "/api/v2/europa/sync-catalog-info/stato",
        (stato) => {
          if (stato.running && stato.total > 0)
            setSyncProgress({ done: stato.done, total: stato.total });
        },
        (stato) => {
          toast.success(t("europaDashboard.toast_immagini_ok", { a: stato.aggiornati, t: stato.total }));
          caricaCatalogo();
          setImagesVersion(v => v + 1);
          setSyncingImmagini(false);
          setSyncProgress(null);
        },
        (stato) => {
          toast.error(`${t("europaDashboard.toast_immagini_failed")}: ${stato.error}`);
          setSyncingImmagini(false);
          setSyncProgress(null);
        }
      );
    } catch (err) {
      toast.error(`${t("europaDashboard.toast_immagini_failed")}: ${err.message}`);
      setSyncingImmagini(false);
    }
  }

  async function syncPrezzi() {
    setSyncingPrezzi(true);
    toast.info(t("europaDashboard.toast_prezzi_started"));
    try {
      const res = await fetch("/api/v2/europa/sync-prezzi", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("europaDashboard.err_server"));
      if (!json.avviato && json.messaggio) { toast.warning(json.messaggio); setSyncingPrezzi(false); return; }
      setSyncLabel(t("europaDashboard.sync_label_prezzi"));
      pollJob(
        "/api/v2/europa/sync-prezzi/stato",
        (stato) => {
          if (stato.running && stato.total > 0)
            setSyncProgress({ done: stato.done, total: stato.total });
        },
        (stato) => {
          toast.success(t("europaDashboard.toast_prezzi_ok", { a: stato.aggiornati, t: stato.total }));
          caricaCatalogo();
          setSyncingPrezzi(false);
          setSyncProgress(null);
        },
        (stato) => {
          toast.error(`${t("europaDashboard.toast_prezzi_failed")}: ${stato.error}`);
          setSyncingPrezzi(false);
          setSyncProgress(null);
        }
      );
    } catch (err) {
      toast.error(`${t("europaDashboard.toast_prezzi_failed")}: ${err.message}`);
      setSyncingPrezzi(false);
    }
  }

  async function syncTuttoCatalogo() {
    setSyncingCatalogo(true);

    if (!catalogo.length) {
      setSyncProgress({ fase: t("europaDashboard.fase_import_stock") });
      try {
        const res = await fetch("/api/v2/europa/import-inventario", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        toast.success(t("europaDashboard.toast_import_ok", { n: json.totaleAsins }));
        if (json.panEuNormalizzati > 0) {
          toast.info(
            `${json.panEuNormalizzati} ASIN Pan-EU: totale su IT come pool. Lancia "Stock/paese" per la distribuzione fisica reale.`,
            { duration: 10000 }
          );
        }
        await caricaCatalogo();
      } catch (err) {
        toast.error(`${t("europaDashboard.toast_import_failed")}: ${err.message}`);
      } finally {
        setSyncingCatalogo(false);
        setSyncProgress(null);
      }
      return;
    }

    setSyncProgress({ fase: t("europaDashboard.fase_update_stock") });
    try {
      const res = await fetch("/api/v2/europa/sync-all", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(t("europaDashboard.toast_stock_ok", { n: json.stockAggiornato, a: json.alertsFired }));

      // Se qualche marketplace è fallito, mostra toast warning dedicato per ciascuno
      if (Array.isArray(json.marketplaceErrori) && json.marketplaceErrori.length > 0) {
        for (const mpErr of json.marketplaceErrori) {
          toast.warning(`${mpErr.country}: ${mpErr.error}`, { duration: 8000 });
        }
      }
      // Se ci sono ASIN con errori alert, mostra un summary aggregato
      if (Array.isArray(json.alertErrori) && json.alertErrori.length > 0) {
        toast.warning(`Alert non verificati per ${json.alertErrori.length} ASIN`, { duration: 6000 });
      }
      // Se rilevato Pan-EU pool: invito a lanciare il Ledger per distribuzione fisica
      if (json.panEuNormalizzati > 0) {
        toast.info(
          `${json.panEuNormalizzati} ASIN Pan-EU: totale su IT come pool. Lancia "Stock/paese" per la distribuzione fisica reale.`,
          { duration: 10000 }
        );
      }
      await caricaCatalogo();
    } catch (err) {
      toast.error(`${t("europaDashboard.toast_sync_failed")}: ${err.message}`);
    } finally {
      setSyncingCatalogo(false);
      setSyncProgress(null);
    }
  }

  const catalogoFiltrato = catalogo
    .filter(item =>
      !searchCatalogo ||
      item.asin.includes(searchCatalogo.toUpperCase()) ||
      (item.product_name ?? "").toLowerCase().includes(searchCatalogo.toLowerCase())
    )
    .sort((a, b) => {
      const totA = (a.countries ?? []).reduce((s, c) => s + (c.quantity ?? 0), 0);
      const totB = (b.countries ?? []).reduce((s, c) => s + (c.quantity ?? 0), 0);
      return totB - totA;
    });

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid sottile */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <PageTopBar
        icon={Globe}
        iconAccent="blue"
        eyebrow={t("europaDashboard.topbar_eyebrow")}
        title={t("europaDashboard.topbar_title")}
        backTo="/europe"
        actions={
          <>
            {fxInfo && (
              <div
                className={`hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-mono ${
                  fxInfo.stale
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                }`}
                title={`Fonte: ${fxInfo.source}${fxInfo.fetchedAt ? " · " + new Date(fxInfo.fetchedAt).toLocaleString("it-IT") : ""}`}
              >
                <span>£ {(fxRates.GBP ?? 0).toFixed(3)}</span>
                <span>·</span>
                <span>zł {(fxRates.PLN ?? 0).toFixed(3)}</span>
                <span>·</span>
                <span>kr {(fxRates.SEK ?? 0).toFixed(3)}</span>
                {fxInfo.stale && <span className="ml-1">stale</span>}
              </div>
            )}
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-blue-400 font-medium">{t("europaDashboard.badge_9_paesi")}</span>
            </div>
          </>
        }
      />

      {/* === Hero compatto === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
            {t("europaDashboard.hero_eyebrow")}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("europaDashboard.hero_title_main")} <span className="text-slate-500">{t("europaDashboard.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("europaDashboard.hero_desc")}
          </p>

          {/* Ultimo sync per tipologia */}
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono">
            <LastSyncChip label="Stock"    ts={lastSync.stock} />
            <LastSyncChip label="Prezzi"   ts={lastSync.prezzi} />
            <LastSyncChip label="Immagini" ts={lastSync.immagini} />
          </div>
        </div>
      </section>

      {/* === Tabs === */}
      <div className="relative border-b border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="flex gap-1 overflow-x-auto -mb-px scrollbar-none">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  data-tab={t.id}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors ${
                    active
                      ? "border-blue-400 text-white"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-5">

        {/* ===== TAB CATALOGO ===== */}
        {tab === "catalogo" && (
          <div className="space-y-5">
            {/* Barra azioni */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  value={searchCatalogo}
                  onChange={e => setSearchCatalogo(e.target.value)}
                  placeholder={t("europaDashboard.ph_search_catalogo")}
                  className="w-full pl-10 pr-3 py-2.5 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>
              <button
                onClick={syncTuttoCatalogo}
                disabled={syncingCatalogo}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-xs font-medium transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCatalogo ? "animate-spin" : ""}`} />
                {syncingCatalogo && syncProgress
                  ? (syncProgress.fase ?? t("europaDashboard.sync_progress", { done: syncProgress.done, total: syncProgress.total }))
                  : catalogo.length === 0 ? t("europaDashboard.btn_importa_amazon") : t("europaDashboard.btn_sync_tutto")}
              </button>
              <button
                onClick={syncLedger}
                disabled={syncingLedger || !catalogo.length}
                title={t("europaDashboard.title_stock_paese")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all disabled:opacity-40"
              >
                <TrendingUp className={`w-3.5 h-3.5 ${syncingLedger ? "animate-pulse" : ""}`} />
                {syncingLedger ? t("europaDashboard.btn_generando") : t("europaDashboard.btn_stock_paese")}
              </button>
              <button
                onClick={syncImmagini}
                disabled={syncingImmagini || !catalogo.length}
                title={t("europaDashboard.title_sync_immagini")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all disabled:opacity-40"
              >
                <Image className={`w-3.5 h-3.5 ${syncingImmagini ? "animate-pulse" : ""}`} />
                {syncingImmagini
                  ? (syncProgress?.done != null ? `${syncProgress.done}/${syncProgress.total}` : t("europaDashboard.btn_immagini_loading"))
                  : t("europaDashboard.btn_sync_immagini")}
              </button>
              <button
                onClick={syncPrezzi}
                disabled={syncingPrezzi || !catalogo.length}
                title={t("europaDashboard.title_sync_prezzi")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all disabled:opacity-40"
              >
                <TrendingUp className={`w-3.5 h-3.5 ${syncingPrezzi ? "animate-pulse" : ""}`} />
                {syncingPrezzi
                  ? (syncProgress?.done != null ? `${syncProgress.done}/${syncProgress.total}` : t("europaDashboard.btn_prezzi_loading"))
                  : t("europaDashboard.btn_sync_prezzi")}
              </button>
              <button
                onClick={() => setHiddenOpen(o => !o)}
                title="Mostra listing nascosti"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-all ${
                  hiddenOpen
                    ? "bg-slate-800 border-slate-600 text-slate-100"
                    : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                Nascosti
              </button>
              <button
                onClick={caricaCatalogo}
                title={t("europaDashboard.title_reload")}
                className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pannello listing nascosti */}
            {hiddenOpen && (
              <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-600/60" />
                <div className="pl-5 pr-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-slate-500" />
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-medium">
                        Listing nascosti
                      </span>
                      <span className="text-[11px] font-mono text-slate-600">
                        {hiddenList.length}
                      </span>
                    </div>
                  </div>
                  {hiddenLoading ? (
                    <p className="text-xs text-slate-500">Caricamento…</p>
                  ) : hiddenList.length === 0 ? (
                    <p className="text-xs text-slate-500">Nessun listing nascosto.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {hiddenList.map(h => (
                        <div
                          key={h.asin}
                          className="flex items-center gap-3 px-3 py-2 rounded bg-slate-950/40 border border-slate-800"
                        >
                          <span className="font-mono text-xs text-emerald-400">{h.asin}</span>
                          <span className="text-[11px] text-slate-600 font-mono flex-1 truncate">
                            nascosto il {new Date(h.hidden_at).toLocaleString("it-IT")}
                          </span>
                          <button
                            onClick={() => ripristinaHidden(h.asin)}
                            className="flex items-center gap-1 px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 text-[11px] font-medium transition-colors"
                            type="button"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Ripristina
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Barra di avanzamento sync */}
            {syncProgress && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-md px-4 py-3 flex items-center gap-3">
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{syncLabel}</span>
                    {syncProgress.total > 1
                      ? <span className="text-[11px] font-mono text-slate-500">{syncProgress.done}/{syncProgress.total}</span>
                      : <span className="text-[11px] text-slate-500">{t("europaDashboard.in_corso")}</span>
                    }
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1">
                    <div
                      className="bg-blue-400 h-1 rounded-full transition-all duration-500"
                      style={{ width: syncProgress.total > 1 ? `${Math.round((syncProgress.done / syncProgress.total) * 100)}%` : '100%',
                               animation: syncProgress.total <= 1 ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Statistiche rapide */}
            {catalogo.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-3">{t("europaDashboard.panoramica")}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCardEU label={t("europaDashboard.stat_asin_catalogo")}   value={catalogo.length} accent="slate" code="A" icon={Package} />
                  <StatCardEU label={t("europaDashboard.stat_pool_eu")}         value={catalogo.reduce((s, i) => s + (i.stock_eu_pool ?? 0), 0).toLocaleString("it-IT")} accent="blue" code="B" icon={TrendingUp} />
                  <StatCardEU label={t("europaDashboard.stat_asin_stock")}      value={catalogo.filter(i => (i.stock_eu_pool ?? 0) > 0).length} accent="emerald" code="C" icon={Package} />
                  <StatCardEU label={t("europaDashboard.stat_alert_non_letti")} value={catalogo.reduce((s, i) => s + (i.unreadAlerts ?? 0), 0)} accent="amber" code="D" icon={Bell} />
                </div>
              </div>
            )}

            {/* Lista catalogo */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{t("europaDashboard.catalogo")}</div>
                {catalogoFiltrato.length > 0 && (
                  <div className="text-[11px] font-mono text-slate-600">{t("europaDashboard.n_prodotti", { n: catalogoFiltrato.length })}</div>
                )}
              </div>

              {catalogoLoading ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-16 text-center">
                  <RefreshCw className="w-6 h-6 text-slate-600 mx-auto mb-3 animate-spin" />
                  <p className="text-sm text-slate-500">{t("europaDashboard.loading_catalogo")}</p>
                </div>
              ) : catalogoFiltrato.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-16 text-center">
                  <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 mb-1">
                    {searchCatalogo ? t("europaDashboard.empty_search") : t("europaDashboard.empty_catalogo")}
                  </p>
                  <p className="text-xs text-slate-600">
                    {t("europaDashboard.empty_hint")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {catalogoFiltrato.map(item => (
                    <CatalogoRow
                      key={item.asin}
                      item={item}
                      espanso={espanso === item.asin}
                      onToggle={() => setEspanso(prev => prev === item.asin ? null : item.asin)}
                      navigate={navigate}
                      t={t}
                      imagesVersion={imagesVersion}
                      fxRates={fxRates}
                      onHide={nascondiAsin}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB ALERT ===== */}
        {tab === "alert" && (
          <AlertsPanel asinList={catalogo.map(i => i.asin)} />
        )}
      </div>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} {t("europaDashboard.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
}

// === Chip per l'ultimo sync (verde < 24h, ambra < 7gg, rosso > 7gg, grigio mai) ===
function LastSyncChip({ label, ts }) {
  const now = Date.now();
  const t = ts ? new Date(ts).getTime() : null;
  const ageMs = t ? now - t : null;
  const ageH = ageMs != null ? ageMs / 3600000 : null;

  let color = "slate";
  let ageLabel = "mai";
  if (ageH != null) {
    if (ageH < 1)        ageLabel = `${Math.max(1, Math.round(ageH * 60))} min fa`;
    else if (ageH < 24)  ageLabel = `${Math.round(ageH)} h fa`;
    else if (ageH < 168) ageLabel = `${Math.round(ageH / 24)} g fa`;
    else                 ageLabel = `${Math.round(ageH / 24)} g fa`;

    if (ageH < 24)       color = "emerald";
    else if (ageH < 168) color = "amber";
    else                 color = "rose";
  }

  const cls = {
    slate:   "bg-slate-900/60 border-slate-800 text-slate-500",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    amber:   "bg-amber-500/10 border-amber-500/30 text-amber-300",
    rose:    "bg-rose-500/10 border-rose-500/30 text-rose-300",
  }[color];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${cls}`}
      title={ts ? new Date(ts).toLocaleString("it-IT") : "Nessun dato"}
    >
      <span className="uppercase tracking-[0.12em] opacity-80">{label}</span>
      <span className="opacity-60">·</span>
      <span>{ageLabel}</span>
    </span>
  );
}

// === StatCard EU ===
const STAT_ACCENT_EU = {
  slate:   "text-slate-200",
  blue:    "text-blue-400",
  emerald: "text-emerald-400",
  amber:   "text-amber-400",
};
function StatCardEU({ label, value, accent, code, icon: Icon }) {
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-md bg-slate-800/60 border border-slate-700 flex items-center justify-center">
          <Icon className={`w-[18px] h-[18px] ${STAT_ACCENT_EU[accent]}`} />
        </div>
        <span className="text-[10px] font-mono text-slate-600">{code}</span>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums ${STAT_ACCENT_EU[accent]}`}>
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Riga del catalogo (compatta con espansione stock per paese)
// ---------------------------------------------------------------
function CatalogoRow({ item, espanso, onToggle, navigate, t, imagesVersion = 0, fxRates = FALLBACK_TO_EUR, onHide }) {
  const PAESE_MP = { IT:"APJ6JRA9NG5V4", FR:"A13V1IB3VIYZZH", DE:"A1PA6795UKMFR9", ES:"A1RKKUPIHCS9HS", GB:"A1F83G8C2ARO7P", NL:"A1805IZSGTT6HS", BE:"AMEN7PMS3EDWL", SE:"A2NODRKZP88ZB9", PL:"A1C3SOZRARQ6R3" };

  const [catalogImages, setCatalogImages] = useState(null);
  const [loadingImages, setLoadingImages] = useState(false);

  const primaCountry = item.countries?.[0]?.country ?? "IT";

  // Refetch quando: (1) la card viene espansa per la prima volta, (2) imagesVersion cambia (post sync immagini)
  useEffect(() => {
    if (!espanso) return;
    setLoadingImages(true);
    fetch(`/api/v2/europa/catalog-images/${item.asin}`)
      .then(r => r.json())
      .then(data => { setCatalogImages(Array.isArray(data) ? data : []); })
      .catch(() => setCatalogImages([]))
      .finally(() => setLoadingImages(false));
  }, [espanso, imagesVersion, item.asin]);

  // Stock totale per indicatore stato
  const totalStock = (item.countries ?? []).reduce((s, c) => s + (c.quantity ?? 0), 0);
  const stockZero  = totalStock === 0;
  const stockBasso = totalStock > 0 && totalStock < 50;
  const hasAlerts  = item.unreadAlerts > 0;

  return (
    <div className={`relative bg-slate-900/60 border rounded-lg overflow-hidden transition-all hover:border-slate-700 ${
      hasAlerts ? "border-amber-500/30" : "border-slate-800"
    }`}>
      {/* Bordo sinistro stato stock */}
      <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${
        hasAlerts  ? "bg-amber-500/60" :
        stockZero  ? "bg-rose-500/60" :
        stockBasso ? "bg-amber-500/60" : "bg-emerald-500/40"
      }`} />

      {/* Azioni rapide (in cima alla card, sempre sopra il contenuto) */}
      <div className="relative flex gap-2 px-6 sm:px-8 pt-4 pb-3 flex-wrap border-b border-slate-800/60">
        <button
          onClick={() => navigate(`/uffici/listing/testo/${item.asin}/${primaCountry}`)}
          title={t("europaDashboard.title_testo_listing")}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all"
        >
          <FileText className="w-3 h-3" />
          {t("europaDashboard.btn_testo")}
        </button>
        <button
          onClick={() => navigate(`/uffici/listing/immagini/${item.asin}/${primaCountry}`)}
          title={t("europaDashboard.title_immagini")}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all"
        >
          <Image className="w-3 h-3" />
          {t("europaDashboard.btn_immagini")}
        </button>
        <button
          onClick={() => navigate(`/uffici/listing/aplus/${item.asin}/${primaCountry}`)}
          title={t("europaDashboard.title_aplus")}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all"
        >
          <Star className="w-3 h-3" />
          {t("europaDashboard.btn_aplus")}
        </button>
        <button
          onClick={() => navigate(`/europe/alert-config/${item.asin}`)}
          title={t("europaDashboard.title_config_alert")}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-[11px] font-medium transition-all"
        >
          <Settings className="w-3 h-3" />
          {t("europaDashboard.btn_alert")}
        </button>
        {onHide && (
          <button
            onClick={() => onHide(item.asin)}
            title="Nascondi dalla dashboard"
            type="button"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition-all"
          >
            <EyeOff className="w-3 h-3" />
            Nascondi
          </button>
        )}
      </div>

      {/* Header riga */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-5 sm:gap-6 px-6 sm:px-8 py-6 sm:py-7">
          {/* Immagine */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0">
            {item.image_url ? (
              <img src={item.image_url} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <Package className="w-9 h-9 text-slate-700" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(item.asin); toast.success(t("europaDashboard.toast_asin_copied", { asin: item.asin })); }}
                title={t("europaDashboard.title_click_copy")}
                className="font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                {item.asin}
              </span>
              {hasAlerts && (
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium rounded">
                  {t("europaDashboard.badge_n_alert", { n: item.unreadAlerts })}
                </span>
              )}
              {item.rulesCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-medium rounded">
                  {t("europaDashboard.badge_n_regole", { n: item.rulesCount })}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white truncate mb-2 leading-tight">
              {item.product_name ?? "—"}
            </h3>
            {item.sku && (
              <span
                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(item.sku); toast.success(t("europaDashboard.toast_sku_copied", { sku: item.sku })); }}
                title={t("europaDashboard.title_click_copy")}
                className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {t("europaDashboard.sku_prefix")} {item.sku}
              </span>
            )}
          </div>

          {/* Stock totale — somma di tutti i paesi (EU + UK) */}
          {item.countries?.length > 0 && (() => {
            // totalStock e stockBasso sono gia calcolati sopra (linee 763-766)
            const poolRow = item.countries.find(c => (c.reserved_qty ?? 0) > 0 || (c.inbound_receiving ?? 0) > 0);
            const res = poolRow?.reserved_qty ?? 0;
            const inb = poolRow?.inbound_receiving ?? 0;
            return (
              <div className="flex-shrink-0 text-right">
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1 flex items-center gap-1.5 justify-end">
                  <Globe className="w-3 h-3" /> {t("europaDashboard.totale_eu")}
                </div>
                <div className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                  totalStock > 0 ? (stockBasso ? "text-amber-400" : "text-emerald-400") : "text-rose-400"
                }`}>
                  {totalStock.toLocaleString("it-IT")}
                </div>
                {(res > 0 || inb > 0) && (
                  <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                    {res > 0 && <span>+{res} {t("europaDashboard.res_abbr")}</span>}
                    {res > 0 && inb > 0 && " "}
                    {inb > 0 && <span>+{inb} {t("europaDashboard.inb_abbr")}</span>}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Toggle expand */}
          <div className="w-10 h-10 rounded-md border border-slate-800 bg-slate-900 text-slate-500 flex items-center justify-center flex-shrink-0">
            {espanso ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>


      {/* Espansione: griglia unificata per paese */}
      {espanso && (
        <div className="border-t border-slate-800 px-6 sm:px-8 py-5 bg-slate-950/50">
          {(() => {
            const ALL_COUNTRIES = ['IT','DE','FR','ES','NL','BE','SE','PL','GB'];
            const PAESE_MP = { IT:"APJ6JRA9NG5V4", FR:"A13V1IB3VIYZZH", DE:"A1PA6795UKMFR9", ES:"A1RKKUPIHCS9HS", GB:"A1F83G8C2ARO7P", NL:"A1805IZSGTT6HS", BE:"AMEN7PMS3EDWL", SE:"A2NODRKZP88ZB9", PL:"A1C3SOZRARQ6R3" };
            const MP_CC = Object.fromEntries(Object.entries(PAESE_MP).map(([c,mp]) => [mp,c]));

            const stockMap = Object.fromEntries((item.countries ?? []).map(c => [c.country, c]));
            const prezziMap = Object.fromEntries((item.prezzi ?? []).map(p => [p.country, p]));
            const imgMap = Object.fromEntries((catalogImages ?? []).map(ci => [ci.country, ci]));

            // Soglie STOCK_LOW per paese
            const soglieCc = {}; // cc -> soglia
            for (const rule of (item.stockRules ?? [])) {
              if (rule.marketplace_id) {
                const cc = MP_CC[rule.marketplace_id];
                if (cc) soglieCc[cc] = rule.soglia;
              } else {
                soglieCc['__ALL__'] = rule.soglia;
              }
            }
            function stockColorClass(cc, qty) {
              const soglia = soglieCc[cc] ?? soglieCc['__ALL__'];
              if (soglia == null) return null;
              if (qty <= soglia)     return 'red';
              if (qty <= soglia * 2) return 'orange';
              return 'green';
            }
            const STOCK_COLORS = {
              red:    { bg: 'bg-rose-500/10 border-rose-500/30',     label: 'text-rose-400',    value: 'text-rose-300'    },
              orange: { bg: 'bg-amber-500/10 border-amber-500/30',   label: 'text-amber-400',   value: 'text-amber-300'   },
              green:  { bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'text-emerald-400', value: 'text-emerald-300' },
            };

            // Sort: 1) stock>0 desc  2) prezzo senza stock  3) nessuno dei due
            const paesi = ALL_COUNTRIES
              .filter(cc => stockMap[cc] || prezziMap[cc])
              .sort((a, b) => {
                const qa = stockMap[a]?.quantity ?? 0;
                const qb = stockMap[b]?.quantity ?? 0;
                const pa = !!prezziMap[a], pb = !!prezziMap[b];
                if (qa > 0 && qb > 0) return qb - qa;
                if (qa > 0) return -1;
                if (qb > 0) return 1;
                if (pa && pb) return 0;
                if (pa) return -1;
                if (pb) return 1;
                return 0;
              });

            if (!paesi.length) return <p className="text-xs text-slate-600">{t("europaDashboard.nessun_dato")}</p>;

            return (
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${paesi.length}, minmax(0, 1fr))` }}
              >
                {paesi.map(cc => {
                  const stock = stockMap[cc];
                  const prezzo = prezziMap[cc];
                  const img = imgMap[cc];
                  const isGB = cc === 'GB';
                  const qty = stock?.quantity ?? 0;
                  const stockColor = stockColorClass(cc, qty);
                  const sc = STOCK_COLORS[stockColor];
                  const { native } = prezzo ? formatPrice(prezzo.prezzo, prezzo.currency, fxRates) : { native: null };

                  return (
                    <div
                      key={cc}
                      className={`min-w-0 rounded-md p-3 flex flex-col gap-2 border ${
                        isGB
                          ? 'bg-blue-500/5 border-blue-500/30'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                        {/* Header: bandiera + paese */}
                        <div className="flex flex-col items-center gap-1 pb-2 border-b border-slate-800">
                          <Flag code={cc} className="h-5 w-auto" />
                          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium">{cc}</span>
                        </div>

                        {/* Stock */}
                        <div className={`text-center rounded-md p-2 border ${sc ? sc.bg : 'border-transparent'}`}>
                          <p className={`text-[10px] uppercase tracking-[0.12em] mb-1 ${sc ? sc.label : 'text-slate-600'}`}>{t("europaDashboard.stock")}</p>
                          <p className={`text-base font-semibold tabular-nums ${
                            sc ? sc.value : qty > 0 ? 'text-white' : 'text-slate-600'
                          }`}>
                            {stock ? qty.toLocaleString("it-IT") : "—"}
                          </p>
                        </div>

                        {/* Prezzo */}
                        <div className="text-center border-t border-slate-800 pt-2">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600 mb-1">{t("europaDashboard.prezzo")}</p>
                          {native
                            ? <>
                                <p className="text-sm font-semibold text-white tabular-nums">{native}</p>
                                <p className={`text-[10px] mt-0.5 ${prezzo.buybox_won ? "text-emerald-400" : "text-slate-600"}`}>
                                  {prezzo.buybox_won ? t("europaDashboard.buybox_won") : t("europaDashboard.buybox_lost")}
                                </p>
                              </>
                            : <p className="text-xs text-slate-700">—</p>
                          }
                        </div>

                        {/* Listing */}
                        <div className="border-t border-slate-800 pt-2">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600 mb-1.5 text-center">{t("europaDashboard.listing")}</p>
                          {loadingImages
                            ? <div className="w-full h-14 bg-slate-800 rounded animate-pulse" />
                            : img?.image_url
                              ? <div className="relative">
                                  <img src={img.image_url} alt="" className="w-full h-14 object-contain bg-slate-950 border border-slate-800 rounded p-1" />
                                  {img.image_count > 0 && (
                                    <span className="absolute -top-1 -right-1 text-[10px] font-mono bg-slate-900 text-slate-400 px-1 py-0.5 rounded border border-slate-700 leading-none">
                                      {img.image_count}
                                    </span>
                                  )}
                                </div>
                              : <div className="w-full h-14 bg-slate-900 border border-slate-800 rounded flex items-center justify-center">
                                  <Package className="w-4 h-4 text-slate-700" />
                                </div>
                          }
                          {img?.titolo && (
                            <p className="text-[10px] text-slate-600 line-clamp-2 mt-1.5 leading-tight" title={img.titolo}>{img.titolo}</p>
                          )}
                          <div className="flex gap-1 mt-2 justify-center">
                            <button
                              onClick={() => navigate(`/uffici/listing/testo/${item.asin}/${cc}`)}
                              className="w-6 h-6 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
                              title={t("europaDashboard.title_testo_listing")}
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => navigate(`/uffici/listing/immagini/${item.asin}/${cc}`)}
                              className="w-6 h-6 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
                              title={t("europaDashboard.title_immagini")}
                            >
                              <Image className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => navigate(`/uffici/listing/aplus/${item.asin}/${cc}`)}
                              className="w-6 h-6 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
                              title={t("europaDashboard.title_aplus")}
                            >
                              <Star className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            );
          })()}
          {item.prezzi?.length > 0 && (
            <p className="text-[11px] font-mono text-slate-700 mt-3">
              {`Tassi: £1=€${(fxRates.GBP ?? FALLBACK_TO_EUR.GBP).toFixed(3)}`}
              {` · zł1=€${(fxRates.PLN ?? FALLBACK_TO_EUR.PLN).toFixed(3)}`}
              {` · kr1=€${(fxRates.SEK ?? FALLBACK_TO_EUR.SEK).toFixed(3)}`}
            </p>
          )}

          <p className="text-[11px] font-mono text-slate-700 mt-2">
            {t("europaDashboard.aggiornato")}: {item.updated_at ? new Date(item.updated_at).toLocaleString("it-IT") : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
