// controllers/accessoriController.js
const AccessoriService = require("../services/accessoriService");
const logger = require("../utils/logger");

const AccessoriController = {
  /** 📦 GET tutti gli accessori */
  getAllAccessori: (req, res) => {
    try {
      const accessori = AccessoriService.getAllAccessori();
      return res.json(accessori);
    } catch (err) {
      logger.error({ err }, "[ACCESSORI][GET] Errore");
      return res.status(500).json({ error: "Errore nel recupero accessori" });
    }
  },

  /** 🔎 GET singolo accessorio */
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
      logger.error({ err }, "[ACCESSORI][GET ONE] Errore");
      return res.status(500).json({ error: "Errore nel recupero accessorio" });
    }
  },

  /** ➕ POST crea nuovo accessorio */
  createAccessorio: (req, res) => {
    try {
      const created = AccessoriService.createAccessorio(req.body);
      return res.status(201).json({ ok: true, data: created });
    } catch (err) {
      const status = err.statusCode || 500;
      logger.error({ err }, "[ACCESSORI][CREATE] Errore");
      return res.status(status).json({ error: err.message || "Errore creazione accessorio" });
    }
  },

  /** ✏️ PATCH rettifica quantità (ASSOLUTA) + storico automatico */
  updateQuantitaAccessorio: (req, res) => {
    try {
      const { asin_accessorio } = req.params;
      const { quantita, nota = "", operatore = "admin" } = req.body;

      if (typeof quantita !== "number" || quantita < 0) {
        return res
          .status(400)
          .json({ error: 'Campo "quantita" deve essere un numero >= 0' });
      }

      // aggiorna + salva storico (tutto gestito nel service)
      const result = AccessoriService.updateQuantitaAccessorio(
        asin_accessorio,
        quantita,
        nota,
        operatore
      );

      return res.json({ ok: true, message: "Accessorio aggiornato", data: result });

    } catch (err) {
      logger.error({ err }, "[ACCESSORI][PATCH] Errore");
      return res
        .status(500)
        .json({ error: "Errore interno durante aggiornamento accessorio" });
    }
  },

  /** 🎯 PATCH imposta soglia minima */
  updateSogliaAccessorio: (req, res) => {
    try {
      const { asin_accessorio } = req.params;
      const { soglia_minima } = req.body;

      if (typeof soglia_minima !== "number" || soglia_minima < 0) {
        return res.status(400).json({ error: '"soglia_minima" deve essere un numero >= 0' });
      }

      const result = AccessoriService.updateSogliaAccessorio(asin_accessorio, soglia_minima);
      return res.json(result);
    } catch (err) {
      logger.error({ err }, "[ACCESSORI][SOGLIA] Errore");
      return res.status(500).json({ error: "Errore nell'aggiornamento soglia" });
    }
  },

  /** 📜 GET storico movimenti accessori */
  getStoricoAccessori: (req, res) => {
    try {
      const righe = AccessoriService.getStoricoAccessori();
      return res.json(righe);
    } catch (err) {
      logger.error({ err }, "[ACCESSORI][STORICO] Errore");
      return res
        .status(500)
        .json({ error: "Errore nel recupero storico accessori" });
    }
  },
};

module.exports = AccessoriController;
