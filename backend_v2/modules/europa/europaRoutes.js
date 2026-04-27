// backend_v2/modules/europa/europaRoutes.js
// Rotte per la sezione Europa: alert rules CRUD, alert events, sync manuale

const express = require("express");
const { getDb } = require("../../db/database");
const { getCatalogDetails, getCatalogInfoPerMarketplace, sincronizzaPrezziAsin } = require("../catalog/catalogAmazonService");
const { aggiornaLedgerStock } = require("../reports/ledgerStockService");
const { checkAndFireAlerts, getFBAStockForAsin, salvaStockNelDB, MP_TO_COUNTRY, importaInventarioCompleto, runAlertCycle } = require("./alertEngine");
const { setManualSyncActive } = require("./alertCron");
const { rigeneraAlertSottoSoglia } = require("../../services/stockAlerts.service");
const { getRates: getFxRates } = require("../../services/fxRatesService");

const logger = require("../../utils/logger");
const router = express.Router();

// NOTA: le migration per product_catalog.image_count e listing_hidden sono in
// backend_v2/db/database.js (runMigrations), eseguite al boot prima di montare le rotte.

// =====================================================================
// ALERT RULES — configurazione per ASIN
// =====================================================================

// GET  /api/v2/europa/alert-rules?asin=XXX
router.get("/alert-rules", (req, res) => {
  try {
    const db = getDb();
    const { asin } = req.query;
    let rows;
    if (asin) {
      rows = db.prepare("SELECT * FROM alert_rules WHERE asin = ? ORDER BY tipo, marketplace_id").all(asin);
    } else {
      rows = db.prepare("SELECT * FROM alert_rules ORDER BY asin, tipo").all();
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/europa/alert-rules
// body: { asin, tipo, marketplace_id?, soglia?, abilitato?, nome? }
router.post("/alert-rules", (req, res) => {
  try {
    const { asin, tipo, marketplace_id = null, soglia = 0, abilitato = 1, nome = null } = req.body;
    if (!asin || !tipo) return res.status(400).json({ error: "asin e tipo sono obbligatori" });
    const TIPI_VALIDI = ["STOCK_LOW", "BUYBOX_LOST", "LISTING_CHANGED", "PRICE_CHANGED"];
    if (!TIPI_VALIDI.includes(tipo)) return res.status(400).json({ error: `tipo non valido. Valori: ${TIPI_VALIDI.join(", ")}` });

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO alert_rules (asin, tipo, marketplace_id, soglia, abilitato, nome)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(asin, tipo, marketplace_id) DO UPDATE SET
        soglia = excluded.soglia,
        abilitato = excluded.abilitato,
        nome = excluded.nome
    `);
    const result = stmt.run(asin, tipo, marketplace_id, soglia, abilitato ? 1 : 0, nome);
    const rule = db.prepare("SELECT * FROM alert_rules WHERE id = ?").get(result.lastInsertRowid) ||
                 db.prepare("SELECT * FROM alert_rules WHERE asin = ? AND tipo = ? AND marketplace_id IS ?").get(asin, tipo, marketplace_id);
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v2/europa/alert-rules/:id
const ALERT_RULES_UPDATABLE = new Set(["soglia", "abilitato", "nome"]);

router.patch("/alert-rules/:id", (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const existing = db.prepare("SELECT * FROM alert_rules WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Regola non trovata" });

    const { soglia, abilitato, nome } = req.body;
    const updates = {};
    if (soglia !== undefined) updates.soglia = Number(soglia);
    if (abilitato !== undefined) updates.abilitato = abilitato ? 1 : 0;
    if (nome !== undefined) updates.nome = nome;

    const cols = Object.keys(updates).filter((k) => ALERT_RULES_UPDATABLE.has(k));
    if (!cols.length) return res.status(400).json({ error: "Nessun campo da aggiornare" });

    const setClauses = cols.map((k) => `${k} = ?`).join(", ");
    const values = cols.map((k) => updates[k]);
    db.prepare(`UPDATE alert_rules SET ${setClauses} WHERE id = ?`).run(...values, id);

    const updated = db.prepare("SELECT * FROM alert_rules WHERE id = ?").get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v2/europa/alert-rules/:id
router.delete("/alert-rules/:id", (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare("DELETE FROM alert_rules WHERE id = ?").run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: "Regola non trovata" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// ALERT EVENTS — storico alert scattati
// =====================================================================

// GET /api/v2/europa/alert-events?letto=0&limit=50
router.get("/alert-events", (req, res) => {
  try {
    const db = getDb();
    const { letto, asin, limit = 50, offset = 0 } = req.query;
    let where = [];
    let params = [];

    if (letto !== undefined) { where.push("letto = ?"); params.push(letto === "0" ? 0 : 1); }
    if (asin) { where.push("asin = ?"); params.push(asin); }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db.prepare(
      `SELECT ae.*,
        COALESCE(ae.nome,
          (SELECT p.nome FROM prodotti p WHERE p.asin = ae.asin LIMIT 1),
          (SELECT fs.product_name FROM fba_stock fs WHERE fs.asin = ae.asin LIMIT 1),
          (SELECT a.nome FROM accessori a WHERE a.asin_accessorio = ae.asin LIMIT 1),
          (SELECT s.nome_prodotto FROM sfuso s WHERE CAST(s.id AS TEXT) = ae.asin LIMIT 1),
          (SELECT op.nome FROM onestep_prodotti op WHERE op.asin = ae.asin LIMIT 1),
          (SELECT tp.nome FROM topcoat_prodotti tp WHERE tp.asin = ae.asin LIMIT 1)
        ) AS nome
      FROM alert_events ae ${whereClause} ORDER BY ae.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, Number(limit), Number(offset));

    const total = db.prepare(`SELECT COUNT(*) as n FROM alert_events ${whereClause}`).get(...params);
    res.json({ total: total.n, events: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v2/europa/alert-events/:id/letto  — marca come letto
router.patch("/alert-events/:id/letto", (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE alert_events SET letto = 1 WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/europa/alert-events/rigenera-stock
// Scansiona TUTTI i prodotti dei moduli (One Step, Top Coat, custom) e genera
// gli alert STOCK_LOW mancanti per quelli sotto soglia.
// Auto-clear per i prodotti tornati sopra soglia.
router.post("/alert-events/rigenera-stock", (req, res) => {
  try {
    const db = getDb();
    const stats = rigeneraAlertSottoSoglia(db);
    res.json({ ok: true, ...stats });
  } catch (err) {
    logger.error("❌ /alert-events/rigenera-stock:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v2/europa/alert-events/leggi-tutti  — marca tutti come letti
router.patch("/alert-events/leggi-tutti", (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE alert_events SET letto = 1 WHERE letto = 0").run();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// SNAPSHOT / BUY BOX — dati storici
// =====================================================================

// GET /api/v2/europa/catalog-images/:asin — immagini e titoli per paese
router.get("/catalog-images/:asin", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      "SELECT country, marketplace_id, titolo, image_url, image_count FROM product_catalog WHERE asin = ? ORDER BY country"
    ).all(req.params.asin);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/europa/snapshots?asin=XXX
router.get("/snapshots", (req, res) => {
  try {
    const db = getDb();
    const { asin } = req.query;
    if (!asin) return res.status(400).json({ error: "asin obbligatorio" });
    const rows = db.prepare("SELECT * FROM listings_snapshot WHERE asin = ? ORDER BY marketplace_id").all(asin);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/europa/buybox?asin=XXX&marketplace_id=YYY&limit=20
router.get("/buybox", (req, res) => {
  try {
    const db = getDb();
    const { asin, marketplace_id, limit = 20 } = req.query;
    if (!asin) return res.status(400).json({ error: "asin obbligatorio" });
    let where = "WHERE asin = ?";
    let params = [asin];
    if (marketplace_id) { where += " AND marketplace_id = ?"; params.push(marketplace_id); }
    const rows = db.prepare(
      `SELECT * FROM buybox_tracking ${where} ORDER BY checked_at DESC LIMIT ?`
    ).all(...params, Number(limit));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// SYNC MANUALE — aggiorna snapshot e verifica alert per un ASIN
// =====================================================================

// POST /api/v2/europa/sync/:asin
router.post("/sync/:asin", async (req, res) => {
  const { asin } = req.params;
  try {
    const result = await checkAndFireAlerts(asin);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/europa/dashboard/:asin — dati completi per un ASIN
router.get("/dashboard/:asin", async (req, res) => {
  const { asin } = req.params;
  try {
    const db = getDb();

    // Mappa country → marketplaceId (inverso di MP_TO_COUNTRY)
    const COUNTRY_TO_MP = Object.fromEntries(Object.entries(MP_TO_COUNTRY).map(([mp, c]) => [c, mp]));

    const [catalogData, snapshots, stockRows, rules, recentEvents] = await Promise.all([
      getCatalogDetails(asin).catch(() => ({ marketplaces: [] })),
      db.prepare("SELECT * FROM listings_snapshot WHERE asin = ?").all(asin),
      db.prepare("SELECT * FROM fba_stock WHERE asin = ?").all(asin),
      db.prepare("SELECT * FROM alert_rules WHERE asin = ?").all(asin),
      db.prepare(
        "SELECT * FROM alert_events WHERE asin = ? ORDER BY created_at DESC LIMIT 10"
      ).all(asin),
    ]);

    // Mappa per lookup rapido
    const snapshotMap = {};
    for (const s of snapshots) snapshotMap[s.marketplace_id] = s;

    const stockMap = {};
    for (const s of stockRows) {
      const mid = COUNTRY_TO_MP[s.country];
      if (mid) stockMap[mid] = s;
    }

    const marketplaces = catalogData.marketplaces.map(mp => ({
      ...mp,
      snapshot: snapshotMap[mp.marketplaceId] || null,
      stock: stockMap[mp.marketplaceId] || null,
    }));

    res.json({ asin, marketplaces, rules, recentEvents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// CATALOGO — tutti gli ASIN nel DB (da fba_stock)
// =====================================================================

// GET /api/v2/europa/catalogo?search=XXX&limit=N&offset=N
// Restituisce tutti gli ASIN presenti in fba_stock con stock per paese
router.get("/catalogo", (req, res) => {
  try {
    const db = getDb();
    const { search, includeHidden } = req.query;
    const showHidden = includeHidden === "1" || includeHidden === "true";
    const limit  = Math.min(Number(req.query.limit)  || 0, 2000); // 0 = tutto
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const whereParts = [];
    let params = [];
    if (search) {
      whereParts.push("(f.asin LIKE ? OR f.product_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (!showHidden) {
      whereParts.push("f.asin NOT IN (SELECT asin FROM listing_hidden)");
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
    const limitSql = limit > 0 ? ` LIMIT ${limit} OFFSET ${offset}` : "";

    const asins = db.prepare(`
      SELECT
        f.asin,
        COALESCE(
          (SELECT titolo FROM product_catalog WHERE asin = f.asin AND country = 'IT' LIMIT 1),
          (SELECT titolo FROM product_catalog WHERE asin = f.asin LIMIT 1),
          MAX(CASE WHEN f.country = 'IT' THEN f.product_name END),
          MAX(f.product_name)
        ) as product_name,
        (SELECT image_url FROM product_catalog WHERE asin = f.asin AND country = 'IT' LIMIT 1) as image_url,
        COALESCE(MAX(CASE WHEN f.country = 'IT' THEN f.sku END), MAX(f.sku)) as sku,
        COALESCE(
          MAX(CASE WHEN f.country = 'IT' THEN f.quantity END),
          MAX(CASE WHEN f.country NOT IN ('GB') THEN f.quantity END)
        ) as stock_eu_pool,
        MAX(CASE WHEN f.country = 'GB' THEN f.quantity END) as stock_gb,
        MAX(f.updated_at) as updated_at
      FROM fba_stock f
      ${whereClause}
      GROUP BY f.asin
      ORDER BY stock_eu_pool DESC NULLS LAST, f.asin
      ${limitSql}
    `).all(...params);

    const MP_TO_COUNTRY_LOCAL = {
      "APJ6JRA9NG5V4":  "IT", "A13V1IB3VIYZZH": "FR", "A1PA6795UKMFR9":  "DE",
      "A1RKKUPIHCS9HS": "ES", "A1F83G8C2ARO7P":  "GB", "A1805IZSGTT6HS":  "NL",
      "AMEN7PMS3EDWL":  "BE", "A2NODRKZP88ZB9":  "SE", "A1C3SOZRARQ6R3":  "PL",
    };

    // ===== Bulk prefetch: 5 query aggregate al posto di 5*N =====
    const asinList = asins.map(a => a.asin);
    const countriesByAsin = {};
    const prezziByAsin    = {};
    const rulesByAsin     = {}; // { asin: { rulesCount, stockRules } }
    const unreadByAsin    = {};
    let hiddenSet = new Set();

    // Chunk a 900 per restare sotto il limite SQLite (999 parametri)
    function chunk(arr, size) {
      const out = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    }

    for (const group of chunk(asinList, 900)) {
      const ph = group.map(() => "?").join(",");

      // 1) breakdown stock per paese
      const stockRows = db.prepare(`
        SELECT asin, country, quantity, stock_totale, reserved_qty, inbound_receiving, unfulfillable_qty, updated_at
        FROM fba_stock
        WHERE asin IN (${ph})
        ORDER BY CASE country WHEN 'IT' THEN 0 WHEN 'DE' THEN 1 WHEN 'FR' THEN 2 WHEN 'ES' THEN 3 WHEN 'GB' THEN 8 ELSE 4 END
      `).all(...group);
      for (const r of stockRows) {
        (countriesByAsin[r.asin] ||= []).push({
          country: r.country, quantity: r.quantity, stock_totale: r.stock_totale,
          reserved_qty: r.reserved_qty, inbound_receiving: r.inbound_receiving,
          unfulfillable_qty: r.unfulfillable_qty, updated_at: r.updated_at,
        });
      }

      // 2) snapshot prezzi
      const snapshotRows = db.prepare(`
        SELECT asin, marketplace_id, prezzo, currency, buybox_won, stato, snapshot_at
        FROM listings_snapshot
        WHERE prezzo IS NOT NULL AND asin IN (${ph})
      `).all(...group);
      for (const s of snapshotRows) {
        const country = MP_TO_COUNTRY_LOCAL[s.marketplace_id];
        if (!country) continue;
        (prezziByAsin[s.asin] ||= []).push({
          country,
          prezzo: s.prezzo,
          currency: s.currency ?? 'EUR',
          buybox_won: s.buybox_won === 1,
          stato: s.stato,
        });
      }

      // 3) alert_rules: rulesCount + stockRules in un colpo solo
      const ruleRows = db.prepare(`
        SELECT asin, tipo, marketplace_id, soglia
        FROM alert_rules
        WHERE abilitato = 1 AND asin IN (${ph})
      `).all(...group);
      for (const r of ruleRows) {
        const entry = (rulesByAsin[r.asin] ||= { rulesCount: 0, stockRules: [] });
        entry.rulesCount++;
        if (r.tipo === "STOCK_LOW") {
          entry.stockRules.push({ marketplace_id: r.marketplace_id, soglia: r.soglia });
        }
      }

      // 4) alert_events non letti
      const unreadRows = db.prepare(`
        SELECT asin, COUNT(*) AS n
        FROM alert_events
        WHERE letto = 0 AND asin IN (${ph})
        GROUP BY asin
      `).all(...group);
      for (const r of unreadRows) unreadByAsin[r.asin] = r.n;
    }

    // 5) listing hidden (una sola query totale)
    if (showHidden) {
      hiddenSet = new Set(db.prepare("SELECT asin FROM listing_hidden").all().map(x => x.asin));
    }

    const ord = ['IT','DE','FR','ES','NL','BE','SE','PL','GB'];
    const catalogo = asins.map(row => {
      const prezzi = (prezziByAsin[row.asin] ?? []).sort(
        (a, b) => ord.indexOf(a.country) - ord.indexOf(b.country)
      );
      const r = rulesByAsin[row.asin];
      return {
        ...row,
        countries:    countriesByAsin[row.asin] ?? [],
        prezzi,
        stockRules:   r?.stockRules ?? [],
        rulesCount:   r?.rulesCount ?? 0,
        unreadAlerts: unreadByAsin[row.asin] ?? 0,
        hidden:       hiddenSet.has(row.asin),
      };
    });

    res.json(catalogo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/europa/catalogo/hide  body: { asin }
router.post("/catalogo/hide", (req, res) => {
  try {
    const asin = (req.body?.asin || "").trim();
    if (!asin) return res.status(400).json({ error: "asin obbligatorio" });
    getDb().prepare("INSERT OR IGNORE INTO listing_hidden (asin) VALUES (?)").run(asin);
    res.json({ ok: true, asin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/europa/catalogo/unhide  body: { asin }
router.post("/catalogo/unhide", (req, res) => {
  try {
    const asin = (req.body?.asin || "").trim();
    if (!asin) return res.status(400).json({ error: "asin obbligatorio" });
    getDb().prepare("DELETE FROM listing_hidden WHERE asin = ?").run(asin);
    res.json({ ok: true, asin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/europa/catalogo/hidden
router.get("/catalogo/hidden", (req, res) => {
  try {
    const rows = getDb().prepare("SELECT asin, hidden_at FROM listing_hidden ORDER BY hidden_at DESC").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/europa/sync-stock/:asin — solo stock FBA, senza alert
// Utile per popolare il DB velocemente senza fare catalog+pricing
router.post("/sync-stock/:asin", async (req, res) => {
  const { asin } = req.params;
  const log = req.log || console;
  try {
    const db = getDb();
    log.info(`[sync-stock ${asin}] START — chiamata FBA Inventory per 8 marketplace`);

    const stockByMarketplace = await getFBAStockForAsin(asin);
    const okMps = Object.entries(stockByMarketplace).filter(([, v]) => v !== null);
    const nullMps = Object.entries(stockByMarketplace).filter(([, v]) => v === null);
    log.info(`[sync-stock ${asin}] risposta Amazon: ${okMps.length} ok, ${nullMps.length} null`);

    salvaStockNelDB(db, asin, null, stockByMarketplace);

    // Verifica cosa è effettivamente finito in DB (diagnostica bug "stock non mostra")
    const dbRows = db.prepare(
      "SELECT country, quantity, stock_totale FROM fba_stock WHERE asin = ? ORDER BY country"
    ).all(asin);
    log.info(`[sync-stock ${asin}] fba_stock righe dopo salvataggio: ${dbRows.length} — ${dbRows.map(r => `${r.country}:${r.quantity}`).join(", ")}`);

    const saved = okMps.map(([mid, v]) => ({ marketplaceId: mid, country: MP_TO_COUNTRY[mid], ...v }));

    // Restituisco anche lo snapshot DB così il frontend può aggiornarsi senza rifetch completo
    res.json({
      asin,
      saved,
      dbRows,
      warning: dbRows.length === 0 ? "Amazon non ha restituito stock per questo ASIN in nessun marketplace (prodotto mai inviato a FBA? credenziali? 429?)" : undefined,
    });
  } catch (err) {
    log.error(`[sync-stock ${asin}] ERRORE: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Stato del job sync-catalog-info (in memoria)
let catalogInfoJob = { running: false, avviato: false, done: 0, total: 0, aggiornati: 0, errori: 0, error: null };

// GET /api/v2/europa/sync-catalog-info/stato
router.get("/sync-catalog-info/stato", (req, res) => {
  res.json(catalogInfoJob);
});

// POST /api/v2/europa/sync-catalog-info — avvia in background, risponde subito
router.post("/sync-catalog-info", async (req, res) => {
  if (catalogInfoJob.running) {
    return res.json({ avviato: false, messaggio: "Già in corso", stato: catalogInfoJob });
  }

  const db = getDb();
  const total = db.prepare("SELECT COUNT(DISTINCT asin) AS n FROM fba_stock").get()?.n ?? 0;

  catalogInfoJob = { running: true, avviato: true, done: 0, total, aggiornati: 0, errori: 0, error: null };
  res.json({ avviato: true, total });

  setImmediate(async () => {
    setManualSyncActive(true);
    try {
      const { aggiornaProductCatalog } = require("../catalog/catalogInfoSync");
      await aggiornaProductCatalog(catalogInfoJob);
    } catch (err) {
      catalogInfoJob.error = err.message;
    } finally {
      catalogInfoJob.running = false;
      setManualSyncActive(false);
    }
  });
});

// Stato job ledger
let ledgerJob = { running: false, avviato: false, fase: null, righeAggiornate: 0, error: null };

// GET /api/v2/europa/ledger-stock/stato
router.get("/ledger-stock/stato", (req, res) => res.json(ledgerJob));

// POST /api/v2/europa/ledger-stock — avvia in background
router.post("/ledger-stock", (req, res) => {
  if (ledgerJob.running) {
    return res.json({ avviato: false, messaggio: "Già in corso", stato: ledgerJob });
  }
  if (prezziJob.running) {
    return res.json({ avviato: false, messaggio: "Sync prezzi in corso — attendi il termine prima di avviare il Ledger (condividono la stessa quota API Amazon)." });
  }
  ledgerJob = { running: true, avviato: true, fase: "Richiesta report ad Amazon…", righeAggiornate: 0, error: null };
  res.json({ avviato: true });

  setImmediate(async () => {
    setManualSyncActive(true);
    try {
      ledgerJob.fase = "In attesa elaborazione Amazon (5-15 min)…";
      const result = await aggiornaLedgerStock();
      ledgerJob.righeAggiornate = result.righeAggiornate ?? 0;
      ledgerJob.fase = "Completato";
      if (!result.ok) ledgerJob.error = result.error;
    } catch (err) {
      ledgerJob.error = err.message;
      ledgerJob.fase = "Errore";
    } finally {
      ledgerJob.running = false;
      setManualSyncActive(false);
    }
  });
});

// POST /api/v2/europa/import-inventario
router.post("/import-inventario", async (req, res) => {
  setManualSyncActive(true);
  try {
    const risultati = await importaInventarioCompleto();
    const totaleAsins = risultati.reduce((s, r) => s + (r.asins ?? 0), 0);
    const infoPanEu = risultati.find(r => r.info === "panEuNormalizzati");
    res.json({
      ok: true,
      risultati: risultati.filter(r => r.country),
      totaleAsins,
      panEuNormalizzati: infoPanEu?.count ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    setManualSyncActive(false);
  }
});

// POST /api/v2/europa/sync-all
// Aggiorna solo lo stock FBA (efficiente: 1 chiamata per marketplace per tutti gli ASIN)
// poi controlla gli alert solo per gli ASIN con regole attive
router.post("/sync-all", async (req, res) => {
  setManualSyncActive(true);
  try {
    // Fase 1: re-importa stock (efficiente)
    const stockRisultati = await importaInventarioCompleto();
    const totaleAsins = stockRisultati.reduce((s, r) => s + (r.asins ?? 0), 0);

    // Entry speciali (non sono marketplace)
    const infoPanEu = stockRisultati.find(r => r.info === "panEuNormalizzati");
    const soloMarketplace = stockRisultati.filter(r => r.country);

    // Separa marketplace con successo da quelli falliti (per feedback frontend)
    const marketplaceOk      = soloMarketplace.filter(r => !r.error);
    const marketplaceErrori  = soloMarketplace.filter(r =>  r.error)
      .map(r => ({ country: r.country, error: r.error }));

    // Fase 2: alert solo per ASIN con regole attive (di solito pochi)
    const db = getDb();
    const asinsConRegole = db.prepare(
      "SELECT DISTINCT asin FROM alert_rules WHERE abilitato = 1"
    ).all().map(r => r.asin);

    let alertsFired = 0;
    const alertErrori = [];
    for (const asin of asinsConRegole) {
      try {
        const r = await checkAndFireAlerts(asin);
        alertsFired += r.alertsFired?.length ?? 0;
        if (r.error) alertErrori.push({ asin, error: r.error });
      } catch (err) {
        alertErrori.push({ asin, error: err.message });
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    res.json({
      ok: true,
      stockAggiornato: totaleAsins,
      alertChecked: asinsConRegole.length,
      alertsFired,
      marketplaceOk: marketplaceOk.map(r => ({ country: r.country, asins: r.asins, azzerati: r.azzerati ?? 0 })),
      marketplaceErrori,
      alertErrori,
      panEuNormalizzati: infoPanEu?.count ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    setManualSyncActive(false);
  }
});

// =====================================================================
// SYNC PREZZI — aggiorna snapshot prezzi/buybox per TUTTI gli ASIN
// Necessario per i prodotti senza regole alert (sync-all li salta)
// =====================================================================
let prezziJob = { running: false, avviato: false, done: 0, total: 0, aggiornati: 0, error: null };

router.get("/sync-prezzi/stato", (req, res) => res.json(prezziJob));

router.post("/sync-prezzi", (req, res) => {
  if (prezziJob.running) return res.json({ avviato: false, messaggio: "Già in corso", stato: prezziJob });

  const db = getDb();
  const asins = db.prepare("SELECT DISTINCT asin FROM fba_stock ORDER BY asin").all().map(r => r.asin);
  if (!asins.length) return res.json({ avviato: false, messaggio: "Nessun ASIN nel catalogo" });

  prezziJob = { running: true, avviato: true, done: 0, total: asins.length, aggiornati: 0, error: null };
  res.json({ avviato: true, total: asins.length });

  setManualSyncActive(true);
  setImmediate(async () => {
    try {
      for (const asin of asins) {
        try {
          const r = await sincronizzaPrezziAsin(asin);
          if (r.marketplacesChecked > 0) prezziJob.aggiornati++;
        } catch (err) {
          logger.warn(`⚠️ [SyncPrezzi] ASIN ${asin} fallito: ${err.message}`);
        }
        prezziJob.done++;
        if (prezziJob.done % 10 === 0 || prezziJob.done === asins.length)
          logger.info(`💶 [SyncPrezzi] ${prezziJob.done}/${asins.length} ASIN — aggiornati: ${prezziJob.aggiornati}`);
      }
    } catch (err) {
      prezziJob.error = err.message;
    } finally {
      prezziJob.running = false;
      setManualSyncActive(false);
    }
  });
});

// =====================================================================
// LAST SYNC — timestamp ultimo aggiornamento stock / prezzi / immagini
// =====================================================================
router.get("/last-sync", (req, res) => {
  try {
    const db = getDb();
    const safe = (sql) => { try { return db.prepare(sql).get()?.ts ?? null; } catch { return null; } };
    const stock    = safe("SELECT MAX(updated_at) AS ts FROM fba_stock");
    const prezzi   = safe("SELECT MAX(snapshot_at) AS ts FROM listings_snapshot");
    const immagini = safe("SELECT MAX(updated_at) AS ts FROM product_catalog");
    res.json({ stock, prezzi, immagini });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// STATS — panoramica per il menu Europa (valori aggregati, una sola query ciascuno)
// =====================================================================
router.get("/stats", (req, res) => {
  try {
    const db = getDb();

    const asinTotali = db.prepare(
      "SELECT COUNT(DISTINCT asin) AS n FROM fba_stock WHERE asin NOT IN (SELECT asin FROM listing_hidden)"
    ).get()?.n ?? 0;

    // Listing "attivi": presente in listings_snapshot con stato buyable/discoverable o buybox vinta
    let listingAttivi = 0;
    try {
      listingAttivi = db.prepare(`
        SELECT COUNT(DISTINCT asin) AS n FROM listings_snapshot
        WHERE (UPPER(COALESCE(stato,'')) IN ('BUYABLE','DISCOVERABLE')) OR buybox_won = 1
      `).get()?.n ?? 0;
    } catch (_) { /* listings_snapshot non popolata */ }

    // Marketplace con almeno un ASIN con stock > 0
    const marketplaceAttivi = db.prepare(
      "SELECT COUNT(DISTINCT country) AS n FROM fba_stock WHERE quantity > 0"
    ).get()?.n ?? 0;

    // Feedback recenti 30gg (se la tabella esiste)
    let feedbackRecenti = 0;
    try {
      feedbackRecenti = db.prepare(
        "SELECT COUNT(*) AS n FROM seller_feedback WHERE date >= date('now','-30 day')"
      ).get()?.n ?? 0;
    } catch (_) { /* tabella inesistente */ }

    // Alert non letti (tutta l'app, non solo Europa)
    let alertNonLetti = 0;
    try {
      alertNonLetti = db.prepare("SELECT COUNT(*) AS n FROM alert_events WHERE letto = 0").get()?.n ?? 0;
    } catch (_) {}

    res.json({ asinTotali, listingAttivi, marketplaceAttivi, feedbackRecenti, alertNonLetti });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// FX RATES — tassi di cambio verso EUR (cache 24h, fonte Frankfurter/ECB)
// =====================================================================
router.get("/fx-rates", async (req, res) => {
  try {
    const force = req.query.refresh === "1" || req.query.refresh === "true";
    const result = await getFxRates({ forceRefresh: force });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
