// Lettura storico con filtri
const { getDb } = require('../db/database');

function listStorico({ asin, tipo, from, to } = {}) {
  const db = getDb();
  const where = [];
  const params = [];

  if (asin) { where.push('asin = ?'); params.push(asin); }
  if (tipo) { where.push('tipo = ?'); params.push(tipo); }
  if (from) { where.push('ts >= ?'); params.push(from); }
  if (to)   { where.push('ts <= ?'); params.push(to); }

  const sql = `
    SELECT id, asin, tipo, qty, ts, note
    FROM storico
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ts DESC, id DESC
    LIMIT 500
  `;
  return db.prepare(sql).all(...params);
}

module.exports = { listStorico };
