import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";
import { pageRangeGroups, rotatePdfPages, splitPdfPages } from "../src/lib/pdfOperations";
import { imageQuality, normalizeImageInput } from "../src/lib/imageInput";
import { isPublicIp, validatePublicUrl } from "../src/lib/publicUrl";
import { validatePublicUrl as validateUrlInput } from "../../pdf-convert-master/src/lib/publicUrlValidation";

async function samplePdf() {
  const document = await PDFDocument.create();
  document.setTitle("Conversion regression sample");
  for (const width of [101, 202, 303]) document.addPage([width, 400]);
  document.getPage(1).setRotation(degrees(90));
  return document.save();
}

test("page ranges are inclusive, 1-based and grouped", () => {
  assert.deepEqual(pageRangeGroups("1-3, 5, 8-10", 10), [[0, 1, 2], [4], [7, 8, 9]]);
});
test("invalid, descending, empty and out-of-bounds ranges fail", () => {
  for (const value of ["", "0", "3-1", "11", "1-11", "1,,3", "-1", "1.5", "one", "1-2-3"])
    assert.throws(() => pageRangeGroups(value, 10));
});
test("selected rotation is additive and keeps other pages and metadata", async () => {
  const source = await samplePdf();
  const result = await rotatePdfPages(source, { angle: 270, pages: "2" });
  const document = await PDFDocument.load(result.convertedBuffer);
  assert.deepEqual(document.getPages().map(p => p.getRotation().angle), [0, 0, 0]);
  assert.equal(document.getTitle(), "Conversion regression sample");
  assert.equal((await PDFDocument.load(source)).getPage(1).getRotation().angle, 90);
});
test("all-page rotation and overlapping selection rotate each page once", async () => {
  const source = await samplePdf();
  const all = await PDFDocument.load((await rotatePdfPages(source, { angle: 180 })).convertedBuffer);
  assert.deepEqual(all.getPages().map(p => p.getRotation().angle), [180, 270, 180]);
  const selected = await PDFDocument.load((await rotatePdfPages(source, { angle: 90, pages: "1-2,2" })).convertedBuffer);
  assert.deepEqual(selected.getPages().map(p => p.getRotation().angle), [90, 180, 0]);
  await assert.rejects(rotatePdfPages(source, { angle: 45 }), /90, 180 or 270/);
});
test("split every page produces actual one-page PDFs in ZIP", async () => {
  const result = await splitPdfPages(await samplePdf());
  assert.equal(result.mimeType, "application/zip");
  const zip = await JSZip.loadAsync(result.convertedBuffer);
  assert.deepEqual(Object.keys(zip.files), ["page_1.pdf", "page_2.pdf", "page_3.pdf"]);
  for (let i = 1; i <= 3; i++) {
    const document = await PDFDocument.load(await zip.file(`page_${i}.pdf`)!.async("uint8array"));
    assert.equal(document.getPageCount(), 1);
    assert.equal(document.getPage(0).getWidth(), i * 101);
  }
});
test("range splitting creates one PDF per range and keeps page rotation", async () => {
  const result = await splitPdfPages(await samplePdf(), { mode: "ranges", ranges: "1-2,3,1-2" });
  const zip = await JSZip.loadAsync(result.convertedBuffer);
  assert.equal(Object.keys(zip.files).length, 3);
  const document = await PDFDocument.load(await zip.file("part_1_pages_1-2.pdf")!.async("uint8array"));
  assert.deepEqual(document.getPages().map(p => p.getWidth()), [101, 202]);
  assert.deepEqual(document.getPages().map(p => p.getRotation().angle), [0, 90]);
});
test("extraction returns one actual PDF in requested order, without duplicates", async () => {
  const result = await splitPdfPages(await samplePdf(), { mode: "extract", ranges: "3,1-2,2" });
  assert.equal(result.mimeType, "application/pdf");
  const document = await PDFDocument.load(result.convertedBuffer);
  assert.deepEqual(document.getPages().map(p => p.getWidth()), [303, 101, 202]);
  await assert.rejects(splitPdfPages(await samplePdf(), { mode: "extract", ranges: "4" }), /between 1 and 3/);
  await assert.rejects(splitPdfPages(new Uint8Array([1, 2, 3])), /valid, undamaged PDF/);
});
test("image quality is bounded, integral and never silently clamped", () => {
  assert.equal(imageQuality(undefined), 90);
  assert.equal(imageQuality(10), 10);
  assert.equal(imageQuality(100), 100);
  for (const value of [0, 9, 101, 50.5, "90", null, NaN])
    if (value !== null) assert.throws(() => imageQuality(value));
});
test("ordinary images pass through the HEIF normalizer unchanged", async () => {
  const bytes = Buffer.from("non-HEIF input is handled by Sharp");
  assert.equal(await normalizeImageInput(bytes, "png"), bytes);
});
test("public IP classification excludes private and special-use destinations", () => {
  for (const ip of ["8.8.8.8", "104.18.26.120", "2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8"])
    assert.equal(isPublicIp(ip), true, ip);
  for (const ip of ["0.0.0.0", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1",
    "192.168.1.1", "192.0.2.1", "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255",
    "::", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1", "ff02::1", "2001:db8::1", "2002:7f00:1::1", "3fff::1", "not-an-ip"])
    assert.equal(isPublicIp(ip), false, ip);
});
test("URL syntax validation normalizes disguised IPs before checking them", () => {
  assert.equal(validatePublicUrl("https://example.com/a#fragment").href, "https://example.com/a");
  for (const url of ["file:///etc/passwd", "ftp://example.com", "https://user:pass@example.com", "http://localhost",
    "http://app.internal", "http://127.1", "http://2130706433", "http://0x7f000001", "http://[::1]",
    "http://[::ffff:127.0.0.1]", "http://169.254.169.254/latest/meta-data/", "https://example.com:8080", "not a URL"])
    assert.throws(() => validatePublicUrl(url), undefined, url);
});
test("URL form rejects private literals before marking the source ready", () => {
  for (const value of ["http://127.0.0.1", "http://localhost", "http://2130706433", "http://[::ffff:127.0.0.1]",
    "http://169.254.169.254", "http://[::1]", "http://[fe80::1]", "http://[2001:db8::1]", "https://example.com:8080"])
    assert.ok(validateUrlInput(value), value);
  for (const value of ["https://example.com", "https://8.8.8.8", "https://[2606:4700:4700::1111]"])
    assert.equal(validateUrlInput(value), null, value);
});
