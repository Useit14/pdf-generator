const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("chrome-aws-lambda");
const app = express();

app.use(express.json({ limit: "10mb" }));

app.post("/generate-pdf", async (req, res) => {
  try {
    const { html, options = {} } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'Field "html" is required' });
    }

    console.log("PDF generation request received");

    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--single-process",
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,
      ignoreDefaultArgs: ["--disable-extensions"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: options.format || "A4",
      printBackground:
        options.printBackground !== undefined ? options.printBackground : true,
      margin: options.margin || {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px",
      },
      displayHeaderFooter: options.displayHeaderFooter || false,
      landscape: options.landscape || false,
    });

    await browser.close();

    console.log("PDF generated successfully");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF generator service running on port ${PORT}`);
});
