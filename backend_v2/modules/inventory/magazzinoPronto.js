const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const router = express.Router();

const dbPath = path.join(__dirname, "../../db/inventario.db");
const db = new Database(dbPath, { fileMustExist: true });

/**
 * PATCH /api/v2/magazzino/:asin/pronto
 * Aggiorna il PRONTO e registra lo storico movimenti.
 */
router.patch("/:asin/pronto", (req, res) => {
  try {
    const { asin } = req.params;
    const { pronto, note, operatore } = req.body;

    if (!asin || pronto === undefined || !note || !operatore) {
      return res.status(400).json({
        ok: false,
        error: "Dati mancanti: asin, pronto, note, operatore sono obbligatori",
      });
    }

    // Recupera vecchio valore
    const prodotto = db
      .prepare("SELECT pronto FROM prodotti WHERE asin = ?")
      .get(asin);

    if (!prodotto) {
      return res
        .status(404)
        .json({ ok: false, error: "Prodotto non trovato" });
    }

    const vecchio = prodotto.pronto;

    // Aggiorna pronto
    db.prepare("UPDATE prodotti SET pronto = ? WHERE asin = ?").run(
      pronto,
      asin
    );

    // Storico movimenti (colonne compatibili con DB attuale)
    db.prepare(
      `
      INSERT INTO movimenti 
      (asin_prodotto, tipo_movimento, valore_old, valore_new, note, operatore, data)
      VALUES (?, 'RETTIFICA', ?, ?, ?, ?, DATETIME('now','localtime'))
      `
    ).run(asin, vecchio, pronto, note, operatore);

    return res.json({
      ok: true,
      data: { asin, pronto },
    });
  } catch (err) {
    console.error("❌ Errore PATCH pronto:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
