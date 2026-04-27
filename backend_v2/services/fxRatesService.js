// backend_v2/services/fxRatesService.js
// Tassi di cambio verso EUR, cached in DB per 24h.
// Source: Frankfurter (wrapper ECB, gratuito, no key). Fallback a valori statici.

const https = require("https");
const { getDb } = require("../db/database");
const logger = require("../utils/logger");

// Valute usate dai marketplace EU: GBP, PLN, SEK (EUR è la base).
// I fallback sono aggiornati a inizio 2026; sovrascritti dal fetch ECB quando disponibile.
const FALLBACK = { EUR: 1, GBP: 1.17, PLN: 0.23, SEK: 0.087 };
const TTL_MS = 24 * 60 * 60 * 1000; // 24 ore

let memCache = null; // { rates, fetchedAt }

let _tableEnsured = false;
function ensureTable() {
  if (_tableEnsured) return;
  const db = getDb();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS fx_rates_cache (
      id         INTEGER PRIMARY KEY CHECK (id = 1),
      rates_json TEXT    NOT NULL,
      fetched_at TEXT    NOT NULL
    )
  `).run();
  _tableEnsured = true;
}

function loadFromDb() {
  try {
    ensureTable();
    const row = getDb().prepare("SELECT rates_json, fetched_at FROM fx_rates_cache WHERE id = 1").get();
    if (!row) return null;
    return { rates: JSON.parse(row.rates_json), fetchedAt: row.fetched_at };
  } catch (err) {
    logger.warn({ err: err.message }, "fxRatesService: load DB cache");
    return null;
  }
}

function saveToDb(rates) {
  try {
    ensureTable();
    const now = new Date().toISOString();
    getDb().prepare(`
      INSERT INTO fx_rates_cache (id, rates_json, fetched_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        rates_json = excluded.rates_json,
        fetched_at = excluded.fetched_at
    `).run(JSON.stringify(rates), now);
  } catch (err) {
    logger.warn({ err: err.message }, "fxRatesService: save DB cache");
  }
}

function fetchFromECB() {
  return new Promise((resolve, reject) => {
    // Frankfurter ritorna tassi con base EUR: { rates: { GBP: 0.85, ... } }
    // Invertiamo per avere "quanti EUR = 1 unità valuta": 1/0.85 = 1.17
    const req = https.get(
      "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=GBP,PLN,SEK",
      { timeout: 5000 },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`ECB HTTP ${res.statusCode}`));
        }
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const raw = json.rates || {};
            const out = { EUR: 1 };
            for (const [cur, rateVsEur] of Object.entries(raw)) {
              if (rateVsEur > 0) out[cur] = 1 / rateVsEur;
            }
            resolve(out);
          } catch (err) { reject(err); }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error("ECB timeout")); });
  });
}

// Restituisce { rates, fetchedAt, stale } dove stale=true se cache > TTL (e il refresh non è andato).
async function getRates({ forceRefresh = false } = {}) {
  // 1) memcache fresca
  if (!forceRefresh && memCache && (Date.now() - new Date(memCache.fetchedAt).getTime()) < TTL_MS) {
    return { ...memCache, stale: false, source: "memory" };
  }

  // 2) DB cache fresca
  if (!forceRefresh) {
    const dbCache = loadFromDb();
    if (dbCache && (Date.now() - new Date(dbCache.fetchedAt).getTime()) < TTL_MS) {
      memCache = dbCache;
      return { ...dbCache, stale: false, source: "db" };
    }
  }

  // 3) Fetch live
  try {
    const rates = await fetchFromECB();
    const fetchedAt = new Date().toISOString();
    memCache = { rates, fetchedAt };
    saveToDb(rates);
    return { rates, fetchedAt, stale: false, source: "live" };
  } catch (err) {
    logger.warn({ err: err.message }, "fxRatesService: ECB fetch fallito, uso cache stantio o fallback");
    // 4) Fallback a DB anche se stantio
    const dbCache = loadFromDb();
    if (dbCache) {
      memCache = dbCache;
      return { ...dbCache, stale: true, source: "db-stale" };
    }
    // 5) Ultimo resort: hardcoded
    return { rates: FALLBACK, fetchedAt: null, stale: true, source: "fallback" };
  }
}

module.exports = { getRates, FALLBACK };
