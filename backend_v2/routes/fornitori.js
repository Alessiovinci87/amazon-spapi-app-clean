// backend_v2/routes/fornitori.js

const express = require("express");
const { z } = require("zod");
const router = express.Router();
const { getDb } = require("../db/database");
const { validate } = require("../middleware/validate");
const logger = require("../utils/logger");

// ===== Schemas =====
const idParam = z.object({ id: z.coerce.number().int().positive() });
const idOrdineParam = z.object({ idOrdine: z.coerce.number().int().positive() });
const idFornitoreParam = z.object({ idFornitore: z.coerce.number().int().positive() });

const fornitoreBodySchema = z.object({
  nome: z.string().min(1, "Il nome del fornitore è obbligatorio").max(200),
  partitaIva: z.string().max(50).nullish(),
  indirizzo: z.string().max(500).nullish(),
  email: z.string().max(200).nullish(),
  telefono: z.string().max(50).nullish(),
});

const fornitorePatchSchema = fornitoreBodySchema.partial();

const ordineProdottoSchema = z.object({
  id_sfuso: z.coerce.number().int().positive().nullish(),
  asin: z.string().max(50).nullish(),
  quantita_litri: z.coerce.number().nonnegative().optional(),
}).passthrough();

const creaOrdineSchema = z.object({
  prodotti: z.array(ordineProdottoSchema).min(1, "Nessun prodotto fornito per l'ordine"),
  stato: z.string().max(50).default("In attesa"),
  dataOrdine: z.string().max(50).nullish(),
  note: z.string().max(1000).nullish(),
  consegna_prevista: z.string().max(50).nullish(),
  consegnaPrevista: z.string().max(50).nullish(),
});

const riceviOrdineSchema = z.object({
  quantita_ricevuta: z.coerce.number().positive().nullish(),
  lotto: z.string().max(100).nullish(),
  data_scadenza: z.string().max(50).nullish(),
  operatore: z.string().max(100).nullish(),
  numero_ddt: z.string().max(100).nullish(),
  data_ricezione: z.string().max(50).nullish(),
});

/* ============================================================
   📋 ORDINE CORRETTO DELLE ROTTE
   1. Rotte specifiche (senza parametri dinamici)
   2. Rotte DELETE /ordini/:idOrdine
   3. Rotte generali /:id/...
============================================================ */

/* =============================
   🧾 GET - Tutti gli ordini fornitori
============================= */
router.get("/ordini-tutti", (req, res) => {
  try {
    const db = getDb();
    const query = `
      SELECT 
        o.id,
        o.id_fornitore,
        f.nome AS fornitore,
        o.id_sfuso,
        s.nome_prodotto,
        s.formato,
        o.asin,
        o.quantita_litri AS quantita,
        COALESCE(fp.prezzo, 0) AS prezzo_litro,
        o.stato,
        o.data_ordine AS dataOrdine,
        o.data_consegna_prevista AS dataPrevista,
        o.data_consegna_effettiva AS dataEffettiva,
        o.note
      FROM ordini_fornitori o
      LEFT JOIN fornitori f           ON f.id = o.id_fornitore
      LEFT JOIN sfuso s               ON s.id = o.id_sfuso
      LEFT JOIN fornitori_prodotti fp ON fp.id_fornitore = o.id_fornitore AND fp.id_sfuso = o.id_sfuso
      ORDER BY o.data_ordine DESC;
    `;
    const ordini = db.prepare(query).all();
    res.json(ordini || []);
  } catch (err) {
    logger.error({ err }, "Errore caricamento ordini");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

/* =============================
   🗑️ DELETE - Elimina un singolo ordine
============================= */
router.delete("/ordini/:idOrdine", validate({ params: idOrdineParam }), (req, res) => {
  try {
    const db = getDb();
    const { idOrdine } = req.params;
    const ordine = db.prepare("SELECT * FROM ordini_fornitori WHERE id = ?").get(idOrdine);
    if (!ordine) return res.status(404).json({ ok: false, message: "Ordine non trovato" });

    db.prepare("DELETE FROM ordini_fornitori WHERE id = ?").run(idOrdine);

    // 🔄 Aggiorna litri_in_arrivo se ordine era in attesa
    if (ordine.stato === "In attesa" && ordine.id_sfuso) {
      db.prepare(`
        UPDATE sfuso
        SET litri_in_arrivo = MAX(litri_in_arrivo - ?, 0)
        WHERE id = ?
      `).run(ordine.quantita_litri, ordine.id_sfuso);
    }

    res.json({ ok: true, message: "Ordine eliminato correttamente" });
  } catch (err) {
    logger.error({ err }, "Errore eliminazione ordine");
    res.status(500).json({ ok: false, message: "Errore durante l'eliminazione dell'ordine." });
  }
});

/* =============================
   ✅ PATCH - Conferma ricezione singolo ordine
   Aggiorna stock sfuso, registra movimento, segna come Consegnato
============================= */
router.patch("/ordini/:idOrdine/ricevi", validate({ params: idOrdineParam, body: riceviOrdineSchema }), (req, res) => {
  try {
    const db = getDb();
    const { idOrdine } = req.params;
    const { quantita_ricevuta, lotto, data_scadenza, operatore, numero_ddt, data_ricezione } = req.body;

    const ordine = db.prepare("SELECT * FROM ordini_fornitori WHERE id = ?").get(idOrdine);
    if (!ordine) return res.status(404).json({ ok: false, message: "Ordine non trovato" });
    if (ordine.stato === "Consegnato") {
      return res.status(400).json({ ok: false, message: "Ordine già consegnato." });
    }

    // Quantità ricevuta: se non specificata, usa quella ordinata
    const qtaRicevuta = quantita_ricevuta != null ? Number(quantita_ricevuta) : Number(ordine.quantita_litri);
    if (isNaN(qtaRicevuta) || qtaRicevuta <= 0) {
      return res.status(400).json({ ok: false, message: "Quantità ricevuta non valida." });
    }

    const qtaOriginale = Number(ordine.quantita_litri);
    const isParziale = qtaRicevuta < qtaOriginale;
    const dataRicezioneDb = data_ricezione || new Date().toISOString().slice(0, 10);

    const transaction = db.transaction(() => {
      // 1. Segna ordine come consegnato (o parz. consegnato)
      db.prepare(`
        UPDATE ordini_fornitori
        SET stato = 'Consegnato',
            quantita_ricevuta = ?,
            data_consegna_effettiva = ?
        WHERE id = ?
      `).run(qtaRicevuta, dataRicezioneDb, idOrdine);

      // 2. Se parziale, crea nuovo ordine per il residuo
      if (isParziale) {
        const residuo = qtaOriginale - qtaRicevuta;
        db.prepare(`
          INSERT INTO ordini_fornitori
          (id_fornitore, id_sfuso, asin, quantita_litri, stato, data_ordine, note, data_consegna_prevista)
          VALUES (?, ?, ?, ?, 'In attesa', datetime('now','localtime'), ?, ?)
        `).run(
          ordine.id_fornitore,
          ordine.id_sfuso,
          ordine.asin,
          residuo,
          `Residuo ordine #${idOrdine} (${qtaRicevuta}/${qtaOriginale}L ricevuti)`,
          ordine.data_consegna_prevista
        );
      }

      // 3. Aggiorna stock sfuso
      if (ordine.id_sfuso) {
        db.prepare(`
          UPDATE sfuso
          SET litri_disponibili = litri_disponibili + ?,
              litri_in_arrivo = MAX(litri_in_arrivo - ?, 0),
              updated_at = datetime('now','localtime')
          WHERE id = ?
        `).run(qtaRicevuta, qtaRicevuta, ordine.id_sfuso);

        // 4. Aggiorna lotto e data_scadenza se forniti
        if (lotto) {
          db.prepare("UPDATE sfuso SET lotto = ? WHERE id = ?").run(lotto, ordine.id_sfuso);
        }
        if (data_scadenza) {
          db.prepare("UPDATE sfuso SET data_scadenza = ? WHERE id = ?").run(data_scadenza, ordine.id_sfuso);
        }

        // 5. Registra movimento storico
        const fornitore = db.prepare("SELECT nome FROM fornitori WHERE id = ?").get(ordine.id_fornitore);
        const sfuso = db.prepare("SELECT formato, nome_prodotto FROM sfuso WHERE id = ?").get(ordine.id_sfuso);

        const ddtNote = numero_ddt ? `DDT ${numero_ddt} — ` : "";
        db.prepare(`
          INSERT INTO sfuso_movimenti
          (id_sfuso, nome_prodotto, formato, lotto, fornitore, tipo, quantita, operatore, note, data_scadenza)
          VALUES (?, ?, ?, ?, ?, 'CARICO DDT', ?, ?, ?, ?)
        `).run(
          ordine.id_sfuso,
          sfuso?.nome_prodotto || null,
          sfuso?.formato || null,
          lotto || null,
          fornitore?.nome || null,
          qtaRicevuta,
          operatore || "system",
          `${ddtNote}Ricezione ordine #${idOrdine}${isParziale ? ` (parziale: ${qtaRicevuta}/${qtaOriginale}L)` : ""}`,
          data_scadenza || null
        );
      }
    });

    transaction();

    const updated = db.prepare(`
      SELECT o.*, f.nome AS fornitore, s.nome_prodotto, s.formato, s.litri_disponibili
      FROM ordini_fornitori o
      LEFT JOIN fornitori f ON f.id = o.id_fornitore
      LEFT JOIN sfuso s ON s.id = o.id_sfuso
      WHERE o.id = ?
    `).get(idOrdine);

    res.json({ ok: true, message: isParziale ? `Ricezione parziale: ${qtaRicevuta}L ricevuti, ${qtaOriginale - qtaRicevuta}L in attesa` : "Ricezione confermata", ordine: updated });
  } catch (err) {
    logger.error({ err }, "Errore ricezione ordine");
    res.status(500).json({ ok: false, message: "Errore durante la ricezione." });
  }
});

/* =============================
   📦 GET - Elenco fornitori
============================= */
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const fornitori = db.prepare("SELECT * FROM fornitori ORDER BY nome ASC").all();
    res.json(fornitori);
  } catch (err) {
    logger.error({ err }, "Errore caricamento fornitori");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

/* =============================
   📄 GET - Ordini per ID sfuso
   GET /api/v2/sfuso/:idSfuso/ordini
============================= */
router.get("/sfuso/:idSfuso/ordini", (req, res) => {
  try {
    const db = getDb();
    const { idSfuso } = req.params;
    const query = `
      SELECT
        o.id,
        o.id_sfuso,
        s.nome_prodotto,
        s.formato,
        f.nome AS fornitore_nome,
        o.quantita_litri,
        o.quantita_ricevuta,
        o.stato,
        o.data_ordine,
        o.data_consegna_prevista,
        o.data_consegna_effettiva
      FROM ordini_fornitori o
      LEFT JOIN sfuso s ON s.id = o.id_sfuso
      LEFT JOIN fornitori f ON f.id = o.id_fornitore
      WHERE o.id_sfuso = ?
      ORDER BY o.data_ordine DESC;
    `;
    const ordini = db.prepare(query).all(idSfuso);
    res.json(ordini || []);
  } catch (err) {
    logger.error({ err }, "Errore caricamento ordini per sfuso");
    res.status(500).json({ ok: false, error: "Errore caricamento ordini per sfuso" });
  }
});


/* =============================
   🧴 GET - Prodotti di un fornitore
============================= */
/* =============================
   🧴 GET - Prodotti di un fornitore
============================= */
router.get("/:id/prodotti", (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const query = `
      SELECT 
        fp.id AS id_associazione,
        fp.id_fornitore,
        fp.id_sfuso,                    -- 👈 campo che serve al frontend
        s.nome_prodotto AS nome,
        s.formato,
        COALESCE(fp.prezzo, 0) AS prezzo,
        fp.note
      FROM fornitori_prodotti fp
      JOIN sfuso s ON s.id = fp.id_sfuso
      WHERE fp.id_fornitore = ?
      ORDER BY s.nome_prodotto ASC;
    `;
    const righe = db.prepare(query).all(id);

    const prodotti = righe.map((r) => ({
      id_associazione: r.id_associazione,
      id_fornitore: r.id_fornitore,
      id_sfuso: r.id_sfuso,        // ✅ aggiunto esplicitamente
      nome: r.nome,
      formato: r.formato,
      prezzo: r.prezzo,
      note: r.note
    }));

    res.json(prodotti || []);
  } catch (err) {
    logger.error({ err }, "Errore caricamento prodotti fornitore");
    res.status(500).json({ error: "Errore server" });
  }
});


/* =============================
   ➕ POST - Aggiungi nuovo fornitore
============================= */
router.post("/", validate({ body: fornitoreBodySchema }), (req, res) => {
  try {
    const db = getDb();
    const { nome, partitaIva, indirizzo, email, telefono } = req.body;

    const result = db
      .prepare(`
        INSERT INTO fornitori (nome, partitaIva, indirizzo, email, telefono)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(nome, partitaIva, indirizzo, email, telefono);

    res.json({ ok: true, id: result.lastInsertRowid, message: "Fornitore aggiunto correttamente" });
  } catch (err) {
    logger.error({ err }, "Errore salvataggio fornitore");
    res.status(500).json({ error: "Errore durante il salvataggio" });
  }
});

/* =============================
   🧾 POST - Crea nuovo ordine multiprodotto
============================= */
router.post("/:idFornitore/ordini", validate({ params: idFornitoreParam, body: creaOrdineSchema }), (req, res) => {
  try {
    const db = getDb();
    const { idFornitore } = req.params;
    const {
      prodotti = [],
      stato = "In attesa",
      dataOrdine,
      note,
      consegna_prevista,
      consegnaPrevista
    } = req.body;

    const dataConsegnaPrevista = consegna_prevista || consegnaPrevista || null;
    if (!Array.isArray(prodotti) || prodotti.length === 0) {
      return res.status(400).json({ error: "Nessun prodotto fornito per l'ordine" });
    }

    const insertStmt = db.prepare(`
  INSERT INTO ordini_fornitori 
  (id_fornitore, id_sfuso, asin, quantita_litri, stato, data_ordine, note, data_consegna_prevista)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

    const dataOrdineEffettiva = dataOrdine || new Date().toISOString();
    const transaction = db.transaction(() => {
      for (const p of prodotti) {
        const quantita = Number(p.quantita || p.quantita_litri || 0);
        insertStmt.run(
          idFornitore,
          p.id_sfuso || null,         // ✅ salva l'id_sfuso
          p.asin || null,             // ✅ asin per sicurezza
          Number(p.quantita || p.quantita_litri || 0),
          stato || "In attesa",
          dataOrdineEffettiva,
          note || null,
          dataConsegnaPrevista
        );

        // 🔄 Aggiorna sfuso
        if (p.id_sfuso) {
          if (stato === "Consegnato") {
            db.prepare(`
      UPDATE sfuso 
      SET litri_disponibili = litri_disponibili + ?
      WHERE id = ?
    `).run(quantita, p.id_sfuso);
          } else {
            // ✅ imposta sempre l'ultimo fornitore dell'ordine
            db.prepare(`
      UPDATE sfuso
      SET litri_in_arrivo = litri_in_arrivo + ?,
          fornitore = (SELECT nome FROM fornitori WHERE id = ?)
      WHERE id = ?
    `).run(quantita, idFornitore, p.id_sfuso);
          }
        }
      }
    });

    transaction();
    res.json({ ok: true, message: "Ordine fornitore inserito correttamente" });
  } catch (err) {
    logger.error({ err }, "Errore inserimento ordine fornitore");
    res.status(500).json({ error: "Errore durante l'inserimento ordine fornitore" });
  }
});

/* =============================
   📦 GET - Ordini per fornitore specifico
============================= */
router.get("/:id/ordini", (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const query = `
  SELECT 
    o.id,
    o.id_sfuso,
    s.id AS id_sfuso_real,
    COALESCE(s.nome_prodotto, 'Prodotto sconosciuto') AS nome_prodotto,
    COALESCE(s.formato, '-') AS formato,
    f.nome AS fornitore,
    COALESCE(fp.prezzo, 0) AS prezzo_litro,
    o.quantita_litri,
    o.stato,
    o.data_ordine,
    o.data_consegna_prevista,
    o.data_consegna_effettiva,
    o.note
  FROM ordini_fornitori o
  LEFT JOIN fornitori f 
    ON f.id = o.id_fornitore
  LEFT JOIN sfuso s 
    ON s.id = o.id_sfuso         -- ✅ collegamento diretto con tabella sfuso
  LEFT JOIN fornitori_prodotti fp 
    ON fp.id_fornitore = o.id_fornitore 
    AND fp.id_sfuso = o.id_sfuso -- ✅ eventuale prezzo fornitore
  WHERE o.id_fornitore = ?
  ORDER BY s.nome_prodotto ASC, o.data_ordine DESC;
`;


    const ordini = db.prepare(query).all(id);
    res.json(ordini || []);
  } catch (err) {
    logger.error({ err }, "Errore caricamento ordini per fornitore");
    res.status(500).json({ error: "Errore durante il caricamento ordini fornitore" });
  }
});

/* =============================
   🔎 GET - Ordini per ASIN
============================= */
router.get("/ordini/asin/:asin", (req, res) => {
  try {
    const db = getDb();
    const { asin } = req.params;
    const query = `
      SELECT 
        o.id,
        o.asin,
        s.nome_prodotto,
        s.formato,
        o.quantita_litri AS quantita,
        o.stato,
        o.data_consegna_prevista AS dataPrevista,
        o.data_consegna_effettiva AS dataEffettiva,
        f.nome AS fornitore
      FROM ordini_fornitori o
      LEFT JOIN sfuso s ON s.id = o.id_sfuso
      LEFT JOIN fornitori f ON f.id = o.id_fornitore
      WHERE o.asin = ?
      ORDER BY 
        CASE 
          WHEN o.stato = 'In attesa' THEN 1 
          WHEN o.stato = 'Consegnato' THEN 2 
          ELSE 3 
        END,
        o.data_ordine DESC;
    `;
    const ordini = db.prepare(query).all(asin);
    const ordineAttivo = ordini.find(o => o.stato === "In attesa") || ordini[0];
    if (!ordineAttivo) return res.json(null);

    res.json({
      fornitore: ordineAttivo.fornitore || "-",
      dataPrevista: ordineAttivo.dataPrevista || "-",
      quantita: ordineAttivo.quantita || 0
    });
  } catch (err) {
    logger.error({ err }, "Errore caricamento ordini per ASIN");
    res.status(500).json({ error: "Errore durante il caricamento ordini fornitore" });
  }
});

/* =============================
   ✏️ PATCH - Modifica fornitore
============================= */
router.patch("/:id", validate({ params: idParam, body: fornitorePatchSchema }), (req, res) => {
  try {
    const { id } = req.params;
    const { nome, partitaIva, indirizzo, email, telefono } = req.body;
    const db = getDb();
    const fornitore = db.prepare("SELECT * FROM fornitori WHERE id = ?").get(id);
    if (!fornitore) return res.status(404).json({ ok: false, message: "Fornitore non trovato" });

    db.prepare(`
      UPDATE fornitori 
      SET nome = ?, partitaIva = ?, indirizzo = ?, email = ?, telefono = ?
      WHERE id = ?
    `).run(
      nome || fornitore.nome,
      partitaIva || fornitore.partitaIva,
      indirizzo || fornitore.indirizzo,
      email || fornitore.email,
      telefono || fornitore.telefono,
      id
    );

    res.json({ ok: true, message: "Fornitore aggiornato correttamente" });
  } catch (err) {
    logger.error({ err }, "Errore aggiornamento fornitore");
    res.status(500).json({ ok: false, message: "Errore durante l'aggiornamento" });
  }
});

/* =============================
   🗑️ DELETE - Elimina tutti gli ordini di un fornitore
============================= */
router.delete("/:id/ordini", validate({ params: idParam }), (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) AS c FROM ordini_fornitori WHERE id_fornitore = ?").get(id)?.c || 0;
    db.prepare("DELETE FROM ordini_fornitori WHERE id_fornitore = ?").run(id);
    res.json({ ok: true, message: `Eliminati ${count} ordini del fornitore`, count });
  } catch (err) {
    logger.error({ err }, "Errore eliminazione ordini del fornitore");
    res.status(500).json({ ok: false, message: "Errore durante l'eliminazione degli ordini." });
  }
});

module.exports = router;
