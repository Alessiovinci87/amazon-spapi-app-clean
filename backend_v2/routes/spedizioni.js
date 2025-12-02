const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

/** 🔢 Calcola progressivo per paese */
function calcolaProgressivo(paese) {
  const db = getDb();

  const last = db
    .prepare("SELECT progressivo FROM spedizioni WHERE paese = ? ORDER BY id DESC LIMIT 1")
    .get(paese);

  if (!last) return `${paese}-1`;

  const num = parseInt(last.progressivo.split("-")[1] || "0", 10);
  return `${paese}-${num + 1}`;
}




/** 🔎 GET dettaglio spedizione con righe */
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const spedizione = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  if (!spedizione) {
    return res.status(404).json({ error: "Spedizione non trovata" });
  }

  const righe = db
    .prepare("SELECT asin, sku, prodotto_nome, quantita FROM spedizioni_righe WHERE spedizione_id = ?")
    .all(id);

  res.json({ ...spedizione, righe });
});

router.get("/:id/righe", (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const righe = db
      .prepare("SELECT * FROM spedizioni_righe WHERE spedizione_id = ?")
      .all(id);
    res.json(righe);
  } catch (err) {
    console.error("❌ Errore GET /api/v2/spedizioni/:id/righe:", err);
    res.status(500).json({ error: "Errore recupero righe spedizione", details: err.message });
  }
});


/** 📦 GET tutte le spedizioni (solo bozze) */
const SpedizioniController = require("../controllers/spedizioniController");

/** 📦 GET tutte le spedizioni */
router.get("/", SpedizioniController.getSpedizioni);

// ... qui c'è la rotta POST "/" che crea la spedizione

/** ➕ Aggiungi righe a spedizione esistente (solo BOZZA) */
router.post("/:id/righe", (req, res) => {
  const { id } = req.params;
  const { righe } = req.body;
  const db = getDb();

  const spedizione = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  if (!spedizione) {
    return res.status(404).json({ error: "Spedizione non trovata" });
  }
  if (spedizione.stato !== "BOZZA") {
    return res.status(400).json({ error: "Puoi aggiungere righe solo a spedizioni in BOZZA" });
  }

  const insertRiga = db.prepare(
    `INSERT INTO spedizioni_righe (spedizione_id, asin, sku, prodotto_nome, quantita)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const r of righe) {
    insertRiga.run(
      id,
      r.asin || null,
      r.sku || null,
      r.prodotto_nome || "",
      r.quantita || 0
    );
  }

  const righeAggiornate = db
    .prepare("SELECT * FROM spedizioni_righe WHERE spedizione_id = ?")
    .all(id);

  res.json({ ...spedizione, righe: righeAggiornate });
});


/** 📦 POST nuova spedizione con righe */
router.post("/", (req, res) => {
  const db = getDb();
  const { paese, data, operatore, note, righe } = req.body;

  const nuovoProgressivo = calcolaProgressivo(paese);

  // 1️⃣ Inserisco intestazione
  const info = db
    .prepare(
      `INSERT INTO spedizioni (progressivo, paese, data, operatore, note, stato)
       VALUES (?, ?, ?, ?, ?, 'BOZZA')`
    )
    .run(nuovoProgressivo, paese, data, operatore, note);

  const spedizioneId = info.lastInsertRowid;

  // 2️⃣ Inserisco nello storico
  db.prepare(
    `INSERT INTO storico_spedizioni 
     (spedizione_id, progressivo, paese, stato, data_operazione, operatore, note)
     VALUES (?, ?, ?, 'BOZZA', datetime('now'), ?, ?)`
  ).run(spedizioneId, nuovoProgressivo, paese, operatore, note || "");

  // 3️⃣ Inserisco le righe
  const insertRiga = db.prepare(
    `INSERT INTO spedizioni_righe (spedizione_id, asin, sku, prodotto_nome, quantita)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const r of righe) {
    insertRiga.run(spedizioneId, r.asin || null, r.sku || null, r.prodotto_nome || "", r.quantita || 0);
  }

  // 4️⃣ Risposta completa
  const spedizione = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(spedizioneId);
  const righeSpedizione = db.prepare("SELECT * FROM spedizioni_righe WHERE spedizione_id = ?").all(spedizioneId);

  res.json({ ...spedizione, righe: righeSpedizione });
});

/** 📦 POST nuova spedizione con righe */
/** 📦 POST nuova spedizione con righe */
router.post("/", (req, res) => {
  console.log("📩 Body ricevuto:", req.body); // utile in debug

  const db = getDb();
  const { paese, data, operatore, note, righe } = req.body;

  const nuovoProgressivo = calcolaProgressivo(paese);

  // 1️⃣ Inserisco intestazione
  const info = db
    .prepare(
      `INSERT INTO spedizioni (progressivo, paese, data, operatore, note, stato)
       VALUES (?, ?, ?, ?, ?, 'BOZZA')`
    )
    .run(nuovoProgressivo, paese, data, operatore, note);

  const spedizioneId = info.lastInsertRowid;

  // 2️⃣ Inserisco nello storico
  db.prepare(
    `INSERT INTO storico_spedizioni 
     (spedizione_id, progressivo, paese, stato, data_operazione, operatore, note)
     VALUES (?, ?, ?, 'BOZZA', datetime('now'), ?, ?)`
  ).run(spedizioneId, nuovoProgressivo, paese, operatore, note || "");

  // 3️⃣ Inserisco le righe
  const insertRiga = db.prepare(
    `INSERT INTO spedizioni_righe (spedizione_id, asin, sku, prodotto_nome, quantita)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const r of righe) {
    insertRiga.run(
      spedizioneId,
      r.asin || null,
      r.sku || null,
      r.prodotto_nome || "",
      r.quantita || 0
    );
  }

  // 4️⃣ Risposta completa
  const spedizione = db
    .prepare("SELECT * FROM spedizioni WHERE id = ?")
    .get(spedizioneId);
  const righeSpedizione = db
    .prepare("SELECT * FROM spedizioni_righe WHERE spedizione_id = ?")
    .all(spedizioneId);

  res.json({ ...spedizione, righe: righeSpedizione });
});




/** 📜 GET storico confermate */
router.get("/storico", (req, res) => {
  const db = getDb();
  const { paese } = req.query;

  let query = `
    SELECT st.id, st.spedizione_id, st.progressivo, st.paese, st.stato,
           st.data_operazione, st.operatore, st.note,
           s.data as data_spedizione
    FROM storico_spedizioni st
    JOIN spedizioni s ON s.id = st.spedizione_id
    WHERE st.stato = 'CONFERMATA'
  `;

  if (paese) query += ` AND st.paese = '${paese}'`;

  query += ` ORDER BY st.data_operazione DESC`;

  const storico = db.prepare(query).all();

  const risultato = storico.map((row) => {
    const righe = db
      .prepare("SELECT asin, sku, prodotto_nome, quantita FROM spedizioni_righe WHERE spedizione_id = ?")
      .all(row.spedizione_id);

    return { ...row, righe };
  });

  res.json(risultato);
});

/** ✅ PATCH conferma spedizione */
router.patch("/:id/conferma", (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const esistente = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  if (!esistente) return res.status(404).json({ error: "Spedizione non trovata" });

  if (esistente.stato === "CONFERMATA") {
    return res.status(400).json({ error: "La spedizione è già confermata" });
  }

  db.prepare("UPDATE spedizioni SET stato = 'CONFERMATA' WHERE id = ?").run(id);

  db.prepare(
    `INSERT INTO storico_spedizioni 
     (spedizione_id, progressivo, paese, stato, data_operazione, operatore, note)
     VALUES (?, ?, ?, 'CONFERMATA', datetime('now'), ?, ?)`
  ).run(id, esistente.progressivo, esistente.paese, esistente.operatore, esistente.note || "");

  const aggiornata = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  const righe = db.prepare("SELECT * FROM spedizioni_righe WHERE spedizione_id = ?").all(id);

  res.json({ ...aggiornata, righe });
});

/** 🗑 DELETE spedizione singola */
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const esistente = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  if (!esistente) return res.status(404).json({ error: "Spedizione non trovata" });

  db.prepare("DELETE FROM spedizioni_righe WHERE spedizione_id = ?").run(id);
  db.prepare("DELETE FROM spedizioni WHERE id = ?").run(id);

  res.json({ ok: true, message: `Spedizione ${id} eliminata` });
});

/** 🗑 DELETE tutte le spedizioni */
router.delete("/", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM spedizioni_righe").run();
  db.prepare("DELETE FROM spedizioni").run();
  res.json({ ok: true, message: "Tutte le spedizioni eliminate" });
});

/** ✏️ PATCH aggiorna bozza */
router.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { paese, righe } = req.body;
  const db = getDb();

  const esistente = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  if (!esistente) return res.status(404).json({ error: "Spedizione non trovata" });

  if (paese) {
    db.prepare("UPDATE spedizioni SET paese = ? WHERE id = ?").run(paese, id);
  }

  if (righe && Array.isArray(righe)) {
    db.prepare("DELETE FROM spedizioni_righe WHERE spedizione_id = ?").run(id);

    const insertRiga = db.prepare(
      `INSERT INTO spedizioni_righe (spedizione_id, asin, sku, prodotto_nome, quantita)
       VALUES (?, ?, ?, ?, ?)`
    );

    for (const r of righe) {
      insertRiga.run(id, r.asin || null, r.sku || null, r.prodotto_nome || "", r.quantita || 0);
    }
  }

  const aggiornata = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  const righeAggiornate = db.prepare("SELECT * FROM spedizioni_righe WHERE spedizione_id = ?").all(id);

  res.json({ ...aggiornata, righe: righeAggiornate });
});

module.exports = router;
