const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", // cambia se diverso
    headless: true
  });
  const page = await browser.newPage();
  await page.setContent("<h1>Ciao PDF</h1>");
  await page.pdf({ path: "test.pdf", format: "A4" });
  await browser.close();
  console.log("✅ PDF creato test.pdf");
})();
