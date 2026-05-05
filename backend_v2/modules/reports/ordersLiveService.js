// backend_v2/modules/reports/ordersLiveService.js
//
// Vendite "near real-time" via SP-API Orders API.
//
// Problema noto: per gli ordini in stato Pending Amazon NON rilascia né
// OrderTotal.Amount né ItemPrice (è restricted finché il pagamento non è
// confermato, di solito ~30 min). Su nuovi ordini freschi la maggior parte
// è Pending, quindi sommare solo OrderTotal dà revenue ~10x sotto il reale.
//
// Strategia (la stessa di Shopkeeper):
//   1. Per ogni ordine, fetch getOrderItems → ottieni ASIN + Quantity
//   2. Se ItemPrice è valorizzato → usa quel revenue (Amazon-confermato)
//   3. Altrimenti, lookup listings_snapshot.prezzo per ASIN+marketplace e
//      stima revenue = prezzo_listing * quantity (flag is_pending_priced=1)
//   4. Quando l'ordine passa a Shipped Amazon rilascia ItemPrice → al
//      prossimo refresh il revenue è "Amazon-confermato" e flag scende a 0.
//
// Cache persistente:
//   - amazon_order_cache contiene ogni ordine con qty/revenue/status
//   - Ordini in stato finale (Shipped/Delivered): mai rifetchare
//   - Ordini Pending/Unshipped: rifetch se items_fetched_at > 5 min fa

const axios = require("axios");
const { getAccessToken } = require("../auth/authService");
const { getDb } = require("../../db/database");
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
const MP_ID_TO_CC = Object.fromEntries(MARKETPLACES.map(m => [m.id, m.code]));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FINAL_STATUSES = new Set(["Shipped", "Delivered", "InvoiceUnconfirmed"]);
const ORDERS_LIST_CACHE_TTL_MS = 3 * 60 * 1000;
const PENDING_REFRESH_MS = 5 * 60 * 1000;

// Cache lista ordini per (marketplace, range)
const _ordersListCache = new Map();

// === Helpers ===
const ymdToIsoStart = (ymd) => `${ymd}T00:00:00Z`;
const ymdToIsoEnd = (ymd) => `${ymd}T23:59:59Z`;

/**
 * Lookup prezzo del listing più recente per un ASIN+marketplace.
 * Usa il campo `prezzo` di listings_snapshot.
 */
function getListingPrice(db, asin, marketplaceId) {
  if (!asin || !marketplaceId) return null;
  try {
    const row = db.prepare(`
      SELECT prezzo, currency
      FROM listings_snapshot
      WHERE asin = ? AND marketplace_id = ? AND prezzo IS NOT NULL AND prezzo > 0
      ORDER BY snapshot_at DESC
      LIMIT 1
    `).get(asin, marketplaceId);
    if (row?.prezzo) return { price: row.prezzo, currency: row.currency };
    return null;
  } catch { return null; }
}

/**
 * Recupera lista ordini per un marketplace nel range [from, to].
 * Cache in memoria 3 min.
 */
async function fetchOrdersForMarketplace(marketplaceId, fromYmd, toYmd) {
  const cacheKey = `${marketplaceId}|${fromYmd}|${toYmd}`;
  const hit = _ordersListCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < ORDERS_LIST_CACHE_TTL_MS) {
    return { orders: hit.orders, fromCache: true };
  }

  const { access_token } = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${access_token}`,
    "x-amz-access-token": access_token,
  };

  const todayUtc = new Date().toISOString().slice(0, 10);
  const isToday = toYmd === todayUtc;
  const createdAfter = ymdToIsoStart(fromYmd);
  // Amazon richiede CreatedBefore >= 2 minuti prima di now (uso 3 per safety)
  const createdBefore = isToday
    ? new Date(Date.now() - 3 * 60_000).toISOString()
    : ymdToIsoEnd(toYmd);

  const orders = [];
  let nextToken = null;
  let pages = 0;

  do {
    const url = `${BASE_URL}/orders/v0/orders`;
    let params;
    if (nextToken) {
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
      orders.push(...(payload.Orders || []));
      nextToken = payload.NextToken || null;
      pages++;
      if (pages > 50) break;
      if (nextToken) await sleep(700);
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        await sleep(60_000);
        continue;
      }
      throw err;
    }
  } while (nextToken);

  _ordersListCache.set(cacheKey, { orders, ts: Date.now() });
  if (_ordersListCache.size > 64) {
    const oldest = [..._ordersListCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0][0];
    _ordersListCache.delete(oldest);
  }
  logger.info(
    `[OrdersLive] ${marketplaceId}: ${orders.length} ordini lista (${fromYmd}..${toYmd})`
  );
  return { orders, fromCache: false };
}

/**
 * Per un singolo ordine, ricava revenue e units:
 *  - chiama getOrderItems (con cache persistente in DB)
 *  - per items con ItemPrice valorizzato → usa quello
 *  - per items senza ItemPrice → lookup listings_snapshot.prezzo
 *
 * Ritorna { revenue, units, isPendingPriced, currency }
 */
async function enrichOrderWithItems(order, headers, db) {
  const orderId = order.AmazonOrderId;
  const status = order.OrderStatus;
  const marketplaceId = order.MarketplaceId;

  // Cache hit: per stati finali, non rifetchare mai. Per Pending, rifetch
  // se gli items sono stati fetchati > 5 min fa.
  const cached = db.prepare(
    "SELECT * FROM amazon_order_cache WHERE order_id = ?"
  ).get(orderId);

  if (cached && cached.units != null && cached.revenue != null) {
    const isFinal = FINAL_STATUSES.has(cached.status);
    if (isFinal) {
      return {
        revenue: cached.revenue,
        units: cached.units,
        isPendingPriced: !!cached.is_pending_priced,
        currency: cached.currency,
      };
    }
    // Pending in cache: rifetch solo se vecchio
    const fetchedAt = cached.items_fetched_at
      ? new Date(cached.items_fetched_at.replace(" ", "T")).getTime() : 0;
    if (Date.now() - fetchedAt < PENDING_REFRESH_MS) {
      return {
        revenue: cached.revenue,
        units: cached.units,
        isPendingPriced: !!cached.is_pending_priced,
        currency: cached.currency,
      };
    }
  }

  // Chiama getOrderItems (paginazione)
  const items = [];
  let nextToken = null;
  let pages = 0;
  do {
    const url = `${BASE_URL}/orders/v0/orders/${encodeURIComponent(orderId)}/orderItems`;
    const params = nextToken ? { NextToken: nextToken } : undefined;
    try {
      const res = await axios.get(url, { params, headers, timeout: 20_000 });
      const payload = res.data?.payload || {};
      items.push(...(payload.OrderItems || []));
      nextToken = payload.NextToken || null;
      pages++;
      if (pages > 5) break;
    } catch (err) {
      const code = err.response?.status;
      if (code === 429) {
        await sleep(30_000);
        continue;
      }
      logger.warn(
        { err: err.response?.data || err.message, orderId },
        "[OrdersLive] errore getOrderItems"
      );
      // Se cache esiste, restituisci la cache esistente per non bloccare
      if (cached && cached.units != null) {
        return {
          revenue: cached.revenue || 0,
          units: cached.units || 0,
          isPendingPriced: !!cached.is_pending_priced,
          currency: cached.currency,
        };
      }
      return { revenue: 0, units: 0, isPendingPriced: true, currency: null };
    }
  } while (nextToken);

  // Calcola revenue: per ogni item, ItemPrice se valorizzato, altrimenti
  // lookup prezzo listing.
  let revenue = 0;
  let units = 0;
  let usedFallbackForAny = false;
  let firstAsin = null;
  let firstTitle = null;
  let currency = null;

  for (const it of items) {
    const qty = parseInt(it.QuantityOrdered || "0") || 0;
    const itemPriceAmt = parseFloat(it.ItemPrice?.Amount || "0") || 0;
    const itemPriceCcy = it.ItemPrice?.CurrencyCode;
    const asin = it.ASIN;
    if (!firstAsin) firstAsin = asin;
    if (!firstTitle) firstTitle = it.Title;
    if (itemPriceCcy && !currency) currency = itemPriceCcy;
    units += qty;

    if (itemPriceAmt > 0) {
      revenue += itemPriceAmt;
    } else {
      // Fallback: lookup prezzo listing
      const listing = getListingPrice(db, asin, marketplaceId);
      if (listing?.price > 0) {
        revenue += listing.price * qty;
        usedFallbackForAny = true;
        if (!currency) currency = listing.currency;
      }
    }
  }

  revenue = Math.round(revenue * 100) / 100;

  // Salva in cache (UPSERT)
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  if (!currency) {
    const mp = MARKETPLACES.find(m => m.id === marketplaceId);
    currency = mp?.currency || null;
  }
  try {
    db.prepare(`
      INSERT INTO amazon_order_cache
        (order_id, marketplace_id, asin, title, purchase_date,
         status, units, revenue, currency, is_pending_priced,
         fetched_at, items_fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        marketplace_id = excluded.marketplace_id,
        asin = COALESCE(excluded.asin, amazon_order_cache.asin),
        title = COALESCE(excluded.title, amazon_order_cache.title),
        purchase_date = COALESCE(excluded.purchase_date, amazon_order_cache.purchase_date),
        status = excluded.status,
        units = excluded.units,
        revenue = excluded.revenue,
        currency = excluded.currency,
        is_pending_priced = excluded.is_pending_priced,
        items_fetched_at = excluded.items_fetched_at
    `).run(
      orderId,
      marketplaceId || null,
      firstAsin || null,
      firstTitle || null,
      order.PurchaseDate || null,
      status || null,
      units,
      revenue,
      currency || null,
      usedFallbackForAny ? 1 : 0,
      now,
      now,
    );
  } catch (err) {
    logger.warn({ err: err.message, orderId }, "[OrdersLive] cache save failed");
  }

  return { revenue, units, isPendingPriced: usedFallbackForAny, currency };
}

/**
 * Aggregato per country del range [fromYmd, toYmd].
 * Filtra Canceled.
 */
async function aggregateOrdersLive({ from, to }) {
  const db = getDb();
  const per_country = [];
  const { access_token } = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${access_token}`,
    "x-amz-access-token": access_token,
  };

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
      per_country.push({
        country: mp.code, currency: mp.currency,
        revenue: 0, units: 0, orders: 0, error: true,
      });
      continue;
    }

    const valid = orders.filter((o) => o.OrderStatus !== "Canceled");
    let revenue = 0;
    let units = 0;
    let pendingPriced = 0;
    let confirmed = 0;

    // Sequenziale ma con cache aggressiva: dopo il primo run, le successive
    // chiamate sono O(1) (DB lookup) finché gli ordini non passano a Shipped.
    for (const o of valid) {
      const enriched = await enrichOrderWithItems(o, headers, db);
      revenue += enriched.revenue;
      units += enriched.units;
      if (enriched.isPendingPriced) pendingPriced++;
      else confirmed++;
      // Throttle: solo se NON è cache hit (per safety in caso di tanti Pending)
      // Sappiamo se è cache hit dal fatto che la chiamata non ha latenza
      // ma è difficile distinguere. Sleep brevissimo per non saturare.
      await sleep(50);
    }

    per_country.push({
      country: mp.code,
      currency: mp.currency,
      revenue: Math.round(revenue * 100) / 100,
      units,
      orders: valid.length,
      pending_priced: pendingPriced,    // ordini Pending con stima da listing
      confirmed_priced: confirmed,       // ordini con prezzo Amazon-confermato
    });
  }

  // Aggregato EUR
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

module.exports = { aggregateOrdersLive, fetchOrdersForMarketplace, enrichOrderWithItems };
