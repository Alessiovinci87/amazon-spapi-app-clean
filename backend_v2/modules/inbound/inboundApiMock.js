// Mock dell'API Fulfillment Inbound: stesse signature di inboundApiClient.js
// ma risposte sintetiche realistiche. Permette di testare il wizard
// senza inviare nulla ad Amazon. Le operazioni sono "instant" (gia' SUCCESS).

let _planSeq = 9000;
let _opSeq = 0;
let _shipSeq = 0;

function makeOpId() { _opSeq += 1; return `MOCK-OP-${Date.now()}-${_opSeq}`; }
function makePlanId() { _planSeq += 1; return `MOCK-PLAN-${_planSeq}`; }
function makeShipmentId() { _shipSeq += 1; return `FBA${15000000 + _shipSeq}`; }

// Stato in-memory per simulare consistenza tra le chiamate
const _state = new Map(); // planId -> { items, packingOptions, placementOptions, shipments, ... }

function getState(planId) {
  if (!_state.has(planId)) _state.set(planId, { shipments: [] });
  return _state.get(planId);
}

async function createInboundPlan(body) {
  const planId = makePlanId();
  _state.set(planId, { items: body.items, shipments: [] });
  return { inboundPlanId: planId, operationId: makeOpId() };
}

async function getInboundPlan(planId) {
  const st = getState(planId);
  return { inboundPlan: { inboundPlanId: planId, status: "ACTIVE", shipments: st.shipments } };
}

async function generatePackingOptions(_planId) {
  return { operationId: makeOpId() };
}

async function listPackingOptions(planId) {
  return {
    packingOptions: [
      { packingOptionId: `pko-${planId}-default`, status: "OFFERED", packingGroups: [{ packingGroupId: "grp-1" }] },
      { packingOptionId: `pko-${planId}-multi`, status: "OFFERED", packingGroups: [{ packingGroupId: "grp-1" }, { packingGroupId: "grp-2" }] },
    ],
  };
}

async function confirmPackingOption(_planId, _id) {
  return { operationId: makeOpId() };
}

async function generatePlacementOptions(_planId) {
  return { operationId: makeOpId() };
}

async function listPlacementOptions(planId) {
  const st = getState(planId);
  // Genera 2 shipment fittizi
  if (st.shipments.length === 0) {
    st.shipments = [
      { shipmentId: makeShipmentId(), destination: { address: { city: "Castelguglielmo", postalCode: "45020", countryCode: "IT" } }, status: "WORKING" },
      { shipmentId: makeShipmentId(), destination: { address: { city: "Vercelli", postalCode: "20023", countryCode: "IT" } }, status: "WORKING" },
    ];
  }
  return {
    placementOptions: [
      { placementOptionId: `plo-${planId}-cheap`, status: "OFFERED", shipmentIds: st.shipments.map(s => s.shipmentId), fees: [{ type: "FBA_INBOUND_PLACEMENT", value: { amount: 0, code: "EUR" } }] },
      { placementOptionId: `plo-${planId}-fast`, status: "OFFERED", shipmentIds: [st.shipments[0].shipmentId], fees: [{ type: "FBA_INBOUND_PLACEMENT", value: { amount: 4.50, code: "EUR" } }] },
    ],
  };
}

async function confirmPlacementOption(_planId, _id) {
  return { operationId: makeOpId() };
}

async function generateTransportationOptions(_planId, _body) {
  return { operationId: makeOpId() };
}

async function listTransportationOptions(_planId, _query) {
  return { transportationOptions: [
    { transportationOptionId: "tro-own-carrier", carrier: { name: "USE_YOUR_OWN_CARRIER" }, shippingMode: "GROUND_SMALL_PARCEL" },
  ] };
}

async function confirmTransportationOptions(_planId, _body) {
  return { operationId: makeOpId() };
}

async function generateDeliveryWindowOptions(_planId, _shipmentId) {
  return { operationId: makeOpId() };
}

async function listDeliveryWindowOptions(planId, shipmentId) {
  const now = new Date();
  const w1 = new Date(now.getTime() + 3 * 86400000);
  const w2 = new Date(now.getTime() + 5 * 86400000);
  return {
    deliveryWindowOptions: [
      { deliveryWindowOptionId: `dwo-${shipmentId}-1`, startDate: w1.toISOString(), endDate: new Date(w1.getTime()+86400000).toISOString(), validUntil: new Date(now.getTime()+7200000).toISOString(), status: "AVAILABLE" },
      { deliveryWindowOptionId: `dwo-${shipmentId}-2`, startDate: w2.toISOString(), endDate: new Date(w2.getTime()+86400000).toISOString(), validUntil: new Date(now.getTime()+7200000).toISOString(), status: "AVAILABLE" },
    ],
  };
}

async function confirmDeliveryWindowOption(_planId, _shipmentId, _id) {
  return { operationId: makeOpId() };
}

async function getOperationStatus(operationId) {
  // In modalita' mock le operazioni sono istantaneamente SUCCESS
  return { operationId, operationStatus: "SUCCESS", operationProblems: [] };
}

async function getLabels(shipmentId, _query) {
  return {
    documentDownloads: [
      { downloadURL: `https://example.invalid/mock-labels-${shipmentId}.pdf`, expiration: new Date(Date.now()+3600000).toISOString() },
    ],
  };
}

async function getBillOfLading(shipmentId) {
  return { documentDownloads: [{ downloadURL: `https://example.invalid/mock-bol-${shipmentId}.pdf` }] };
}

module.exports = {
  createInboundPlan, getInboundPlan,
  generatePackingOptions, listPackingOptions, confirmPackingOption,
  generatePlacementOptions, listPlacementOptions, confirmPlacementOption,
  generateTransportationOptions, listTransportationOptions, confirmTransportationOptions,
  generateDeliveryWindowOptions, listDeliveryWindowOptions, confirmDeliveryWindowOption,
  getOperationStatus, getLabels, getBillOfLading,
};
