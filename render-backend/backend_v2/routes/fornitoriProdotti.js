const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

// 📦 GET - Prodotti associati a un fornitore
router.get("/:idFornitore/prodotti", (req, res) => {
    const db = getDb();
    const { idFornitore } = req.params;

    try {
        const rows = db
            .prepare(
                `SELECT 
                    fp.id,
                    REPLACE(REPLACE(s.nome_prodotto, ' 100ml', ''), ' 12ml', '') AS nome,
                    s.formato,
                    COALESCE(json_extract(s.asin_collegati, '$[0]'), NULL) AS asin,
                    fp.prezzo,
                    fp.note
                    FROM fornitori_prodotti fp
                    JOIN sfuso s ON s.id = fp.id_sfuso
                    WHERE fp.id_fornitore = ?`
            )
            .all(idFornitore);



        res.json(rows);
    } catch (err) {
        console.error("❌ Errore GET fornitori_prodotti:", err);
        res.status(500).json({ error: "Errore nel recupero prodotti fornitore" });
    }
});

// 📦 GET - Prodotti associati + disponibili per un fornitore
router.get("/:idFornitore/catalogo", (req, res) => {
  const db = getDb();
  const { idFornitore } = req.params;

  try {
    // già associati
    const associati = db.prepare(`
      SELECT 
        fp.id,
        REPLACE(REPLACE(s.nome_prodotto, ' 100ml', ''), ' 12ml', '') AS nome,
        s.formato,
        fp.prezzo,
        fp.note
      FROM fornitori_prodotti fp
      JOIN sfuso s ON s.id = fp.id_sfuso
      WHERE fp.id_fornitore = ?
      ORDER BY s.nome_prodotto ASC
    `).all(idFornitore);

    // tutti quelli non ancora associati
    const disponibili = db.prepare(`
      SELECT 
        s.id,
        REPLACE(REPLACE(s.nome_prodotto, ' 100ml', ''), ' 12ml', '') AS nome,
        s.formato
      FROM sfuso s
      WHERE s.id NOT IN (
        SELECT id_sfuso FROM fornitori_prodotti WHERE id_fornitore = ?
      )
      ORDER BY s.nome_prodotto ASC
    `).all(idFornitore);

    res.json({ associati, disponibili });
  } catch (err) {
    console.error("❌ Errore GET catalogo fornitore:", err);
    res.status(500).json({ error: "Errore nel caricamento catalogo fornitore" });
  }
});


// ➕ POST - Associa un prodotto a un fornitore
router.post("/:idFornitore/prodotti", (req, res) => {
    const db = getDb();
    const { idFornitore } = req.params;
    const { id_sfuso, prezzo, note } = req.body;

    if (!id_sfuso) {
        return res.status(400).json({ error: "id_sfuso mancante" });
    }

    try {
        const stmt = db.prepare(
            "INSERT INTO fornitori_prodotti (id_fornitore, id_sfuso, prezzo, note) VALUES (?, ?, ?, ?)"
        );
        const result = stmt.run(idFornitore, id_sfuso, prezzo || 0, note || null);

        res.json({
            success: true,
            id: result.lastInsertRowid,
        });
    } catch (err) {
        console.error("❌ Errore POST fornitori_prodotti:", err);
        res.status(500).json({ error: "Errore nel salvataggio associazione" });
    }
});

// ✏️ PATCH - Modifica prezzo o note
router.patch("/:id", (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { prezzo, note } = req.body;

    try {
        const stmt = db.prepare(
            "UPDATE fornitori_prodotti SET prezzo = ?, note = ? WHERE id = ?"
        );
        stmt.run(prezzo || 0, note || null, id);

        res.json({ success: true });
    } catch (err) {
        console.error("❌ Errore PATCH fornitori_prodotti:", err);
        res.status(500).json({ error: "Errore nell'aggiornamento" });
    }
});

// 🗑️ DELETE - Rimuove associazione
router.delete("/:id", (req, res) => {
    const db = getDb();
    const { id } = req.params;

    try {
        db.prepare("DELETE FROM fornitori_prodotti WHERE id = ?").run(id);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ Errore DELETE fornitori_prodotti:", err);
        res.status(500).json({ error: "Errore nella rimozione associazione" });
    }
});

module.exports = router;
