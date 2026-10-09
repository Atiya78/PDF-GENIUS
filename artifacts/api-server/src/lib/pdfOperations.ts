import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";

export function pageRangeGroups(value: unknown, count: number): number[][] {
  if (typeof value !== "string" || !value.trim()) throw new Error("Enter page numbers or ranges, such as 1-3, 5, 8-10.");
  if (value.length > 4000) throw new Error("The page selection is too long.");
  return value.split(",").map(token => {
    const match = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(`Invalid page range "${token.trim()}". Use numbers or ascending ranges separated by commas.`);
    const start = Number(match[1]), end = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end > count)
      throw new Error(`Page ranges must be between 1 and ${count}, in ascending order.`);
    return Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
  });
}

export async function loadEditablePdf(bytes: Uint8Array) {
  try {
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    if (!document.getPageCount()) throw new Error("This PDF has no pages.");
    return document;
  } catch (error) {
    if (/encrypt|password/i.test(String(error))) throw new Error("This PDF is encrypted. Unlock it before using this tool.");
    throw new Error(`This PDF could not be opened. Check that it is a valid, undamaged PDF. ${error instanceof Error ? error.message : ""}`);
  }
}

export async function rotatePdfPages(bytes: Uint8Array, options: Record<string, unknown> = {}) {
  const angle = options.angle ?? 90;
  if (![90, 180, 270].includes(angle as number)) throw new Error("Choose a rotation of 90, 180 or 270 degrees.");
  const document = await loadEditablePdf(bytes);
  const count = document.getPageCount();
  const selection = options.pages ?? "all";
  const indices = selection === "all" ? Array.from({ length: count }, (_, i) => i)
    : [...new Set(pageRangeGroups(selection, count).flat())];
  for (const index of indices) {
    const page = document.getPage(index);
    page.setRotation(degrees((page.getRotation().angle + (angle as number)) % 360));
  }
  return { success: true, convertedBuffer: Buffer.from(await document.save()), mimeType: "application/pdf" };
}

export async function splitPdfPages(bytes: Uint8Array, options: Record<string, unknown> = {}) {
  const mode = options.mode ?? "all";
  if (!["all", "ranges", "extract", "every_n"].includes(mode as string)) throw new Error("Choose every page, page ranges, every N pages or extract selected pages.");
  const source = await loadEditablePdf(bytes);
  const count = source.getPageCount();
  const size = options.pagesPerSplit;
  if (mode === "every_n" && (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > count))
    throw new Error(`Pages per split must be a whole number between 1 and ${count}.`);
  const groups = mode === "every_n" ? Array.from({ length: Math.ceil(count / (size as number)) }, (_, i) =>
    Array.from({ length: Math.min(size as number, count - i * (size as number)) }, (_, j) => i * (size as number) + j))
    : mode === "all" ? Array.from({ length: count }, (_, i) => [i])
    : pageRangeGroups(options.ranges, count);
  const exportPages = async (indices: number[]) => {
    const document = await PDFDocument.create();
    for (const page of await document.copyPages(source, indices)) document.addPage(page);
    return Buffer.from(await document.save());
  };
  if (mode === "extract" || groups.length === 1) return {
    success: true, convertedBuffer: await exportPages([...new Set(groups.flat())]), mimeType: "application/pdf",
  };
  if (groups.length > 1000) throw new Error("This split would create more than 1,000 files. Use fewer page ranges.");
  const zip = new JSZip();
  let totalBytes = 0;
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const output = await exportPages(group);
    totalBytes += output.length;
    if (totalBytes > 128 * 1024 * 1024) throw new Error("The split results exceed 128 MB. Split fewer pages at a time.");
    const name = mode === "all" ? `page_${group[0] + 1}.pdf`
      : `part_${i + 1}_pages_${group[0] + 1}${group.length > 1 ? `-${group[group.length - 1] + 1}` : ""}.pdf`;
    zip.file(name, output);
  }
  return { success: true, convertedBuffer: await zip.generateAsync({ type: "nodebuffer" }), mimeType: "application/zip" };
}
