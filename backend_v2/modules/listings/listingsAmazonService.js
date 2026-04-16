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
  // Prova 2021-08-01, se fallisce prova 2020-09-01
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
    includedData: "summaries,issues",
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

// ═══════════════════════════════════════════════════════════
// WORKAROUND: JSON_LISTINGS_FEED via Feeds API
// Usato finché Listings Items API dà 400 (problema lato Amazon)
// ═══════════════════════════════════════════════════════════

const zlib = require("zlib");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Step 1: Crea un feed document e ottieni l'URL di upload
 */
async function createFeedDocument() {
  const result = await sendSignedRequest("POST", "/feeds/2021-06-30/documents", "", {
    contentType: "application/json; charset=utf-8",
  });
  if (result.error) throw new Error(`createFeedDocument failed: ${JSON.stringify(result.data || result.message)}`);
  console.log("[Feed] Document creato:", result.feedDocumentId);
  return result; // { feedDocumentId, url }
}

/**
 * Step 2: Carica il JSON del listing sul presigned S3 URL
 */
async function uploadFeedContent(uploadUrl, jsonContent) {
  const body = JSON.stringify(jsonContent);
  console.log("[Feed] Upload content:", body.substring(0, 200) + "...");
  await axios.put(uploadUrl, body, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  console.log("[Feed] Upload completato");
}

/**
 * Step 3: Avvia il feed
 */
async function createFeed(feedDocumentId, marketplaceIds = ["APJ6JRA9NG5V4"]) {
  const result = await sendSignedRequest("POST", "/feeds/2021-06-30/feeds", "", {
    feedType: "JSON_LISTINGS_FEED",
    marketplaceIds,
    inputFeedDocumentId: feedDocumentId,
  });
  if (result.error) throw new Error(`createFeed failed: ${JSON.stringify(result.data || result.message)}`);
  console.log("[Feed] Feed avviato:", result.feedId);
  return result; // { feedId }
}

/**
 * Step 4: Polling fino a DONE/CANCELLED/FATAL
 */
async function waitForFeed(feedId, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(10000);
    const result = await sendSignedRequest("GET", `/feeds/2021-06-30/feeds/${feedId}`);
    if (result.error) {
      console.warn("[Feed] Errore polling:", result.data || result.message);
      continue;
    }
    const status = result.processingStatus;
    console.log(`[Feed] Polling ${i + 1}/${maxAttempts}: ${status}`);
    if (status === "DONE" || status === "CANCELLED" || status === "FATAL") {
      return result;
    }
  }
  throw new Error("Feed timeout dopo " + maxAttempts + " tentativi");
}

/**
 * Step 5: Scarica il risultato del feed
 */
async function getFeedResult(resultFeedDocumentId) {
  const docResult = await sendSignedRequest("GET", `/feeds/2021-06-30/documents/${resultFeedDocumentId}`);
  if (docResult.error) throw new Error(`getFeedResult doc failed: ${JSON.stringify(docResult.data)}`);

  const { url, compressionAlgorithm } = docResult;
  const fileRes = await axios.get(url, { responseType: "arraybuffer" });
  let buffer = Buffer.from(fileRes.data);
  if (compressionAlgorithm === "GZIP") buffer = zlib.gunzipSync(buffer);
  const text = buffer.toString("utf-8");

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Flusso completo: modifica un listing via JSON_LISTINGS_FEED
 *
 * @param {string} sku - SKU del prodotto
 * @param {string} productType - es. "PRODUCT", "BEAUTY"
 * @param {object} patches - array di patch operations [{op, path, value}]
 * @param {string[]} marketplaceIds
 * @returns {{ feedId, status, result }}
 */
/**
 * @param {string} sku
 * @param {string} productType - es. "PRODUCT", "BEAUTY"
 * @param {object} attributes - formato { item_name: [{value, language_tag, marketplace_id}], ... }
 *                              Verrà convertito in patches JSON Patch per PARTIAL_UPDATE
 * @param {string[]} marketplaceIds
 */
async function updateListingViaFeed(sku, productType, attributes, marketplaceIds = ["APJ6JRA9NG5V4"]) {
  console.log(`[Feed] Avvio update listing: SKU=${sku}, productType=${productType}`);

  const feedContent = {
    header: {
      sellerId: SELLER_ID,
      version: "2.0",
      issueLocale: "it_IT",
    },
    messages: [
      {
        messageId: 1,
        sku,
        operationType: "PARTIAL_UPDATE",
        productType,
        attributes,
      },
    ],
  };

  // Step 1: Crea feed document
  const doc = await createFeedDocument();

  // Step 2: Upload JSON
  await uploadFeedContent(doc.url, feedContent);

  // Step 3: Avvia feed
  const feed = await createFeed(doc.feedDocumentId, marketplaceIds);

  // Step 4: Attendi completamento
  const feedResult = await waitForFeed(feed.feedId);

  // Step 5: Scarica risultato
  let result = null;
  if (feedResult.resultFeedDocumentId) {
    result = await getFeedResult(feedResult.resultFeedDocumentId);
  }

  return {
    feedId: feed.feedId,
    status: feedResult.processingStatus,
    result,
  };
}

module.exports = {
  getListingItem,
  getListingItemFull,
  getSubmissionStatus,
  patchListingItem,
  deleteListingItem,
  updateListingViaFeed,
  sendSignedRequest,
};
