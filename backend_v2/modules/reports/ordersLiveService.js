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
// Le date YYYY-MM-DD vanno interpretate come "giorno italiano" (Europa/Rome).
// Italia è UTC+1 (inverno) o UTC+2 (estate). Per maggio = UTC+2.
// Per non dipendere da tabelle TZ, calcoliamo l'offset in base alla data.
function italyOffsetHours(ymd) {
  // Approssimazione DST Italia: ultima dom di marzo → ultima dom di ottobre = +2; resto = +1
  const [y, m] = ymd.split("-").map(Number);
  // Mese aprile..ottobre quasi sempre +2
  if (m >= 4 && m <= 9) return 2;
  if (m === 3 || m === 10) {
    // Per semplicità e safety: tratta marzo come +1, ottobre come +2.
    // Edge case di pochi giorni intorno al cambio DST viene gestito da Amazon
    // che è tollerante di +/- 1h sul filtro.
    return m === 3 ? 1 : 2;
  }
  return 1;
}
function ymdToIsoStart(ymd) {
  const off = italyOffsetHours(ymd);
  // 00:00 italiano = (24-off):00 UTC giorno prima
  const h = 24 - off;
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(h, 0, 0, 0);
  return d.toISOString();
}
function ymdToIsoEnd(ymd) {
  const off = italyOffsetHours(ymd);
  // 23:59:59 italiano = (23-off):59:59 UTC stesso giorno (se off<=23)
  // Più semplice: prendi 00:00 del giorno successivo italiano e -1ms
  const next = new Date(ymd + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  // 00:00 italiano del giorno successivo = 22:00 UTC del giorno corrente (con off=2)
  const h = 24 - off;
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCHours(h - 1, 59, 59, 999); // 1ms prima delle 22:00 UTC successive
  return d.toISOString();
}

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

  const createdAfter = ymdToIsoStart(fromYmd);
  // Amazon richiede CreatedBefore >= 2 min prima di now. Se il toYmd italiano
  // include ore future (es. "oggi" italiano dopo midnight UTC), cappiamo a now-3min.
  const safeCap = new Date(Date.now() - 3 * 60_000);
  const cbCandidate = new Date(ymdToIsoEnd(toYmd));
  const createdBefore = (cbCandidate > safeCap ? safeCap : cbCandidate).toISOString();

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

  // Verità live dal payload /orders (sempre disponibili anche per Pending,
  // a differenza di /orderItems che restituisce items vuoti per Pending):
  //  - NumberOfItemsShipped + NumberOfItemsUnshipped → unità totali
  //  - OrderTotal.Amount → revenue gross-customer (item+tax+ship+promo)
  const orderUnits =
    (parseInt(order.NumberOfItemsShipped || "0") || 0) +
    (parseInt(order.NumberOfItemsUnshipped || "0") || 0);
  const orderTotalAmt = parseFloat(order.OrderTotal?.Amount || "0") || 0;
  const orderTotalCcy = order.OrderTotal?.CurrencyCode || null;

  const cached = db.prepare(
    "SELECT * FROM amazon_order_cache WHERE order_id = ?"
  ).get(orderId);

  if (cached && cached.units != null && cached.revenue != null && cached.items_fetched_at != null) {
    const looksCorrupted = cached.units === 0 && cached.revenue === 0;
    const isFinal = FINAL_STATUSES.has(cached.status);
    if (isFinal && !looksCorrupted) {
      return {
        revenue: cached.revenue,
        units: cached.units,
        isPendingPriced: !!cached.is_pending_priced,
        currency: cached.currency,
      };
    }
    const fetchedAt = cached.items_fetched_at
      ? new Date(cached.items_fetched_at.replace(" ", "T")).getTime() : 0;
    if (!looksCorrupted && Date.now() - fetchedAt < PENDING_REFRESH_MS) {
      return {
        revenue: cached.revenue,
        units: cached.units,
        isPendingPriced: !!cached.is_pending_priced,
        currency: cached.currency,
      };
    }
  }

  // /orderItems serve solo per il breakdown per-item (ASIN, item_price, tax, ship, promo).
  // Per ordini Pending è quasi sempre vuoto: skippiamo, useremo OrderTotal/NumberOfItems
  // dal payload /orders (già letti sopra). Quando l'ordine passa a Shipped, il prossimo
  // ciclo di refresh chiamerà /orderItems normalmente.
  const items = [];
  let getItemsFailed = false;
  if (status !== "Pending") {
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
        if (code === 429) { await sleep(30_000); continue; }
        logger.warn(
          { err: err.response?.data || err.message, orderId },
          "[OrdersLive] errore getOrderItems"
        );
        getItemsFailed = true;
        break;
      }
    } while (nextToken);
  }

  let itemPrice = 0;
  let itemTax = 0;
  let shippingPrice = 0;
  let shippingTax = 0;
  let promotionDiscount = 0;
  let unitsFromItems = 0;
  let firstAsin = null;
  let firstTitle = null;
  let currency = null;

  for (const it of items) {
    unitsFromItems += parseInt(it.QuantityOrdered || "0") || 0;
    itemPrice += parseFloat(it.ItemPrice?.Amount || "0") || 0;
    itemTax += parseFloat(it.ItemTax?.Amount || "0") || 0;
    shippingPrice += parseFloat(it.ShippingPrice?.Amount || "0") || 0;
    shippingTax += parseFloat(it.ShippingTax?.Amount || "0") || 0;
    promotionDiscount += parseFloat(it.PromotionDiscount?.Amount || "0") || 0;
    const ccy = it.ItemPrice?.CurrencyCode || it.ItemTax?.CurrencyCode;
    if (!firstAsin) firstAsin = it.ASIN;
    if (!firstTitle) firstTitle = it.Title;
    if (ccy && !currency) currency = ccy;
  }

  // units: preferenza al payload /orders (sempre presente). Fallback a items.
  const units = orderUnits > 0 ? orderUnits : unitsFromItems;

  // revenue (gross): preferenza a OrderTotal del payload /orders.
  // Fallback al calcolo dai 5 campi degli items (utile se per qualche motivo
  // OrderTotal non è popolato ma gli items sì, e per coerenza storica).
  const fromItems = itemPrice + itemTax + shippingPrice + shippingTax - promotionDiscount;
  let revenue = 0;
  if (orderTotalAmt > 0) revenue = orderTotalAmt;
  else if (fromItems > 0) revenue = fromItems;
  revenue = Math.round(revenue * 100) / 100;

  itemPrice = Math.round(itemPrice * 100) / 100;
  itemTax = Math.round(itemTax * 100) / 100;
  shippingPrice = Math.round(shippingPrice * 100) / 100;
  shippingTax = Math.round(shippingTax * 100) / 100;
  promotionDiscount = Math.round(promotionDiscount * 100) / 100;

  if (orderTotalCcy && !currency) currency = orderTotalCcy;

  const isPendingNoPrice = revenue === 0 && status === "Pending";

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
         item_price, item_tax, shipping_price, shipping_tax, promotion_discount,
         fetched_at, items_fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        item_price = excluded.item_price,
        item_tax = excluded.item_tax,
        shipping_price = excluded.shipping_price,
        shipping_tax = excluded.shipping_tax,
        promotion_discount = excluded.promotion_discount,
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
      isPendingNoPrice ? 1 : 0,
      itemPrice,
      itemTax,
      shippingPrice,
      shippingTax,
      promotionDiscount,
      now,
      now,
    );
  } catch (err) {
    logger.warn({ err: err.message, orderId }, "[OrdersLive] cache save failed");
  }

  return { revenue, units, isPendingPriced: isPendingNoPrice, currency };
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

/**
 * Lettura veloce dalla cache DB per il range [from, to].
 * NON fa chiamate Amazon — usa solo i dati già fetchati.
 * Da chiamare nell'endpoint live che deve rispondere subito.
 */
function readOrdersLiveFromCache({ from, to }) {
  const db = getDb();
  // L'aggregazione raggruppa per marketplace_id usando la mappa
  const rows = db.prepare(`
    SELECT marketplace_id,
      COUNT(*) AS orders,
      COALESCE(SUM(units), 0) AS units,
      COALESCE(SUM(revenue), 0) AS revenue,
      COALESCE(SUM(is_pending_priced), 0) AS pending_priced
    FROM amazon_order_cache
    WHERE DATE(purchase_date) >= ? AND DATE(purchase_date) <= ?
      AND COALESCE(status, '') != 'Canceled'
    GROUP BY marketplace_id
  `).all(from, to);

  const per_country = MARKETPLACES.map((mp) => {
    const r = rows.find((x) => x.marketplace_id === mp.id);
    return {
      country: mp.code,
      currency: mp.currency,
      revenue: r ? Math.round(r.revenue * 100) / 100 : 0,
      units: r ? r.units : 0,
      orders: r ? r.orders : 0,
      pending_priced: r ? r.pending_priced : 0,
    };
  });

  const totale_eur = per_country
    .filter((c) => c.currency === "EUR")
    .reduce((a, c) => ({
      revenue: a.revenue + (c.revenue || 0),
      units: a.units + (c.units || 0),
      orders: a.orders + (c.orders || 0),
    }), { revenue: 0, units: 0, orders: 0 });
  totale_eur.revenue = Math.round(totale_eur.revenue * 100) / 100;

  const non_eur = per_country.filter((c) => c.currency !== "EUR" && (c.revenue > 0 || c.units > 0));

  // Ultimo fetch nella cache per indicare freshness
  const lastFetch = db.prepare(`
    SELECT MAX(items_fetched_at) AS ts
    FROM amazon_order_cache
    WHERE DATE(purchase_date) >= ? AND DATE(purchase_date) <= ?
  `).get(from, to);

  return {
    range: { from, to },
    per_country,
    totale_eur,
    non_eur,
    last_fetch: lastFetch?.ts || null,
  };
}

// === Background refresh: fire-and-forget per non bloccare l'endpoint ===
let _bgRefreshing = new Set();
async function refreshLiveInBackground({ from, to }) {
  const key = `${from}|${to}`;
  if (_bgRefreshing.has(key)) return; // già in corso
  _bgRefreshing.add(key);
  try {
    logger.info({ from, to }, "[OrdersLive] background refresh start");
    await aggregateOrdersLive({ from, to });
    logger.info({ from, to }, "[OrdersLive] background refresh done");
  } catch (err) {
    logger.warn({ err: err.message, from, to }, "[OrdersLive] background refresh failed");
  } finally {
    _bgRefreshing.delete(key);
  }
}

function isBgRefreshing({ from, to }) {
  return _bgRefreshing.has(`${from}|${to}`);
}

module.exports = {
  aggregateOrdersLive,
  fetchOrdersForMarketplace,
  enrichOrderWithItems,
  readOrdersLiveFromCache,
  refreshLiveInBackground,
  isBgRefreshing,
};
