// Development-only, real-file integration checks. Never uses existing users,
// billing credentials or uploaded customer files.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { PDFDocument, degrees } = require("pdf-lib");
const { PDFParse } = require("pdf-parse");
const JSZip = require("jszip");
const sharp = require("sharp");
const puppeteer = require("puppeteer").default;
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (!process.env.REPLIT_DEV_DOMAIN) throw new Error("Run this check in the development workspace.");
const root = resolve(import.meta.dirname, "..");
const font = await readFile(resolve(root, "src/education/assets/NotoSansBengali.ttf"));
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Bengali;src:url(data:font/ttf;base64,${font.toString("base64")});font-weight:100 900}
body{font-family:Arial,Bengali,sans-serif}section{break-after:page}section:last-child{break-after:auto}
</style></head><body>${[1,2,3,4].map(i=>`<section><h1>Verification page ${i}</h1><p>বাংলা নথি: শিক্ষা ও দৈনন্দিন কাজ।</p><p>This is real document text on page ${i}.</p></section>`).join("")}</body></html>`;
const browser = await puppeteer.launch({ executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(), headless: true, args: ["--no-sandbox"] });
let source;
try {
  const page = await browser.newPage();
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  source = Buffer.from(await page.pdf({ format: "A4", printBackground: true }));
} finally { await browser.close(); }
const document = await PDFDocument.load(source);
assert.equal(document.getPageCount(), 4);
document.setTitle("Bangla and English verification document");
document.getPage(1).setRotation(degrees(90));
source = Buffer.from(await document.save());
await writeFile("/tmp/pdfgenius-phase1-sample.pdf", source);
await writeFile("/tmp/pdfgenius-phase1-sample.html", html);
const png = await sharp({ create: { width: 320, height: 240, channels: 4, background: "#f7433d80" } }).png().toBuffer();
await writeFile("/tmp/pdfgenius-phase1-sample.png", png);
execFileSync("qpdf", ["--encrypt", "test-only-password", "test-only-owner-password", "256", "--", "/tmp/pdfgenius-phase1-sample.pdf", "/tmp/pdfgenius-phase1-encrypted.pdf"]);
await writeFile("/tmp/pdfgenius-phase1-invalid.pdf", "This is not a PDF.");

async function convert(tool, bytes, filename, options = {}, expectedError) {
  const form = new FormData();
  if (bytes) form.append("file", new Blob([bytes]), filename);
  form.append("toolType", tool);
  form.append("options", JSON.stringify(options));
  const response = await fetch(`${base}/api/convert`, { method: "POST", body: form });
  const body = await response.json();
  if (!response.ok) {
    if (expectedError) { assert.match(body.error, expectedError); return; }
    throw new Error(`${tool}: ${JSON.stringify(body)}`);
  }
  const id = body.data.jobId;
  for (let i = 0; i < 150; i++) {
    const status = await (await fetch(`${base}/api/jobs/${id}`)).json();
    const data = status.data ?? status;
    if (data.status === "failed") {
      const message = data.errorMessage ?? data.error ?? "Conversion failed";
      if (expectedError) { assert.match(message, expectedError); return; }
      throw new Error(`${tool}: ${message}`);
    }
    if (data.status === "completed") {
      if (expectedError) throw new Error(`${tool} should have rejected this input.`);
      const download = await fetch(`${base}/api/download/${id}`);
      assert.equal(download.status, 200);
      return { bytes: Buffer.from(await download.arrayBuffer()), type: download.headers.get("content-type"), name: download.headers.get("content-disposition") };
    }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`${tool} did not finish in the test window.`);
}
async function text(bytes) {
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try { return (await parser.getText()).text.replace(/\s+/g, " "); } finally { await parser.destroy(); }
}
function assertBangla(value) {
  // Rotated glyph runs can introduce extraction whitespace within a word;
  // compare the characters rather than treating layout whitespace as loss.
  assert.match(value.replace(/\s/g, ""), /বাংলা/);
}
assertBangla(await text(source));
if (!process.argv.includes("--url-and-errors-only")) {
for (const format of ["jpg", "png"]) {
  const result = await convert("pdf_to_images", source, "bangla.pdf", { outputFormat: format, quality: 65 });
  assert.match(result.type, /application\/zip/);
  const zip = await JSZip.loadAsync(result.bytes);
  assert.equal(Object.keys(zip.files).length, 4);
  for (const entry of Object.values(zip.files)) {
    assert.ok(entry.name.endsWith(`.${format}`));
    const metadata = await sharp(await entry.async("nodebuffer")).metadata();
    assert.equal(metadata.format, format === "jpg" ? "jpeg" : "png");
    assert.ok(metadata.width > 1000 && metadata.height > 1000);
  }
  await writeFile(`/tmp/pdfgenius-phase1-pages-${format}.zip`, result.bytes);
  console.log(`PASS PDF pages → real ${format.toUpperCase()} in ZIP`);
}
for (const format of ["jpg", "png", "webp"]) {
  const result = await convert("convert_image_format", png, "sample.png", { outputFormat: format, quality: 70 });
  const metadata = await sharp(result.bytes).metadata();
  assert.equal(metadata.format, format === "jpg" ? "jpeg" : format);
  assert.equal(metadata.width, 320);
  assert.equal(metadata.height, 240);
  assert.match(result.name, new RegExp(`\\.${format}"`));
  console.log(`PASS image → real ${format.toUpperCase()}`);
}
const heic = await readFile("/tmp/phase1-example.heic");
for (const extension of ["heic", "heif"]) {
  const result = await convert("convert_image_format", heic, `sample.${extension}`, { outputFormat: "webp", quality: 75 });
  const metadata = await sharp(result.bytes).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width > 100);
  console.log(`PASS real ${extension.toUpperCase()} input → WebP`);
}
for (const mode of ["all", "ranges", "extract"]) {
  const result = await convert("split_pdf", source, "bangla.pdf", { mode, ranges: "1-2,4" });
  if (mode === "extract") {
    assert.match(result.type, /application\/pdf/);
    assert.match(result.name, /\.pdf"/);
    const doc = await PDFDocument.load(result.bytes);
    assert.equal(doc.getPageCount(), 3);
    const words = await text(result.bytes);
    assertBangla(words);
    assert.match(words, /Verification page 4/);
    assert.doesNotMatch(words, /Verification page 3/);
  } else {
    assert.match(result.type, /application\/zip/);
    const zip = await JSZip.loadAsync(result.bytes);
    assert.equal(Object.keys(zip.files).length, mode === "all" ? 4 : 2);
    for (const entry of Object.values(zip.files)) {
      const bytes = await entry.async("nodebuffer");
      const doc = await PDFDocument.load(bytes);
      assert.ok(doc.getPageCount() > 0);
      assertBangla(await text(bytes));
    }
  }
  console.log(`PASS split ${mode}: actual PDFs, correct pages and Bangla text retained`);
}
for (const angle of [90, 180, 270]) {
  const result = await convert("rotate_pdf", source, "bangla.pdf", { angle, pages: "2,4" });
  const doc = await PDFDocument.load(result.bytes);
  assert.deepEqual(doc.getPages().map(p => p.getRotation().angle), [0, (90 + angle) % 360, 0, angle]);
  assert.equal(doc.getTitle(), document.getTitle());
  assertBangla(await text(result.bytes));
  console.log(`PASS selected-page rotation ${angle}° and Bangla text`);
}
const uploadedHtml = await convert("html_to_pdf", Buffer.from(html), "bangla.html", {});
assert.equal((await PDFDocument.load(uploadedHtml.bytes)).getPageCount(), 4);
assertBangla(await text(uploadedHtml.bytes));
console.log("PASS HTML upload → actual Bangla PDF");
}
const webpage = await convert("html_to_pdf", null, "", { inputMode: "url", url: "https://example.com" });
assert.match(await text(webpage.bytes), /domain is for use in documentation examples/i);
assert.equal((await PDFDocument.load(webpage.bytes)).getTitle(), "Example Domain");
await writeFile("/tmp/pdfgenius-phase1-webpage.pdf", webpage.bytes);
console.log("PASS public URL without file → actual webpage PDF");
for (const url of ["http://127.0.0.1", "http://169.254.169.254", "http://[::1]", "http://2130706433", "file:///etc/passwd", "http://localtest.me"])
  await convert("html_to_pdf", null, "", { inputMode: "url", url }, /private|internal|reserved|HTTP|hostname/i);
await convert("split_pdf", source, "bangla.pdf", { mode: "extract", ranges: "5" }, /between 1 and 4/);
await convert("rotate_pdf", await readFile("/tmp/pdfgenius-phase1-encrypted.pdf"), "encrypted.pdf", {}, /encrypted|Unlock/i);
await convert("pdf_to_images", Buffer.from("Not a PDF"), "invalid.pdf", {}, /valid|damaged|opened/i);
console.log("PASS invalid ranges, encrypted/malformed PDFs, private/IP-disguised/metadata/IPv6 URLs and DNS-to-loopback rejected");
console.log("Phase 1 real-file integration checks passed.");
