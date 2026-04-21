// backend_v2/routes/topcoat.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { getDb } = require("../db/database");
const axios = require("axios");
const { sign } = require("aws4");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const { checkSottoSogliaTopcoat } = require("../services/stockAlerts.service");
const logger = require("../utils/logger");

// ─── Zod schemas ───────────────────────────────────────
const asinParam = z.object({ asin: z.string().min(1).max(20) });
const idParam = z.object({ id: z.coerce.number().int().positive() });
const idRigaParam = z.object({ id: z.coerce.number().int().positive(), rigaId: z.coerce.number().int().positive() });

const prodottoCreateSchema = z.object({
  asin: z.string().min(1).max(20),
  sku: z.string().max(80).nullish(),
  codice_colore: z.string().max(40).nullish(),
  nome: z.string().max(255).nullish(),
  image_url: z.string().max(1000).nullish(),
  soglia_minima: z.coerce.number().int().min(0).default(10),
});
const prodottoPatchSchema = z.object({
  codice_colore: z.string().max(40).nullish(),
  soglia_minima: z.coerce.number().int().min(0).nullish(),
});
const rettificaSchema = z.object({
  asin: z.string().min(1).max(20),
  nuova_quantita: z.coerce.number().int().min(0),
  note: z.string().max(500).nullish(),
  operatore: z.string().max(80).nullish(),
});
const ordineCreateSchema = z.object({
  fornitore: z.string().min(1).max(120),
  data_consegna_prevista: z.string().max(40).nullish(),
  note: z.string().max(500).nullish(),
  operatore: z.string().max(80).nullish(),
  righe: z.array(z.object({
    asin: z.string().min(1).max(20),
    quantita_ordinata: z.coerce.number().int().positive(),
  })).default([]),
});
const ordinePatchSchema = z.object({
  stato: z.enum(["bozza", "confermato", "in_attesa", "ricevuto_parziale", "ricevuto", "annullato"]).nullish(),
  fornitore: z.string().max(120).nullish(),
  data_consegna_prevista: z.string().max(40).nullish(),
  note: z.string().max(500).nullish(),
});
const rigaCreateSchema = z.object({
  asin: z.string().min(1).max(20),
  quantita_ordinata: z.coerce.number().int().positive(),
});
const riceviSchema = z.object({
  operatore: z.string().max(80).default("magazzino"),
  righe: z.array(z.object({
    id_riga: z.coerce.number().int().positive(),
    quantita_ricevuta: z.coerce.number().int().min(0),
  })).default([]),
});
const scaricoDdtSchema = z.object({
  id_ddt: z.coerce.number().int().positive(),
  righe: z.array(z.object({
    asin: z.string().min(1).max(20),
    quantita: z.coerce.number().int().positive(),
  })).default([]),
  operatore: z.string().max(80).default("ddt"),
});
const resetSchema = z.object({ conferma: z.literal("RESET") });

// Cartella dove salvare le immagini Top Coat
const UPLOAD_DIR = path.join(__dirname, "../../frontend/public/topcoat-images");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${req.params.asin}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo immagini consentite"));
  },
});

// ─────────────────────────────────────────────
// HELPER: registra un movimento e aggiorna qta
// ─────────────────────────────────────────────
function applicaMovimento(db, { asin, tipo, quantita, riferimento_tipo, riferimento_id, note, operatore }) {
  db.prepare(`
    INSERT INTO topcoat_movimenti (asin, tipo, quantita, riferimento_tipo, riferimento_id, note, operatore)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(asin, tipo, quantita, riferimento_tipo ?? null, riferimento_id ?? null, note ?? null, operatore ?? "system");

  db.prepare(`
    UPDATE topcoat_prodotti
    SET quantita   = MAX(0, quantita + ?),
        updated_at = datetime('now','localtime')
    WHERE asin = ?
  `).run(quantita, asin);

  // Verifica sotto-soglia e crea/auto-cancella alert
  checkSottoSogliaTopcoat(db, asin);
}

// ══════════════════════════════════════════════
// PRODOTTI — catalogo Top Coat
// ══════════════════════════════════════════════

// GET /api/v2/topcoat/prodotti  — lista con stock
router.get("/prodotti", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        p.*,
        COALESCE(arrivi.qta_in_arrivo, 0) AS qta_in_arrivo,
        arrivi.prima_consegna,
        COALESCE(arrivi.num_ordini, 0) AS num_ordini_in_arrivo
      FROM topcoat_prodotti p
      LEFT JOIN (
        SELECT
          r.asin,
          SUM(r.quantita_ordinata - COALESCE(r.quantita_ricevuta, 0)) AS qta_in_arrivo,
          MIN(o.data_consegna_prevista) AS prima_consegna,
          COUNT(DISTINCT o.id) AS num_ordini
        FROM topcoat_ordini_righe r
        JOIN topcoat_ordini o ON o.id = r.id_ordine
        WHERE o.stato IN ('confermato','in_attesa','ricevuto_parziale')
          AND (r.quantita_ordinata - COALESCE(r.quantita_ricevuta, 0)) > 0
        GROUP BY r.asin
      ) AS arrivi ON arrivi.asin = p.asin
      ORDER BY p.codice_colore ASC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/topcoat/prodotti/disponibili
// Lista prodotti in tabella "prodotti" NON ancora in topcoat_prodotti
router.get("/prodotti/disponibili", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT p.asin, p.nome, p.sku, p.immagine_main AS image_url
      FROM prodotti p
      WHERE p.asin NOT IN (SELECT asin FROM topcoat_prodotti)
        AND p.asin IS NOT NULL AND p.asin != ''
      ORDER BY p.nome ASC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/topcoat/prodotti  — aggiungi ASIN al catalogo
router.post("/prodotti", validate({ body: prodottoCreateSchema }), (req, res) => {
  try {
    const db = getDb();
    const { asin, sku, codice_colore, nome, image_url, soglia_minima = 10 } = req.body;

    db.prepare(`
      INSERT INTO topcoat_prodotti (asin, sku, codice_colore, nome, image_url, soglia_minima)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(asin) DO UPDATE SET
        sku = excluded.sku, codice_colore = excluded.codice_colore,
        nome = excluded.nome, image_url = excluded.image_url,
        soglia_minima = excluded.soglia_minima,
        updated_at = datetime('now','localtime')
    `).run(asin, sku ?? null, codice_colore ?? null, nome ?? null, image_url ?? null, soglia_minima);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v2/topcoat/prodotti/:asin  — aggiorna soglia/codice colore
router.patch("/prodotti/:asin", validate({ params: asinParam, body: prodottoPatchSchema }), (req, res) => {
  try {
    const db = getDb();
    const { codice_colore, soglia_minima } = req.body;
    db.prepare(`
      UPDATE topcoat_prodotti
      SET codice_colore = COALESCE(?, codice_colore),
          soglia_minima = COALESCE(?, soglia_minima),
          updated_at    = datetime('now','localtime')
      WHERE asin = ?
    `).run(codice_colore ?? null, soglia_minima ?? null, req.params.asin);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v2/topcoat/prodotti/:asin
router.delete("/prodotti/:asin", validate({ params: asinParam }), (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM topcoat_prodotti WHERE asin = ?").run(req.params.asin);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/topcoat/rettifica  — rettifica manuale stock
router.post("/rettifica", validate({ body: rettificaSchema }), (req, res) => {
  try {
    const db = getDb();
    const { asin, nuova_quantita, note, operatore } = req.body;

    const prod = db.prepare("SELECT quantita FROM topcoat_prodotti WHERE asin = ?").get(asin);
    if (!prod) return res.status(404).json({ error: "ASIN non trovato" });

    const delta = nuova_quantita - prod.quantita;
    applicaMovimento(db, {
      asin, tipo: "RETTIFICA", quantita: delta,
      note: note ?? `Rettifica manuale: ${prod.quantita} → ${nuova_quantita}`,
      operatore: operatore ?? "admin"
    });
    res.json({ ok: true, delta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// ORDINI FORNITORI
// ══════════════════════════════════════════════

// GET /api/v2/topcoat/ordini
router.get("/ordini", (req, res) => {
  try {
    const db = getDb();
    const ordini = db.prepare(`
      SELECT o.*,
        (SELECT COUNT(*) FROM topcoat_ordini_righe r WHERE r.id_ordine = o.id) AS num_righe,
        (SELECT SUM(r.quantita_ordinata) FROM topcoat_ordini_righe r WHERE r.id_ordine = o.id) AS tot_ordinato
      FROM topcoat_ordini o
      ORDER BY o.created_at DESC
    `).all();

    // Righe per ogni ordine
    const stmt = db.prepare("SELECT r.*, p.nome, p.image_url, p.codice_colore FROM topcoat_ordini_righe r LEFT JOIN topcoat_prodotti p ON p.asin = r.asin WHERE r.id_ordine = ?");
    const result = ordini.map(o => ({ ...o, righe: stmt.all(o.id) }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/topcoat/ordini/in-arrivo  — solo per magazzino
router.get("/ordini/in-arrivo", (req, res) => {
  try {
    const db = getDb();
    const ordini = db.prepare(`
      SELECT o.id, o.fornitore, o.data_consegna_prevista, o.stato, o.note
      FROM topcoat_ordini o
      WHERE o.stato IN ('confermato','in_attesa','ricevuto_parziale')
      ORDER BY o.data_consegna_prevista ASC
    `).all();

    const stmt = db.prepare(`
      SELECT r.asin, r.quantita_ordinata, r.quantita_ricevuta, r.stato,
             p.nome, p.image_url, p.codice_colore
      FROM topcoat_ordini_righe r
      LEFT JOIN topcoat_prodotti p ON p.asin = r.asin
      WHERE r.id_ordine = ? AND r.stato != 'ricevuto'
    `);
    res.json(ordini.map(o => ({ ...o, righe: stmt.all(o.id) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/topcoat/ordini  — crea ordine
router.post("/ordini", validate({ body: ordineCreateSchema }), (req, res) => {
  try {
    const db = getDb();
    const { fornitore, data_consegna_prevista, note, operatore, righe = [] } = req.body;

    const result = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO topcoat_ordini (fornitore, data_consegna_prevista, stato, note, operatore)
        VALUES (?, ?, 'bozza', ?, ?)
      `).run(fornitore, data_consegna_prevista ?? null, note ?? null, operatore ?? "admin");

      const id = info.lastInsertRowid;
      for (const r of righe) {
        db.prepare(`
          INSERT INTO topcoat_ordini_righe (id_ordine, asin, quantita_ordinata)
          VALUES (?, ?, ?)
        `).run(id, r.asin, r.quantita_ordinata);
      }
      return id;
    })();

    res.json({ ok: true, id: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v2/topcoat/ordini/:id  — aggiorna stato/dati ordine
router.patch("/ordini/:id", validate({ params: idParam, body: ordinePatchSchema }), (req, res) => {
  try {
    const db = getDb();
    const { stato, fornitore, data_consegna_prevista, note } = req.body;
    db.prepare(`
      UPDATE topcoat_ordini
      SET stato                  = COALESCE(?, stato),
          fornitore              = COALESCE(?, fornitore),
          data_consegna_prevista = COALESCE(?, data_consegna_prevista),
          note                   = COALESCE(?, note),
          updated_at             = datetime('now','localtime')
      WHERE id = ?
    `).run(stato ?? null, fornitore ?? null, data_consegna_prevista ?? null, note ?? null, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/topcoat/ordini/:id/righe  — aggiungi riga
router.post("/ordini/:id/righe", validate({ params: idParam, body: rigaCreateSchema }), (req, res) => {
  try {
    const db = getDb();
    const { asin, quantita_ordinata } = req.body;
    db.prepare(`
      INSERT INTO topcoat_ordini_righe (id_ordine, asin, quantita_ordinata)
      VALUES (?, ?, ?)
      ON CONFLICT DO NOTHING
    `).run(req.params.id, asin, quantita_ordinata);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v2/topcoat/ordini/:id/righe/:rigaId
router.delete("/ordini/:id/righe/:rigaId", validate({ params: idRigaParam }), (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM topcoat_ordini_righe WHERE id = ? AND id_ordine = ?").run(req.params.rigaId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/topcoat/ordini/:id/ricevi  — conferma ricezione (IDEMPOTENTE)
// Body: { operatore, righe: [{ id_riga, quantita_ricevuta }] }
//
// Il valore quantita_ricevuta inviato è ASSOLUTO (totale ricevuto fino ad ora).
// Il movimento di stock viene applicato solo sul DELTA rispetto al valore già
// salvato sulla riga, così doppi-click o re-invii non duplicano lo stock.
router.post("/ordini/:id/ricevi", validate({ params: idParam, body: riceviSchema }), (req, res) => {
  try {
    const db = getDb();
    const { operatore = "magazzino", righe = [] } = req.body;
    const idOrdine = Number(req.params.id);

    // Verifica stato ordine: rifiuta se già completato o annullato
    const ordine = db.prepare("SELECT id, stato FROM topcoat_ordini WHERE id = ?").get(idOrdine);
    if (!ordine) return res.status(404).json({ error: "Ordine non trovato" });
    if (["ricevuto", "annullato"].includes(ordine.stato)) {
      return res.status(409).json({ error: `Ordine già in stato '${ordine.stato}', operazione non consentita` });
    }

    let modifiche = 0;
    let movimentiApplicati = 0;

    db.transaction(() => {
      let tutteRicevute = true;
      let almenoUna = false;

      // Carica tutte le righe correnti dell'ordine per il check di completezza
      const righeOrdine = db.prepare("SELECT * FROM topcoat_ordini_righe WHERE id_ordine = ?").all(idOrdine);
      const rigaById = new Map(righeOrdine.map(r => [r.id, r]));

      for (const r of righe) {
        const qtaNuova = Number(r.quantita_ricevuta);
        if (isNaN(qtaNuova) || qtaNuova < 0) continue;

        const riga = rigaById.get(Number(r.id_riga));
        if (!riga) continue;

        // Cap: non si può ricevere più di quanto ordinato
        const qtaCapped = Math.min(qtaNuova, riga.quantita_ordinata);
        const qtaPrecedente = Number(riga.quantita_ricevuta ?? 0);
        const delta = qtaCapped - qtaPrecedente;

        // Aggiorna lo stato della riga (assoluto, idempotente)
        const statoRiga = qtaCapped >= riga.quantita_ordinata
          ? "ricevuto"
          : qtaCapped > 0 ? "parziale" : "in_attesa";

        if (delta !== 0 || statoRiga !== riga.stato) {
          db.prepare(`
            UPDATE topcoat_ordini_righe
            SET quantita_ricevuta = ?, stato = ?
            WHERE id = ?
          `).run(qtaCapped, statoRiga, riga.id);
          modifiche++;
          // Aggiorna in memoria per il check finale
          riga.quantita_ricevuta = qtaCapped;
          riga.stato = statoRiga;
        }

        // Movimento di stock SOLO sul delta (positivo o negativo)
        if (delta !== 0) {
          applicaMovimento(db, {
            asin: riga.asin,
            tipo: "CARICO_ORDINE",
            quantita: delta,
            riferimento_tipo: "ordine",
            riferimento_id: idOrdine,
            note: delta > 0
              ? `Ricezione ordine #${idOrdine}`
              : `Correzione ricezione ordine #${idOrdine}`,
            operatore
          });
          movimentiApplicati++;
        }

        almenoUna = true;
      }

      // Stato ordine: ricevuto se TUTTE le righe sono al loro totale
      for (const riga of righeOrdine) {
        if ((riga.quantita_ricevuta ?? 0) < riga.quantita_ordinata) {
          tutteRicevute = false;
          break;
        }
      }

      if (almenoUna) {
        const nuovoStato = tutteRicevute ? "ricevuto" : "ricevuto_parziale";
        if (nuovoStato !== ordine.stato) {
          db.prepare(`
            UPDATE topcoat_ordini SET stato = ?, updated_at = datetime('now','localtime') WHERE id = ?
          `).run(nuovoStato, idOrdine);
        }
      }
    })();

    res.json({ ok: true, modifiche, movimentiApplicati });
  } catch (err) {
    logger.error({ err }, "/topcoat/ordini/:id/ricevi");
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// MOVIMENTI
// ══════════════════════════════════════════════

// GET /api/v2/topcoat/movimenti?asin=&tipo=&limit=100
router.get("/movimenti", (req, res) => {
  try {
    const db = getDb();
    const { asin, tipo, limit = 100 } = req.query;
    const where = [];
    const params = [];
    if (asin) { where.push("m.asin = ?"); params.push(asin); }
    if (tipo) { where.push("m.tipo = ?"); params.push(tipo); }
    const wClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const rows = db.prepare(`
      SELECT m.*, p.nome, p.codice_colore, p.image_url
      FROM topcoat_movimenti m
      LEFT JOIN topcoat_prodotti p ON p.asin = m.asin
      ${wClause}
      ORDER BY m.created_at DESC
      LIMIT ?
    `).all(...params, Number(limit));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// HOOK DDT: chiamato internamente alla generazione PDF
// POST /api/v2/topcoat/scarico-ddt
// Body: { id_ddt, righe: [{ asin, quantita }], operatore }
// ══════════════════════════════════════════════
router.post("/scarico-ddt", validate({ body: scaricoDdtSchema }), (req, res) => {
  try {
    const db = getDb();
    const { id_ddt, righe = [], operatore = "ddt" } = req.body;

    const topcoatAsins = new Set(
      db.prepare("SELECT asin FROM topcoat_prodotti").all().map(r => r.asin)
    );

    let scaricati = 0;
    db.transaction(() => {
      for (const r of righe) {
        if (!topcoatAsins.has(r.asin)) continue;
        applicaMovimento(db, {
          asin: r.asin, tipo: "SCARICO_DDT", quantita: -Math.abs(r.quantita),
          riferimento_tipo: "ddt", riferimento_id: id_ddt,
          note: `Scarico DDT #${id_ddt}`, operatore
        });
        scaricati++;
      }
    })();

    res.json({ ok: true, scaricati });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// RESET ORDINI E MOVIMENTI — cancella ordini fornitori + storico movimenti
// Il catalogo prodotti Top Coat resta INVARIATO (lo stock viene azzerato).
// POST /api/v2/topcoat/reset
// Body: { conferma: "RESET" }  (richiesto per evitare chiamate accidentali)
// ══════════════════════════════════════════════
router.post("/reset", validate({ body: resetSchema }), (req, res) => {
  try {
    const db = getDb();
    const stats = {};
    db.transaction(() => {
      stats.movimenti = db.prepare("DELETE FROM topcoat_movimenti").run().changes;
      stats.righe     = db.prepare("DELETE FROM topcoat_ordini_righe").run().changes;
      stats.ordini    = db.prepare("DELETE FROM topcoat_ordini").run().changes;
      // Azzera lo stock dei prodotti del catalogo, ma il catalogo resta
      stats.stockAzzerato = db.prepare(
        "UPDATE topcoat_prodotti SET quantita = 0, updated_at = datetime('now','localtime')"
      ).run().changes;
      // reset autoincrement solo per le tabelle svuotate
      try {
        db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('topcoat_movimenti','topcoat_ordini','topcoat_ordini_righe')").run();
      } catch (_) { /* tabella sqlite_sequence può non esistere */ }
    })();
    logger.info({ stats }, "Reset Top Coat (ordini+movimenti)");
    res.json({ ok: true, eliminati: stats });
  } catch (err) {
    logger.error({ err }, "/reset Top Coat");
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// UPLOAD IMMAGINE MANUALE
// POST /api/v2/topcoat/prodotti/:asin/immagine  (multipart/form-data, campo "immagine")
// ══════════════════════════════════════════════
router.post("/prodotti/:asin/immagine", validate({ params: asinParam }), upload.single("immagine"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nessun file ricevuto" });
    const db = getDb();
    const imageUrl = `/topcoat-images/${req.file.filename}`;
    db.prepare(
      "UPDATE topcoat_prodotti SET image_url = ?, updated_at = datetime('now','localtime') WHERE asin = ?"
    ).run(imageUrl, req.params.asin);
    res.json({ ok: true, image_url: imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// SYNC IMMAGINI: chiama SP-API per ogni ASIN e aggiorna image_url
// POST /api/v2/topcoat/sync-images
// ══════════════════════════════════════════════
router.post("/sync-images", async (req, res) => {
  try {
    const db = getDb();
    const { getAccessToken } = require("../modules/auth/authService");

    const prodotti = db.prepare("SELECT asin FROM topcoat_prodotti").all();
    if (prodotti.length === 0) return res.json({ ok: true, aggiornati: 0 });

    const { access_token } = await getAccessToken();

    const HOST = "sellingpartnerapi-eu.amazon.com";
    const BASE_URL = `https://${HOST}`;
    const MARKETPLACE_IT = "APJ6JRA9NG5V4";
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    let aggiornati = 0;
    const errori = [];

    for (const { asin } of prodotti) {
      try {
        const qs = new URLSearchParams({
          marketplaceIds: MARKETPLACE_IT,
          includedData: "images",
        }).toString();
        const path = `/catalog/2022-04-01/items/${asin}?${qs}`;

        const signed = sign(
          {
            host: HOST,
            path,
            service: "execute-api",
            region: process.env.AWS_REGION || "eu-west-1",
            method: "GET",
            headers: { "x-amz-access-token": access_token },
          },
          {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        );

        const result = await axios.get(`${BASE_URL}${path}`, { headers: signed.headers });
        const data = result.data?.payload ?? result.data;

        // Prende l'immagine MAIN se disponibile, altrimenti la prima
        const imgsSet = data?.images?.[0]?.images ?? [];
        const mainImg = imgsSet.find(i => i.variant === "MAIN") ?? imgsSet[0];
        const imageUrl = mainImg?.link;

        if (imageUrl) {
          db.prepare(
            "UPDATE topcoat_prodotti SET image_url = ?, updated_at = datetime('now','localtime') WHERE asin = ?"
          ).run(imageUrl, asin);
          aggiornati++;
        }

        await sleep(800); // rispetta rate limit SP-API
      } catch (e) {
        logger.warn({ asin, status: e.response?.status, err: e }, "[TopCoat sync-images] errore ASIN");
        errori.push(asin);
        if (e.response?.status === 429) await sleep(5000);
      }
    }

    res.json({ ok: true, aggiornati, totale: prodotti.length, errori });
  } catch (err) {
    logger.error({ err }, "sync-images Top Coat");
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
