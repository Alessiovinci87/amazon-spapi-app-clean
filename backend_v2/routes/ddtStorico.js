// backend_v2/routes/ddtStorico.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const pdf = require("html-pdf-node");
const { getDb } = require("../db/database");
const logger = require("../utils/logger");
const { logoToDataUri } = require("../utils/logoUtils");

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

// Come esc(), ma preserva le interruzioni di riga (convertite in <br>)
function escMultiline(val) {
  return esc(val).replace(/\r?\n/g, "<br>");
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
    logger.error({ err }, "Errore recupero storico DDT");
    res.status(500).json({ error: "Errore recupero storico DDT" });
  }
});

// 📄 GET singolo DDT (dati strutturati per editing)
router.get("/storico/:id", (req, res) => {
  try {
    const db = getDb();
    const ddt = db.prepare(`SELECT * FROM ddt_generici WHERE id = ?`).get(req.params.id);
    if (!ddt) return res.status(404).json({ error: "DDT non trovato" });
    const righe = db.prepare(`SELECT * FROM ddt_generici_righe WHERE ddt_id = ? ORDER BY id`).all(req.params.id);
    res.json({ ...ddt, righe });
  } catch (err) {
    logger.error({ err }, "Errore recupero DDT");
    res.status(500).json({ error: "Errore recupero DDT" });
  }
});

// ✏️ PUT aggiorna DDT + righe
router.put("/storico/:id", (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    const existing = db.prepare(`SELECT id FROM ddt_generici WHERE id = ?`).get(id);
    if (!existing) return res.status(404).json({ error: "DDT non trovato" });

    const { brand, numeroDDT, numeroAmazon, data, paese, centro, trasportatore, tracking, righe = [] } = req.body || {};

    let totUnita = 0;
    let totColli = 0;
    for (const r of righe) {
      totUnita += Number(r.quantita || 0);
      const colli = String(r.cartone || "").split(";").filter((x) => x.trim() !== "");
      totColli += colli.length;
    }

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE ddt_generici
         SET brand = ?, numeroDDT = ?, numeroAmazon = ?, data = ?, paese = ?,
             centro = ?, trasportatore = ?, tracking = ?, totUnita = ?, totColli = ?
         WHERE id = ?`
      ).run(brand || null, numeroDDT || null, numeroAmazon || null, data || null,
        paese || null, centro || null, trasportatore || null, tracking || null,
        totUnita, totColli, id);

      db.prepare(`DELETE FROM ddt_generici_righe WHERE ddt_id = ?`).run(id);
      const ins = db.prepare(
        `INSERT INTO ddt_generici_righe
         (ddt_id, prodottoNome, asin, sku, quantita, cartone, pacco, lotto, tracking)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const r of righe) {
        ins.run(id, r.prodottoNome || "", r.asin || "", r.sku || "",
          Number(r.quantita) || 0, String(r.cartone || ""), String(r.pacco || ""), r.lotto || null, r.tracking || null);
      }
    });
    tx();
    res.json({ ok: true, id: Number(id) });
  } catch (err) {
    logger.error({ err }, "Errore aggiornamento DDT");
    res.status(500).json({ error: "Errore aggiornamento DDT", details: err.message });
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
          const colli = String(r.cartone || "").split(";").filter(x => x.trim() !== "");
          totColli += colli.length;

          return `
            <tr>
              <td>${esc(r.quantita)}</td>
              <td>${esc(r.prodottoNome)}</td>
              <td>ASIN: ${esc(r.asin)}<br/>SKU: ${esc(r.sku)}${r.tracking ? `<br/><b>Tracking UPS:</b> ${esc(r.tracking)}` : ""}</td>
              <td>${esc(r.cartone)}</td>
              <td>${esc(r.pacco)}</td>
            </tr>`;
        })
        .join("");
    } else {
      righeHtml = "<tr><td colspan='5'>Nessuna riga salvata</td></tr>";
    }

    const brandConfig = {
      lookink: { logo: "/static/images/LOOKINK-Logo.png", intestazione: "Dissimile Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02963100900 – info@lookink.net" },
      cside:   { logo: "/static/images/C-Side-logo.png",  intestazione: "Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com" },
      pics:    { logo: "/static/images/logo.png",          intestazione: "Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com" },
    };
    const brandData = brandConfig[ddt.brand] || brandConfig["pics"];

    let template = fs.readFileSync(templatePath, "utf8");

    template = replacePlaceholder(template, "LOGO_PATH", logoToDataUri(brandData.logo));
    template = replacePlaceholder(template, "INTESTAZIONE", brandData.intestazione);
    template = replacePlaceholder(template, "NUMERO_DDT", esc(ddt.numeroDDT));
    template = replacePlaceholder(template, "NUMERO_AMAZON", esc(ddt.numeroAmazon));
    template = replacePlaceholder(template, "DATA", esc(ddt.data));
    template = replacePlaceholder(template, "IMPORTATORE_REGISTRATO", `${brandData.intestazione.split("–")[0].trim()} – ${escMultiline(ddt.centro)}`);
    template = replacePlaceholder(template, "INDIRIZZO_DESTINATARIO", esc(ddt.paese));
    template = replacePlaceholder(template, "CENTRO_LOGISTICO", escMultiline(ddt.centro));
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
    logger.error({ err }, "Errore generazione PDF storico");
    res.status(500).json({ error: "Errore generazione PDF storico" });
  }
});

module.exports = router;
