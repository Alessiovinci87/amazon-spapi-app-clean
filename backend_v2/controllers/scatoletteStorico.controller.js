const ScatoletteService = require("../services/scatolette.service");
const logger = require("../utils/logger");

exports.getStorico = (req, res) => {
  try {
    const righe = ScatoletteService.getStoricoScatolette();
    return res.json(righe);
  } catch (err) {
    logger.error({ err }, "Errore GET /scatolette/storico");
    return res.status(500).json({
      error: "Errore nel recupero storico scatolette",
      details: err.message,
    });
  }
};
