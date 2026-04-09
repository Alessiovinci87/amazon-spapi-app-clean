// backend_v2/modules/europa/europaRoutes.js
// Rotte per la sezione Europa: alert rules CRUD, alert events, sync manuale

const express = require("express");
const { getDb } = require("../../db/database");
const { getCatalogDetails, getCatalogInfoPerMarketplace, sincronizzaPrezziAsin } = require("../catalog/catalogAmazonService");
const { aggiornaLedgerStock } = require("../reports/ledgerStockService");
const { checkAndFireAlerts, getFBAStockForAsin, salvaStockNelDB, MP_TO_COUNTRY, importaInventarioCompleto, runAlertCycle } = require("./alertEngine");
const { setManualSyncActive } = require("./alertCron");
const { rigeneraAlertSottoSoglia } = require("../../services/stockAlerts.service");

const router = express.Router();

// Aggiunge image_count a product_catalog se non esiste (gestisce installazioni precedenti)
// Eseguito al primo request, non al caricamento del modulo (DB non ancora pronto al load)
let _imageCountColChecked = false;
router.use((req, res, next) => {
  if (!_imageCountColChecked) {
    _imageCountColChecked = true;
    try { getDb().exec("ALTER TABLE product_catalog ADD COLUMN image_count INTEGER DEFAULT 0"); } catch {}
  }
  next();
});

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
    const TIPI_VALIDI = ["STOCK_LOW", "BUYBOX_LOST", "LISTING_CHANGED"];
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

    if (!Object.keys(updates).length) return res.status(400).json({ error: "Nessun campo da aggiornare" });

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    db.prepare(`UPDATE alert_rules SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), id);

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
      `SELECT * FROM alert_events ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
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
    console.error("❌ /alert-events/rigenera-stock:", err);
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

// GET /api/v2/europa/catalogo?search=XXX
// Restituisce tutti gli ASIN presenti in fba_stock con stock per paese
router.get("/catalogo", (req, res) => {
  try {
    const db = getDb();
    const { search } = req.query;

    let whereClause = "";
    let params = [];
    if (search) {
      whereClause = "WHERE f.asin LIKE ? OR f.product_name LIKE ?";
      params = [`%${search}%`, `%${search}%`];
    }

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
    `).all(...params);

    const MP_TO_COUNTRY_LOCAL = {
      "APJ6JRA9NG5V4":  "IT", "A13V1IB3VIYZZH": "FR", "A1PA6795UKMFR9":  "DE",
      "A1RKKUPIHCS9HS": "ES", "A1F83G8C2ARO7P":  "GB", "A1805IZSGTT6HS":  "NL",
      "AMEN7PMS3EDWL":  "BE", "A2NODRKZP88ZB9":  "SE", "A1C3SOZRARQ6R3":  "PL",
    };

    // Per ogni ASIN aggiungi breakdown per paese e info snapshot/rules
    const catalogo = asins.map(row => {
      const countries = db.prepare(
        "SELECT country, quantity, stock_totale, reserved_qty, inbound_receiving, unfulfillable_qty, updated_at FROM fba_stock WHERE asin = ? ORDER BY CASE country WHEN 'IT' THEN 0 WHEN 'DE' THEN 1 WHEN 'FR' THEN 2 WHEN 'ES' THEN 3 WHEN 'GB' THEN 8 ELSE 4 END"
      ).all(row.asin);

      const snapshotRows = db.prepare(
        "SELECT marketplace_id, prezzo, currency, buybox_won, stato, snapshot_at FROM listings_snapshot WHERE asin = ? AND prezzo IS NOT NULL"
      ).all(row.asin);

      const prezzi = snapshotRows
        .map(s => ({
          country:    MP_TO_COUNTRY_LOCAL[s.marketplace_id] ?? null,
          prezzo:     s.prezzo,
          currency:   s.currency ?? 'EUR',
          buybox_won: s.buybox_won === 1,
          stato:      s.stato,
        }))
        .filter(s => s.country)
        .sort((a, b) => {
          const ord = ['IT','DE','FR','ES','NL','BE','SE','PL','GB'];
          return ord.indexOf(a.country) - ord.indexOf(b.country);
        });

      const rulesCount = db.prepare(
        "SELECT COUNT(*) as n FROM alert_rules WHERE asin = ? AND abilitato = 1"
      ).get(row.asin)?.n ?? 0;

      const unreadAlerts = db.prepare(
        "SELECT COUNT(*) as n FROM alert_events WHERE asin = ? AND letto = 0"
      ).get(row.asin)?.n ?? 0;

      const stockRules = db.prepare(
        "SELECT marketplace_id, soglia FROM alert_rules WHERE asin = ? AND tipo = 'STOCK_LOW' AND abilitato = 1"
      ).all(row.asin);

      return { ...row, countries, prezzi, stockRules, rulesCount, unreadAlerts };
    });

    res.json(catalogo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/europa/sync-stock/:asin — solo stock FBA, senza alert
// Utile per popolare il DB velocemente senza fare catalog+pricing
router.post("/sync-stock/:asin", async (req, res) => {
  const { asin } = req.params;
  try {
    const db = getDb();
    const stockByMarketplace = await getFBAStockForAsin(asin);
    salvaStockNelDB(db, asin, null, stockByMarketplace);
    const saved = Object.entries(stockByMarketplace)
      .filter(([, v]) => v !== null)
      .map(([mid, v]) => ({ marketplaceId: mid, country: MP_TO_COUNTRY[mid], ...v }));
    res.json({ asin, saved });
  } catch (err) {
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
  const asins = db.prepare("SELECT DISTINCT asin FROM fba_stock ORDER BY asin").all().map(r => r.asin);

  catalogInfoJob = { running: true, avviato: true, done: 0, total: asins.length, aggiornati: 0, errori: 0, error: null };
  res.json({ avviato: true, total: asins.length });

  // Processo in background (non blocca la risposta HTTP)
  setImmediate(async () => {
    setManualSyncActive(true);
    try {
      const { getAccessToken } = require("../auth/authService");
      const { access_token } = await getAccessToken();

      // Marketplace da usare per le immagini
      const MARKETPLACES_CATALOG = [
        { marketplaceId: "APJ6JRA9NG5V4",  country: "IT" },
        { marketplaceId: "A13V1IB3VIYZZH", country: "FR" },
        { marketplaceId: "A1PA6795UKMFR9",  country: "DE" },
        { marketplaceId: "A1RKKUPIHCS9HS",  country: "ES" },
        { marketplaceId: "A1F83G8C2ARO7P",  country: "GB" },
        { marketplaceId: "A1805IZSGTT6HS",  country: "NL" },
        { marketplaceId: "AMEN7PMS3EDWL",   country: "BE" },
        { marketplaceId: "A1C3SOZRARQ6R3",  country: "PL" },
      ];

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
        const infos = await getCatalogInfoPerMarketplace(asin, access_token, MARKETPLACES_CATALOG);
        const inserisci = db.transaction(() => {
          for (const info of infos) {
            if (info.titolo || info.image_url) {
              stmt.run(asin, info.marketplaceId, info.country, info.titolo, info.image_url, info.image_count ?? 0);
            }
          }
        });
        inserisci();
        catalogInfoJob.aggiornati += infos.filter(i => i.titolo || i.image_url).length;
        catalogInfoJob.done++;
        // pausa tra ASIN (le pause tra marketplace sono già in getCatalogInfoPerMarketplace)
        await new Promise(r => setTimeout(r, 500));
      }
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
    res.json({ ok: true, risultati, totaleAsins });
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

    // Fase 2: alert solo per ASIN con regole attive (di solito pochi)
    const db = getDb();
    const asinsConRegole = db.prepare(
      "SELECT DISTINCT asin FROM alert_rules WHERE abilitato = 1"
    ).all().map(r => r.asin);

    let alertsFired = 0;
    for (const asin of asinsConRegole) {
      try {
        const r = await checkAndFireAlerts(asin);
        alertsFired += r.alertsFired?.length ?? 0;
      } catch { /* skip */ }
      await new Promise(r => setTimeout(r, 2000));
    }

    res.json({ ok: true, stockAggiornato: totaleAsins, alertChecked: asinsConRegole.length, alertsFired });
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
          console.warn(`⚠️ [SyncPrezzi] ASIN ${asin} fallito: ${err.message}`);
        }
        prezziJob.done++;
        if (prezziJob.done % 10 === 0 || prezziJob.done === asins.length)
          console.log(`💶 [SyncPrezzi] ${prezziJob.done}/${asins.length} ASIN — aggiornati: ${prezziJob.aggiornati}`);
      }
    } catch (err) {
      prezziJob.error = err.message;
    } finally {
      prezziJob.running = false;
      setManualSyncActive(false);
    }
  });
});

module.exports = router;
