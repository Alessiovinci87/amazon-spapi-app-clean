// Client SP-API Fulfillment Inbound v2024-03-20
// Documentazione: https://developer-docs.amazon.com/sp-api/reference/fulfillment-inbound-v2024-03-20
const axios = require("axios");
const { sign } = require("aws4");
const logger = require("../../utils/logger");
const { getAccessToken } = require("../auth/authService");

const SP_API_HOST = "sellingpartnerapi-eu.amazon.com";
const SP_API_ENDPOINT = `https://${SP_API_HOST}`;
const API_BASE = "/inbound/fba/2024-03-20";

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = process.env;

async function callInboundApi(method, pathSuffix, { query = {}, body = null } = {}) {
  const tokenData = await getAccessToken();
  const accessToken = tokenData.access_token;

  const queryStr = Object.keys(query).length
    ? "?" + new URLSearchParams(query).toString()
    : "";
  const fullPath = `${API_BASE}${pathSuffix}${queryStr}`;
  const url = `${SP_API_ENDPOINT}${fullPath}`;

  const opts = {
    host: SP_API_HOST,
    path: fullPath,
    service: "execute-api",
    region: AWS_REGION || "eu-west-1",
    method,
    headers: {
      "x-amz-access-token": accessToken,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  const signed = sign(opts, {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  });

  try {
    const res = await axios({
      method,
      url,
      headers: signed.headers,
      data: body || undefined,
      timeout: 30000,
    });
    return res.data;
  } catch (err) {
    logger.error(
      { err: err.message, status: err.response?.status, data: err.response?.data, path: fullPath },
      "Errore Fulfillment Inbound API"
    );
    const apiErr = new Error(
      err.response?.data?.errors?.[0]?.message || err.message || "Inbound API error"
    );
    apiErr.status = err.response?.status;
    apiErr.details = err.response?.data;
    throw apiErr;
  }
}

// ─── Endpoint del flusso ─────────────────────────────────────

function createInboundPlan(body) {
  return callInboundApi("POST", "/inboundPlans", { body });
}

function getInboundPlan(planId) {
  return callInboundApi("GET", `/inboundPlans/${planId}`);
}

function generatePackingOptions(planId) {
  return callInboundApi("POST", `/inboundPlans/${planId}/packingOptions`);
}

function listPackingOptions(planId) {
  return callInboundApi("GET", `/inboundPlans/${planId}/packingOptions`);
}

function confirmPackingOption(planId, packingOptionId) {
  return callInboundApi("POST", `/inboundPlans/${planId}/packingOptions/${packingOptionId}/confirmation`);
}

function generatePlacementOptions(planId) {
  return callInboundApi("POST", `/inboundPlans/${planId}/placementOptions`);
}

function listPlacementOptions(planId) {
  return callInboundApi("GET", `/inboundPlans/${planId}/placementOptions`);
}

function confirmPlacementOption(planId, placementOptionId) {
  return callInboundApi("POST", `/inboundPlans/${planId}/placementOptions/${placementOptionId}/confirmation`);
}

function setPackingInformation(planId, body) {
  return callInboundApi("POST", `/inboundPlans/${planId}/packingInformation`, { body });
}

function generateTransportationOptions(planId, body) {
  return callInboundApi("POST", `/inboundPlans/${planId}/transportationOptions`, { body });
}

function listTransportationOptions(planId, query) {
  return callInboundApi("GET", `/inboundPlans/${planId}/transportationOptions`, { query });
}

function confirmTransportationOptions(planId, body) {
  return callInboundApi("POST", `/inboundPlans/${planId}/transportationOptions/confirmation`, { body });
}

function generateDeliveryWindowOptions(planId, shipmentId) {
  return callInboundApi("POST", `/inboundPlans/${planId}/shipments/${shipmentId}/deliveryWindowOptions`);
}

function listDeliveryWindowOptions(planId, shipmentId) {
  return callInboundApi("GET", `/inboundPlans/${planId}/shipments/${shipmentId}/deliveryWindowOptions`);
}

function confirmDeliveryWindowOption(planId, shipmentId, deliveryWindowOptionId) {
  return callInboundApi(
    "POST",
    `/inboundPlans/${planId}/shipments/${shipmentId}/deliveryWindowOptions/${deliveryWindowOptionId}/confirmation`
  );
}

function getOperationStatus(operationId) {
  return callInboundApi("GET", `/operations/${operationId}`);
}

function getLabels(shipmentId, query) {
  return callInboundApi("GET", `/shipments/${shipmentId}/labels`, { query });
}

function getBillOfLading(shipmentId) {
  return callInboundApi("GET", `/shipments/${shipmentId}/billOfLading`);
}

module.exports = {
  createInboundPlan,
  getInboundPlan,
  generatePackingOptions,
  listPackingOptions,
  confirmPackingOption,
  generatePlacementOptions,
  listPlacementOptions,
  confirmPlacementOption,
  setPackingInformation,
  generateTransportationOptions,
  listTransportationOptions,
  confirmTransportationOptions,
  generateDeliveryWindowOptions,
  listDeliveryWindowOptions,
  confirmDeliveryWindowOption,
  getOperationStatus,
  getLabels,
  getBillOfLading,
};
