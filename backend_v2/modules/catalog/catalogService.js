const axios = require("axios");
const { sign } = require("aws4");

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
} = process.env;

// Marketplace EU più usato → Italia
const SP_API_ENDPOINT = "https://sellingpartnerapi-eu.amazon.com";

async function getCatalogItem(asin, accessToken, marketplaceId = "APJ6JRA9NG5V4") {
  try {
    const urlPath = `/catalog/2022-04-01/items/${asin}`;
    const url = `${SP_API_ENDPOINT}${urlPath}?marketplaceIds=${marketplaceId}`;

    // Firma AWS SigV4
    const opts = {
      host: "sellingpartnerapi-eu.amazon.com",
      path: `${urlPath}?marketplaceIds=${marketplaceId}`,
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
    console.error("❌ Errore Catalog API:", err.response?.data || err.message);
    throw new Error("Impossibile recuperare dati catalogo");
  }
}

module.exports = { getCatalogItem };
