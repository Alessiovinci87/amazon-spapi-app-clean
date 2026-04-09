import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, RefreshCw, Bell, Package,
  TrendingUp, ChevronDown, ChevronUp,
  Settings, Image, Star, FileText
} from "lucide-react";
import AlertsPanel from "../components/europa/AlertsPanel";
import { toast } from "sonner";

const Flag = ({ code, className = "h-4 w-auto inline-block align-middle" }) => (
  <img src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`} alt={code} className={className} />
);

// Tassi di cambio verso EUR (aggiornare periodicamente)
const TO_EUR = { EUR: 1, GBP: 1.17, PLN: 0.23, SEK: 0.087 };
const CURRENCY_SYMBOL = { EUR: '€', GBP: '£', PLN: 'zł', SEK: 'kr' };
function formatPrice(prezzo, currency) {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const nativeStr = currency === 'EUR'
    ? `${sym}${prezzo.toFixed(2)}`
    : `${sym}${prezzo.toFixed(2)}`;
  if (currency === 'EUR') return { native: nativeStr, eur: null };
  const eur = (prezzo * (TO_EUR[currency] ?? 1)).toFixed(2);
  return { native: nativeStr, eur: `≈€${eur}` };
}

const TABS = [
  { id: "catalogo", label: "Catalogo", icon: Package },
  { id: "alert",    label: "Alert",    icon: Bell },
];

export default function EuropaDashboard() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("catalogo");
  const [syncingImmagini, setSyncingImmagini] = useState(false);
  const [syncingLedger, setSyncingLedger] = useState(false);
  const [syncingPrezzi, setSyncingPrezzi] = useState(false);

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

  async function caricaCatalogo() {
    setCatalogoLoading(true);
    try {
      const q = searchCatalogo ? `?search=${encodeURIComponent(searchCatalogo)}` : "";
      const res = await fetch(`/api/v2/europa/catalogo${q}`);
      const json = await res.json();
      setCatalogo(Array.isArray(json) ? json : []);
    } catch {
      toast.error("Errore caricamento catalogo");
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
    if (!started) { onError({ error: "Job non avviato entro 12s" }); return; }

    // Polling finché running === false
    for (let i = 0; i < 400; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const json = await fetch(statoUrl).then(r => r.json());
        // Backend riavviato: avviato torna false dopo essere stato true → stop
        if (!json.avviato && !json.running) {
          onError({ error: "Server riavviato durante il sync — riavvia il job" });
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
    onError({ error: "Timeout polling (20 min)" });
  }

  async function syncLedger() {
    if (!window.confirm("Il report Ledger richiede 5-15 minuti.\nPuoi continuare a usare l'app — riceverai una notifica al termine.\nContinuare?")) return;
    setSyncingLedger(true);
    toast.info("Report Ledger avviato — elaborazione in background…");
    try {
      const res = await fetch("/api/v2/europa/ledger-stock", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (!json.avviato && json.messaggio) { toast.warning(json.messaggio); setSyncingLedger(false); return; }
      setSyncLabel("Stock per paese");
      setSyncProgress({ done: 0, total: 1 });
      pollJob(
        "/api/v2/europa/ledger-stock/stato",
        null,
        (stato) => {
          if (stato.righeAggiornate > 0) {
            toast.success(`Stock per paese aggiornato — ${stato.righeAggiornate} righe`);
            caricaCatalogo();
          } else {
            toast.warning(stato.avviso ?? "Nessun dato nel Ledger Amazon. Verifica su Seller Central > Rapporti > Inventory Ledger.");
          }
          setSyncingLedger(false);
          setSyncProgress(null);
        },
        (stato) => {
          toast.error(`Ledger fallito: ${stato.error}`);
          setSyncingLedger(false);
          setSyncProgress(null);
        }
      );
    } catch (err) {
      toast.error(`Ledger fallito: ${err.message}`);
      setSyncingLedger(false);
    }
  }

  async function syncImmagini() {
    setSyncingImmagini(true);
    toast.info("Sync immagini avviato in background…");
    try {
      const res = await fetch("/api/v2/europa/sync-catalog-info", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Errore server");
      if (!json.avviato && json.messaggio) { toast.warning(json.messaggio); setSyncingImmagini(false); return; }
      setSyncLabel("Sync immagini");
      pollJob(
        "/api/v2/europa/sync-catalog-info/stato",
        (stato) => {
          if (stato.running && stato.total > 0)
            setSyncProgress({ done: stato.done, total: stato.total });
        },
        (stato) => {
          toast.success(`Immagini aggiornate — ${stato.aggiornati}/${stato.total} ASIN`);
          caricaCatalogo();
          setSyncingImmagini(false);
          setSyncProgress(null);
        },
        (stato) => {
          toast.error(`Sync immagini fallito: ${stato.error}`);
          setSyncingImmagini(false);
          setSyncProgress(null);
        }
      );
    } catch (err) {
      toast.error(`Sync immagini fallito: ${err.message}`);
      setSyncingImmagini(false);
    }
  }

  async function syncPrezzi() {
    setSyncingPrezzi(true);
    toast.info("Sync prezzi avviato in background — può richiedere 10-20 minuti…");
    try {
      const res = await fetch("/api/v2/europa/sync-prezzi", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Errore server");
      if (!json.avviato && json.messaggio) { toast.warning(json.messaggio); setSyncingPrezzi(false); return; }
      setSyncLabel("Sync prezzi");
      pollJob(
        "/api/v2/europa/sync-prezzi/stato",
        (stato) => {
          if (stato.running && stato.total > 0)
            setSyncProgress({ done: stato.done, total: stato.total });
        },
        (stato) => {
          toast.success(`Prezzi aggiornati — ${stato.aggiornati}/${stato.total} ASIN`);
          caricaCatalogo();
          setSyncingPrezzi(false);
          setSyncProgress(null);
        },
        (stato) => {
          toast.error(`Sync prezzi fallito: ${stato.error}`);
          setSyncingPrezzi(false);
          setSyncProgress(null);
        }
      );
    } catch (err) {
      toast.error(`Sync prezzi fallito: ${err.message}`);
      setSyncingPrezzi(false);
    }
  }

  async function syncTuttoCatalogo() {
    setSyncingCatalogo(true);

    if (!catalogo.length) {
      setSyncProgress({ fase: "Importazione stock da Amazon (può richiedere 1-2 min)…" });
      try {
        const res = await fetch("/api/v2/europa/import-inventario", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        toast.success(`Importati ${json.totaleAsins} ASIN da Amazon`);
        await caricaCatalogo();
      } catch (err) {
        toast.error(`Importazione fallita: ${err.message}`);
      } finally {
        setSyncingCatalogo(false);
        setSyncProgress(null);
      }
      return;
    }

    setSyncProgress({ fase: "Aggiornamento stock da Amazon (1-2 min)…" });
    try {
      const res = await fetch("/api/v2/europa/sync-all", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Stock aggiornato — ${json.stockAggiornato} ASIN, ${json.alertsFired} alert`);
      await caricaCatalogo();
    } catch (err) {
      toast.error(`Sync fallito: ${err.message}`);
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
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Europa Dashboard</h1>
              <p className="text-zinc-400 text-xs">Inventario FBA, listing e alert per marketplace EU</p>
            </div>
          </div>
          <button onClick={() => navigate("/europe")} className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-all">
            <ArrowLeft className="w-4 h-4" /> Indietro
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} data-tab={t.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center
                  ${tab === t.id ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>

        {/* ===== TAB CATALOGO ===== */}
        {tab === "catalogo" && (
          <div className="space-y-4">
            {/* Barra azioni */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  value={searchCatalogo}
                  onChange={e => setSearchCatalogo(e.target.value)}
                  placeholder="Cerca per ASIN o nome prodotto…"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <button onClick={syncTuttoCatalogo} disabled={syncingCatalogo}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm font-medium transition-all">
                <RefreshCw className={`w-4 h-4 ${syncingCatalogo ? "animate-spin" : ""}`} />
                {syncingCatalogo && syncProgress
                  ? (syncProgress.fase ?? `Sync ${syncProgress.done}/${syncProgress.total}…`)
                  : catalogo.length === 0 ? "Importa da Amazon" : "Sync tutto"}
              </button>
              <button onClick={syncLedger} disabled={syncingLedger || !catalogo.length}
                title="Stock fisico per paese (report Ledger Amazon, ~10 min)"
                className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-lg text-sm transition-all">
                <TrendingUp className={`w-4 h-4 text-zinc-400 ${syncingLedger ? "animate-pulse" : ""}`} />
                {syncingLedger ? "Generando report…" : "Stock per paese"}
              </button>
              <button onClick={syncImmagini} disabled={syncingImmagini || !catalogo.length}
                title="Sincronizza titoli e immagini da Amazon (~1 min)"
                className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-lg text-sm transition-all">
                <Image className={`w-4 h-4 text-zinc-400 ${syncingImmagini ? "animate-pulse" : ""}`} />
                {syncingImmagini
                  ? (syncProgress?.done != null ? `${syncProgress.done}/${syncProgress.total} ASIN…` : "Immagini in corso…")
                  : "Sync immagini"}
              </button>
              <button onClick={syncPrezzi} disabled={syncingPrezzi || !catalogo.length}
                title="Sincronizza prezzi e buy box per tutti i prodotti (~15 min)"
                className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-lg text-sm transition-all">
                <TrendingUp className={`w-4 h-4 text-zinc-400 ${syncingPrezzi ? "animate-pulse" : ""}`} />
                {syncingPrezzi
                  ? (syncProgress?.done != null ? `${syncProgress.done}/${syncProgress.total} ASIN…` : "Prezzi in corso…")
                  : "Sync prezzi"}
              </button>
              <button onClick={caricaCatalogo}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all" title="Ricarica">
                <RefreshCw className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Barra di avanzamento sync */}
            {syncProgress && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 flex items-center gap-3">
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-zinc-400">{syncLabel}</span>
                    {syncProgress.total > 1
                      ? <span className="text-xs text-zinc-500">{syncProgress.done}/{syncProgress.total} ASIN</span>
                      : <span className="text-xs text-zinc-500">in corso…</span>
                    }
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: syncProgress.total > 1 ? `${Math.round((syncProgress.done / syncProgress.total) * 100)}%` : '100%',
                               animation: syncProgress.total <= 1 ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Statistiche rapide */}
            {catalogo.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{catalogo.length}</p>
                  <p className="text-xs text-zinc-500 mt-1">ASIN nel catalogo</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {catalogo.reduce((s, i) => s + (i.stock_eu_pool ?? 0), 0).toLocaleString("it-IT")}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Unità pool EU</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {catalogo.filter(i => (i.stock_eu_pool ?? 0) > 0).length}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">ASIN con stock EU</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-400">
                    {catalogo.reduce((s, i) => s + (i.unreadAlerts ?? 0), 0)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Alert non letti</p>
                </div>
              </div>
            )}

            {/* Lista catalogo */}
            {catalogoLoading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center animate-pulse text-zinc-500">
                Caricamento catalogo…
              </div>
            ) : catalogoFiltrato.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400 mb-2">
                  {searchCatalogo ? "Nessun prodotto trovato" : "Nessun prodotto nel catalogo"}
                </p>
                <p className="text-zinc-600 text-sm">
                  Usa il pulsante "Sync tutto" per sincronizzare lo stock
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {catalogoFiltrato.map(item => (
                  <CatalogoRow
                    key={item.asin}
                    item={item}
                    espanso={espanso === item.asin}
                    onToggle={() => setEspanso(prev => prev === item.asin ? null : item.asin)}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB ALERT ===== */}
        {tab === "alert" && (
          <AlertsPanel asinList={catalogo.map(i => i.asin)} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Riga del catalogo (compatta con espansione stock per paese)
// ---------------------------------------------------------------
function CatalogoRow({ item, espanso, onToggle, navigate }) {
  const PAESE_MP = { IT:"APJ6JRA9NG5V4", FR:"A13V1IB3VIYZZH", DE:"A1PA6795UKMFR9", ES:"A1RKKUPIHCS9HS", GB:"A1F83G8C2ARO7P", NL:"A1805IZSGTT6HS", BE:"AMEN7PMS3EDWL", SE:"A2NODRKZP88ZB9", PL:"A1C3SOZRARQ6R3" };

  const [catalogImages, setCatalogImages] = useState(null);
  const [loadingImages, setLoadingImages] = useState(false);

  const primaCountry = item.countries?.[0]?.country ?? "IT";

  useEffect(() => {
    if (espanso && catalogImages === null) {
      setLoadingImages(true);
      fetch(`/api/v2/europa/catalog-images/${item.asin}`)
        .then(r => r.json())
        .then(data => { setCatalogImages(Array.isArray(data) ? data : []); })
        .catch(() => setCatalogImages([]))
        .finally(() => setLoadingImages(false));
    }
  }, [espanso]);

  return (
    <div className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all ${item.unreadAlerts > 0 ? "border-yellow-500/30" : "border-zinc-800"}`}>
      {/* Riga principale */}
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Immagine prodotto */}
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-12 h-12 object-contain rounded-lg bg-white p-0.5 flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-zinc-600" />
          </div>
        )}
        <button onClick={onToggle} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(item.asin); toast.success(`ASIN ${item.asin} copiato`); }}
                className="font-mono text-xs text-zinc-500 hover:text-white hover:bg-zinc-700 px-1 rounded transition-colors cursor-pointer"
                title="Clicca per copiare"
              >{item.asin}</span>
              {item.unreadAlerts > 0 && (
                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                  {item.unreadAlerts} alert
                </span>
              )}
              {item.rulesCount > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full">
                  {item.rulesCount} regole
                </span>
              )}
            </div>
            <p className="text-sm text-white truncate mt-0.5">{item.product_name ?? "—"}</p>
            {item.sku && (
              <span
                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(item.sku); toast.success(`SKU ${item.sku} copiato`); }}
                className="text-xs text-zinc-600 hover:text-white hover:bg-zinc-700 px-1 rounded transition-colors mt-0.5 cursor-pointer"
                title="Clicca per copiare"
              >SKU: {item.sku}</span>
            )}
          </div>
          {/* Stock totale + res/inb pool EU */}
          {item.countries?.length > 0 && (() => {
            const total = item.countries.reduce((s, c) => s + (c.quantity ?? 0), 0);
            const poolRow = item.countries.find(c => (c.reserved_qty ?? 0) > 0 || (c.inbound_receiving ?? 0) > 0);
            const res = poolRow?.reserved_qty ?? 0;
            const inb = poolRow?.inbound_receiving ?? 0;
            return (
              <div className="flex-shrink-0 text-right">
                <p className={`text-lg font-bold ${total > 0 ? "text-white" : "text-red-400"}`}>
                  {total.toLocaleString("it-IT")}
                </p>
                <p className="text-xs text-zinc-500 flex items-center gap-1 justify-end">
                  <Flag code="eu" /> Totale
                </p>
                {(res > 0 || inb > 0) && (
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {res > 0 && <span>+{res} res.</span>}
                    {res > 0 && inb > 0 && " "}
                    {inb > 0 && <span>+{inb} inb.</span>}
                  </p>
                )}
              </div>
            );
          })()}
          {espanso ? <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
        </button>

        {/* Azioni rapide */}
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => navigate(`/uffici/listing/testo/${item.asin}/${primaCountry}`)} title="Testo listing" className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <button onClick={() => navigate(`/uffici/listing/immagini/${item.asin}/${primaCountry}`)} title="Immagini" className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            <Image className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <button onClick={() => navigate(`/uffici/listing/aplus/${item.asin}/${primaCountry}`)} title="A+" className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            <Star className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <button onClick={() => navigate(`/europe/alert-config/${item.asin}`)} title="Alert" className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Espansione: griglia unificata per paese */}
      {espanso && (
        <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-950/50">
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
              red:    { bg: 'bg-red-900/70',     label: 'text-red-400',     value: 'text-red-100',     sub: 'text-red-400/80'    },
              orange: { bg: 'bg-orange-900/70',   label: 'text-orange-400',  value: 'text-orange-100',  sub: 'text-orange-400/80'  },
              green:  { bg: 'bg-emerald-900/70',  label: 'text-emerald-400', value: 'text-emerald-100', sub: 'text-emerald-400/80' },
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

            if (!paesi.length) return <p className="text-xs text-zinc-600">Nessun dato. Effettua un sync.</p>;

            return (
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {paesi.map(cc => {
                    const stock = stockMap[cc];
                    const prezzo = prezziMap[cc];
                    const img = imgMap[cc];
                    const isGB = cc === 'GB';
                    const qty = stock?.quantity ?? 0;
                    const stockColor = stockColorClass(cc, qty);
                    const sc = STOCK_COLORS[stockColor];
                    const { native } = prezzo ? formatPrice(prezzo.prezzo, prezzo.currency) : { native: null };

                    return (
                      <div key={cc} className={`w-28 flex-shrink-0 rounded-xl p-2.5 flex flex-col gap-1.5 ${isGB ? 'bg-blue-900/20 border border-blue-700/30' : 'bg-zinc-800/50'}`}>
                        {/* Header: bandiera + paese */}
                        <div className="flex flex-col items-center gap-1 pb-1.5 border-b border-zinc-700/50">
                          <Flag code={cc} className="h-5 w-auto" />
                          <span className="text-xs font-medium text-zinc-400">{cc}</span>
                        </div>

                        {/* Stock */}
                        <div className={`text-center rounded-lg p-1.5 ${sc ? sc.bg : ''}`}>
                          <p className={`text-xs mb-0.5 ${sc ? sc.label : 'text-zinc-600'}`}>Stock</p>
                          <p className={`text-base font-bold ${sc ? sc.value : qty > 0 ? 'text-white' : 'text-zinc-600'}`}>
                            {stock ? qty.toLocaleString("it-IT") : "—"}
                          </p>
                        </div>

                        {/* Prezzo */}
                        <div className="text-center border-t border-zinc-700/50 pt-1.5">
                          <p className="text-xs text-zinc-600 mb-0.5">Prezzo</p>
                          {native
                            ? <>
                                <p className="text-sm font-bold text-white">{native}</p>
                                <p className={`text-xs mt-0.5 ${prezzo.buybox_won ? "text-emerald-400" : "text-zinc-600"}`}>
                                  {prezzo.buybox_won ? "✓ BuyBox" : "– BuyBox"}
                                </p>
                              </>
                            : <p className="text-xs text-zinc-700">—</p>
                          }
                        </div>

                        {/* Listing */}
                        <div className="border-t border-zinc-700/50 pt-1.5">
                          <p className="text-xs text-zinc-600 mb-1 text-center">Listing</p>
                          {loadingImages
                            ? <div className="w-full h-12 bg-zinc-700/50 rounded animate-pulse" />
                            : img?.image_url
                              ? <div className="relative">
                                  <img src={img.image_url} alt="" className="w-full h-12 object-contain bg-white rounded p-0.5" />
                                  {img.image_count > 0 && (
                                    <span className="absolute -top-1 -right-1 text-xs bg-zinc-900 text-zinc-300 px-1 rounded-full leading-tight border border-zinc-700">
                                      {img.image_count}
                                    </span>
                                  )}
                                </div>
                              : <div className="w-full h-12 bg-zinc-700/30 rounded flex items-center justify-center">
                                  <Package className="w-3.5 h-3.5 text-zinc-600" />
                                </div>
                          }
                          {img?.titolo && (
                            <p className="text-xs text-zinc-600 line-clamp-2 mt-1" title={img.titolo}>{img.titolo}</p>
                          )}
                          <div className="flex gap-1 mt-1.5 justify-center">
                            <button onClick={() => navigate(`/uffici/listing/testo/${item.asin}/${cc}`)}
                              className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded transition-all" title="Testo listing">
                              <FileText className="w-3 h-3 text-zinc-400" />
                            </button>
                            <button onClick={() => navigate(`/uffici/listing/immagini/${item.asin}/${cc}`)}
                              className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400 transition-all" title="Immagini">
                              <Image className="w-3 h-3" />
                            </button>
                            <button onClick={() => navigate(`/uffici/listing/aplus/${item.asin}/${cc}`)}
                              className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400 transition-all" title="A+">
                              <Star className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {item.prezzi?.length > 0 && (
            <p className="text-xs text-zinc-700 mt-2">Tassi fissi: £1=€1.17 · zł1=€0.23 · kr1=€0.087</p>
          )}

          <p className="text-xs text-zinc-700 mt-3">
            Aggiornato: {item.updated_at ? new Date(item.updated_at).toLocaleString("it-IT") : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
