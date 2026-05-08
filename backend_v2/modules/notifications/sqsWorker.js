// Worker SQS per SP-API Notifications.
// Long-polling continuo sulla coda: per ogni messaggio ricevuto, dispatching
// in base a NotificationType. Cancellazione del messaggio solo dopo successo;
// in caso di errore lo lasciamo, Amazon lo riproporrà dopo VisibilityTimeout.

const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");

const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");
const {
  fetchOrderById,
  enrichOrderWithItems,
} = require("../reports/ordersLiveService");
const { getAccessToken } = require("../auth/authService");

const QUEUE_NAME = process.env.SQS_QUEUE_NAME || "picsnails-spapi-events";
const REGION = process.env.AWS_REGION || "eu-west-1";
const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;

// Long-poll più aggressivo possibile (max consentito da SQS)
const WAIT_TIME_SECONDS = 20;
// Messaggi per batch
const MAX_MESSAGES = 10;
// Quanto attendere prima di una nuova ReceiveMessage in caso di errore
const ERROR_BACKOFF_MS = 5_000;
// Debounce computeMetrics (massimo una volta ogni 30s)
const METRICS_DEBOUNCE_MS = 30_000;

let _running = false;
let _stopRequested = false;
let _client = null;
let _queueUrl = null;
let _lastMetricsRun = 0;
let _metricsTimer = null;

function getClient() {
  if (!_client) _client = new SQSClient({ region: REGION });
  return _client;
}

function buildQueueUrl() {
  if (!ACCOUNT_ID) throw new Error("AWS_ACCOUNT_ID non impostato in .env");
  return `https://sqs.${REGION}.amazonaws.com/${ACCOUNT_ID}/${QUEUE_NAME}`;
}

/**
 * Trigger di computeMetricsLast7Days() debounced. Se chiamato più volte in
 * rapida successione (es. 50 ordini in 1 minuto), esegue al massimo una volta
 * ogni METRICS_DEBOUNCE_MS. Pattern trailing-edge: garantisce un run finale.
 */
function scheduleMetricsCompute() {
  const now = Date.now();
  const elapsed = now - _lastMetricsRun;
  if (elapsed >= METRICS_DEBOUNCE_MS) {
    _lastMetricsRun = now;
    runMetricsCompute();
    return;
  }
  if (_metricsTimer) return;
  const wait = METRICS_DEBOUNCE_MS - elapsed;
  _metricsTimer = setTimeout(() => {
    _metricsTimer = null;
    _lastMetricsRun = Date.now();
    runMetricsCompute();
  }, wait);
}

function runMetricsCompute() {
  try {
    const { computeMetricsLast7Days } = require("../reports/metricsCompute");
    computeMetricsLast7Days();
    logger.info("[SQS] metrics compute triggered (last 7 days)");
  } catch (err) {
    logger.warn({ err: err.message }, "[SQS] metrics compute failed");
  }
}

async function handleOrderStatusChange(notification) {
  const inner = notification?.Payload?.OrderStatusChangeNotification;
  const orderId = inner?.AmazonOrderId;
  const newStatus = inner?.OrderStatus;
  if (!orderId) {
    logger.warn({ notification }, "[SQS] ORDER_STATUS_CHANGE senza AmazonOrderId");
    return;
  }
  logger.info({ orderId, newStatus }, "[SQS] ORDER_STATUS_CHANGE ricevuto");

  const order = await fetchOrderById(orderId);
  if (!order || !order.AmazonOrderId) {
    logger.warn({ orderId }, "[SQS] fetchOrderById non ha restituito un ordine");
    return;
  }
  const { access_token } = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${access_token}`,
    "x-amz-access-token": access_token,
  };
  const db = getDb();
  const enriched = await enrichOrderWithItems(order, headers, db);
  logger.info(
    {
      orderId,
      status: order.OrderStatus,
      units: enriched.units,
      revenue: enriched.revenue,
      currency: enriched.currency,
    },
    "[SQS] order upserted in cache"
  );
  scheduleMetricsCompute();
}

async function handleAnyOfferChanged(notification) {
  const inner = notification?.Payload?.AnyOfferChangedNotification;
  const asin = inner?.OfferChangeTrigger?.ASIN;
  const marketplaceId = inner?.OfferChangeTrigger?.MarketplaceId;
  // Per ora ci limitiamo a loggare. La logica competitor live verrà
  // collegata in futuro: il payload contiene Summary + Offers già pronti.
  logger.info({ asin, marketplaceId }, "[SQS] ANY_OFFER_CHANGED ricevuto");
}

async function handleNewOrder(notification) {
  // Payload NEW_ORDER:
  // { Payload: { OrderNotification: { AmazonOrderId, OrderStatus,
  //   PurchaseDate, MarketplaceID, ... } } }
  const inner = notification?.Payload?.OrderNotification;
  const orderId = inner?.AmazonOrderId;
  if (!orderId) {
    logger.warn({ notification }, "[SQS] NEW_ORDER senza AmazonOrderId");
    return;
  }
  logger.info({ orderId, status: inner?.OrderStatus }, "[SQS] NEW_ORDER ricevuto");

  // Stessa logica di ORDER_STATUS_CHANGE: fetch dettagli + enrich + upsert
  const order = await fetchOrderById(orderId);
  if (!order || !order.AmazonOrderId) {
    logger.warn({ orderId }, "[SQS] fetchOrderById non ha restituito un ordine");
    return;
  }
  const { access_token } = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${access_token}`,
    "x-amz-access-token": access_token,
  };
  const db = getDb();
  const enriched = await enrichOrderWithItems(order, headers, db);
  logger.info(
    {
      orderId,
      status: order.OrderStatus,
      units: enriched.units,
      revenue: enriched.revenue,
      currency: enriched.currency,
    },
    "[SQS] new order upserted in cache"
  );
  scheduleMetricsCompute();
}

async function dispatch(notification) {
  const type = notification?.NotificationType;
  switch (type) {
    case "NEW_ORDER":
      await handleNewOrder(notification);
      break;
    case "ORDER_STATUS_CHANGE":
    case "MFN_ORDER_STATUS_CHANGE":
      await handleOrderStatusChange(notification);
      break;
    case "ANY_OFFER_CHANGED":
      await handleAnyOfferChanged(notification);
      break;
    default:
      logger.warn({ type }, "[SQS] notification type non gestito");
  }
}

async function processMessage(msg) {
  let body;
  try {
    body = JSON.parse(msg.Body);
  } catch (err) {
    logger.error({ messageId: msg.MessageId, body: msg.Body },
      "[SQS] body non e' JSON valido — cancello per evitare loop");
    // Body malformato: cancellare per non bloccare la coda. Non c'è retry utile.
    await deleteMessage(msg.ReceiptHandle);
    return;
  }
  await dispatch(body);
  await deleteMessage(msg.ReceiptHandle);
}

async function deleteMessage(receiptHandle) {
  await getClient().send(new DeleteMessageCommand({
    QueueUrl: _queueUrl,
    ReceiptHandle: receiptHandle,
  }));
}

async function pollOnce() {
  const r = await getClient().send(new ReceiveMessageCommand({
    QueueUrl: _queueUrl,
    MaxNumberOfMessages: MAX_MESSAGES,
    WaitTimeSeconds: WAIT_TIME_SECONDS,
  }));
  const msgs = r.Messages || [];
  if (msgs.length === 0) return 0;
  for (const msg of msgs) {
    try {
      await processMessage(msg);
    } catch (err) {
      // Errore di processing: NON cancellare. SQS riproporrà il messaggio
      // dopo VisibilityTimeout (300s). Loggiamo e continuiamo con i prossimi.
      logger.error(
        { err: err.response?.data || err.message, messageId: msg.MessageId },
        "[SQS] errore processMessage — messaggio non cancellato"
      );
    }
  }
  return msgs.length;
}

async function loop() {
  while (!_stopRequested) {
    try {
      await pollOnce();
    } catch (err) {
      logger.error({ err: err.message }, "[SQS] errore ReceiveMessage, backoff 5s");
      await new Promise((r) => setTimeout(r, ERROR_BACKOFF_MS));
    }
  }
  _running = false;
  logger.info("[SQS] worker stopped");
}

function startSqsWorker() {
  if (_running) {
    logger.warn("[SQS] worker già in esecuzione");
    return;
  }
  if (!ACCOUNT_ID) {
    logger.warn("[SQS] AWS_ACCOUNT_ID non impostato — worker non avviato");
    return;
  }
  _queueUrl = buildQueueUrl();
  _stopRequested = false;
  _running = true;
  logger.info({ queueUrl: _queueUrl }, "[SQS] worker started");
  loop().catch((err) => {
    logger.error({ err: err.message }, "[SQS] loop crashed");
    _running = false;
  });
}

function stopSqsWorker() {
  _stopRequested = true;
}

module.exports = { startSqsWorker, stopSqsWorker };
