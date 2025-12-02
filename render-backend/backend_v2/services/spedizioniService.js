const { getDb } = require("../db/database");

// 📦 GET tutte le spedizioni
function getAllSpedizioni() {
  const db = getDb();
  return db.prepare("SELECT * FROM spedizioni ORDER BY created_at DESC").all();
}



// 📦 POST nuova spedizione
function creaSpedizione({ paese, prodotto_nome, asin, quantita, data, operatore, note }) {
  const db = getDb();

  // Calcola progressivo per paese
  const count = db.prepare("SELECT COUNT(*) as totale FROM spedizioni WHERE paese = ?").get(paese);
  const numero = count.totale + 1;
  const progressivo = `${paese}-${numero}`;

  const stmt = db.prepare(`
    INSERT INTO spedizioni (progressivo, paese, prodotto_nome, asin, quantita, data, operatore, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(progressivo, paese, prodotto_nome, asin || null, quantita, data, operatore || null, note || null);

  return {
    id: info.lastInsertRowid,
    progressivo,
    paese,
    prodotto_nome,
    asin,
    quantita,
    data,
    operatore,
    note,
  };
}

// ✏️ PATCH aggiorna spedizione
function aggiornaSpedizione(id, { quantita, data, operatore, note }) {
  const db = getDb();

  const esistente = db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
  if (!esistente) return null;

  db.prepare(`
    UPDATE spedizioni
    SET quantita = COALESCE(?, quantita),
        data = COALESCE(?, data),
        operatore = COALESCE(?, operatore),
        note = COALESCE(?, note)
    WHERE id = ?
  `).run(quantita ?? null, data ?? null, operatore ?? null, note ?? null, id);

  return db.prepare("SELECT * FROM spedizioni WHERE id = ?").get(id);
}

module.exports = {
  getAllSpedizioni,
  creaSpedizione,
  aggiornaSpedizione,
};
