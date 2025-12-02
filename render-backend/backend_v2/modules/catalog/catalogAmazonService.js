// backend_v2/modules/catalog/catalogAmazonService.js
const axios = require("axios");
const { sign } = require("aws4");
const { getAccessToken } = require("../auth/authService");

const HOST = "sellingpartnerapi-eu.amazon.com";
const BASE_URL = `https://${HOST}`;

// Marketplace EU
const MARKETPLACES = [
  { paese: "Italy", marketplaceId: "APJ6JRA9NG5V4" },
  { paese: "France", marketplaceId: "A13V1IB3VIYZZH" },
  { paese: "Spain", marketplaceId: "A1RKKUPIHCS9HS" },
  { paese: "Germany", marketplaceId: "A1PA6795UKMFR9" },
  { paese: "UK", marketplaceId: "A1F83G8C2ARO7P" },
  { paese: "Netherlands", marketplaceId: "A1805IZSGTT6HS" },
  { paese: "Belgium", marketplaceId: "AMEN7PMS3EDWL" },
  { paese: "Poland", marketplaceId: "A1C3SOZRARQ6R3" },
  { paese: "Sweden", marketplaceId: "A2NODRKZP88ZB9" },
];

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION = "eu-west-1",
} = process.env;

/**
 * Firma e invia una GET alla SP-API
 */
async function spGet(path, query, accessToken) {
  const qs = new URLSearchParams(query || {}).toString();
  const fullPath = qs ? `${path}?${qs}` : path;

  const opts = {
    host: HOST,
    path: fullPath,
    service: "execute-api",
    region: AWS_REGION,
    method: "GET",
    headers: {
      // Header indispensabile oltre alla firma
      "x-amz-access-token": accessToken,
    },
  };

  const signed = sign(opts, {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  });

  const url = `${BASE_URL}${fullPath}`;
  const res = await axios.get(url, { headers: signed.headers });
  // v0 spesso risponde con { payload: {...} }
  return res.data?.payload ?? res.data;
}

/**
 * Recupera per TUTTI i marketplace EU:
 * - titolo/immagine/stato (Catalog)
 * - prezzo + buybox (Pricing)
 * NB: lo "Stock (Amazon)" MFN non è affidabile per FBA → lo popoleremo
 *     a parte con il report GET_LEDGER_SUMMARY_VIEW_DATA.
 */
async function getCatalogDetails(asin) {
  const { access_token } = await getAccessToken();
  const marketplacesData = [];

  for (const mp of MARKETPLACES) {
    try {
      // 1) Catalog (titolo, immagini, stato)
      const catalog = await spGet(
        `/catalog/2022-04-01/items/${asin}`,
        {
          marketplaceIds: mp.marketplaceId,
          includedData: "images,summaries",
        },
        access_token
      );

      const titolo = catalog?.summaries?.[0]?.itemName || "Titolo non disponibile";
      const immagine =
        catalog?.images?.[0]?.images?.[0]?.link || "/images/no_image.jpg";
      const stato = catalog?.summaries?.[0]?.status || "UNKNOWN";

      // 2) Pricing (prezzo + buy box)
      const pricing = await spGet(
        `/products/pricing/v0/items/${asin}/offers`,
        { MarketplaceId: mp.marketplaceId, ItemCondition: "New" },
        access_token
      );

      const offers = pricing?.Offers || [];
      const summary = pricing?.Summary || {};
      const buyBoxBySummary = (summary?.BuyBoxPrices?.length || 0) > 0;
      // Alcuni payload non espongono BuyBoxPrices: fallback sugli Offers
      const buyBoxByOffers = offers.some((o) => o?.BuyBoxWinner === true);
      const buyBoxWon = buyBoxBySummary || buyBoxByOffers || false;

      // Estrazione prezzo:
      // 1) Summary.BuyBoxPrices[0].LandedPrice
      // 2) Offers[0].ListingPrice
      let priceObj = null;
      if (summary?.BuyBoxPrices?.[0]?.LandedPrice) {
        priceObj = {
          amount: Number(summary.BuyBoxPrices[0].LandedPrice.Amount),
          currencyCode: summary.BuyBoxPrices[0].LandedPrice.CurrencyCode,
        };
      } else if (offers?.[0]?.ListingPrice) {
        priceObj = {
          amount: Number(offers[0].ListingPrice.Amount),
          currencyCode: offers[0].ListingPrice.CurrencyCode,
        };
      }

      // Struttura compatibile col frontend (listing.summaries[0]…)
      marketplacesData.push({
        paese: mp.paese,
        marketplaceId: mp.marketplaceId,
        titolo,
        immagine,
        stato,
        listing: {
          summaries: [
            {
              price: priceObj,
              // Stock (Amazon) lo lasciamo "-" per ora; il dato FBA reale lo
              // inseriremo con il report e la tabella fba_stock
              quantity: null,
              buyBoxWon,
              status: stato,
            },
          ],
        },
      });
    } catch (err) {
      // Non bloccare l'intero ciclo: logga e continua
      console.warn(`⚠️ ${mp.paese} – errore API: ${err.response?.status || err.code || err.message}`);
    }
  }

  return { marketplaces: marketplacesData };
}

module.exports = { getCatalogDetails };
