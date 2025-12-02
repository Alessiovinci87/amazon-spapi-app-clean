const express = require("express");
const fs = require("fs");
const path = require("path");
let puppeteer;
try {
  puppeteer = require("puppeteer");
} catch (err) {
  console.warn("⚠️ Puppeteer non installato, modalità PDF disattivata temporaneamente");
}
const { getDb } = require("../db/database");

const router = express.Router();

/** 🔎 Funzione helper per pezzi per box */
function getPezziPerBox(nomeProdotto = "") {
  const nome = nomeProdotto.toLowerCase();
  if (nome.includes("kit 12 ml")) return 150;
  if (nome.includes("kit 100 ml")) return 75;
  if (nome.includes("cuticole")) return 20;
  if (nome.includes("12 ml")) return 300;
  if (nome.includes("100 ml")) return 150;
  return null;
}

/** 🔎 Helper ordinamento pacchi in base al numero finale */
function ordinaPacchi(pacchi = []) {
  return [...pacchi].sort((a, b) => {
    const valA = typeof a === "string" ? a : a.pacco || "";
    const valB = typeof b === "string" ? b : b.pacco || "";
    const numA = parseInt(valA.match(/(\d+)$/)?.[0] || "0", 10);
    const numB = parseInt(valB.match(/(\d+)$/)?.[0] || "0", 10);
    return numA - numB;
  });
}

/** 📄 Genera PDF DDT da spedizione (classico, Pics) */
router.post("/pdf/:idSpedizione", async (req, res) => {
  try {
    const { idSpedizione } = req.params;
    const {
      numeroDDT = "",
      numeroAmazon = "",
      data = new Date().toISOString().split("T")[0],
      trasportatore = "",
      tracking = "",
      centroLogistico = "",
      numeriPacchi = {},
    } = req.body;

    const db = getDb();
    const spedizione = db
      .prepare("SELECT * FROM spedizioni WHERE id = ?")
      .get(idSpedizione);
    if (!spedizione)
      return res.status(404).json({ error: "Spedizione non trovata" });

    const righe = db
      .prepare("SELECT * FROM spedizioni_righe WHERE spedizione_id = ?")
      .all(idSpedizione);

    let totUnita = 0;
    let totColli = 0;

    const righeHtml = righe
      .map((r) => {
        const pezziPerBox = getPezziPerBox(r.prodotto_nome) || r.quantita;
        const numCartoni = Math.ceil(r.quantita / pezziPerBox);
        totUnita += r.quantita;
        totColli += numCartoni;

        const pacchiRiga = ordinaPacchi(numeriPacchi[r.id] || []);

        const listaCartoni = Array.from({ length: numCartoni }, (_, i) => i + 1).join("; ");
        const listaPacchi = pacchiRiga
          .map((p) => (typeof p === "string" ? p : p.pacco))
          .join("<br>");

        return `
          <tr>
            <td>${r.quantita}</td>
            <td>${r.prodotto_nome}<br><small>ASIN: ${r.asin}</small></td>
            <td>${r.sku || "-"}</td>
            <td>${listaCartoni}</td>
            <td>${listaPacchi}</td>
          </tr>
        `;
      })
      .join("");

    const templatePath = path.join(__dirname, "templates", "ddtTemplate.html");
    let html = fs.readFileSync(templatePath, "utf8");

    const logoUrl = "http://localhost:3005/static/images/logo.png";
    console.log("🖼️ Logo path risolto:", logoUrl);

    const dataIT = new Date(data).toLocaleDateString("it-IT");

    html = html
      .replace(/{{\s*logoPath\s*}}/gi, logoUrl)
      .replace(/{{\s*NUMERO_DDT\s*}}/gi, numeroDDT)
      .replace(/{{\s*NUMERO_AMAZON\s*}}/gi, numeroAmazon || "-")
      .replace(/{{\s*DATA\s*}}/gi, dataIT)
      .replace(/{{\s*CENTRO_LOGISTICO\s*}}/gi, centroLogistico || spedizione.paese)
      .replace(/{{\s*RIGHE\s*}}/gi, righeHtml)
      .replace(/{{\s*TOT_UNITA\s*}}/gi, totUnita)
      .replace(/{{\s*TOT_COLLI\s*}}/gi, totColli)
      .replace(/{{\s*TRASPORTATORE\s*}}/gi, trasportatore)
      .replace(/{{\s*TRACKING\s*}}/gi, tracking);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--allow-file-access-from-files"],
      executablePath: "C:/Users/aless/.cache/puppeteer/chrome/win64-140.0.7339.82/chrome-win64/chrome.exe",
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=ddt_${spedizione.progressivo}.pdf`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error("❌ Errore Puppeteer (PDF):", err);
    res.status(500).json({ error: "Errore generazione PDF", details: err.message });
  }
});

/** 🔎 Endpoint di test per Puppeteer */
router.get("/test", async (req, res) => {
  try {
    const html = `
      <html>
        <body>
          <h1>🚀 Test Puppeteer OK</h1>
          <p>Se vedi questo PDF, Puppeteer funziona correttamente.</p>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: "C:/Users/aless/.cache/puppeteer/chrome/win64-140.0.7339.82/chrome-win64/chrome.exe",
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=test.pdf");
    res.end(pdfBuffer);
  } catch (err) {
    console.error("❌ Errore Puppeteer test:", err);
    res.status(500).json({ error: "Errore generazione PDF", details: err.message });
  }
});

module.exports = router;
