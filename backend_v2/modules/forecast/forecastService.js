// backend_v2/modules/forecast/forecastService.js
// Previsione domanda: per ogni ASIN+country, calcola velocità di vendita giornaliera media
// (finestra windowDays), giorni di stock rimanenti e data consigliata di riordino (oggi + giorni - leadTime).

const { getDb } = require("../../db/database");

/**
 * Ritorna la previsione per tutti gli ASIN con stock > 0.
 * @param {object} opts
 * @param {number} [opts.windowDays=30] — quanti giorni di storico usare per la velocità
 * @param {number} [opts.leadTimeDays=14] — tempo di approvvigionamento (per data riordino)
 * @param {string} [opts.country] — filtro marketplace (IT/DE/FR/ES/GB). Omettere per tutti.
 * @param {number} [opts.minDaysLeft] — filtra solo ASIN con giorni_residui <= questo
 */
function forecastStock({ windowDays = 30, leadTimeDays = 14, country = null, minDaysLeft = null } = {}) {
  const db = getDb();
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - windowDays);
  const fromStr = fromDate.toISOString().slice(0, 10);

  const args = [fromStr];
  let salesWhere = "WHERE date >= ?";
  if (country) { salesWhere += " AND country = ?"; args.push(country); }

  // Aggregato vendite per asin+country nella finestra
  const salesRows = db.prepare(`
    SELECT asin, country,
           SUM(units_ordered) AS total_units,
           COUNT(DISTINCT date) AS days_with_sales
    FROM sales_traffic
    ${salesWhere}
    GROUP BY asin, country
  `).all(...args);

  const salesMap = new Map();
  for (const r of salesRows) {
    salesMap.set(`${r.asin}|${r.country}`, r);
  }

  // Stock per asin+country (solo quelli > 0 oppure con inbound)
  const stockArgs = [];
  let stockWhere = "WHERE (quantity > 0 OR inbound_working > 0 OR inbound_shipped > 0 OR inbound_receiving > 0)";
  if (country) { stockWhere += " AND country = ?"; stockArgs.push(country); }

  const stockRows = db.prepare(`
    SELECT asin, sku, product_name, country,
           COALESCE(quantity, 0) AS quantity,
           COALESCE(inbound_working, 0) AS inbound_working,
           COALESCE(inbound_shipped, 0) AS inbound_shipped,
           COALESCE(inbound_receiving, 0) AS inbound_receiving
    FROM fba_stock
    ${stockWhere}
  `).all(...stockArgs);

  const out = [];
  for (const s of stockRows) {
    const key = `${s.asin}|${s.country}`;
    const sales = salesMap.get(key);
    const totalUnits = sales?.total_units ?? 0;
    const velocita = +(totalUnits / windowDays).toFixed(3);

    const inbound = (s.inbound_working || 0) + (s.inbound_shipped || 0) + (s.inbound_receiving || 0);
    const stockEffettivo = s.quantity + inbound;

    let giorni_residui = null;
    let riordina_entro = null;
    let urgenza = "none";
    if (velocita > 0) {
      giorni_residui = +(stockEffettivo / velocita).toFixed(1);
      const riordino = new Date(now);
      riordino.setDate(riordino.getDate() + Math.max(0, Math.floor(giorni_residui - leadTimeDays)));
      riordina_entro = riordino.toISOString().slice(0, 10);

      if (giorni_residui <= leadTimeDays) urgenza = "critical"; // stock rischia di finire prima del riordino
      else if (giorni_residui <= leadTimeDays * 2) urgenza = "high";
      else if (giorni_residui <= leadTimeDays * 3) urgenza = "medium";
      else urgenza = "low";
    } else if (s.quantity > 0) {
      urgenza = "low"; // stock ma niente vendite recenti
    }

    // Qty suggerita: copre ulteriori 60 giorni dopo lead time (configurabile via windowDays*2)
    const copertura_target_gg = leadTimeDays * 2 + 30;
    const qty_suggerita = velocita > 0 ? Math.max(0, Math.round(velocita * copertura_target_gg - stockEffettivo)) : 0;

    if (minDaysLeft != null && (giorni_residui == null || giorni_residui > minDaysLeft)) continue;

    out.push({
      asin: s.asin,
      sku: s.sku,
      product_name: s.product_name,
      country: s.country,
      stock_disponibile: s.quantity,
      stock_inbound: inbound,
      stock_effettivo: stockEffettivo,
      velocita_giornaliera: velocita,
      unita_vendute_finestra: totalUnits,
      giorni_con_vendite: sales?.days_with_sales ?? 0,
      giorni_residui,
      riordina_entro,
      qty_suggerita,
      urgenza,
    });
  }

  // Ordina per urgenza > giorni_residui crescente (NULL in fondo)
  const ord = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
  out.sort((a, b) => {
    const ua = ord[a.urgenza] ?? 5;
    const ub = ord[b.urgenza] ?? 5;
    if (ua !== ub) return ua - ub;
    const ga = a.giorni_residui ?? 1e9;
    const gb = b.giorni_residui ?? 1e9;
    return ga - gb;
  });

  return out;
}

module.exports = {
  forecastStock,
};
