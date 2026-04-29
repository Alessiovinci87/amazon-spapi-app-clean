// backend_v2/modules/tracking17/tracking17Routes.js
const express = require("express");
const { z } = require("zod");
const { getDb } = require("../../db/database");
const { validate } = require("../../middleware/validate");
const logger = require("../../utils/logger");
const service = require("./tracking17Service");

const router = express.Router();

// =============================================================
// Schema Zod
// =============================================================
const trackingNumberParam = z.object({
  trackingNumber: z.string().min(4).max(64),
});

const registerBody = z.object({
  tracking_number: z.string().min(4, "Tracking number troppo corto").max(64),
  ddt_id: z.coerce.number().int().positive().nullish(),
  spedizione_id: z.coerce.number().int().positive().nullish(),
  nota: z.string().max(500).nullish(),
  carrier: z.coerce.number().int().positive().nullish(),
});

// =============================================================
// Utility: aggiorna la cache DB con i dati freschi da 17TRACK
// =============================================================
function upsertTrackingCache(db, trackingNumber, info, ddt_id = null, spedizione_id = null, nota = null) {
  const existing = db
    .prepare("SELECT id, ddt_id, spedizione_id, nota FROM tracking_17track WHERE tracking_number = ?")
    .get(trackingNumber);

  const latestEventJson = info.latest_event ? JSON.stringify(info.latest_event) : null;
  const milestoneJson = info.milestone ? JSON.stringify(info.milestone) : null;
  const eventsJson = Array.isArray(info.events) && info.events.length > 0
    ? JSON.stringify(info.events) : null;
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(
      `UPDATE tracking_17track
       SET status = ?, sub_status = ?, carrier = ?, latest_event_json = ?,
           milestone_json = ?, events_json = COALESCE(?, events_json),
           provider_name = COALESCE(?, provider_name),
           last_update = ?, error = ?,
           ddt_id = COALESCE(?, ddt_id),
           spedizione_id = COALESCE(?, spedizione_id),
           nota = COALESCE(?, nota)
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
      ddt_id,
      spedizione_id,
      nota,
      trackingNumber
    );
  } else {
    db.prepare(
      `INSERT INTO tracking_17track
       (tracking_number, carrier, status, sub_status, latest_event_json,
        milestone_json, events_json, provider_name, ddt_id, spedizione_id, nota, last_update, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      trackingNumber,
      info.carrier,
      info.status,
      info.sub_status,
      latestEventJson,
      milestoneJson,
      eventsJson,
      info.provider_name || null,
      ddt_id,
      spedizione_id,
      nota,
      now,
      info.error
    );
  }
}

function rowToApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    tracking_number: row.tracking_number,
    carrier: row.carrier,
    provider_name: row.provider_name || null,
    status: row.status,
    status_label: service.translateStatus(row.status),
    sub_status: row.sub_status,
    latest_event: row.latest_event_json ? safeParse(row.latest_event_json) : null,
    milestone: row.milestone_json ? safeParse(row.milestone_json) : [],
    events: row.events_json ? safeParse(row.events_json) : [],
    ddt_id: row.ddt_id,
    ddt_numero: row.ddt_numero || null,
    ddt_brand: row.ddt_brand || null,
    spedizione_id: row.spedizione_id,
    nota: row.nota,
    registered_at: row.registered_at,
    last_update: row.last_update,
    error: row.error,
  };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// =============================================================
// GET /api/v2/tracking17/carriers — lista corrieri suggeriti
// =============================================================
router.get("/carriers", (req, res) => {
  res.json(service.COMMON_CARRIERS);
});

// =============================================================
// GET /api/v2/tracking17/quota — stato quote 17TRACK (non consuma)
// =============================================================
router.get("/quota", async (req, res) => {
  try {
    const q = await service.getQuota();
    res.json(q);
  } catch (err) {
    logger.error({ err }, "Errore tracking17 /quota");
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// GET /api/v2/tracking17/tutti — lista di tutti i tracking cachati
// =============================================================
router.get("/tutti", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT t.*, d.numeroDDT AS ddt_numero, d.brand AS ddt_brand
      FROM tracking_17track t
      LEFT JOIN ddt_generici d ON d.id = t.ddt_id
      ORDER BY
        CASE WHEN t.ddt_id IS NULL THEN 0 ELSE 1 END,
        t.last_update DESC
    `).all();
    res.json(rows.map(rowToApi));
  } catch (err) {
    logger.error({ err }, "Errore tracking17 /tutti");
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// GET /api/v2/tracking17/suggerimenti-ddt — tracking presenti nei DDT
//   che NON sono ancora stati registrati su 17TRACK
// =============================================================
router.get("/suggerimenti-ddt", (req, res) => {
  try {
    const db = getDb();
    // Unisce tracking dal DDT header e dalle righe DDT
    // Normalizza il tracking lato SQL: rimuove spazi e maiuscolizza, così matcha anche
    // tracking salvati con spazi nei DDT (es. UPS "1Z Y51 C49 68 5009 5647")
    const suggerimenti = db.prepare(`
      SELECT DISTINCT
        UPPER(REPLACE(COALESCE(NULLIF(TRIM(d.tracking), ''), NULLIF(TRIM(r.tracking), '')), ' ', '')) AS tracking_number,
        d.id AS ddt_id,
        d.numeroDDT AS ddt_numero,
        d.brand AS ddt_brand,
        d.data AS ddt_data,
        d.paese AS ddt_paese,
        d.trasportatore AS ddt_trasportatore
      FROM ddt_generici d
      LEFT JOIN ddt_generici_righe r ON r.ddt_id = d.id
      WHERE (
        (d.tracking IS NOT NULL AND TRIM(d.tracking) != '')
        OR (r.tracking IS NOT NULL AND TRIM(r.tracking) != '')
      )
      AND NOT EXISTS (
        SELECT 1 FROM tracking_17track t
        WHERE UPPER(REPLACE(t.tracking_number, ' ', '')) =
              UPPER(REPLACE(COALESCE(NULLIF(TRIM(d.tracking), ''), NULLIF(TRIM(r.tracking), '')), ' ', ''))
      )
      ORDER BY d.data DESC, d.id DESC
    `).all();

    res.json(suggerimenti.filter((s) => s.tracking_number));
  } catch (err) {
    logger.error({ err }, "Errore tracking17 /suggerimenti-ddt");
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// POST /api/v2/tracking17/register — registra un tracking (CONSUMA QUOTA)
// Body: { tracking_number, ddt_id?, spedizione_id?, nota? }
// =============================================================
router.post("/register", validate({ body: registerBody }), async (req, res) => {
  const { ddt_id = null, spedizione_id = null, nota = null, carrier = null } = req.body;
  // Normalizza: i tracking UPS arrivano spesso con spazi (es. "1Z Y51 C49 68 5009 5647"),
  // 17TRACK e i corrieri vogliono il numero senza spazi.
  const tracking_number = service.normalizeTrackingNumber(req.body.tracking_number);
  if (!tracking_number || tracking_number.length < 4) {
    return res.status(400).json({ ok: false, error: "Tracking number non valido", error_code: null, needs_carrier: false });
  }
  const db = getDb();

  // Se già registrato localmente, non ri-consumare quota: fai solo refresh
  const existing = db
    .prepare("SELECT id FROM tracking_17track WHERE tracking_number = ?")
    .get(tracking_number);

  try {
    if (!existing) {
      const reg = await service.register(tracking_number, carrier);
      if (!reg.success) {
        // Non salvo a DB se il register è fallito: l'utente può ritentare
        return res.status(400).json({
          ok: false,
          error: reg.error,
          error_code: reg.errorCode,
          needs_carrier: reg.needsCarrier,
        });
      }
    }

    // Fetch immediata dei dati (se è "pending"/no-info, salviamo lo stesso un record)
    const info = await service.getInfo(tracking_number);
    upsertTrackingCache(db, tracking_number, info, ddt_id, spedizione_id, nota);

    const row = db.prepare(`
      SELECT t.*, d.numeroDDT AS ddt_numero, d.brand AS ddt_brand
      FROM tracking_17track t
      LEFT JOIN ddt_generici d ON d.id = t.ddt_id
      WHERE t.tracking_number = ?
    `).get(tracking_number);

    res.json({
      ok: true,
      tracking: rowToApi(row),
      pending: info.pending === true,
      message: info.pending
        ? "Tracking registrato. Il corriere sta ancora elaborando le informazioni — riprova fra qualche minuto."
        : null,
    });
  } catch (err) {
    if (err instanceof service.TrackingQuotaException) {
      return res.status(429).json({ ok: false, error: "Quota 17TRACK esaurita", quota_exhausted: true });
    }
    logger.error({ err, tracking_number }, "Errore tracking17 /register");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================
// POST /api/v2/tracking17/refresh/:trackingNumber — aggiorna cache da 17TRACK
// NON consuma quota
// =============================================================
router.post("/refresh/:trackingNumber", validate({ params: trackingNumberParam }), async (req, res) => {
  const trackingNumber = service.normalizeTrackingNumber(req.params.trackingNumber);
  const db = getDb();
  try {
    const info = await service.getInfo(trackingNumber);
    upsertTrackingCache(db, trackingNumber, info);

    const row = db.prepare(`
      SELECT t.*, d.numeroDDT AS ddt_numero, d.brand AS ddt_brand
      FROM tracking_17track t
      LEFT JOIN ddt_generici d ON d.id = t.ddt_id
      WHERE t.tracking_number = ?
    `).get(trackingNumber);

    res.json({ ok: true, tracking: rowToApi(row) });
  } catch (err) {
    logger.error({ err, trackingNumber }, "Errore tracking17 /refresh");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================
// GET /api/v2/tracking17/info/:trackingNumber — info sempre dal cache DB
// Se si vuole dato fresco usare /refresh/:num prima
// =============================================================
router.get("/info/:trackingNumber", validate({ params: trackingNumberParam }), (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT t.*, d.numeroDDT AS ddt_numero, d.brand AS ddt_brand
      FROM tracking_17track t
      LEFT JOIN ddt_generici d ON d.id = t.ddt_id
      WHERE t.tracking_number = ?
    `).get(req.params.trackingNumber);

    if (!row) return res.status(404).json({ ok: false, error: "Tracking non trovato in cache" });
    res.json({ ok: true, tracking: rowToApi(row) });
  } catch (err) {
    logger.error({ err }, "Errore tracking17 /info");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================
// DELETE /api/v2/tracking17/:trackingNumber — elimina sia da 17TRACK che cache locale
// =============================================================
router.delete("/:trackingNumber", validate({ params: trackingNumberParam }), async (req, res) => {
  const trackingNumber = service.normalizeTrackingNumber(req.params.trackingNumber);
  const db = getDb();
  try {
    const result = await service.deleteTracking(trackingNumber);
    db.prepare("DELETE FROM tracking_17track WHERE tracking_number = ?").run(trackingNumber);
    res.json({ ok: true, remote: result.success, error: result.error });
  } catch (err) {
    logger.error({ err, trackingNumber }, "Errore tracking17 DELETE");
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
