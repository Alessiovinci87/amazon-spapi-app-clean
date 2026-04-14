const express = require("express");
const { z } = require("zod");
const router = express.Router();
const { getDb } = require("../db/database");
const { validate } = require("../middleware/validate");

const idParam = z.object({ id: z.coerce.number().int().positive() });

const createSchema = z.object({
  nome: z.string().min(1, "Nome obbligatorio").max(200),
  quantita: z.coerce.number().int().min(0).default(0),
  soglia_minima: z.coerce.number().int().min(0).default(0),
});

const patchSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  quantita: z.coerce.number().int().min(0).optional(),
  soglia_minima: z.coerce.number().int().min(0).optional(),
});

// GET / — lista tutte le etichette
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM etichette ORDER BY nome").all();
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST / — crea nuova etichetta
router.post("/", validate({ body: createSchema }), (req, res) => {
  try {
    const db = getDb();
    const { nome, quantita, soglia_minima } = req.body;
    const result = db.prepare(
      "INSERT INTO etichette (nome, quantita, soglia_minima) VALUES (?, ?, ?)"
    ).run(nome, quantita, soglia_minima);
    const row = db.prepare("SELECT * FROM etichette WHERE id = ?").get(result.lastInsertRowid);
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PATCH /:id — aggiorna etichetta (quantita, soglia_minima, nome)
router.patch("/:id", validate({ params: idParam, body: patchSchema }), (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const existing = db.prepare("SELECT * FROM etichette WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ ok: false, error: "Etichetta non trovata" });

    const nome = req.body.nome ?? existing.nome;
    const quantita = req.body.quantita ?? existing.quantita;
    const soglia_minima = req.body.soglia_minima ?? existing.soglia_minima;

    db.prepare(
      "UPDATE etichette SET nome = ?, quantita = ?, soglia_minima = ?, updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(nome, quantita, soglia_minima, id);

    // Check alert dopo modifica
    const { checkSottoSogliaEtichette } = require("../services/stockAlerts.service");
    checkSottoSogliaEtichette(db, id);

    const row = db.prepare("SELECT * FROM etichette WHERE id = ?").get(id);
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /:id — elimina etichetta
router.delete("/:id", validate({ params: idParam }), (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM etichette WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /seed — popola etichette iniziali (una tantum)
router.post("/seed", (req, res) => {
  try {
    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) AS n FROM etichette").get().n;
    if (count > 0) return res.json({ ok: true, message: "Tabella già popolata", count });

    const iniziali = [
      { nome: "Primer no acido", quantita: 25000 },
      { nome: "Primer Acido", quantita: 1170 },
      { nome: "Nail Prep", quantita: 4500 },
      { nome: "Olio Vaniglia", quantita: 2300 },
      { nome: "Olio Fragola", quantita: 3000 },
      { nome: "Olio Cocco", quantita: 3600 },
      { nome: "Olio Generico", quantita: 5300 },
      { nome: "Acrygel", quantita: 1300 },
      { nome: "Cilindri", quantita: 2000 },
      { nome: "Antifungo", quantita: 0 },
      { nome: "Cutiway", quantita: 3400 },
      { nome: "Olio 3 Fasico", quantita: 3400 },
      { nome: "Rinforzante", quantita: 4800 },
      { nome: "Smalto Amaro", quantita: 7000 },
      { nome: "Rimuovi Cuticole", quantita: 9300 },
      { nome: "Top Coat Manicure", quantita: 2000 },
      { nome: "Top Coat Ultra Shine", quantita: 1300 },
      { nome: "Top Coat No Wipe", quantita: 2340 },
      { nome: "Top Coat Matt", quantita: 2000 },
      { nome: "Base + Top", quantita: 4700 },
      { nome: "Base Coat", quantita: 2000 },
      { nome: "Olio CBD 5%", quantita: 2500 },
      { nome: "Olio CBD 15%", quantita: 2500 },
      { nome: "Olio CBD 25%", quantita: 2500 },
      { nome: "Rubber Base", quantita: 4700 },
      { nome: "Generica", quantita: 4700 },
    ];

    const stmt = db.prepare("INSERT INTO etichette (nome, quantita) VALUES (?, ?)");
    const tx = db.transaction(() => {
      for (const e of iniziali) stmt.run(e.nome, e.quantita);
    });
    tx();

    res.json({ ok: true, message: `Inserite ${iniziali.length} etichette`, count: iniziali.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
