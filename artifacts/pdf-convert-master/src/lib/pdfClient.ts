import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// PDF.js needs a worker. With Vite we resolve its URL at build time. Setting it
// here (a module imported by every PDF tool) guarantees it is configured once.
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export { pdfjs };

export interface RenderedPage {
  pageIndex: number; // 0-based
  width: number; // PDF user-space points (origin top-left in our UI)
  height: number; // PDF user-space points
  dataUrl: string; // rasterised PNG preview
  rotation?: number; // page's native /Rotate in degrees (0/90/180/270)
}

export const PDF_RENDER_SCALE = 1.5; // crispness of on-screen rasters

export async function readFileBytes(f: File): Promise<Uint8Array> {
  return new Uint8Array(await f.arrayBuffer());
}

export function isPdfFile(f: File): boolean {
  return f.type === "application/pdf" || /\.pdf$/i.test(f.name);
}

export function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

/**
 * Open a PDF with pdf.js. pdf.js detaches/transfers the buffer it is given, so
 * we always hand it a copy (`bytes.slice()`) and let callers keep their own.
 */
export async function loadPdfDocument(bytes: Uint8Array) {
  return pdfjs.getDocument({ data: bytes.slice() }).promise;
}

/**
 * Rasterise every page to a PNG data URL for on-screen preview/thumbnails.
 * `onProgress(done, total)` fires after each page so callers can show progress.
 */
export async function renderPdfPages(
  bytes: Uint8Array,
  scale = PDF_RENDER_SCALE,
  onProgress?: (done: number, total: number) => void,
  opts?: { forceUnrotated?: boolean },
): Promise<RenderedPage[]> {
  const doc = await loadPdfDocument(bytes);
  const pages: RenderedPage[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      // pdf.js applies the page's /Rotate by default. Callers that draw back
      // into the PDF's *unrotated* user space (e.g. the editor) can pass
      // `forceUnrotated` so the on-screen geometry matches export coordinates.
      const native = ((((page.rotate ?? 0) % 360) + 360) % 360);
      const rotation = opts?.forceUnrotated ? 0 : native;
      const viewport = page.getViewport({ scale, rotation });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const base = page.getViewport({ scale: 1, rotation });
      pages.push({
        pageIndex: i - 1,
        width: base.width,
        height: base.height,
        dataUrl: canvas.toDataURL("image/png"),
        rotation: native,
      });
      page.cleanup();
      onProgress?.(i, doc.numPages);
    }
  } finally {
    await doc.loadingTask.destroy();
  }
  return pages;
}

export function downloadBytes(data: BlobPart | Uint8Array, filename: string, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  downloadBytes(bytes, filename, "application/pdf");
}

export function downloadText(text: string, filename: string) {
  downloadBytes(text, filename, "text/plain;charset=utf-8");
}

export function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(f);
  });
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

export const hexToRgb01 = (hex: string) => {
  const v = hex.replace("#", "");
  return {
    r: parseInt(v.slice(0, 2), 16) / 255,
    g: parseInt(v.slice(2, 4), 16) / 255,
    b: parseInt(v.slice(4, 6), 16) / 255,
  };
};
