// SP-API Notifications: gestione Destination + Subscription verso SQS.
//
// Flusso:
//   1. createDestination(queueArn) — registra la coda SQS come destination
//      (richiede grantless token, scope sellingpartnerapi::notifications)
//   2. createSubscription(type, destinationId) — sottoscrive un notification
//      type (es. ORDER_CHANGE) a quella destination. La maggior parte dei tipi
//      seller-specific richiedono il token REGOLARE (refresh_token-based), non
//      quello grantless: solo destination/listDestinations usano grantless.
//
// Tutte le funzioni "ensure*" sono idempotenti: se esiste già le riusano.

const axios = require("axios");
const { getAccessToken, getGrantlessToken } = require("../auth/authService");
const logger = require("../../utils/logger");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";
const SCOPE = "sellingpartnerapi::notifications";
const DEFAULT_DESTINATION_NAME = "picsnails-spapi";

// Tipi che vogliamo ricevere come push real-time. Ogni tipo va sottoscritto
// separatamente.
//   - NEW_ORDER: nuovi ordini in tempo reale (push 1-2s) — chiave per
//     allineamento Shopkeeper-grade. Richiede ruolo specifico SP-API.
//   - ORDER_STATUS_CHANGE: cambi di stato (Pending->Shipped) sempre utile
//   - ANY_OFFER_CHANGED: prezzi competitor
//   - MFN_ORDER_STATUS_CHANGE: solo se vendiamo FBM (richiede ruolo Direct
//     to Consumer Shipping). Lasciato qui, fallback se non autorizzato è ok.
const DEFAULT_TYPES = [
  "NEW_ORDER",
  "ORDER_STATUS_CHANGE",
  "ANY_OFFER_CHANGED",
  "MFN_ORDER_STATUS_CHANGE",
];

// Marketplace IDs EU (allineati a ordersLiveService.MARKETPLACES).
const EU_MARKETPLACE_IDS = [
  "APJ6JRA9NG5V4",  // IT
  "A13V1IB3VIYZZH", // FR
  "A1RKKUPIHCS9HS", // ES
  "A1PA6795UKMFR9", // DE
  "A1F83G8C2ARO7P", // UK
  "A1805IZSGTT6HS", // NL
  "AMEN7PMS3EDWL",  // BE
  "A1C3SOZRARQ6R3", // PL
];

// processingDirective specifico per tipo. I tipi default (ORDER_STATUS_CHANGE,
// ANY_OFFER_CHANGED) non richiedono directive. La funzione resta pronta per
// futuri tipi che ne avranno bisogno.
function buildProcessingDirective(_notificationType, _marketplaceIds = EU_MARKETPLACE_IDS) {
  return null;
}

async function spapiHeadersGrantless() {
  const { access_token } = await getGrantlessToken(SCOPE);
  return {
    Authorization: `Bearer ${access_token}`,
    "x-amz-access-token": access_token,
    "Content-Type": "application/json",
  };
}

async function spapiHeadersRegular() {
  const { access_token } = await getAccessToken();
  return {
    Authorization: `Bearer ${access_token}`,
    "x-amz-access-token": access_token,
    "Content-Type": "application/json",
  };
}

async function listDestinations() {
  const headers = await spapiHeadersGrantless();
  const r = await axios.get(`${BASE_URL}/notifications/v1/destinations`, {
    headers, timeout: 30_000,
  });
  return r.data?.payload || [];
}

async function createDestination({ name, queueArn }) {
  const headers = await spapiHeadersGrantless();
  const body = {
    name,
    resourceSpecification: { sqs: { arn: queueArn } },
  };
  const r = await axios.post(`${BASE_URL}/notifications/v1/destinations`, body, {
    headers, timeout: 30_000,
  });
  return r.data?.payload;
}

async function ensureDestination(queueArn, name = DEFAULT_DESTINATION_NAME) {
  const list = await listDestinations();
  const existing = list.find((d) => d.name === name);
  if (existing) {
    logger.info({ destinationId: existing.destinationId, name },
      "[Notifications] destination esistente");
    return existing;
  }
  const created = await createDestination({ name, queueArn });
  logger.info({ destinationId: created.destinationId, name },
    "[Notifications] destination creata");
  return created;
}

async function getSubscription(notificationType, payloadVersion = "1.0") {
  const headers = await spapiHeadersRegular();
  try {
    const r = await axios.get(
      `${BASE_URL}/notifications/v1/subscriptions/${notificationType}`,
      { params: { payloadVersion }, headers, timeout: 30_000 }
    );
    return r.data?.payload || null;
  } catch (e) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

async function createSubscription(notificationType, destinationId, payloadVersion = "1.0") {
  const headers = await spapiHeadersRegular();
  const body = { payloadVersion, destinationId };
  const directive = buildProcessingDirective(notificationType);
  if (directive) body.processingDirective = directive;
  const r = await axios.post(
    `${BASE_URL}/notifications/v1/subscriptions/${notificationType}`,
    body, { headers, timeout: 30_000 }
  );
  return r.data?.payload;
}

async function ensureSubscription(notificationType, destinationId) {
  const existing = await getSubscription(notificationType);
  if (existing && existing.destinationId === destinationId) {
    logger.info({ notificationType, subscriptionId: existing.subscriptionId },
      "[Notifications] subscription esistente");
    return { type: notificationType, subscription: existing, created: false };
  }
  // SP-API Notifications non permette UPDATE diretto: se esiste con destination
  // diversa, segnaliamo e lasciamo invariata. L'utente può cancellarla a mano.
  if (existing && existing.destinationId !== destinationId) {
    logger.warn(
      { notificationType, currentDest: existing.destinationId, wantedDest: destinationId },
      "[Notifications] subscription con destination diversa — invariata");
    return { type: notificationType, subscription: existing, created: false, mismatch: true };
  }
  const sub = await createSubscription(notificationType, destinationId);
  logger.info({ notificationType, subscriptionId: sub.subscriptionId },
    "[Notifications] subscription creata");
  return { type: notificationType, subscription: sub, created: true };
}

/**
 * Orchestratore one-shot: assicura destination + tutte le subscription dei tipi
 * richiesti. Idempotente. Da invocare una tantum dopo che la coda SQS esiste.
 */
async function setupAll({ queueArn, types = DEFAULT_TYPES, destinationName = DEFAULT_DESTINATION_NAME }) {
  if (!queueArn) throw new Error("queueArn richiesto");
  const destination = await ensureDestination(queueArn, destinationName);
  const subscriptions = [];
  for (const t of types) {
    try {
      const r = await ensureSubscription(t, destination.destinationId);
      subscriptions.push(r);
    } catch (e) {
      const errPayload = e?.response?.data || { message: e.message };
      logger.error({ type: t, err: errPayload }, "[Notifications] errore subscription");
      subscriptions.push({ type: t, error: errPayload });
    }
  }
  return { destination, subscriptions };
}

module.exports = {
  DEFAULT_TYPES,
  EU_MARKETPLACE_IDS,
  listDestinations,
  createDestination,
  ensureDestination,
  getSubscription,
  createSubscription,
  ensureSubscription,
  setupAll,
};
