// backend_v2/ddt/prebolle.js
const { getDb } = require("../db/database");

/**
 * 📦 Recupera tutte le spedizioni (per pre-bolle DDT)
 */
function getPrebolle(req, res) {
    try {
        const db = getDb();

       const query = `
  SELECT s.id, s.progressivo, s.paese, s.data, s.operatore, s.note,
         r.asin, r.sku, r.prodotto_nome, r.quantita
  FROM spedizioni s
  JOIN spedizioni_righe r ON r.spedizione_id = s.id
  WHERE LOWER(s.stato) = 'confermata'
  ORDER BY s.data DESC, s.progressivo DESC
`;

        const results = db.prepare(query).all();

        // Raggruppa per spedizione
        const prebolle = results.reduce((acc, row) => {
            let spedizione = acc.find((s) => s.id === row.id);
            if (!spedizione) {
                spedizione = {
                    id: row.id,
                    progressivo: row.progressivo,
                    paese: row.paese,
                    data: row.data,
                    operatore: row.operatore,
                    note: row.note,
                    righe: [],
                };
                acc.push(spedizione);
            }
            spedizione.righe.push({
                asin: row.asin,
                sku: row.sku,
                prodotto_nome: row.prodotto_nome,
                quantita: row.quantita,
            });
            return acc;
        }, []);

        res.json(prebolle);
    } catch (err) {
        console.error("Errore recupero prebolle:", err);
        res.status(500).json({ error: "Errore nel recupero prebolle" });
    }
}

module.exports = { getPrebolle };
