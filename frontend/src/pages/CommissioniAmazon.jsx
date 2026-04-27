import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Percent,
  Loader2,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Save,
  Search,
  Zap,
} from "lucide-react";

const MARKETPLACES = [
  { code: "IT", label: "Italia" },
  { code: "DE", label: "Germania" },
  { code: "FR", label: "Francia" },
  { code: "ES", label: "Spagna" },
  { code: "UK", label: "UK" },
  { code: "NL", label: "Paesi Bassi" },
  { code: "BE", label: "Belgio" },
  { code: "PL", label: "Polonia" },
  { code: "IE", label: "Irlanda" },
];

const fmtEur = (v) => v == null ? "—" : `€ ${Number(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("it-IT"); } catch { return iso; }
};

export default function CommissioniAmazon() {
  const navigate = useNavigate();
  const [country, setCountry] = useState("IT");
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [results, setResults] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [marketplaceId, setMarketplaceId] = useState(null);
  const [filter, setFilter] = useState("");
  const [priceOverride, setPriceOverride] = useState({}); // asin → prezzo custom
  const [expandedRaw, setExpandedRaw] = useState(new Set()); // indici righe con raw detail aperto

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    setResults(null);
    setSelected(new Set());
    try {
      const r = await fetch(`/api/v2/reports-amazon/fba-fees/candidates?country=${country}`, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) { toast.error(j.error || "Errore"); return; }
      setCandidates(j.items);
      setMarketplaceId(j.marketplaceId);
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setLoadingCandidates(false);
    }
  }, [country]);

  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  const filteredCandidates = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(c =>
      (c.asin || "").toLowerCase().includes(q) ||
      (c.sku || "").toLowerCase().includes(q) ||
      (c.titolo || "").toLowerCase().includes(q)
    );
  }, [candidates, filter]);

  const toggleAll = () => {
    if (selected.size === filteredCandidates.length) setSelected(new Set());
    else setSelected(new Set(filteredCandidates.map(c => c.asin)));
  };

  // Seleziona i prossimi 50 ASIN non ancora processati via API.
  // Utile per elaborare un intero catalogo a batch: premi, elabora, conferma, ripeti.
  const selectNextBatch = () => {
    const pending = filteredCandidates.filter(c => c.source_attuale !== "api");
    if (pending.length === 0) {
      toast.info("Tutti gli ASIN filtrati hanno già fee da API. Nessun batch da processare.");
      return;
    }
    const next = pending.slice(0, 50).map(c => c.asin);
    setSelected(new Set(next));
    toast.success(`Selezionati ${next.length} ASIN non ancora via API (${pending.length - next.length} rimasti dopo questo batch)`);
  };
  const toggleOne = (asin) => {
    const s = new Set(selected);
    if (s.has(asin)) s.delete(asin);
    else s.add(asin);
    setSelected(s);
  };

  const fetchFees = async () => {
    if (selected.size === 0) { toast.error("Seleziona almeno un ASIN"); return; }
    if (selected.size > 50) { toast.error("Massimo 50 ASIN per batch"); return; }
    const items = candidates
      .filter(c => selected.has(c.asin))
      .map(c => {
        const override = priceOverride[c.asin];
        const priceToUse = override != null && override !== "" ? Number(String(override).replace(",", ".")) : c.prezzo;
        return { asin: c.asin, sku: c.sku, price: priceToUse, marketplaceId, currency: c.currency || "EUR" };
      });
    if (!window.confirm(`Richiedere a Amazon le commissioni stimate per ${items.length} ASIN su ${country}?\n\nTempo stimato: ~${Math.ceil(items.length * 1.1)}s`)) return;

    setFetching(true);
    setResults(null);
    try {
      const r = await fetch("/api/v2/reports-amazon/fba-fees/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const j = await r.json();
      if (!j.ok) { toast.error(j.error || "Errore fetch"); return; }
      setResults(j);
      if (j.ok_count === 0) toast.error(`Tutte le chiamate fallite. Possibile 403 (permessi mancanti).`);
      else toast.success(`Ricevute ${j.ok_count}/${j.total} fee da Amazon`);
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setFetching(false);
    }
  };

  const confirmSave = async () => {
    if (!results?.results) return;
    const okOnly = results.results.filter(r => r.ok).map(r => ({
      asin: r.asin, sku: r.sku, marketplaceId: r.marketplaceId,
      referral_fee: r.referral_fee, fulfillment_fee: r.fulfillment_fee,
      total_fee: r.total_fee, price_used: r.price_used,
    }));
    if (okOnly.length === 0) { toast.error("Nessun risultato valido da salvare"); return; }
    if (!window.confirm(`Confermi il salvataggio di ${okOnly.length} fee nel DB (source='api')?\n\nSovrascriveranno le fee esistenti per gli stessi ASIN/country.`)) return;

    setSaving(true);
    try {
      const r = await fetch("/api/v2/reports-amazon/fba-fees/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: okOnly }),
      });
      const j = await r.json();
      if (!j.ok) { toast.error(j.error || "Errore"); return; }
      toast.success(`Salvate ${j.saved} fee nel DB`);
      await loadCandidates();
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const errori = results?.results?.filter(r => !r.ok) || [];
  const has403 = errori.some(e => e.status === 403);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} type="button" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-200 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-md bg-rose-500/10 border border-rose-500/40 flex items-center justify-center">
            <Percent className="w-[18px] h-[18px] text-rose-400" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-white">Commissioni Amazon</span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Product Fees API · stima ufficiale</span>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 pb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Workflow a 3 step</div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight">
            Chiedi ad Amazon le commissioni reali <span className="text-slate-500">e conferma il salvataggio</span>
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-3xl leading-relaxed">
            Seleziona gli ASIN, richiedi le stime ad Amazon (Product Fees API), rivedi e salva. Rate limit ~1 req/s.
            Ogni fee è mostrata sia <strong>con IVA</strong> che <strong>netto IVA</strong>.
          </p>
        </div>
      </section>

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-4 pb-16 space-y-6">

        {/* Controlli */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400/60" />
          <div className="px-6 py-5 sm:px-8 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Marketplace</label>
              <select value={country} onChange={e => setCountry(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:ring-1 focus:ring-rose-500/60">
                {MARKETPLACES.map(m => <option key={m.code} value={m.code}>{m.code} · {m.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5"><Search className="w-3 h-3" /> Filtra</label>
              <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
                placeholder="Cerca ASIN / SKU / titolo"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:ring-1 focus:ring-rose-500/60" />
            </div>
            <button onClick={loadCandidates} disabled={loadingCandidates} type="button" className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/40 text-rose-300 disabled:opacity-50">
              {loadingCandidates ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Ricarica
            </button>
          </div>
        </div>

        {/* Step 1: tabella candidati */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400/60" />
          <div className="px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="w-9 h-9 rounded-md border bg-rose-500/10 border-rose-500/40 text-rose-400 flex items-center justify-center font-bold">1</div>
              <div className="flex-1">
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Step 1</span>
                <h3 className="text-sm font-semibold text-white -mt-0.5">Seleziona gli ASIN ({filteredCandidates.length} disponibili · {selected.size} selezionati, max 50)</h3>
              </div>
              <button type="button" onClick={selectNextBatch}
                title="Seleziona i primi 50 ASIN non ancora processati via API. Premilo di nuovo dopo il salvataggio per continuare con i successivi."
                className="px-3 py-1.5 text-xs rounded-md border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300">
                Seleziona prossimi 50 (non API)
              </button>
              <button type="button" onClick={toggleAll}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300">
                {selected.size === filteredCandidates.length ? "Deseleziona tutti" : "Seleziona tutti"}
              </button>
              <button type="button" onClick={fetchFees} disabled={fetching || selected.size === 0}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md border bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/50 text-rose-200 disabled:opacity-50">
                {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Richiedi a Amazon
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              <strong>Prezzo snapshot</strong> è il valore nella cache (spesso la BuyBox corrente, può essere di un competitor).
              <strong> Prezzo per stima</strong> è il valore passato ad Amazon per il calcolo — lascia vuoto per usare lo snapshot, oppure inserisci il <em>tuo</em> prezzo di listing se vuoi una stima allineata a Seller Central.
              <span className="block mt-1">
                Per elaborare tutto il catalogo: premi <strong>"Seleziona prossimi 50 (non API)"</strong> → Richiedi → Conferma → ripremi → e così via.
                Le fee mostrano sempre <strong>lordo</strong> (grande) e <strong>netto IVA</strong> (piccolo sotto).
              </span>
            </p>
            {loadingCandidates ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-rose-400 animate-spin" /></div>
            ) : filteredCandidates.length === 0 ? (
              <p className="text-sm text-slate-500 py-6">Nessun ASIN disponibile per questo marketplace. Serve avere prezzi nello snapshot.</p>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <th className="py-2 pr-2 w-8"></th>
                      <th className="py-2 pr-3">ASIN / SKU</th>
                      <th className="py-2 pr-3">Prodotto</th>
                      <th className="py-2 pr-3 text-right">Prezzo snapshot</th>
                      <th className="py-2 pr-3 text-right">Prezzo per stima</th>
                      <th className="py-2 pr-3 text-right">Fee (IVA incl.)</th>
                      <th className="py-2 pr-3 text-right">Fee (no IVA)</th>
                      <th className="py-2 pr-3">Fonte</th>
                      <th className="py-2 pr-3">Aggiornato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredCandidates.map(c => {
                      const isSel = selected.has(c.asin);
                      return (
                        <tr key={c.asin} className={`hover:bg-slate-800/30 cursor-pointer ${isSel ? "bg-rose-500/5" : ""}`} onClick={() => toggleOne(c.asin)}>
                          <td className="py-2 pr-2">
                            <input type="checkbox" checked={isSel} readOnly className="accent-rose-500" />
                          </td>
                          <td className="py-2 pr-3">
                            <div className="flex flex-col">
                              <span className="font-mono text-emerald-400">{c.asin}</span>
                              {c.sku && <span className="text-[10px] text-slate-500 font-mono">{c.sku}</span>}
                            </div>
                          </td>
                          <td className="py-2 pr-3 min-w-[220px]">
                            <div className="flex items-center gap-2">
                              {c.image_url && <img src={c.image_url} alt="" className="w-8 h-8 rounded border border-slate-700/50 object-cover flex-shrink-0" onError={e => e.currentTarget.style.display = "none"} />}
                              <span className="text-white line-clamp-2">{c.titolo || "—"}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtEur(c.prezzo)}</td>
                          <td className="py-2 pr-3 text-right" onClick={e => e.stopPropagation()}>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder={c.prezzo != null ? Number(c.prezzo).toFixed(2) : ""}
                              value={priceOverride[c.asin] ?? ""}
                              onChange={e => setPriceOverride({ ...priceOverride, [c.asin]: e.target.value })}
                              className="w-20 bg-slate-800/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-white tabular-nums text-right focus:ring-1 focus:ring-rose-500/60"
                              title="Prezzo con cui chiedere la stima (lascia vuoto per usare lo snapshot)"
                            />
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-300">{c.fee_attuale != null ? fmtEur(c.fee_attuale) : "—"}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-400">{c.fee_attuale_net != null ? fmtEur(c.fee_attuale_net) : "—"}</td>
                          <td className="py-2 pr-3">
                            {c.source_attuale === "api" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-300">
                                <Zap className="w-3 h-3" /> API
                              </span>
                            ) : c.source_attuale === "formula" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-700/40 border border-slate-600/50 text-slate-400">formula</span>
                            ) : (
                              <span className="text-[10px] text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-[10px] text-slate-500">{fmtDate(c.updated_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Step 2/3: risultati e conferma */}
        {results && (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />
            <div className="px-6 py-5 sm:px-8">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="w-9 h-9 rounded-md border bg-amber-500/10 border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">2</div>
                <div className="flex-1">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Step 2 · Rivedi</span>
                  <h3 className="text-sm font-semibold text-white -mt-0.5">
                    Risposta Amazon · <span className="text-emerald-400">{results.ok_count} ok</span>
                    {results.ko_count > 0 && <> · <span className="text-rose-400">{results.ko_count} errore</span></>}
                  </h3>
                </div>
                <button type="button" onClick={confirmSave} disabled={saving || results.ok_count === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/50 text-emerald-200 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Conferma e salva nel DB
                </button>
              </div>

              {has403 && (
                <div className="mb-4 flex items-start gap-2 text-[11px] text-rose-300/90 bg-rose-500/10 border border-rose-500/40 rounded-md p-3">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Permessi mancanti (403).</strong> La tua app SP-API non ha il ruolo <em>Pricing</em> abilitato per Product Fees API.
                    Vai su Seller Central → App Developer → Edit App → Roles e attiva "Pricing".
                    In alternativa continua a usare la formula (15% + €{"{"}3.20{"}"}) che è già il default.
                  </div>
                </div>
              )}

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <th rowSpan={2} className="py-2 pr-3 align-bottom">ASIN</th>
                      <th rowSpan={2} className="py-2 pr-3 text-right align-bottom">Prezzo</th>
                      <th colSpan={2} className="py-1 pr-3 text-center border-l border-slate-800/70">Referral</th>
                      <th colSpan={2} className="py-1 pr-3 text-center border-l border-slate-800/70">Fulfillment</th>
                      <th colSpan={2} className="py-1 pr-3 text-center border-l border-slate-800/70">Variable</th>
                      <th colSpan={2} className="py-1 pr-3 text-center border-l border-slate-800/70">Totale</th>
                      <th colSpan={2} className="py-1 pr-3 text-center border-l border-slate-800/70">% su prezzo</th>
                      <th rowSpan={2} className="py-2 pr-3 align-bottom">Esito</th>
                      <th rowSpan={2} className="py-2 pr-3 text-right align-bottom">Raw</th>
                    </tr>
                    <tr className="text-[9px] uppercase tracking-wider text-slate-600 border-b border-slate-800/70">
                      <th className="pb-1 pr-3 text-right font-normal border-l border-slate-800/70">IVA incl.</th>
                      <th className="pb-1 pr-3 text-right font-normal">no IVA</th>
                      <th className="pb-1 pr-3 text-right font-normal border-l border-slate-800/70">IVA incl.</th>
                      <th className="pb-1 pr-3 text-right font-normal">no IVA</th>
                      <th className="pb-1 pr-3 text-right font-normal border-l border-slate-800/70">IVA incl.</th>
                      <th className="pb-1 pr-3 text-right font-normal">no IVA</th>
                      <th className="pb-1 pr-3 text-right font-normal border-l border-slate-800/70">IVA incl.</th>
                      <th className="pb-1 pr-3 text-right font-normal">no IVA</th>
                      <th className="pb-1 pr-3 text-right font-normal border-l border-slate-800/70">IVA incl.</th>
                      <th className="pb-1 pr-3 text-right font-normal">no IVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {results.results.map((r, i) => {
                      const pct = r.ok && r.price_used > 0 ? (r.total_fee / r.price_used * 100) : null;
                      const pctNet = r.ok && r.price_used > 0 && r.total_fee_net != null ? (r.total_fee_net / r.price_used * 100) : null;
                      const isExp = expandedRaw.has(i);
                      return (
                        <React.Fragment key={i}>
                          <tr>
                            <td className="py-2 pr-3 font-mono text-emerald-400">{r.asin}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{r.ok ? fmtEur(r.price_used) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums border-l border-slate-800/70">{r.ok ? fmtEur(r.referral_fee) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-slate-400">{r.ok ? fmtEur(r.referral_fee_net) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums border-l border-slate-800/70">{r.ok ? fmtEur(r.fulfillment_fee) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-slate-400">{r.ok ? fmtEur(r.fulfillment_fee_net) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums border-l border-slate-800/70">{r.ok && r.variable_closing_fee ? fmtEur(r.variable_closing_fee) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-slate-400">{r.ok && r.variable_closing_fee_net ? fmtEur(r.variable_closing_fee_net) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums font-semibold text-white border-l border-slate-800/70">{r.ok ? fmtEur(r.total_fee) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums font-semibold text-emerald-300">{r.ok ? fmtEur(r.total_fee_net) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-rose-300 border-l border-slate-800/70">{pct != null ? `${pct.toFixed(1)}%` : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-slate-400">{pctNet != null ? `${pctNet.toFixed(1)}%` : "—"}</td>
                            <td className="py-2 pr-3">
                              {r.ok ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]"><CheckCircle2 className="w-3 h-3" /> ok</span>
                              ) : (
                                <span title={r.error} className="inline-flex items-center gap-1 text-rose-400 text-[11px]"><AlertTriangle className="w-3 h-3" /> {r.status || "err"} · {String(r.error || "").slice(0, 60)}</span>
                              )}
                            </td>
                            <td className="py-2 pr-3 text-right">
                              {r.ok && r.raw_fee_detail?.length > 0 && (
                                <button type="button" onClick={() => {
                                  const s = new Set(expandedRaw);
                                  if (s.has(i)) s.delete(i); else s.add(i);
                                  setExpandedRaw(s);
                                }} className="text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300">
                                  {isExp ? "Nascondi" : "Mostra"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExp && r.raw_fee_detail && (
                            <tr className="bg-slate-800/20">
                              <td colSpan={15} className="px-3 py-2">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Breakdown raw (Product Fees API)</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {r.raw_fee_detail.map((f, k) => (
                                    <div key={k} className="rounded border border-slate-700/50 bg-slate-900/40 p-2 text-[11px]">
                                      <div className="flex items-center justify-between">
                                        <span className="text-white font-medium">{f.FeeType || "?"}</span>
                                        <span className="font-mono text-emerald-400">{fmtEur(f.FinalFee?.Amount ?? f.FeeAmount?.Amount)}</span>
                                      </div>
                                      {f.IncludedFeeDetailList?.length > 0 && (
                                        <div className="mt-1 pl-2 border-l border-slate-700/50 space-y-0.5">
                                          {f.IncludedFeeDetailList.map((sub, j) => (
                                            <div key={j} className="flex items-center justify-between text-[10px] text-slate-400">
                                              <span>{sub.FeeType}</span>
                                              <span className="font-mono">{fmtEur(sub.FinalFee?.Amount ?? sub.FeeAmount?.Amount)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
