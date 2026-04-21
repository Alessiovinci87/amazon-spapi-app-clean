// backend_v2/routes/sfusoInventario.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const { checkSottoSogliaSfuso } = require("../services/stockAlerts.service");
const logger = require("../utils/logger");

const idParam = z.object({ id: z.coerce.number().int().positive() });
const rettificaSchema = z.object({
  quantita: z.coerce.number(),
  operatore: z.string().min(1).max(80),
  note: z.string().min(1).max(1000),
});
const rettificaLottoSchema = z.object({
  nuovoLotto: z.string().min(1).max(80),
  dataInserimento: z.string().min(1).max(40),
  operatore: z.string().min(1).max(80),
  note: z.string().min(1).max(1000),
});
const sogliaSchema = z.object({
  soglia_minima: z.coerce.number().min(0),
});

// ===========================
//  BASE: Gestione inventario sfuso
// ===========================

// ✅ Ottiene tutti i prodotti sfusi
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const sfuso = db.prepare("SELECT * FROM sfuso").all();
    res.json(sfuso);
  } catch (err) {
    logger.error({ err }, "Errore GET /sfuso-inventario");
    res.status(500).json({ error: "Errore nel caricamento sfuso" });
  }
});

// ✅ Rettifica quantità sfuso (solo inventario)
router.patch("/:id/rettifica", validate({ params: idParam, body: rettificaSchema }), (req, res) => {
  const { id } = req.params;
  const { quantita, operatore, note } = req.body;

  try {
    const db = getDb();
    const sfusoRow = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);
    if (!sfusoRow) {
      return res.status(404).json({ error: "Record sfuso non trovato." });
    }

    const valoreNumerico = Number(quantita);
    if (isNaN(valoreNumerico)) {
      return res.status(400).json({ error: "Valore non valido per sfuso." });
    }

    // ✅ Aggiorna la quantità nel DB
    db.prepare(`
      UPDATE sfuso 
      SET litri_disponibili = ?, updated_at = datetime('now','localtime') 
      WHERE id = ?
    `).run(valoreNumerico, id);

    // ✅ Registra il movimento nel log sfuso_movimenti
    db.prepare(`
      INSERT INTO sfuso_movimenti 
      (id_sfuso, nome_prodotto, formato, lotto, fornitore, tipo, quantita, operatore, note)
      VALUES (?, ?, ?, ?, ?, 'RETTIFICA', ?, ?, ?)
    `).run(
      id,
      sfusoRow.formato === "12ml" ? "Prodotto 12ml" : "Prodotto 100ml",
      sfusoRow.formato || "N/D",
      sfusoRow.lotto || "",
      sfusoRow.fornitore || "N/D",
      valoreNumerico,
      operatore,
      note
    );

    // ✅ Registra anche nello storico_sfuso (ma indipendente da Gestione Produzione)
    db.prepare(`
      INSERT INTO storico_sfuso
      (tipo, campo, nuovoValore, nota, operatore, formato, stato, id_sfuso, lotto)
      VALUES ('RETTIFICA', 'litri_disponibili', ?, ?, ?, ?, 'Inventario', ?, ?)
    `).run(
      valoreNumerico,
      note,
      operatore,
      sfusoRow.formato,
      id,
      sfusoRow.lotto
    );

    // Verifica alert sotto soglia
    checkSottoSogliaSfuso(db, id);

    const updated = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);

    res.json({
      message: "✅ Rettifica completata con successo (Inventario)",
      updated,
    });
  } catch (err) {
    logger.error({ err }, "Errore PATCH /sfuso-inventario/:id/rettifica");
    res.status(500).json({ error: "Errore nella rettifica sfuso (Inventario)" });
  }
});

// ✅ Rettifica lotto sfuso (solo inventario)
router.patch("/:id/rettifica-lotto", validate({ params: idParam, body: rettificaLottoSchema }), (req, res) => {
  const { id } = req.params;
  const { nuovoLotto, dataInserimento, operatore, note } = req.body;

  try {
    const db = getDb();
    const sfusoRow = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);
    if (!sfusoRow) {
      return res.status(404).json({ error: "Record sfuso non trovato." });
    }

    // ✅ Aggiorna lotto nel DB
    db.prepare(`
      UPDATE sfuso 
      SET lotto = ?, updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(nuovoLotto, id);

    // ✅ Registra movimento nel log
    db.prepare(`
      INSERT INTO sfuso_movimenti
      (id_sfuso, nome_prodotto, formato, lotto, fornitore, tipo, quantita, operatore, note)
      VALUES (?, ?, ?, ?, ?, 'RETTIFICA LOTTO', 0, ?, ?)
    `).run(
      id,
      sfusoRow.formato === "12ml" ? "Prodotto 12ml" : "Prodotto 100ml",
      sfusoRow.formato || "N/D",
      nuovoLotto,
      sfusoRow.fornitore || "N/D",
      operatore,
      `Modifica lotto da "${sfusoRow.lotto || "-"}" a "${nuovoLotto}" — ${note}`
    );

    // ✅ Registra anche nello storico_sfuso
    db.prepare(`
      INSERT INTO storico_sfuso
      (tipo, campo, nuovoValore, nota, operatore, formato, stato, id_sfuso, lotto)
      VALUES ('RETTIFICA LOTTO', 'lotto', ?, ?, ?, ?, 'Inventario', ?, ?)
    `).run(
      nuovoLotto,
      note,
      operatore,
      sfusoRow.formato,
      id,
      nuovoLotto
    );

    const updated = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);

    res.json({
      message: "✅ Lotto aggiornato con successo",
      updated,
    });
  } catch (err) {
    logger.error({ err }, "Errore PATCH /sfuso-inventario/:id/rettifica-lotto");
    res.status(500).json({ error: "Errore nella rettifica lotto" });
  }
});



// ✅ Imposta soglia minima sfuso
router.patch("/:id/soglia", validate({ params: idParam, body: sogliaSchema }), (req, res) => {
  const { id } = req.params;
  const { soglia_minima } = req.body;

  try {
    const db = getDb();
    const sfusoRow = db.prepare("SELECT id FROM sfuso WHERE id = ?").get(id);
    if (!sfusoRow) return res.status(404).json({ error: "Record sfuso non trovato." });

    db.prepare("UPDATE sfuso SET soglia_minima = ? WHERE id = ?").run(soglia_minima, id);
    checkSottoSogliaSfuso(db, id);

    res.json({ ok: true, id, soglia_minima });
  } catch (err) {
    logger.error({ err }, "Errore PATCH /sfuso-inventario/:id/soglia");
    res.status(500).json({ error: "Errore nell'aggiornamento soglia sfuso" });
  }
});

module.exports = router;
