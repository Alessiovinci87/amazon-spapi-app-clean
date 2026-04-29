// backend_v2/modules/tracking17/tracking17Cron.js
// Cron che fa refresh automatico dei tracking "giovani" ancora pendenti.
// Subito dopo il /register, 17TRACK non ha quasi mai info dal corriere → status NotFound o
// InfoReceived. Polliamo periodicamente i tracking registrati nelle ultime 48h finché non
// ricevono un primo evento. Le chiamate /gettrackinfo sono GRATIS (non consumano quota).

const cron = require("node-cron");
const logger = require("../../utils/logger");
const { getDb } = require("../../db/database");
const service = require("./tracking17Service");

let isRunning = false;

const SCHEDULE = process.env.TRACKING17_REFRESH_CRON || "*/30 * * * *"; // ogni 30 min
const LOOKBACK_HOURS = Number(process.env.TRACKING17_REFRESH_LOOKBACK_HOURS) || 48;
const MAX_PER_CYCLE = Number(process.env.TRACKING17_REFRESH_MAX_PER_CYCLE) || 30;
const SLEEP_MS = Number(process.env.TRACKING17_REFRESH_SLEEP_MS) || 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pickPending(db) {
  return db
    .prepare(
      `SELECT tracking_number, status, registered_at
       FROM tracking_17track
       WHERE (status IS NULL OR status IN ('NotFound', 'InfoReceived'))
         AND registered_at >= datetime('now', '-' || ? || ' hours', 'localtime')
       ORDER BY registered_at DESC
       LIMIT ?`
    )
    .all(LOOKBACK_HOURS, MAX_PER_CYCLE);
}

function upsertCache(db, trackingNumber, info) {
  const latestEventJson = info.latest_event ? JSON.stringify(info.latest_event) : null;
  const milestoneJson = info.milestone ? JSON.stringify(info.milestone) : null;
  const eventsJson = Array.isArray(info.events) && info.events.length > 0
    ? JSON.stringify(info.events) : null;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE tracking_17track
     SET status = ?, sub_status = ?, carrier = COALESCE(?, carrier),
         latest_event_json = ?, milestone_json = ?,
         events_json = COALESCE(?, events_json),
         provider_name = COALESCE(?, provider_name),
         last_update = ?, error = ?
     WHERE tracking_number = ?`
  ).run(
    info.status,
    info.sub_status,
    info.carrier,
    latestEventJson,
    milestoneJson,
    eventsJson,
    info.provider_name || null,
    now,
    info.error,
    trackingNumber
  );
}

async function eseguiCiclo() {
  if (isRunning) return;
  isRunning = true;
  try {
    if (!process.env.SEVENTEEN_TRACK_API_KEY) {
      logger.debug("[Tracking17Cron] SEVENTEEN_TRACK_API_KEY non impostata, skip");
      return;
    }

    const db = getDb();
    const pendenti = pickPending(db);
    if (pendenti.length === 0) {
      logger.debug("[Tracking17Cron] Nessun tracking pendente da aggiornare");
      return;
    }

    logger.info(`🚚 [Tracking17Cron] Refresh di ${pendenti.length} tracking pendenti (finestra ${LOOKBACK_HOURS}h)`);

    let updated = 0;
    let resolved = 0; // quanti hanno cambiato stato a qualcosa di "definitivo"
    for (const row of pendenti) {
      try {
        const info = await service.getInfo(row.tracking_number);
        upsertCache(db, row.tracking_number, info);
        updated++;
        if (info.success && info.status && info.status !== "NotFound" && info.status !== "InfoReceived") {
          resolved++;
        }
      } catch (err) {
        logger.warn(`[Tracking17Cron] errore su ${row.tracking_number}: ${err.message}`);
      }
      await sleep(SLEEP_MS);
    }

    logger.info(`🚚 [Tracking17Cron] Ciclo completato — ${updated}/${pendenti.length} aggiornati, ${resolved} usciti dallo stato pending`);
  } catch (err) {
    logger.error({ err }, "[Tracking17Cron] Errore ciclo");
  } finally {
    isRunning = false;
  }
}

function startTracking17Cron() {
  cron.schedule(SCHEDULE, eseguiCiclo);
  logger.info(`🚚 [Tracking17Cron] Schedulato (${SCHEDULE}, finestra ${LOOKBACK_HOURS}h, max ${MAX_PER_CYCLE}/ciclo)`);
}

module.exports = { startTracking17Cron, eseguiCiclo };
