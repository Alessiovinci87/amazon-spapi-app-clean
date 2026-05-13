// Service inbound FBA: orchestra il flusso 7-step della Fulfillment Inbound API
// e persiste lo stato in inbound_plans / inbound_shipments / inbound_operations.
const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");
const api = require("./inboundApiClient");

const STEP = {
  ITEMS: "items",
  PACKING: "packing",
  PLACEMENT: "placement",
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

  const res = await api.generatePackingOptions(plan.amazon_plan_id);
  getDb()
    .prepare(
      `INSERT INTO inbound_operations (plan_id, operation_id, operation_type) VALUES (?, ?, 'generatePackingOptions')`
    )
    .run(planId, res.operationId);
  return res;
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
  return res;
}

async function pollOperation(operationId) {
  return api.getOperationStatus(operationId);
}

async function downloadLabels(planId, shipmentId, opts = {}) {
  return api.getLabels(shipmentId, {
    pageType: opts.pageType || "PackageLabel_Letter_6",
    labelType: opts.labelType || "BARCODE_2D",
  });
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
  pollOperation,
  downloadLabels,
  deletePlan,
};
