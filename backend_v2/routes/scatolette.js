const express = require("express");
const { z } = require("zod");
const router = express.Router();
const { getDb } = require("../db/database");
const { verifyPassword } = require("../utils/password");
const { validate } = require("../middleware/validate");

const storicoController = require("../controllers/scatoletteStorico.controller.js");

// ===== Schemas =====
const idParam = z.object({ id: z.coerce.number().int().positive() });

const createSchema = z.object({
  asin_prodotto: z.string().min(1).max(50),
  sku: z.string().min(1).max(100),
  nome_prodotto: z.string().min(1).max(500),
  scatoletta: z.string().min(1).max(200),
  quantita: z.coerce.number().int().min(0).default(0),
});

const patchSchema = z.object({
  quantita: z.coerce.number().int().min(0),
  operatore: z.string().max(100).optional(),
  soglia_minima: z.coerce.number().int().min(0).optional(),
});

const resetSchema = z.object({
  password: z.string().min(1, "Password richiesta.").max(200),
});


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
router.patch("/:id", validate({ params: idParam, body: patchSchema }), (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { quantita, operatore = "admin" } = req.body;

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

    // 4) Aggiorna soglia_minima se fornita
    if (req.body.soglia_minima !== undefined) {
      db.prepare("UPDATE scatolette SET soglia_minima = ? WHERE id = ?").run(req.body.soglia_minima, id);
    }

    // 5) Check alert sotto-soglia
    const { checkSottoSogliaScatolette } = require("../services/stockAlerts.service");
    checkSottoSogliaScatolette(db, id);

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
router.post("/", validate({ body: createSchema }), (req, res) => {
  const db = getDb();
  const { asin_prodotto, sku, nome_prodotto, scatoletta, quantita } = req.body;

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
router.delete("/:id", validate({ params: idParam }), (req, res) => {
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
router.delete("/storico/reset", validate({ body: resetSchema }), (req, res) => {
  const { password } = req.body;

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
