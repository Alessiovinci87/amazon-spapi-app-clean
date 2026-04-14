const logger = require("../utils/logger");

function notFoundHandler(req, res, next) {
  res.status(404).json({
    ok: false,
    message: `Endpoint non trovato: ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  (req.log || logger).error({ err, url: req.originalUrl }, "Errore richiesta");

  res.status(err.status || 500).json({
    ok: false,
    message: err.message || 'Errore interno del server',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = { notFoundHandler, errorHandler };
