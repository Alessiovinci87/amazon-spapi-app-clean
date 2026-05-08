// backend_v2/modules/sync/syncCron.js
// Sync automatici periodici da Amazon SP-API
const cron = require("node-cron");
const logger = require("../../utils/logger");

let running = {};

function isRunning(name) { return !!running[name]; }

async function runSafe(name, fn) {
  if (running[name]) {
    logger.info(`[SyncCron] ${name} — gia in esecuzione, skip`);
    return;
  }
  running[name] = true;
  const start = Date.now();
  try {
    logger.info(`[SyncCron] ${name} — avvio`);
    await fn();
    logger.info(`[SyncCron] ${name} — completato in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (err) {
    logger.error({ err }, `[SyncCron] ${name} — errore`);
  } finally {
    running[name] = false;
  }
}

// ─── Stock FBA (Inventory API, veloce) ───────────────────
async function syncStockFBA() {
  const { importaInventarioCompleto } = require("../europa/alertEngine");
  await importaInventarioCompleto();
}

// ─── Prezzi + BuyBox (Pricing API) ───────────────────────
// Copre TUTTI gli ASIN presenti in fba_stock (= quelli mostrati nella pagina Listing),
// non solo quelli con alert_rules. Gli ASIN con alert attivi vengono fatti per primi
// (priorità) cosi se il cron viene interrotto i critici sono gia aggiornati.
async function syncPrezzi() {
  const { getDb } = require("../../db/database");
  const { sincronizzaPrezziAsin } = require("../catalog/catalogAmazonService");

  const db = getDb();
  const conAlert = db.prepare(
    "SELECT DISTINCT asin FROM alert_rules WHERE abilitato = 1"
  ).all().map(r => r.asin);
  const tutti = db.prepare(
    "SELECT DISTINCT asin FROM fba_stock ORDER BY asin"
  ).all().map(r => r.asin);

  const setAlert = new Set(conAlert);
  const asinList = [
    ...conAlert,
    ...tutti.filter(a => !setAlert.has(a)),
  ];

  if (asinList.length === 0) {
    logger.info("[SyncCron] prezzi — catalogo vuoto, skip");
    return;
  }

  let ok = 0, fail = 0;
  for (const asin of asinList) {
    try {
      await sincronizzaPrezziAsin(asin);
      ok++;
    } catch (err) {
      logger.error({ err }, `[SyncCron] prezzi ${asin} errore`);
      fail++;
    }
    // 2.5s tra un ASIN e l'altro (rate limit pricing API)
    await new Promise(r => setTimeout(r, 2500));
  }
  logger.info(`[SyncCron] prezzi — ${ok} ok, ${fail} errori su ${asinList.length} ASIN (${conAlert.length} con alert + ${asinList.length - conAlert.length} resto catalogo)`);
}

// ─── Alert check (dopo stock + prezzi aggiornati) ────────
async function syncAlertCheck() {
  const { runAlertCycle } = require("../europa/alertEngine");
  await runAlertCycle();
}

// ─── Sales & Traffic report (giornaliero) ────────────────
// force=true: ignora il check "<12h fa, skip" interno — il cron deve sempre
// andare in fondo, anche se c'e' stato un sync manuale poco prima.
async function syncSalesTraffic() {
  const { aggiornaSalesTraffic } = require("../reports/salesTrafficService");
  await aggiornaSalesTraffic({ force: true });
}

// ─── FBA Stock Report (alternativo, piu completo) ────────
async function syncFBAStockReport() {
  const { aggiornaFBAStock } = require("../reports/fbaStockService");
  await aggiornaFBAStock();
}

// ─── ASIN Daily Sales (dati giornalieri per ASIN) ──────────
async function syncAsinDailyCron() {
  const { syncAsinDaily } = require("../reports/salesTrafficService");
  await syncAsinDaily();
}

// ─── Competitor Watch (conteggio categorie) ────────────────
async function syncCompetitorSnapshot() {
  const { runCategorySnapshot } = require("../competitor/competitorService");
  await runCategorySnapshot();
}

// ─── Competitor Tracked ASINs (snapshot dettagliati + diff) ──
// force=true nei passaggi successivi al primo della giornata: sovrascrive lo snapshot
// di oggi con dati più recenti (utile per cron multi-orario).
async function syncCompetitorTrackedAsins({ force = false } = {}) {
  const { runTrackedAsinsSnapshot } = require("../competitor/competitorService");
  await runTrackedAsinsSnapshot({ force });
}

// ─── FBA Fees (commissioni per ASIN, tutti i marketplace) ──
async function syncFBAFees() {
  const { aggiornaFBAFees } = require("../reports/fbaFeesService");
  await aggiornaFBAFees();
}

// ─── Stock Ledger (distribuzione fisica per paese) ────────
async function syncStockLedger() {
  const { aggiornaLedgerStock } = require("../reports/ledgerStockService");
  await aggiornaLedgerStock();
}

// ─── Resi FBA ─────────────────────────────────────────────
async function syncResiFBA() {
  const { syncReturns } = require("../returns/returnsService");
  await syncReturns({});
}

// ─── Catalog info (titolo + immagini per marketplace) ────
async function syncCatalogInfo() {
  const { aggiornaProductCatalog } = require("../catalog/catalogInfoSync");
  const progress = { done: 0, total: 0, aggiornati: 0, errori: 0 };
  const res = await aggiornaProductCatalog(progress);
  logger.info(`[SyncCron] catalog-info — ${res.done}/${res.total} ASIN, ${res.aggiornati} righe aggiornate, ${res.errori} errori`);
}

// ─── Orders Live (Orders API near real-time per "oggi") ───
// Pre-popola amazon_order_cache cosi quando l'utente apre /panoramica
// trova i dati di oggi/ieri gia pronti senza dover aspettare il bg refresh.
function todayItYmd() {
  const now = new Date();
  const m = now.getUTCMonth() + 1;
  const offHours = (m >= 4 && m <= 9) ? 2 : (m === 3 || m === 10 ? (m === 3 ? 1 : 2) : 1);
  return new Date(now.getTime() + offHours * 3600_000).toISOString().slice(0, 10);
}
function ymdMinusDays(ymd, n) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function syncOrdersLiveToday() {
  const { aggregateOrdersLive } = require("../reports/ordersLiveService");
  const today = todayItYmd();
  await aggregateOrdersLive({ from: today, to: today });
}

async function computeMetrics() {
  const { computeMetricsLast7Days } = require("../reports/metricsCompute");
  computeMetricsLast7Days();
}

async function syncOrdersLiveYesterdayToday() {
  const { aggregateOrdersLive } = require("../reports/ordersLiveService");
  const today = todayItYmd();
  const yesterday = ymdMinusDays(today, 1);
  await aggregateOrdersLive({ from: yesterday, to: today });
}

// ─── Listing Editor cache (per paese) ────────────────────
async function syncListingCache() {
  const { syncListings, MARKETPLACES } = require("../listings/listingsEditorService");
  const countries = Object.keys(MARKETPLACES);

  for (const country of countries) {
    logger.info(`[SyncCron] listing-cache ${country} — avvio`);
    try {
      await syncListings(country);
      logger.info(`[SyncCron] listing-cache ${country} — ok`);
    } catch (err) {
      logger.error({ err }, `[SyncCron] listing-cache ${country} — errore`);
    }
    // 30s pausa tra un paese e l'altro per non saturare le API
    await new Promise(r => setTimeout(r, 30000));
  }
}

function startSyncCrons() {
  // Flag per disabilitare TUTTI i cron sync. Utile in locale (dev) per evitare
  // doppie chiamate Amazon quando il backend di produzione gira già: il dev
  // legge il DB locale ma non rifetcha autonomamente. Va impostato in .env.
  if (process.env.DISABLE_SYNC === "true") {
    logger.info("[SyncCron] DISABLE_SYNC=true → tutti i cron sync disattivati");
    return;
  }

  // ── OGNI 3 ORE: Stock FBA (Inventory API, veloce ~30s) ──
  // 0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00
  cron.schedule("10 */3 * * *", () => runSafe("stock-fba", syncStockFBA));

  // ── OGNI 3 ORE: Prezzi + BuyBox (offset 20min dopo stock) ──
  // Cosi stock e prezzi non si sovrappongono
  cron.schedule("30 */3 * * *", () => runSafe("prezzi-buybox", syncPrezzi));

  // ── OGNI 3 ORE: Alert check (offset 50min, dopo stock+prezzi) ──
  cron.schedule("50 */3 * * *", () => runSafe("alert-check", syncAlertCheck));

  // ── OGNI GIORNO alle 6:30 e 22:00: Vendite/Traffico ──
  // 06:30 = primo tentativo del giorno, 22:00 = retry quando il dato T-2
  // di Amazon e' effettivamente disponibile (a volte non lo e' la mattina).
  cron.schedule("30 6 * * *", () => runSafe("sales-traffic", syncSalesTraffic), { timezone: "Europe/Rome" });
  cron.schedule("0 22 * * *", () => runSafe("sales-traffic-evening", syncSalesTraffic), { timezone: "Europe/Rome" });

  // ── OGNI GIORNO alle 4:00: FBA Stock Report completo (Pan-EU pool) ──
  cron.schedule("0 4 * * *", () => runSafe("fba-stock-report", syncFBAStockReport));

  // ── OGNI GIORNO alle 4:30: Stock Ledger (sovrascrive IT col fisico per paese) ──
  // DEVE girare DOPO fba-stock-report, altrimenti il Pan-EU lo riscrive sopra
  cron.schedule("30 4 * * *", () => runSafe("stock-ledger", syncStockLedger), { timezone: "Europe/Rome" });

  // ── OGNI GIORNO alle 5:00: FBA Fees (commissioni per ASIN) ──
  cron.schedule("0 5 * * *", () => runSafe("fba-fees", syncFBAFees));

  // ── OGNI GIORNO alle 5:30: Resi FBA ──
  cron.schedule("30 5 * * *", () => runSafe("resi-fba", syncResiFBA), { timezone: "Europe/Rome" });

  // ── 09:00 e 14:00: Competitor Watch (conteggi keyword + top-20) ──
  cron.schedule("0 9,14 * * *", () => runSafe("competitor-snapshot", syncCompetitorSnapshot));

  // ── 09:30: Competitor ASIN tracciati — primo passaggio giornaliero ──
  cron.schedule("30 9 * * *", () => runSafe("competitor-tracked-am", () => syncCompetitorTrackedAsins({ force: false })));

  // ── 14:30: secondo passaggio (force=true) per aggiornare lo snapshot di oggi coi dati pomeridiani ──
  cron.schedule("30 14 * * *", () => runSafe("competitor-tracked-pm", () => syncCompetitorTrackedAsins({ force: true })));

  // ── OGNI GIORNO alle 7:00: ASIN Daily Sales (ieri, per-ASIN) ──
  cron.schedule("0 7 * * *", () => runSafe("asin-daily", syncAsinDailyCron));

  // ── OGNI ORA tra 08:00 e 23:59: backup "oggi" ──
  // Da 2026-05-08 il flusso primario di refresh ordini avviene via SP-API
  // Notifications push (worker SQS): qui restiamo come safety net se la coda
  // perde messaggi o se il worker è giù. Era */2 prima del setup notifiche.
  cron.schedule("0 8-23 * * *", () => runSafe("orders-live-today", syncOrdersLiveToday), { timezone: "Europe/Rome" });

  // ── OGNI 6 ORE tra 08:00 e 23:59: backup "ieri + oggi" ──
  // Era */15 prima del setup notifiche. Cattura Pending tardivi che si
  // confermano in Shipped e che il worker SQS dovrebbe già avere processato.
  cron.schedule("0 */6 * * *", () => runSafe("orders-live-tick", syncOrdersLiveYesterdayToday), { timezone: "Europe/Rome" });

  // ── OGNI GIORNO alle 03:30: consolidamento notturno (ieri + oggi) ──
  // Pesca eventuali ordini delle ultime ore di ieri non catturati dall'ultimo
  // tick del giorno prima.
  cron.schedule("30 3 * * *", () => runSafe("orders-live-night", syncOrdersLiveYesterdayToday), { timezone: "Europe/Rome" });

  // ── OGNI 5 MIN: ricalcolo asin_daily_metrics (ultimi 7 giorni) ──
  // Compute job che alimenta la tabella denormalizzata letta dalla dashboard.
  // Aggrega amazon_order_cache + sales_traffic + fees + costi → metrica unica.
  cron.schedule("*/5 * * * *", () => runSafe("compute-metrics", computeMetrics), { timezone: "Europe/Rome" });

  // ── OGNI DOMENICA alle 02:00: Catalog info (titoli + immagini) ──
  cron.schedule("0 2 * * 0", () => runSafe("catalog-info", syncCatalogInfo));

  // ── OGNI DOMENICA alle 3:00: Listing cache (tutti i paesi) ──
  cron.schedule("0 3 * * 0", () => runSafe("listing-cache", syncListingCache));

  // ── Kick-off all'avvio: popola la cache "ieri+oggi" 30s dopo lo start del backend ──
  setTimeout(() => runSafe("orders-live-startup", syncOrdersLiveYesterdayToday), 30_000);

  // ── Kick-off compute metrics 60s dopo lo start (dopo che orders-live ha popolato) ──
  setTimeout(() => runSafe("compute-metrics-startup", computeMetrics), 60_000);

  logger.info("[SyncCron] Sync automatici schedulati:");
  logger.info("  Stock FBA:       ogni 3h (:10)");
  logger.info("  Prezzi+BuyBox:   ogni 3h (:30)");
  logger.info("  Alert check:     ogni 3h (:50)");
  logger.info("  Sales/Traffic:   06:30 + 22:00 giornaliero");
  logger.info("  FBA Stock Report: 04:00 giornaliero");
  logger.info("  Stock Ledger:    04:30 giornaliero (per paese fisico)");
  logger.info("  FBA Fees:        05:00 giornaliero");
  logger.info("  Resi FBA:        05:30 giornaliero");
  logger.info("  ASIN Daily:      07:00 giornaliero");
  logger.info("  Orders Live tick: ogni 5min 08-23 (ieri+oggi)");
  logger.info("  Orders Live notte: 03:30 (ieri+oggi)");
  logger.info("  Catalog info:    02:00 domenica");
  logger.info("  Listing cache:   03:00 domenica");
}

module.exports = { startSyncCrons, isRunning };
