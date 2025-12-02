// backend_v2/modules/reports/testReportSkus.js
const {
  createReport,
  getReportStatus,
  downloadReportDocument,
} = require("./reportsAmazonService");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  try {
    console.log("📑 Creo report GET_MERCHANT_LISTINGS_ALL_DATA...");
    const report = await createReport(["APJ6JRA9NG5V4"]); // Italia
    console.log("✅ Report creato:", report);

    const reportId = report.reportId;
    console.log("⏳ Attendo che il report sia pronto...");

    let status;
    do {
      await sleep(5000); // aspetta 5 secondi
      status = await getReportStatus(reportId);
      console.log("👉 Stato attuale:", status.processingStatus);
    } while (status.processingStatus !== "DONE" && status.processingStatus !== "CANCELLED" && status.processingStatus !== "FATAL");

    if (status.processingStatus !== "DONE") {
      console.error("❌ Report non completato:", status.processingStatus);
      process.exit(1);
    }

    const documentId = status.reportDocumentId;
    console.log("📥 Scarico documento:", documentId);

    const rows = await downloadReportDocument(documentId);

    console.log("✅ Righe trovate:", rows.length);
    console.log("📦 Primo blocco di SKU:");
    rows.slice(0, 20).forEach((r, i) => {
      console.log(`${i + 1}. SKU=${r["seller-sku"]} | ASIN=${r["asin1"]} | marketplace=${r["marketplace-id"]}`);
    });

    console.log("\n👉 Copia uno SKU da qui ed usalo nella rotta /listings-amazon/:sku");
  } catch (err) {
    console.error("❌ Errore testReportSkus:", err.message);
    process.exit(1);
  }
})();
