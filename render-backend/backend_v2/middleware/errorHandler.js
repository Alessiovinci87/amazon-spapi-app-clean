function notFoundHandler(req, res, next) {
  res.status(404).json({
    ok: false,
    message: `Endpoint non trovato: ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  res.status(err.status || 500).json({
    ok: false,
    message: err.message || 'Errore interno del server',
    // mostra lo stack solo se sei in sviluppo
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = { notFoundHandler, errorHandler };
