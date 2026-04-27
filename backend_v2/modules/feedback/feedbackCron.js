// backend_v2/modules/feedback/feedbackCron.js
// Cron che esegue sync seller feedback per tutti i marketplace e genera alert
// NEW_NEGATIVE_FEEDBACK per ogni nuovo feedback 1-3★.

const cron = require("node-cron");
const logger = require("../../utils/logger");
const { MARKETPLACES, syncMarketplaceFeedback } = require("./feedbackService");

let isRunning = false;

// Ogni 4 ore di default; override via FEEDBACK_CRON env
const SCHEDULE = process.env.FEEDBACK_CRON || "0 */4 * * *";
const DAYS     = Number(process.env.FEEDBACK_CRON_DAYS) || 30; // finestra corta per essere rapidi

async function eseguiCiclo() {
  if (isRunning) return;
  isRunning = true;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    logger.info(`📣 [FeedbackCron] Avvio ciclo — ${MARKETPLACES.length} marketplace, finestra ${DAYS}gg`);
    let totalRecords = 0;
    let totalAlerts = 0;
    for (let i = 0; i < MARKETPLACES.length; i++) {
      const mp = MARKETPLACES[i];
      try {
        const r = await syncMarketplaceFeedback(mp.code, { days: DAYS });
        totalRecords += r.records ?? 0;
        totalAlerts  += r.newAlerts ?? 0;
        logger.info(`  ✓ [FeedbackCron] ${mp.code}: ${r.records} record, ${r.newAlerts ?? 0} nuovi alert`);
      } catch (err) {
        const msg = err.response?.data?.errors?.[0]?.message || err.message;
        logger.warn(`  ⚠️ [FeedbackCron] ${mp.code}: ${msg}`);
        if (err.response?.status === 429 || /quota/i.test(msg)) {
          await sleep(60000); // back-off su quota
        }
      }
      if (i < MARKETPLACES.length - 1) await sleep(15000); // throttle reports API
    }
    logger.info(`📣 [FeedbackCron] Ciclo completato — ${totalRecords} record sincronizzati, ${totalAlerts} alert emessi`);
  } catch (err) {
    logger.error("❌ [FeedbackCron] Errore ciclo:", err.message);
  } finally {
    isRunning = false;
  }
}

function startFeedbackCron() {
  cron.schedule(SCHEDULE, eseguiCiclo);
  logger.info(`📣 [FeedbackCron] Schedulato (${SCHEDULE}, finestra ${DAYS}gg)`);
}

module.exports = { startFeedbackCron, eseguiCiclo };
