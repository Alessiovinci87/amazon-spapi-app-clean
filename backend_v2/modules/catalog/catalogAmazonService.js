// backend_v2/modules/catalog/catalogAmazonService.js
const axios = require("axios");
const { sign } = require("aws4");
const { getAccessToken } = require("../auth/authService");
const { getDb } = require("../../db/database");

const HOST = "sellingpartnerapi-eu.amazon.com";
const BASE_URL = `https://${HOST}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  // Sweden (A2NODRKZP88ZB9) esclusa: account non abilitato → 403 su ogni chiamata
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
      if (err.response?.status !== 404) {
        console.warn(`⚠️ ${mp.paese} – errore API: ${err.response?.status || err.code || err.message}`);
      }
      if (err.response?.status === 429) await sleep(5000); // back-off su rate limit
    }
    await sleep(2000); // Pricing API: max 0.5 req/s → 2s tra marketplace
  }

  return { marketplaces: marketplacesData };
}

/**
 * Recupera titolo + immagini per un ASIN su tutti i marketplace specificati.
 * 1 chiamata per marketplace (immagini e titolo possono differire per lingua/paese).
 * Ritorna array di { asin, marketplaceId, country, titolo, image_url }
 */
async function getCatalogInfoPerMarketplace(asin, accessToken, marketplaces) {
  const results = [];
  for (const mp of marketplaces) {
    try {
      const data = await spGet(
        `/catalog/2022-04-01/items/${asin}`,
        { marketplaceIds: mp.marketplaceId, includedData: "images,summaries" },
        accessToken
      );
      const titolo    = data?.summaries?.[0]?.itemName ?? null;
      const allImgs   = data?.images?.find(i => i.marketplaceId === mp.marketplaceId)?.images
                        ?? data?.images?.[0]?.images ?? [];
      const image_url = allImgs.find(i => i.variant === "MAIN")?.link ?? allImgs[0]?.link ?? null;
      const variants  = new Set(allImgs.map(i => i.variant).filter(Boolean));
      const image_count = variants.size;
      results.push({ asin, marketplaceId: mp.marketplaceId, country: mp.country, titolo, image_url, image_count });
    } catch {
      // 404 = prodotto non listato in quel marketplace, skip
    }
    await new Promise(r => setTimeout(r, 250));
  }
  return results;
}

/**
 * Restituisce tutte le immagini listing per un ASIN in un marketplace.
 * Colonne: [{ variant, link, height, width }]
 * Varianti tipiche: MAIN, PT01, PT02 … PT08
 */
async function getListingImages(asin, marketplaceId) {
  const { access_token } = await getAccessToken();
  const data = await spGet(
    `/catalog/2022-04-01/items/${asin}`,
    { marketplaceIds: marketplaceId, includedData: "images" },
    access_token
  );
  const all =
    data?.images?.find(i => i.marketplaceId === marketplaceId)?.images ??
    data?.images?.[0]?.images ?? [];

  // La Catalog API restituisce più risoluzioni per ogni variante (75, 500, 2000 px).
  // Teniamo solo la risoluzione più alta per variante.
  const byVariant = {};
  for (const img of all) {
    const key = img.variant;
    if (!byVariant[key] || img.width > byVariant[key].width) {
      byVariant[key] = img;
    }
  }
  return Object.values(byVariant);
}

/**
 * Recupera le immagini A+ per un ASIN e marketplace.
 * Usa A+ Content Management API.
 * Ritorna: { images: [{ url, altText }], contentReferenceKey }
 */
async function getAplusContent(asin, marketplaceId) {
  const { access_token } = await getAccessToken();

  // 1. Cerca i documenti A+ pubblicati per questo ASIN
  let publishData;
  try {
    publishData = await spGet(
      `/aplus/2020-11-01/contentPublishRecords`,
      { marketplaceId, asin },
      access_token
    );
  } catch {
    return { images: [], error: "Nessun contenuto A+" };
  }

  const records = publishData?.publishRecordList ?? [];
  if (!records.length) return { images: [] };

  // 2. Scarica il documento A+
  const key = records[0].contentReferenceKey;
  let doc;
  try {
    doc = await spGet(
      `/aplus/2020-11-01/contentDocuments/${key}`,
      { marketplaceId, includedDataSet: "CONTENTS" },
      access_token
    );
  } catch (err) {
    const details = err.response?.data?.errors?.[0]?.details ?? err.message;
    const isPremiumAplus = details.includes("premium-module");
    console.warn(`[A+] Documento non leggibile: ${details}`);
    return {
      images: [],
      contentReferenceKey: key,
      premiumAplus: isPremiumAplus,
      error: isPremiumAplus
        ? "Premium A+ non accessibile via SP-API (limitazione Amazon)"
        : details,
    };
  }

  // La risposta wrappa il documento in contentRecord.contentDocument
  const contentDoc = doc?.contentRecord?.contentDocument ?? doc?.contentDocument;
  console.log(`[A+] contentReferenceKey=${key}, moduli=${contentDoc?.contentModuleList?.length ?? 0}`);

  // 3. Estrai tutti gli uploadDestinationId ricorsivamente → URL CDN Amazon
  const seen = new Set();
  const images = [];
  function extract(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) { obj.forEach(extract); return; }
    if (obj.uploadDestinationId && !seen.has(obj.uploadDestinationId)) {
      seen.add(obj.uploadDestinationId);
      images.push({
        url: `https://m.media-amazon.com/images/S/${obj.uploadDestinationId}`,
        altText: obj.altText ?? "",
      });
    }
    for (const v of Object.values(obj)) extract(v);
  }
  extract(contentDoc);

  return { images, contentReferenceKey: key };
}

/**
 * Sincronizza SOLO prezzi e buybox per un ASIN (senza catalog/immagini).
 * Più veloce di checkAndFireAlerts: 1 chiamata per marketplace invece di 2.
 * Salva in listings_snapshot. Usato dal job sync-prezzi.
 */
async function sincronizzaPrezziAsin(asin) {
  const { access_token } = await getAccessToken();
  const db = getDb();
  const now = new Date().toISOString();
  let marketplacesChecked = 0;

  for (const mp of MARKETPLACES) {
    try {
      const pricing = await spGet(
        `/products/pricing/v0/items/${asin}/offers`,
        { MarketplaceId: mp.marketplaceId, ItemCondition: "New" },
        access_token
      );

      const offers  = pricing?.Offers  ?? [];
      const summary = pricing?.Summary ?? {};
      const buyboxWon = ((summary?.BuyBoxPrices?.length ?? 0) > 0 || offers.some(o => o?.BuyBoxWinner === true)) ? 1 : 0;

      let prezzo   = null;
      let currency = mp.country === 'GB' ? 'GBP' : mp.country === 'PL' ? 'PLN' : 'EUR';

      if ((summary?.BuyBoxPrices?.length ?? 0) > 0) {
        prezzo   = summary.BuyBoxPrices[0].LandedPrice?.Amount      ?? null;
        currency = summary.BuyBoxPrices[0].LandedPrice?.CurrencyCode ?? currency;
      } else if (offers.length > 0) {
        prezzo   = offers[0].ListingPrice?.Amount       ?? null;
        currency = offers[0].ListingPrice?.CurrencyCode ?? currency;
      }

      db.prepare(`
        INSERT INTO listings_snapshot (asin, marketplace_id, prezzo, currency, buybox_won, snapshot_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(asin, marketplace_id) DO UPDATE SET
          prezzo      = excluded.prezzo,
          currency    = excluded.currency,
          buybox_won  = excluded.buybox_won,
          snapshot_at = excluded.snapshot_at
      `).run(asin, mp.marketplaceId, prezzo, currency, buyboxWon, now);

      marketplacesChecked++;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        console.warn(`⏳ [SyncPrezzi] 429 su ${mp.paese} per ${asin} — attendo 65s`);
        await sleep(65000);
      } else if (err.code === 'ECONNRESET') {
        console.warn(`⏳ [SyncPrezzi] ECONNRESET su ${mp.paese} per ${asin} — attendo 5s`);
        await sleep(5000);
      } else if (status !== 400 && status !== 403 && status !== 404) {
        console.warn(`⚠️ [SyncPrezzi] ${mp.paese}/${asin}: ${status ?? err.message}`);
      }
    }
    await sleep(2100); // Pricing API: max 0.5 req/s
  }

  return { asin, marketplacesChecked };
}

/**
 * Recupera titolo, bullet points e descrizione di un ASIN per un marketplace.
 * Usa Catalog Items API 2022-04-01 con includedData=summaries,attributes.
 */
async function getListingText(asin, marketplaceId) {
  const { access_token } = await getAccessToken();
  const data = await spGet(
    `/catalog/2022-04-01/items/${asin}`,
    { marketplaceIds: marketplaceId, includedData: "summaries,attributes" },
    access_token
  );

  // Titolo da summaries (preferito) o da attributes.item_name
  const summary = data?.summaries?.find(s => s.marketplaceId === marketplaceId)
                ?? data?.summaries?.[0]
                ?? {};
  const attrs = data?.attributes ?? {};

  const titolo =
    summary.itemName
    ?? attrs.item_name?.find(v => !v.marketplace_id || v.marketplace_id === marketplaceId)?.value
    ?? attrs.item_name?.[0]?.value
    ?? null;

  // Bullet points — array di {value, marketplace_id?}
  const bullets = (attrs.bullet_point ?? [])
    .filter(b => !b.marketplace_id || b.marketplace_id === marketplaceId)
    .map(b => b.value)
    .filter(Boolean);

  // Descrizione
  const descrizione =
    attrs.product_description
      ?.find(d => !d.marketplace_id || d.marketplace_id === marketplaceId)?.value
    ?? null;

  return { asin, marketplaceId, titolo, bullets, descrizione };
}

module.exports = { getCatalogDetails, getCatalogInfoPerMarketplace, getListingImages, getAplusContent, sincronizzaPrezziAsin, getListingText };
