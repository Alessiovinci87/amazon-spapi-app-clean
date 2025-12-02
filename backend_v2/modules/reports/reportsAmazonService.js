// backend_v2/modules/reports/reportsAmazonService.js
const axios = require("axios");
const zlib = require("zlib");
const { getAccessToken } = require("../auth/authService");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";

/**
 * 📑 1. Crea un report
 */
async function createReport(marketplaceIds) {
  try {
    const { access_token } = await getAccessToken();

    const res = await axios.post(
      `${BASE_URL}/reports/2021-06-30/reports`,
      {
        reportType: "GET_MERCHANT_LISTINGS_ALL_DATA",
        marketplaceIds,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-amz-access-token": access_token,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data; // 👈 QUI tornerà { reportId, ... }
  } catch (err) {
    console.error("❌ Errore createReport:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * 📊 2. Stato report
 */
async function getReportStatus(reportId) {
  try {
    const { access_token } = await getAccessToken();

    const res = await axios.get(`${BASE_URL}/reports/2021-06-30/reports/${reportId}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
      },
    });

    return res.data;
  } catch (err) {
    console.error("❌ Errore getReportStatus:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * 📥 3. Documento report
 */
async function getReportDocument(reportDocumentId) {
  try {
    const { access_token } = await getAccessToken();

    const res = await axios.get(`${BASE_URL}/reports/2021-06-30/documents/${reportDocumentId}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
      },
    });

    return res.data;
  } catch (err) {
    console.error("❌ Errore getReportDocument:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * 📂 4. Scarica e decomprimi documento report
 */
async function downloadReportDocument(reportDocumentId) {
  try {
    const meta = await getReportDocument(reportDocumentId);
    const res = await axios.get(meta.url, { responseType: "arraybuffer" });

    let buffer = Buffer.from(res.data);
    if (meta.compressionAlgorithm === "GZIP") {
      buffer = zlib.gunzipSync(buffer);
    }

    const text = buffer.toString("utf-8");
    const rows = text.split("\n").filter((line) => line.trim() !== "");
    const headers = rows.shift().split("\t");

    return rows.map((line) => {
      const values = line.split("\t");
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = values[i];
      });
      return obj;
    });
  } catch (err) {
    console.error("❌ Errore downloadReportDocument:", err.message);
    throw err;
  }
}

/**
 * 🌍 5. Catalog Item API
 */
async function getCatalogItem(asin, marketplaceIds) {
  try {
    const { access_token } = await getAccessToken();

    const res = await axios.get(`${BASE_URL}/catalog/2022-04-01/items/${asin}`, {
      params: { marketplaceIds: marketplaceIds.join(",") },
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
      },
    });

    return res.data;
  } catch (err) {
    console.error("❌ Errore getCatalogItem:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * 📋 6. Listings API
 */
async function getListingItem(sku, token, marketplaceIds) {
  try {
    const res = await axios.get(
      `${BASE_URL}/listings/2021-08-01/items/${process.env.SELLER_ID}/${sku}`,
      {
        params: { marketplaceIds: marketplaceIds.join(",") },
        headers: {
          Authorization: `Bearer ${token}`,
          "x-amz-access-token": token,
        },
      }
    );

    return res.data;
  } catch (err) {
    console.error("❌ Errore getListingItem:", err.response?.data || err.message);
    throw err;
  }
}

async function getMainImage(asin, marketplaceId = "APJ6JRA9NG5V4") {
  try {
    const { access_token } = await getAccessToken();

    const url = `${BASE_URL}/catalog/2022-04-01/items/${asin}?marketplaceIds=${marketplaceId}&includedData=images`;
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
      },
    });

    // 🔎 estraggo la prima immagine di tipo MAIN
    const imagesGroup = res.data.images?.[0]?.images || [];
    const mainImage = imagesGroup.find(img => img.variant === "MAIN");

    return mainImage ? mainImage.link : null;
  } catch (err) {
    console.error("❌ Errore getMainImage:", err.response?.data || err.message);
    return null;
  }
}



module.exports = {
  createReport,
  getReportStatus,
  getReportDocument,
  downloadReportDocument,
  getCatalogItem,
  getListingItem,
  getMainImage,
};
