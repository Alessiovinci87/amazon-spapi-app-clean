const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "../../db/inventario.db");
const db = new Database(dbPath);

// ============================================================
// 📘 CATALOGO COSTI — GET
// ============================================================
function dbGetCatalogo() {
  const stmt = db.prepare(`
    SELECT
      c.id,
      c.tipo,
      c.id_riferimento,
      CASE c.tipo
        WHEN 'prodotto' THEN (
          SELECT nome FROM prodotti WHERE id = c.id_riferimento
        )
        WHEN 'accessorio' THEN (
          SELECT nome FROM accessori WHERE asin_accessorio = c.id_riferimento
        )
        WHEN 'sfuso' THEN (
          SELECT nome_prodotto FROM sfuso WHERE id = c.id_riferimento
        )
        ELSE 'Sconosciuto'
      END AS nome,
      c.costo,
      c.created_at,
      c.updated_at,
      c.note
    FROM bilancio_catalogo c
    ORDER BY c.tipo ASC, nome ASC
  `);

  return stmt.all();
}


// ============================================================
// 📘 CATALOGO COSTI — INSERIMENTO O AGGIORNAMENTO
// ============================================================
function dbUpsertCosto(tipo, id_riferimento, costo, note = null) {
  const stmt = db.prepare(`
    INSERT INTO bilancio_catalogo (tipo, id_riferimento, costo, note)
    VALUES (@tipo, @id_riferimento, @costo, @note)
    ON CONFLICT(id_riferimento, tipo) DO UPDATE SET
      costo = excluded.costo,
      note = excluded.note,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run({ tipo, id_riferimento, costo, note });
}

// ============================================================
// 📙 MOVIMENTI — GET
// ============================================================
function dbGetMovimenti(from, to) {
  let query = `SELECT * FROM bilancio_movimenti WHERE 1 = 1`;
  const params = {};

  if (from) {
    query += ` AND data >= @from`;
    params.from = from + " 00:00:00";
  }

  if (to) {
    query += ` AND data <= @to`;
    params.to = to + " 23:59:59";
  }

  query += ` ORDER BY data DESC`;

  const stmt = db.prepare(query);
  return stmt.all(params);
}

// ============================================================
// 📙 MOVIMENTI — INSERT
// ============================================================
function dbRegistraMovimento(tipo, id_riferimento, quantita, costo_totale, note = "") {
  const stmt = db.prepare(`
    INSERT INTO bilancio_movimenti (tipo, id_riferimento, quantita, costo_totale, note)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(tipo, id_riferimento, quantita, costo_totale, note);
}

module.exports = {
  dbGetCatalogo,
  dbUpsertCosto,
  dbGetMovimenti,
  dbRegistraMovimento
};
