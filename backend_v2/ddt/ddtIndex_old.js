// backend_v2/ddt/ddtIndex.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const PDFDocument = require("pdfkit");
const path = require("path");

const { getPrebolle } = require("./prebolle");

// 📦 Rotta per le pre-bolle (spedizioni confermate)
router.get("/prebolle", getPrebolle);

// 📝 Conferma un DDT con dati manuali
router.post("/conferma/:idSpedizione", (req, res) => {
  try {
    const db = getDb();
    const idSpedizione = req.params.idSpedizione;
    const {
      numeroSpedizione,
      dataDdt,
      numeroCartone,
      numeroPacco,
      trasportatore,
      righeExtra, // array con codici pacco per ogni riga
    } = req.body;

    const spedizione = db
      .prepare(
        `SELECT id, progressivo, paese, data, operatore, note
         FROM spedizioni
         WHERE id = ? AND LOWER(stato) = 'confermata'`
      )
      .get(idSpedizione);

    if (!spedizione) {
      return res
        .status(404)
        .json({ error: "Spedizione non trovata o non confermata" });
    }

    const insertDdt = db.prepare(
      `INSERT INTO ddt (
          progressivo, paese, data, operatore, note,
          numero_spedizione, data_ddt, numero_cartone, numero_pacco, trasportatore
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = insertDdt.run(
      spedizione.progressivo,
      spedizione.paese,
      spedizione.data,
      spedizione.operatore,
      spedizione.note,
      numeroSpedizione,
      dataDdt,
      numeroCartone,
      numeroPacco,
      trasportatore
    );
    const ddtId = result.lastInsertRowid;

    const righe = db
      .prepare(
        `SELECT asin, sku, prodotto_nome, quantita
         FROM spedizioni_righe
         WHERE spedizione_id = ?`
      )
      .all(idSpedizione);

    const insertRiga = db.prepare(
      `INSERT INTO ddt_righe (ddt_id, asin, sku, prodotto_nome, quantita, codice_pacco)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertMany = db.transaction((rows) => {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const codicePacco = righeExtra?.[i]?.codicePacco || null;
        insertRiga.run(
          ddtId,
          r.asin,
          r.sku,
          r.prodotto_nome,
          r.quantita,
          codicePacco
        );
      }
    });
    insertMany(righe);

    res.json({
      message: "DDT confermato con successo",
      ddtId,
    });
  } catch (err) {
    console.error("Errore conferma DDT:", err);
    res.status(500).json({ error: "Errore conferma DDT" });
  }
});

// 📄 Test PDF (verifica funzionamento pdfkit)
// 📄 Test PDF
router.get("/test-pdf", (req, res) => {
  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=test.pdf");
  doc.pipe(res);

  // Titolo
  doc.fontSize(20).text("✅ PDFKit funziona!", { align: "center" });

  // Logo (se presente in public/images/logo.png)
  const logoPath = path.join(__dirname, "../../frontend/public/images/logo.png");
  try {
    doc.image(logoPath, {
      fit: [120, 120],
      align: "center",
      valign: "center",
    });
  } catch (err) {
    doc.moveDown().text("⚠️ Logo non trovato", { align: "center" });
  }

  doc.end();
});


module.exports = router;
