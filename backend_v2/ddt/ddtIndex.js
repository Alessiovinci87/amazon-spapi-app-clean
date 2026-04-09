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

    // 🔗 Hook One Step: scarica stock per ogni ASIN One Step presente nel DDT
    try {
      const { checkSottoSogliaOnestep } = require("../services/stockAlerts.service");
      const onestepAsins = new Set(
        db.prepare("SELECT asin FROM onestep_prodotti").all().map(r => r.asin)
      );
      const righeOnestep = righe.filter(r => onestepAsins.has(r.asin));
      if (righeOnestep.length > 0) {
        db.transaction(() => {
          for (const r of righeOnestep) {
            db.prepare(`
              INSERT INTO onestep_movimenti (asin, tipo, quantita, riferimento_tipo, riferimento_id, note, operatore)
              VALUES (?, 'SCARICO_DDT', ?, 'ddt', ?, ?, 'ddt')
            `).run(r.asin, -Math.abs(r.quantita), idSpedizione, `Scarico DDT spedizione #${spedizione.progressivo}`);
            db.prepare(`
              UPDATE onestep_prodotti SET quantita = MAX(0, quantita - ?), updated_at = datetime('now','localtime') WHERE asin = ?
            `).run(Math.abs(r.quantita), r.asin);
            checkSottoSogliaOnestep(db, r.asin);
          }
        })();
        console.log(`📦 [OneStep] Scaricati ${righeOnestep.length} ASIN da DDT #${spedizione.progressivo}`);
      }
    } catch (hookErr) {
      console.warn("⚠️ [OneStep] Hook DDT non critico:", hookErr.message);
    }

    // 🔗 Hook Top Coat: scarica stock per ogni ASIN Top Coat presente nel DDT
    try {
      const { checkSottoSogliaTopcoat } = require("../services/stockAlerts.service");
      const topcoatAsins = new Set(
        db.prepare("SELECT asin FROM topcoat_prodotti").all().map(r => r.asin)
      );
      const righeTopcoat = righe.filter(r => topcoatAsins.has(r.asin));
      if (righeTopcoat.length > 0) {
        db.transaction(() => {
          for (const r of righeTopcoat) {
            db.prepare(`
              INSERT INTO topcoat_movimenti (asin, tipo, quantita, riferimento_tipo, riferimento_id, note, operatore)
              VALUES (?, 'SCARICO_DDT', ?, 'ddt', ?, ?, 'ddt')
            `).run(r.asin, -Math.abs(r.quantita), idSpedizione, `Scarico DDT spedizione #${spedizione.progressivo}`);
            db.prepare(`
              UPDATE topcoat_prodotti SET quantita = MAX(0, quantita - ?), updated_at = datetime('now','localtime') WHERE asin = ?
            `).run(Math.abs(r.quantita), r.asin);
            checkSottoSogliaTopcoat(db, r.asin);
          }
        })();
        console.log(`📦 [TopCoat] Scaricati ${righeTopcoat.length} ASIN da DDT #${spedizione.progressivo}`);
      }
    } catch (hookErr) {
      console.warn("⚠️ [TopCoat] Hook DDT non critico:", hookErr.message);
    }

    // 🔗 Hook Moduli Custom: scarica stock per ogni modulo dinamico
    try {
      const { checkSottoSogliaModulo } = require("../services/stockAlerts.service");
      const moduli = db.prepare("SELECT id, slug, label FROM moduli_custom").all();
      for (const m of moduli) {
        const asins = new Set(
          db.prepare("SELECT asin FROM moduli_prodotti WHERE modulo_id = ?").all(m.id).map(r => r.asin)
        );
        const righeModulo = righe.filter(r => asins.has(r.asin));
        if (righeModulo.length > 0) {
          db.transaction(() => {
            for (const r of righeModulo) {
              db.prepare(`
                INSERT INTO moduli_movimenti (modulo_id, asin, tipo, quantita, riferimento_tipo, riferimento_id, note, operatore)
                VALUES (?, ?, 'SCARICO_DDT', ?, 'ddt', ?, ?, 'ddt')
              `).run(m.id, r.asin, -Math.abs(r.quantita), idSpedizione, `Scarico DDT spedizione #${spedizione.progressivo}`);
              db.prepare(`
                UPDATE moduli_prodotti SET quantita = MAX(0, quantita - ?), updated_at = datetime('now','localtime')
                WHERE modulo_id = ? AND asin = ?
              `).run(Math.abs(r.quantita), m.id, r.asin);
              checkSottoSogliaModulo(db, m.id, r.asin);
            }
          })();
          console.log(`📦 [Modulo ${m.label}] Scaricati ${righeModulo.length} ASIN da DDT #${spedizione.progressivo}`);
        }
      }
    } catch (hookErr) {
      console.warn("⚠️ [Moduli Custom] Hook DDT non critico:", hookErr.message);
    }
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
