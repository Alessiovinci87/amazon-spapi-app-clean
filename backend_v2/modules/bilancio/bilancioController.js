const {
  dbGetCatalogo,
  dbUpsertCosto,
  dbGetMovimenti,
  dbRegistraMovimento
} = require("./bilancioService");

// ===============================
// 📘 GET /catalogo
// ===============================
async function getCatalogoCosti(req, res) {
  try {
    const data = dbGetCatalogo();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

// ===============================
// 📘 POST /catalogo
// ===============================
async function upsertCosto(req, res) {
  try {
    const { tipo, id_riferimento, costo, note } = req.body;

    if (!tipo || !id_riferimento || costo == null) {
      return res.status(400).json({ ok: false, error: "Parametri mancanti" });
    }

    dbUpsertCosto(tipo, id_riferimento, costo, note || null);

    res.json({ ok: true, message: "Costo aggiornato" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

// ===============================
// 📙 GET /movimenti
// ===============================
async function getMovimentiBilancio(req, res) {
  try {
    const { from, to } = req.query;
    const data = dbGetMovimenti(from, to);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

// ===============================
// 📙 POST /movimenti
// ===============================
async function registraMovimento(req, res) {
  try {
    const { tipo, id_riferimento, quantita, costo_totale, note } = req.body;

    if (!tipo || !id_riferimento || !quantita || !costo_totale) {
      return res.status(400).json({ ok: false, error: "Parametri mancanti" });
    }

    dbRegistraMovimento(tipo, id_riferimento, quantita, costo_totale, note);

    res.json({ ok: true, message: "Movimento registrato" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  getCatalogoCosti,
  upsertCosto,
  getMovimentiBilancio,
  registraMovimento
};
