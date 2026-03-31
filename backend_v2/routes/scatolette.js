const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const { verifyPassword } = require("../utils/password");

const storicoController = require("../controllers/scatoletteStorico.controller.js");


router.get("/storico", storicoController.getStorico);


/**
 * GET – tutte le scatolette
 */
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM scatolette ORDER BY nome_prodotto ASC").all();
    res.json(rows);
  } catch (err) {
    console.error("❌ ERRORE SQL /scatolette:", err);
    res.status(500).json({ message: "Errore nel recupero delle scatolette" });
  }
});

/**
 * PATCH – aggiorna la quantità
 */
/**
 * PATCH – rettifica quantità con storico
 */
router.patch("/:id", (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { quantita, operatore = "admin" } = req.body;

    if (quantita === undefined) {
      return res.status(400).json({ message: "Quantità mancante" });
    }

    // 1) Recupera quantità precedente
    const row = db.prepare(`SELECT asin_prodotto, scatoletta, quantita FROM scatolette WHERE id = ?`).get(id);
    if (!row) {
      return res.status(404).json({ message: "Scatoletta non trovata" });
    }

    const quantitaPrecedente = row.quantita;
    const delta = Number(quantita) - Number(quantitaPrecedente);

    // 2) Aggiorna la quantità
    db.prepare(
      `UPDATE scatolette
       SET quantita = ?
       WHERE id = ?`
    ).run(quantita, id);

    // 3) Registra movimento nello storico
    db.prepare(`
      INSERT INTO storico_movimenti_scatolette
        (asin_prodotto, scatoletta, delta, quantita_finale, nota, operatore, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
    `).run(
      row.asin_prodotto,
      row.scatoletta,
      delta,
      quantita,
      `Rettifica manuale: da ${quantitaPrecedente} a ${quantita}`,
      operatore
    );

    res.json({
      id,
      quantita,
      delta,
      message: "Quantità aggiornata e movimento registrato",
    });

  } catch (err) {
    console.error("❌ Errore PATCH /api/scatolette/:id", err);
    res.status(500).json({ message: "Errore nell'aggiornamento della quantità" });
  }
});



/**
 * POST – aggiunge una nuova scatoletta
 */
router.post("/", (req, res) => {
  const db = getDb();
  const { asin_prodotto, sku, nome_prodotto, scatoletta, quantita = 0 } = req.body;

  if (!asin_prodotto || !sku || !nome_prodotto || !scatoletta) {
    return res.status(400).json({ message: "Campi obbligatori mancanti" });
  }

  try {
    const result = db.prepare(`
      INSERT INTO scatolette (asin_prodotto, sku, nome_prodotto, scatoletta, quantita)
      VALUES (?, ?, ?, ?, ?)
    `).run(asin_prodotto, sku, nome_prodotto, scatoletta, quantita);

    res.json({
      id: result.lastInsertRowid,
      asin_prodotto,
      sku,
      nome_prodotto,
      scatoletta,
      quantita,
    });
  } catch (err) {
    console.error("❌ Errore POST /api/scatolette", err);
    res.status(500).json({ message: "Errore nella creazione della scatoletta" });
  }
});

/**
 * DELETE – elimina una scatoletta
 */
router.delete("/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  try {
    db.prepare("DELETE FROM scatolette WHERE id = ?").run(id);
    res.json({ message: "Scatoletta eliminata" });
  } catch (err) {
    console.error("❌ Errore DELETE /api/scatolette/:id", err);
    res.status(500).json({ message: "Errore nella cancellazione" });
  }
});

/**
 * DELETE – reset storico scatolette (richiede password admin)
 */
router.delete("/storico/reset", (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(401).json({ ok: false, message: "Password richiesta." });
  }

  const db = getDb();
  const row = db.prepare("SELECT valore FROM impostazioni WHERE chiave = 'admin_password'").get();
  if (!row || !verifyPassword(password, row.valore)) {
    return res.status(401).json({ ok: false, message: "Password non valida." });
  }

  try {
    db.prepare(`DELETE FROM storico_movimenti_scatolette`).run();

    res.json({ ok: true, message: "Storico scatolette resettato con successo" });
  } catch (err) {
    console.error("❌ Errore RESET storico scatolette:", err);
    res.status(500).json({ ok: false, error: "Errore reset storico" });
  }
});


module.exports = router;
