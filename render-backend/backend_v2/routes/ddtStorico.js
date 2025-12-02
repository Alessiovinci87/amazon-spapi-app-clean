// backend_v2/routes/ddtStorico.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const pdf = require("html-pdf-node");
const { getDb } = require("../db/database");

const router = express.Router();

// Percorso al template
const templatePath = path.join(__dirname, "../ddt/templates/ddtGenericoTemplate.html");

// 📄 Endpoint storico (già esistente)
router.get("/storico", (req, res) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(`
        SELECT id, brand, numeroDDT, numeroAmazon, data, paese, centro, trasportatore, tracking, totUnita, totColli
        FROM ddt_generici
        ORDER BY data DESC, id DESC
      `)
      .all();

    res.json(rows);
  } catch (err) {
    console.error("❌ Errore recupero storico DDT:", err);
    res.status(500).json({ error: "Errore recupero storico DDT" });
  }
});

// 📄 Rigenera PDF da storico
// 📄 Rigenera PDF da storico con righe salvate
router.get("/storico/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const ddt = db.prepare(`SELECT * FROM ddt_generici WHERE id = ?`).get(id);
    if (!ddt) return res.status(404).json({ error: "DDT non trovato" });

    // Recupero righe collegate
    const righe = db
      .prepare(`SELECT * FROM ddt_generici_righe WHERE ddt_id = ?`)
      .all(id);

    let righeHtml = "";
    let totUnita = 0;
    let totColli = 0;

    if (righe.length > 0) {
      righeHtml = righe
        .map(r => {
          totUnita += Number(r.quantita || 0);
          // conta i colli in base ai cartoni salvati
          const colli = (r.cartoni || "").split(";").filter(x => x.trim() !== "");
          totColli += colli.length;

          return `
            <tr>
              <td>${r.quantita || ""}</td>
              <td>${r.prodottoNome || ""}</td>
              <td>ASIN: ${r.asin || ""}<br/>SKU: ${r.sku || ""}</td>
              <td>${r.cartoni || ""}</td>
              <td>${r.pacchi || ""}</td>
            </tr>
          `;
        })
        .join("");
    } else {
      righeHtml = "<tr><td colspan='5'>Nessuna riga salvata</td></tr>";
    }

    // Configurazione brand
    const brandConfig = {
      lookink: { logo: "/static/images/LOOKINK-Logo.png", intestazione: "Dissimile Srl – ..." },
      cside:   { logo: "/static/images/C-Side-Logo.png", intestazione: "Pics Srl – ..." },
      pics:    { logo: "/static/images/logo.png", intestazione: "Pics Srl – ..." }
    };
    const brandData = brandConfig[ddt.brand] || brandConfig["pics"];

    let template = fs.readFileSync(templatePath, "utf8");

    template = template
      .replace("{{LOGO_PATH}}", `http://localhost:3005${brandData.logo}`)
      .replace("{{INTESTAZIONE}}", brandData.intestazione)
      .replace("{{NUMERO_DDT}}", ddt.numeroDDT || "")
      .replace("{{NUMERO_AMAZON}}", ddt.numeroAmazon || "")
      .replace("{{DATA}}", ddt.data || "")
      .replace("{{DESTINATARIO}}", brandData.intestazione.split("–")[0].trim())
      .replace("{{INDIRIZZO_DESTINATARIO}}", ddt.paese || "")
      .replace("{{CENTRO_LOGISTICO}}", ddt.centro || "")
      .replace("{{RIGHE}}", righeHtml)
      .replace("{{TOT_UNITA}}", totUnita || ddt.totUnita)
      .replace("{{TOT_COLLI}}", totColli || ddt.totColli)
      .replace("{{TRASPORTATORE}}", ddt.trasportatore || "")
      .replace("{{TRACKING}}", ddt.tracking || "");

    const options = { format: "A4", margin: { top: 20, bottom: 20, left: 15, right: 15 } };
    const file = { content: template };
    const pdfBuffer = await pdf.generatePdf(file, options);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=ddt_storico_${ddt.numeroDDT}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Errore generazione PDF storico:", err);
    res.status(500).json({ error: "Errore generazione PDF storico" });
  }
});


module.exports = router;
