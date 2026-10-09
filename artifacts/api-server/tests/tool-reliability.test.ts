import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { encodeBitmap, normalizeBitmap } from "../src/lib/bitmap";
import { cleanupExpiredConversionResults, RESULT_RETENTION_MS, expiredCompletedJob } from "../src/lib/conversionRetention";
import { splitPdfPages } from "../src/lib/pdfOperations";
import { resultFilename } from "../src/lib/resultFilename";
import { compressionLevel } from "../src/lib/documentTools";

test("24-hour cleanup paginates and only deletes expired conversion assets", async () => {
  const now = Date.now(), old = new Date(now - RESULT_RETENTION_MS), recent = new Date(now - 1000);
  const removed: string[] = [], tokens: (string | undefined)[] = [];
  const count = await cleanupExpiredConversionResults(now, {
    list: async (prefix, token) => {
      assert.equal(prefix, "conversions/"); tokens.push(token);
      return token ? { objects: [{ key: "conversions/4-ocr-text.json", lastModified: old }] }
        : { objects: [{ key: "conversions/1", lastModified: old }, { key: "conversions/2", lastModified: recent },
          { key: "avatars/1", lastModified: old }, { key: "conversions/unrelated", lastModified: old },
          { key: "conversions/3" }], continuationToken: "next" };
    },
    remove: async key => { removed.push(key); },
  });
  assert.equal(count, 2); assert.deepEqual(removed, ["conversions/1", "conversions/4-ocr-text.json"]);
  assert.deepEqual(tokens, [undefined, "next"]);
  assert.equal(expiredCompletedJob({ status: "completed", updatedAt: old }, now), true);
  assert.equal(expiredCompletedJob({ status: "processing", updatedAt: old }, now), false);
  assert.equal(expiredCompletedJob({ status: "completed", updatedAt: recent }, now), false);
});
test("failed deletion is reported for retry, not silently treated as success", async () => {
  await assert.rejects(cleanupExpiredConversionResults(Date.now(), {
    list: async () => ({ objects: [{ key: "conversions/5", lastModified: new Date(0) }] }),
    remove: async () => { throw new Error("storage unavailable"); },
  }), /retried/);
});
test("BMP is a genuine correctly-sized round-trip bitmap", async () => {
  const image = await sharp({ create: { width: 7, height: 4, channels: 3, background: "#f7433d" } }).png().toBuffer();
  const bmp = await encodeBitmap(image);
  assert.equal(bmp.toString("ascii", 0, 2), "BM"); assert.equal(bmp.readUInt32LE(2), bmp.length);
  const png = await normalizeBitmap(bmp), info = await sharp(png).metadata();
  assert.equal(info.width, 7); assert.equal(info.height, 4);
  assert.deepEqual([...(await sharp(png).raw().toBuffer()).subarray(0, 3)], [247, 67, 61]);
  await assert.rejects(normalizeBitmap(bmp.subarray(0, 60)), /incomplete/);
});
test("every-N splits contain actual PDFs; a single group returns PDF, not ZIP", async () => {
  const source = await PDFDocument.create();
  for (let i = 0; i < 5; i++) source.addPage([100 + i, 200]);
  const bytes = await source.save();
  const result = await splitPdfPages(bytes, { mode: "every_n", pagesPerSplit: 2 });
  const zip = await JSZip.loadAsync(result.convertedBuffer);
  const files = Object.values(zip.files).filter(f => !f.dir);
  assert.equal(files.length, 3);
  assert.deepEqual(await Promise.all(files.map(async file => (await PDFDocument.load(await file.async("uint8array"))).getPageCount())), [2, 2, 1]);
  const single = await splitPdfPages(bytes, { mode: "ranges", ranges: "1-5" });
  assert.equal(single.mimeType, "application/pdf");
  assert.equal((await PDFDocument.load(single.convertedBuffer)).getPageCount(), 5);
  await assert.rejects(splitPdfPages(bytes, { mode: "every_n", pagesPerSplit: 0 }), /whole number/);
});
test("filenames reflect actual bytes and compression levels are strict", () => {
  assert.equal(resultFilename("sample_converted.zip", "application/pdf"), "sample_converted.pdf");
  assert.equal(resultFilename("sample_converted.zip", "image/jpeg"), "sample_converted.jpg");
  for (const level of ["low", "medium", "high"]) assert.equal(compressionLevel({ compressionLevel: level }), level);
  assert.throws(() => compressionLevel({ compressionLevel: "fake" }));
});
