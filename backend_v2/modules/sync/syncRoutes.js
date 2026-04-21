// backend_v2/modules/sync/syncRoutes.js
// Centro sincronizzazioni — endpoint unificato per stato e trigger di tutti i sync
const express = require("express");
const router = express.Router();
const logger = require("../../utils/logger");
const { getDb } = require("../../db/database");

// ── Registry di tutti i sync disponibili ──────────────────
const SYNCS = [
  // === Amazon — Inventario ===
  {
    id: "stock-fba",
    nome: "Stock FBA",
    descrizione: "Inventario FBA da report Amazon (quantità per ASIN×paese)",
    categoria: "Inventario Amazon",
    cron: "Ogni 3 ore (:10)",
    endpoint: "/api/v2/reports-amazon/fba-stock/update",
    trigger: async () => {
      const { aggiornaFBAStock } = require("../reports/fbaStockService");
      return aggiornaFBAStock();
    },
  },
  {
    id: "stock-ledger",
    nome: "Stock per Paese (Ledger)",
    descrizione: "Stock FBA suddiviso per magazzino/paese via Ledger Report",
    categoria: "Inventario Amazon",
    cron: null,
    endpoint: "/api/v2/europa/ledger-stock",
    trigger: async () => {
      const { aggiornaLedgerStock } = require("../reports/ledgerStockService");
      return aggiornaLedgerStock();
    },
  },

  // === Amazon — Prezzi e Listing ===
  {
    id: "prezzi-buybox",
    nome: "Prezzi + BuyBox",
    descrizione: "Prezzi di vendita e stato BuyBox per ogni ASIN nei marketplace EU",
    categoria: "Prezzi e Listing",
    cron: "Ogni 3 ore (:30)",
    endpoint: "/api/v2/europa/sync-prezzi",
    trigger: async () => {
      const { getDb } = require("../../db/database");
      const { sincronizzaPrezziAsin } = require("../catalog/catalogAmazonService");
      const db = getDb();
      const asins = db.prepare("SELECT DISTINCT asin FROM fba_stock WHERE asin IS NOT NULL AND asin != ''").all().map(r => r.asin);
      let aggiornati = 0, errori = 0;
      for (let i = 0; i < asins.length; i++) {
        try {
          // Timeout 15s per ASIN — evita blocchi
          await Promise.race([
            sincronizzaPrezziAsin(asins[i]),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 15000)),
          ]);
          aggiornati++;
        } catch (err) {
          errori++;
          if (err.response?.status === 429) {
            logger.warn(`Prezzi: rate limit su ASIN ${asins[i]}, pausa 30s`);
            await new Promise(r => setTimeout(r, 30000));
          }
        }
        if ((i + 1) % 50 === 0) logger.info(`Prezzi: ${i + 1}/${asins.length} (${aggiornati} ok, ${errori} err)`);
        await new Promise(r => setTimeout(r, 1500));
      }
      return { ok: true, aggiornati, errori, totale: asins.length };
    },
  },
  {
    id: "catalogo-info",
    nome: "Catalogo (Titoli + Immagini)",
    descrizione: "Titolo, immagine principale e info catalogo per ogni ASIN da Catalog API",
    categoria: "Prezzi e Listing",
    cron: "Domenica alle 02:00",
    endpoint: "/api/v2/reports-amazon/sync-catalog-info",
    trigger: async () => {
      const { aggiornaProductCatalog } = require("../catalog/catalogInfoSync");
      return aggiornaProductCatalog({});
    },
  },
  {
    id: "listing-cache",
    nome: "Cache Listing (per paese)",
    descrizione: "Dati listing completi per ogni marketplace — usati dall'editor listing",
    categoria: "Prezzi e Listing",
    cron: "Domenica alle 03:00",
    endpoint: "/api/v2/listings-editor/sync",
    trigger: null, // richiede country param, non triggerabile in blocco da qui
  },

  // === Amazon — Vendite e Fee ===
  {
    id: "sales-traffic",
    nome: "Vendite & Traffico",
    descrizione: "Report vendite e traffico per ASIN (aggregato 365gg) + daily per paese",
    categoria: "Vendite e Analisi",
    cron: "Giornaliero alle 06:30",
    endpoint: "/api/v2/reports-amazon/sales-traffic/update",
    trigger: async () => {
      const { aggiornaSalesTraffic } = require("../reports/salesTrafficService");
      return aggiornaSalesTraffic();
    },
  },
  {
    id: "fba-fees",
    nome: "Commissioni FBA",
    descrizione: "Stima referral fee (15%) + fulfillment fee (€3.20) per ASIN×paese",
    categoria: "Vendite e Analisi",
    cron: "Giornaliero alle 05:00",
    endpoint: "/api/v2/reports-amazon/fba-fees/update",
    trigger: async () => {
      const { aggiornaFBAFees } = require("../reports/fbaFeesService");
      return aggiornaFBAFees();
    },
  },

  // === Amazon — Alert e Feedback ===
  {
    id: "alert-check",
    nome: "Controllo Alert",
    descrizione: "Valuta le regole alert su stock, prezzi e BuyBox — genera alert_events",
    categoria: "Alert e Feedback",
    cron: "Ogni 3 ore (:50)",
    endpoint: "/api/v2/europa/check-alerts",
    trigger: async () => {
      const { runAlertCycle } = require("../europa/alertEngine");
      return runAlertCycle();
    },
  },
  {
    id: "feedback-all",
    nome: "Seller Feedback (tutti i marketplace)",
    descrizione: "Sincronizza le recensioni venditore da tutti i marketplace EU",
    categoria: "Alert e Feedback",
    cron: null,
    endpoint: "/api/v2/feedback/sync-all",
    trigger: async () => {
      // Deleghiamo al fetch dell'endpoint perché ha logica complessa
      return { ok: true, message: "Usa il pulsante dedicato nella pagina Feedback" };
    },
  },
  {
    id: "competitor-snapshot",
    nome: "Competitor Watch",
    descrizione: "Conta prodotti per keyword nelle tue categorie + salva top 20 competitor",
    categoria: "Alert e Feedback",
    cron: "Giornaliero alle 08:00",
    endpoint: "/api/v2/competitor/snapshot",
    trigger: async () => {
      const { runCategorySnapshot } = require("../competitor/competitorService");
      return runCategorySnapshot();
    },
  },
  {
    id: "resi-fba",
    nome: "Resi FBA",
    descrizione: "Importa report resi clienti da Amazon FBA",
    categoria: "Alert e Feedback",
    cron: null,
    endpoint: "/api/v2/returns/sync",
    trigger: async () => {
      const { syncReturns } = require("../returns/returnsService");
      return syncReturns({});
    },
  },
];

// ── Stato runtime (in-memory) ─────────────────────────────
// Traccia sync attualmente in esecuzione con ora di avvio
const runningMap = new Map(); // syncId → { startedAt: Date }

// ── Tabella per tracciare ultimo run ──────────────────────
function ensureSyncLogTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_log (
      sync_id TEXT PRIMARY KEY,
      last_run TEXT,
      last_status TEXT DEFAULT 'ok',
      last_message TEXT DEFAULT '',
      run_count INTEGER DEFAULT 0
    )
  `);
}

function getLastRun(syncId) {
  try {
    const db = getDb();
    return db.prepare("SELECT * FROM sync_log WHERE sync_id = ?").get(syncId) || null;
  } catch { return null; }
}

function logSyncRun(syncId, status, message) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO sync_log (sync_id, last_run, last_status, last_message, run_count)
      VALUES (?, datetime('now','localtime'), ?, ?, 1)
      ON CONFLICT(sync_id) DO UPDATE SET
        last_run = datetime('now','localtime'),
        last_status = excluded.last_status,
        last_message = excluded.last_message,
        run_count = run_count + 1
    `).run(syncId, status, message || "");
  } catch {}
}

// ── GET /api/v2/sync/status ──────────────────────────────
router.get("/status", (req, res) => {
  ensureSyncLogTable();
  const result = SYNCS.map(s => {
    const log = getLastRun(s.id);
    const rt = runningMap.get(s.id);
    return {
      id: s.id,
      nome: s.nome,
      descrizione: s.descrizione,
      categoria: s.categoria,
      cron: s.cron,
      triggerabile: !!s.trigger,
      running: !!rt,
      elapsed_seconds: rt ? Math.round((Date.now() - rt.startedAt) / 1000) : 0,
      ultimo_run: log?.last_run || null,
      ultimo_status: log?.last_status || null,
      ultimo_messaggio: log?.last_message || null,
      run_count: log?.run_count || 0,
    };
  });
  res.json({ ok: true, syncs: result });
});

// ── POST /api/v2/sync/trigger/:id ────────────────────────
router.post("/trigger/:id", async (req, res) => {
  ensureSyncLogTable();
  const sync = SYNCS.find(s => s.id === req.params.id);
  if (!sync) return res.status(404).json({ ok: false, error: "Sync non trovato" });
  if (!sync.trigger) return res.status(400).json({ ok: false, error: "Questo sync non è triggerabile da qui" });

  if (runningMap.has(sync.id)) {
    return res.json({ ok: false, error: `${sync.nome} è già in esecuzione` });
  }

  runningMap.set(sync.id, { startedAt: Date.now() });
  res.json({ ok: true, message: `${sync.nome} avviato in background` });

  setImmediate(async () => {
    try {
      const result = await sync.trigger();
      logSyncRun(sync.id, "ok", JSON.stringify(result)?.slice(0, 200));
      logger.info({ syncId: sync.id, result }, `Sync ${sync.nome} completato`);
    } catch (err) {
      logSyncRun(sync.id, "error", err.message?.slice(0, 200));
      logger.error({ err, syncId: sync.id }, `Sync ${sync.nome} fallito`);
    } finally {
      runningMap.delete(sync.id);
    }
  });
});

module.exports = router;
