const express = require("express");
const fs = require("fs");
const path = require("path");
const pdf = require("html-pdf-node");
const { getDb } = require("../db/database");

const router = express.Router();

// Il path Chrome viene letto dall'env, non hardcoded
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  process.env.PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH;
}

// Percorso ai template
const templatePath = path.join(__dirname, "../ddt/templates/ddtGenericoTemplate.html");
const templatePicsNailsPath = path.join(__dirname, "../ddt/templates/ddtPicsNailsTemplate.html");

// PDF options comuni
const PDF_OPTIONS = { format: "A4", margin: { top: 20, bottom: 20, left: 15, right: 15 } };

/**
 * Escape caratteri HTML pericolosi per prevenire XSS nel template PDF.
 * @param {*} val
 * @returns {string}
 */
function esc(val) {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sostituisce tutti i placeholder [[KEY]] nel template con il valore fornito.
 * @param {string} template
 * @param {string} key
 * @param {string} value
 * @returns {string}
 */
function replacePlaceholder(template, key, value) {
  return template.replace(new RegExp(`\\[\\[${key}\\]\\]`, "g"), value);
}

/**
 * Compila le righe prodotto in HTML e restituisce { righeHtml, totUnita, totColli }.
 * @param {Array} righe
 * @param {boolean} mostraAsinInColonna - se true, ASIN è colonna separata (layout generico)
 */
function compilaRighe(righe, mostraAsinInColonna = true) {
  let totUnita = 0;
  let totColli = 0;

  const righeHtml = righe
    .map((r) => {
      totUnita += Number(r.quantita || 0);
      if (r.cartone) totColli += 1;

      if (mostraAsinInColonna) {
        return `
          <tr>
            <td>${esc(r.quantita)}</td>
            <td>${esc(r.prodottoNome)}</td>
            <td>ASIN: ${esc(r.asin) || "-"}<br>SKU: ${esc(r.sku) || "-"}</td>
            <td>${esc(r.cartone)}</td>
            <td>${esc(r.pacco)}</td>
          </tr>`;
      } else {
        return `
          <tr>
            <td>${esc(r.quantita)}</td>
            <td>${esc(r.prodottoNome)}</td>
            <td>ASIN: ${esc(r.asin) || "-"}<br>SKU: ${esc(r.sku) || "-"}</td>
            <td>${esc(r.cartone)}</td>
            <td>${esc(r.pacco)}</td>
          </tr>`;
      }
    })
    .join("");

  return { righeHtml, totUnita, totColli };
}

/**
 * Salva il DDT nel DB e restituisce l'ID inserito.
 */
function salvaDdtNelDb(db, brand, fields, righe, totUnita, totColli) {
  const { numeroDDT, numeroAmazon, data, paese, centro, trasportatore, tracking } = fields;

  const info = db
    .prepare(
      `INSERT INTO ddt_generici
       (brand, numeroDDT, numeroAmazon, data, paese, centro, trasportatore, tracking, totUnita, totColli)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(brand, numeroDDT, numeroAmazon, data, paese, centro, trasportatore, tracking, totUnita, totColli);

  const ddtId = info.lastInsertRowid;

  const insertRiga = db.prepare(
    `INSERT INTO ddt_generici_righe
     (ddt_id, prodottoNome, asin, sku, quantita, cartone, pacco)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (const r of righe) {
    insertRiga.run(ddtId, r.prodottoNome || "", r.asin || "", r.sku || "", r.quantita || 0, r.cartone || "", r.pacco || "");
  }

  return ddtId;
}

// ============================================================
// POST -> genera PDF DDT generico
// ============================================================
router.post("/generico/pdf", async (req, res) => {
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
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3005";

    let template = fs.readFileSync(templatePath, "utf8");
    const { righeHtml, totUnita, totColli } = compilaRighe(righe, true);

    const fields = { numeroDDT, numeroAmazon, data, paese, centro, trasportatore, tracking };

    template = replacePlaceholder(template, "LOGO_PATH", `${backendUrl}${brandData.logo}`);
    template = replacePlaceholder(template, "INTESTAZIONE", brandData.intestazione);
    template = replacePlaceholder(template, "NUMERO_DDT", esc(numeroDDT));
    template = replacePlaceholder(template, "NUMERO_AMAZON", esc(numeroAmazon));
    template = replacePlaceholder(template, "DATA", esc(data));
    template = replacePlaceholder(template, "IMPORTATORE_REGISTRATO", `${brandData.intestazione.split("–")[0].trim()} – ${esc(centro)}`);
    template = replacePlaceholder(template, "INDIRIZZO_DESTINATARIO", esc(paese));
    template = replacePlaceholder(template, "CENTRO_LOGISTICO", esc(centro));
    template = replacePlaceholder(template, "RIGHE", righeHtml);
    template = replacePlaceholder(template, "TOT_UNITA", totUnita);
    template = replacePlaceholder(template, "TOT_COLLI", totColli);
    template = replacePlaceholder(template, "TRASPORTATORE", esc(trasportatore));
    template = replacePlaceholder(template, "TRACKING", esc(tracking));

    const pdfBuffer = await pdf.generatePdf({ content: template }, PDF_OPTIONS);

    const db = getDb();
    const ddtId = salvaDdtNelDb(db, brand, fields, righe, totUnita, totColli);
    console.log(`✅ DDT generico salvato con ID ${ddtId}`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=ddt_generico_${numeroDDT}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Errore generazione DDT generico:", err.message);
    res.status(500).json({ error: "Errore generazione PDF", details: err.message });
  }
});

// ============================================================
// POST -> genera PDF DDT Pics Nails (da spedizione)
// ============================================================
router.post("/pics-nails/pdf", async (req, res) => {
  try {
    const {
      numeroDDT,
      numeroAmazon,
      data,
      paese,
      centro,
      trasportatore,
      tracking,
      righe = [],
      spedizioneProgressivo,
    } = req.body;

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3005";
    const logoPath = `${backendUrl}/static/images/logo.png`;
    const dataFormattata = data ? new Date(data).toLocaleDateString("it-IT") : "";

    let template = fs.readFileSync(templatePicsNailsPath, "utf8");
    const { righeHtml, totUnita, totColli } = compilaRighe(righe, false);

    const fields = { numeroDDT, numeroAmazon, data, paese, centro, trasportatore, tracking };

    template = replacePlaceholder(template, "LOGO_PATH", logoPath);
    template = replacePlaceholder(template, "NUMERO_DDT", esc(numeroDDT));
    template = replacePlaceholder(template, "NUMERO_AMAZON", esc(numeroAmazon) || "-");
    template = replacePlaceholder(template, "DATA", dataFormattata);
    template = replacePlaceholder(template, "PAESE", esc(paese));
    template = replacePlaceholder(template, "CENTRO_LOGISTICO", esc(centro));
    template = replacePlaceholder(template, "RIGHE", righeHtml);
    template = replacePlaceholder(template, "TOT_UNITA", totUnita);
    template = replacePlaceholder(template, "TOT_COLLI", totColli);
    template = replacePlaceholder(template, "TRASPORTATORE", esc(trasportatore));
    template = replacePlaceholder(template, "TRACKING", esc(tracking) || "-");

    const pdfBuffer = await pdf.generatePdf({ content: template }, PDF_OPTIONS);

    const db = getDb();
    const ddtId = salvaDdtNelDb(db, "pics-nails", fields, righe, totUnita, totColli);
    console.log(`✅ DDT Pics Nails salvato con ID ${ddtId}`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=ddt_pics_nails_${numeroDDT || spedizioneProgressivo}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Errore generazione DDT Pics Nails:", err.message);
    res.status(500).json({ error: "Errore generazione PDF", details: err.message });
  }
});

module.exports = router;
