// SP-API Notifications: gestione Destination + Subscription verso SQS.
//
// Flusso:
//   1. createDestination(queueArn) — registra la coda SQS come destination
//      (richiede grantless token, scope sellingpartnerapi::notifications)
//   2. createSubscription(type, destinationId) — sottoscrive un notification
//      type (es. ORDER_CHANGE) a quella destination
//
// Tutte le funzioni "ensure*" sono idempotenti: se esiste già le riusano.

const axios = require("axios");
const { getGrantlessToken } = require("../auth/authService");
const logger = require("../../utils/logger");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";
const SCOPE = "sellingpartnerapi::notifications";
const DEFAULT_DESTINATION_NAME = "picsnails-spapi";

// Tipi che vogliamo ricevere come push real-time. Ogni tipo va sottoscritto
// separatamente. Il primo target è ORDER_CHANGE (vendite live).
const DEFAULT_TYPES = [
  "ORDER_CHANGE",
  "ANY_OFFER_CHANGED",
  "LISTINGS_ITEM_STATUS_CHANGE",
  "LISTINGS_ITEM_ISSUES_CHANGE",
  "MFN_ORDER_STATUS_CHANGE",
];

async function spapiHeaders() {
  const { access_token } = await getGrantlessToken(SCOPE);
  return {
    Authorization: `Bearer ${access_token}`,
    "x-amz-access-token": access_token,
    "Content-Type": "application/json",
  };
}

async function listDestinations() {
  const headers = await spapiHeaders();
  const r = await axios.get(`${BASE_URL}/notifications/v1/destinations`, {
    headers, timeout: 30_000,
  });
  return r.data?.payload || [];
}

async function createDestination({ name, queueArn }) {
  const headers = await spapiHeaders();
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
  const headers = await spapiHeaders();
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
  const headers = await spapiHeaders();
  const body = { payloadVersion, destinationId };
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
  listDestinations,
  createDestination,
  ensureDestination,
  getSubscription,
  createSubscription,
  ensureSubscription,
  setupAll,
};
