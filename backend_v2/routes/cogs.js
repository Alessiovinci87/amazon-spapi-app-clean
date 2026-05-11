// backend_v2/routes/cogs.js
// Cost-Of-Goods-Sold per ASIN/marketplace/fulfillment (ispirato Shopkeeper).

const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { getDb } = require("../db/database");
const { validate } = require("../middleware/validate");
const logger = require("../utils/logger");
const { getAsinSalesForPeriod } = require("../modules/reports/salesTrafficService");

const SUPPORTED_COUNTRIES = ["IT", "FR", "ES", "DE", "UK", "NL", "BE", "PL"];

const cogsSchema = z.object({
  asin: z.string().min(8).max(20),
  marketplace_id: z.enum(SUPPORTED_COUNTRIES),
  fulfillment_type: z.enum(["FBA", "FBM"]).default("FBA"),
  wholesale: z.coerce.number().min(0).default(0),
  inspection: z.coerce.number().min(0).default(0),
  region_shipping: z.coerce.number().min(0).default(0),
  import_tax: z.coerce.number().min(0).default(0),
  other_costs: z.coerce.number().min(0).default(0),
  inbound_shipping: z.coerce.number().min(0).default(0),
  tag: z.string().max(80).nullish(),
  note: z.string().max(500).nullish(),
});

const deleteParamsSchema = z.object({
  asin: z.string().min(8).max(20),
  marketplace_id: z.enum(SUPPORTED_COUNTRIES),
  fulfillment_type: z.enum(["FBA", "FBM"]),
});

const customTitleSchema = z.object({
  custom_title: z.string().max(200).nullish(),
});

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// =========================================================
// GET /api/v2/cogs/list?marketplace=IT&fulfillment=FBA
// Lista prodotti con vendite 30gg + COGS salvato + immagine.
// Ordinati per units 30gg desc.
// =========================================================
router.get("/list", (req, res) => {
  try {
    const db = getDb();
    const marketplace = String(req.query.marketplace || "IT").toUpperCase();
    const fulfillment = String(req.query.fulfillment || "FBA").toUpperCase();

    if (!SUPPORTED_COUNTRIES.includes(marketplace)) {
      return res.status(400).json({ ok: false, error: `Marketplace non supportato: ${marketplace}` });
    }
    if (!["FBA", "FBM"].includes(fulfillment)) {
      return res.status(400).json({ ok: false, error: `Fulfillment non valido: ${fulfillment}` });
    }

    // 1) Tutti i prodotti del gestionale
    const prodotti = db.prepare(`
      SELECT asin, nome, custom_title, immagine_main, family_code, categoria
      FROM prodotti
    `).all();
    const prodMap = new Map(prodotti.map(p => [p.asin, p]));

    // 2) Vendite ultimi 30gg per ASIN sul marketplace selezionato
    const salesRows = getAsinSalesForPeriod(daysAgoISO(30), daysAgoISO(0), [marketplace]);
    const salesByAsin = new Map(salesRows.map(r => [r.asin, r]));

    // 3) COGS salvati per il marketplace+fulfillment richiesto
    const cogsRows = db.prepare(`
      SELECT asin, wholesale, inspection, region_shipping, import_tax, other_costs,
             inbound_shipping, total, tag, note, created_at, updated_at
      FROM product_cogs
      WHERE marketplace_id = ? AND fulfillment_type = ?
    `).all(marketplace, fulfillment);
    const cogsByAsin = new Map(cogsRows.map(r => [r.asin, r]));

    // 4) Fallback immagini da product_catalog (se manca immagine_main)
    const catRows = db.prepare(`
      SELECT asin, image_url, titolo
      FROM product_catalog
      WHERE marketplace_id IN (
        SELECT marketplace_id FROM product_catalog WHERE asin IS NOT NULL GROUP BY marketplace_id
      )
    `).all();
    const catByAsin = new Map();
    for (const r of catRows) {
      if (!catByAsin.has(r.asin) || (r.image_url && !catByAsin.get(r.asin).image_url)) {
        catByAsin.set(r.asin, r);
      }
    }

    // 5) Compongo le righe — includo tutti i prodotti del gestionale (anche senza vendite/cogs)
    const rows = prodotti.map(p => {
      const sale = salesByAsin.get(p.asin);
      const cogs = cogsByAsin.get(p.asin);
      const cat = catByAsin.get(p.asin);
      const units30d = sale ? sale.unita : 0;
      const revenue30d = sale ? sale.fatturato : 0;
      const avg_price = units30d > 0 ? revenue30d / units30d : 0;
      const total_cogs = cogs ? cogs.total : 0;
      const margin_eur = avg_price > 0 ? avg_price - total_cogs : 0;
      const margin_pct = avg_price > 0 ? (margin_eur / avg_price) * 100 : 0;

      return {
        asin: p.asin,
        sku: sale?.sku || "",
        nome: p.nome,
        custom_title: p.custom_title,
        display_title: p.custom_title || p.nome,
        immagine: p.immagine_main || cat?.image_url || null,
        family_code: p.family_code,
        categoria: p.categoria,
        units_30d: units30d,
        revenue_30d: Number(revenue30d.toFixed(2)),
        avg_price: Number(avg_price.toFixed(2)),
        cogs: cogs ? {
          wholesale: cogs.wholesale,
          inspection: cogs.inspection,
          region_shipping: cogs.region_shipping,
          import_tax: cogs.import_tax,
          other_costs: cogs.other_costs,
          inbound_shipping: cogs.inbound_shipping,
          total: cogs.total,
          tag: cogs.tag,
          note: cogs.note,
          updated_at: cogs.updated_at,
        } : null,
        total_cogs: Number(total_cogs.toFixed(2)),
        margin_eur: Number(margin_eur.toFixed(2)),
        margin_pct: Number(margin_pct.toFixed(2)),
      };
    });

    // 6) Ordina per vendite desc (poi alfabetico)
    rows.sort((a, b) => (b.units_30d - a.units_30d) || a.display_title.localeCompare(b.display_title));

    res.json({
      ok: true,
      marketplace,
      fulfillment,
      data: rows,
      total: rows.length,
    });
  } catch (err) {
    logger.error({ err }, "Errore GET /cogs/list");
    res.status(500).json({ ok: false, error: "Errore nel recupero della lista COGS" });
  }
});

// =========================================================
// GET /api/v2/cogs/:asin/:marketplace_id/:fulfillment_type
// Recupera singolo record COGS (per pre-popolare il modale).
// =========================================================
router.get("/:asin/:marketplace_id/:fulfillment_type", (req, res) => {
  try {
    const db = getDb();
    const { asin, marketplace_id, fulfillment_type } = req.params;
    const row = db.prepare(`
      SELECT * FROM product_cogs
      WHERE asin = ? AND marketplace_id = ? AND fulfillment_type = ?
    `).get(asin, marketplace_id.toUpperCase(), fulfillment_type.toUpperCase());
    res.json({ ok: true, data: row || null });
  } catch (err) {
    logger.error({ err }, "Errore GET /cogs/:asin");
    res.status(500).json({ ok: false, error: "Errore nel recupero del COGS" });
  }
});

// =========================================================
// POST /api/v2/cogs/save — upsert COGS
// =========================================================
router.post("/save", validate({ body: cogsSchema }), (req, res) => {
  try {
    const db = getDb();
    const c = req.body;
    db.prepare(`
      INSERT INTO product_cogs (
        asin, marketplace_id, fulfillment_type,
        wholesale, inspection, region_shipping, import_tax, other_costs, inbound_shipping,
        tag, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(asin, marketplace_id, fulfillment_type) DO UPDATE SET
        wholesale = excluded.wholesale,
        inspection = excluded.inspection,
        region_shipping = excluded.region_shipping,
        import_tax = excluded.import_tax,
        other_costs = excluded.other_costs,
        inbound_shipping = excluded.inbound_shipping,
        tag = excluded.tag,
        note = excluded.note
    `).run(
      c.asin, c.marketplace_id, c.fulfillment_type,
      c.wholesale, c.inspection, c.region_shipping, c.import_tax, c.other_costs, c.inbound_shipping,
      c.tag || null, c.note || null
    );

    const saved = db.prepare(`
      SELECT * FROM product_cogs
      WHERE asin = ? AND marketplace_id = ? AND fulfillment_type = ?
    `).get(c.asin, c.marketplace_id, c.fulfillment_type);

    res.json({ ok: true, data: saved });
  } catch (err) {
    logger.error({ err }, "Errore POST /cogs/save");
    res.status(500).json({ ok: false, error: "Errore nel salvataggio del COGS" });
  }
});

// =========================================================
// DELETE /api/v2/cogs/:asin/:marketplace_id/:fulfillment_type
// =========================================================
router.delete("/:asin/:marketplace_id/:fulfillment_type",
  validate({ params: deleteParamsSchema }),
  (req, res) => {
    try {
      const db = getDb();
      const { asin, marketplace_id, fulfillment_type } = req.params;
      const result = db.prepare(`
        DELETE FROM product_cogs
        WHERE asin = ? AND marketplace_id = ? AND fulfillment_type = ?
      `).run(asin, marketplace_id, fulfillment_type);
      if (result.changes === 0) {
        return res.status(404).json({ ok: false, error: "COGS non trovato" });
      }
      res.json({ ok: true, message: "COGS eliminato" });
    } catch (err) {
      logger.error({ err }, "Errore DELETE /cogs");
      res.status(500).json({ ok: false, error: "Errore eliminazione COGS" });
    }
  }
);

// =========================================================
// PUT /api/v2/cogs/custom-title/:asin
// Aggiorna o cancella il titolo personalizzato del prodotto.
// =========================================================
router.put("/custom-title/:asin", validate({ body: customTitleSchema }), (req, res) => {
  try {
    const db = getDb();
    const { asin } = req.params;
    const value = (req.body.custom_title || "").trim() || null;
    const result = db.prepare(`
      UPDATE prodotti SET custom_title = ? WHERE asin = ?
    `).run(value, asin);
    if (result.changes === 0) {
      return res.status(404).json({ ok: false, error: "Prodotto non trovato" });
    }
    res.json({ ok: true, custom_title: value });
  } catch (err) {
    logger.error({ err }, "Errore PUT /cogs/custom-title");
    res.status(500).json({ ok: false, error: "Errore aggiornamento titolo" });
  }
});

module.exports = router;
