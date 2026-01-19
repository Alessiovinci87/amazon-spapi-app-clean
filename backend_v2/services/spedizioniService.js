const { getDb } = require("../db/database");

/* ============================================================
   🔢 Calcola progressivo (IT-1, IT-2, ...)
============================================================ */
function calcolaProgressivo(paese) {
  const db = getDb();
  const last = db.prepare(`
    SELECT progressivo 
    FROM spedizioni 
    WHERE paese = ? 
    ORDER BY id DESC 
    LIMIT 1
  `).get(paese);

  if (!last) return `${paese}-1`;

  const num = parseInt(last.progressivo.split("-")[1] || "0", 10);
  return `${paese}-${num + 1}`;
}

/* ============================================================
   📦 GET tutte le spedizioni
============================================================ */
function getAll() {
  const db = getDb();
  return db.prepare(`
    SELECT *
    FROM spedizioni
    WHERE stato = 'BOZZA'
    ORDER BY id DESC
  `).all();
}

/* ============================================================
   📦 GET singola con righe
============================================================ */
function getById(id) {
  const db = getDb();

  const spedizione = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  if (!spedizione) return null;

  const righe = db
    .prepare("SELECT * FROM spedizioni_righe WHERE spedizione_id = ?")
    .all(id);

  return { ...spedizione, righe };
}

/* ============================================================
   ➕ CREATA — crea + salva righe nello storico
============================================================ */
function crea({ paese, data, operatore, note, righe }) {
  const db = getDb();
  const prog = calcolaProgressivo(paese);

  // 1) CREA intestazione
  const info = db
    .prepare(
      `INSERT INTO spedizioni
       (progressivo, paese, data, operatore, note, stato)
       VALUES (?, ?, ?, ?, ?, 'BOZZA')`
    )
    .run(prog, paese, data, operatore, note);

  const id = info.lastInsertRowid;

  // 2) INSERISCI RIGHE
  if (righe?.length) {
    const insert = db.prepare(`
      INSERT INTO spedizioni_righe
      (spedizione_id, asin, sku, prodotto_nome, quantita)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const r of righe) {
      insert.run(id, r.asin || null, r.sku || null, r.prodotto_nome || "", r.quantita || 0);
    }
  }

  // 3) SALVA NELLO STORICO (CON RIGHE)
  const righeJson = JSON.stringify(righe || []);

  const righeDB = db.prepare(`
  SELECT asin, sku, prodotto_nome, quantita
  FROM spedizioni_righe
  WHERE spedizione_id = ?
`).all(id);

  db.prepare(`
  INSERT INTO storico_spedizioni
  (tipo_evento, spedizione_id, progressivo, paese, stato, data_operazione, operatore, note, righe_json)
  VALUES ('CREATA', ?, ?, ?, 'BOZZA', datetime('now','localtime'), ?, ?, ?)
`).run(
    id,
    prog,
    paese,
    operatore,
    note || "",
    JSON.stringify(righeDB)
  );


  return getById(id);
}

/* ============================================================
   ➕ Aggiungi righe a BOZZA
============================================================ */
function addRighe(id, righe) {
  const db = getDb();

  const spedizione = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  if (!spedizione) throw new Error("Spedizione non trovata");
  if (spedizione.stato !== "BOZZA") throw new Error("Puoi modificare solo BOZZA");

  const insert = db.prepare(`
    INSERT INTO spedizioni_righe
    (spedizione_id, asin, sku, prodotto_nome, quantita)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const r of righe) {
    insert.run(id, r.asin || null, r.sku || null, r.prodotto_nome || "", r.quantita || 0);
  }

  return getById(id);
}

/* ============================================================
   ✏️ UPDATE spedizione (solo BOZZA)
============================================================ */
function update(id, { paese, righe }) {
  const db = getDb();

  const spedizione = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  if (!spedizione) return null;

  if (paese) {
    db.prepare("UPDATE spedizioni SET paese = ? WHERE id = ?").run(paese, id);
  }

  if (righe && Array.isArray(righe)) {
    db.prepare("DELETE FROM spedizioni_righe WHERE spedizione_id = ?").run(id);

    const insert = db.prepare(`
      INSERT INTO spedizioni_righe
      (spedizione_id, asin, sku, prodotto_nome, quantita)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const r of righe) {
      insert.run(id, r.asin || null, r.sku || null, r.prodotto_nome || "", r.quantita || 0);
    }
  }

  return getById(id);
}

/* ============================================================
   ✅ CONFERMATA — salva righe nello storico
============================================================ */
function conferma(id) {
  const db = getDb();

  const spedizione = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  if (!spedizione) throw new Error("Spedizione non trovata");
  if (spedizione.stato === "CONFERMATA") throw new Error("Già confermata");

  // Aggiorna stato
  db.prepare("UPDATE spedizioni SET stato = 'CONFERMATA' WHERE id = ?").run(id);

  // Prepara righe
  const righe = db
    .prepare("SELECT asin, sku, prodotto_nome, quantita FROM spedizioni_righe WHERE spedizione_id = ?")
    .all(id);

  const righeJson = JSON.stringify(righe);

  // Salva nello storico
  const righeDB = db.prepare(`
  SELECT asin, sku, prodotto_nome, quantita
  FROM spedizioni_righe
  WHERE spedizione_id = ?
`).all(id);

db.prepare(`
  INSERT INTO storico_spedizioni
  (tipo_evento, spedizione_id, progressivo, paese, stato, data_operazione, operatore, note, righe_json)
  VALUES ('CONFERMATA', ?, ?, ?, 'CONFERMATA', datetime('now','localtime'), ?, ?, ?)
`).run(
  id,
  spedizione.progressivo,
  spedizione.paese,
  spedizione.operatore,
  spedizione.note || "",
  JSON.stringify(righeDB)
);


  return getById(id);
}

/* ============================================================
   ❌ ELIMINATA — salva prima le righe poi elimina dal DB
============================================================ */
function deleteOne(id) {
  const db = getDb();

  const spedizione = db.prepare(
    "SELECT * FROM spedizioni WHERE id = ?"
  ).get(id);

  if (!spedizione) return false;

  const righeDB = db.prepare(`
    SELECT asin, sku, prodotto_nome, quantita
    FROM spedizioni_righe
    WHERE spedizione_id = ?
  `).all(id);

  // 📌 Salvataggio storico snapshot
  db.prepare(`
    INSERT INTO storico_spedizioni
    (tipo_evento, spedizione_id, progressivo, paese, stato, data_operazione, operatore, note, righe_json)
    VALUES ('ELIMINATA', ?, ?, ?, 'ELIMINATA', datetime('now','localtime'), ?, ?, ?)
  `).run(
    id,
    spedizione.progressivo,
    spedizione.paese,
    spedizione.operatore,
    spedizione.note || "",
    JSON.stringify(righeDB)
  );

  // 📌 Invece di eliminare, aggiorniamo lo stato
  db.prepare(`
    UPDATE spedizioni
    SET stato = 'ELIMINATA'
    WHERE id = ?
  `).run(id);

  return true;
}



/* ============================================================
   🗂 GET STORICO COMPLETO (tutti gli eventi)
============================================================ */
function getStorico(paese) {
  const db = getDb();

  let query = `
    SELECT *
    FROM storico_spedizioni
    ORDER BY data_operazione DESC
  `;

  if (paese) query = query.replace("ORDER BY", `WHERE paese = '${paese}' ORDER BY`);

  const storico = db.prepare(query).all();

  return storico.map((row) => {
    const righe = row.righe_json
      ? JSON.parse(row.righe_json)
      : [];

    return { ...row, righe };
  });
}

module.exports = {
  getAll,
  getById,
  crea,
  addRighe,
  update,
  conferma,
  delete: deleteOne,
  getStorico,
};
