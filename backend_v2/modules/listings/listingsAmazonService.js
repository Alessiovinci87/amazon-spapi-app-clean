// backend_v2/modules/listings/listingsAmazonService.js
const axios = require("axios");
const { sign } = require("aws4");
const { getAccessToken } = require("../auth/authService");

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  SELLER_ID,
} = process.env;

const SP_API_ENDPOINT = "https://sellingpartnerapi-eu.amazon.com";

/**
 * 🔎 Helper per firmare e inviare richieste SP-API
 */
async function sendSignedRequest(method, urlPath, query = "", body = null) {
  const { access_token } = await getAccessToken();
  const url = `${SP_API_ENDPOINT}${urlPath}${query}`;

  // Opzioni da firmare
  const opts = {
    host: "sellingpartnerapi-eu.amazon.com",
    path: `${urlPath}${query}`,
    service: "execute-api",
    region: AWS_REGION,
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  // Firma con AWS keys
  const signedRequest = sign(opts, {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  });

  // Aggiungiamo l’LWA token
  signedRequest.headers["x-amz-access-token"] = access_token;

  try {
    const response = await axios({
      method,
      url,
      headers: signedRequest.headers,
      data: body ? JSON.stringify(body) : undefined,
    });
    return response.data;
  } catch (err) {
    console.error(`❌ Errore SP-API [${method} ${urlPath}]`);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
      return {
        error: true,
        status: err.response.status,
        data: err.response.data,
      };
    } else {
      console.error(err.message);
      return { error: true, message: err.message };
    }
  }
}

/**
 * 🔎 Recupera un listing Amazon per SKU
 */
/**
 * 🔎 Recupera un listing Amazon per SKU
 */
async function getListingItem(sku, marketplaceIds = ["APJ6JRA9NG5V4"]) {
  const encodedSku = encodeURIComponent(sku);
  const urlPath = `/listings/2021-08-01/items/${SELLER_ID}/${encodedSku}`;
  const query = `?marketplaceIds=${marketplaceIds.join(",")}`;

  // 🟢 DEBUG LOG COMPLETO
  console.log("👉 GET Listing DEBUG");
  console.log("   SELLER_ID:", SELLER_ID);
  console.log("   SKU originale:", sku);
  console.log("   SKU encoded:", encodedSku);
  console.log("   marketplaceIds:", marketplaceIds);
  console.log("   URL finale:", `${SP_API_ENDPOINT}${urlPath}${query}`);

  return await sendSignedRequest("GET", urlPath, query);
}


/**
 * ✏️ Aggiorna un listing Amazon (titoli, bullet, descrizione, ecc.)
 */
async function patchListingItem(sku, payload, marketplaceIds = ["APJ6JRA9NG5V4"]) {
  const encodedSku = encodeURIComponent(sku);
  const urlPath = `/listings/2021-08-01/items/${SELLER_ID}/${encodedSku}`;
  const query = `?marketplaceIds=${marketplaceIds.join(",")}`;

  console.log("👉 PATCH Listing:", { sku, marketplaceIds, payload });
  return await sendSignedRequest("PATCH", urlPath, query, payload);
}

/**
 * ❌ Elimina un listing Amazon
 */
async function deleteListingItem(sku, marketplaceIds = ["APJ6JRA9NG5V4"]) {
  const encodedSku = encodeURIComponent(sku);
  const urlPath = `/listings/2021-08-01/items/${SELLER_ID}/${encodedSku}`;
  const query = `?marketplaceIds=${marketplaceIds.join(",")}`;

  console.log("👉 DELETE Listing:", { sku, marketplaceIds });
  return await sendSignedRequest("DELETE", urlPath, query);
}

module.exports = {
  getListingItem,
  patchListingItem,
  deleteListingItem,
};
