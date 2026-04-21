// backend_v2/modules/competitor/competitorService.js
// Servizio monitoraggio competitor: conteggio prodotti per keyword + tracking ASIN competitor
const axios = require("axios");
const { getAccessToken } = require("../auth/authService");
const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";

const MARKETPLACE_IDS = {
  IT: "APJ6JRA9NG5V4",
  FR: "A13V1IB3VIYZZH",
  ES: "A1RKKUPIHCS9HS",
  DE: "A1PA6795UKMFR9",
  UK: "A1F83G8C2ARO7P",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Tabelle ──────────────────────────────────────────────
function ensureTables() {
  const db = getDb();

  // Keyword da monitorare (configurate dall'utente)
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitor_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      category_id TEXT DEFAULT '',
      marketplace TEXT NOT NULL DEFAULT 'IT',
      attivo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  try { db.exec("ALTER TABLE competitor_keywords ADD COLUMN category_id TEXT DEFAULT ''"); } catch {}

  // Snapshot giornaliero: quanti prodotti per keyword
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitor_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(keyword_id, date),
      FOREIGN KEY (keyword_id) REFERENCES competitor_keywords(id) ON DELETE CASCADE
    )
  `);

  // ASIN competitor tracciati (top N per keyword)
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitor_asins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asin TEXT NOT NULL,
      marketplace TEXT NOT NULL DEFAULT 'IT',
      brand TEXT DEFAULT '',
      titolo TEXT DEFAULT '',
      prezzo REAL DEFAULT 0,
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      bsr INTEGER DEFAULT 0,
      posizione INTEGER DEFAULT 0,
      keyword_source TEXT DEFAULT '',
      attivo INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(asin, marketplace, keyword_source)
    )
  `);
  try { db.exec("ALTER TABLE competitor_asins ADD COLUMN posizione INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE competitor_asins ADD COLUMN keyword_source TEXT DEFAULT ''"); } catch {}
  // Garantisce il vincolo UNIQUE su (asin, marketplace, keyword_source) anche per tabelle preesistenti
  try {
    db.exec(`DELETE FROM competitor_asins WHERE id NOT IN (
      SELECT MAX(id) FROM competitor_asins GROUP BY asin, marketplace, COALESCE(keyword_source, '')
    )`);
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_competitor_asins_akw ON competitor_asins(asin, marketplace, keyword_source)");
  } catch (e) { /* indice già presente o tabella nuova */ }
  // Cleanup righe con posizione = 0 (create prima del fix schema)
  try { db.exec("DELETE FROM competitor_asins WHERE posizione = 0 OR posizione IS NULL"); } catch {}

  // Storico prezzo/BSR/recensioni degli ASIN tracciati
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitor_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asin TEXT NOT NULL,
      marketplace TEXT NOT NULL,
      date TEXT NOT NULL,
      prezzo REAL DEFAULT 0,
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      bsr INTEGER DEFAULT 0,
      UNIQUE(asin, marketplace, date)
    )
  `);

  // ── STORICO COMPETITOR ──────────────────────────────────
  // ASIN tracciati esplicitamente (auto da snapshot top-N + aggiunte manuali)
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitor_tracked_asins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asin TEXT NOT NULL,
      marketplace TEXT NOT NULL DEFAULT 'IT',
      source TEXT NOT NULL DEFAULT 'manual',
      keyword_source TEXT DEFAULT '',
      note TEXT DEFAULT '',
      attivo INTEGER NOT NULL DEFAULT 1,
      first_seen_at TEXT DEFAULT (datetime('now','localtime')),
      last_checked_at TEXT,
      last_status TEXT DEFAULT 'attivo',
      UNIQUE(asin, marketplace)
    )
  `);

  // Snapshot dettagliati per ciascun ASIN tracciato (uno per giorno)
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitor_asin_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asin TEXT NOT NULL,
      marketplace TEXT NOT NULL DEFAULT 'IT',
      date TEXT NOT NULL,
      titolo TEXT DEFAULT '',
      brand TEXT DEFAULT '',
      prezzo REAL,
      currency TEXT DEFAULT '',
      rating REAL,
      review_count INTEGER,
      bsr INTEGER,
      bsr_category TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      bullets TEXT DEFAULT '',
      stato TEXT NOT NULL DEFAULT 'attivo',
      raw_summary TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(asin, marketplace, date)
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_competitor_snap_asin ON competitor_asin_snapshots(asin, marketplace, date DESC)");
  // Prime/FBA/handling (aggiunti in fase 2 - ALTER per tabelle preesistenti)
  try { db.exec("ALTER TABLE competitor_asin_snapshots ADD COLUMN is_prime INTEGER"); } catch {}
  try { db.exec("ALTER TABLE competitor_asin_snapshots ADD COLUMN is_fba INTEGER"); } catch {}
  try { db.exec("ALTER TABLE competitor_asin_snapshots ADD COLUMN seller_id TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE competitor_asin_snapshots ADD COLUMN handling_min_hours INTEGER"); } catch {}
  try { db.exec("ALTER TABLE competitor_asin_snapshots ADD COLUMN handling_max_hours INTEGER"); } catch {}

  // Modifiche rilevate tra snapshot consecutivi
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitor_asin_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asin TEXT NOT NULL,
      marketplace TEXT NOT NULL DEFAULT 'IT',
      date TEXT NOT NULL,
      change_type TEXT NOT NULL,
      field TEXT DEFAULT '',
      old_value TEXT DEFAULT '',
      new_value TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_competitor_changes_date ON competitor_asin_changes(date DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_competitor_changes_asin ON competitor_asin_changes(asin, marketplace, date DESC)");

  // ── MAPPING MIO ASIN ↔ KEYWORD COMPETITOR ───────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitor_my_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      my_asin TEXT NOT NULL,
      marketplace TEXT NOT NULL DEFAULT 'IT',
      keyword_source TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(my_asin, marketplace, keyword_source)
    )
  `);
}

// ── Catalog API: cerca keyword e restituisce count + top items ──
// keyword e categoryId sono entrambi opzionali, ma almeno uno deve essere presente
async function searchCategory(keyword = "", marketplace = "IT", pageSize = 20, categoryId = "") {
  const marketplaceId = MARKETPLACE_IDS[marketplace];
  if (!marketplaceId) throw new Error(`Marketplace ${marketplace} non supportato`);

  const kw = (keyword || "").trim();
  const cat = (categoryId || "").trim();
  if (!kw) {
    // La Catalog API SP-API richiede sempre keywords (o identifiers). classificationIds è SOLO un filtro additivo.
    const err = new Error("Inserisci sempre una keyword. La categoria serve solo a restringere i risultati, non può essere usata da sola.");
    err.statusCode = 400;
    throw err;
  }
  if (cat && !/^\d+$/.test(cat)) {
    const err = new Error(`Categoria ID deve essere un browse node numerico Amazon (es. 3762161), ricevuto: "${cat}"`);
    err.statusCode = 400;
    throw err;
  }

  const { access_token } = await getAccessToken();

  const params = {
    marketplaceIds: marketplaceId,
    pageSize: Math.min(pageSize, 20),
    includedData: "summaries",
  };
  if (kw) params.keywords = kw;
  if (cat) params.classificationIds = cat;

  const res = await axios.get(`${BASE_URL}/catalog/2022-04-01/items`, {
    params,
    headers: { "x-amz-access-token": access_token },
  });

  const items = (res.data?.items || []).map((item, index) => {
    const s = item.summaries?.[0] || {};
    return {
      asin: item.asin,
      brand: s.brand || "",
      titolo: (s.itemName || "").slice(0, 250),
      posizione: index + 1,
    };
  });

  return {
    count: res.data?.numberOfResults || 0,
    items,
    hasMore: !!res.data?.pagination?.nextToken,
  };
}

// ── Sfoglia categoria (workaround SP-API) ──────────────────
// Amazon SP-API richiede sempre 'keywords'. Lanciamo multi-query con keyword comuni nei titoli
// e aggreghiamo i risultati per coprire al meglio la categoria.
const KEYWORDS_NEUTRE = ["set", "kit", "pro", "new", "premium"];

async function exploreCategoria(categoryId, marketplace = "IT", pageSize = 20) {
  const cat = String(categoryId || "").trim();
  if (!/^\d+$/.test(cat)) {
    const err = new Error("Categoria ID deve essere un browse node numerico");
    err.statusCode = 400;
    throw err;
  }

  const aggregati = new Map(); // asin → { ...item, posMin: N, hits: M }
  let totalCount = 0;
  const usate = [];

  for (const kw of KEYWORDS_NEUTRE) {
    try {
      const r = await searchCategory(kw, marketplace, pageSize, cat);
      if (r.count > totalCount) totalCount = r.count;
      usate.push({ kw, items: r.items.length });
      for (const item of r.items) {
        const ex = aggregati.get(item.asin);
        if (ex) {
          ex.posMin = Math.min(ex.posMin, item.posizione);
          ex.hits++;
        } else {
          aggregati.set(item.asin, { ...item, posMin: item.posizione, hits: 1 });
        }
      }
    } catch (e) {
      logger.warn(`[Competitor] explore "${kw}" cat=${cat}: ${e.message}`);
    }
    await sleep(900);
  }

  // Ordina: prima quelli che compaiono in più query, poi posizione minima
  const items = [...aggregati.values()]
    .sort((a, b) => b.hits - a.hits || a.posMin - b.posMin)
    .slice(0, pageSize)
    .map((it, i) => ({ asin: it.asin, brand: it.brand, titolo: it.titolo, posizione: i + 1, hits: it.hits }));

  return {
    count: totalCount,
    items,
    keywords_usate: usate,
    note: `Aggregati ${aggregati.size} ASIN univoci da ${KEYWORDS_NEUTRE.length} query con keyword neutre.`,
  };
}

// Snapshot di una SINGOLA keyword (per popolarla subito dopo l'aggiunta)
async function snapshotSingleKeyword(keywordId) {
  ensureTables();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const kw = db.prepare("SELECT * FROM competitor_keywords WHERE id = ?").get(keywordId);
  if (!kw) return { ok: false, error: "Keyword non trovata" };

  try {
    const result = await searchCategory(kw.keyword, kw.marketplace, 20, kw.category_id || "");

    db.prepare(`
      INSERT INTO competitor_snapshots (keyword_id, date, count) VALUES (?, ?, ?)
      ON CONFLICT(keyword_id, date) DO UPDATE SET count = excluded.count
    `).run(kw.id, today, result.count);

    const upsert = db.prepare(`
      INSERT INTO competitor_asins (asin, marketplace, brand, titolo, posizione, keyword_source, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
      ON CONFLICT(asin, marketplace, keyword_source) DO UPDATE SET
        brand = excluded.brand, titolo = excluded.titolo,
        posizione = excluded.posizione, updated_at = datetime('now','localtime')
    `);
    for (const item of result.items) {
      upsert.run(item.asin, kw.marketplace, item.brand, item.titolo, item.posizione, kw.keyword);
    }

    // Auto-track + snapshot iniziali in background (non blocca la risposta)
    let nuovi = [];
    try { nuovi = autoTrackTopAsinsFromSnapshot(); } catch {}
    if (nuovi.length > 0) {
      setImmediate(() => {
        captureInitialSnapshots(nuovi).catch(e => logger.warn(`[Competitor] init snap: ${e.message}`));
      });
    }

    return { ok: true, count: result.count, asins: result.items.length, autoTracked: nuovi.length };
  } catch (err) {
    logger.warn(`[Competitor] snapshotSingleKeyword ${kw.keyword}: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ── Snapshot: conta prodotti per tutte le keyword attive ──
async function runCategorySnapshot() {
  ensureTables();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const keywords = db.prepare("SELECT * FROM competitor_keywords WHERE attivo = 1").all();
  if (keywords.length === 0) {
    logger.info("[Competitor] Nessuna keyword da monitorare");
    return { ok: true, count: 0 };
  }

  const upsertSnapshot = db.prepare(`
    INSERT INTO competitor_snapshots (keyword_id, date, count)
    VALUES (?, ?, ?)
    ON CONFLICT(keyword_id, date) DO UPDATE SET count = excluded.count
  `);

  const upsertAsin = db.prepare(`
    INSERT INTO competitor_asins (asin, marketplace, brand, titolo, posizione, keyword_source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(asin, marketplace, keyword_source) DO UPDATE SET
      brand = excluded.brand,
      titolo = excluded.titolo,
      posizione = excluded.posizione,
      updated_at = datetime('now','localtime')
  `);

  let totalSnapshots = 0;
  let totalAsins = 0;

  // Per rilevare new-top-5: snapshot delle posizioni precedenti
  const prevTop5Stmt = db.prepare(
    "SELECT asin FROM competitor_asins WHERE keyword_source = ? AND marketplace = ? AND posizione > 0 AND posizione <= 5 AND attivo = 1"
  );

  for (const kw of keywords) {
    try {
      const labelLog = kw.keyword + (kw.category_id ? ` (cat: ${kw.category_id})` : "");
      logger.info(`[Competitor] Cerco ${labelLog} su ${kw.marketplace}...`);

      // ASIN che erano in top-5 PRIMA dello snapshot
      const oldTop5 = new Set(prevTop5Stmt.all(kw.keyword, kw.marketplace).map(r => r.asin));

      const result = await searchCategory(kw.keyword, kw.marketplace, 20, kw.category_id || "");

      // Salva conteggio
      upsertSnapshot.run(kw.id, today, result.count);
      totalSnapshots++;

      // Salva top ASIN trovati con posizione (keyword_source = etichetta del monitoraggio)
      for (const item of result.items) {
        upsertAsin.run(item.asin, kw.marketplace, item.brand, item.titolo, item.posizione, kw.keyword);
        totalAsins++;
      }

      // Rileva NUOVI ingressi in top-5 (non c'erano prima)
      try {
        const newTop5Items = result.items.filter(it => it.posizione <= 5 && !oldTop5.has(it.asin));
        if (newTop5Items.length > 0 && oldTop5.size > 0) {
          // Solo se avevamo già un baseline (oldTop5 non vuoto = non è la prima scansione)
          emitAlertsNewTop5(kw, newTop5Items);
        }
      } catch (e) { logger.warn(`[Competitor] alert top5 ${kw.keyword}: ${e.message}`); }

      logger.info(`[Competitor] ${labelLog} (${kw.marketplace}): ${result.count} prodotti, ${result.items.length} top ASIN salvati`);
    } catch (err) {
      logger.warn(`[Competitor] Errore su "${kw.keyword}": ${err.message}`);
    }

    await sleep(1000); // rate limit
  }

  // Auto-track ASIN top-N nei trackati (per storico dettagliato)
  let nuoviTracked = [];
  try { nuoviTracked = autoTrackTopAsinsFromSnapshot(); }
  catch (e) { logger.warn(`[Competitor] autoTrack errore: ${e.message}`); }

  logger.info(`[Competitor] Snapshot completato: ${totalSnapshots} keyword, ${totalAsins} ASIN, ${nuoviTracked.length} nuovi tracciati`);

  // Snapshot iniziale per i nuovi (in background per non bloccare la risposta)
  if (nuoviTracked.length > 0) {
    setImmediate(() => {
      captureInitialSnapshots(nuoviTracked).catch(e => logger.warn(`[Competitor] initial snapshots: ${e.message}`));
    });
  }

  return { ok: true, snapshots: totalSnapshots, asins: totalAsins, autoTracked: nuoviTracked.length };
}

// ── CRUD keyword ──
function getKeywords() {
  ensureTables();
  const db = getDb();
  const keywords = db.prepare("SELECT * FROM competitor_keywords ORDER BY created_at DESC").all();

  // Arricchisci con ultimo conteggio e trend
  for (const kw of keywords) {
    const latest = db.prepare(
      "SELECT count, date FROM competitor_snapshots WHERE keyword_id = ? ORDER BY date DESC LIMIT 1"
    ).get(kw.id);
    kw.ultimo_count = latest?.count || null;
    kw.ultimo_date = latest?.date || null;

    // Trend: confronta con 7 giorni fa
    if (latest) {
      const d7ago = new Date(latest.date);
      d7ago.setDate(d7ago.getDate() - 7);
      const prev = db.prepare(
        "SELECT count FROM competitor_snapshots WHERE keyword_id = ? AND date <= ? ORDER BY date DESC LIMIT 1"
      ).get(kw.id, d7ago.toISOString().slice(0, 10));
      kw.count_7gg_fa = prev?.count || null;
      kw.trend_7gg = prev ? latest.count - prev.count : null;
    }
  }

  return keywords;
}

function addKeyword(keyword, marketplace = "IT", categoryId = "") {
  ensureTables();
  const db = getDb();
  const kw = (keyword || "").trim();
  const cat = (categoryId || "").trim();
  if (!kw) {
    return { ok: false, message: "Inserisci una keyword. La categoria è un filtro opzionale che restringe i risultati." };
  }
  if (cat && !/^\d+$/.test(cat)) {
    return { ok: false, message: `Categoria ID deve essere un browse node numerico (es. 3762161). Trovi il numero su Amazon nell'URL della categoria, dopo "node="` };
  }
  const existing = db.prepare(
    "SELECT id FROM competitor_keywords WHERE keyword = ? AND marketplace = ? AND COALESCE(category_id,'') = ?"
  ).get(kw, marketplace, cat);
  if (existing) return { ok: false, message: "Monitoraggio già presente per questa combinazione" };

  const r = db.prepare(
    "INSERT INTO competitor_keywords (keyword, marketplace, category_id) VALUES (?, ?, ?)"
  ).run(kw, marketplace, cat);
  return { ok: true, id: r.lastInsertRowid };
}

function removeKeyword(id) {
  ensureTables();
  const db = getDb();
  db.prepare("DELETE FROM competitor_keywords WHERE id = ?").run(id);
  return { ok: true };
}

function toggleKeyword(id) {
  ensureTables();
  const db = getDb();
  db.prepare("UPDATE competitor_keywords SET attivo = CASE WHEN attivo = 1 THEN 0 ELSE 1 END WHERE id = ?").run(id);
  return { ok: true };
}

// ── Storico snapshot per grafico ──
function getSnapshotHistory(keywordId, days = 90) {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return db.prepare(
    "SELECT date, count FROM competitor_snapshots WHERE keyword_id = ? AND date >= ? ORDER BY date ASC"
  ).all(keywordId, since.toISOString().slice(0, 10));
}

// ── MAPPING mio ASIN ↔ keyword competitor + DASHBOARD CONFRONTO ──
function addMyMapping({ my_asin, marketplace = "IT", keyword_source, note = "" }) {
  ensureTables();
  const db = getDb();
  const a = String(my_asin || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(a)) return { ok: false, message: "ASIN non valido" };
  if (!keyword_source) return { ok: false, message: "Keyword richiesta" };
  try {
    const r = db.prepare(`
      INSERT INTO competitor_my_mappings (my_asin, marketplace, keyword_source, note)
      VALUES (?, ?, ?, ?)
    `).run(a, marketplace, keyword_source, note || "");
    return { ok: true, id: r.lastInsertRowid };
  } catch (e) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return { ok: false, message: "Mapping già presente" };
    throw e;
  }
}

function removeMyMapping(id) {
  ensureTables();
  const db = getDb();
  db.prepare("DELETE FROM competitor_my_mappings WHERE id = ?").run(id);
  return { ok: true };
}

function listMyMappings() {
  ensureTables();
  const db = getDb();
  return db.prepare("SELECT * FROM competitor_my_mappings ORDER BY marketplace, keyword_source, my_asin").all();
}

// Helper: prezzo del MIO ASIN dal listings_snapshot
function getMyPrice(asin, marketplace) {
  const db = getDb();
  const marketplaceId = MARKETPLACE_IDS[marketplace] || "";
  const r = db.prepare(`
    SELECT prezzo, currency, buybox_won, titolo FROM listings_snapshot
    WHERE asin = ? AND marketplace_id = ? LIMIT 1
  `).get(asin, marketplaceId);
  return r || null;
}

// Statistiche competitor su una keyword
function getCompetitorStatsForKeyword(keyword, marketplace) {
  const db = getDb();
  // Prendiamo i top-20 e per ognuno l'ultimo snapshot per prezzo/rating
  const tops = db.prepare(`
    SELECT a.asin, a.posizione, a.titolo, a.brand,
      (SELECT prezzo FROM competitor_asin_snapshots s WHERE s.asin = a.asin AND s.marketplace = a.marketplace ORDER BY date DESC LIMIT 1) AS prezzo,
      (SELECT is_prime FROM competitor_asin_snapshots s WHERE s.asin = a.asin AND s.marketplace = a.marketplace ORDER BY date DESC LIMIT 1) AS is_prime,
      (SELECT is_fba FROM competitor_asin_snapshots s WHERE s.asin = a.asin AND s.marketplace = a.marketplace ORDER BY date DESC LIMIT 1) AS is_fba,
      (SELECT review_count FROM competitor_asin_snapshots s WHERE s.asin = a.asin AND s.marketplace = a.marketplace ORDER BY date DESC LIMIT 1) AS review_count,
      (SELECT rating FROM competitor_asin_snapshots s WHERE s.asin = a.asin AND s.marketplace = a.marketplace ORDER BY date DESC LIMIT 1) AS rating,
      (SELECT bsr FROM competitor_asin_snapshots s WHERE s.asin = a.asin AND s.marketplace = a.marketplace ORDER BY date DESC LIMIT 1) AS bsr,
      (SELECT image_url FROM competitor_asin_snapshots s WHERE s.asin = a.asin AND s.marketplace = a.marketplace ORDER BY date DESC LIMIT 1) AS image_url
    FROM competitor_asins a
    WHERE a.keyword_source = ? AND a.marketplace = ? AND a.attivo = 1 AND a.posizione > 0
    ORDER BY a.posizione ASC
    LIMIT 20
  `).all(keyword, marketplace);

  const conPrezzo = tops.filter(t => t.prezzo != null && t.prezzo > 0);
  const prezzi = conPrezzo.map(t => t.prezzo);
  const conRating = tops.filter(t => t.rating != null);
  const conReview = tops.filter(t => t.review_count != null);
  const conBsr = tops.filter(t => t.bsr != null);

  const avg = (arr) => arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    competitors_count: tops.length,
    with_price: conPrezzo.length,
    price_min: prezzi.length > 0 ? Math.min(...prezzi) : null,
    price_max: prezzi.length > 0 ? Math.max(...prezzi) : null,
    price_avg: prezzi.length > 0 ? +avg(prezzi).toFixed(2) : null,
    price_median: prezzi.length > 0 ? prezzi.slice().sort((a,b)=>a-b)[Math.floor(prezzi.length/2)] : null,
    rating_avg: conRating.length > 0 ? +avg(conRating.map(t => t.rating)).toFixed(2) : null,
    review_avg: conReview.length > 0 ? Math.round(avg(conReview.map(t => t.review_count))) : null,
    review_max: conReview.length > 0 ? Math.max(...conReview.map(t => t.review_count)) : null,
    bsr_avg: conBsr.length > 0 ? Math.round(avg(conBsr.map(t => t.bsr))) : null,
    prime_pct: tops.length > 0 ? Math.round(tops.filter(t => t.is_prime === 1).length / tops.length * 100) : null,
    fba_pct: tops.length > 0 ? Math.round(tops.filter(t => t.is_fba === 1).length / tops.length * 100) : null,
    top10: tops.slice(0, 10).map(t => ({ asin: t.asin, titolo: t.titolo, brand: t.brand, prezzo: t.prezzo, posizione: t.posizione, is_prime: t.is_prime, is_fba: t.is_fba, rating: t.rating, review_count: t.review_count, image_url: t.image_url })),
  };
}

// Dashboard confronto: per ogni mapping ritorna mio prezzo + stats competitor + gap analysis
function getCompetitorComparison() {
  ensureTables();
  const db = getDb();
  const mappings = db.prepare("SELECT * FROM competitor_my_mappings ORDER BY marketplace, keyword_source").all();
  const result = [];
  for (const m of mappings) {
    const my = getMyPrice(m.my_asin, m.marketplace);
    const stats = getCompetitorStatsForKeyword(m.keyword_source, m.marketplace);
    let gap_vs_avg = null, gap_vs_min = null, posizionamento = null;
    if (my?.prezzo != null && stats.price_avg != null) {
      gap_vs_avg = +(((my.prezzo - stats.price_avg) / stats.price_avg) * 100).toFixed(1);
    }
    if (my?.prezzo != null && stats.price_min != null) {
      gap_vs_min = +(((my.prezzo - stats.price_min) / stats.price_min) * 100).toFixed(1);
    }
    if (my?.prezzo != null && stats.with_price > 0) {
      const sotto = (stats.top10 || []).filter(t => t.prezzo != null && t.prezzo < my.prezzo).length;
      posizionamento = `${sotto + 1}° per prezzo nel top-10`;
    }
    result.push({
      mapping: m,
      my: my,
      stats,
      gap_vs_avg,
      gap_vs_min,
      posizionamento,
    });
  }
  return result;
}

// ── Word frequency dai titoli top-N (per insight SEO) ──
const STOPWORDS = new Set([
  // IT
  "il","la","lo","i","gli","le","un","una","uno","di","da","del","della","dello","dei","degli","delle",
  "in","con","su","per","tra","fra","e","o","ma","se","che","chi","cui","si","no","non","è","ho","ha",
  "al","allo","alla","ai","agli","alle","dal","dalla","nel","nella","sul","sulla","col","cui",
  "più","meno","molto","poco","tutto","tutti","tutte","ogni","altro","altri","stesso","stessa",
  "questo","questa","quello","quella","questi","quelli","queste","quelle","mio","tuo","suo",
  // EN
  "the","a","an","of","for","with","and","or","to","in","on","by","at","is","are","be","this","that",
  "from","as","it","its","new","pro","set","kit","best","top","high","quality","premium",
  // brand-fluff comune nei titoli
  "amazon","originale","original","made","made-in","pcs","pz","cm","mm","ml","gr","kg","mg",
]);

function getKeywordWordCloud(keyword, marketplace = "IT", topN = 25) {
  ensureTables();
  const db = getDb();
  const rows = db.prepare(
    "SELECT titolo FROM competitor_asins WHERE keyword_source = ? AND marketplace = ? AND attivo = 1 LIMIT 30"
  ).all(keyword, marketplace);

  const freq = new Map();
  for (const r of rows) {
    const tokens = (r.titolo || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accenti
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
    for (const w of tokens) freq.set(w, (freq.get(w) || 0) + 1);
  }

  const list = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));

  return { ok: true, words: list, source_titoli: rows.length };
}

// ── Top ASIN competitor per keyword ──
// Arricchisce con info Prime/FBA/handling dall'ultimo snapshot dettagliato (se l'ASIN è anche tracciato)
function getCompetitorAsins(keyword, marketplace = "IT") {
  ensureTables();
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM competitor_asins WHERE keyword_source = ? AND marketplace = ? AND attivo = 1 AND posizione > 0 ORDER BY posizione ASC, updated_at DESC"
  ).all(keyword, marketplace);
  const lastSnap = db.prepare(
    "SELECT is_prime, is_fba, handling_max_hours, prezzo, image_url FROM competitor_asin_snapshots WHERE asin = ? AND marketplace = ? ORDER BY date DESC LIMIT 1"
  );
  for (const r of rows) {
    const s = lastSnap.get(r.asin, marketplace);
    if (s) {
      r.is_prime = s.is_prime;
      r.is_fba = s.is_fba;
      r.handling_max_hours = s.handling_max_hours;
      if (s.prezzo != null) r.prezzo = s.prezzo;
      if (s.image_url) r.image_url = s.image_url;
    }
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════
// STORICO COMPETITOR — tracking dettagliato + diff
// ═══════════════════════════════════════════════════════════

// Catalog API: estrae le classifications (browse node) per un ASIN
async function fetchAsinClassifications(asin, marketplace = "IT") {
  const marketplaceId = MARKETPLACE_IDS[marketplace];
  if (!marketplaceId) return [];
  const { access_token } = await getAccessToken();
  try {
    const res = await axios.get(`${BASE_URL}/catalog/2022-04-01/items/${asin}`, {
      params: {
        marketplaceIds: marketplaceId,
        includedData: "classifications",
      },
      headers: { "x-amz-access-token": access_token },
      timeout: 15000,
    });
    const blocks = res.data?.classifications || [];
    const out = [];
    // Ricorsiva: classifications hanno catena parent[].parent[]....
    const walk = (node) => {
      if (!node) return;
      if (node.classificationId && node.displayName) {
        out.push({ id: String(node.classificationId), nome: node.displayName });
      }
      if (node.parent) walk(node.parent);
    };
    for (const b of blocks) {
      for (const c of (b.classifications || [])) walk(c);
    }
    return out;
  } catch (err) {
    if (err.response?.status === 404) return [];
    logger.warn(`[Competitor] classifications ${asin}: ${err.message}`);
    return [];
  }
}

// Discovery: scansiona tutti gli ASIN tracciati e raccoglie i browse node univoci per marketplace
async function discoverCategorieDaTracked() {
  ensureTables();
  const db = getDb();
  const tracked = db.prepare("SELECT asin, marketplace FROM competitor_tracked_asins WHERE attivo = 1").all();
  const trovate = new Map(); // key = `${marketplace}|${id}` → { id, nome, marketplace, count }

  for (const t of tracked) {
    const cls = await fetchAsinClassifications(t.asin, t.marketplace);
    for (const c of cls) {
      const k = `${t.marketplace}|${c.id}`;
      if (trovate.has(k)) trovate.get(k).count++;
      else trovate.set(k, { id: c.id, nome: c.nome, marketplace: t.marketplace, count: 1 });
    }
    await sleep(1100);
  }

  const list = [...trovate.values()].sort((a, b) => b.count - a.count || a.nome.localeCompare(b.nome));
  logger.info(`[Competitor] Discovery categorie: ${list.length} browse node trovati su ${tracked.length} ASIN`);
  return list;
}

// Catalog API: dettaglio singolo ASIN con info ricche
async function fetchAsinDetail(asin, marketplace = "IT") {
  const marketplaceId = MARKETPLACE_IDS[marketplace];
  if (!marketplaceId) throw new Error(`Marketplace ${marketplace} non supportato`);
  const { access_token } = await getAccessToken();

  try {
    const res = await axios.get(`${BASE_URL}/catalog/2022-04-01/items/${asin}`, {
      params: {
        marketplaceIds: marketplaceId,
        includedData: "summaries,images,attributes,salesRanks",
      },
      headers: { "x-amz-access-token": access_token },
      timeout: 15000,
    });
    const data = res.data || {};
    const s = data.summaries?.[0] || {};
    const imgs = data.images?.[0]?.images || [];
    const mainImg = imgs.find(i => i.variant === "MAIN") || imgs[0] || {};
    const ranks = data.salesRanks?.[0]?.classificationRanks || data.salesRanks?.[0]?.displayGroupRanks || [];
    const topRank = ranks[0] || {};

    // Bullets (feature_bullets.value[]) — opzionale, non sempre presente
    const attrs = data.attributes || {};
    const bullets = (attrs.bullet_point || attrs.feature_bullets || []).map(b => b?.value).filter(Boolean).slice(0, 5);

    return {
      asin,
      titolo: s.itemName || "",
      brand: s.brand || "",
      manufacturer: s.manufacturer || "",
      image_url: mainImg.link || "",
      bsr: topRank.rank || null,
      bsr_category: topRank.title || topRank.classificationId || "",
      bullets,
      raw_summary: s,
      stato: "attivo",
    };
  } catch (err) {
    if (err.response?.status === 404) return { asin, stato: "sparito" };
    throw err;
  }
}

// Pricing API: prezzo BuyBox + Prime/FBA/handling time per un ASIN
// LOGICA (priorità decrescente):
// 1. Summary.BuyBoxPrices[0].FulfillmentChannel === "Amazon" → is_prime=1, is_fba=1 (più affidabile)
// 2. Offerta in Offers con SubCondition=New e PrimeInformation.IsPrime=true → is_prime=1
// 3. NumberOfOffers per OfferType="B2C" o FulfillmentChannel="Amazon" > 0
// 4. Fallback null se non si può determinare
async function fetchAsinOfferInfo(asin, marketplace = "IT", retry = 0) {
  const marketplaceId = MARKETPLACE_IDS[marketplace];
  const empty = { prezzo: null, currency: "", is_prime: null, is_fba: null, seller_id: "", handling_min_hours: null, handling_max_hours: null };
  if (!marketplaceId) return empty;
  const { access_token } = await getAccessToken();
  try {
    const res = await axios.get(`${BASE_URL}/products/pricing/v0/items/${asin}/offers`, {
      params: { MarketplaceId: marketplaceId, ItemCondition: "New" },
      headers: { "x-amz-access-token": access_token },
      timeout: 15000,
    });
    const payload = res.data?.payload || {};
    const summary = payload.Summary || {};
    const offers = payload.Offers || [];

    // ── PREZZO ──
    let buyBox = summary.BuyBoxPrices?.[0]?.LandedPrice
              || summary.LowestPrices?.[0]?.LandedPrice
              || {};
    if (buyBox.Amount == null && offers[0]?.ListingPrice) {
      const o = offers[0];
      const land = (o.ListingPrice?.Amount || 0) + (o.Shipping?.Amount || 0);
      buyBox = { Amount: land, CurrencyCode: o.ListingPrice?.CurrencyCode || "" };
    }

    // ── PRIME / FBA — strategia a cascata ──
    let isPrime = null, isFba = null;

    // PRIORITÀ 1: BuyBox FulfillmentChannel (la fonte più attendibile per il badge visibile su Amazon)
    const bbox = summary.BuyBoxPrices?.[0];
    if (bbox?.FulfillmentChannel) {
      isFba = bbox.FulfillmentChannel === "Amazon" ? 1 : 0;
      isPrime = isFba; // Su Amazon, BuyBox FBA = Prime per default
    }

    // PRIORITÀ 2: NumberOfOffers per FulfillmentChannel = Amazon (ce n'è almeno una FBA?)
    if (isPrime == null) {
      const offerCounts = summary.NumberOfOffers || [];
      const fbaCount = offerCounts
        .filter(c => c.Condition?.toLowerCase() === "new" && c.FulfillmentChannel === "Amazon")
        .reduce((a, c) => a + (c.OfferCount || 0), 0);
      const totCount = offerCounts
        .filter(c => c.Condition?.toLowerCase() === "new")
        .reduce((a, c) => a + (c.OfferCount || 0), 0);
      if (totCount > 0) {
        isFba = fbaCount > 0 ? 1 : 0;
        isPrime = isFba;
      }
    }

    // PRIORITÀ 3: parsing offerte dirette (PrimeInformation per ogni offerta)
    if (isPrime == null && offers.length > 0) {
      const anyPrime = offers.some(o => o.PrimeInformation?.IsPrime === true || o.PrimeInformation?.IsNationalPrime === true);
      const anyFba = offers.some(o => o.IsFulfilledByAmazon === true);
      isPrime = anyPrime ? 1 : (offers.some(o => o.PrimeInformation) ? 0 : null);
      isFba = anyFba ? 1 : (offers.some(o => o.IsFulfilledByAmazon === false) ? 0 : null);
    }

    // ── HANDLING TIME (minimo tra le offerte) ──
    let minHandlingMin = null, minHandlingMax = null;
    for (const o of offers) {
      const ship = o.ShippingTime || {};
      if (ship.maximumHours != null) {
        if (minHandlingMax == null || ship.maximumHours < minHandlingMax) {
          minHandlingMax = ship.maximumHours;
          minHandlingMin = ship.minimumHours ?? null;
        }
      }
    }

    // ── SELLER ID (BuyBox winner se identificabile) ──
    const buyBoxWinner = offers.find(o => o.IsBuyBoxWinner === true);
    const sellerId = (buyBoxWinner || offers[0] || {}).SellerId || "";

    return {
      prezzo: buyBox.Amount != null ? Number(buyBox.Amount) : null,
      currency: buyBox.CurrencyCode || "",
      is_prime: isPrime,
      is_fba: isFba,
      seller_id: sellerId,
      handling_min_hours: minHandlingMin,
      handling_max_hours: minHandlingMax,
    };
  } catch (err) {
    const status = err.response?.status;
    // Retry esponenziale su 429 (max 2 retry: 5s, 15s)
    if (status === 429 && retry < 2) {
      const wait = retry === 0 ? 5000 : 15000;
      logger.warn(`[Competitor] fetchAsinOfferInfo ${asin}: 429 — retry ${retry + 1} in ${wait/1000}s`);
      await sleep(wait);
      return fetchAsinOfferInfo(asin, marketplace, retry + 1);
    }
    logger.warn(`[Competitor] fetchAsinOfferInfo ${asin}: ${status || err.message}`);
    return empty;
  }
}
// Alias retrocompatibile
const fetchAsinPrice = fetchAsinOfferInfo;

// Debug: ritorna il raw payload Pricing API + il parsing finale, per ispezione
async function debugPricing(asin, marketplace = "IT") {
  const marketplaceId = MARKETPLACE_IDS[marketplace];
  if (!marketplaceId) return { error: "marketplace non supportato" };
  const { access_token } = await getAccessToken();
  try {
    const res = await axios.get(`${BASE_URL}/products/pricing/v0/items/${asin}/offers`, {
      params: { MarketplaceId: marketplaceId, ItemCondition: "New" },
      headers: { "x-amz-access-token": access_token },
      timeout: 15000,
    });
    const parsed = await fetchAsinOfferInfo(asin, marketplace);
    return { ok: true, raw: res.data, parsed };
  } catch (err) {
    return { ok: false, status: err.response?.status, error: err.message, raw: err.response?.data };
  }
}

// Diff parole tra due titoli (case-insensitive, normalizza whitespace)
function diffTitleWords(oldTitle, newTitle) {
  const tok = (s) => (s || "").toLowerCase().split(/\s+/).map(w => w.replace(/[^\p{L}\p{N}+]/gu, "")).filter(w => w.length > 1);
  const oldSet = new Set(tok(oldTitle));
  const newSet = new Set(tok(newTitle));
  const removed = [...oldSet].filter(w => !newSet.has(w));
  const added = [...newSet].filter(w => !oldSet.has(w));
  return { removed, added };
}

// Confronta due snapshot e ritorna lista cambiamenti
function computeChanges(prev, curr) {
  const changes = [];
  if (!prev) return changes;

  // Titolo
  if ((prev.titolo || "") !== (curr.titolo || "")) {
    const diff = diffTitleWords(prev.titolo, curr.titolo);
    changes.push({
      change_type: "title_changed",
      field: "titolo",
      old_value: prev.titolo || "",
      new_value: curr.titolo || "",
      details: JSON.stringify(diff),
    });
  }
  // Prezzo
  const op = prev.prezzo, np = curr.prezzo;
  if (op != null && np != null && Math.abs(op - np) >= 0.01) {
    changes.push({
      change_type: "price_changed",
      field: "prezzo",
      old_value: String(op),
      new_value: String(np),
      details: JSON.stringify({ delta: +(np - op).toFixed(2), pct: op > 0 ? +(((np - op) / op) * 100).toFixed(1) : null }),
    });
  }
  // Rating
  if (prev.rating != null && curr.rating != null && Math.abs(prev.rating - curr.rating) >= 0.1) {
    changes.push({
      change_type: "rating_changed",
      field: "rating",
      old_value: String(prev.rating),
      new_value: String(curr.rating),
      details: "",
    });
  }
  // Review count (solo se aumento >= 5 o diminuzione)
  if (prev.review_count != null && curr.review_count != null && prev.review_count !== curr.review_count) {
    const delta = curr.review_count - prev.review_count;
    if (Math.abs(delta) >= 5 || delta < 0) {
      changes.push({
        change_type: "reviews_changed",
        field: "review_count",
        old_value: String(prev.review_count),
        new_value: String(curr.review_count),
        details: JSON.stringify({ delta }),
      });
    }
  }
  // Brand
  if ((prev.brand || "") !== (curr.brand || "") && prev.brand && curr.brand) {
    changes.push({
      change_type: "brand_changed",
      field: "brand",
      old_value: prev.brand || "",
      new_value: curr.brand || "",
      details: "",
    });
  }
  // Stato (sparito/riapparso)
  if (prev.stato === "attivo" && curr.stato === "sparito") {
    changes.push({ change_type: "disappeared", field: "stato", old_value: "attivo", new_value: "sparito", details: "" });
  }
  if (prev.stato === "sparito" && curr.stato === "attivo") {
    changes.push({ change_type: "reappeared", field: "stato", old_value: "sparito", new_value: "attivo", details: "" });
  }
  // Prime status (perso/guadagnato)
  if (prev.is_prime != null && curr.is_prime != null && prev.is_prime !== curr.is_prime) {
    changes.push({
      change_type: curr.is_prime ? "prime_gained" : "prime_lost",
      field: "is_prime",
      old_value: String(prev.is_prime),
      new_value: String(curr.is_prime),
      details: "",
    });
  }
  // FBA status (passato a FBM o viceversa)
  if (prev.is_fba != null && curr.is_fba != null && prev.is_fba !== curr.is_fba) {
    changes.push({
      change_type: curr.is_fba ? "fba_gained" : "fba_lost",
      field: "is_fba",
      old_value: String(prev.is_fba),
      new_value: String(curr.is_fba),
      details: "",
    });
  }

  return changes;
}

// Cattura snapshot di un ASIN + calcola diff vs ultimo snapshot
async function captureAsinSnapshot(asin, marketplace = "IT") {
  ensureTables();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  let detail;
  try {
    detail = await fetchAsinDetail(asin, marketplace);
  } catch (err) {
    logger.warn(`[Competitor] fetchAsinDetail ${asin}: ${err.message}`);
    return { ok: false, error: err.message };
  }

  // Aggiungi prezzo + Prime/FBA/handling (best-effort)
  const offer = detail.stato === "attivo"
    ? await fetchAsinOfferInfo(asin, marketplace)
    : { prezzo: null, currency: "", is_prime: null, is_fba: null, seller_id: "", handling_min_hours: null, handling_max_hours: null };

  // Recupera ultimo snapshot per confronto
  const prev = db.prepare(
    "SELECT * FROM competitor_asin_snapshots WHERE asin = ? AND marketplace = ? ORDER BY date DESC LIMIT 1"
  ).get(asin, marketplace);

  const curr = {
    asin,
    marketplace,
    date: today,
    titolo: detail.titolo || "",
    brand: detail.brand || "",
    prezzo: offer.prezzo,
    currency: offer.currency || "",
    rating: detail.rating ?? null,
    review_count: detail.review_count ?? null,
    bsr: detail.bsr ?? null,
    bsr_category: detail.bsr_category || "",
    image_url: detail.image_url || "",
    bullets: detail.bullets ? JSON.stringify(detail.bullets) : "",
    stato: detail.stato || "attivo",
    raw_summary: detail.raw_summary ? JSON.stringify(detail.raw_summary) : "",
    is_prime: offer.is_prime,
    is_fba: offer.is_fba,
    seller_id: offer.seller_id || "",
    handling_min_hours: offer.handling_min_hours,
    handling_max_hours: offer.handling_max_hours,
  };

  // Upsert (un solo snapshot per giorno)
  db.prepare(`
    INSERT INTO competitor_asin_snapshots
      (asin, marketplace, date, titolo, brand, prezzo, currency, rating, review_count, bsr, bsr_category, image_url, bullets, stato, raw_summary,
       is_prime, is_fba, seller_id, handling_min_hours, handling_max_hours)
    VALUES (@asin, @marketplace, @date, @titolo, @brand, @prezzo, @currency, @rating, @review_count, @bsr, @bsr_category, @image_url, @bullets, @stato, @raw_summary,
       @is_prime, @is_fba, @seller_id, @handling_min_hours, @handling_max_hours)
    ON CONFLICT(asin, marketplace, date) DO UPDATE SET
      titolo = excluded.titolo, brand = excluded.brand, prezzo = excluded.prezzo, currency = excluded.currency,
      rating = excluded.rating, review_count = excluded.review_count, bsr = excluded.bsr, bsr_category = excluded.bsr_category,
      image_url = excluded.image_url, bullets = excluded.bullets, stato = excluded.stato, raw_summary = excluded.raw_summary,
      is_prime = excluded.is_prime, is_fba = excluded.is_fba, seller_id = excluded.seller_id,
      handling_min_hours = excluded.handling_min_hours, handling_max_hours = excluded.handling_max_hours
  `).run(curr);

  // Calcola e salva cambiamenti (solo se prev è di un giorno diverso, per evitare duplicati intra-day)
  let changes = [];
  if (prev && prev.date !== today) {
    changes = computeChanges(prev, curr);
    const insChange = db.prepare(`
      INSERT INTO competitor_asin_changes (asin, marketplace, date, change_type, field, old_value, new_value, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of changes) {
      insChange.run(asin, marketplace, today, c.change_type, c.field, c.old_value, c.new_value, c.details);
    }
    // Genera alert_events per cambiamenti significativi
    try { emitAlertsForChanges(asin, marketplace, curr, changes); }
    catch (e) { logger.warn(`[Competitor] emitAlerts ${asin}: ${e.message}`); }
  }

  // Aggiorna stato tracked
  db.prepare(`
    UPDATE competitor_tracked_asins SET last_checked_at = datetime('now','localtime'), last_status = ?
    WHERE asin = ? AND marketplace = ?
  `).run(curr.stato, asin, marketplace);

  return { ok: true, snapshot: curr, changes };
}

// CRUD ASIN tracciati
function addTrackedAsin({ asin, marketplace = "IT", note = "", source = "manual", keyword_source = "" }) {
  ensureTables();
  const db = getDb();
  const a = String(asin || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(a)) return { ok: false, message: "ASIN non valido (10 caratteri alfanumerici)" };
  const r = db.prepare(`
    INSERT INTO competitor_tracked_asins (asin, marketplace, source, keyword_source, note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(asin, marketplace) DO UPDATE SET
      attivo = 1,
      note = CASE WHEN excluded.note != '' THEN excluded.note ELSE competitor_tracked_asins.note END,
      keyword_source = CASE WHEN excluded.keyword_source != '' THEN excluded.keyword_source ELSE competitor_tracked_asins.keyword_source END
  `).run(a, marketplace, source, keyword_source || "", note || "");
  return { ok: true, asin: a, id: r.lastInsertRowid };
}

function listTrackedAsins({ marketplace = null, soloAttivi = true } = {}) {
  ensureTables();
  const db = getDb();
  let q = "SELECT t.* FROM competitor_tracked_asins t WHERE 1=1";
  const args = [];
  if (soloAttivi) q += " AND t.attivo = 1";
  if (marketplace) { q += " AND t.marketplace = ?"; args.push(marketplace); }
  q += " ORDER BY t.last_checked_at DESC NULLS LAST, t.first_seen_at DESC";
  const rows = db.prepare(q).all(...args);

  // Arricchisci con ultimo snapshot
  const lastSnapStmt = db.prepare(
    "SELECT * FROM competitor_asin_snapshots WHERE asin = ? AND marketplace = ? ORDER BY date DESC LIMIT 1"
  );
  // Mappa keyword → created_at per le card raggruppate nello storico
  const kwCreatedStmt = db.prepare(
    "SELECT created_at FROM competitor_keywords WHERE keyword = ? AND marketplace = ? LIMIT 1"
  );
  for (const r of rows) {
    const last = lastSnapStmt.get(r.asin, r.marketplace);
    if (last) {
      r.titolo = last.titolo;
      r.brand = last.brand;
      r.prezzo = last.prezzo;
      r.currency = last.currency;
      r.image_url = last.image_url;
      r.last_snapshot_date = last.date;
      r.is_prime = last.is_prime;
      r.is_fba = last.is_fba;
      r.handling_min_hours = last.handling_min_hours;
      r.handling_max_hours = last.handling_max_hours;
    }
    if (r.keyword_source) {
      const k = kwCreatedStmt.get(r.keyword_source, r.marketplace);
      if (k) r.keyword_created_at = k.created_at;
    }
  }
  return rows;
}

function removeTrackedAsin(id) {
  ensureTables();
  const db = getDb();
  db.prepare("UPDATE competitor_tracked_asins SET attivo = 0 WHERE id = ?").run(id);
  return { ok: true };
}

// Rimuove tutti gli ASIN tracciati legati a una keyword (soft-delete)
function removeTrackedByKeyword(keywordSource, marketplace) {
  ensureTables();
  const db = getDb();
  const r = db.prepare(`
    UPDATE competitor_tracked_asins SET attivo = 0
    WHERE keyword_source = ? AND marketplace = ? AND attivo = 1
  `).run(keywordSource, marketplace);
  return { ok: true, rimossi: r.changes };
}

// ── Stima vendite/giorno da BSR ─────────────────────────
// Curva approssimativa generica per Amazon (calibrata su categorie miste IT/EU).
// Errore tipico 30-50% — utile come ordine di grandezza, non per cifre precise.
function bsrToSalesPerDay(bsr) {
  if (!bsr || bsr <= 0) return null;
  // Piecewise logaritmica decrescente
  if (bsr <= 1) return 3000;
  if (bsr <= 10)      return Math.max(800,  Math.round(3000 / Math.pow(bsr, 0.6)));
  if (bsr <= 100)     return Math.max(200,  Math.round(2200 / Math.pow(bsr, 0.7)));
  if (bsr <= 1000)    return Math.max(30,   Math.round(900  / Math.pow(bsr, 0.7)));
  if (bsr <= 10000)   return Math.max(5,    Math.round(450  / Math.pow(bsr, 0.7)));
  if (bsr <= 100000)  return Math.max(1,    Math.round(180  / Math.pow(bsr, 0.7)));
  if (bsr <= 1000000) return Math.max(0.05, +(50 / Math.pow(bsr, 0.7)).toFixed(2));
  return 0.05;
}

// Stima vendite per ASIN su periodo (days = giorni richiesti)
function getAsinSalesEstimate(asin, marketplace = "IT", days = 30) {
  ensureTables();
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const snaps = db.prepare(`
    SELECT date, bsr, prezzo, currency FROM competitor_asin_snapshots
    WHERE asin = ? AND marketplace = ? AND date >= ? AND bsr IS NOT NULL AND bsr > 0
    ORDER BY date ASC
  `).all(asin, marketplace, sinceStr);

  const series = snaps.map(s => ({
    date: s.date,
    bsr: s.bsr,
    prezzo: s.prezzo,
    sales_per_day: bsrToSalesPerDay(s.bsr),
  }));

  if (series.length === 0) {
    return {
      ok: true,
      days_requested: days,
      days_available: 0,
      snapshots_count: 0,
      avg_sales_per_day: null,
      total_estimated: null,
      revenue_estimated: null,
      bsr_min: null,
      bsr_max: null,
      bsr_avg: null,
      trend: null,
      series: [],
      note: "Nessuno snapshot con BSR disponibile per questo periodo",
    };
  }

  const avgSales = series.reduce((a, s) => a + s.sales_per_day, 0) / series.length;
  const avgPrice = series.filter(s => s.prezzo).reduce((a, s, _, arr) => a + s.prezzo / arr.length, 0);
  const bsrs = series.map(s => s.bsr);
  const firstHalfAvg = series.slice(0, Math.ceil(series.length / 2)).reduce((a, s) => a + s.bsr, 0) / Math.ceil(series.length / 2);
  const secondHalfAvg = series.slice(-Math.floor(series.length / 2) || -1).reduce((a, s) => a + s.bsr, 0) / (Math.floor(series.length / 2) || 1);
  // BSR più basso = vendite migliori → trend "up" se secondHalfAvg < firstHalfAvg
  let trend = "stable";
  if (series.length >= 4) {
    const delta = (firstHalfAvg - secondHalfAvg) / firstHalfAvg;
    if (delta > 0.15) trend = "up";
    else if (delta < -0.15) trend = "down";
  }

  // Giorni effettivamente coperti (date univoche)
  const giorniCoperti = new Set(series.map(s => s.date)).size;

  return {
    ok: true,
    days_requested: days,
    days_available: giorniCoperti,
    snapshots_count: series.length,
    avg_sales_per_day: Math.round(avgSales * 10) / 10,
    total_estimated: Math.round(avgSales * giorniCoperti),
    revenue_estimated: avgPrice > 0 ? Math.round(avgSales * giorniCoperti * avgPrice) : null,
    avg_price: avgPrice > 0 ? +avgPrice.toFixed(2) : null,
    bsr_min: Math.min(...bsrs),
    bsr_max: Math.max(...bsrs),
    bsr_avg: Math.round(bsrs.reduce((a, b) => a + b, 0) / bsrs.length),
    trend,
    series,
    note: giorniCoperti < days
      ? `Periodo richiesto ${days}gg, snapshot reali disponibili solo per ${giorniCoperti}gg. Stima basata sui dati disponibili.`
      : `Periodo coperto interamente (${giorniCoperti}gg).`,
  };
}

function getAsinSnapshotHistory(asin, marketplace = "IT", limit = 60) {
  ensureTables();
  const db = getDb();
  return db.prepare(`
    SELECT date, titolo, brand, prezzo, currency, rating, review_count, bsr, image_url, stato,
           is_prime, is_fba, handling_min_hours, handling_max_hours
    FROM competitor_asin_snapshots
    WHERE asin = ? AND marketplace = ?
    ORDER BY date DESC LIMIT ?
  `).all(asin, marketplace, limit);
}

function getAsinChanges(asin, marketplace = "IT", limit = 100) {
  ensureTables();
  const db = getDb();
  return db.prepare(`
    SELECT * FROM competitor_asin_changes
    WHERE asin = ? AND marketplace = ?
    ORDER BY date DESC, id DESC LIMIT ?
  `).all(asin, marketplace, limit);
}

// Feed globale modifiche (joinato con snapshot per titolo+immagine attuale)
function getRecentChanges({ days = 30, limit = 200 } = {}) {
  ensureTables();
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const rows = db.prepare(`
    SELECT c.*,
      (SELECT titolo FROM competitor_asin_snapshots s WHERE s.asin = c.asin AND s.marketplace = c.marketplace ORDER BY s.date DESC LIMIT 1) AS titolo_attuale,
      (SELECT image_url FROM competitor_asin_snapshots s WHERE s.asin = c.asin AND s.marketplace = c.marketplace ORDER BY s.date DESC LIMIT 1) AS image_url
    FROM competitor_asin_changes c
    WHERE c.date >= ?
    ORDER BY c.date DESC, c.id DESC
    LIMIT ?
  `).all(sinceStr, limit);
  return rows;
}

// Genera eventi nella tabella alert_events per i cambiamenti significativi.
// Si integra con il CentroAlert esistente (source = 'competitor').
function emitAlertsForChanges(asin, marketplace, snapshot, changes) {
  if (!changes || changes.length === 0) return 0;
  const db = getDb();
  const nome = (snapshot.titolo || "").slice(0, 80);
  const marketplaceId = MARKETPLACE_IDS[marketplace] || "";

  const ins = db.prepare(`
    INSERT INTO alert_events (asin, tipo, marketplace_id, messaggio, valore_attuale, valore_precedente, source, nome)
    VALUES (?, ?, ?, ?, ?, ?, 'competitor', ?)
  `);

  // Evita duplicati per stesso asin+tipo nelle ultime 20 ore (stesso ciclo)
  const checkDup = db.prepare(`
    SELECT id FROM alert_events
    WHERE asin = ? AND tipo = ? AND source = 'competitor' AND letto = 0
      AND created_at >= datetime('now','-20 hours')
    LIMIT 1
  `);

  let inseriti = 0;
  for (const c of changes) {
    let tipo = null, msg = null;

    if (c.change_type === "price_changed") {
      const d = c.details ? JSON.parse(c.details) : {};
      // Solo variazioni >= 5%
      if (Math.abs(d.pct ?? 0) < 5) continue;
      tipo = "COMPETITOR_PRICE_CHANGED";
      const dir = d.delta > 0 ? "↑" : "↓";
      msg = `Prezzo ${dir} da € ${c.old_value} a € ${c.new_value} (${d.delta > 0 ? "+" : ""}${d.pct}%) — ${marketplace}`;
    } else if (c.change_type === "title_changed") {
      tipo = "COMPETITOR_TITLE_CHANGED";
      let diff = "";
      try {
        const d = JSON.parse(c.details || "{}");
        const rem = (d.removed || []).slice(0, 3).join(", ");
        const add = (d.added || []).slice(0, 3).join(", ");
        if (rem) diff += ` −[${rem}]`;
        if (add) diff += ` +[${add}]`;
      } catch {}
      msg = `Titolo modificato${diff} — ${marketplace}`;
    } else if (c.change_type === "disappeared") {
      tipo = "COMPETITOR_DISAPPEARED";
      msg = `ASIN sparito da Amazon ${marketplace} (404 sulla scheda)`;
    } else if (c.change_type === "reappeared") {
      tipo = "COMPETITOR_REAPPEARED";
      msg = `ASIN tornato online su Amazon ${marketplace}`;
    } else if (c.change_type === "reviews_changed") {
      const d = c.details ? JSON.parse(c.details) : {};
      // Solo cali (recensioni rimosse — sospetto)
      if ((d.delta ?? 0) >= 0) continue;
      tipo = "COMPETITOR_REVIEWS_DROP";
      msg = `Recensioni diminuite di ${Math.abs(d.delta)} (da ${c.old_value} a ${c.new_value}) — ${marketplace}`;
    } else if (c.change_type === "prime_lost") {
      tipo = "COMPETITOR_PRIME_LOST";
      msg = `Ha perso il badge Prime — ${marketplace} (potrebbe essere passato a FBM o aver finito stock FBA)`;
    } else if (c.change_type === "prime_gained") {
      tipo = "COMPETITOR_PRIME_GAINED";
      msg = `Ha ottenuto il badge Prime — ${marketplace}`;
    } else if (c.change_type === "fba_lost") {
      tipo = "COMPETITOR_FBA_LOST";
      msg = `È passato da FBA a FBM — ${marketplace}`;
    } else if (c.change_type === "fba_gained") {
      tipo = "COMPETITOR_FBA_GAINED";
      msg = `È passato da FBM a FBA — ${marketplace}`;
    } else {
      continue;
    }

    if (checkDup.get(asin, tipo)) continue;
    ins.run(asin, tipo, marketplaceId, msg, c.new_value || "", c.old_value || "", nome);
    inseriti++;
  }
  return inseriti;
}

// Alert per nuovi competitor entrati in top-5 di una keyword
function emitAlertsNewTop5(kw, items) {
  const db = getDb();
  const marketplaceId = MARKETPLACE_IDS[kw.marketplace] || "";
  const ins = db.prepare(`
    INSERT INTO alert_events (asin, tipo, marketplace_id, messaggio, valore_attuale, valore_precedente, source, nome)
    VALUES (?, 'COMPETITOR_NEW_TOP5', ?, ?, ?, '', 'competitor', ?)
  `);
  const checkDup = db.prepare(`
    SELECT id FROM alert_events
    WHERE asin = ? AND tipo = 'COMPETITOR_NEW_TOP5' AND source = 'competitor' AND letto = 0
      AND created_at >= datetime('now','-7 days')
    LIMIT 1
  `);
  let inseriti = 0;
  for (const it of items) {
    if (checkDup.get(it.asin)) continue;
    const msg = `Nuovo competitor in top-5 su "${kw.keyword}" (posizione #${it.posizione}) — ${kw.marketplace}`;
    const nome = (it.titolo || "").slice(0, 80);
    ins.run(it.asin, marketplaceId, msg, `#${it.posizione}`, nome);
    inseriti++;
  }
  if (inseriti > 0) logger.info(`[Competitor] ${inseriti} nuovi competitor in top-5 per "${kw.keyword}"`);
  return inseriti;
}

// Cattura snapshot per TUTTI gli ASIN tracciati attivi (chiamato da cron)
async function runTrackedAsinsSnapshot() {
  ensureTables();
  const db = getDb();
  const tracked = db.prepare("SELECT asin, marketplace FROM competitor_tracked_asins WHERE attivo = 1").all();
  if (tracked.length === 0) {
    logger.info("[Competitor] Nessun ASIN tracciato");
    return { ok: true, count: 0, changes: 0 };
  }

  let totalChanges = 0;
  let ok = 0, errori = 0;
  for (const t of tracked) {
    const r = await captureAsinSnapshot(t.asin, t.marketplace);
    if (r.ok) {
      ok++;
      totalChanges += (r.changes || []).length;
    } else {
      errori++;
    }
    await sleep(5000); // rate limit Pricing API (~10 req/min)
  }
  logger.info(`[Competitor] Snapshot ASIN tracciati: ${ok} ok, ${errori} errori, ${totalChanges} cambiamenti`);
  return { ok: true, count: ok, errori, changes: totalChanges };
}

// Dopo snapshot keyword: auto-track i top-N ASIN trovati (solo se non già tracciati)
// Ritorna la lista degli ASIN nuovi (per snapshot iniziale immediato)
function autoTrackTopAsinsFromSnapshot() {
  ensureTables();
  const db = getDb();
  const tops = db.prepare(`
    SELECT asin, marketplace, keyword_source FROM competitor_asins
    WHERE attivo = 1 AND posizione > 0 AND posizione <= 20
  `).all();
  const insert = db.prepare(`
    INSERT INTO competitor_tracked_asins (asin, marketplace, source, keyword_source)
    VALUES (?, ?, 'auto', ?)
    ON CONFLICT(asin, marketplace) DO NOTHING
  `);
  const nuovi = [];
  for (const t of tops) {
    const r = insert.run(t.asin, t.marketplace, t.keyword_source || "");
    if (r.changes > 0) nuovi.push({ asin: t.asin, marketplace: t.marketplace });
  }
  return nuovi;
}

// Cattura snapshot iniziale per ASIN appena auto-tracciati (in serie, con rate limit)
// Pricing API ha limite stretto: max ~10 req/min. Sleep 2.5s tra ASIN = ~24 req/min ma
// la Catalog API che chiamiamo prima va a 1 req/sec. In totale ~2 chiamate per ASIN, quindi
// 5s di sleep tra ASIN per stare sotto entrambi i limiti.
async function captureInitialSnapshots(nuoviAsin) {
  if (!nuoviAsin || nuoviAsin.length === 0) return 0;
  let ok = 0;
  for (const t of nuoviAsin) {
    try {
      const r = await captureAsinSnapshot(t.asin, t.marketplace);
      if (r.ok) ok++;
    } catch (e) {
      logger.warn(`[Competitor] snapshot iniziale ${t.asin}: ${e.message}`);
    }
    await sleep(5000);
  }
  logger.info(`[Competitor] Snapshot iniziali catturati: ${ok}/${nuoviAsin.length}`);
  return ok;
}

module.exports = {
  ensureTables,
  searchCategory,
  exploreCategoria,
  runCategorySnapshot,
  snapshotSingleKeyword,
  getKeywords,
  addKeyword,
  removeKeyword,
  toggleKeyword,
  getSnapshotHistory,
  getCompetitorAsins,
  // stima vendite
  bsrToSalesPerDay,
  getAsinSalesEstimate,
  // word cloud
  getKeywordWordCloud,
  // confronto mio/competitor
  addMyMapping,
  removeMyMapping,
  listMyMappings,
  getCompetitorComparison,
  // discovery categorie
  fetchAsinClassifications,
  discoverCategorieDaTracked,
  // debug
  debugPricing,
  // storico ASIN
  fetchAsinDetail,
  captureAsinSnapshot,
  addTrackedAsin,
  listTrackedAsins,
  removeTrackedAsin,
  removeTrackedByKeyword,
  getAsinSnapshotHistory,
  getAsinChanges,
  getRecentChanges,
  runTrackedAsinsSnapshot,
  autoTrackTopAsinsFromSnapshot,
  diffTitleWords,
};
