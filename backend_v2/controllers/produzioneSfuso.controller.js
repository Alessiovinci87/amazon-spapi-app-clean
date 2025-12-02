

// backend_v2/controllers/produzioneSfuso.controller.js
const produzioneService = require("../services/produzioneSfuso.service");
const { getDb } = require("../db/database");

/* =========================================================
   🎛️ CONTROLLER PRODUZIONI SFUSO
   Gestisce pianificazione, aggiornamento e completamento
========================================================= */

// 🔹 GET /api/v2/produzioni-sfuso
exports.getAllProduzioni = async (req, res) => {
  try {
    const { stato } = req.query; // opzionale: ?stato=Pianificata
    const data = produzioneService.getAllProduzioni(stato);
    res.json({ ok: true, data });
  } catch (err) {
    console.error("❌ Errore getAllProduzioni:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
};

// 🔹 POST /api/v2/produzioni-sfuso
exports.creaProduzione = async (req, res) => {
  try {
    const produzione = produzioneService.creaProduzione(req.body);
    res.json({ ok: true, message: "Produzione creata correttamente", data: produzione });
  } catch (err) {
    console.error("❌ Errore creaProduzione:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
};


// 🔹 POST /api/v2/produzioni-sfuso/crea-da-prenotazione
exports.creaDaPrenotazione = async (req, res) => {
  try {
    const risultato = produzioneService.creaProduzioneDaPrenotazione(req.body);

    const idProduzione = risultato.id_produzione;
    const idPrenotazione = req.body.id;

    // 🔥 COLLEGA PRENOTAZIONE ↔ PRODUZIONE
    const db = getDb();
    db.prepare(`
      UPDATE prenotazioni_sfuso
      SET id_produzione = ?
      WHERE id = ?
    `).run(idProduzione, idPrenotazione);

    res.json({
      ok: true,
      message: "Produzione creata da prenotazione",
      id_produzione: idProduzione,
      data: risultato
    });
  } catch (err) {
    console.error("❌ Errore creaDaPrenotazione:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
};



// 🔹 PATCH /api/v2/produzioni-sfuso/:id
exports.aggiornaProduzione = async (req, res) => {
  try {
    const { id } = req.params;
    const produzioneAggiornata = produzioneService.aggiornaProduzione(id, req.body);
    res.json({ ok: true, message: "Produzione aggiornata", data: produzioneAggiornata });
  } catch (err) {
    console.error("❌ Errore aggiornaProduzione:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
};

// 🔹 POST /api/v2/produzioni-sfuso/:id/completa
exports.completaProduzione = async (req, res) => {
  try {
    const { id } = req.params;
    const { operatore = "system" } = req.body;
        console.log("🔥 DEBUG CONTROLLER — ID ricevuto:", id, "operatore:", operatore);

    const risultato = produzioneService.completaProduzione(id, operatore);
    res.json({ ok: true, message: "Produzione completata", data: risultato });
  } catch (err) {
    console.error("❌ Errore completaProduzione:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
};

// 🔹 DELETE /api/v2/produzioni-sfuso/:id
exports.eliminaProduzione = async (req, res) => {
  try {
    const { id } = req.params;
    produzioneService.eliminaProduzione(id);
    res.json({ ok: true, message: "Produzione eliminata" });
  } catch (err) {
    console.error("❌ Errore eliminaProduzione:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
};
