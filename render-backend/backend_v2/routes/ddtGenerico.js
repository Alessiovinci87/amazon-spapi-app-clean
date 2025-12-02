const express = require("express");
const fs = require("fs");
const path = require("path");
const pdf = require("html-pdf-node");
process.env.PUPPETEER_EXECUTABLE_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const { getDb } = require("../db/database");




const router = express.Router();

// Percorso al template generico
const templatePath = path.join(__dirname, "../ddt/templates/ddtGenericoTemplate.html");

// POST -> genera PDF DDT generico
router.post("/generico/pdf", async (req, res) => {
  console.log("🎯 SONO NELLA ROTTA NUOVA DDT GENERICO");

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

    // Configurazione brand (loghi serviti via /static)
    const brandConfig = {
      lookink: {
        logo: "/static/images/LOOKINK-Logo.png",
        intestazione:
          "Dissimile Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02963100900 – info@lookink.net",
      },
      cside: {
        logo: "/static/images/C-Side-Logo.png",
        intestazione:
          "Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com",
      },
      pics: {
        logo: "/static/images/logo.png",
        intestazione:
          "Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com",
      },
    };

    const brandData = brandConfig[brand] || brandConfig["pics"];

    console.log("📄 Template generico usato:", templatePath);

    // Carico template HTML
    let template = fs.readFileSync(templatePath, "utf8");

    // Compilo le righe prodotti
    let totUnita = 0;
    let totColli = 0;
    const righeHtml = righe
      .map((r) => {
        totUnita += Number(r.quantita || 0);
        if (r.cartone) totColli += 1;

        return `
          <tr>
            <td>${r.quantita || ""}</td>
            <td>${r.prodottoNome || ""}</td>
            <td>ASIN: ${r.asin || ""}<br/>SKU: ${r.sku || ""}</td>
            <td>${r.cartone || ""}</td>
            <td>${r.pacco || ""}</td>
          </tr>
        `;
      })
      .join("");

    // Sostituisco i placeholder
    template = template
  .replace("[[LOGO_PATH]]", `http://localhost:3005${brandData.logo}`)
  .replace("[[INTESTAZIONE]]", brandData.intestazione)
  .replace("[[NUMERO_DDT]]", numeroDDT || "")
  .replace("[[NUMERO_AMAZON]]", numeroAmazon || "")
  .replace("[[DATA]]", data || "")
  .replace("[[IMPORTATORE_REGISTRATO]]", `${brandData.intestazione.split("–")[0].trim()} – ${centro || ""}`)
  .replace("[[INDIRIZZO_DESTINATARIO]]", paese || "")
  .replace("[[CENTRO_LOGISTICO]]", centro || "")
  .replace("[[RIGHE]]", righeHtml)
  .replace("[[TOT_UNITA]]", totUnita)
  .replace("[[TOT_COLLI]]", totColli)
  .replace("[[TRASPORTATORE]]", trasportatore || "")
  .replace("[[TRACKING]]", tracking || "");


    // Genero PDF
    const options = { format: "A4", margin: { top: 20, bottom: 20, left: 15, right: 15 } };
    const file = { content: template };
    const pdfBuffer = await pdf.generatePdf(file, options);

    // Salvo nel DB
    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO ddt_generici
         (brand, numeroDDT, numeroAmazon, data, paese, centro, trasportatore, tracking, totUnita, totColli)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        brand,
        numeroDDT,
        numeroAmazon,
        data,
        paese,
        centro,
        trasportatore,
        tracking,
        totUnita,
        totColli
      );

    const ddtId = info.lastInsertRowid || info.lastInsertRowId;
    console.log(`✅ DDT generico salvato con ID ${ddtId}`);

    // Salvo righe singole
    const insertRiga = db.prepare(
      `INSERT INTO ddt_generici_righe
       (ddt_id, prodottoNome, asin, sku, quantita, cartone, pacco)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    for (const r of righe) {
      insertRiga.run(
        ddtId,
        r.prodottoNome || "",
        r.asin || "",
        r.sku || "",
        r.quantita || 0,
        r.cartone || "",
        r.pacco || ""
      );
    }
    console.log(`📦 Salvate ${righe.length} righe per DDT ${ddtId}`);

    // Ritorno il PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=ddt_generico_${numeroDDT}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Errore generazione DDT generico:", err.message);
    console.error(err.stack);
    res.status(500).json({
      error: "Errore generazione PDF",
      details: err.message,
    });
  }
});

module.exports = router;
