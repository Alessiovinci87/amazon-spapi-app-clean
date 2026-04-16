// backend_v2/modules/sync/syncCron.js
// Sync automatici periodici da Amazon SP-API
const cron = require("node-cron");

let running = {};

function isRunning(name) { return !!running[name]; }

async function runSafe(name, fn) {
  if (running[name]) {
    console.log(`[SyncCron] ${name} — gia in esecuzione, skip`);
    return;
  }
  running[name] = true;
  const start = Date.now();
  try {
    console.log(`[SyncCron] ${name} — avvio`);
    await fn();
    console.log(`[SyncCron] ${name} — completato in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error(`[SyncCron] ${name} — errore:`, err.message);
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
    console.log("[SyncCron] prezzi — catalogo vuoto, skip");
    return;
  }

  let ok = 0, fail = 0;
  for (const asin of asinList) {
    try {
      await sincronizzaPrezziAsin(asin);
      ok++;
    } catch (err) {
      console.error(`[SyncCron] prezzi ${asin} errore:`, err.message);
      fail++;
    }
    // 2.5s tra un ASIN e l'altro (rate limit pricing API)
    await new Promise(r => setTimeout(r, 2500));
  }
  console.log(`[SyncCron] prezzi — ${ok} ok, ${fail} errori su ${asinList.length} ASIN (${conAlert.length} con alert + ${asinList.length - conAlert.length} resto catalogo)`);
}

// ─── Alert check (dopo stock + prezzi aggiornati) ────────
async function syncAlertCheck() {
  const { runAlertCycle } = require("../europa/alertEngine");
  await runAlertCycle();
}

// ─── Sales & Traffic report (giornaliero) ────────────────
async function syncSalesTraffic() {
  const { aggiornaSalesTraffic } = require("../reports/salesTrafficService");
  await aggiornaSalesTraffic();
}

// ─── FBA Stock Report (alternativo, piu completo) ────────
async function syncFBAStockReport() {
  const { aggiornaFBAStock } = require("../reports/fbaStockService");
  await aggiornaFBAStock();
}

// ─── Listing Editor cache (per paese) ────────────────────
async function syncListingCache() {
  const { syncListings, MARKETPLACES } = require("../listings/listingsEditorService");
  const countries = Object.keys(MARKETPLACES);

  for (const country of countries) {
    console.log(`[SyncCron] listing-cache ${country} — avvio`);
    try {
      await syncListings(country);
      console.log(`[SyncCron] listing-cache ${country} — ok`);
    } catch (err) {
      console.error(`[SyncCron] listing-cache ${country} — errore:`, err.message);
    }
    // 30s pausa tra un paese e l'altro per non saturare le API
    await new Promise(r => setTimeout(r, 30000));
  }
}

function startSyncCrons() {
  // ── OGNI 3 ORE: Stock FBA (Inventory API, veloce ~30s) ──
  // 0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00
  cron.schedule("10 */3 * * *", () => runSafe("stock-fba", syncStockFBA));

  // ── OGNI 3 ORE: Prezzi + BuyBox (offset 20min dopo stock) ──
  // Cosi stock e prezzi non si sovrappongono
  cron.schedule("30 */3 * * *", () => runSafe("prezzi-buybox", syncPrezzi));

  // ── OGNI 3 ORE: Alert check (offset 50min, dopo stock+prezzi) ──
  cron.schedule("50 */3 * * *", () => runSafe("alert-check", syncAlertCheck));

  // ── OGNI GIORNO alle 6:30: Vendite/Traffico (report del giorno prima) ──
  cron.schedule("30 6 * * *", () => runSafe("sales-traffic", syncSalesTraffic));

  // ── OGNI GIORNO alle 4:00: FBA Stock Report completo ──
  cron.schedule("0 4 * * *", () => runSafe("fba-stock-report", syncFBAStockReport));

  // ── OGNI DOMENICA alle 3:00: Listing cache (tutti i paesi) ──
  cron.schedule("0 3 * * 0", () => runSafe("listing-cache", syncListingCache));

  console.log("[SyncCron] Sync automatici schedulati:");
  console.log("  Stock FBA:       ogni 3h (:10)");
  console.log("  Prezzi+BuyBox:   ogni 3h (:30)");
  console.log("  Alert check:     ogni 3h (:50)");
  console.log("  Sales/Traffic:   06:30 giornaliero");
  console.log("  FBA Stock Report: 04:00 giornaliero");
  console.log("  Listing cache:   03:00 domenica");
}

module.exports = { startSyncCrons, isRunning };
