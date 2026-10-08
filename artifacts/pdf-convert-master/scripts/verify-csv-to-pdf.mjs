// Real backend/browser regression check. All data below are test fixtures,
// never product-visible samples. Does not use accounts or credentials.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const apiRequire = createRequire(new URL("../../api-server/package.json", import.meta.url));
const puppeteer = apiRequire("puppeteer").default;
const { getDocument } = await import(pathToFileURL(apiRequire.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
const origin = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:80";
const directory = await mkdtemp(path.join(tmpdir(), "csv-pdf-check-"));
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function pdfContent(buffer) {
  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  const task = getDocument({ data: Uint8Array.from(buffer), useSystemFonts: true });
  try {
    const document = await task.promise;
    const pages = [];
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      pages.push({
        text: (await page.getTextContent()).items.map(item => (item.str ?? "") + (item.hasEOL ? "\n" : "")).join(""),
        size: page.getViewport({ scale: 1 }),
      });
    }
    return pages;
  } finally { await task.destroy(); }
}
async function submit(csv, options) {
  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), "csv-regression.csv");
  form.append("toolType", "csv_to_pdf");
  form.append("fileName", "csv-regression.csv");
  form.append("fileSize", String(Buffer.byteLength(csv)));
  form.append("options", JSON.stringify(options));
  const response = await fetch(`${origin}/api/convert`, { method: "POST", body: form });
  const result = await response.json();
  assert.equal(result.success, true, JSON.stringify(result));
  for (let i = 0; i < 80; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const job = await (await fetch(`${origin}/api/jobs/${result.data.jobId}`)).json();
    if (["failed", "completed"].includes(job.data.status)) return { job: job.data, id: result.data.jobId };
  }
  throw new Error("CSV conversion timed out.");
}

try {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => {
      if (blob instanceof Blob && blob.type.includes("pdf")) {
        window.csvPdfBytes = blob.arrayBuffer().then(bytes => Array.from(new Uint8Array(bytes)));
      }
      return create(blob);
    };
  });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${origin}/csv-to-pdf`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="file"]');
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewport({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Empty-state overflow at ${width}px`);
  }
  const csv = 'Code;Name;Notes\n001;Zoë;"Quoted, value"\n002;বাংলা;"Line one\nLine two"\n003;<script>alert(1)</script>;"He said ""yes"""';
  const inputPath = path.join(directory, "verified-data.csv");
  await writeFile(inputPath, csv);
  await (await page.$('input[type="file"]')).uploadFile(inputPath);
  await page.waitForSelector('[data-testid="csv-preview"]');
  assert.ok((await page.$eval('[data-testid="csv-preview"]', el => el.textContent)).includes("001"));
  assert.ok((await page.$eval('[data-testid="csv-preview"]', el => el.textContent)).includes("<script>alert(1)</script>"));
  await page.select('[data-testid="select-csv-paper"]', "Letter");
  await page.select('[data-testid="select-csv-orientation"]', "portrait");
  await page.select('[data-testid="select-csv-fontsize"]', "12");
  await page.click('[data-testid="checkbox-csv-header"]');
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewport({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Loaded-state overflow at ${width}px`);
  }
  await page.click('[data-testid="button-csv-convert"]');
  await page.waitForSelector('[data-testid="status-csv-completed"]', { timeout: 90000 });
  const downloadResponse = page.waitForResponse(response => /\/api\/download\/\d+$/.test(response.url()));
  await page.click('[data-testid="button-csv-download"]');
  const response = await downloadResponse;
  assert.equal(response.status(), 200);
  // CDP may discard attachment response bodies; inspect the actual PDF Blob
  // received by the browser's real download helper instead.
  await page.waitForFunction(() => !!window.csvPdfBytes);
  const pages = await pdfContent(Buffer.from(await page.evaluate(() => window.csvPdfBytes)));
  assert.equal(Math.round(pages[0].size.width), 612);
  assert.equal(Math.round(pages[0].size.height), 792);
  const text = pages.map(p => p.text).join(" ");
  for (const value of ["001", "002", "003", "Zoë", "Quoted, value", "Line one", "Line two", "Code", "Column 1", "<script>alert(1)</script>"])
    assert.ok(text.includes(value), `Missing PDF value: ${value}`);
  await page.waitForFunction(() => document.querySelector('[data-testid="button-csv-download"]').disabled);
  assert.deepEqual(errors, []);
  console.log("PASS: real upload → preview/settings → Letter portrait PDF → guest download; Unicode, leading zeroes, quoting, multiline fields and escaped HTML; responsive empty/loaded states.");

  const wide = [Array.from({ length: 15 }, (_, c) => `Header${c + 1}`).join(","),
    ...Array.from({ length: 80 }, (_, r) => Array.from({ length: 15 }, (_, c) => `R${r + 1}C${c + 1}`).join(","))].join("\n");
  const exported = await submit(wide, { orientation: "landscape", firstRowHeader: true, fontSize: 10 });
  assert.equal(exported.job.status, "completed", exported.job.errorMessage);
  const wideResponse = await fetch(`${origin}/api/download/${exported.id}`);
  assert.equal(wideResponse.status, 200);
  const widePages = await pdfContent(Buffer.from(await wideResponse.arrayBuffer()));
  assert.ok(widePages.length >= 4);
  const wideText = widePages.map(p => p.text).join(" ");
  for (let r = 1; r <= 80; r++) for (let c = 1; c <= 15; c++)
    assert.ok(new RegExp(`\\bR${r}C${c}\\b`).test(wideText), `Missing R${r}C${c}`);
  assert.ok(widePages.every(p => p.text.includes("Header1")), "Repeated table headers missing");
  assert.ok(widePages[0].size.width > widePages[0].size.height);
  console.log(`PASS: all 1,200 values preserved across ${widePages.length} landscape pages, wide-column sections and repeated headers.`);
  const invalid = await submit('A,B\n"unfinished,2', {});
  assert.equal(invalid.job.status, "failed");
  assert.match(invalid.job.errorMessage, /invalid quoting/);
  console.log("PASS: malformed input fails explicitly on the real server, with no fake output.");
} finally {
  await browser.close();
  await rm(directory, { recursive: true, force: true });
}
