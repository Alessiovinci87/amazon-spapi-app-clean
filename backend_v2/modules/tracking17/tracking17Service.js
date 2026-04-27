// backend_v2/modules/tracking17/tracking17Service.js
// Client per 17TRACK API v2.4.
// Docs: https://api.17track.net/en/doc
// Quota consumata SOLO da POST /register. gettrackinfo, getquota, deletetrack sono free.

const logger = require("../../utils/logger");

const BASE_URL = "https://api.17track.net/track/v2.4";
const API_KEY = process.env.SEVENTEEN_TRACK_API_KEY;
const LANG = "it";
const TIMEOUT_MS = 15000;

// Codici errore noti 17TRACK
const QUOTA_EXHAUSTED_CODE = -18019908;
const ALREADY_REGISTERED_CODE = -18019901; // Tracking è già stato registrato sull'account
const CARRIER_NOT_DETECTED_CODE = -18019903;
const FORMAT_INVALID_CODE = -18010012;
const NO_INFO_YET_CODE = -18019909; // Tracking registrato ma ancora nessuna info dal corriere

// Lista corrieri italiani / EU comuni (carrier code 17TRACK)
// Permette all'utente di indicare il corriere quando l'auto-detect fallisce.
const COMMON_CARRIERS = [
  { code: 100002, name: "UPS" },
  { code: 100003, name: "FedEx" },
  { code: 100004, name: "DHL Express" },
  { code: 100132, name: "DHL eCommerce" },
  { code: 100005, name: "GLS" },
  { code: 190271, name: "BRT (Bartolini)" },
  { code: 100015, name: "Poste Italiane" },
  { code: 100025, name: "SDA" },
  { code: 100007, name: "TNT" },
  { code: 100012, name: "DPD" },
  { code: 100029, name: "Amazon Logistics" },
  { code: 100001, name: "USPS" },
];

class TrackingQuotaException extends Error {
  constructor(message = "Quota 17TRACK esaurita") {
    super(message);
    this.name = "TrackingQuotaException";
    this.code = QUOTA_EXHAUSTED_CODE;
  }
}

// Mappatura status EN → IT per la UI
const STATUS_LABELS_IT = {
  NotFound: "Non trovato",
  InfoReceived: "Informazioni ricevute",
  InTransit: "In transito",
  Expired: "Scaduto",
  AvailableForPickup: "Disponibile per il ritiro",
  OutForDelivery: "In consegna",
  DeliveryFailure: "Tentativo di consegna fallito",
  Delivered: "Consegnato",
  Exception: "Eccezione / Problema",
};

function translateStatus(status) {
  if (!status) return "-";
  return STATUS_LABELS_IT[status] || status;
}

async function callApi(endpoint, body) {
  if (!API_KEY) {
    throw new Error("SEVENTEEN_TRACK_API_KEY non configurata nel .env");
  }
  const url = `${BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "17token": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${text.slice(0, 200)}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Timeout dopo ${TIMEOUT_MS}ms su ${endpoint}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Registra un tracking number su 17TRACK. CONSUMA QUOTA solo se accepted.
 * @param {string} trackingNumber
 * @param {number|null} carrier - codice corriere 17TRACK (opzionale, per saltare auto-detect)
 * @returns {Promise<{success, alreadyRegistered, carrier, error, errorCode, needsCarrier}>}
 */
async function register(trackingNumber, carrier = null) {
  try {
    const item = { number: trackingNumber, lang: LANG };
    if (carrier && Number.isFinite(carrier)) item.carrier = Number(carrier);
    const json = await callApi("/register", [item]);

    const accepted = json?.data?.accepted || [];
    const rejected = json?.data?.rejected || [];

    if (accepted.length > 0) {
      return {
        success: true,
        alreadyRegistered: false,
        carrier: accepted[0]?.carrier ?? null,
        error: null,
        errorCode: null,
        needsCarrier: false,
      };
    }

    if (rejected.length > 0) {
      const r = rejected[0];
      const errorCode = r?.error?.code;
      const errorMsg = r?.error?.message || "Errore registrazione";

      // Quota esaurita: solleva eccezione dedicata
      if (errorCode === QUOTA_EXHAUSTED_CODE) {
        throw new TrackingQuotaException(errorMsg);
      }

      // Già registrato sull'account: trattalo come success (faremo solo il fetch info)
      if (errorCode === ALREADY_REGISTERED_CODE) {
        return {
          success: true,
          alreadyRegistered: true,
          carrier: r?.carrier ?? null,
          error: null,
          errorCode,
          needsCarrier: false,
        };
      }

      // Carrier non rilevato: il client può ritentare passando carrier
      const needsCarrier = errorCode === CARRIER_NOT_DETECTED_CODE;

      logger.warn({ trackingNumber, errorCode, errorMsg }, "tracking17 register rejected");
      return {
        success: false,
        alreadyRegistered: false,
        carrier: null,
        error: errorMsg,
        errorCode,
        needsCarrier,
      };
    }

    return { success: false, alreadyRegistered: false, carrier: null, error: "Risposta 17TRACK non valida", errorCode: null, needsCarrier: false };
  } catch (err) {
    if (err instanceof TrackingQuotaException) throw err;
    logger.error({ err, trackingNumber }, "Errore tracking17 register");
    return { success: false, alreadyRegistered: false, carrier: null, error: err.message, errorCode: null, needsCarrier: false };
  }
}

/**
 * Recupera lo stato di un tracking. NON consuma quota.
 * @param {string} trackingNumber
 */
async function getInfo(trackingNumber) {
  try {
    const payload = [{ number: trackingNumber }];
    const json = await callApi("/gettrackinfo", payload);

    const accepted = json?.data?.accepted || [];
    const rejected = json?.data?.rejected || [];

    if (rejected.length > 0) {
      const r = rejected[0];
      const errorCode = r?.error?.code;
      // -18019909 = registrato ma il corriere non ha ancora fornito info
      const isPending = errorCode === NO_INFO_YET_CODE;
      return {
        success: false,
        pending: isPending,
        status: isPending ? "InfoReceived" : "NotFound",
        sub_status: null,
        latest_event: null,
        milestone: [],
        events: [],
        carrier: r?.carrier ?? null,
        provider_name: null,
        error: r?.error?.message || "Tracking non trovato",
      };
    }

    if (accepted.length === 0) {
      return {
        success: false,
        pending: false,
        status: "NotFound",
        sub_status: null,
        latest_event: null,
        milestone: [],
        events: [],
        carrier: null,
        provider_name: null,
        error: "Nessun dato ricevuto",
      };
    }

    const track = accepted[0]?.track_info || {};
    const latestStatus = track?.latest_status || {};
    const latestEvent = track?.latest_event || null;
    const milestone = Array.isArray(track?.milestone) ? track.milestone : [];

    // Estrai eventi completi dal primo provider (lista cronologica)
    const provider = track?.tracking?.providers?.[0] || null;
    const rawEvents = Array.isArray(provider?.events) ? provider.events : [];
    const events = rawEvents.map((e) => ({
      description: e.description || null,
      location: e.location || null,
      address: e.address || null,
      time_iso: e.time_iso || e.time_utc || null,
      stage: e.stage || null,
      sub_status: e.sub_status || null,
    }));

    return {
      success: true,
      pending: false,
      status: latestStatus.status || null,
      sub_status: latestStatus.sub_status || null,
      latest_event: latestEvent
        ? {
            description: latestEvent.description || null,
            location: latestEvent.location || null,
            time_iso: latestEvent.time_iso || latestEvent.time_utc || null,
            stage: latestEvent.stage || null,
          }
        : null,
      milestone: milestone.map((m) => ({
        key_stage: m.key_stage || null,
        time_iso: m.time_iso || m.time_utc || null,
      })),
      events,
      carrier: accepted[0]?.carrier ?? null,
      provider_name: provider?.provider?.name || provider?.provider?.alias || null,
      error: null,
    };
  } catch (err) {
    logger.error({ err, trackingNumber }, "Errore tracking17 getInfo");
    return {
      success: false,
      pending: false,
      status: null,
      sub_status: null,
      latest_event: null,
      milestone: [],
      events: [],
      carrier: null,
      provider_name: null,
      error: err.message,
    };
  }
}

/**
 * Recupera la quota corrente dell'account 17TRACK. NON consuma quota.
 */
async function getQuota() {
  try {
    const json = await callApi("/getquota", []);
    const data = json?.data || {};

    // 17TRACK risponde tipicamente con { quota_total, quota_used, quota_remain }
    const total = Number(data.quota_total ?? data.total ?? 0);
    const used = Number(data.quota_used ?? data.used ?? 0);
    const remain = Number(data.quota_remain ?? data.remain ?? Math.max(total - used, 0));

    return { total, used, remain };
  } catch (err) {
    logger.error({ err }, "Errore tracking17 getQuota");
    return { total: 0, used: 0, remain: 0, error: err.message };
  }
}

/**
 * Elimina un tracking da 17TRACK. Libera lo slot (ma la quota speso non torna).
 */
async function deleteTracking(trackingNumber) {
  try {
    const payload = [{ number: trackingNumber }];
    const json = await callApi("/deletetrack", payload);

    const accepted = json?.data?.accepted || [];
    const rejected = json?.data?.rejected || [];

    if (accepted.length > 0) {
      return { success: true, error: null };
    }
    if (rejected.length > 0) {
      return { success: false, error: rejected[0]?.error?.message || "Errore eliminazione" };
    }
    return { success: false, error: "Risposta 17TRACK non valida" };
  } catch (err) {
    logger.error({ err, trackingNumber }, "Errore tracking17 deleteTracking");
    return { success: false, error: err.message };
  }
}

module.exports = {
  register,
  getInfo,
  getQuota,
  deleteTracking,
  translateStatus,
  STATUS_LABELS_IT,
  TrackingQuotaException,
  QUOTA_EXHAUSTED_CODE,
  COMMON_CARRIERS,
};
