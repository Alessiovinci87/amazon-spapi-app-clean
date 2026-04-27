// backend_v2/routes/moduliCustom.js
// Sistema GENERICO di moduli di inventario "tipo One Step / Top Coat".
// Ogni modulo è identificato da uno slug nell'URL e ha i propri prodotti, ordini, movimenti.
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
const { checkSottoSogliaModulo } = require("../services/stockAlerts.service");
const logger = require("../utils/logger");

// ─── Zod schemas ───────────────────────────────────────
const slugParam = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/).max(60) });
const slugAsinParam = slugParam.extend({ asin: z.string().min(1).max(20) });
const slugIdParam = slugParam.extend({ id: z.coerce.number().int().positive() });
const slugIdRigaParam = slugParam.extend({
  id: z.coerce.number().int().positive(),
  rigaId: z.coerce.number().int().positive(),
});

const moduloCreateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug deve contenere solo lettere minuscole, numeri e trattini").max(60),
  label: z.string().min(1).max(120),
  icona: z.string().max(20).default("📦"),
  stile_codice: z.enum(["numerico", "testuale"]).default("numerico"),
  colore: z.string().max(40).default("blue"),
});
const moduloPatchSchema = z.object({
  label: z.string().max(120).nullish(),
  icona: z.string().max(20).nullish(),
  stile_codice: z.enum(["numerico", "testuale"]).nullish(),
  colore: z.string().max(40).nullish(),
});
const moduloDeleteSchema = z.object({ conferma: z.literal("DELETE") });
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
  operatore: z.string().max(80).default("ufficio"),
});
const ordineCreateSchema = z.object({
  fornitore: z.string().min(1).max(120),
  data_consegna_prevista: z.string().max(40).nullish(),
  note: z.string().max(500).nullish(),
  operatore: z.string().max(80).default("ufficio"),
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
const resetSchema = z.object({ conferma: z.literal("RESET") });

// ─── UPLOAD SETUP ──────────────────────────────────────────
const { getUploadDir } = require("../utils/uploadPaths");
const UPLOAD_BASE = getUploadDir("moduli");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOAD_BASE, req.params.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${req.params.asin}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo immagini consentite"));
  },
});

// ─── HELPERS ──────────────────────────────────────────────
function getModuloBySlug(db, slug) {
  return db.prepare("SELECT * FROM moduli_custom WHERE slug = ?").get(slug);
}

function applicaMovimento(db, { modulo_id, asin, tipo, quantita, riferimento_tipo, riferimento_id, note, operatore }) {
  db.prepare(`
    INSERT INTO moduli_movimenti (modulo_id, asin, tipo, quantita, riferimento_tipo, riferimento_id, note, operatore)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(modulo_id, asin, tipo, quantita, riferimento_tipo ?? null, riferimento_id ?? null, note ?? null, operatore ?? "system");

  db.prepare(`
    UPDATE moduli_prodotti
    SET quantita   = MAX(0, quantita + ?),
        updated_at = datetime('now','localtime')
    WHERE modulo_id = ? AND asin = ?
  `).run(quantita, modulo_id, asin);

  // Verifica sotto-soglia e crea/auto-cancella alert
  checkSottoSogliaModulo(db, modulo_id, asin);
}

// Middleware: risolve req.modulo da slug, restituisce 404 se non esiste
function loadModulo(req, res, next) {
  const db = getDb();
  const m = getModuloBySlug(db, req.params.slug);
  if (!m) return res.status(404).json({ error: `Modulo '${req.params.slug}' non trovato` });
  req.modulo = m;
  next();
}

// ══════════════════════════════════════════════
// MODULI CUSTOM — GESTIONE METADATI
// ══════════════════════════════════════════════

// GET /api/v2/moduli  — lista tutti i moduli custom
router.get("/", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM moduli_prodotti WHERE modulo_id = m.id) AS num_prodotti,
        (SELECT COUNT(*) FROM moduli_ordini   WHERE modulo_id = m.id) AS num_ordini
      FROM moduli_custom m
      ORDER BY m.created_at ASC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/moduli — crea nuovo modulo
// Body: { slug, label, icona?, stile_codice?, colore? }
router.post("/", validate({ body: moduloCreateSchema }), (req, res) => {
  try {
    const { slug, label, icona, stile_codice, colore } = req.body;
    const db = getDb();
    const exists = db.prepare("SELECT id FROM moduli_custom WHERE slug = ?").get(slug);
    if (exists) return res.status(409).json({ error: "slug già esistente" });

    const result = db.prepare(`
      INSERT INTO moduli_custom (slug, label, icona, stile_codice, colore)
      VALUES (?, ?, ?, ?, ?)
    `).run(slug, label, icona, stile_codice, colore);

    const m = db.prepare("SELECT * FROM moduli_custom WHERE id = ?").get(result.lastInsertRowid);
    res.json(m);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/moduli/:slug — info singolo modulo
router.get("/:slug", loadModulo, (req, res) => res.json(req.modulo));

// PATCH /api/v2/moduli/:slug — aggiorna metadati modulo
router.patch("/:slug", validate({ params: slugParam, body: moduloPatchSchema }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    const { label, icona, stile_codice, colore } = req.body;
    db.prepare(`
      UPDATE moduli_custom
      SET label        = COALESCE(?, label),
          icona        = COALESCE(?, icona),
          stile_codice = COALESCE(?, stile_codice),
          colore       = COALESCE(?, colore)
      WHERE id = ?
    `).run(label ?? null, icona ?? null, stile_codice ?? null, colore ?? null, req.modulo.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v2/moduli/:slug — elimina modulo + tutti i dati (CASCADE)
// Body: { conferma: "RESET" }
router.delete("/:slug", validate({ params: slugParam, body: moduloDeleteSchema }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM moduli_custom WHERE id = ?").run(req.modulo.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// PRODOTTI
// ══════════════════════════════════════════════

// GET /api/v2/moduli/:slug/prodotti
router.get("/:slug/prodotti", loadModulo, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        p.*,
        COALESCE(arrivi.qta_in_arrivo, 0) AS qta_in_arrivo,
        arrivi.prima_consegna,
        COALESCE(arrivi.num_ordini, 0) AS num_ordini_in_arrivo
      FROM moduli_prodotti p
      LEFT JOIN (
        SELECT
          r.asin,
          o.modulo_id,
          SUM(r.quantita_ordinata - COALESCE(r.quantita_ricevuta, 0)) AS qta_in_arrivo,
          MIN(o.data_consegna_prevista) AS prima_consegna,
          COUNT(DISTINCT o.id) AS num_ordini
        FROM moduli_ordini_righe r
        JOIN moduli_ordini o ON o.id = r.id_ordine
        WHERE o.stato IN ('confermato','in_attesa','ricevuto_parziale')
          AND (r.quantita_ordinata - COALESCE(r.quantita_ricevuta, 0)) > 0
        GROUP BY r.asin, o.modulo_id
      ) AS arrivi ON arrivi.asin = p.asin AND arrivi.modulo_id = p.modulo_id
      WHERE p.modulo_id = ?
      ORDER BY p.codice_colore ASC
    `).all(req.modulo.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/moduli/:slug/prodotti/disponibili
router.get("/:slug/prodotti/disponibili", loadModulo, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT p.asin, p.nome, p.sku, p.immagine_main AS image_url
      FROM prodotti p
      WHERE p.asin NOT IN (SELECT asin FROM moduli_prodotti WHERE modulo_id = ?)
        AND p.asin IS NOT NULL AND p.asin != ''
      ORDER BY p.nome ASC
    `).all(req.modulo.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/moduli/:slug/prodotti — aggiungi/upsert ASIN
router.post("/:slug/prodotti", validate({ params: slugParam, body: prodottoCreateSchema }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    const { asin, sku, codice_colore, nome, image_url, soglia_minima = 10 } = req.body;

    db.prepare(`
      INSERT INTO moduli_prodotti (modulo_id, asin, sku, codice_colore, nome, image_url, soglia_minima)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(modulo_id, asin) DO UPDATE SET
        sku = excluded.sku, codice_colore = excluded.codice_colore,
        nome = excluded.nome, image_url = excluded.image_url,
        soglia_minima = excluded.soglia_minima,
        updated_at = datetime('now','localtime')
    `).run(req.modulo.id, asin, sku ?? null, codice_colore ?? null, nome ?? null, image_url ?? null, soglia_minima);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v2/moduli/:slug/prodotti/:asin
router.patch("/:slug/prodotti/:asin", validate({ params: slugAsinParam, body: prodottoPatchSchema }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    const { codice_colore, soglia_minima } = req.body;
    db.prepare(`
      UPDATE moduli_prodotti
      SET codice_colore = COALESCE(?, codice_colore),
          soglia_minima = COALESCE(?, soglia_minima),
          updated_at    = datetime('now','localtime')
      WHERE modulo_id = ? AND asin = ?
    `).run(codice_colore ?? null, soglia_minima ?? null, req.modulo.id, req.params.asin);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v2/moduli/:slug/prodotti/:asin
router.delete("/:slug/prodotti/:asin", validate({ params: slugAsinParam }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM moduli_prodotti WHERE modulo_id = ? AND asin = ?").run(req.modulo.id, req.params.asin);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/moduli/:slug/rettifica
router.post("/:slug/rettifica", validate({ params: slugParam, body: rettificaSchema }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    const { asin, nuova_quantita, note, operatore = "ufficio" } = req.body;
    const prod = db.prepare("SELECT * FROM moduli_prodotti WHERE modulo_id = ? AND asin = ?").get(req.modulo.id, asin);
    if (!prod) return res.status(404).json({ error: "Prodotto non trovato" });
    const delta = Number(nuova_quantita) - Number(prod.quantita);
    applicaMovimento(db, {
      modulo_id: req.modulo.id, asin, tipo: "RETTIFICA", quantita: delta,
      note: note ?? `Rettifica: ${prod.quantita} → ${nuova_quantita}`, operatore
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// ORDINI
// ══════════════════════════════════════════════

// GET /api/v2/moduli/:slug/ordini
router.get("/:slug/ordini", loadModulo, (req, res) => {
  try {
    const db = getDb();
    const ordini = db.prepare(`
      SELECT o.*,
        (SELECT COUNT(*) FROM moduli_ordini_righe WHERE id_ordine = o.id) AS num_righe,
        (SELECT COALESCE(SUM(quantita_ordinata),0) FROM moduli_ordini_righe WHERE id_ordine = o.id) AS tot_ordinato
      FROM moduli_ordini o
      WHERE o.modulo_id = ?
      ORDER BY o.created_at DESC
    `).all(req.modulo.id);

    const stmtRighe = db.prepare(`
      SELECT r.*, p.nome, p.image_url, p.codice_colore
      FROM moduli_ordini_righe r
      LEFT JOIN moduli_prodotti p ON p.asin = r.asin AND p.modulo_id = ?
      WHERE r.id_ordine = ?
    `);
    for (const o of ordini) o.righe = stmtRighe.all(req.modulo.id, o.id);
    res.json(ordini);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/moduli/:slug/ordini/in-arrivo
router.get("/:slug/ordini/in-arrivo", loadModulo, (req, res) => {
  try {
    const db = getDb();
    const ordini = db.prepare(`
      SELECT o.* FROM moduli_ordini o
      WHERE o.modulo_id = ? AND o.stato IN ('confermato','in_attesa','ricevuto_parziale')
      ORDER BY o.data_consegna_prevista ASC
    `).all(req.modulo.id);

    const stmtRighe = db.prepare(`
      SELECT r.*, p.nome, p.image_url, p.codice_colore
      FROM moduli_ordini_righe r
      LEFT JOIN moduli_prodotti p ON p.asin = r.asin AND p.modulo_id = ?
      WHERE r.id_ordine = ?
    `);
    for (const o of ordini) o.righe = stmtRighe.all(req.modulo.id, o.id);
    res.json(ordini);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/moduli/:slug/ordini — crea ordine
router.post("/:slug/ordini", validate({ params: slugParam, body: ordineCreateSchema }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    const { fornitore, data_consegna_prevista, note, operatore, righe = [] } = req.body;

    let idOrdine;
    db.transaction(() => {
      const r = db.prepare(`
        INSERT INTO moduli_ordini (modulo_id, fornitore, data_consegna_prevista, note, operatore)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.modulo.id, fornitore, data_consegna_prevista ?? null, note ?? null, operatore);
      idOrdine = r.lastInsertRowid;

      const stmt = db.prepare(`
        INSERT INTO moduli_ordini_righe (id_ordine, asin, quantita_ordinata)
        VALUES (?, ?, ?)
      `);
      for (const riga of righe) stmt.run(idOrdine, riga.asin, riga.quantita_ordinata);
    })();
    res.json({ ok: true, id: idOrdine });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v2/moduli/:slug/ordini/:id
router.patch("/:slug/ordini/:id", validate({ params: slugIdParam, body: ordinePatchSchema }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    const { stato, fornitore, data_consegna_prevista, note } = req.body;
    db.prepare(`
      UPDATE moduli_ordini
      SET stato                  = COALESCE(?, stato),
          fornitore              = COALESCE(?, fornitore),
          data_consegna_prevista = COALESCE(?, data_consegna_prevista),
          note                   = COALESCE(?, note),
          updated_at             = datetime('now','localtime')
      WHERE id = ? AND modulo_id = ?
    `).run(stato ?? null, fornitore ?? null, data_consegna_prevista ?? null, note ?? null, req.params.id, req.modulo.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/moduli/:slug/ordini/:id/righe
router.post("/:slug/ordini/:id/righe", validate({ params: slugIdParam, body: rigaCreateSchema }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    const { asin, quantita_ordinata } = req.body;
    const result = db.prepare(`
      INSERT INTO moduli_ordini_righe (id_ordine, asin, quantita_ordinata)
      VALUES (?, ?, ?)
    `).run(req.params.id, asin, quantita_ordinata);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v2/moduli/:slug/ordini/:id/righe/:rigaId
router.delete("/:slug/ordini/:id/righe/:rigaId", validate({ params: slugIdRigaParam }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM moduli_ordini_righe WHERE id = ? AND id_ordine = ?").run(req.params.rigaId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/moduli/:slug/ordini/:id/ricevi  — IDEMPOTENTE (calcolo su delta)
router.post("/:slug/ordini/:id/ricevi", validate({ params: slugIdParam, body: riceviSchema }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    const { operatore = "magazzino", righe = [] } = req.body;
    const idOrdine = Number(req.params.id);

    const ordine = db.prepare("SELECT id, stato FROM moduli_ordini WHERE id = ? AND modulo_id = ?").get(idOrdine, req.modulo.id);
    if (!ordine) return res.status(404).json({ error: "Ordine non trovato" });
    if (["ricevuto", "annullato"].includes(ordine.stato)) {
      return res.status(409).json({ error: `Ordine già in stato '${ordine.stato}', operazione non consentita` });
    }

    let modifiche = 0, movimentiApplicati = 0;

    db.transaction(() => {
      const righeOrdine = db.prepare("SELECT * FROM moduli_ordini_righe WHERE id_ordine = ?").all(idOrdine);
      const rigaById = new Map(righeOrdine.map(r => [r.id, r]));

      for (const r of righe) {
        const qtaNuova = Number(r.quantita_ricevuta);
        if (isNaN(qtaNuova) || qtaNuova < 0) continue;
        const riga = rigaById.get(Number(r.id_riga));
        if (!riga) continue;

        const qtaCapped = Math.min(qtaNuova, riga.quantita_ordinata);
        const qtaPrec = Number(riga.quantita_ricevuta ?? 0);
        const delta = qtaCapped - qtaPrec;
        const statoRiga = qtaCapped >= riga.quantita_ordinata ? "ricevuto" : qtaCapped > 0 ? "parziale" : "in_attesa";

        if (delta !== 0 || statoRiga !== riga.stato) {
          db.prepare(`UPDATE moduli_ordini_righe SET quantita_ricevuta = ?, stato = ? WHERE id = ?`)
            .run(qtaCapped, statoRiga, riga.id);
          modifiche++;
          riga.quantita_ricevuta = qtaCapped;
          riga.stato = statoRiga;
        }

        if (delta !== 0) {
          applicaMovimento(db, {
            modulo_id: req.modulo.id,
            asin: riga.asin, tipo: "CARICO_ORDINE", quantita: delta,
            riferimento_tipo: "ordine", riferimento_id: idOrdine,
            note: delta > 0 ? `Ricezione ordine #${idOrdine}` : `Correzione ricezione ordine #${idOrdine}`,
            operatore
          });
          movimentiApplicati++;
        }
      }

      let tutteRicevute = true;
      for (const riga of righeOrdine) {
        if ((riga.quantita_ricevuta ?? 0) < riga.quantita_ordinata) { tutteRicevute = false; break; }
      }
      const nuovoStato = tutteRicevute ? "ricevuto" : "ricevuto_parziale";
      if (nuovoStato !== ordine.stato) {
        db.prepare(`UPDATE moduli_ordini SET stato = ?, updated_at = datetime('now','localtime') WHERE id = ?`)
          .run(nuovoStato, idOrdine);
      }
    })();

    res.json({ ok: true, modifiche, movimentiApplicati });
  } catch (err) {
    logger.error({ err }, "/moduli/:slug/ordini/:id/ricevi");
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// MOVIMENTI
// ══════════════════════════════════════════════

// GET /api/v2/moduli/:slug/movimenti?asin=&tipo=&limit=500
router.get("/:slug/movimenti", loadModulo, (req, res) => {
  try {
    const db = getDb();
    const { asin, tipo, limit = 500 } = req.query;
    const conds = ["m.modulo_id = ?"];
    const params = [req.modulo.id];
    if (asin) { conds.push("m.asin = ?"); params.push(asin); }
    if (tipo) { conds.push("m.tipo = ?"); params.push(tipo); }

    const rows = db.prepare(`
      SELECT m.*, p.nome, p.codice_colore, p.image_url
      FROM moduli_movimenti m
      LEFT JOIN moduli_prodotti p ON p.asin = m.asin AND p.modulo_id = m.modulo_id
      WHERE ${conds.join(" AND ")}
      ORDER BY m.created_at DESC
      LIMIT ?
    `).all(...params, Number(limit));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// RESET (svuota ordini, righe, movimenti, azzera stock)
// ══════════════════════════════════════════════
router.post("/:slug/reset", validate({ params: slugParam, body: resetSchema }), loadModulo, (req, res) => {
  try {
    const db = getDb();
    const stats = {};
    db.transaction(() => {
      stats.movimenti = db.prepare("DELETE FROM moduli_movimenti WHERE modulo_id = ?").run(req.modulo.id).changes;
      stats.righe     = db.prepare(`
        DELETE FROM moduli_ordini_righe WHERE id_ordine IN (SELECT id FROM moduli_ordini WHERE modulo_id = ?)
      `).run(req.modulo.id).changes;
      stats.ordini    = db.prepare("DELETE FROM moduli_ordini WHERE modulo_id = ?").run(req.modulo.id).changes;
      stats.stockAzzerato = db.prepare(
        "UPDATE moduli_prodotti SET quantita = 0, updated_at = datetime('now','localtime') WHERE modulo_id = ?"
      ).run(req.modulo.id).changes;
    })();
    res.json({ ok: true, eliminati: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// UPLOAD IMMAGINE MANUALE
// POST /api/v2/moduli/:slug/prodotti/:asin/immagine  (multipart, campo "immagine")
// ══════════════════════════════════════════════
router.post("/:slug/prodotti/:asin/immagine", validate({ params: slugAsinParam }), loadModulo, upload.single("immagine"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nessun file ricevuto" });
    const db = getDb();
    const imageUrl = `/moduli-images/${req.params.slug}/${req.file.filename}`;
    db.prepare(
      "UPDATE moduli_prodotti SET image_url = ?, updated_at = datetime('now','localtime') WHERE modulo_id = ? AND asin = ?"
    ).run(imageUrl, req.modulo.id, req.params.asin);
    res.json({ ok: true, image_url: imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// SYNC IMMAGINI da SP-API
// ══════════════════════════════════════════════
router.post("/:slug/sync-images", loadModulo, async (req, res) => {
  try {
    const db = getDb();
    const { getAccessToken } = require("../modules/auth/authService");
    const prodotti = db.prepare("SELECT asin FROM moduli_prodotti WHERE modulo_id = ?").all(req.modulo.id);
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
        const qs = new URLSearchParams({ marketplaceIds: MARKETPLACE_IT, includedData: "images" }).toString();
        const path2 = `/catalog/2022-04-01/items/${asin}?${qs}`;
        const signed = sign(
          { host: HOST, path: path2, service: "execute-api", region: process.env.AWS_REGION || "eu-west-1", method: "GET", headers: { "x-amz-access-token": access_token } },
          { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
        );
        const result = await axios.get(`${BASE_URL}${path2}`, { headers: signed.headers });
        const data = result.data?.payload ?? result.data;
        const imgsSet = data?.images?.[0]?.images ?? [];
        const mainImg = imgsSet.find(i => i.variant === "MAIN") ?? imgsSet[0];
        if (mainImg?.link) {
          db.prepare("UPDATE moduli_prodotti SET image_url = ?, updated_at = datetime('now','localtime') WHERE modulo_id = ? AND asin = ?")
            .run(mainImg.link, req.modulo.id, asin);
          aggiornati++;
        }
        await sleep(800);
      } catch (e) {
        errori.push(asin);
        if (e.response?.status === 429) await sleep(5000);
      }
    }
    res.json({ ok: true, aggiornati, totale: prodotti.length, errori });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
