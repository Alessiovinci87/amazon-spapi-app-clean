// backend_v2/modules/reports/ordersLiveService.js
//
// Vendite "near real-time" via SP-API Orders API (GET /orders/v0/orders).
// Necessario per coprire i giorni che il report Sales & Traffic non ha ancora
// (oggi/ieri/altroieri spesso). Stesso meccanismo che usa Shopkeeper.
//
// API doc: https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference
//
// Comportamento:
//   - Per ogni marketplace EU, fa GET /orders/v0/orders con CreatedAfter/Before
//   - Pagina con NextToken
//   - Esclude OrderStatus = "Canceled"
//   - Aggrega per country: { revenue, units, orders }
//   - Cache in-memory per (date, marketplace) — TTL 3 min
//
// Note importanti:
//   - OrderTotal.Amount è già nella valuta del marketplace (EUR per IT/FR/DE/ES/NL/BE,
//     GBP per UK, PLN per PL, SEK per SE). NON convertiamo: per "totale" sommiamo
//     solo i marketplace EUR (quelli non-EUR vanno in own row).
//   - units = NumberOfItemsShipped + NumberOfItemsUnshipped per ogni ordine.
//   - Rate limit Orders API: burst 30/s, sustained 0.0167/s. Inserisco sleep
//     tra le chiamate.

const axios = require("axios");
const { getAccessToken } = require("../auth/authService");
const logger = require("../../utils/logger");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";

const MARKETPLACES = [
  { code: "IT", id: "APJ6JRA9NG5V4", currency: "EUR" },
  { code: "FR", id: "A13V1IB3VIYZZH", currency: "EUR" },
  { code: "ES", id: "A1RKKUPIHCS9HS", currency: "EUR" },
  { code: "DE", id: "A1PA6795UKMFR9", currency: "EUR" },
  { code: "UK", id: "A1F83G8C2ARO7P", currency: "GBP" },
  { code: "NL", id: "A1805IZSGTT6HS", currency: "EUR" },
  { code: "BE", id: "AMEN7PMS3EDWL",  currency: "EUR" },
  { code: "PL", id: "A1C3SOZRARQ6R3", currency: "PLN" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CACHE_TTL_MS = 3 * 60 * 1000;
// Cache key: `${marketplaceId}|${createdAfter}|${createdBefore}`
const _cache = new Map();

/**
 * Costruisce il timestamp ISO per una YYYY-MM-DD locale (Europa/Rome).
 * Per "oggi": dalle 00:00 italiane → ISO UTC. Più semplice: usa direttamente Z.
 * In pratica per CreatedAfter/Before usiamo le date in UTC, accettando che
 * un ordine fatto a 23:30 italiane il giorno X possa cadere il giorno X+1 UTC.
 */
function ymdToIsoStart(ymd) {
  return `${ymd}T00:00:00Z`;
}
function ymdToIsoEnd(ymd) {
  return `${ymd}T23:59:59Z`;
}

/**
 * Recupera ordini di un marketplace per il range YYYY-MM-DD .. YYYY-MM-DD.
 * Filtra OrderStatus.
 *
 * @param {string} marketplaceId
 * @param {string} fromYmd inclusivo
 * @param {string} toYmd inclusivo
 * @returns {Promise<{ orders: Array, partial: boolean }>}
 */
async function fetchOrdersForMarketplace(marketplaceId, fromYmd, toYmd) {
  const cacheKey = `${marketplaceId}|${fromYmd}|${toYmd}`;
  const hit = _cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return { orders: hit.orders, fromCache: true };
  }

  const { access_token } = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${access_token}`,
    "x-amz-access-token": access_token,
  };

  // Amazon richiede CreatedAfter strettamente nel passato (non oggi/futuro lato millisecondi).
  // Per "oggi" usiamo CreatedAfter = inizio giornata, CreatedBefore = ora corrente.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const isToday = toYmd === todayUtc;
  const createdAfter = ymdToIsoStart(fromYmd);
  const createdBefore = isToday ? new Date(Date.now() - 60_000).toISOString() : ymdToIsoEnd(toYmd);

  const orders = [];
  let nextToken = null;
  let pages = 0;
  let partial = false;

  do {
    let url = `${BASE_URL}/orders/v0/orders`;
    let params;
    if (nextToken) {
      // Le pagine successive vogliono SOLO MarketplaceIds + NextToken
      params = { MarketplaceIds: marketplaceId, NextToken: nextToken };
    } else {
      params = {
        MarketplaceIds: marketplaceId,
        CreatedAfter: createdAfter,
        CreatedBefore: createdBefore,
        MaxResultsPerPage: 100,
      };
    }

    try {
      const res = await axios.get(url, { params, headers, timeout: 30_000 });
      const payload = res.data?.payload || {};
      const list = Array.isArray(payload.Orders) ? payload.Orders : [];
      orders.push(...list);
      nextToken = payload.NextToken || null;
      pages++;
      if (pages > 50) { partial = true; break; }
      if (nextToken) await sleep(700); // throttle
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        logger.warn(`[OrdersLive] 429 su ${marketplaceId}, attendo 60s e riprovo…`);
        await sleep(60_000);
        continue;
      }
      const data = err.response?.data;
      logger.error(
        { err: data || err.message, marketplaceId, params },
        "[OrdersLive] errore lista ordini"
      );
      throw err;
    }
  } while (nextToken);

  _cache.set(cacheKey, { orders, ts: Date.now() });
  // Limite cache (LRU semplice)
  if (_cache.size > 64) {
    const oldest = [..._cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0][0];
    _cache.delete(oldest);
  }

  logger.info(
    `[OrdersLive] ${marketplaceId}: ${orders.length} ordini (${fromYmd}..${toYmd})${partial ? " [TRUNCATED]" : ""}`
  );
  return { orders, partial, fromCache: false };
}

/**
 * Restituisce un aggregato per country del range [fromYmd, toYmd].
 * Esclude OrderStatus = Canceled.
 *
 * Output:
 *   {
 *     range: { from, to },
 *     per_country: [{ country, currency, revenue, units, orders }],
 *     totale_eur: { revenue, units, orders },     // somma marketplaces EUR
 *     non_eur: [{ country, currency, revenue, units, orders }] // valute estere
 *   }
 */
async function aggregateOrdersLive({ from, to }) {
  const per_country = [];

  for (const mp of MARKETPLACES) {
    let orders = [];
    try {
      const r = await fetchOrdersForMarketplace(mp.id, from, to);
      orders = r.orders;
    } catch (err) {
      logger.warn(
        { err: err.response?.data || err.message, mp: mp.code },
        "[OrdersLive] skip marketplace per errore"
      );
      per_country.push({ country: mp.code, currency: mp.currency, revenue: 0, units: 0, orders: 0, error: true });
      continue;
    }

    let revenue = 0;
    let units = 0;
    let count = 0;
    for (const o of orders) {
      if (o.OrderStatus === "Canceled") continue;
      const amt = parseFloat(o.OrderTotal?.Amount || "0") || 0;
      const u = (parseInt(o.NumberOfItemsShipped || "0") || 0)
              + (parseInt(o.NumberOfItemsUnshipped || "0") || 0);
      revenue += amt;
      units += u;
      count++;
    }

    per_country.push({
      country: mp.code,
      currency: mp.currency,
      revenue: Math.round(revenue * 100) / 100,
      units,
      orders: count,
    });
  }

  // Aggregato EUR (i 6 marketplace EUR)
  const totale_eur = per_country
    .filter((c) => c.currency === "EUR")
    .reduce((a, c) => ({
      revenue: a.revenue + (c.revenue || 0),
      units: a.units + (c.units || 0),
      orders: a.orders + (c.orders || 0),
    }), { revenue: 0, units: 0, orders: 0 });
  totale_eur.revenue = Math.round(totale_eur.revenue * 100) / 100;

  const non_eur = per_country.filter((c) => c.currency !== "EUR" && (c.revenue > 0 || c.units > 0));

  return { range: { from, to }, per_country, totale_eur, non_eur };
}

module.exports = { aggregateOrdersLive, fetchOrdersForMarketplace };
