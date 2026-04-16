
// =========================================================
// 🧩 BACKEND_V2 - ENTRY POINT
// =========================================================

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { ensureDatabaseReady } = require("./db/database");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { requireAuth } = require("./middleware/authMiddleware");
const logger = require("./utils/logger");
const pinoHttp = require("pino-http");

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
const listingsEditorRoutes = require("./modules/listings/listingsEditorRoutes");
const reportsAmazonRoutes = require("./modules/reports/reportsAmazonRoutes");
const inventoryAmazonController = require("./modules/inventory/inventoryAmazonController");

// --- DDT e Brand
const ddtRoutes = require("./ddt/ddtIndex");
const ddtGenericoRoutes = require("./routes/ddtGenerico");
const ddtStoricoRoutes = require("./routes/ddtStorico");
const brandRoutes = require("./routes/brand");
const prebolleRoutes = require("./ddt/prebolle");


// --- Fornitori e Ordini
const fornitoriRoutes = require("./routes/fornitori");
const fornitoriProdottiRoutes = require("./routes/fornitoriProdotti");
const ordiniRoutes = require("./routes/ordini");

// --- Spedizioni
const spedizioniRoutes = require("./routes/spedizioni");
const storicoSpedizioniRoutes = require("./routes/storicoSpedizioni");
const impegniRoutes = require("./routes/impegni");

// --- One Step
const onestepRoutes = require("./routes/onestep");
const topcoatRoutes = require("./routes/topcoat");
const moduliCustomRoutes = require("./routes/moduliCustom");

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
const appAuthRoutes = require("./routes/appAuth");

const scatoletteRoutes = require("./routes/scatolette");
const etichetteRoutes = require("./routes/etichette");

// --- Auth App (JWT)
const authAppRoutes = require("./routes/authRoutes");

// --- Backup
const backupRoutes = require("./modules/backup/backupRoutes");

// --- Notifiche
const notificationRoutes = require("./modules/notifications/notificationRoutes");



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
  const { getDbPath } = require("./db/database");
  runMigrations(getDbPath());

  // =========================================================
  // 🧱 MIDDLEWARE
  // =========================================================

  const app = express();

  // CORS — accetta solo origini configurate in ALLOWED_ORIGINS
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5174")
    .split(",")
    .map((o) => o.trim());

  app.use(cors({
    origin(origin, cb) {
      // Permetti richieste senza origin (es. Postman, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origine non permessa — ${origin}`));
    },
    credentials: true,
  }));

  // Rate limiting globale — escluse le route di polling /stato (vengono chiamate ogni 3s)
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.endsWith("/stato"),
    message: { error: "Troppe richieste, riprova tra qualche minuto." },
  }));

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // =========================================================
  // 📋 HTTP LOGGER — pino-http scrive una riga per ogni richiesta
  // =========================================================
  app.use(pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => {
        const u = req.url || "";
        // Polling frequenti — tagliati dai log (restano visibili solo su errore)
        if (u.endsWith("/stato")) return true;
        if (u === "/api/v2/health") return true;
        if (u.startsWith("/api/v2/notifications/unread")) return true;
        if (u.startsWith("/api/v2/alerts/attivi")) return true;
        return false;
      },
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      if (res.statusCode === 304) return "silent"; // cache-hit, niente rumore
      return "info";
    },
    // Log minimale — solo method, url, status, durata. Niente headers.
    customSuccessMessage: (req, res, responseTime) =>
      `${req.method} ${req.url} ${res.statusCode} ${Math.round(responseTime)}ms`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} ${res.statusCode} ${err?.message || "error"}`,
    serializers: {
      req: () => undefined, // custom message già contiene method+url
      res: () => undefined, // custom message già contiene status
      err: (err) => ({ type: err?.type, message: err?.message, stack: err?.stack }),
    },
  }));

  // =========================================================
  // 🔐 AUTH GLOBALE — tutte le API richiedono JWT tranne whitelist
  // =========================================================
  const PUBLIC_API_PATHS = new Set([
    "/api/v2/auth-app/login",
    "/api/v2/health",
  ]);

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();
    if (PUBLIC_API_PATHS.has(req.path)) return next();
    return requireAuth(req, res, next);
  });

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
  // sfusoResetRoutes rimosso: la rotta /storico-inventario/reset è già in sfusoRoutes
  app.use("/api/v2/produzioni-sfuso", produzioneSfusoRoutes);
  app.use("/api/v2/produzioni-sfuso/storico", storicoProduzioniSfusoRouter);
  app.use("/api/v2", storicoResetRoutes);

  app.use("/api/v2/storico-scatolette", require("./routes/scatoletteStorico"));

  app.use("/api/v2/scatolette", scatoletteRoutes);
  app.use("/api/v2/etichette", etichetteRoutes);

  // =========================================================
  // 🚚 SPEDIZIONI E DDT
  // =========================================================
  app.use("/api/v2/impegni", impegniRoutes);
  app.use("/api/v2/spedizioni/storico", storicoSpedizioniRoutes);
  app.use("/api/v2/spedizioni", spedizioniRoutes);
  app.use("/api/v2/ddt", ddtRoutes);
  app.use("/api/v2/ddt", ddtGenericoRoutes);
  app.use("/api/v2/ddt", ddtStoricoRoutes);
  app.use("/api/v2/prebolle", prebolleRoutes);

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
  app.use("/api/v2/listings-editor", listingsEditorRoutes);
  app.use("/api/v2/reports-amazon", reportsAmazonRoutes);
  app.use("/api/v2/magazzino", inventarioRouter);
  app.use("/api/v2/inventario", inventarioRouter);  // alias: frontend usa /inventario
  app.use("/api/v2", inventoryAmazonController);

  // =========================================================
  // 🌍 EUROPA — Alert & Dashboard
  // =========================================================
  app.use("/api/v2/europa", require("./modules/europa/europaRoutes"));

  // =========================================================
  // ⭐ SELLER FEEDBACK (recensioni venditore via SP-API)
  // =========================================================
  app.use("/api/v2/feedback", require("./modules/feedback/feedbackRoutes"));

  // =========================================================
  // 📦 RESI FBA (Amazon returns via SP-API Reports)
  // =========================================================
  app.use("/api/v2/returns", require("./modules/returns/returnsRoutes"));

  // =========================================================
  // 🧭 STATIC FILES + HEALTHCHECK
  // =========================================================
  app.use("/static", express.static(path.join(__dirname, "../frontend/public")));
  app.use("/onestep-images", express.static(path.join(__dirname, "../frontend/public/onestep-images")));
  app.use("/topcoat-images", express.static(path.join(__dirname, "../frontend/public/topcoat-images")));
  app.use("/moduli-images", express.static(path.join(__dirname, "../frontend/public/moduli-images")));
  app.get("/api/v2/health", (_req, res) => res.json({ ok: true }));

  // =========================================================
  // 🔹 BILANCIO
  // =========================================================
  app.use("/api/v2/onestep", onestepRoutes);
  app.use("/api/v2/topcoat", topcoatRoutes);
  app.use("/api/v2/moduli", moduliCustomRoutes);
  app.use("/api/v2/bilancio", bilancioRouter);

  // =========================================================
  // ❌ ERROR HANDLERS
  // =========================================================

  app.use("/api/v2/config", configRoutes);
  app.use("/api/v2/app-auth", appAuthRoutes);

  // =========================================================
  // 🔐 AUTH JWT (login, utenti, profilo)
  // =========================================================
  app.use("/api/v2/auth-app", authAppRoutes);

  app.use("/api/statistiche", require("./routes/statistiche"));

  // =========================================================
  // 💾 BACKUP DB
  // =========================================================
  app.use("/api/v2/backup", backupRoutes);

  // =========================================================
  // 📧 NOTIFICHE EMAIL
  // =========================================================
  app.use("/api/v2/notifications", notificationRoutes);


  
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

  // Cron sync automatici Amazon SP-API (stock, prezzi, buybox, vendite, listing)
  const { startSyncCrons } = require("./modules/sync/syncCron");
  startSyncCrons();

  // Cron backup DB (ogni notte alle 02:00)
  const { startBackupCron } = require("./modules/backup/backupService");
  startBackupCron();

  // Cron digest alert email (ogni mattina alle 07:00)
  const { startDigestCron } = require("./modules/notifications/alertDigest");
  startDigestCron();
}

bootstrap().catch((err) => {
  console.error("❌ Errore di bootstrap:", err);
  process.exit(1);
});
