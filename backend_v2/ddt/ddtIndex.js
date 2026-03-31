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
const prebolleRouter = require("./prebolle");

function esc(val) {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const router = express.Router();

const ddtAssegnazioniRouter = require("./ddtAssegnazioni");

/* ============================================================
   📦 PREBOLLE (confermate, pronte per compilare DDT)
============================================================ */
router.use("/prebolle", prebolleRouter);

/* ============================================================
   ⚙️ FUNZIONI UTILI
============================================================ */

function getPezziPerBox(nomeProdotto = "") {
  const nome = nomeProdotto.toLowerCase();
  if (nome.includes("kit 12 ml")) return 150;
  if (nome.includes("kit 100 ml")) return 75;
  if (nome.includes("cuticole")) return 20;
  if (nome.includes("12 ml")) return 300;
  if (nome.includes("100 ml")) return 150;
  return null;
}

function ordinaPacchi(pacchi = []) {
  return [...pacchi].sort((a, b) => {
    const valA = typeof a === "string" ? a : a.pacco || "";
    const valB = typeof b === "string" ? b : b.pacco || "";
    const numA = parseInt(valA.match(/(\d+)$/)?.[0] || "0", 10);
    const numB = parseInt(valB.match(/(\d+)$/)?.[0] || "0", 10);
    return numA - numB;
  });
}

/* ============================================================
   📄 GENERA PDF DDT DA SPEDIZIONE
============================================================ */
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
            <td>${esc(r.quantita)}</td>
            <td>${esc(r.prodotto_nome)}<br><small>ASIN: ${esc(r.asin)}</small></td>
            <td>${esc(r.sku) || "-"}</td>
            <td>${listaCartoni}</td>
            <td>${listaPacchi}</td>
          </tr>
        `;
      })
      .join("");

    const templatePath = path.join(__dirname, "templates", "ddtTemplate.html");
    let html = fs.readFileSync(templatePath, "utf8");

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3005";
    const logoUrl = `${backendUrl}/static/images/logo.png`;

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

    const launchOptions = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--allow-file-access-from-files"],
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
      charset: "utf-8"
    });

    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=ddt_${spedizione.progressivo}.pdf`
    );
    res.end(pdfBuffer);
  } catch (err) {
    console.error("❌ Errore Puppeteer (PDF):", err);
    res
      .status(500)
      .json({ error: "Errore generazione PDF", details: err.message });
  }
  
});

router.use("/assegnazioni", ddtAssegnazioniRouter);

/* ============================================================
   🧪 TEST PDF (debug)
============================================================ */
router.get("/test", async (req, res) => {
  try {
    const html = `
      <html>
        <body>
          <h1>🚀 Test Puppeteer OK</h1>
        </body>
      </html>
    `;

    const testLaunchOptions = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      testLaunchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    const browser = await puppeteer.launch(testLaunchOptions);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=test.pdf");
    res.end(pdfBuffer);
  } catch (err) {
    console.error("❌ Errore Puppeteer test:", err);
    res
      .status(500)
      .json({ error: "Errore generazione PDF", details: err.message });
  }
});

module.exports = router;
