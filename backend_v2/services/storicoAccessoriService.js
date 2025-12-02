// backend_v2/services/storicoAccessoriService.js
const { getDb } = require('../db/database');
const { listStorico } = require('./storicoService');

function listStoricoConAccessori(filters = {}) {
  const db = getDb();
  const righe = listStorico(filters);

  return righe.map(r => {
    if (r.tipo === "PRODUZIONE") {
      const accessori = db.prepare(
        `SELECT asin, qty 
         FROM storico
         WHERE tipo = 'CONSUMO_ACCESSORI' AND id_riferimento = ?`
      ).all(r.id);

      return { ...r, accessori };
    }
    return r;
  });
}

module.exports = { listStoricoConAccessori };
