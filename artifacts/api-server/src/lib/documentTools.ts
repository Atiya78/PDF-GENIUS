import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import { loadEditablePdf } from "./pdfOperations";

const exec = promisify(execFile);
export function compressionLevel(options: Record<string, unknown>) {
  const level = options.compressionLevel ?? "medium";
  if (!["low", "medium", "high"].includes(level as string)) throw new Error("Choose Low, Medium or High compression.");
  return level as "low" | "medium" | "high";
}

export async function systemTool(binary: string, args: string[], timeout = 120_000, env?: NodeJS.ProcessEnv) {
  try {
    return await exec(binary, args, { timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true, env });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new Error(`${binary} is unavailable on this server. The required document engine must be installed.`);
    if ((error as { killed?: boolean }).killed) throw new Error("Processing timed out. Try a smaller file or fewer pages.");
    throw new Error("The document engine could not process this file. Check that the file is valid and not password-protected.");
  }
}

export async function withToolTemp<T>(work: (directory: string) => Promise<T>) {
  const directory = await mkdtemp(path.join(tmpdir(), "pdfgenius-tool-"));
  try { return await work(directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

export async function compressDocumentPdf(bytes: Buffer, options: Record<string, unknown> = {}) {
  const source = await loadEditablePdf(bytes);
  const preset = { low: "/printer", medium: "/ebook", high: "/screen" }[compressionLevel(options)];
  return withToolTemp(async directory => {
    const input = path.join(directory, "input.pdf"), output = path.join(directory, "output.pdf");
    await writeFile(input, bytes);
    await systemTool("gs", ["-q", "-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.7", `-dPDFSETTINGS=${preset}`, "-dDetectDuplicateImages=true",
      "-dCompressFonts=true", `-sOutputFile=${output}`, input]);
    const result = await readFile(output);
    const checked = await loadEditablePdf(result);
    if (checked.getPageCount() !== source.getPageCount()) throw new Error("Compression changed the page count. The output was not accepted.");
    // Already-optimized PDFs need not become bigger just to appear processed.
    return { success: true, convertedBuffer: result.length < bytes.length ? result : bytes, mimeType: "application/pdf" };
  });
}

export async function officeDocumentPdf(bytes: Buffer, kind: "word" | "excel" | "powerpoint") {
  const zip = bytes.subarray(0, 2).toString() === "PK";
  const extension = { word: zip ? "docx" : "doc", excel: zip ? "xlsx" : "xls", powerpoint: zip ? "pptx" : "ppt" }[kind];
  return withToolTemp(async directory => {
    const input = path.join(directory, `input.${extension}`), profile = path.join(directory, "profile");
    await mkdir(path.join(profile, "user"), { recursive: true });
    // Isolate concurrent conversions, disable macros and automatic link updates.
    await writeFile(path.join(profile, "user/registrymodifications.xcu"), `<?xml version="1.0"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item><item oor:path="/org.openoffice.Office.Common/Load"><prop oor:name="UpdateDocMode" oor:op="fuse"><value>0</value></prop></item></oor:items>`);
    await writeFile(input, bytes);
    // Make the bundled OFL Bengali font available to Office, including in headless builds.
    const fontDir = ["src/education/assets", "dist/education/assets", "artifacts/api-server/src/education/assets",
      "artifacts/api-server/dist/education/assets"].map(p => path.resolve(p))
      .find(p => existsSync(path.join(p, "NotoSansBengali.ttf")));
    const fontConfig = path.join(directory, "fonts.conf");
    const escapeXml = (value: string) => value.replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
    if (fontDir) await writeFile(fontConfig, `<?xml version="1.0"?><fontconfig><include ignore_missing="yes">${escapeXml(process.env.FONTCONFIG_FILE || "/etc/fonts/fonts.conf")}</include><dir>${escapeXml(fontDir)}</dir><cachedir>${escapeXml(path.join(directory, "font-cache"))}</cachedir></fontconfig>`);
    await systemTool("libreoffice", [`-env:UserInstallation=${pathToFileURL(profile).href}`,
      "--headless", "--norestore", "--nodefault", "--nofirststartwizard", "--convert-to", "pdf", "--outdir", directory, input],
      120_000, fontDir ? { ...process.env, FONTCONFIG_FILE: fontConfig } : undefined);
    let result: Buffer;
    try { result = await readFile(path.join(directory, "input.pdf")); }
    catch { throw new Error("The office document could not be opened. Check that it is a valid, unencrypted document."); }
    await loadEditablePdf(result);
    return { success: true, convertedBuffer: result, mimeType: "application/pdf" };
  });
}

let ocrQueue = Promise.resolve();
export async function searchableOcrPdf(bytes: Buffer, options: Record<string, unknown> = {}) {
  const language = options.language ?? "eng";
  if (!["eng", "ben", "eng+ben"].includes(language as string)) throw new Error("Choose English, Bangla or English + Bangla OCR.");
  const source = await loadEditablePdf(bytes);
  if (source.getPageCount() > 100) throw new Error("OCR supports up to 100 pages per file. Split larger PDFs first.");
  const previous = ocrQueue;
  let release!: () => void;
  ocrQueue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    return await withToolTemp(async directory => {
      const output = await PDFDocument.create(), pages: string[] = [];
      for (let index = 0; index < source.getPageCount(); index++) {
        const page = source.getPage(index);
        if (page.getWidth() * page.getHeight() * (300 / 72) ** 2 > 40_000_000)
          throw new Error("A page exceeds the OCR rendering limit. Reduce the page dimensions first.");
        const shot = await parser.getScreenshot({ scale: 300 / 72, partial: [index + 1], imageDataUrl: false });
        if (!shot.pages[0]?.data) throw new Error(`Page ${index + 1} could not be rendered.`);
        const image = path.join(directory, `page-${index}.png`), prefix = path.join(directory, `ocr-${index}`);
        await writeFile(image, Buffer.from(shot.pages[0].data));
        await systemTool("tesseract", [image, prefix, "-l", language as string, "--dpi", "300", "pdf", "txt"]);
        const recognised = await PDFDocument.load(await readFile(prefix + ".pdf"));
        for (const converted of await output.copyPages(recognised, recognised.getPageIndices())) output.addPage(converted);
        pages.push((await readFile(prefix + ".txt", "utf8")).trim());
        await rm(image, { force: true });
        await rm(prefix + ".pdf", { force: true });
        await rm(prefix + ".txt", { force: true });
      }
      output.setTitle(source.getTitle() || "Searchable PDF");
      output.setProducer("PDF Genius OCR");
      return { success: true, convertedBuffer: Buffer.from(await output.save()), mimeType: "application/pdf", pages };
    });
  } finally {
    try { await parser.destroy(); } catch { /* best-effort cleanup */ }
    release();
  }
}
