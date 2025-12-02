
// =========================================================
// 🧩 BACKEND_V2 - ENTRY POINT
// =========================================================

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const path = require("path");
// Sceglie automaticamente il file giusto (locale vs Render)
const isRender = process.env.RENDER === "true";

const { ensureDatabaseReady } = isRender
  ? require("./db/database")        // Render → usa percorso interno
  : require("./db/database.local"); // Locale → DB su D:/

const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const { runMigrations } = require("./db/migrate.js");


// =========================================================
// 🔹 IMPORTAZIONE ROTTE
// =========================================================

// --- Core Gestionali
const accessoriRouter = require("./routes/accessori");
const movimentiRouter = require("./routes/movimenti");
const magazzinoRoutes = require("./routes/magazzino.routes");
const magazzinoProntoRouter = require("./modules/inventory/magazzinoPronto");

// --- Debug / Dev Tools
const devRouter = require("./routes/dev");
const debugRouter = require("./routes/debug");

// --- SP-API
const authRoutes = require("./modules/auth/auth");
const catalogRoutes = require("./modules/catalog/catalog");
const catalogAmazonRoutes = require("./modules/catalog/catalogAmazonRoutes");
const inventoryAmazonRoutes = require("./modules/inventory/inventoryAmazon");
const inventarioRouter = require("./modules/inventory/inventario");
const listingsAmazonRoutes = require("./modules/listings/listingsAmazonRoutes");
const reportsAmazonRoutes = require("./modules/reports/reportsAmazonRoutes");
const inventoryAmazonController = require("./modules/inventory/inventoryAmazonController");

// --- DDT e Brand
const ddtRoutes = require("./ddt/ddtIndex");
const ddtGenericoRoutes = require("./routes/ddtGenerico");
const ddtStoricoRoutes = require("./routes/ddtStorico");
const brandRoutes = require("./routes/brand");

// --- Fornitori e Ordini
const fornitoriRoutes = require("./routes/fornitori");
const fornitoriProdottiRoutes = require("./routes/fornitoriProdotti");
const ordiniRoutes = require("./routes/ordini");

// --- Spedizioni
const spedizioniRoutes = require("./routes/spedizioni");
const storicoSpedizioniRoutes = require("./routes/storicoSpedizioni");
const impegniRoutes = require("./routes/impegni");

// --- Sfuso / Produzioni
const sfusoRoutes = require("./routes/sfuso");
const sfusoInventarioRoutes = require("./routes/sfusoInventario");
const sfusoResetRoutes = require("./routes/sfusoReset");
const produzioneSfusoRoutes = require("./routes/produzioneSfuso");
const storicoProduzioniSfusoRouter = require("./routes/storicoProduzioniSfuso");
const storicoResetRoutes = require("./routes/storicoReset");

// --- Centri logistici e prodotti
const centriLogisticiRoutes = require("./routes/centriLogistici");
const prodottiSfusoRoutes = require("./routes/prodottiSfuso");

// --- Storico generale
const storicoRouter = require("./routes/storico");

// --- Bilancio
const bilancioRouter = require("./routes/bilancio");


const configRoutes = require("./routes/config");



// =========================================================
// ⚙️ CONFIGURAZIONE BASE
// =========================================================
const PORT = Number(process.env.PORT) || 3005;

async function bootstrap() {
  console.log("🔧 Avvio backend_v2…");
  console.log("   NODE_ENV:", process.env.NODE_ENV || "(non impostato)");
  console.log("   PORT (effettiva):", PORT);

  // Variabili SP-API
  console.log("🔑 LWA_CLIENT_ID:", process.env.LWA_CLIENT_ID ? "(ok)" : "(manca)");
  console.log("🔑 LWA_REFRESH_TOKEN:", process.env.LWA_REFRESH_TOKEN ? "(ok)" : "(manca)");
  console.log("🔑 AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "(ok)" : "(manca)");



  // =========================================================
  // 🗄️ DATABASE
  // =========================================================
  await ensureDatabaseReady();
  console.log("💾 DB pronto");

  // =========================================================
  // 🗂️ MIGRAZIONI AUTOMATICHE
  // =========================================================
  console.log("📦 Applicazione migrazioni database…");
  runMigrations("./db/inventario.db");

  // =========================================================
  // 🧱 MIDDLEWARE
  // =========================================================

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  console.log("➡️ Montaggio rotte principali...");
  

  // =========================================================
  // 📦 SEZIONE GESTIONALE BASE
  // =========================================================
  app.use("/api/v2/accessori", accessoriRouter);
  app.use("/api/v2/movimenti", movimentiRouter);
  app.use("/api/v2/magazzino", magazzinoRoutes);
  app.use("/api/v2/magazzino", magazzinoProntoRouter);
  app.use("/api/v2/storico", storicoRouter);

  // =========================================================
  // 🧪 DEBUG / DEV
  // =========================================================
  app.use("/api/v2/dev", devRouter);
  app.use("/api/v2/debug", debugRouter);

  // =========================================================
  // 🧴 PRODUZIONI + SFUSO  (CORRETTO!)
  // =========================================================
  app.use("/api/v2/sfuso", sfusoRoutes);
  app.use("/api/v2/sfuso-inventario", sfusoInventarioRoutes);
  app.use("/api/v2/sfuso-reset", sfusoResetRoutes);
  app.use("/api/v2/produzioni-sfuso", produzioneSfusoRoutes);
  app.use("/api/v2/produzioni-sfuso/storico", storicoProduzioniSfusoRouter);
  app.use("/api/v2", storicoResetRoutes);


  // =========================================================
  // 🚚 SPEDIZIONI E DDT
  // =========================================================
  app.use("/api/v2/impegni", impegniRoutes);
  app.use("/api/v2/spedizioni/storico", storicoSpedizioniRoutes);
  app.use("/api/v2/spedizioni", spedizioniRoutes);
  app.use("/api/v2/ddt", ddtRoutes);
  app.use("/api/v2/ddt", ddtGenericoRoutes);
  app.use("/api/v2/ddt", ddtStoricoRoutes);

  // =========================================================
  // 🏭 FORNITORI / ORDINI / LOGISTICA
  // =========================================================
  app.use("/api/v2/fornitori", fornitoriRoutes);
  app.use("/api/v2/fornitori-prodotti", fornitoriProdottiRoutes);
  app.use("/api/v2/prodotti-sfuso", prodottiSfusoRoutes);
  app.use("/api/v2/centri-logistici", centriLogisticiRoutes);
  app.use("/api/v2/ordini", ordiniRoutes);
  app.use("/api/v2/brand", brandRoutes);

  // =========================================================
  // 🔹 SP-API (Amazon)
  // =========================================================
  app.use("/api/v2/auth", authRoutes);
  app.use("/api/v2/catalog", catalogRoutes);
  app.use("/api/v2/catalog-amazon", catalogAmazonRoutes);
  app.use("/api/v2/inventory-amazon", inventoryAmazonRoutes);
  app.use("/api/v2/listings-amazon", listingsAmazonRoutes);
  app.use("/api/v2/reports-amazon", reportsAmazonRoutes);
  app.use("/api/v2/magazzino", inventarioRouter);
  app.use("/api/v2", inventoryAmazonController);

  // =========================================================
  // 🧭 STATIC FILES + HEALTHCHECK
  // =========================================================
  app.use("/static", express.static(path.join(__dirname, "../frontend/public")));
  app.get("/api/v2/health", (_req, res) => res.json({ ok: true }));

  // =========================================================
  // 🔹 BILANCIO
  // =========================================================
  app.use("/api/v2/bilancio", bilancioRouter);

  // =========================================================
  // ❌ ERROR HANDLERS
  // =========================================================

  app.use("/api/v2/config", configRoutes);

  app.use("/api/statistiche", require("./routes/statistiche"));


  
  app.use(notFoundHandler);
  app.use(errorHandler);




  

  // =========================================================
  // 🚀 AVVIO SERVER
  // =========================================================
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ backend_v2 in ascolto su http://localhost:${PORT}`);
  });

  // Shutdown graceful
  const keepAlive = setInterval(() => { }, 1 << 30);
  function shutdown(signal) {
    console.log(`\n🛑 Ricevuto segnale ${signal}, chiusura in corso…`);
    clearInterval(keepAlive);
    server.close(() => process.exit(0));
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) =>
    console.error("❌ UnhandledRejection:", reason)
  );
  process.on("uncaughtException", (err) => {
    console.error("❌ UncaughtException:", err);
    process.exit(1);
  });

  require("./keepAlive");
}

bootstrap().catch((err) => {
  console.error("❌ Errore di bootstrap:", err);
  process.exit(1);
});
