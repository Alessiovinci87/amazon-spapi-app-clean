// Service inbound FBA: orchestra il flusso 7-step della Fulfillment Inbound API
// e persiste lo stato in inbound_plans / inbound_shipments / inbound_operations.
const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");
const api = require("./inboundApi");

const STEP_ORDER = ["items", "packing", "placement", "boxing", "transport", "delivery", "labels", "done"];

function maxStep(a, b) {
  const ia = STEP_ORDER.indexOf(a);
  const ib = STEP_ORDER.indexOf(b);
  return ia >= ib ? a : b;
}

// Memorizza il piu' avanzato step raggiunto (mai retrocede)
function advanceFurthest(planId, newStep) {
  const db = getDb();
  const cur = db.prepare(`SELECT furthest_step FROM inbound_plans WHERE id = ?`).get(planId);
  const newFurthest = cur?.furthest_step ? maxStep(cur.furthest_step, newStep) : newStep;
  db.prepare(`UPDATE inbound_plans SET furthest_step = ? WHERE id = ?`).run(newFurthest, planId);
}

const STEP = {
  ITEMS: "items",
  PACKING: "packing",
  PLACEMENT: "placement",
  BOXING: "boxing",
  TRANSPORT: "transport",
  DELIVERY: "delivery",
  LABELS: "labels",
  DONE: "done",
};

function getPlan(planId) {
  const db = getDb();
  const plan = db.prepare("SELECT * FROM inbound_plans WHERE id = ?").get(planId);
  if (!plan) throw new Error(`Piano ${planId} non trovato`);
  return plan;
}

function getPlanItems(planId) {
  return getDb().prepare("SELECT * FROM inbound_items WHERE plan_id = ?").all(planId);
}

function listPlans() {
  return getDb()
    .prepare("SELECT * FROM inbound_plans ORDER BY id DESC LIMIT 100")
    .all();
}

function createDraft({ name, marketplaceId, sourceAddress, items }) {
  if (!marketplaceId) throw new Error("marketplaceId richiesto");
  if (!sourceAddress) throw new Error("sourceAddress richiesto");
  if (!Array.isArray(items) || items.length === 0) throw new Error("items richiesti");

  const db = getDb();
  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO inbound_plans (name, marketplace_id, source_address, status, current_step)
         VALUES (?, ?, ?, 'DRAFT', 'items')`
      )
      .run(name || null, marketplaceId, JSON.stringify(sourceAddress));
    const planId = info.lastInsertRowid;

    const insItem = db.prepare(
      `INSERT INTO inbound_items (plan_id, asin, msku, quantity, prep_owner, labeling_owner, expiration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const it of items) {
      insItem.run(
        planId,
        it.asin || null,
        it.msku,
        it.quantity,
        it.prepOwner || "SELLER",
        it.labelingOwner || "SELLER",
        it.expiration || null
      );
    }
    return planId;
  });

  return tx();
}

async function createPlanOnAmazon(planId) {
  const plan = getPlan(planId);
  if (plan.amazon_plan_id) throw new Error("Piano gia' creato su Amazon");

  const items = getPlanItems(planId);
  const sourceAddress = JSON.parse(plan.source_address);

  const body = {
    destinationMarketplaces: [plan.marketplace_id],
    sourceAddress,
    items: items.map((it) => ({
      msku: it.msku,
      quantity: it.quantity,
      prepOwner: it.prep_owner,
      labelOwner: it.labeling_owner,
      expiration: it.expiration || undefined,
    })),
    name: plan.name || `Plan ${planId}`,
  };

  logger.info({ planId }, "[Inbound] createInboundPlan");
  const res = await api.createInboundPlan(body);

  const db = getDb();
  db.prepare(
    `UPDATE inbound_plans SET amazon_plan_id = ?, status = 'PLAN_CREATED', current_step = 'packing' WHERE id = ?`
  ).run(res.inboundPlanId, planId);
  advanceFurthest(planId, "packing");

  if (res.operationId) {
    db.prepare(
      `INSERT INTO inbound_operations (plan_id, operation_id, operation_type) VALUES (?, ?, 'createInboundPlan')`
    ).run(planId, res.operationId);
  }

  return { amazonPlanId: res.inboundPlanId, operationId: res.operationId };
}

async function startPacking(planId) {
  const plan = getPlan(planId);
  if (!plan.amazon_plan_id) throw new Error("Piano non ancora creato su Amazon");

  try {
    const res = await api.generatePackingOptions(plan.amazon_plan_id);
    getDb()
      .prepare(
        `INSERT INTO inbound_operations (plan_id, operation_id, operation_type) VALUES (?, ?, 'generatePackingOptions')`
      )
      .run(planId, res.operationId);
    return { ...res, skipped: false };
  } catch (err) {
    // Alcuni piani (1 SKU semplice, no prep) non supportano packingOptions:
    // Amazon li tratta come gia' packed di default. In tal caso saltiamo lo step.
    const msg = (err.message || "") + JSON.stringify(err.details || {});
    if (/does not support packing/i.test(msg) || /OPERATION_NOT_SUPPORTED/i.test(msg)) {
      logger.warn({ planId }, "[Inbound] piano non supporta packing options, salto a placement");
      getDb()
        .prepare(
          `UPDATE inbound_plans SET status='PACKING_CONFIRMED', current_step='placement' WHERE id = ?`
        )
        .run(planId);
      return { skipped: true, reason: "Piano semplice: Amazon ha gia' definito il packing automaticamente." };
    }
    throw err;
  }
}

async function listPackingOptions(planId) {
  const plan = getPlan(planId);
  return api.listPackingOptions(plan.amazon_plan_id);
}

async function confirmPacking(planId, packingOptionId) {
  const plan = getPlan(planId);
  const res = await api.confirmPackingOption(plan.amazon_plan_id, packingOptionId);
  getDb()
    .prepare(
      `UPDATE inbound_plans SET selected_packing_group_id = ?, status = 'PACKING_CONFIRMED', current_step = 'placement' WHERE id = ?`
    )
    .run(packingOptionId, planId);
  advanceFurthest(planId, "placement");
  return res;
}

async function pollOperation(operationId) {
  return api.getOperationStatus(operationId);
}

async function downloadLabels(planId, shipmentId, opts = {}) {
  return api.getLabels(shipmentId, {
    pageType: opts.pageType || "PackageLabel_Thermal",   // 10x15 cm termica
    labelType: opts.labelType || "BARCODE_2D",
  });
}

// Polla un operationId fino a SUCCESS/FAILED (utility riusabile)
async function waitForOperation(operationId, { maxAttempts = 30, intervalMs = 2000 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await api.getOperationStatus(operationId);
    if (res.operationStatus === "SUCCESS") return res;
    if (res.operationStatus === "FAILED") {
      const err = new Error(res.operationProblems?.[0]?.message || "Operazione fallita");
      err.details = res.operationProblems;
      throw err;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout dopo ${maxAttempts * intervalMs}ms`);
}

// Configura trasporto USE_YOUR_OWN_CARRIER end-to-end (generate -> wait -> list -> confirm -> wait)
async function configureUseYourOwnCarrier(planId, { readyToShipDate, contactName, contactPhone, contactEmail, carrierCode }) {
  const plan = getPlan(planId);
  if (!plan.amazon_plan_id) throw new Error("Piano non creato su Amazon");
  if (!plan.selected_placement_id) throw new Error("Placement non confermato");

  // Recupera shipments dall'endpoint dedicato
  const shipRes = await api.listInboundPlanShipments(plan.amazon_plan_id);
  const shipments = shipRes?.shipments || [];
  if (shipments.length === 0) throw new Error("Nessuno shipment nel piano (placement non ancora confermato?)");

  // ISO 8601 con orario futuro: se la data e' oggi, usa now+2h; altrimenti 08:00 UTC del giorno scelto
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  let readyIso;
  if (readyToShipDate === todayStr) {
    const future = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    readyIso = future.toISOString().split(".")[0] + "Z";
  } else {
    readyIso = `${readyToShipDate}T08:00:00Z`;
  }
  logger.info({ readyToShipDate, readyIso }, "[Inbound] readyToShipWindow calcolato");

  const shippingMode = plan.shipping_mode === "LESS_THAN_TRUCKLOAD" ? "LESS_THAN_TRUCKLOAD" : "GROUND_SMALL_PARCEL";
  logger.info({ planId, shippingMode }, "[Inbound] configureUseYourOwnCarrier - shippingMode da plan");

  const configurations = shipments.map(s => ({
    shipmentId: s.shipmentId,
    contactInformation: {
      name: contactName,
      phoneNumber: contactPhone,
      email: contactEmail,
    },
    readyToShipWindow: { start: readyIso },
    shippingSolution: "USE_YOUR_OWN_CARRIER",
    shippingMode,
    ...(carrierCode ? { carrier: { alphaCode: carrierCode } } : {}),
  }));

  // Generate
  const genRes = await api.generateTransportationOptions(plan.amazon_plan_id, {
    placementOptionId: plan.selected_placement_id,
    shipmentTransportationConfigurations: configurations,
  });
  await waitForOperation(genRes.operationId);

  // List richiede placementOptionId (o shipmentId) come query
  const listRes = await api.listTransportationOptions(plan.amazon_plan_id, {
    placementOptionId: plan.selected_placement_id,
  });
  const options = listRes.transportationOptions || [];

  // Per ogni shipment prendi la prima opzione disponibile
  const selections = shipments
    .map(s => {
      const found = options.find(o => o.shipmentId === s.shipmentId);
      if (!found) return null;
      return { shipmentId: s.shipmentId, transportationOptionId: found.transportationOptionId };
    })
    .filter(Boolean);

  if (selections.length === 0) throw new Error(`Nessuna transportationOption generata per gli shipment (opzioni totali: ${options.length}).`);

  logger.info({ selections }, "[Inbound] confermo transportationSelections");
  const confRes = await api.confirmTransportationOptions(plan.amazon_plan_id, {
    transportationSelections: selections,
  });
  await waitForOperation(confRes.operationId);

  getDb()
    .prepare(`UPDATE inbound_plans SET status='TRANSPORT_CONFIRMED', current_step='delivery' WHERE id = ?`)
    .run(planId);
  advanceFurthest(planId, "delivery");

  return { transportationSelections: selections, shipments: shipments.length };
}

// Helper: rileva errori "workflow gia' avanzato lato Amazon" e segnala auto-skip
function isAlreadyDoneError(err) {
  const msg = (err.message || "") + JSON.stringify(err.details || {});
  return (
    /does not support/i.test(msg) ||
    /OPERATION_NOT_SUPPORTED/i.test(msg) ||
    /read-only/i.test(msg) ||
    /cannot be modified/i.test(msg) ||
    /already (confirmed|completed)/i.test(msg)
  );
}

// ─── Placement ───────────────────────────────────────────────
async function startPlacement(planId) {
  const plan = getPlan(planId);
  try {
    const res = await api.generatePlacementOptions(plan.amazon_plan_id);
    getDb()
      .prepare(`INSERT INTO inbound_operations (plan_id, operation_id, operation_type) VALUES (?, ?, 'generatePlacementOptions')`)
      .run(planId, res.operationId);
    return { ...res, skipped: false };
  } catch (err) {
    if (isAlreadyDoneError(err)) {
      logger.warn({ planId }, "[Inbound] placement gia' definito lato Amazon, salto a transport");
      getDb()
        .prepare(`UPDATE inbound_plans SET status='PLACEMENT_CONFIRMED', current_step='transport' WHERE id = ?`)
        .run(planId);
      return { skipped: true, reason: "Amazon ha gia' definito il placement per questo piano." };
    }
    throw err;
  }
}
async function listPlacementOptions(planId) {
  const plan = getPlan(planId);
  return api.listPlacementOptions(plan.amazon_plan_id);
}
async function confirmPlacement(planId, placementOptionId) {
  const plan = getPlan(planId);
  const res = await api.confirmPlacementOption(plan.amazon_plan_id, placementOptionId);
  // Amazon crea gli shipments asincronamente: dobbiamo attendere la SUCCESS
  // dell'operation prima di avanzare, altrimenti BoxingStep vedrebbe 0 shipments.
  if (res?.operationId) {
    try {
      await waitForOperation(res.operationId, { maxAttempts: 30, intervalMs: 2000 });
    } catch (e) {
      logger.warn({ planId, err: e.message }, "[Inbound] confirmPlacement: operation non SUCCESS entro timeout (proseguo lo stesso)");
    }
  }
  getDb()
    .prepare(`UPDATE inbound_plans SET selected_placement_id = ?, status = 'PLACEMENT_CONFIRMED', current_step = 'boxing' WHERE id = ?`)
    .run(placementOptionId, planId);
  advanceFurthest(planId, "boxing");
  return res;
}

// Imballaggio: dichiara dimensioni/peso cartoni + tipo spedizione
async function configureBoxing(planId, { shippingMode, packageGroupings }) {
  const plan = getPlan(planId);
  if (!plan.amazon_plan_id) throw new Error("Piano non creato su Amazon");
  if (!packageGroupings || packageGroupings.length === 0) throw new Error("Dichiara almeno un cartone");

  const mode = shippingMode === "LESS_THAN_TRUCKLOAD" ? "LESS_THAN_TRUCKLOAD" : "GROUND_SMALL_PARCEL";

  const res = await api.setPackingInformation(plan.amazon_plan_id, { packageGroupings });
  await waitForOperation(res.operationId);

  getDb()
    .prepare(`UPDATE inbound_plans SET current_step = 'transport', shipping_mode = ? WHERE id = ?`)
    .run(mode, planId);
  advanceFurthest(planId, "transport");

  return { ok: true, shippingMode: mode };
}

// ─── Transportation ──────────────────────────────────────────
async function startTransportation(planId, body) {
  const plan = getPlan(planId);
  try {
    const res = await api.generateTransportationOptions(plan.amazon_plan_id, body);
    getDb()
      .prepare(`INSERT INTO inbound_operations (plan_id, operation_id, operation_type) VALUES (?, ?, 'generateTransportationOptions')`)
      .run(planId, res.operationId);
    return { ...res, skipped: false };
  } catch (err) {
    if (isAlreadyDoneError(err)) {
      logger.warn({ planId }, "[Inbound] transport gia' definito lato Amazon, salto a delivery");
      getDb()
        .prepare(`UPDATE inbound_plans SET status='TRANSPORT_CONFIRMED', current_step='delivery' WHERE id = ?`)
        .run(planId);
      return { skipped: true, reason: "Amazon ha gia' definito il trasporto." };
    }
    throw err;
  }
}
async function listTransportationOptions(planId, query) {
  const plan = getPlan(planId);
  return api.listTransportationOptions(plan.amazon_plan_id, query);
}
async function confirmTransportation(planId, body) {
  const plan = getPlan(planId);
  const res = await api.confirmTransportationOptions(plan.amazon_plan_id, body);
  getDb()
    .prepare(`UPDATE inbound_plans SET status = 'TRANSPORT_CONFIRMED', current_step = 'delivery' WHERE id = ?`)
    .run(planId);
  return res;
}

// ─── Delivery Window ────────────────────────────────────────
async function startDelivery(planId, shipmentId) {
  const plan = getPlan(planId);
  const res = await api.generateDeliveryWindowOptions(plan.amazon_plan_id, shipmentId);
  getDb()
    .prepare(`INSERT INTO inbound_operations (plan_id, operation_id, operation_type) VALUES (?, ?, 'generateDeliveryWindowOptions')`)
    .run(planId, res.operationId);
  return res;
}

// Prepara delivery windows per uno shipment: generate -> wait -> list
async function prepareDeliveryWindows(planId, shipmentId) {
  const plan = getPlan(planId);
  if (!plan.amazon_plan_id) throw new Error("Piano non creato su Amazon");
  try {
    const gen = await api.generateDeliveryWindowOptions(plan.amazon_plan_id, shipmentId);
    await waitForOperation(gen.operationId);
  } catch (err) {
    // Se gia' generato in precedenza, Amazon torna "already" o "read-only" → procediamo
    const msg = (err.message || "") + JSON.stringify(err.details || {});
    if (!/already|read-only|in_progress/i.test(msg)) {
      logger.warn({ err: msg }, "[Inbound] generateDeliveryWindowOptions warn");
    }
  }
  const list = await api.listDeliveryWindowOptions(plan.amazon_plan_id, shipmentId);
  return list?.deliveryWindowOptions || [];
}
async function listDeliveryWindowOptions(planId, shipmentId) {
  const plan = getPlan(planId);
  return api.listDeliveryWindowOptions(plan.amazon_plan_id, shipmentId);
}
async function confirmDelivery(planId, shipmentId, deliveryWindowOptionId) {
  const plan = getPlan(planId);
  const res = await api.confirmDeliveryWindowOption(plan.amazon_plan_id, shipmentId, deliveryWindowOptionId);
  getDb()
    .prepare(`UPDATE inbound_plans SET status = 'DELIVERY_CONFIRMED', current_step = 'labels' WHERE id = ?`)
    .run(planId);
  advanceFurthest(planId, "labels");
  return res;
}

// ─── Plan summary (per leggere shipments dopo placement) ─────
async function getPlanSummary(planId) {
  const plan = getPlan(planId);
  let shipmentsError = null;
  // Amazon richiede 2 chiamate distinte: il piano (metadati) e l'elenco shipments
  const [summary, shipRes] = await Promise.all([
    api.getInboundPlan(plan.amazon_plan_id).catch((e) => {
      logger.error({ err: e.message, planId, amazonPlanId: plan.amazon_plan_id }, "[Inbound] getInboundPlan failed");
      return null;
    }),
    api.listInboundPlanShipments(plan.amazon_plan_id).catch((e) => {
      logger.error({ err: e.message, status: e.status, planId, amazonPlanId: plan.amazon_plan_id }, "[Inbound] listInboundPlanShipments failed");
      shipmentsError = { status: e.status, message: e.message };
      return { shipments: [] };
    }),
  ]);
  const inboundPlan = summary?.inboundPlan || summary || {};
  const shipments = shipRes?.shipments || [];
  logger.info({ planId, amazonPlanId: plan.amazon_plan_id, planStatus: inboundPlan.status, shipmentsCount: shipments.length, shipmentsError }, "[Inbound] getPlanSummary");
  return { inboundPlan, shipments, shipmentsError };
}

// Legge stato reale Amazon e ricalcola current_step locale.
// Tenta anche di leggere placement options esistenti: se Amazon le ha gia',
// significa che il workflow e' avanti rispetto a noi.
async function syncWithAmazon(planId) {
  const plan = getPlan(planId);
  if (!plan.amazon_plan_id) throw new Error("Piano non ancora creato su Amazon");

  const [summary, shipRes] = await Promise.all([
    api.getInboundPlan(plan.amazon_plan_id),
    api.listInboundPlanShipments(plan.amazon_plan_id).catch(() => ({ shipments: [] })),
  ]);
  const ip = summary?.inboundPlan || summary || {};
  const shipments = shipRes?.shipments || [];

  // Piano marcato ERRORED da Amazon -> non recuperabile, lo segnaliamo
  if (ip.status === "ERRORED") {
    getDb()
      .prepare(`UPDATE inbound_plans SET status = 'VOIDED' WHERE id = ?`)
      .run(planId);
    return { errored: true, amazonStatus: "ERRORED", reason: "Amazon ha rifiutato questo piano (status ERRORED). Causa piu' comune: MSKU non corrispondente a un listing attivo del seller. Crea un nuovo piano con MSKU valido." };
  }

  // Prova a leggere placement options gia' esistenti (se ce ne sono, placement e' fatto)
  let placementsExist = false;
  try {
    const placement = await api.listPlacementOptions(plan.amazon_plan_id);
    placementsExist = (placement?.placementOptions || []).length > 0;
  } catch { /* ignore */ }

  let newStep = plan.current_step;
  let newStatus = plan.status;

  const hasShipments = shipments.length > 0;
  const allConfirmed = hasShipments && shipments.every(s => s.status && !["WORKING", "READY_TO_SHIP"].includes(s.status));

  // Se gli shipments sono in stato avanzato → labels o oltre
  if (allConfirmed) {
    newStep = "labels";
    newStatus = "DELIVERY_CONFIRMED";
  } else if (hasShipments) {
    // Ci sono shipments → placement fatto. Puo' essere in transport o delivery.
    // Se shipments hanno destination valida → siamo almeno a transport
    if (["items", "packing", "placement"].includes(newStep)) {
      newStep = "transport";
      newStatus = "PLACEMENT_CONFIRMED";
    }
  } else if (placementsExist) {
    // Ci sono placement options ma non shipments confermati → siamo a placement (mostriamo opzioni)
    if (["items", "packing"].includes(newStep)) {
      newStep = "placement";
      newStatus = "PACKING_CONFIRMED";
    }
  }

  getDb()
    .prepare(`UPDATE inbound_plans SET current_step = ?, status = ? WHERE id = ?`)
    .run(newStep, newStatus, planId);
  advanceFurthest(planId, newStep);

  return { current_step: newStep, status: newStatus, shipments: shipments.length, placementsExist };
}

function markDone(planId) {
  getDb()
    .prepare(`UPDATE inbound_plans SET status = 'DELIVERY_CONFIRMED', current_step = 'done' WHERE id = ?`)
    .run(planId);
  advanceFurthest(planId, "done");
}

function deletePlan(planId) {
  return getDb().prepare("DELETE FROM inbound_plans WHERE id = ?").run(planId);
}

module.exports = {
  STEP,
  listPlans,
  getPlan,
  getPlanItems,
  createDraft,
  createPlanOnAmazon,
  startPacking,
  listPackingOptions,
  confirmPacking,
  startPlacement,
  listPlacementOptions,
  confirmPlacement,
  startTransportation,
  listTransportationOptions,
  confirmTransportation,
  startDelivery,
  prepareDeliveryWindows,
  listDeliveryWindowOptions,
  confirmDelivery,
  getPlanSummary,
  syncWithAmazon,
  configureBoxing,
  configureUseYourOwnCarrier,
  markDone,
  pollOperation,
  downloadLabels,
  deletePlan,
};
