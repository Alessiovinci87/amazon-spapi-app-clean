// backend_v2/ddt/ddtAssegnazioni.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const { espandiProdottiInRighe } = require("../utils/classificaProdotto");

/**
 * GET /api/v2/ddt/assegnazioni/:spedizioneId
 * Recupera le assegnazioni DDT per una spedizione
 */
router.get("/:spedizioneId", (req, res) => {
  try {
    const { spedizioneId } = req.params;
    const db = getDb();

    const assegnazioni = db
      .prepare(
        `SELECT * FROM ddt_assegnazioni 
         WHERE spedizione_id = ? 
         ORDER BY ddt_numero, id`
      )
      .all(spedizioneId);

    // Raggruppa per ddt_numero
    const perDDT = {};
    for (const a of assegnazioni) {
      if (!perDDT[a.ddt_numero]) {
        perDDT[a.ddt_numero] = [];
      }
      perDDT[a.ddt_numero].push(a);
    }

    res.json({
      ok: true,
      spedizioneId: parseInt(spedizioneId),
      assegnazioni,
      perDDT,
      ddtCount: Object.keys(perDDT).length,
    });
  } catch (err) {
    console.error("❌ Errore recupero assegnazioni:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/v2/ddt/assegnazioni/:spedizioneId/:ddtNumero
 * Recupera le righe assegnate a uno specifico DDT
 */
router.get("/:spedizioneId/:ddtNumero", (req, res) => {
  try {
    const { spedizioneId, ddtNumero } = req.params;
    const db = getDb();

    const righe = db
  .prepare(`
    SELECT r.id, r.spedizione_id, r.asin, 
           COALESCE(p.sku, r.sku) as sku,
           r.prodotto_nome, r.quantita
    FROM spedizioni_righe r
    LEFT JOIN prodotti p ON p.asin = r.asin
    WHERE r.spedizione_id = ?
  `)
  .all(spedizioneId);

    res.json({
      ok: true,
      spedizioneId: parseInt(spedizioneId),
      ddtNumero: parseInt(ddtNumero),
      righe,
    });
  } catch (err) {
    console.error("❌ Errore recupero righe DDT:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/v2/ddt/assegnazioni/:spedizioneId/crea
 * Crea le assegnazioni iniziali (tutti i prodotti al DDT 1)
 */
router.post("/:spedizioneId/crea", (req, res) => {
  try {
    const { spedizioneId } = req.params;
    const db = getDb();

    // Verifica se esistono già assegnazioni
    const existing = db
      .prepare("SELECT COUNT(*) as count FROM ddt_assegnazioni WHERE spedizione_id = ?")
      .get(spedizioneId);

    if (existing.count > 0) {
      return res.status(400).json({
        ok: false,
        error: "Assegnazioni già esistenti per questa spedizione",
      });
    }

    // Recupera le righe della spedizione
    const righe = db
      .prepare("SELECT * FROM spedizioni_righe WHERE spedizione_id = ?")
      .all(spedizioneId);

    if (!righe.length) {
      return res.status(404).json({
        ok: false,
        error: "Nessun prodotto trovato per questa spedizione",
      });
    }

    // Inserisci tutte le righe nel DDT 1
    const insert = db.prepare(
      `INSERT INTO ddt_assegnazioni 
       (spedizione_id, ddt_numero, riga_id, asin, sku, prodotto_nome, quantita)
       VALUES (?, 1, ?, ?, ?, ?, ?)`
    );

    const insertMany = db.transaction((righe) => {
      for (const r of righe) {
        insert.run(spedizioneId, r.id, r.asin, r.sku, r.prodotto_nome, r.quantita);
      }
    });

    insertMany(righe);

    res.json({
      ok: true,
      message: `Assegnazioni create: ${righe.length} prodotti assegnati a DDT 1`,
      count: righe.length,
    });
  } catch (err) {
    console.error("❌ Errore creazione assegnazioni:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/v2/ddt/assegnazioni/:spedizioneId/sposta
 * Sposta un prodotto da un DDT a un altro
 * Body: { assegnazioneId, nuovoDdtNumero }
 */
router.post("/:spedizioneId/sposta", (req, res) => {
  try {
    const { spedizioneId } = req.params;
    const { assegnazioneId, nuovoDdtNumero } = req.body;
    const db = getDb();

    const result = db
      .prepare(
        `UPDATE ddt_assegnazioni 
         SET ddt_numero = ? 
         WHERE id = ? AND spedizione_id = ?`
      )
      .run(nuovoDdtNumero, assegnazioneId, spedizioneId);

    if (result.changes === 0) {
      return res.status(404).json({ ok: false, error: "Assegnazione non trovata" });
    }

    res.json({
      ok: true,
      message: `Prodotto spostato a DDT ${nuovoDdtNumero}`,
    });
  } catch (err) {
    console.error("❌ Errore spostamento:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/v2/ddt/assegnazioni/:spedizioneId/dividi
 * Divide la quantità di un prodotto tra due DDT
 * Body: { assegnazioneId, quantitaDdt1, quantitaDdt2, nuovoDdtNumero }
 */
router.post("/:spedizioneId/dividi", (req, res) => {
  try {
    const { spedizioneId } = req.params;
    const { assegnazioneId, quantitaDdt1, quantitaDdt2, nuovoDdtNumero } = req.body;
    const db = getDb();

    // Recupera l'assegnazione originale
    const originale = db
      .prepare("SELECT * FROM ddt_assegnazioni WHERE id = ? AND spedizione_id = ?")
      .get(assegnazioneId, spedizioneId);

    if (!originale) {
      return res.status(404).json({ ok: false, error: "Assegnazione non trovata" });
    }

    // Verifica quantità
    if (quantitaDdt1 + quantitaDdt2 !== originale.quantita) {
      return res.status(400).json({
        ok: false,
        error: `La somma delle quantità (${quantitaDdt1 + quantitaDdt2}) non corrisponde all'originale (${originale.quantita})`,
      });
    }

    // Cerca se esiste già una riga per lo stesso prodotto nel DDT destinazione
    const esistenteDestinazione = db
      .prepare(
        `SELECT * FROM ddt_assegnazioni 
         WHERE spedizione_id = ? AND ddt_numero = ? AND riga_id = ? AND id != ?`
      )
      .get(spedizioneId, nuovoDdtNumero, originale.riga_id, assegnazioneId);

    // CASO 1: quantitaDdt1 = 0 → sposta tutto al DDT destinazione
    if (quantitaDdt1 === 0) {
      // Elimina la riga originale
      db.prepare("DELETE FROM ddt_assegnazioni WHERE id = ?").run(assegnazioneId);

      if (esistenteDestinazione) {
        // Somma alla riga esistente
        db.prepare("UPDATE ddt_assegnazioni SET quantita = quantita + ? WHERE id = ?")
          .run(quantitaDdt2, esistenteDestinazione.id);
      } else {
        // Crea nuova riga
        db.prepare(
          `INSERT INTO ddt_assegnazioni 
           (spedizione_id, ddt_numero, riga_id, asin, sku, prodotto_nome, quantita)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          spedizioneId,
          nuovoDdtNumero,
          originale.riga_id,
          originale.asin,
          originale.sku,
          originale.prodotto_nome,
          quantitaDdt2
        );
      }

      return res.json({
        ok: true,
        message: `Prodotto spostato a DDT ${nuovoDdtNumero} (${quantitaDdt2} pz)`,
      });
    }

    // CASO 2: quantitaDdt2 = 0 → niente da spostare
    if (quantitaDdt2 === 0) {
      return res.json({
        ok: true,
        message: `Nessuna divisione effettuata`,
      });
    }

    // CASO 3: divisione normale
    // Aggiorna la riga originale
    db.prepare("UPDATE ddt_assegnazioni SET quantita = ? WHERE id = ?")
      .run(quantitaDdt1, assegnazioneId);

    if (esistenteDestinazione) {
      // Somma alla riga esistente nel DDT destinazione
      db.prepare("UPDATE ddt_assegnazioni SET quantita = quantita + ? WHERE id = ?")
        .run(quantitaDdt2, esistenteDestinazione.id);
    } else {
      // Crea nuova riga nel DDT destinazione
      db.prepare(
        `INSERT INTO ddt_assegnazioni 
         (spedizione_id, ddt_numero, riga_id, asin, sku, prodotto_nome, quantita)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        spedizioneId,
        nuovoDdtNumero,
        originale.riga_id,
        originale.asin,
        originale.sku,
        originale.prodotto_nome,
        quantitaDdt2
      );
    }

    res.json({
      ok: true,
      message: `Prodotto diviso: ${quantitaDdt1} in DDT ${originale.ddt_numero}, ${quantitaDdt2} in DDT ${nuovoDdtNumero}`,
    });
  } catch (err) {
    console.error("❌ Errore divisione:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * DELETE /api/v2/ddt/assegnazioni/:spedizioneId/reset
 * Elimina tutte le assegnazioni (per ricominciare)
 */
router.delete("/:spedizioneId/reset", (req, res) => {
  try {
    const { spedizioneId } = req.params;
    const db = getDb();

    const result = db
      .prepare("DELETE FROM ddt_assegnazioni WHERE spedizione_id = ?")
      .run(spedizioneId);

    res.json({
      ok: true,
      message: `Assegnazioni eliminate: ${result.changes}`,
    });
  } catch (err) {
    console.error("❌ Errore reset assegnazioni:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/v2/ddt/assegnazioni/:spedizioneId/:ddtNumero/espandi
 * Espande i prodotti in righe DDT (applicando logica box)
 */
router.get("/:spedizioneId/:ddtNumero/espandi", (req, res) => {
  try {
    const { spedizioneId, ddtNumero } = req.params;
    const db = getDb();

    // Recupera le assegnazioni per questo DDT
    const assegnazioni = db
      .prepare(
        `SELECT * FROM ddt_assegnazioni 
         WHERE spedizione_id = ? AND ddt_numero = ?`
      )
      .all(spedizioneId, ddtNumero);

    if (!assegnazioni.length) {
      return res.status(404).json({
        ok: false,
        error: "Nessuna assegnazione trovata per questo DDT",
      });
    }

    // Trasforma in formato prodotto
    const prodotti = assegnazioni.map((a) => ({
      asin: a.asin,
      sku: a.sku,
      prodotto_nome: a.prodotto_nome,
      quantita: a.quantita,
    }));

    // Espandi in righe DDT
    const righeEspanse = espandiProdottiInRighe(prodotti);

    res.json({
      ok: true,
      spedizioneId: parseInt(spedizioneId),
      ddtNumero: parseInt(ddtNumero),
      prodottiOriginali: assegnazioni.length,
      righeEspanse: righeEspanse.length,
      righe: righeEspanse,
    });
  } catch (err) {
    console.error("❌ Errore espansione righe:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;