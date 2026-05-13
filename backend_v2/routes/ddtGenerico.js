const express = require("express");
const fs = require("fs");
const path = require("path");
const pdf = require("html-pdf-node");
const { getDb } = require("../db/database");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const logger = require("../utils/logger");
const { logoToDataUri } = require("../utils/logoUtils");

const router = express.Router();

const rigaSchema = z.object({
  prodottoNome: z.string().max(255).default(""),
  asin: z.string().max(20).default(""),
  sku: z.string().max(80).default(""),
  quantita: z.coerce.number().int().min(0).default(0),
  cartone: z.coerce.string().max(40).default(""),
  pacco: z.coerce.string().max(40).default(""),
  lotto: z.string().max(80).nullish(),
  tracking: z.string().max(200).nullish(),
});
const ddtPdfSchema = z.object({
  brand: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["lookink", "cside", "pics"]).optional()),
  numeroDDT: z.string().max(80).nullish(),
  numeroAmazon: z.string().max(80).nullish(),
  data: z.string().max(40).nullish(),
  paese: z.string().max(120).nullish(),
  centro: z.string().nullish(),
  trasportatore: z.string().max(120).nullish(),
  tracking: z.string().max(200).nullish(),
  righe: z.array(rigaSchema).default([]),
});
const picsNailsPdfSchema = ddtPdfSchema.extend({
  spedizioneProgressivo: z.union([z.string().max(40), z.coerce.number()]).nullish(),
});

// Il path Chrome viene letto dall'env, non hardcoded
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  process.env.PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH;
}

// Percorso ai template
const templatePath = path.join(__dirname, "../ddt/templates/ddtGenericoTemplate.html");

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

// Come esc(), ma preserva le interruzioni di riga (convertite in <br>)
function escMultiline(val) {
  return esc(val).replace(/\r?\n/g, "<br>");
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
            <td>ASIN: ${esc(r.asin) || "-"}<br>SKU: ${esc(r.sku) || "-"}${r.tracking ? `<br><b>Tracking UPS:</b> ${esc(r.tracking)}` : ""}</td>
            <td>${esc(r.cartone)}</td>
            <td>${esc(r.pacco)}</td>
          </tr>`;
      } else {
        return `
          <tr>
            <td>${esc(r.quantita)}</td>
            <td>${esc(r.prodottoNome)}</td>
            <td>ASIN: ${esc(r.asin) || "-"}<br>SKU: ${esc(r.sku) || "-"}${r.tracking ? `<br><b>Tracking UPS:</b> ${esc(r.tracking)}` : ""}</td>
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
     (ddt_id, prodottoNome, asin, sku, quantita, cartone, pacco, lotto, tracking)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const r of righe) {
    insertRiga.run(ddtId, r.prodottoNome || "", r.asin || "", r.sku || "", r.quantita || 0, r.cartone || "", r.pacco || "", r.lotto || null, r.tracking || null);
  }

  return ddtId;
}

// ============================================================
// POST -> genera PDF DDT generico
// ============================================================
router.post("/generico/pdf", validate({ body: ddtPdfSchema }), async (req, res) => {
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
        logo: "/static/images/C-Side-logo.png",
        intestazione:
          "Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com",
      },
      pics: {
        logo: "/static/images/logo-ddt.png",
        intestazione:
          "Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com",
      },
    };

    const brandData = brandConfig[brand] || brandConfig["pics"];

    let template = fs.readFileSync(templatePath, "utf8");
    const { righeHtml, totUnita, totColli } = compilaRighe(righe, true);

    const fields = { numeroDDT, numeroAmazon, data, paese, centro, trasportatore, tracking };

    template = replacePlaceholder(template, "LOGO_PATH", logoToDataUri(brandData.logo));
    template = replacePlaceholder(template, "INTESTAZIONE", brandData.intestazione);
    template = replacePlaceholder(template, "NUMERO_DDT", esc(numeroDDT));
    template = replacePlaceholder(template, "NUMERO_AMAZON", esc(numeroAmazon));
    template = replacePlaceholder(template, "DATA", esc(data));
    template = replacePlaceholder(template, "IMPORTATORE_REGISTRATO", `${brandData.intestazione.split("–")[0].trim()} – ${escMultiline(centro)}`);
    template = replacePlaceholder(template, "INDIRIZZO_DESTINATARIO", esc(paese));
    template = replacePlaceholder(template, "CENTRO_LOGISTICO", escMultiline(centro));
    template = replacePlaceholder(template, "RIGHE", righeHtml);
    template = replacePlaceholder(template, "TOT_UNITA", totUnita);
    template = replacePlaceholder(template, "TOT_COLLI", totColli);
    template = replacePlaceholder(template, "TRASPORTATORE", esc(trasportatore));
    template = replacePlaceholder(template, "TRACKING", esc(tracking));

    const pdfBuffer = await pdf.generatePdf({ content: template }, PDF_OPTIONS);

    const db = getDb();
    const ddtId = salvaDdtNelDb(db, brand, fields, righe, totUnita, totColli);
    logger.info({ ddtId }, "DDT generico salvato");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=ddt_generico_${numeroDDT}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error({ err }, "Errore generazione DDT generico");
    res.status(500).json({ error: "Errore generazione PDF", details: err.message });
  }
});

// ============================================================
// POST -> genera PDF DDT Pics Nails (da spedizione)
// ============================================================
router.post("/pics-nails/pdf", validate({ body: picsNailsPdfSchema }), async (req, res) => {
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

    const logoPath = logoToDataUri("/static/images/logo-ddt.png");
    const intestazione = "Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com";
    const dataFormattata = data ? new Date(data).toLocaleDateString("it-IT") : "";

    let template = fs.readFileSync(templatePath, "utf8");
    const { righeHtml, totUnita, totColli } = compilaRighe(righe, true);

    const fields = { numeroDDT, numeroAmazon, data, paese, centro, trasportatore, tracking };

    template = replacePlaceholder(template, "LOGO_PATH", logoPath);
    template = replacePlaceholder(template, "INTESTAZIONE", intestazione);
    template = replacePlaceholder(template, "NUMERO_DDT", esc(numeroDDT));
    template = replacePlaceholder(template, "NUMERO_AMAZON", esc(numeroAmazon) || "-");
    template = replacePlaceholder(template, "DATA", dataFormattata);
    template = replacePlaceholder(template, "IMPORTATORE_REGISTRATO", `Pics Srl – ${escMultiline(centro)}`);
    template = replacePlaceholder(template, "INDIRIZZO_DESTINATARIO", esc(paese));
    template = replacePlaceholder(template, "CENTRO_LOGISTICO", escMultiline(centro));
    template = replacePlaceholder(template, "RIGHE", righeHtml);
    template = replacePlaceholder(template, "TOT_UNITA", totUnita);
    template = replacePlaceholder(template, "TOT_COLLI", totColli);
    template = replacePlaceholder(template, "TRASPORTATORE", esc(trasportatore));
    template = replacePlaceholder(template, "TRACKING", esc(tracking) || "-");

    const pdfBuffer = await pdf.generatePdf({ content: template }, PDF_OPTIONS);

    const db = getDb();
    const ddtId = salvaDdtNelDb(db, "pics", fields, righe, totUnita, totColli);
    logger.info({ ddtId }, "DDT Pics Nails salvato");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=ddt_pics_nails_${numeroDDT || spedizioneProgressivo}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error({ err }, "Errore generazione DDT Pics Nails");
    res.status(500).json({ error: "Errore generazione PDF", details: err.message });
  }
});

module.exports = router;
