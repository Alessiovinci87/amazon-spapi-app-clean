// backend_v2/routes/storicoProduzioniSfuso.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const storicoService = require("../services/storicoProduzioniSfuso.service");
const logger = require("../utils/logger");

const eventoSchema = z.object({
  id_produzione: z.coerce.number().int().positive(),
  id_sfuso: z.coerce.number().int().positive().nullish(),
  asin_prodotto: z.string().max(20).nullish(),
  nome_prodotto: z.string().max(255).nullish(),
  formato: z.string().max(40).nullish(),
  quantita: z.coerce.number().nullish(),
  litri_usati: z.coerce.number().nullish(),
  evento: z.string().min(1).max(60),
  note: z.string().max(1000).default(""),
  operatore: z.string().max(80).default("system"),
  data_evento: z.string().max(40).nullish(),
});


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
    logger.error({ err }, "Errore GET storico unificato");
    res.status(500).json({ ok: false, message: err.message });
  }
});


// =========================================================
// 🔹 POST /api/v2/storico-produsfuso
//    → registra un nuovo evento nello storico
// =========================================================
router.post("/", validate({ body: eventoSchema }), (req, res) => {
  try {
    const payload = {
      ...req.body,
      id_sfuso: req.body.id_sfuso ?? null,
      asin_prodotto: req.body.asin_prodotto ?? null,
      nome_prodotto: req.body.nome_prodotto ?? null,
      formato: req.body.formato ?? null,
      quantita: req.body.quantita ?? null,
      litri_usati: req.body.litri_usati ?? null,
      data_evento: req.body.data_evento ?? null,
    };

    storicoService.registraStoricoProduzione(payload);

    res.json({ ok: true, message: "Evento storico registrato" });

  } catch (err) {
    logger.error({ err }, "Errore POST storico produzioni");
    res.status(500).json({ ok: false, message: err.message });
  }
});


module.exports = router;
