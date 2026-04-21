// backend_v2/modules/reports/testReportSkus.js
const {
  createReport,
  getReportStatus,
  downloadReportDocument,
} = require("./reportsAmazonService");
const logger = require("../../utils/logger");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  try {
    logger.info("📑 Creo report GET_MERCHANT_LISTINGS_ALL_DATA...");
    const report = await createReport(["APJ6JRA9NG5V4"]); // Italia
    logger.info("✅ Report creato:", report);

    const reportId = report.reportId;
    logger.info("⏳ Attendo che il report sia pronto...");

    let status;
    do {
      await sleep(5000); // aspetta 5 secondi
      status = await getReportStatus(reportId);
      logger.info("👉 Stato attuale:", status.processingStatus);
    } while (status.processingStatus !== "DONE" && status.processingStatus !== "CANCELLED" && status.processingStatus !== "FATAL");

    if (status.processingStatus !== "DONE") {
      logger.error("❌ Report non completato:", status.processingStatus);
      process.exit(1);
    }

    const documentId = status.reportDocumentId;
    logger.info("📥 Scarico documento:", documentId);

    const rows = await downloadReportDocument(documentId);

    logger.info("✅ Righe trovate:", rows.length);
    logger.info("📦 Primo blocco di SKU:");
    rows.slice(0, 20).forEach((r, i) => {
      logger.info(`${i + 1}. SKU=${r["seller-sku"]} | ASIN=${r["asin1"]} | marketplace=${r["marketplace-id"]}`);
    });

    logger.info("\n👉 Copia uno SKU da qui ed usalo nella rotta /listings-amazon/:sku");
  } catch (err) {
    logger.error("❌ Errore testReportSkus:", err.message);
    process.exit(1);
  }
})();
