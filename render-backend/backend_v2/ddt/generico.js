// backend_v2/ddt/generico.js
const express = require("express");
const router = express.Router();

// libreria per creare PDF (puoi riusare quella che usi già per i DDT)
const PDFDocument = require("pdfkit");

router.post("/pdf", async (req, res) => {
  try {
    const {
      brand,
      numeroDDT,
      numeroAmazon,
      data,
      paese,
      centro,
      trasportatore,
      tracking,
      righe = [],
    } = req.body;

    // Logica PDF (molto base per testare che funzioni)
    const doc = new PDFDocument();
    let buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res
        .writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename=ddt-generico.pdf`,
          "Content-Length": pdfData.length,
        })
        .end(pdfData);
    });

    // intestazione
    doc.fontSize(20).text("📄 DDT GENERICO", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Brand: ${brand}`);
    doc.text(`Numero DDT: ${numeroDDT}`);
    doc.text(`Riferimento Amazon: ${numeroAmazon}`);
    doc.text(`Data: ${data}`);
    doc.text(`Paese: ${paese}`);
    doc.text(`Centro: ${centro}`);
    doc.text(`Trasportatore: ${trasportatore}`);
    doc.text(`Tracking: ${tracking}`);
    doc.moveDown();

    // prodotti
    righe.forEach((r, i) => {
      doc.text(
        `${i + 1}) ${r.prodottoNome} | Q.tà: ${r.quantita} | ASIN: ${r.asin} | SKU: ${r.sku}`
      );
    });

    doc.end();
  } catch (err) {
    console.error("❌ Errore creazione PDF generico:", err);
    res.status(500).json({ error: "Errore creazione PDF generico" });
  }
});

module.exports = router;
