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
 * 🔎 Helper per firmare e inviare richieste SP-API.
 * Pattern allineato a catalogAmazonService.spGet (testato e funzionante):
 * - x-amz-access-token dentro i canonical headers (aggiunto PRIMA della firma)
 * - content-type solo se c'è un body (mai su GET)
 * - query costruita via URLSearchParams per encoding consistente
 *
 * `query` può essere stringa (già formattata senza "?") o oggetto {k: v}.
 */
async function sendSignedRequest(method, urlPath, query = "", body = null) {
  const { access_token } = await getAccessToken();

  let qs = "";
  if (typeof query === "string") {
    qs = query.replace(/^\?/, "");
  } else if (query && typeof query === "object") {
    qs = new URLSearchParams(query).toString();
  }
  const fullPath = qs ? `${urlPath}?${qs}` : urlPath;

  const opts = {
    host: "sellingpartnerapi-eu.amazon.com",
    path: fullPath,
    service: "execute-api",
    region: AWS_REGION,
    method,
    headers: {
      "x-amz-access-token": access_token,
    },
  };

  if (body) {
    opts.headers["content-type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const signedRequest = sign(opts, {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  });

  const url = `${SP_API_ENDPOINT}${fullPath}`;

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
    }
    console.error(err.message);
    return { error: true, message: err.message };
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
  return await sendSignedRequest("GET", urlPath, {
    marketplaceIds: marketplaceIds.join(","),
  });
}

/**
 * 🔎 Recupera un listing con summaries + attributes (per popolare cache locale)
 */
async function getListingItemFull(sku, marketplaceIds = ["APJ6JRA9NG5V4"]) {
  const encodedSku = encodeURIComponent(sku);
  const urlPath = `/listings/2021-08-01/items/${SELLER_ID}/${encodedSku}`;
  return await sendSignedRequest("GET", urlPath, {
    marketplaceIds: marketplaceIds.join(","),
    includedData: "summaries,attributes",
  });
}

/**
 * 📤 Recupera lo stato di una submission (per verificare approvazione dopo PATCH)
 */
async function getSubmissionStatus(sku, submissionId, marketplaceIds = ["APJ6JRA9NG5V4"]) {
  const encodedSku = encodeURIComponent(sku);
  const urlPath = `/listings/2021-08-01/items/${SELLER_ID}/${encodedSku}`;
  return await sendSignedRequest("GET", urlPath, {
    marketplaceIds: marketplaceIds.join(","),
    includedData: "issues",
  });
}


/**
 * ✏️ Aggiorna un listing Amazon (titoli, bullet, descrizione, ecc.)
 */
async function patchListingItem(sku, payload, marketplaceIds = ["APJ6JRA9NG5V4"]) {
  const encodedSku = encodeURIComponent(sku);
  const urlPath = `/listings/2021-08-01/items/${SELLER_ID}/${encodedSku}`;
  console.log("👉 PATCH Listing:", { sku, marketplaceIds, payload });
  return await sendSignedRequest(
    "PATCH",
    urlPath,
    { marketplaceIds: marketplaceIds.join(",") },
    payload
  );
}

/**
 * ❌ Elimina un listing Amazon
 */
async function deleteListingItem(sku, marketplaceIds = ["APJ6JRA9NG5V4"]) {
  const encodedSku = encodeURIComponent(sku);
  const urlPath = `/listings/2021-08-01/items/${SELLER_ID}/${encodedSku}`;
  console.log("👉 DELETE Listing:", { sku, marketplaceIds });
  return await sendSignedRequest("DELETE", urlPath, {
    marketplaceIds: marketplaceIds.join(","),
  });
}

module.exports = {
  getListingItem,
  getListingItemFull,
  getSubmissionStatus,
  patchListingItem,
  deleteListingItem,
};
