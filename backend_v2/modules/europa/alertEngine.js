// backend_v2/modules/europa/alertEngine.js
// Engine che confronta snapshot attuali con precedenti e scatta gli alert

const { getDb } = require("../../db/database");
const { getCatalogDetails } = require("../catalog/catalogAmazonService");
const { getAccessToken } = require("../auth/authService");
const { spApiGet } = require("../amazon/spApiClient");

const MARKETPLACES = [
  { paese: "Italy",       marketplaceId: "APJ6JRA9NG5V4",  country: "IT" },
  { paese: "France",      marketplaceId: "A13V1IB3VIYZZH", country: "FR" },
  { paese: "Germany",     marketplaceId: "A1PA6795UKMFR9",  country: "DE" },
  { paese: "Spain",       marketplaceId: "A1RKKUPIHCS9HS",  country: "ES" },
  { paese: "UK",          marketplaceId: "A1F83G8C2ARO7P",  country: "GB" },
  { paese: "Netherlands", marketplaceId: "A1805IZSGTT6HS",  country: "NL" },
  { paese: "Belgium",     marketplaceId: "AMEN7PMS3EDWL",   country: "BE" },
  { paese: "Poland",      marketplaceId: "A1C3SOZRARQ6R3",  country: "PL" },
  // Sweden (A2NODRKZP88ZB9) esclusa: account non abilitato → 403 su ogni chiamata
];

// Mappa marketplaceId → country code
const MP_TO_COUNTRY = Object.fromEntries(MARKETPLACES.map(m => [m.marketplaceId, m.country]));

/**
 * Inserisce un evento di alert nel DB (evita duplicati nella stessa ora).
 */
function fireAlert(db, { asin, tipo, marketplace_id, messaggio, valore_attuale, valore_precedente, nome }) {
  const recent = db.prepare(`
    SELECT id FROM alert_events
    WHERE asin = ? AND tipo = ? AND marketplace_id IS ? AND letto = 0
      AND datetime(created_at) > datetime('now', '-1 hour')
    LIMIT 1
  `).get(asin, tipo, marketplace_id ?? null);

  if (recent) return;

  db.prepare(`
    INSERT INTO alert_events (asin, tipo, marketplace_id, messaggio, valore_attuale, valore_precedente, nome)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(asin, tipo, marketplace_id ?? null, messaggio, valore_attuale ?? null, valore_precedente ?? null, nome ?? null);
}

/**
 * Recupera lo stock FBA per un ASIN via Inventory API (tutti i marketplace).
 * Restituisce { [marketplaceId]: { fulfillable, reserved, inboundReceiving, unfulfillable, totale } }
 */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getFBAStockForAsin(asin) {
  const { access_token } = await getAccessToken();
  const results = {};

  // Sequenziale con pausa 300ms tra marketplace per evitare 429
  for (const mp of MARKETPLACES) {
    try {
      // NOTA: l'API /fba/inventory/v1/summaries NON supporta un parametro
      // "asinFilter" (lo ignora silenziosamente e torna tutto l'inventario).
      // I filtri validi sono sellerSkus / sellerSku / startDateTime.
      // Qui chiediamo l'intero inventario del marketplace (con paginazione)
      // e filtriamo client-side per ASIN.
      let nextToken = null;
      let summary = null;
      let pages = 0;
      do {
        const params = [
          `marketplaceIds=${mp.marketplaceId}`,
          `granularityType=Marketplace`,
          `granularityId=${mp.marketplaceId}`,
          `details=true`,
        ];
        if (nextToken) params.push(`nextToken=${encodeURIComponent(nextToken)}`);
        const data = await spApiGet({
          path: "/fba/inventory/v1/summaries",
          query: params.join("&"),
          accessToken: access_token,
          awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
          awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
        });
        const summaries = data?.payload?.inventorySummaries || [];
        summary = summaries.find(s => s.asin === asin);
        nextToken = data?.payload?.nextToken || data?.pagination?.nextToken || null;
        pages++;
        if (summary) break;
        // limite di sicurezza: smetti dopo 20 pagine (~2000 SKU) per non bruciare quota
        if (pages >= 20) break;
        if (nextToken) await sleep(200);
      } while (nextToken);

      if (!summary) {
        // ASIN non in inventario di questo marketplace → azzero
        results[mp.marketplaceId] = { fulfillable: 0, reserved: 0, inboundReceiving: 0, unfulfillable: 0, totale: 0 };
      } else {
        const det = summary.inventoryDetails ?? {};
        const fulfillable   = det.fulfillableQuantity ?? 0;
        const reserved      = det.reservedQuantity?.totalReservedQuantity ?? 0;
        const inboundRec    = det.inboundReceivingQuantity ?? 0;
        const unfulfillable = det.unfulfillableQuantity?.totalUnfulfillableQuantity ?? 0;
        const totale        = fulfillable + reserved + inboundRec + unfulfillable;
        results[mp.marketplaceId] = { fulfillable, reserved, inboundReceiving: inboundRec, unfulfillable, totale };
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) await sleep(2000); // back-off su rate limit
      results[mp.marketplaceId] = null;
    }
    await sleep(300);
  }

  return results;
}

/**
 * Salva lo stock FBA nel DB (tabella fba_stock).
 */
function salvaStockNelDB(db, asin, productName, stockByMarketplace) {
  const stmt = db.prepare(`
    INSERT INTO fba_stock (asin, sku, product_name, country, quantity, stock_totale,
      reserved_qty, inbound_receiving, unfulfillable_qty, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(asin, country) DO UPDATE SET
      product_name    = excluded.product_name,
      quantity        = excluded.quantity,
      stock_totale    = excluded.stock_totale,
      reserved_qty    = excluded.reserved_qty,
      inbound_receiving = excluded.inbound_receiving,
      unfulfillable_qty = excluded.unfulfillable_qty,
      updated_at      = excluded.updated_at
  `);

  for (const [mid, stock] of Object.entries(stockByMarketplace)) {
    const country = MP_TO_COUNTRY[mid];
    if (!country || !stock) continue;
    stmt.run(
      asin, null, productName ?? null, country,
      stock.fulfillable, stock.totale,
      stock.reserved, stock.inboundReceiving, stock.unfulfillable
    );
  }
}

/**
 * Controlla e scatta gli alert per un singolo ASIN.
 * Aggiorna listings_snapshot, fba_stock e buybox_tracking.
 */
async function checkAndFireAlerts(asin) {
  const db = getDb();

  // Carica le regole attive
  const rules = db.prepare(
    "SELECT * FROM alert_rules WHERE asin = ? AND abilitato = 1"
  ).all(asin);

  const tipiAttivi = new Set(rules.map(r => r.tipo));
  const alertsFired = [];

  // Catalogo + prezzi + buy box
  let catalogData;
  try {
    catalogData = await getCatalogDetails(asin);
  } catch (err) {
    return { asin, error: `getCatalogDetails: ${err.message}` };
  }

  // Nome prodotto dal primo marketplace disponibile
  const productName = catalogData.marketplaces?.[0]?.titolo ?? null;

  // Stock FBA — solo se richiesto da almeno una regola STOCK_LOW
  // (il grosso dello stock viene già aggiornato da importaInventarioCompleto)
  let stockByMarketplace = {};
  if (tipiAttivi.has("STOCK_LOW")) {
    try {
      stockByMarketplace = await getFBAStockForAsin(asin);
      salvaStockNelDB(db, asin, productName, stockByMarketplace);
    } catch { /* non bloccare */ }
  }

  const now = new Date().toISOString();

  for (const mp of catalogData.marketplaces) {
    const mid = mp.marketplaceId;
    const listing = mp.listing?.summaries?.[0] ?? {};
    const buyboxWon = listing.buyBoxWon ? 1 : 0;
    const prezzo = listing.price?.amount ?? null;
    const currency = listing.price?.currencyCode ?? 'EUR';
    const titolo = mp.titolo ?? null;
    const stato = mp.stato ?? null;

    const prev = db.prepare(
      "SELECT * FROM listings_snapshot WHERE asin = ? AND marketplace_id = ?"
    ).get(asin, mid);

    // Aggiorna snapshot
    db.prepare(`
      INSERT INTO listings_snapshot (asin, marketplace_id, titolo, prezzo, currency, stato, buybox_won, snapshot_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(asin, marketplace_id) DO UPDATE SET
        titolo      = excluded.titolo,
        prezzo      = excluded.prezzo,
        currency    = excluded.currency,
        stato       = excluded.stato,
        buybox_won  = excluded.buybox_won,
        snapshot_at = excluded.snapshot_at
    `).run(asin, mid, titolo, prezzo, currency, stato, buyboxWon, now);

    // buybox_tracking se cambiato
    if (prev && prev.buybox_won !== buyboxWon) {
      db.prepare(`
        INSERT INTO buybox_tracking (asin, marketplace_id, won, our_price, checked_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(asin, mid, buyboxWon, prezzo, now);
    }

    if (!rules.length) continue;

    const rulesForMp = rules.filter(r => r.marketplace_id === mid || r.marketplace_id === null);

    for (const rule of rulesForMp) {
      // BUYBOX_LOST
      if (rule.tipo === "BUYBOX_LOST" && prev && prev.buybox_won === 1 && buyboxWon === 0) {
        fireAlert(db, {
          asin, tipo: "BUYBOX_LOST", marketplace_id: mid,
          messaggio: `[${mp.paese}] Buy Box persa per ASIN ${asin}`,
          valore_attuale: "0", valore_precedente: "1",
          nome: productName,
        });
        alertsFired.push({ tipo: "BUYBOX_LOST", marketplace_id: mid });
      }

      // LISTING_CHANGED
      if (rule.tipo === "LISTING_CHANGED" && prev) {
        const titleChanged = prev.titolo !== titolo;
        const priceChanged = prev.prezzo !== null && prezzo !== null && Math.abs((prev.prezzo ?? 0) - (prezzo ?? 0)) > 0.01;
        if (titleChanged || priceChanged) {
          const campi = [titleChanged && "titolo", priceChanged && "prezzo"].filter(Boolean).join(", ");
          fireAlert(db, {
            asin, tipo: "LISTING_CHANGED", marketplace_id: mid,
            messaggio: `[${mp.paese}] Listing modificato (${campi}) per ASIN ${asin}`,
            valore_attuale: JSON.stringify({ titolo, prezzo }),
            valore_precedente: JSON.stringify({ titolo: prev.titolo, prezzo: prev.prezzo }),
            nome: productName,
          });
          alertsFired.push({ tipo: "LISTING_CHANGED", marketplace_id: mid });
        }
      }

      // STOCK_LOW
      if (rule.tipo === "STOCK_LOW") {
        const stockData = stockByMarketplace[mid];
        const stock = stockData?.fulfillable ?? null;
        if (stock !== null && stock <= rule.soglia) {
          fireAlert(db, {
            asin, tipo: "STOCK_LOW", marketplace_id: mid,
            messaggio: `[${mp.paese}] Stock FBA sotto soglia (${stock} ≤ ${rule.soglia}) per ASIN ${asin}`,
            valore_attuale: String(stock), valore_precedente: null,
            nome: productName,
          });
          alertsFired.push({ tipo: "STOCK_LOW", marketplace_id: mid, stock });
        }
      }
    }
  }

  return { asin, alertsFired, marketplacesChecked: catalogData.marketplaces.length };
}

/**
 * Cicla su tutti gli ASIN con regole attive. Usata dal cron.
 */
async function runAlertCycle() {
  const db = getDb();
  const asins = db.prepare(
    "SELECT DISTINCT asin FROM alert_rules WHERE abilitato = 1"
  ).all().map(r => r.asin);

  if (!asins.length) return { checked: 0 };

  const results = [];
  for (const asin of asins) {
    try {
      results.push(await checkAndFireAlerts(asin));
    } catch (err) {
      results.push({ asin, error: err.message });
    }
    await new Promise(res => setTimeout(res, 2000));
  }

  return { checked: asins.length, results };
}

/**
 * Recupera TUTTI gli ASIN FBA da un marketplace (senza filtro ASIN).
 * Gestisce la paginazione con nextToken.
 * Ritorna array di { asin, sku, product_name, fulfillable, reserved, inboundReceiving, unfulfillable, totale }
 */
async function getAllAsinDaMarketplace(marketplaceId, access_token) {
  const items = [];
  let nextToken = null;

  do {
    const queryParts = [
      `marketplaceIds=${marketplaceId}`,
      `granularityType=Marketplace`,
      `granularityId=${marketplaceId}`,
      `details=true`,
    ];
    if (nextToken) queryParts.push(`nextToken=${encodeURIComponent(nextToken)}`);
    const query = queryParts.join("&");

    const data = await spApiGet({
      path: "/fba/inventory/v1/summaries",
      query,
      accessToken: access_token,
      awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    const summaries = data?.payload?.inventorySummaries ?? [];
    for (const s of summaries) {
      const det = s.inventoryDetails ?? {};
      const fulfillable   = det.fulfillableQuantity ?? 0;
      const reserved      = det.reservedQuantity?.totalReservedQuantity ?? 0;
      const inboundRec    = det.inboundReceivingQuantity ?? 0;
      const unfulfillable = det.unfulfillableQuantity?.totalUnfulfillableQuantity ?? 0;
      items.push({
        asin: s.asin,
        sku:  s.sellerSku ?? null,
        product_name: s.productName ?? null,
        fulfillable, reserved, inboundReceiving: inboundRec, unfulfillable,
        totale: fulfillable + reserved + inboundRec + unfulfillable,
      });
    }

    nextToken = data?.pagination?.nextToken ?? null;
  } while (nextToken);

  return items;
}

/**
 * Importa tutto l'inventario FBA da tutti i marketplace EU e popola fba_stock.
 * Da usare per la prima configurazione o import manuale.
 */
async function importaInventarioCompleto() {
  const db = getDb();
  const { access_token } = await getAccessToken();

  const stmt = db.prepare(`
    INSERT INTO fba_stock (asin, sku, product_name, country, quantity, stock_totale,
      reserved_qty, inbound_receiving, unfulfillable_qty, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(asin, country) DO UPDATE SET
      sku              = excluded.sku,
      product_name     = excluded.product_name,
      quantity         = excluded.quantity,
      stock_totale     = excluded.stock_totale,
      reserved_qty     = excluded.reserved_qty,
      inbound_receiving= excluded.inbound_receiving,
      unfulfillable_qty= excluded.unfulfillable_qty,
      updated_at       = excluded.updated_at
  `);

  const risultati = [];

  for (const mp of MARKETPLACES) {
    try {
      const items = await getAllAsinDaMarketplace(mp.marketplaceId, access_token);
      const inserisci = db.transaction((rows) => {
        for (const item of rows) {
          if (!item.asin) continue;
          stmt.run(
            item.asin, item.sku, item.product_name, mp.country,
            item.fulfillable, item.totale,
            item.reserved, item.inboundReceiving, item.unfulfillable
          );
        }
      });
      inserisci(items);
      risultati.push({ country: mp.country, asins: items.length });
    } catch (err) {
      risultati.push({ country: mp.country, error: err.message });
    }
    // Pausa 2s tra marketplace
    await sleep(2000);
  }

  return risultati;
}

/**
 * Sincronizza SOLO prezzi e buybox per un ASIN (senza catalog/immagini).
 * Più veloce di checkAndFireAlerts: 1 chiamata per marketplace invece di 2.
 * Usato dal job sync-prezzi.
 */
async function sincronizzaPrezziAsin(asin) {
  const { access_token } = await getAccessToken();
  const db = getDb();
  const now = new Date().toISOString();
  let marketplacesChecked = 0;

  for (const mp of MARKETPLACES) {
    try {
      const pricing = await spApiGet(
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
        prezzo   = summary.BuyBoxPrices[0].LandedPrice?.Amount   ?? null;
        currency = summary.BuyBoxPrices[0].LandedPrice?.CurrencyCode ?? currency;
      } else if (offers.length > 0) {
        prezzo   = offers[0].ListingPrice?.Amount      ?? null;
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
      if (status === 429)           await sleep(5000);
      else if (err.code === 'ECONNRESET') await sleep(3000);
      // 403 = marketplace non abilitato, skip silenzioso
    }
    await sleep(2100); // Pricing API: max 0.5 req/s
  }

  return { asin, marketplacesChecked };
}

module.exports = { checkAndFireAlerts, runAlertCycle, getFBAStockForAsin, salvaStockNelDB, MP_TO_COUNTRY, importaInventarioCompleto, sincronizzaPrezziAsin };
