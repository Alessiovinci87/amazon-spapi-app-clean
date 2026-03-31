const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

router.get("/movimenti", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM bilancio_movimenti ORDER BY data DESC`).all();
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("Errore bilancio movimenti:", err);
    res.status(500).json({ ok: false, error: "Errore nel recupero dei movimenti" });
  }
});

// =============================================
// GET /api/v2/bilancio/catalogo
// =============================================
router.get("/catalogo", (req, res) => {
  try {
    const db = getDb();
    const query = `
  SELECT
    bc.tipo,
    bc.id_riferimento,
    bc.costo AS costo_unitario,
    COALESCE(p.nome, a.nome, s.nome_prodotto) AS nome,
    COALESCE(p.pronto, a.quantita, s.litri_disponibili, 0) AS quantita_disponibile,
    (bc.costo * COALESCE(p.pronto, a.quantita, s.litri_disponibili, 0)) AS valore_totale,
    bc.note,
    bc.updated_at

  FROM bilancio_catalogo bc

  LEFT JOIN prodotti p
    ON bc.tipo = 'prodotto' AND bc.id_riferimento = p.id

  LEFT JOIN accessori a
    ON bc.tipo = 'accessorio' AND bc.id_riferimento = a.asin_accessorio

  LEFT JOIN sfuso s
    ON bc.tipo = 'sfuso' AND bc.id_riferimento = s.id
`;

    const rows = db.prepare(query).all();
    res.json({ ok: true, data: rows });

  } catch (err) {
    console.error("Errore catalogo bilancio:", err);
    res.status(500).json({ ok: false, error: "Errore nel recupero del catalogo" });
  }
});

// ========================================
// GET /catalogo/dettagli
// ========================================
router.get("/catalogo/dettagli", (req, res) => {
  try {
    const db = getDb();
    const catalogo = db.prepare(`SELECT * FROM bilancio_catalogo`).all();

    const prodottiMap = Object.fromEntries(
      db.prepare(`SELECT id, nome, pronto FROM prodotti`).all()
        .map(p => [p.id, p])
    );

    const accessoriMap = Object.fromEntries(
      db.prepare(`SELECT asin_accessorio AS id, nome, quantita FROM accessori`).all()
        .map(a => [a.id, a])
    );

    const sfusoMap = Object.fromEntries(
      db.prepare(`SELECT id, nome_prodotto AS nome, litri_disponibili FROM sfuso`).all()
        .map(s => [s.id, s])
    );

    const risultati = catalogo.map(row => {
      let nome = "Sconosciuto";
      let quantita = 0;

      if (row.tipo === "prodotto" && prodottiMap[row.id_riferimento]) {
        nome = prodottiMap[row.id_riferimento].nome;
        quantita = prodottiMap[row.id_riferimento].pronto;
      } else if (row.tipo === "accessorio" && accessoriMap[row.id_riferimento]) {
        nome = accessoriMap[row.id_riferimento].nome;
        quantita = accessoriMap[row.id_riferimento].quantita;
      } else if (row.tipo === "sfuso" && sfusoMap[row.id_riferimento]) {
        nome = sfusoMap[row.id_riferimento].nome;
        quantita = sfusoMap[row.id_riferimento].litri_disponibili;
      }

      const valore = Number((row.costo * quantita).toFixed(2));

      return {
        tipo: row.tipo,
        id_riferimento: row.id_riferimento,
        nome,
        costo_unitario: row.costo,
        quantita_disponibile: quantita,
        valore_totale: valore,
        note: row.note,
        updated_at: row.updated_at
      };
    });

    res.json({ ok: true, data: risultati });

  } catch (err) {
    console.error("Errore catalogo dettagli:", err);
    res.status(500).json({ ok: false, error: "Errore nel recupero dei dettagli" });
  }
});

// ========================================
// POST /catalogo/popola
// ========================================
router.post("/catalogo/popola", (req, res) => {
  try {
    const db = getDb();
    let inseriti = 0;
    let gia = 0;

    const items = [];

    items.push(
      ...db.prepare("SELECT id, nome FROM prodotti").all().map(r => ({ tipo: "prodotto", id: r.id }))
    );
    items.push(
      ...db.prepare("SELECT asin_accessorio AS id FROM accessori").all().map(r => ({ tipo: "accessorio", id: r.id }))
    );
    items.push(
      ...db.prepare("SELECT id FROM sfuso").all().map(r => ({ tipo: "sfuso", id: r.id }))
    );

    const checkStmt = db.prepare(
      `SELECT COUNT(*) AS n FROM bilancio_catalogo WHERE tipo = ? AND id_riferimento = ?`
    );
    const insertStmt = db.prepare(
      `INSERT INTO bilancio_catalogo (tipo, id_riferimento, costo) VALUES (?, ?, 0)`
    );

    db.transaction(() => {
      for (const el of items) {
        const exists = checkStmt.get(el.tipo, el.id).n;
        if (exists > 0) {
          gia++;
        } else {
          insertStmt.run(el.tipo, el.id);
          inseriti++;
        }
      }
    })();

    res.json({ ok: true, inseriti, gia });
  } catch (err) {
    console.error("Errore popola catalogo:", err);
    res.status(500).json({ ok: false, error: "Errore nella popolazione del catalogo" });
  }
});

module.exports = router;
