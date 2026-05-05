import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import PageTopBar from "../components/PageTopBar";
import {
  DollarSign,
  Search,
  Loader2,
  RefreshCw,
  Upload,
  History,
  AlertTriangle,
  CheckCircle2,
  Tag,
  BadgeCheck,
} from "lucide-react";

const MARKETPLACES = [
  { code: "IT", label: "Italia",   id: "APJ6JRA9NG5V4" },
  { code: "DE", label: "Germania", id: "A1PA6795UKMFR9" },
  { code: "FR", label: "Francia",  id: "A13V1IB3VIYZZH" },
  { code: "ES", label: "Spagna",   id: "A1RKKUPIHCS9HS" },
  { code: "GB", label: "UK",       id: "A1F83G8C2ARO7P" },
];

const fmtEur = (v) => v == null ? "—" : `€ ${Number(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("it-IT"); } catch { return iso; }
};
const flagCode = (c) => ({ UK: "gb", GB: "gb" }[c] || c?.toLowerCase());

export default function PrezziAmazon() {
  const [mode, setMode] = useState("single"); // "single" | "bulk"
  const [sku, setSku] = useState("");
  const [marketplaceId, setMarketplaceId] = useState(MARKETPLACES[0].id);
  const [priceInfo, setPriceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [log, setLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);

  // Bulk update
  const [bulkText, setBulkText] = useState("");
  const [bulkMarketplaceId, setBulkMarketplaceId] = useState(MARKETPLACES[0].id);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);

  const loadPriceInfo = useCallback(async (fresh = false) => {
    const skuClean = sku.trim();
    if (!skuClean) { toast.error("Inserisci un SKU"); return; }
    setLoadingInfo(true);
    if (!fresh) setPriceInfo(null);
    try {
      const url = `/api/v2/listings-amazon/price-info?sku=${encodeURIComponent(skuClean)}&marketplaceId=${marketplaceId}${fresh ? "&fresh=1" : ""}`;
      const r = await fetch(url);
      const j = await r.json();
      if (!j.ok) {
        toast.error(j.error || "Errore lettura prezzo");
        return;
      }
      setPriceInfo(j);
      if (j.prezzo != null) setNewPrice(String(j.prezzo));
      if (fresh) {
        if (j.live_error) toast.error(`Refresh fallito: ${j.live_error}`);
        else toast.success(`Prezzo aggiornato da Amazon · € ${Number(j.prezzo).toFixed(2)}`);
      }
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setLoadingInfo(false);
    }
  }, [sku, marketplaceId]);

  // Parsing bulk: supporta CSV/TSV o "sku,prezzo" per riga. Ignora intestazione se presente.
  const parseBulk = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items = [];
    for (const line of lines) {
      // Salta header se prima parola contiene "sku" (case-insensitive)
      if (/^sku/i.test(line) && /price|prezzo/i.test(line)) continue;
      const parts = line.split(/[,;\t]+/).map(p => p.trim());
      if (parts.length < 2) continue;
      const skuP = parts[0];
      const priceP = Number(String(parts[1]).replace(",", "."));
      if (!skuP || !Number.isFinite(priceP) || priceP <= 0) continue;
      items.push({ sku: skuP, price: priceP });
    }
    return items;
  };

  const submitBulk = async () => {
    const items = parseBulk(bulkText).map(it => ({ ...it, marketplaceId: bulkMarketplaceId, currency: "EUR" }));
    if (items.length === 0) { toast.error("Nessuna riga valida. Formato: sku,prezzo per ogni riga"); return; }
    if (!window.confirm(`Stai per aggiornare ${items.length} SKU su ${bulkMarketplaceId}. Procedo?`)) return;
    setBulkRunning(true);
    setBulkResults(null);
    try {
      const r = await fetch("/api/v2/listings-amazon/price-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const j = await r.json();
      if (!j.ok) { toast.error(j.error || "Bulk fallito"); return; }
      setBulkResults(j);
      toast.success(`Bulk completato · ${j.ok_count}/${j.total} ok`);
      await loadLog();
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setBulkRunning(false);
    }
  };

  const verifySubmission = async (row) => {
    try {
      const r = await fetch(`/api/v2/listings-amazon/price-submission?sku=${encodeURIComponent(row.sku)}&marketplaceId=${row.marketplace_id}&logId=${row.id}`);
      const j = await r.json();
      if (!j.ok) { toast.error(j.error || "Verifica fallita"); return; }
      if (j.status === "OK") toast.success("Nessun issue rilevato · listing valido");
      else if (j.status === "WARNING") toast.warning(`${j.issues.length} warning rilevati`);
      else toast.error(`${j.issues.length} error · ${j.issues[0]?.message || ""}`);
      await loadLog();
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    }
  };

  const loadLog = useCallback(async () => {
    setLoadingLog(true);
    try {
      const url = sku.trim()
        ? `/api/v2/listings-amazon/price-log?sku=${encodeURIComponent(sku.trim())}&limit=30`
        : `/api/v2/listings-amazon/price-log?limit=30`;
      const r = await fetch(url);
      const j = await r.json();
      if (j.ok) setLog(j.items);
    } catch {} finally { setLoadingLog(false); }
  }, [sku]);

  useEffect(() => { loadLog(); }, [loadLog]);

  const submitPrice = async () => {
    const skuClean = sku.trim();
    const p = Number(String(newPrice).replace(",", "."));
    if (!skuClean) { toast.error("Inserisci SKU"); return; }
    if (!Number.isFinite(p) || p <= 0) { toast.error("Prezzo non valido"); return; }
    if (priceInfo?.prezzo != null && p === Number(priceInfo.prezzo)) {
      toast.info("Il nuovo prezzo è uguale a quello attuale");
      return;
    }
    if (!window.confirm(`Confermi l'aggiornamento prezzo su Amazon?\n\nSKU: ${skuClean}\nMercato: ${marketplaceId}\nNuovo prezzo: € ${p.toFixed(2)}`)) return;

    setSubmitting(true);
    try {
      const r = await fetch(`/api/v2/listings-amazon/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: skuClean, marketplaceId, price: p, currency: "EUR" }),
      });
      const j = await r.json();
      if (!j.ok) {
        const detail = typeof j.data === "object" ? JSON.stringify(j.data) : (j.data || j.error || "Errore");
        toast.error(`Patch fallita · ${detail}`);
        await loadLog();
        return;
      }
      toast.success(`Prezzo inviato ad Amazon · submission ${j.submissionId || "(pending)"}`);
      await loadPriceInfo();
      await loadLog();
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const currentMkt = MARKETPLACES.find(m => m.id === marketplaceId);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <PageTopBar
        icon={DollarSign}
        iconAccent="emerald"
        eyebrow="SP-API · Listings Items"
        title="Scrittura prezzi su Amazon"
        backTo="/dashboard"
      />

      {/* Hero */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Gestione prezzi</div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight">
            Aggiorna il prezzo <span className="text-slate-500">direttamente da qui</span>
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Invia un PATCH a <code className="text-emerald-300">purchasable_offer</code> su Amazon SP-API per lo SKU selezionato nel marketplace scelto.
            La variazione viene anche salvata nello snapshot locale e registrata in un log interno.
          </p>
        </div>
      </section>

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-4 pb-16 space-y-6">

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-slate-800 pb-0">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${mode === "single" ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            Singolo SKU
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${mode === "bulk" ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            Bulk (CSV)
          </button>
        </div>

        {/* Form principale (modalità singola) */}
        {mode === "single" && (
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
          <div className="px-6 py-5 sm:px-8 sm:py-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5"><Tag className="w-3 h-3" /> SKU</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") loadPriceInfo(); }}
                    placeholder="Es. BW-04QR-KNSR"
                    className="flex-1 bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono"
                  />
                  <button
                    onClick={loadPriceInfo}
                    disabled={loadingInfo || !sku.trim()}
                    type="button"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-medium border bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/40 text-emerald-300 disabled:opacity-50"
                  >
                    {loadingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Leggi
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Marketplace</label>
                <select
                  value={marketplaceId}
                  onChange={e => { setMarketplaceId(e.target.value); setPriceInfo(null); }}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/60 appearance-none cursor-pointer"
                >
                  {MARKETPLACES.map(m => <option key={m.id} value={m.id}>{m.code} · {m.label}</option>)}
                </select>
              </div>
            </div>

            {/* Info prezzo attuale */}
            {priceInfo && (() => {
              const snapMs = priceInfo.snapshot_at ? new Date(priceInfo.snapshot_at).getTime() : null;
              const ageHours = snapMs ? (Date.now() - snapMs) / 3600000 : null;
              const isStale = ageHours != null && ageHours > 24;
              return (
                <div className={`rounded-lg border ${isStale ? "border-amber-500/40 bg-amber-500/5" : "border-slate-700/60 bg-slate-800/20"} p-4`}>
                  <div className="flex items-start gap-4 flex-wrap">
                    <img src={`https://flagcdn.com/24x18/${flagCode(currentMkt?.code)}.png`} alt={currentMkt?.code} className="w-6 h-4 rounded-sm mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-emerald-400 text-[12px]">{priceInfo.sku}</span>
                        {priceInfo.asin && <span className="text-[10px] text-slate-500">·</span>}
                        {priceInfo.asin && <span className="font-mono text-slate-300 text-[11px]">{priceInfo.asin}</span>}
                        {priceInfo.buybox_won === 1 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">BuyBox</span>}
                        {priceInfo.source === "live" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300">LIVE</span>}
                      </div>
                      {priceInfo.titolo && <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{priceInfo.titolo}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Il tuo prezzo</div>
                      <div className="text-2xl font-bold text-white tabular-nums">{fmtEur(priceInfo.prezzo)}</div>
                      {priceInfo.snapshot_at && (
                        <div className={`text-[10px] ${isStale ? "text-amber-400" : "text-slate-600"}`}>
                          {priceInfo.source === "live" ? "ora" : `snapshot ${fmtDate(priceInfo.snapshot_at)}`}
                        </div>
                      )}
                      <button
                        onClick={() => loadPriceInfo(true)}
                        disabled={loadingInfo}
                        type="button"
                        className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/40 text-sky-300 disabled:opacity-50"
                        title="Interroga Amazon in tempo reale e aggiorna la cache"
                      >
                        {loadingInfo ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Aggiorna da Amazon
                      </button>
                    </div>
                  </div>

                  {/* Dettaglio Live: mio prezzo / BuyBox / più basso */}
                  {priceInfo.source === "live" && (priceInfo.my_price != null || priceInfo.buybox_price != null || priceInfo.lowest_price != null) && (
                    <div className="mt-3 pt-3 border-t border-slate-700/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className={`rounded-md border p-2.5 ${priceInfo.i_am_buybox ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-700/50 bg-slate-800/30"}`}>
                        <div className="text-[9px] uppercase tracking-wider text-slate-500">Il tuo prezzo</div>
                        <div className="text-base font-bold text-white tabular-nums">{fmtEur(priceInfo.my_price)}</div>
                        {priceInfo.i_am_buybox && <div className="text-[9px] text-emerald-400">✓ Hai la BuyBox</div>}
                      </div>
                      <div className={`rounded-md border p-2.5 ${!priceInfo.i_am_buybox && priceInfo.buybox_price != null ? "border-sky-500/40 bg-sky-500/5" : "border-slate-700/50 bg-slate-800/30"}`}>
                        <div className="text-[9px] uppercase tracking-wider text-slate-500">BuyBox (pagina Amazon)</div>
                        <div className="text-base font-bold text-white tabular-nums">{fmtEur(priceInfo.buybox_price)}</div>
                        {!priceInfo.i_am_buybox && priceInfo.buybox_price != null && priceInfo.my_price != null && priceInfo.buybox_price < priceInfo.my_price && (
                          <div className="text-[9px] text-rose-400">tu sei +€ {(priceInfo.my_price - priceInfo.buybox_price).toFixed(2)}</div>
                        )}
                      </div>
                      <div className="rounded-md border border-slate-700/50 bg-slate-800/30 p-2.5">
                        <div className="text-[9px] uppercase tracking-wider text-slate-500">Prezzo più basso</div>
                        <div className="text-base font-bold text-white tabular-nums">{fmtEur(priceInfo.lowest_price)}</div>
                        <div className="text-[9px] text-slate-500">{priceInfo.offers_count ?? 0} offers totali</div>
                      </div>
                    </div>
                  )}
                  {isStale && priceInfo.source !== "live" && (
                    <div className="mt-3 flex items-start gap-2 text-[11px] text-amber-300/90">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        Il prezzo in cache è di {Math.round(ageHours)} ore fa — potrebbe non rispecchiare il valore reale su Amazon.
                        Clicca "Aggiorna da Amazon" per fare una lettura live.
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Nuovo prezzo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Nuovo prezzo (IVA inclusa)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-md pl-7 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 tabular-nums"
                  />
                </div>
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <button
                  onClick={submitPrice}
                  disabled={submitting || !sku.trim() || !newPrice}
                  type="button"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold border bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/50 hover:border-emerald-400/70 text-emerald-200 disabled:opacity-50 transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Applica a Amazon
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 text-[11px] text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-md p-3">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div>
                La modifica viene inviata alle API di Amazon. In caso di SKU non gestito o productType errato la richiesta può essere respinta. Controlla sempre lo stato della submission nel log sotto.
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Pannello Bulk */}
        {mode === "bulk" && (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
            <div className="px-6 py-5 sm:px-8 sm:py-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md border bg-emerald-500/10 border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <Upload className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Aggiornamento multiplo</span>
                  <h3 className="text-sm font-semibold text-white -mt-0.5">Bulk update prezzi</h3>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Incolla un elenco <code className="text-emerald-300">sku,prezzo</code> (una riga per SKU). Max 100 righe per batch. Separatore: virgola, punto-e-virgola o tab. L'intestazione se presente viene ignorata.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-3">
                  <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Righe (sku,prezzo)</label>
                  <textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    rows={8}
                    placeholder={"SKU,prezzo\nBW-04QR-KNSR,12.99\nFV-NY3A-L1D6,6.99"}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Marketplace</label>
                  <select
                    value={bulkMarketplaceId}
                    onChange={e => setBulkMarketplaceId(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/60 appearance-none cursor-pointer"
                  >
                    {MARKETPLACES.map(m => <option key={m.id} value={m.id}>{m.code} · {m.label}</option>)}
                  </select>
                  <div className="mt-3 text-[10px] text-slate-500">
                    Righe valide: <strong className="text-white">{parseBulk(bulkText).length}</strong>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={submitBulk}
                  disabled={bulkRunning || parseBulk(bulkText).length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold border bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/50 text-emerald-200 disabled:opacity-50"
                >
                  {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Invia a Amazon
                </button>
              </div>

              {bulkResults && (
                <div className="rounded-md border border-slate-700/50 bg-slate-800/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300 mb-2">
                    <span>Risultato:</span>
                    <span className="text-emerald-400 font-bold">{bulkResults.ok_count} ok</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-rose-400 font-bold">{bulkResults.ko_count} errore</span>
                    <span className="text-slate-500">su {bulkResults.total}</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-left text-[9px] uppercase tracking-wider text-slate-500 border-b border-slate-700/50">
                          <th className="py-1.5 pr-2">SKU</th>
                          <th className="py-1.5 pr-2 text-right">Vecchio</th>
                          <th className="py-1.5 pr-2 text-right">Nuovo</th>
                          <th className="py-1.5 pr-2">Esito</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {bulkResults.results.map((r, i) => (
                          <tr key={i}>
                            <td className="py-1 pr-2 font-mono text-emerald-400">{r.sku}</td>
                            <td className="py-1 pr-2 text-right tabular-nums text-slate-400">{fmtEur(r.oldPrice)}</td>
                            <td className="py-1 pr-2 text-right tabular-nums text-white">{fmtEur(r.newPrice)}</td>
                            <td className="py-1 pr-2">
                              {r.ok ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> inviato</span>
                              ) : (
                                <span title={r.error} className="inline-flex items-center gap-1 text-rose-400"><AlertTriangle className="w-3 h-3" /> {String(r.error || "errore").slice(0, 60)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Log */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-400/60" />
          <div className="px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md border bg-sky-500/10 border-sky-500/40 text-sky-400 flex items-center justify-center">
                <History className="w-[18px] h-[18px]" />
              </div>
              <div className="flex-1">
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Storico</span>
                <h3 className="text-sm font-semibold text-white -mt-0.5">Ultime modifiche prezzo inviate</h3>
              </div>
              <button onClick={loadLog} disabled={loadingLog} type="button" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-50">
                {loadingLog ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Ricarica
              </button>
            </div>

            {loadingLog ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-sky-400 animate-spin" /></div>
            ) : log.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">Nessun aggiornamento prezzo registrato.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <th className="py-2 pr-3">Quando</th>
                      <th className="py-2 pr-3">SKU</th>
                      <th className="py-2 pr-3">Mercato</th>
                      <th className="py-2 pr-3 text-right">Vecchio</th>
                      <th className="py-2 pr-3 text-right">Nuovo</th>
                      <th className="py-2 pr-3">Stato</th>
                      <th className="py-2 pr-3">Submission</th>
                      <th className="py-2 pr-3 text-right">Verifica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {log.map(row => {
                      const mkt = MARKETPLACES.find(m => m.id === row.marketplace_id);
                      const ok = !row.error && (row.status || "").toUpperCase() !== "ERROR";
                      return (
                        <tr key={row.id} className="hover:bg-slate-800/20">
                          <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{fmtDate(row.created_at)}</td>
                          <td className="py-2 pr-3 font-mono text-emerald-400">{row.sku}</td>
                          <td className="py-2 pr-3 text-slate-300">{mkt?.code || row.marketplace_id}</td>
                          <td className="py-2 pr-3 text-right text-slate-400 tabular-nums">{fmtEur(row.old_price)}</td>
                          <td className="py-2 pr-3 text-right text-white tabular-nums font-semibold">{fmtEur(row.new_price)}</td>
                          <td className="py-2 pr-3">
                            {ok ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" /> {row.status || "Inviato"}
                              </span>
                            ) : (
                              <span title={row.error || ""} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/40 text-rose-300">
                                <AlertTriangle className="w-3 h-3" /> {row.status || "Errore"}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3 font-mono text-[10px] text-slate-500">{row.submission_id || "—"}</td>
                          <td className="py-2 pr-3 text-right">
                            <button
                              type="button"
                              onClick={() => verifySubmission(row)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/40 text-sky-300"
                              title="Verifica lo stato del listing su Amazon (issues API)"
                            >
                              <BadgeCheck className="w-3 h-3" /> Verifica
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
