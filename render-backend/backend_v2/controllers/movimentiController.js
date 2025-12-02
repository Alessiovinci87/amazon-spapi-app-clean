// backend_v2/controllers/movimentiController.js
const { getDb } = require("../db/database");

/* =========================================================
   💾 CONTROLLER MOVIMENTI
   Gestisce inserimento e lettura dei movimenti
========================================================= */

/**
 * POST /api/v2/movimenti
 * Salva un nuovo movimento
 */
exports.salvaMovimento = (req, res) => {
  try {
    const db = getDb();
    const {
      tipo,
      asin_prodotto,
      asin_accessorio,
      delta_pronto,
      delta_quantita,
      note,
      operatore = "system",
    } = req.body;

    if (!tipo) {
      return res.status(400).json({ ok: false, message: "Campo 'tipo' obbligatorio" });
    }

    const stmt = db.prepare(`
      INSERT INTO movimenti (tipo, asin_prodotto, asin_accessorio, delta_pronto, delta_quantita, note, operatore)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      tipo,
      asin_prodotto || null,
      asin_accessorio || null,
      delta_pronto || 0,
      delta_quantita || 0,
      note || null,
      operatore
    );

    res.json({
      ok: true,
      message: "Movimento salvato correttamente",
      id: result.lastInsertRowid,
    });
  } catch (err) {
    console.error("❌ Errore salvataggio movimento:", err);
    res.status(500).json({ ok: false, message: "Errore salvataggio movimento" });
  }
};

/**
 * GET /api/v2/movimenti
 * Ritorna ultimi movimenti registrati
 */
exports.listaMovimenti = (req, res) => {
  try {
    const db = getDb();
    const data = db
      .prepare(`SELECT * FROM movimenti ORDER BY id DESC LIMIT 50`)
      .all();
    res.json({ ok: true, data });
  } catch (err) {
    console.error("❌ Errore lettura movimenti:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
};
