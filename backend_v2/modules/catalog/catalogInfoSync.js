// backend_v2/modules/catalog/catalogInfoSync.js
// Sincronizza product_catalog (titolo + image_url + image_count) per ogni
// ASIN presente in fba_stock, su tutti i marketplace EU configurati.
// Usato sia dal route manuale POST /api/v2/europa/sync-catalog-info
// sia dal cron settimanale in syncCron.js.

const { getDb } = require("../../db/database");
const { getAccessToken } = require("../auth/authService");
const { getCatalogInfoPerMarketplace } = require("./catalogAmazonService");

const MARKETPLACES_CATALOG = [
  { marketplaceId: "APJ6JRA9NG5V4",  country: "IT" },
  { marketplaceId: "A13V1IB3VIYZZH", country: "FR" },
  { marketplaceId: "A1PA6795UKMFR9", country: "DE" },
  { marketplaceId: "A1RKKUPIHCS9HS", country: "ES" },
  { marketplaceId: "A1F83G8C2ARO7P", country: "GB" },
  { marketplaceId: "A1805IZSGTT6HS", country: "NL" },
  { marketplaceId: "AMEN7PMS3EDWL",  country: "BE" },
  { marketplaceId: "A1C3SOZRARQ6R3", country: "PL" },
];

/**
 * Aggiorna product_catalog per tutti gli ASIN in fba_stock.
 * Accetta un oggetto `progress` opzionale che viene mutato durante l'esecuzione
 * (campi: done, total, aggiornati, errori, error) per poter essere esposto via API.
 * Ritorna { done, total, aggiornati, errori } al termine.
 */
async function aggiornaProductCatalog(progress = {}) {
  const db = getDb();
  const { access_token } = await getAccessToken();

  const asins = db
    .prepare("SELECT DISTINCT asin FROM fba_stock ORDER BY asin")
    .all()
    .map(r => r.asin);

  progress.total = asins.length;
  progress.done = 0;
  progress.aggiornati = 0;
  progress.errori = 0;

  const stmt = db.prepare(`
    INSERT INTO product_catalog (asin, marketplace_id, country, titolo, image_url, image_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(asin, marketplace_id) DO UPDATE SET
      titolo      = excluded.titolo,
      image_url   = excluded.image_url,
      image_count = excluded.image_count,
      updated_at  = excluded.updated_at
  `);

  for (const asin of asins) {
    try {
      const infos = await getCatalogInfoPerMarketplace(asin, access_token, MARKETPLACES_CATALOG);
      const inserisci = db.transaction(() => {
        for (const info of infos) {
          if (info.titolo || info.image_url) {
            stmt.run(asin, info.marketplaceId, info.country, info.titolo, info.image_url, info.image_count ?? 0);
          }
        }
      });
      inserisci();
      progress.aggiornati += infos.filter(i => i.titolo || i.image_url).length;
    } catch (err) {
      progress.errori += 1;
      // non interrompiamo per un singolo ASIN fallito
    }
    progress.done += 1;
    // Pausa 500ms tra ASIN (le pause tra marketplace sono già in getCatalogInfoPerMarketplace)
    await new Promise(r => setTimeout(r, 500));
  }

  return {
    done: progress.done,
    total: progress.total,
    aggiornati: progress.aggiornati,
    errori: progress.errori,
  };
}

module.exports = { aggiornaProductCatalog, MARKETPLACES_CATALOG };
