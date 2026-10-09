import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import { Document, Paragraph, TextRun, Packer, ImageRun } from "docx";
import XLSX from "xlsx";
import PptxGenJS from "pptxgenjs";
import { officeDocumentPdf, compressDocumentPdf, searchableOcrPdf } from "../src/lib/documentTools";

async function text(bytes: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try { return (await parser.getText()).text; } finally { await parser.destroy(); }
}
test("LibreOffice renders real Word text, Bengali and an embedded image", async () => {
  const png = await readFile("/tmp/pdfgenius-phase1-sample.png");
  const document = new Document({ sections: [{ children: [
    new Paragraph({ children: [new TextRun("Office document test"), new TextRun({ text: " বাংলা ভাষা", font: "Noto Sans Bengali" })] }),
    new Paragraph({ children: [new ImageRun({ data: png, type: "png", transformation: { width: 160, height: 120 } })] }),
    new Paragraph({ text: "Second page", pageBreakBefore: true }),
  ] }] });
  const result = await officeDocumentPdf(await Packer.toBuffer(document), "word");
  await writeFile("/tmp/pdfgenius-office-word-test.pdf", result.convertedBuffer);
  const parsed = await PDFDocument.load(result.convertedBuffer);
  assert.equal(parsed.getPageCount(), 2);
  // PDF extraction may emit C0 spacing glyphs; keep every Unicode content character.
  const extracted = (await text(result.convertedBuffer)).replace(/[\s\u0000-\u0008\u000b-\u001f]/g, "");
  assert.ok(extracted.includes("Officedocumenttest"));
  assert.ok(extracted.normalize("NFC").includes("বাংলাভাষা".normalize("NFC")), `${JSON.stringify(extracted)}; ${[...extracted].filter(c => c.charCodeAt(0) > 127).map(c => c.charCodeAt(0).toString(16)).join(" ")}`);
  assert.ok(extracted.includes("Secondpage"));
});
test("LibreOffice renders actual Excel sheets and PowerPoint slides", async () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["Real workbook", "Amount"], ["Revenue", 125.5]]), "Data");
  book.Sheets.Data["!cols"] = [{ wch: 25 }, { wch: 12 }];
  const excel = await officeDocumentPdf(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), "excel");
  assert.match(await text(excel.convertedBuffer), /Real workbook/);
  assert.match(await text(excel.convertedBuffer), /125[.,]5/);
  const Pptx = (PptxGenJS as unknown as { default?: typeof PptxGenJS }).default ?? PptxGenJS;
  const ppt = new Pptx();
  ppt.addSlide().addText("First actual slide", { x: 1, y: 1, w: 5, h: 1 });
  ppt.addSlide().addText("Second actual slide", { x: 1, y: 1, w: 5, h: 1 });
  const powerpoint = await officeDocumentPdf(Buffer.from(await ppt.write({ outputType: "nodebuffer" }) as ArrayBuffer), "powerpoint");
  assert.equal((await PDFDocument.load(powerpoint.convertedBuffer)).getPageCount(), 2);
  assert.match(await text(powerpoint.convertedBuffer), /Second actual slide/);
});
test("Ghostscript levels return valid PDFs without inventing size savings", async () => {
  const bytes = await readFile("/tmp/pdfgenius-phase1-sample.pdf");
  for (const compressionLevel of ["low", "medium", "high"]) {
    const result = await compressDocumentPdf(bytes, { compressionLevel });
    assert.ok(result.convertedBuffer.length <= bytes.length);
    assert.equal((await PDFDocument.load(result.convertedBuffer)).getPageCount(), 4);
  }
  await assert.rejects(compressDocumentPdf(Buffer.from("not a PDF"), {}), /valid/);
});
test("Native English + Bengali OCR produces Unicode searchable text and a real PDF", async () => {
  const source = await PDFDocument.load(await readFile("/tmp/pdfgenius-phase1-sample.pdf"));
  const onePage = await PDFDocument.create();
  onePage.addPage((await onePage.copyPages(source, [0]))[0]);
  const result = await searchableOcrPdf(Buffer.from(await onePage.save()), { language: "eng+ben" });
  assert.equal((await PDFDocument.load(result.convertedBuffer)).getPageCount(), 1);
  const extracted = await text(result.convertedBuffer);
  assert.match(extracted, /[A-Za-z]{3}/);
  assert.match(extracted, /[\u0980-\u09ff]/);
});
