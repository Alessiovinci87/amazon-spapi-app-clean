// backend_v2/routes/fornitori.js
console.log("✅ File fornitori.js caricato correttamente");

const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

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
    console.error("❌ Errore caricamento ordini:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   🗑️ DELETE - Elimina un singolo ordine
============================= */
router.delete("/ordini/:idOrdine", (req, res) => {
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
    console.error("❌ Errore eliminazione ordine:", err);
    res.status(500).json({ ok: false, message: err.message });
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
    console.error("❌ Errore caricamento fornitori:", err);
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
        o.stato,
        o.data_ordine
      FROM ordini_fornitori o
      LEFT JOIN sfuso s ON s.id = o.id_sfuso
      LEFT JOIN fornitori f ON f.id = o.id_fornitore
      WHERE o.id_sfuso = ?
      ORDER BY o.data_ordine DESC;
    `;
    const ordini = db.prepare(query).all(idSfuso);
    res.json({ ok: true, ordini });
  } catch (err) {
    console.error("❌ Errore caricamento ordini per sfuso:", err);
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

    console.log("📦 Prodotti restituiti al frontend:", prodotti);
    res.json(prodotti || []);
  } catch (err) {
    console.error("❌ Errore caricamento prodotti fornitore:", err);
    res.status(500).json({ error: "Errore server" });
  }
});


/* =============================
   ➕ POST - Aggiungi nuovo fornitore
============================= */
router.post("/", (req, res) => {
  try {
    const db = getDb();
    const { nome, partitaIva, indirizzo, email, telefono } = req.body;
    if (!nome)
      return res.status(400).json({ error: "Il nome del fornitore è obbligatorio" });

    const result = db
      .prepare(`
        INSERT INTO fornitori (nome, partitaIva, indirizzo, email, telefono)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(nome, partitaIva, indirizzo, email, telefono);

    res.json({ ok: true, id: result.lastInsertRowid, message: "Fornitore aggiunto correttamente" });
  } catch (err) {
    console.error("❌ Errore salvataggio fornitore:", err);
    res.status(500).json({ error: "Errore durante il salvataggio" });
  }
});

/* =============================
   🧾 POST - Crea nuovo ordine multiprodotto
============================= */
router.post("/:idFornitore/ordini", (req, res) => {
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
        console.log("🧾 INSERT ORDINE → id_sfuso:", p.id_sfuso, "quantità:", quantita);
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
    console.error("❌ Errore inserimento ordine fornitore:", err);
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
    console.log("🧾 ORDINI RESTITUITI PER FORNITORE", id, ordini);
    res.json(ordini || []);
  } catch (err) {
    console.error("❌ Errore caricamento ordini per fornitore:", err);
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
    console.error("❌ Errore caricamento ordini per ASIN:", err);
    res.status(500).json({ error: "Errore durante il caricamento ordini fornitore" });
  }
});

/* =============================
   ✏️ PATCH - Modifica fornitore
============================= */
router.patch("/:id", (req, res) => {
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
    console.error("❌ Errore aggiornamento fornitore:", err);
    res.status(500).json({ ok: false, message: "Errore durante l'aggiornamento" });
  }
});

/* =============================
   🗑️ DELETE - Elimina tutti gli ordini di un fornitore
============================= */
router.delete("/:id/ordini", (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) AS c FROM ordini_fornitori WHERE id_fornitore = ?").get(id)?.c || 0;
    db.prepare("DELETE FROM ordini_fornitori WHERE id_fornitore = ?").run(id);
    res.json({ ok: true, message: `Eliminati ${count} ordini del fornitore`, count });
  } catch (err) {
    console.error("❌ Errore eliminazione ordini del fornitore:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
