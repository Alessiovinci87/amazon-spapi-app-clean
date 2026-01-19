// backend_v2/modules/reports/reportsAmazonRoutes.js
const express = require("express");
const router = express.Router();

const {
  createReport,
  getReportStatus,
  getReportDocument,
  downloadReportDocument,
  getCatalogItem,
  getListingItem,
} = require("./reportsAmazonService");

const marketplacesMap = require("./marketplacesMap");

// ✅ importa il modulo catalog per i dettagli asin
const catalogRouter = require("../catalog/catalog");
router.use("/catalog", catalogRouter); // ← aggiunta fondamentale

// ✅ lista default di marketplace EU
const defaultMarketplaceIds = [
  "APJ6JRA9NG5V4",   // Italia
  "A13V1IB3VIYZZH",  // Francia
  "A1RKKUPIHCS9HS",  // Spagna
  "A1PA6795UKMFR9",  // Germania
  "A1F83G8C2ARO7P",  // UK
  "A1805IZSGTT6HS",  // Paesi Bassi
  "A2NODRKZP88ZB9",  // Svezia
  "A1C3SOZRARQ6R3",  // Polonia
  "AMEN7PMS3EDWL"    // Belgio
];

const { open } = require("sqlite");
const sqlite3 = require("sqlite3").verbose();


const path = require("path"); // ✅ AGGIUNTO IMPORT


const { aggiornaFBAFees, getFBAFees } = require("./fbaFeesService");
const { aggiornaSalesTraffic, getSalesTraffic } = require("./salesTrafficService");

// 🔄 POST → genera o aggiorna report vendite
router.post("/sales-traffic/update", async (req, res) => {
  try {
    console.log("🚀 Avvio aggiornamento Sales & Traffic...");
    // ✅ risponde subito, non blocca Postman
    res.json({ ok: true, message: "Aggiornamento Sales & Traffic avviato in background" });

    // 🧠 esecuzione in background
    setImmediate(async () => {
      try {
        const result = await aggiornaSalesTraffic();
        console.log("✅ Sales & Traffic completato:", result);
      } catch (err) {
        console.error("❌ Errore in background Sales & Traffic:", err.message);
      }
    });
  } catch (err) {
    console.error("❌ Errore iniziale aggiornaSalesTraffic:", err.message);
    res.status(500).json({
      ok: false,
      error: "Impossibile avviare aggiornamento Sales & Traffic",
      details: err.message,
    });
  }
});


// 📊 GET → restituisce i dati vendite salvati nel DB
router.get("/sales-traffic", async (req, res) => {
  try {
    const data = await getSalesTraffic();
    console.log(`📊 Sales & Traffic → ${data.length} record trovati`);
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    console.error("❌ Errore getSalesTraffic:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 🔄 POST → genera o aggiorna report commissioni FBA
router.post("/fba-fees/update", async (req, res) => {
  try {
    console.log("🚀 Avvio aggiornamento FBA Fees...");
    // Risposta immediata → evita timeout
    res.json({ ok: true, message: "Aggiornamento FBA Fees avviato in background" });

    // Esecuzione in background
    setImmediate(async () => {
      try {
        const result = await aggiornaFBAFees();
        console.log(`✅ FBA Fees completato. Record salvati: ${result?.record || 0}`);
      } catch (err) {
        console.error("❌ Errore in background FBA Fees:", err.message);
      }
    });
  } catch (err) {
    console.error("❌ Errore iniziale aggiornaFBAFees:", err.message);
    res.status(500).json({
      ok: false,
      error: "Impossibile avviare aggiornamento FBA Fees",
      details: err.message,
    });
  }
});

// 📊 GET → restituisce le commissioni salvate nel DB
router.get("/fba-fees", async (req, res) => {
  try {
    const data = await getFBAFees();
    console.log(`📊 FBA Fees → ${data.length} record trovati`);
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    console.error("❌ Errore getFBAFees:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/create", async (req, res) => {
  try {
    const { marketplaceIds, reportType, dataStartTime, dataEndTime } = req.body;
    const ids = marketplaceIds?.length ? marketplaceIds : defaultMarketplaceIds;

    console.log(`📑 Creazione report: ${reportType || "non specificato"} → ${ids.join(", ")}`);

    const report = await createReport({
      reportType,
      marketplaceIds: ids,
      dataStartTime,
      dataEndTime,
    });

    res.json({ ok: true, report });
  } catch (err) {
    console.error("❌ Errore creazione report:", err.response?.data || err.message);
    res.status(500).json({ error: "Impossibile creare report" });
  }
});

// 📊 2. Stato report
router.get("/status/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params;
    const status = await getReportStatus(reportId);
    res.json(status);
  } catch (err) {
    console.error("❌ Errore stato report:", err.response?.data || err.message);
    res.status(500).json({ error: "Impossibile recuperare stato report" });
  }
});

// 📥 3. Documento report
router.get("/document/:id", async (req, res) => {
  try {
    const { id } = req.params; // può essere reportId o reportDocumentId
    const doc = await getReportDocument(id);
    res.json(doc);
  } catch (err) {
    console.error("❌ Errore documento report:", err.response?.data || err.message);
    res.status(500).json({ error: "Impossibile recuperare documento report" });
  }
});

router.get("/ping", (req, res) => {
  res.json({ ok: true, msg: "pong reports-amazon" });
});

// 📂 4. Catalogo normalizzato da report
router.get("/catalogo/:reportDocumentId", async (req, res) => {
  try {
    const { reportDocumentId } = req.params;

    // 1️⃣ Ottieni info documento e scarica contenuto
    const docInfo = await getReportDocument({ reportId: reportDocumentId });
    const { url, compressionAlgorithm } = docInfo;
    const buffer = await downloadReportDocument({ url, compressionAlgorithm });

    // 2️⃣ Parsing TSV/CSV
    const { parseDelimited } = require("./reportClient");
    const rows = parseDelimited(buffer);

    // 3️⃣ Costruisci mappa normalizzata
    const mappa = {};
    rows.forEach((p) => {
      const asin = p.asin1?.trim();
      if (!asin) return;

      const marketplaceId = p["marketplace-id"] || "APJ6JRA9NG5V4";
      if (!mappa[asin]) {
        mappa[asin] = {
          asin,
          sku: p["seller-sku"],
          nome: p["item-name"],
          descrizione: p["item-description"] || "",
          immagine: null,
          stato: p["status"] || "UNKNOWN",
          fulfillment: p["fulfilment-channel"] || "",
          perPaese: {},
        };
      }

      mappa[asin].perPaese[marketplaceId] = {
        paese: marketplacesMap[marketplaceId] || marketplaceId,
        prezzo: Number(p["price"]) || 0,
        stock: Number(p["quantity"]) || 0,
        buyBox: false,
        stato: p["status"] || "UNKNOWN",
      };
    });

    res.json({ ok: true, count: Object.keys(mappa).length, catalogo: Object.values(mappa) });
  } catch (err) {
    console.error("❌ Errore catalogo:", err.response?.data || err.message);
    res.status(500).json({ error: "Impossibile recuperare catalogo", details: err.message });
  }
});


// 📂 5. Report grezzo
router.get("/download/:reportDocumentId", async (req, res) => {
  try {
    const { reportDocumentId } = req.params;

    // 1️⃣ Ottieni info documento da Amazon
    const docInfo = await getReportDocument({ reportId: reportDocumentId });
    const { url, compressionAlgorithm } = docInfo;

    // 2️⃣ Scarica il file effettivo
    const buffer = await downloadReportDocument({ url, compressionAlgorithm });

    // 3️⃣ Determina se è TSV o JSON
    const { parseJSON, parseDelimited } = require("./reportClient");
    let data = null;
    try {
      data = parseJSON(buffer);
    } catch {
      data = parseDelimited(buffer);
    }

    res.json({ ok: true, count: Array.isArray(data) ? data.length : 1, data });
  } catch (err) {
    console.error("❌ Errore download report:", err.response?.data || err.message);
    res.status(500).json({ error: "Impossibile scaricare report", details: err.message });
  }
});


// 🌍 6. Catalogo diretto da API → dati per un ASIN in tutti i marketplace
router.get("/catalog/:asin/:sku", async (req, res) => {
  try {
    const { asin, sku } = req.params;
    const { getAccessToken } = require("../auth/authService");
    const { access_token } = await getAccessToken();

    const results = await Promise.allSettled(
      defaultMarketplaceIds.map(async (mId) => {
        try {
          const catalog = await getCatalogItem(asin, [mId], access_token);
          const listing = await getListingItem(sku, access_token, [mId]);
          return {
            marketplaceId: mId,
            paese: marketplacesMap[mId] || mId,
            catalog,
            listing,
          };
        } catch (err) {
          return {
            marketplaceId: mId,
            paese: marketplacesMap[mId] || mId,
            error: err.message || "Errore sconosciuto",
          };
        }
      })
    );

    res.json({
      asin,
      sku,
      marketplaces: results.map((r) =>
        r.status === "fulfilled" ? r.value : { error: r.reason }
      ),
    });
  } catch (err) {
    console.error("❌ Errore catalog asin:", err.response?.data || err.message);
    res.status(500).json({ error: "Impossibile recuperare catalog asin" });
  }
});



// 📦 Import modulo FBA stock
const { aggiornaFBAStock, getFBAStock } = require("./fbaStockService");

/**
 * 🧾 GET elenco FBA stock dal DB locale
 */
router.get("/fba-stock", async (req, res) => {
  try {
    const data = await getFBAStock();
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    console.error("❌ Errore getFBAStock:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/fba-stock/completo", async (req, res) => {
  let db;
  try {
    db = await open({
      filename: path.join(__dirname, "../../db/inventario.db"),
      driver: sqlite3.Database,
    });

    // 🔹 1️⃣ Prodotti
    const prodotti = await db.all(`
      SELECT asin, nome AS product_name, sku
      FROM prodotti
      WHERE asin IS NOT NULL AND asin != ''
      ORDER BY asin
    `);

    // 🔹 2️⃣ Stock FBA
    const stock = await db.all(`
      SELECT asin, country, quantity, stock_totale
      FROM fba_stock
      ORDER BY asin
    `);

    // 🔹 3️⃣ Mappa lookup
    const stockMap = {};
    for (const r of stock) {
      if (!stockMap[r.asin]) stockMap[r.asin] = [];
      stockMap[r.asin].push({
        country: r.country,
        quantity: Number(r.quantity) || 0,
        stock_totale: Number(r.stock_totale) || 0,
      });
    }

    // 🔹 4️⃣ Merge
    const unione = prodotti.map((p) => {
      const fba = stockMap[p.asin] || [];
      const totale = fba.reduce(
        (sum, s) => sum + Number(s.stock_totale || s.quantity || 0),
        0
      );
      return {
        asin: p.asin,
        sku: p.sku,
        nome: p.product_name,
        stock_globale: totale,
        marketplace: fba,
      };
    });

    res.json({ ok: true, count: unione.length, prodotti: unione });
  } catch (err) {
    console.error("❌ Errore fba-stock/completo:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (db) await db.close();
  }
});


// 📍 7. Dettagli stock FBA per un singolo ASIN
// 📦 Dettaglio stock FBA per singolo ASIN
router.get("/fba-stock/:asin", async (req, res) => {
  let db;
  try {
    const { asin } = req.params;

    db = await open({
      filename: path.join(__dirname, "../../db/inventario.db"),
      driver: sqlite3.Database,
    });

    const righe = await db.all(
      `SELECT country,
              quantity,
              stock_totale,
              reserved_qty,
              inbound_working,
              inbound_shipped,
              inbound_receiving,
              unfulfillable_qty
       FROM fba_stock
       WHERE asin = ?
       ORDER BY country`,
      asin
    );

    if (!righe.length) {
      return res.status(404).json({ ok: false, message: "ASIN non trovato nel DB FBA" });
    }

    const stockGlobale = righe.reduce(
      (sum, r) => sum + Number(r.stock_totale || r.quantity || 0),
      0
    );

    const dettagli = righe.map((r) => ({
      country: r.country,
      disponibile: Number(r.quantity) || 0,
      totale: Number(r.stock_totale) || 0,
      riservato: Number(r.reserved_qty) || 0,
      inLavorazione: Number(r.inbound_working) || 0,
      spedito: Number(r.inbound_shipped) || 0,
      inRicezione: Number(r.inbound_receiving) || 0,
      nonGestibile: Number(r.unfulfillable_qty) || 0,
    }));

    res.json({
      ok: true,
      asin,
      count: dettagli.length,
      stock_globale: stockGlobale,
      marketplace: dettagli,
    });
  } catch (err) {
    console.error("❌ Errore get FBA stock per asin:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (db) await db.close();
  }
});


// 📸 Ottiene l'immagine principale di un ASIN da Amazon SP-API o fallback scraping
router.get("/catalog-image/:asin", async (req, res) => {
  const axios = require("axios");
  const { getAccessToken } = require("../auth/authService");
  const { asin } = req.params;

  try {
    let imageUrl = null;
    const marketplaceId = "APJ6JRA9NG5V4";

    // 🔹 1️⃣ Tentativo SP-API
    try {
      const { access_token } = await getAccessToken();
      const url = `https://sellingpartnerapi-eu.amazon.com/catalog/2022-04-01/items/${asin}?marketplaceIds=${marketplaceId}&includedData=images`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-amz-access-token": access_token,
        },
        timeout: 8000,
      });

      const images =
        response.data?.images ||
        response.data?.data?.attributes?.find((a) => a.name === "images")?.value ||
        [];

      imageUrl =
        images.find((img) => img.variant === "MAIN")?.link ||
        images[0]?.link ||
        null;
    } catch {
      console.warn(`⚠️ SP-API: immagine non trovata per ${asin}`);
    }

    // 🔹 2️⃣ Fallback scraping pubblico
    if (!imageUrl) {
      try {
        const html = await axios
          .get(`https://www.amazon.it/dp/${asin}`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 8000,
          })
          .then((r) => r.data);

        const match =
          html.match(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/) ||
          html.match(/"large":"(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/);
        if (match) imageUrl = match[1].replace(/\\u0026/g, "&");
      } catch {
        console.warn(`⚠️ Fallback: immagine non trovata per ${asin}`);
      }
    }

    if (!imageUrl) {
      return res.status(404).json({ asin, error: "Nessuna immagine trovata" });
    }

    res.json({ ok: true, asin, image: imageUrl });
  } catch (err) {
    console.error("❌ Errore catalog-image:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});



/**
 * 🔄 POST per aggiornare FBA stock scaricando il report da Amazon
 */
// 🔄 POST per aggiornare FBA stock (versione SINCRONA)
router.post("/fba-stock/update", async (req, res) => {
  try {
    console.log("🚀 Avvio aggiornamento FBA stock...");
    // ✅ Risposta immediata → evita timeout
    res.json({ ok: true, message: "Aggiornamento FBA stock avviato in background" });

    // 🧠 Esecuzione in background
    setImmediate(async () => {
      try {
        const result = await aggiornaFBAStock();
        console.log("✅ Aggiornamento FBA stock completato:", result);
      } catch (err) {
        console.error("❌ Errore in background aggiornaFBAStock:", err.message);
      }
    });
  } catch (err) {
    console.error("❌ Errore iniziale aggiornaFBAStock:", err.message);
    res.status(500).json({
      ok: false,
      error: "Impossibile avviare aggiornamento FBA stock",
      details: err.message,
    });
  }
});


// 📊 Unione Catalogo + FBA: mostra tutti i prodotti anche con stock 0




// 📸 Ottiene le immagini principali per tutti gli ASIN direttamente da Amazon SP-API (fallback automatico)
// 📸 Ottiene le immagini principali per tutti gli ASIN (SP-API → fallback → cache)
router.get("/catalog-images/all", async (req, res) => {
  const axios = require("axios");
  const { getAccessToken } = require("../auth/authService");
  let db;

  try {
    const { access_token } = await getAccessToken();
    db = await open({
      filename: path.join(__dirname, "../../db/inventario.db"),
      driver: sqlite3.Database,
    });

    // 🔹 1️⃣ Recupera ASIN unici da varie fonti
    const prodotti = await db.all(`
      SELECT DISTINCT asin FROM fba_stock WHERE asin IS NOT NULL AND asin != ''
      UNION
      SELECT DISTINCT asin FROM prodotti WHERE asin IS NOT NULL AND asin != ''
      UNION
      SELECT DISTINCT asin FROM catalog_images WHERE asin IS NOT NULL AND asin != ''
    `);

    if (!prodotti.length) {
      return res.json({ ok: true, count: 0, immagini: [] });
    }

    const results = [];
    const marketplaceId = "APJ6JRA9NG5V4";
    const now = new Date().toISOString();

    for (const { asin } of prodotti) {
      let imageUrl = null;

      // 🔹 2️⃣ Cache locale
      const cached = await db.get(
        "SELECT image_url FROM catalog_images WHERE asin = ?",
        asin
      );
      if (cached?.image_url) {
        results.push({ asin, image: cached.image_url, cached: true });
        continue;
      }

      // 🔹 3️⃣ Tentativo SP-API
      try {
        const url = `https://sellingpartnerapi-eu.amazon.com/catalog/2022-04-01/items/${asin}?marketplaceIds=${marketplaceId}&includedData=images`;
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "x-amz-access-token": access_token,
          },
          timeout: 8000,
        });

        const images =
          response.data?.images ||
          response.data?.data?.attributes?.find((a) => a.name === "images")?.value ||
          [];

        imageUrl =
          images.find((img) => img.variant === "MAIN")?.link ||
          images[0]?.link ||
          null;
      } catch (err) {
        console.warn(`⚠️ SP-API: immagine non trovata per ${asin}`);
      }

      // 🔹 4️⃣ Fallback pubblico
      if (!imageUrl) {
        try {
          const html = await axios
            .get(`https://www.amazon.it/dp/${asin}`, {
              headers: { "User-Agent": "Mozilla/5.0" },
              timeout: 8000,
            })
            .then((r) => r.data);

          const match =
            html.match(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/) ||
            html.match(/"large":"(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/);

          if (match) imageUrl = match[1].replace(/\\u0026/g, "&");
        } catch {
          console.warn(`⚠️ Fallback: nessuna immagine trovata per ${asin}`);
        }
      }

      // 🔹 5️⃣ Cache DB
      if (imageUrl) {
        await db.run(
          `INSERT OR REPLACE INTO catalog_images (asin, image_url, last_update)
           VALUES (?, ?, ?)`,
          asin,
          imageUrl,
          now
        );
        results.push({ asin, image: imageUrl, cached: false });
      }
    }

    res.json({ ok: true, count: results.length, immagini: results });
  } catch (err) {
    console.error("❌ Errore catalog-images/all:", err.message);
    res.status(500).json({
      ok: false,
      error: "Impossibile recuperare immagini globali",
      details: err.message,
    });
  } finally {
    if (db) await db.close();
  }
});

// ============================================================
// 🔄 POST → Sincronizza SKU da Amazon (GET_MERCHANT_LISTINGS_ALL_DATA)
// ============================================================
router.post("/sync-sku", async (req, res) => {
  let db;
  try {
    console.log("🚀 Avvio sincronizzazione SKU da Amazon...");
    
    // Risposta immediata
    res.json({ ok: true, message: "Sincronizzazione SKU avviata in background" });

    // Esecuzione in background
    setImmediate(async () => {
      try {
        const { getAccessToken } = require("../auth/authService");
        const { access_token } = await getAccessToken();

        // 1️⃣ Crea il report
        console.log("📑 Creazione report GET_MERCHANT_LISTINGS_ALL_DATA...");
        const reportResponse = await createReport({
          reportType: "GET_FLAT_FILE_OPEN_LISTINGS_DATA",
          marketplaceIds: defaultMarketplaceIds,
        });

        const reportId = reportResponse?.reportId;
        if (!reportId) {
          console.error("❌ Nessun reportId ricevuto");
          return;
        }
        console.log(`📋 Report creato: ${reportId}`);

        // 2️⃣ Attendi che il report sia pronto (polling)
        let status = null;
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 10000)); // Attendi 10 secondi
          status = await getReportStatus(reportId);
          console.log(`⏳ Stato report: ${status?.processingStatus} (tentativo ${attempts + 1}/${maxAttempts})`);

          if (status?.processingStatus === "DONE") break;
          if (status?.processingStatus === "FATAL" || status?.processingStatus === "CANCELLED") {
            console.error(`❌ Report fallito: ${status?.processingStatus}`);
            return;
          }
          attempts++;
        }

        if (status?.processingStatus !== "DONE") {
          console.error("❌ Timeout: report non completato");
          return;
        }

        // 3️⃣ Scarica il documento
        const reportDocumentId = status?.reportDocumentId;
        if (!reportDocumentId) {
          console.error("❌ Nessun reportDocumentId");
          return;
        }

        console.log(`📥 Download documento: ${reportDocumentId}`);
        const docInfo = await getReportDocument({ reportId: reportDocumentId });
        const buffer = await downloadReportDocument({
          url: docInfo.url,
          compressionAlgorithm: docInfo.compressionAlgorithm,
        });

        // 4️⃣ Parsing TSV
        const { parseDelimited } = require("./reportClient");
        const rows = parseDelimited(buffer);
        console.log(`📊 Righe trovate nel report: ${rows.length}`);

        // 5️⃣ Aggiorna DB
        db = await open({
          filename: path.join(__dirname, "../../db/inventario.db"),
          driver: sqlite3.Database,
        });

        let updated = 0;
        for (const row of rows) {
          const asin = row["asin1"] || row["asin"];
          const sku = row["seller-sku"] || row["sku"];

          if (asin && sku) {
            const result = await db.run(
              `UPDATE prodotti SET sku = ? WHERE asin = ? AND (sku IS NULL OR sku = '')`,
              sku,
              asin
            );
            if (result.changes > 0) {
              updated++;
              console.log(`✅ SKU aggiornato: ${asin} → ${sku}`);
            }
          }
        }

        console.log(`🎉 Sincronizzazione completata! SKU aggiornati: ${updated}`);
      } catch (err) {
        console.error("❌ Errore sincronizzazione SKU:", err.message);
      } finally {
        if (db) await db.close();
      }
    });
  } catch (err) {
    console.error("❌ Errore iniziale sync-sku:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 📊 GET → Verifica stato SKU nel DB
router.get("/sku-status", async (req, res) => {
  let db;
  try {
    db = await open({
      filename: path.join(__dirname, "../../db/inventario.db"),
      driver: sqlite3.Database,
    });

    const totale = await db.get(`SELECT COUNT(*) as count FROM prodotti`);
    const conSku = await db.get(`SELECT COUNT(*) as count FROM prodotti WHERE sku IS NOT NULL AND sku != ''`);
    const senzaSku = await db.get(`SELECT COUNT(*) as count FROM prodotti WHERE sku IS NULL OR sku = ''`);

    res.json({
      ok: true,
      totale: totale.count,
      conSku: conSku.count,
      senzaSku: senzaSku.count,
      percentuale: Math.round((conSku.count / totale.count) * 100) + "%",
    });
  } catch (err) {
    console.error("❌ Errore sku-status:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (db) await db.close();
  }
});





module.exports = router;
