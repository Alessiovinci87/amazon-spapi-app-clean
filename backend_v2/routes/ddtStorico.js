// backend_v2/routes/ddtStorico.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const pdf = require("html-pdf-node");
const { getDb } = require("../db/database");

const router = express.Router();

const templatePath = path.join(__dirname, "../ddt/templates/ddtGenericoTemplate.html");

const PDF_OPTIONS = { format: "A4", margin: { top: 20, bottom: 20, left: 15, right: 15 } };

// Escape HTML — previene XSS nel template PDF
function esc(val) {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Sostituisce tutti i [[KEY]] nel template (regex globale)
function replacePlaceholder(template, key, value) {
  return template.replace(new RegExp(`\\[\\[${key}\\]\\]`, "g"), value);
}

// 📄 Elenco storico DDT
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
router.get("/storico/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const ddt = db.prepare(`SELECT * FROM ddt_generici WHERE id = ?`).get(id);
    if (!ddt) return res.status(404).json({ error: "DDT non trovato" });

    const righe = db.prepare(`SELECT * FROM ddt_generici_righe WHERE ddt_id = ?`).all(id);

    let righeHtml = "";
    let totUnita = 0;
    let totColli = 0;

    if (righe.length > 0) {
      righeHtml = righe
        .map(r => {
          totUnita += Number(r.quantita || 0);
          const colli = (r.cartoni || "").split(";").filter(x => x.trim() !== "");
          totColli += colli.length;

          return `
            <tr>
              <td>${esc(r.quantita)}</td>
              <td>${esc(r.prodottoNome)}</td>
              <td>ASIN: ${esc(r.asin)}<br/>SKU: ${esc(r.sku)}</td>
              <td>${esc(r.cartoni)}</td>
              <td>${esc(r.pacchi)}</td>
            </tr>`;
        })
        .join("");
    } else {
      righeHtml = "<tr><td colspan='5'>Nessuna riga salvata</td></tr>";
    }

    const brandConfig = {
      lookink: { logo: "/static/images/LOOKINK-Logo.png", intestazione: "Dissimile Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02963100900 – info@lookink.net" },
      cside:   { logo: "/static/images/C-Side-Logo.png",  intestazione: "Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com" },
      pics:    { logo: "/static/images/logo.png",          intestazione: "Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com" },
    };
    const brandData = brandConfig[ddt.brand] || brandConfig["pics"];
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3005";

    let template = fs.readFileSync(templatePath, "utf8");

    template = replacePlaceholder(template, "LOGO_PATH", `${backendUrl}${brandData.logo}`);
    template = replacePlaceholder(template, "INTESTAZIONE", brandData.intestazione);
    template = replacePlaceholder(template, "NUMERO_DDT", esc(ddt.numeroDDT));
    template = replacePlaceholder(template, "NUMERO_AMAZON", esc(ddt.numeroAmazon));
    template = replacePlaceholder(template, "DATA", esc(ddt.data));
    template = replacePlaceholder(template, "DESTINATARIO", brandData.intestazione.split("–")[0].trim());
    template = replacePlaceholder(template, "INDIRIZZO_DESTINATARIO", esc(ddt.paese));
    template = replacePlaceholder(template, "CENTRO_LOGISTICO", esc(ddt.centro));
    template = replacePlaceholder(template, "RIGHE", righeHtml);
    template = replacePlaceholder(template, "TOT_UNITA", totUnita || ddt.totUnita);
    template = replacePlaceholder(template, "TOT_COLLI", totColli || ddt.totColli);
    template = replacePlaceholder(template, "TRASPORTATORE", esc(ddt.trasportatore));
    template = replacePlaceholder(template, "TRACKING", esc(ddt.tracking));

    const pdfBuffer = await pdf.generatePdf({ content: template }, PDF_OPTIONS);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=ddt_storico_${ddt.numeroDDT}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Errore generazione PDF storico:", err);
    res.status(500).json({ error: "Errore generazione PDF storico" });
  }
});

module.exports = router;
