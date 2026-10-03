import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import type { EducationSourcePage, EducationExtraction } from "@workspace/api-zod";
import { educationConfig, EducationError } from "./config";

export function parsePageRange(range: string | undefined, total: number): number[] {
  if (!range?.trim()) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>();
  for (const part of range.replace(/[–—]/g, "-").split(",")) {
    const match = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
    if (!match) throw new EducationError("Enter a page range such as 3–10 or 1, 3–5.");
    const first = Number(match[1]), last = Number(match[2] ?? match[1]);
    if (first < 1 || last < first || last > total) throw new EducationError(`Page range must be within pages 1–${total}.`);
    for (let i = first; i <= last; i++) pages.add(i);
  }
  return [...pages].sort((a, b) => a - b);
}

export function cleanText(text: string): string {
  return text.replace(/\u0000/g, "").replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function validateSource(pages: EducationSourcePage[]): void {
  if (pages.reduce((sum, p) => sum + p.text.length, 0) > educationConfig.maxSourceCharacters)
    throw new EducationError("This document has too much text. Select a smaller page range.", 413);
  if (pages.map(p => p.text).join(" ").replace(/\s/g, "").length < 50)
    throw new EducationError("No readable study text found. Upload a clearer PDF or paste at least a few sentences.");
  const numbered = pages.filter(p => p.pageNumber !== null).map(p => p.pageNumber);
  if (new Set(numbered).size !== numbered.length)
    throw new EducationError("Duplicate source pages. Please upload the PDF again.");
}

export async function extractPdf(buffer: Buffer, range?: string): Promise<EducationExtraction> {
  if (buffer.length > educationConfig.maxFileBytes) throw new EducationError("File too large. Upload a PDF up to 20 MB.", 413);
  if (!buffer.subarray(0, 1024).toString("latin1").includes("%PDF-"))
    throw new EducationError("Please upload a valid PDF file.");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  try {
    const info = await parser.getInfo();
    if (info.total > educationConfig.maxPages)
      throw new EducationError("Free uploads support PDFs with up to 50 pages.", 413);
    const selected = parsePageRange(range, info.total);
    const result = await parser.getText({ partial: selected });
    const textByPage = new Map(result.pages.map(page => [page.num, cleanText(page.text)]));
    const pages: EducationSourcePage[] = [], warnings: string[] = [];
    let usedOcr = false;
    for (const pageNumber of selected) {
      let text = textByPage.get(pageNumber) ?? "";
      // Same PDFParse screenshot + local Tesseract pipeline as the existing OCR
      // tool; OCR only missing pages, not the entire document.
      if (text.replace(/\s/g, "").length < 20) {
        usedOcr = true;
        worker ??= await createWorker("eng+ben");
        const shots = await parser.getScreenshot({ partial: [pageNumber], scale: 1.5 });
        const image = shots.pages[0]?.data;
        if (image) {
          const recognised = await worker.recognize(Buffer.from(image));
          text = cleanText(recognised.data.text);
        }
      }
      if (text) pages.push({ pageNumber, text });
      else warnings.push(`Page ${pageNumber} had no readable text and was skipped.`);
    }
    validateSource(pages);
    return { pages, totalPages: info.total, usedOcr, warnings };
  } catch (error) {
    if (error instanceof EducationError) throw error;
    throw new EducationError("Could not read this PDF. It may be password-protected, damaged, or too unclear. Try an unlocked PDF or paste text.");
  } finally {
    await worker?.terminate().catch(() => {});
    await parser.destroy().catch(() => {});
  }
}

export function chunkSource(pages: EducationSourcePage[]): { text: string; pageNumbers: (number | null)[] }[] {
  const chunks: { text: string; pageNumbers: (number | null)[] }[] = [];
  let text = "", pageNumbers: (number | null)[] = [];
  for (const page of pages) {
    // Large single pages are also split, retaining their page number.
    for (let offset = 0; offset < page.text.length; offset += educationConfig.chunkCharacters - 100) {
      const piece = `\n[Source page: ${page.pageNumber ?? "pasted text"}]\n${page.text.slice(offset, offset + educationConfig.chunkCharacters - 100)}`;
      if (text && text.length + piece.length > educationConfig.chunkCharacters) {
        chunks.push({ text, pageNumbers }); text = ""; pageNumbers = [];
      }
      text += piece;
      if (!pageNumbers.includes(page.pageNumber)) pageNumbers.push(page.pageNumber);
    }
  }
  if (text) chunks.push({ text, pageNumbers });
  return chunks;
}