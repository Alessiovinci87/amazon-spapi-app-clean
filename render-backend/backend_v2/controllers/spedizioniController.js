const service = require("../services/spedizioniService");

// 📦 GET tutte le spedizioni
function getSpedizioni(req, res) {
  try {
    const spedizioni = service.getAllSpedizioni();
    res.json(spedizioni);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 📦 POST nuova spedizione
function creaSpedizione(req, res) {
  try {
    const { paese, prodotto_nome, asin, quantita, data, operatore, note } = req.body;
    if (!paese || !prodotto_nome || !quantita || !data) {
      return res.status(400).json({ error: "Campi obbligatori mancanti" });
    }
    const nuova = service.creaSpedizione({ paese, prodotto_nome, asin, quantita, data, operatore, note });
    res.json(nuova);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ✏️ PATCH aggiorna spedizione
function aggiornaSpedizione(req, res) {
  try {
    const { id } = req.params;
    const { quantita, data, operatore, note } = req.body;

    if (!quantita && !data && !operatore && !note) {
      return res.status(400).json({ error: "Nessun campo da aggiornare" });
    }

    const aggiornata = service.aggiornaSpedizione(id, { quantita, data, operatore, note });
    if (!aggiornata) {
      return res.status(404).json({ error: "Spedizione non trovata" });
    }

    res.json(aggiornata);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getSpedizioni,
  creaSpedizione,
  aggiornaSpedizione,
};
