// controllers/accessoriController.js
const AccessoriService = require('../services/accessoriService');

const AccessoriController = {
  /** GET tutti gli accessori */
  getAllAccessori: (req, res) => {
    try {
      const accessori = AccessoriService.getAllAccessori();
      return res.json(accessori);
    } catch (err) {
      console.error('❌ [ACCESSORI][GET] Errore:', err.message);
      return res.status(500).json({ error: 'Errore nel recupero accessori' });
    }
  },

  /** GET singolo accessorio */
  getAccessorio: (req, res) => {
    try {
      const { asin_accessorio } = req.params;
      const acc = AccessoriService.getAccessorio(asin_accessorio);
      if (!acc) {
        return res
          .status(404)
          .json({ error: `Accessorio ${asin_accessorio} non trovato` });
      }
      return res.json(acc);
    } catch (err) {
      console.error('❌ [ACCESSORI][GET ONE] Errore:', err.message);
      return res.status(500).json({ error: 'Errore nel recupero accessorio' });
    }
  },

  /** PATCH aggiorna quantità + salva nello storico */
  updateQuantitaAccessorio: (req, res) => {
    try {
      const { asin_accessorio } = req.params;
      const { quantita, note, operatore } = req.body;

      if (typeof quantita !== 'number' || quantita < 0) {
        return res
          .status(400)
          .json({ error: 'Campo "quantita" deve essere un numero >= 0' });
      }

      // recupera accessorio per avere il valore precedente
      const accessorio = AccessoriService.getAccessorio(asin_accessorio);
      if (!accessorio) {
        return res
          .status(404)
          .json({ error: `Accessorio ${asin_accessorio} non trovato` });
      }

      const quantitaPrecedente = accessorio.quantita;

      // aggiorna la quantità
      const result = AccessoriService.updateQuantitaAccessorio(
        asin_accessorio,
        quantita
      );

      // DEBUG log
      console.log('[STORICO][DEBUG] Rettifica accessorio:', {
        asin_accessorio,
        nome: accessorio.nome,
        quantitaPrecedente,
        quantitaNuova: quantita,
        note,
        operatore,
      });

      // salva nello storico tramite il service
      AccessoriService.salvaStoricoAccessorio({
        asin_accessorio,
        nome: accessorio.nome,
        quantitaPrecedente,
        quantitaNuova: quantita,
        nota: note || '',
        operatore: operatore || '',
      });

      return res.json(result);
    } catch (err) {
      console.error('❌ [ACCESSORI][PATCH] Errore:', err.message);
      return res
        .status(500)
        .json({ error: 'Errore interno durante aggiornamento accessorio' });
    }
  },

  /** 📜 GET storico accessori */
  getStoricoAccessori: (req, res) => {
    try {
      const righe = AccessoriService.getStoricoAccessori();
      return res.json(righe);
    } catch (err) {
      console.error('❌ [ACCESSORI][STORICO] Errore:', err.message);
      return res
        .status(500)
        .json({ error: 'Errore nel recupero storico accessori' });
    }
  },
};

module.exports = AccessoriController;
