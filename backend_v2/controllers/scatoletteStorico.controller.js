const ScatoletteService = require("../services/scatolette.service");

exports.getStorico = (req, res) => {
  try {
    const righe = ScatoletteService.getStoricoScatolette();
    return res.json(righe);
  } catch (err) {
    console.error("❌ Errore GET /scatolette/storico:", err);
    return res.status(500).json({
      error: "Errore nel recupero storico scatolette",
      details: err.message,
    });
  }
};
