// backend_v2/modules/europa/alertCron.js
const cron = require("node-cron");
const { runAlertCycle } = require("./alertEngine");

let isRunning = false;

// Flag globale: blocca il cron quando c'è un sync manuale in corso
let manualSyncActive = false;
function setManualSyncActive(val) { manualSyncActive = val; }
function isManualSyncActive() { return manualSyncActive; }

async function eseguiCiclo() {
  if (isRunning || manualSyncActive) return;
  isRunning = true;
  try {
    console.log("🔔 [AlertCron] Avvio ciclo verifica alert Europa…");
    const result = await runAlertCycle();
    console.log(`🔔 [AlertCron] Ciclo completato — ASIN verificati: ${result.checked}`);
  } catch (err) {
    console.error("❌ [AlertCron] Errore:", err.message);
  } finally {
    isRunning = false;
  }
}

function startAlertCron() {
  // Ogni 6 ore
  cron.schedule("0 */6 * * *", eseguiCiclo);
  console.log("🔔 [AlertCron] Schedulato ogni 6 ore.");
}

module.exports = { startAlertCron, eseguiCiclo, setManualSyncActive, isManualSyncActive };
