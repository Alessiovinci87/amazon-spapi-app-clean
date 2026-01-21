const magazzinoService = require("../services/magazzino.service");

/* =========================================================
   🎛️ CONTROLLER MAGAZZINO
   Espone le funzioni del service come endpoint Express
========================================================= */

/** GET /api/v2/magazzino */
function getAllProdotti(req, res, next) {
  try {
    const prodotti = magazzinoService.getAllProdotti();
    res.json({ ok: true, data: prodotti });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v2/magazzino/:asin/accessori */
function getAccessoriAssociati(req, res, next) {
  try {
    const asin = req.params.asin;
    const acc = magazzinoService.getAccessoriAssociati(asin);
    res.json({ ok: true, data: acc });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v2/magazzino/:asin/pronto */
function setProntoAssoluto(req, res, next) {
  try {
    const asin = req.params.asin;
    const { pronto, note = "", operatore = "system" } = req.body || {};

    // 🔍 Validazione parametri
    if (!asin || pronto === undefined || pronto === null) {
      return res.status(400).json({
        ok: false,
        message: "asin e pronto sono obbligatori"
      });
    }

    if (!note.trim()) {
      return res.status(400).json({
        ok: false,
        message: "La nota è obbligatoria"
      });
    }

    if (!operatore.trim()) {
      return res.status(400).json({
        ok: false,
        message: "L'operatore è obbligatorio"
      });
    }

    // 🔄 Chiamata al service usando il nome corretto
    const result = magazzinoService.setProntoAssoluto({
      asin,
      nuovoPronto: pronto, // 👈 conversione corretta
      note,
      operatore
    });

    return res.json({ ok: true, data: result });

  } catch (err) {
    next(err);
  }
}

/** POST /api/v2/magazzino/:asin/produce */
function produceDelta(req, res, next) {
  try {
    const asin = req.params.asin;
    const { qty, note = "", operatore = "system" } = req.body || {};
    const result = magazzinoService.produceDelta({ asin, qty, note, operatore });
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v2/magazzino/:asin/sfuso */
function aggiornaSfusoLitri(req, res, next) {
  try {
    const asin = req.params.asin;
    const { sfusoLitri } = req.body;
    const result = magazzinoService.aggiornaSfusoLitri(asin, sfusoLitri);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v2/magazzino/nomi */
async function getNomiProdotti(req, res, next) {
  try {
    const data = await magazzinoService.getAllProdottiNomi();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

/** 🆕 POST /api/v2/magazzino - Crea nuovo prodotto */
function createProdotto(req, res, next) {
  try {
    const payload = req.body;

    // Validazione minima
    if (!payload.nome && !payload.nome_prodotto) {
      return res.status(400).json({
        ok: false,
        message: "Il nome del prodotto è obbligatorio"
      });
    }

    const result = magazzinoService.createProdotto(payload);

    res.status(201).json({
      ok: true,
      message: "Prodotto creato con successo",
      ...result
    });

  } catch (err) {
    // Gestione errore ASIN duplicato
    if (err.message.includes("UNIQUE constraint") || err.message.includes("già esiste")) {
      return res.status(409).json({
        ok: false,
        message: "Un prodotto con questo ASIN esiste già"
      });
    }
    next(err);
  }
}

/** 🗑️ DELETE /api/v2/magazzino/:asin */
function deleteProdotto(req, res, next) {
  try {
    const { asin } = req.params;

    if (!asin) {
      return res.status(400).json({
        ok: false,
        message: "ASIN obbligatorio"
      });
    }

    const result = magazzinoService.deleteProdotto(asin);

    if (result.changes === 0) {
      return res.status(404).json({
        ok: false,
        message: `Prodotto con ASIN ${asin} non trovato`
      });
    }

    res.json({
      ok: true,
      message: `Prodotto ${asin} eliminato con successo`,
      data: result
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllProdotti,
  getAccessoriAssociati,
  setProntoAssoluto,
  produceDelta,
  aggiornaSfusoLitri,
  getNomiProdotti,
  createProdotto,  // 🆕 NUOVO
  deleteProdotto
};