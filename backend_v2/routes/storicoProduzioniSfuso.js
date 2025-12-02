// backend_v2/routes/storicoProduzioniSfuso.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const storicoService = require("../services/storicoProduzioniSfuso.service");


// =========================================================
// 🔹 GET /api/v2/storico-produsfuso
//    → restituisce tutto lo storico o filtra per id_produzione
// =========================================================
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const { id_produzione } = req.query;

    let query = `
      SELECT 
        id,
        id_produzione,
        id_sfuso,
        asin_prodotto,
        nome_prodotto,
        formato,
        quantita,
        litri_usati,
        evento,
        note,
        operatore,
        data_evento
      FROM storico_produzioni_sfuso
    `;

    // 🔹 SE È UNA PRODUZIONE SPECIFICA → Filtra solo la prima tabella
    const params = [];
    if (!id_produzione) {
      query += `
        UNION ALL
        SELECT
          id,
          id_prenotazione AS id_produzione,
          id_sfuso,
          asin_prodotto,
          nome_prodotto,
          formato,
          prodotti AS quantita,
          litriImpegnati AS litri_usati,
          stato AS evento,
          nota AS note,
          operatore,
          dataRichiesta AS data_evento
        FROM storico_sfuso
      `;
    }

    // 🔹 Ordina sempre per data
    query += " ORDER BY data_evento DESC";

    const rows = db.prepare(query).all(...params);

    res.json({ ok: true, data: rows });

  } catch (err) {
    console.error("❌ Errore GET storico unificato:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});


// =========================================================
// 🔹 POST /api/v2/storico-produsfuso
//    → registra un nuovo evento nello storico
// =========================================================
router.post("/", (req, res) => {
  try {
    const payload = {
      id_produzione: req.body.id_produzione,
      id_sfuso: req.body.id_sfuso ?? null,
      asin_prodotto: req.body.asin_prodotto ?? null,
      nome_prodotto: req.body.nome_prodotto ?? null,
      formato: req.body.formato ?? null,
      quantita: req.body.quantita ?? null,
      litri_usati: req.body.litri_usati ?? null,
      evento: req.body.evento,  // CREATA / AGGIORNATA / COMPLETATA / ELIMINATA
      note: req.body.note || "",
      operatore: req.body.operatore || "system"
    };

    if (!payload.id_produzione) {
      return res.status(400).json({
        ok: false,
        message: "id_produzione obbligatorio"
      });
    }

    if (!payload.evento) {
      return res.status(400).json({
        ok: false,
        message: "evento obbligatorio"
      });
    }

    storicoService.registraEvento(payload);

    res.json({ ok: true, message: "Evento storico registrato" });

  } catch (err) {
    console.error("❌ Errore POST storico produzioni:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});


module.exports = router;
