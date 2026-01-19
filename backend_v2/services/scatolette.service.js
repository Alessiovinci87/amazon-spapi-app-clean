// backend_v2/services/scatolette.service.js
const { getDb } = require("../db/database");

function getStoricoScatolette() {
  const db = getDb();
  return db.prepare(`
    SELECT 
      id,
      asin_prodotto,
      scatoletta,
      delta,
      quantita_finale,
      nota,
      operatore,
      created_at
    FROM storico_movimenti_scatolette
    ORDER BY created_at DESC
  `).all();
}

module.exports = {
  getStoricoScatolette,
};
