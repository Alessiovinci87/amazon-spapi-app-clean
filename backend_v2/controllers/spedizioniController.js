// backend_v2/controllers/spedizioniController.js
const service = require("../services/spedizioniService");

/* ============================================================
   📦 CONTROLLER — tutte le funzioni chiamate dal router
============================================================ */

// 🟦 GET tutte le spedizioni
function getSpedizioni(req, res) {
  try {
    const dati = service.getAll();
    res.json(dati);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero delle spedizioni" });
  }
}


// 🟦 GET dettaglio spedizione + righe
function getDettaglio(req, res) {
  try {
    const { id } = req.params;
    const spedizione = service.getOne(id);

    if (!spedizione)
      return res.status(404).json({ error: "Spedizione non trovata" });

    res.json(spedizione);
  } catch (err) {
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// 🟦 GET solo righe spedizione
function getRighe(req, res) {
  try {
    const { id } = req.params;
    const righe = service.getRighe(id);
    res.json(righe);
  } catch (err) {
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// 🟩 POST crea spedizione
function creaSpedizione(req, res) {
  try {
    const nuova = service.crea(req.body);
    res.json(nuova);
  } catch (err) {
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// 🟧 POST aggiungi righe
function aggiungiRighe(req, res) {
  try {
    const { id } = req.params;
    const { righe } = req.body;
    const updated = service.addRighe(id, righe);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// 🟨 PATCH aggiorna spedizione (solo BOZZA)
function aggiornaSpedizione(req, res) {
  try {
    const { id } = req.params;
    const updated = service.update(id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// 🟪 PATCH conferma spedizione
function confermaSpedizione(req, res) {
  try {
    const { id } = req.params;
    const updated = service.conferma(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// 🟫 GET storico confermate
function getStorico(req, res) {
  try {
    const { paese, tipo_evento, da, a } = req.query;
    const storico = service.getStorico(paese, tipo_evento, da, a);
    res.json(storico);
  } catch (err) {
    console.error("❌ Errore GET storico:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// 🟥 DELETE singola spedizione
function eliminaSpedizione(req, res) {
  try {
    const { id } = req.params;
    const ok = service.delete(id);
    res.json(ok);
  } catch (err) {
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// 🟧 DELETE tutte le spedizioni
function eliminaTutte(req, res) {
  try {
    const ok = service.deleteAll();
    res.json(ok);
  } catch (err) {
    res.status(500).json({ error: "Errore interno del server" });
  }
}

module.exports = {
  getSpedizioni,
  getDettaglio,
  getRighe,
  creaSpedizione,
  aggiungiRighe,
  aggiornaSpedizione,
  confermaSpedizione,
  getStorico,
  eliminaSpedizione,
  eliminaTutte,
};
