const axios = require("axios");
const { sign } = require("aws4");

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
} = process.env;

const SP_API_ENDPOINT = "https://sellingpartnerapi-eu.amazon.com";

/**
 * 🔎 Ottiene inventario da Amazon SP-API per SKU
 */
async function getAmazonInventory(sku, accessToken, marketplaceId = "APJ6JRA9NG5V4") {
  try {
    const urlPath = `/fba/inventory/v1/summaries`;
    const query = `?marketplaceIds=${marketplaceId}&sellerSkus=${encodeURIComponent(sku)}`;
    const url = `${SP_API_ENDPOINT}${urlPath}${query}`;

    const opts = {
      host: "sellingpartnerapi-eu.amazon.com",
      path: `${urlPath}${query}`,
      service: "execute-api",
      region: AWS_REGION,
      method: "GET",
      headers: {
        "x-amz-access-token": accessToken,
      },
    };

    const signedRequest = sign(opts, {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    });

    const response = await axios({
      method: "GET",
      url,
      headers: signedRequest.headers,
    });

    return response.data;
    } catch (err) {
    console.error("❌ Errore Inventory API Amazon:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Headers:", err.response.headers);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
    throw new Error("Impossibile recuperare inventario Amazon");
  }

}

module.exports = { getAmazonInventory };
