import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { 
  fileConversionRequestSchema,
  ToolType,
  ToolCategory
} from "@workspace/db";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { promisify } from "util";
import sharp from "sharp";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { register, signin, verifySignupOtp, getCurrentUser, authenticateUser, updateProfile, changePassword, forgotPassword, resetPassword, googleAuth, googleConfig, googleMobileStart, googleMobileCallback } from "./auth";
import { notifyUser, ensureWelcomeNotification } from "./notify";
import { registerAdminRoutes } from "./adminRoutes";
import { saveAvatar, getAvatar, deleteAvatar } from "./lib/avatarStorage";
import { authenticateApiKey } from "./middlewares/apiKeyMiddleware";
import { optionalConversionAuth, ConversionAuthRequest } from "./middlewares/requireConversionAuth";
import { generateApiKey, hashApiKey } from "./utils/generateApiKey";
import { saveConvertedFile, getConvertedFile, deleteConvertedFile, saveOcrText, getOcrText } from "./lib/conversionStorage";
import { PLANS, getPlan } from "./plans";
import { syncRevenueCatCustomer } from "./revenuecat";
import {
  createCheckoutForPlan,
  createCreditCheckout,
  createPortalSession,
  verifyWebhook,
  handleWebhookEvent,
  isBillingConfigured,
  isCreditsConfigured,
  getProductIdForPlan,
  CREDITS_PER_USD,
  MIN_CREDITS_USD,
  MAX_CREDITS_USD,
} from "./dodo";
import mammoth from "mammoth";
import * as xlsx from "xlsx";
import { execSync, spawn } from "child_process";
import puppeteer from "puppeteer";
import { PDFParse } from "pdf-parse";
import { Document, Packer, Paragraph, TextRun, PageBreak } from "docx";
import pptxgen from "pptxgenjs";
import JSZip from "jszip";
import * as Tesseract from "tesseract.js";
import os from "os";
import { encrypt as qpdfEncrypt, decrypt as qpdfDecrypt } from "node-qpdf2";

// pptxgenjs is published as CommonJS; depending on the bundler/runtime the
// default import can resolve to either the class or a namespace wrapper.
// Normalize to the actual constructor so `new` always works.
const PptxGenCtor: any = (pptxgen as any)?.default ?? pptxgen;

// MIME type mapping for proper file downloads
const MIME_TYPES: { [key: string]: string } = {
  'pdf': 'application/pdf',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'doc': 'application/msword',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'xls': 'application/vnd.ms-excel', 
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'ppt': 'application/vnd.ms-powerpoint',
  'html': 'text/html',
  'htm': 'text/html',
  'txt': 'text/plain',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg', 
  'png': 'image/png',
  'gif': 'image/gif',
  'bmp': 'image/bmp',
  'webp': 'image/webp',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',
  'mp4': 'video/mp4',
  'avif': 'image/avif',
  'zip': 'application/zip'
};

// Get proper MIME type for file extension
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return MIME_TYPES[ext || ''] || 'application/octet-stream';
}

// Build a safe Content-Disposition header value from a user-influenced
// filename. Raw interpolation crashes Node's setHeader (ERR_INVALID_CHAR)
// when the name contains non-ASCII/control characters (accents, emoji, …).
// We send an ASCII-only fallback in `filename` plus the original name RFC
// 5987-encoded in `filename*` so browsers save with the real name.
function contentDisposition(type: 'attachment' | 'inline', filename: string): string {
  const name = String(filename || '');
  // ASCII fallback: strip control chars, replace non-ASCII, escape quote/backslash.
  let fallback = name
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
    .trim();
  if (!fallback || /^_+(\.[A-Za-z0-9]+)?$/.test(fallback)) {
    const ext = /\.([A-Za-z0-9]{1,10})$/.exec(fallback || name.replace(/[^\x20-\x7e]/g, ''))?.[1];
    fallback = ext ? `download.${ext}` : (fallback || 'download');
  }
  // Only add filename* when the original differs from the fallback.
  if (fallback === name || !name) {
    return `${type}; filename="${fallback}"`;
  }
  // RFC 5987 ext-value: percent-encode everything outside attr-char.
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

// Resolve the Chromium binary for Puppeteer. The Nix store path changes across
// rebuilds, so resolve it at runtime via `which` (cached) instead of hardcoding.
let cachedChromiumPath: string | null | undefined;
async function getChromiumPath(): Promise<string | undefined> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (cachedChromiumPath !== undefined) return cachedChromiumPath ?? undefined;
  try {
    const resolved = execSync('which chromium || which chromium-browser', { encoding: 'utf8' }).trim();
    cachedChromiumPath = resolved || null;
  } catch {
    cachedChromiumPath = null;
  }
  if (!cachedChromiumPath) {
    // No system Chromium (e.g. the Railway image). Fall back to the Chrome
    // that Puppeteer downloads into the repo-local cache (.puppeteerrc.cjs);
    // build.mjs guarantees it is installed when no system browser exists.
    try {
      // executablePath() is async in this Puppeteer version (config loading).
      const bundled = await puppeteer.executablePath();
      if (bundled && fsSync.existsSync(bundled)) cachedChromiumPath = bundled;
    } catch {
      // leave null — puppeteer.launch will surface a clear error
    }
  }
  return cachedChromiumPath ?? undefined;
}

// Limit concurrent Chromium instances so many simultaneous conversions can't
// exhaust memory/CPU. Callers await a slot before launching a browser.
const MAX_CHROMIUM = 2;
let chromiumActive = 0;
const chromiumWaiters: Array<() => void> = [];
async function acquireChromiumSlot(): Promise<() => void> {
  while (chromiumActive >= MAX_CHROMIUM) {
    await new Promise<void>((resolve) => chromiumWaiters.push(resolve));
  }
  chromiumActive++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    chromiumActive--;
    const next = chromiumWaiters.shift();
    if (next) next();
  };
}

// Limit concurrent PDF page rasterisations. getScreenshot spins up pdf.js +
// canvas per call, which is CPU/memory heavy; without a cap, a burst of mobile
// render requests could exhaust the box. Mirrors acquireChromiumSlot.
const MAX_RENDER = 2;
let renderActive = 0;
const renderWaiters: Array<() => void> = [];
async function acquireRenderSlot(): Promise<() => void> {
  while (renderActive >= MAX_RENDER) {
    await new Promise<void>((resolve) => renderWaiters.push(resolve));
  }
  renderActive++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    renderActive--;
    const next = renderWaiters.shift();
    if (next) next();
  };
}

// Render HTML into a real, faithful PDF using headless Chromium.
// Security: the HTML can be user-supplied (or derived from user uploads), so we
// run it locked down — JavaScript disabled and ALL network/file fetches blocked
// except inline data: URIs. This prevents SSRF (e.g. cloud metadata endpoints)
// and stops external resources from hanging the render. We also cap render time.
async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const release = await acquireChromiumSlot();
  let browser: import("puppeteer").Browser | undefined;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: await getChromiumPath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.startsWith('data:') || url.startsWith('about:') || url.startsWith('blob:')) {
        req.continue();
      } else {
        // Block http(s)/file/ftp/etc. to prevent SSRF and external fetches.
        req.abort();
      }
    });
    await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      timeout: 20000,
    });
    return Buffer.from(pdfBytes);
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore close errors */ }
    }
    release();
  }
}

// Extract per-page text from a PDF using pdf-parse (pdf.js under the hood).
async function extractPdfPages(pdfBuffer: Buffer): Promise<string[]> {
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  try {
    const result = await parser.getText();
    return result.pages.map((p) => p.text || '');
  } finally {
    // Cleanup must never mask a conversion error.
    try { await parser.destroy(); } catch { /* ignore cleanup errors */ }
  }
}

// Escape text so it can be safely embedded inside generated HTML.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max file size
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

// Dedicated upload config for PDF merge. Caps each file at 100MB (matching the
// tool's advertised limit) so oversized uploads are rejected during streaming
// instead of being buffered first, caps the batch at 20 files, and rejects any
// non-PDF extension up front.
const mergeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 20,
  },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error(`"${file.originalname}" is not a PDF file.`));
    }
  },
});

// Dedicated upload config for the mobile native page rasteriser. PDF-only and
// capped well below the generic uploader so a single-page render request can't
// be used to push huge payloads.
const pdfRenderUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (
      path.extname(file.originalname).toLowerCase() === ".pdf" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error(`"${file.originalname}" is not a PDF file.`));
    }
  },
});

// Dedicated, hardened upload config for the in-browser image editors. Much
// smaller size cap and image-only mimetypes to limit memory/DoS exposure.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    // Reject non-images by skipping the file (cb(null, false)) rather than
    // throwing, so the route handler returns a clean 400 instead of a 500.
    cb(null, file.mimetype.startsWith("image/"));
  },
});

// Raster formats we accept for the upload target. SVG is deliberately excluded
// (it can carry scripts) so the saved files can never host active content.
const SAFE_IMAGE_FORMATS: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
};

// Aggregate caps so the in-memory upload store can't grow unbounded.
const UPLOAD_MAX_ENTRIES = 200;
const UPLOAD_MAX_TOTAL_BYTES = 500 * 1024 * 1024; // 500MB across all uploads

// Minimal fixed-window per-IP rate limit for the public upload endpoint.
const uploadRateWindow = new Map<string, { count: number; resetAt: number }>();
function uploadRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 30;
  const entry = uploadRateWindow.get(ip);
  if (!entry || entry.resetAt < now) {
    uploadRateWindow.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

// Per-IP rate limit for the mobile page rasteriser. More generous than the
// image-upload limit because legitimately paging through a multi-page document
// fires one render per page/width bucket, but still bounds abuse.
const renderRateWindow = new Map<string, { count: number; resetAt: number }>();
function renderRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 120;
  const entry = renderRateWindow.get(ip);
  if (!entry || entry.resetAt < now) {
    renderRateWindow.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

// Per-IP rate limit for authentication endpoints (login, register, forgot/reset
// password). Brute-force / credential-stuffing / email-flooding protection.
// Fixed-window, mirrors the upload/render limiters above.
const authRateWindow = new Map<string, { count: number; resetAt: number }>();
function authRateLimit(maxPerMinute: number) {
  return (req: Request, res: any, next: any) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const windowMs = 60 * 1000;
    const entry = authRateWindow.get(key);
    if (!entry || entry.resetAt < now) {
      authRateWindow.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxPerMinute) {
      return res.status(429).json({
        success: false,
        error: "Too many attempts. Please wait a minute and try again.",
      });
    }
    return next();
  };
}

function sanitizeUploadName(name: string, ext: string): string {
  const base = name.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "");
  const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image";
  return `${safeBase}.${ext}`;
}

// Optimized conversion simulation with realistic progress updates
async function simulateConversionWithProgress(jobId: number, totalTime: number, fileSizeMB: number) {
  const steps = 8; // Break into 8 progress steps
  const stepTime = totalTime / steps;
  
  for (let i = 1; i <= steps; i++) {
    // Add slight randomness to make it feel more realistic
    const delay = stepTime + (Math.random() * 200 - 100);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Progress is updated automatically by the polling mechanism
    // Each step represents ~12.5% progress (100% / 8 steps)
  }
}

// Public API tools that are documented in the API reference but currently have
// no live endpoint. Requests to /api/v1/<tool> for these return 503 "offline".
// Keep in sync with OFFLINE_TOOL_TYPES in the web APIReference page.
const OFFLINE_API_TOOLS = new Set<string>(["restore_document", "edit_pdf"]);

// Actual file conversion function
async function performActualConversion(
  fileBuffer: Buffer, 
  inputFilename: string, 
  toolType: string, 
  outputFilename: string,
  options: Record<string, any> = {}
): Promise<{ success: boolean; convertedBuffer?: Buffer; mimeType?: string; error?: string; pages?: string[] }> {
  try {
    // Safety check for outputFilename
    if (!outputFilename || outputFilename === 'null' || outputFilename === 'undefined') {
      return { success: false, error: 'Invalid output filename' };
    }
    
    const inputExtension = inputFilename.split('.').pop()?.toLowerCase();
    const outputExtension = outputFilename.split('.').pop()?.toLowerCase();
    
    console.log(`Converting ${inputFilename} (${toolType}) from ${inputExtension} to ${outputExtension}`);
    
    switch (toolType) {
      case 'pdf_to_word':
        return await convertPdfToWord(fileBuffer, outputFilename);
        
      case 'pdf_to_images':
        return await convertPdfToImages(fileBuffer, outputFilename);
        
      case 'images_to_pdf':
        return await convertImageToPdf(fileBuffer, inputExtension, outputFilename);
        
      case 'compress_pdf':
        return await compressPdf(fileBuffer, outputFilename);
        
      case 'rotate_pdf':
        return await rotatePdf(fileBuffer, outputFilename);
        
      case 'word_to_pdf':
        return await convertWordToPdf(fileBuffer, outputFilename);
        
      case 'excel_to_pdf':
        return await convertExcelToPdf(fileBuffer, outputFilename);
        
      case 'compress_image':
        return await compressImage(fileBuffer, inputExtension, outputFilename, options);
        
      case 'compress_video':
        return await compressVideo(fileBuffer, inputExtension, outputFilename, options);
        
      case 'resize_image':
        return await resizeImage(fileBuffer, inputExtension, outputFilename, options);
        
      case 'rotate_image':
        return await rotateImage(fileBuffer, inputExtension, outputFilename, options);
        
      case 'convert_image_format':
        return await convertImageFormat(fileBuffer, inputExtension, outputExtension, outputFilename);
        
      case 'crop_image':
        return await cropImage(fileBuffer, inputExtension, outputFilename, options);
        
      case 'merge_pdfs':
        return await mergePdfs([fileBuffer], outputFilename);
        
      case 'split_pdf':
        return await splitPdf(fileBuffer, outputFilename);
        
      case 'pdf_to_excel':
        return await convertPdfToExcel(fileBuffer, outputFilename);
        
      case 'pdf_to_powerpoint':
        return await convertPdfToPowerPoint(fileBuffer, outputFilename);
        
      case 'powerpoint_to_pdf':
        return await convertPowerPointToPdf(fileBuffer, outputFilename);
        
      case 'html_to_pdf':
        return await convertHtmlToPdf(fileBuffer, outputFilename);
        
      case 'upscale_image':
        return await upscaleImage(fileBuffer, inputExtension, outputFilename, options);
        
      case 'remove_background':
        return await removeBackground(fileBuffer, inputExtension, outputFilename);

      case 'ocr_pdf':
        return await ocrPdf(fileBuffer, outputFilename);

      case 'restore_document':
        return await restoreDocument(fileBuffer, inputExtension, outputFilename);

      case 'lock_pdf':
        return await lockPdf(fileBuffer, outputFilename, options);

      case 'unlock_pdf':
        return await unlockPdf(fileBuffer, outputFilename, options);

      default:
        return { success: false, error: `Unsupported conversion type: ${toolType}` };
    }
  } catch (error) {
    console.error(`Conversion error for ${toolType}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown conversion error' 
    };
  }
}

// Turn a qpdf/node-qpdf2 failure into a friendly, non-crashing message.
// node-qpdf2 rejects with the stderr *string* on a non-zero exit, and with an
// Error (e.g. ENOENT) when the `qpdf` binary itself can't be spawned.
function describeQpdfError(error: unknown, mode: 'lock' | 'unlock'): string {
  const raw = typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : String(error);
  const lower = raw.toLowerCase();

  // The qpdf system binary is missing or not runnable.
  if (
    lower.includes('enoent') ||
    lower.includes('spawn qpdf') ||
    lower.includes('command not found') ||
    lower.includes('not recognized')
  ) {
    return 'PDF encryption engine unavailable. Please try again later.';
  }

  // Wrong / missing password (qpdf prints "invalid password").
  if (lower.includes('invalid password') || lower.includes('incorrect password') || lower.includes('password')) {
    return mode === 'unlock'
      ? 'The password you entered is incorrect, or this PDF is not password-protected.'
      : 'Could not lock this PDF. Please check the password and try again.';
  }

  return mode === 'unlock'
    ? 'Could not unlock this PDF. It may be corrupted or use unsupported encryption.'
    : 'Could not lock this PDF. It may be corrupted or already encrypted.';
}

// Lock PDF: password-protect a PDF with AES-256 encryption via qpdf.
// We round-trip through temp files because node-qpdf2's returned Buffer is built
// from `stdout.join("")` (string-joined), which corrupts binary PDF data — the
// only safe output is qpdf's own `output` file, which we then read back.
async function lockPdf(
  fileBuffer: Buffer,
  outputFilename: string,
  options: Record<string, any> = {}
): Promise<{ success: boolean; convertedBuffer?: Buffer; mimeType?: string; error?: string }> {
  const password = typeof options?.password === 'string' ? options.password.trim() : '';
  if (!password) {
    return { success: false, error: 'Please enter a password to lock this PDF.' };
  }

  const inputPath = path.join(os.tmpdir(), `lock-in-${randomUUID()}.pdf`);
  const outputPath = path.join(os.tmpdir(), `lock-out-${randomUUID()}.pdf`);
  try {
    await fs.writeFile(inputPath, fileBuffer);
    await qpdfEncrypt({
      input: inputPath,
      output: outputPath,
      password,
      keyLength: 256,
    });
    const convertedBuffer = await fs.readFile(outputPath);
    return { success: true, convertedBuffer, mimeType: 'application/pdf' };
  } catch (error) {
    console.error('Lock PDF error:', error);
    return { success: false, error: describeQpdfError(error, 'lock') };
  } finally {
    await fs.rm(inputPath, { force: true }).catch(() => {});
    await fs.rm(outputPath, { force: true }).catch(() => {});
  }
}

// Unlock PDF: remove password protection via qpdf --decrypt. Requires the
// current open password; a wrong password fails cleanly (no crash).
async function unlockPdf(
  fileBuffer: Buffer,
  outputFilename: string,
  options: Record<string, any> = {}
): Promise<{ success: boolean; convertedBuffer?: Buffer; mimeType?: string; error?: string }> {
  const password = typeof options?.password === 'string' ? options.password.trim() : '';
  if (!password) {
    return { success: false, error: "Please enter the PDF's current password to unlock it." };
  }

  const inputPath = path.join(os.tmpdir(), `unlock-in-${randomUUID()}.pdf`);
  const outputPath = path.join(os.tmpdir(), `unlock-out-${randomUUID()}.pdf`);
  try {
    await fs.writeFile(inputPath, fileBuffer);
    await qpdfDecrypt({
      input: inputPath,
      output: outputPath,
      password,
    });
    const convertedBuffer = await fs.readFile(outputPath);
    return { success: true, convertedBuffer, mimeType: 'application/pdf' };
  } catch (error) {
    console.error('Unlock PDF error:', error);
    return { success: false, error: describeQpdfError(error, 'unlock') };
  } finally {
    await fs.rm(inputPath, { force: true }).catch(() => {});
    await fs.rm(outputPath, { force: true }).catch(() => {});
  }
}

// Document Restore: deterministically clean a damaged scan/photo (or every page
// of a PDF) — EXIF auto-orient, auto-contrast (de-fade), gentle denoise + sharpen
// — and assemble the cleaned page(s) into a fresh PDF. Faithful by design: it
// only enhances what is already there and never fabricates torn/missing content.
async function restoreImageToJpeg(imageBuffer: Buffer): Promise<Buffer> {
  return await sharp(imageBuffer, { failOn: "none" })
    .rotate() // auto-orient from EXIF (fixes sideways phone photos)
    .flatten({ background: "#ffffff" }) // drop transparency onto white paper
    .normalise() // auto levels — recover faded / low-light documents
    .median(1) // light denoise without smearing text
    .sharpen({ sigma: 1 }) // gentle unsharp to recover legibility
    .modulate({ brightness: 1.04, saturation: 1.05 })
    .gamma(1.1)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

async function addRestoredPage(pdfDoc: PDFDocument, jpegBuffer: Buffer): Promise<void> {
  const embedded = await pdfDoc.embedJpg(jpegBuffer);
  // Cap page size so very large photos don't yield an oversized PDF page.
  const MAX_DIM = 2000;
  const scale = Math.min(1, MAX_DIM / Math.max(embedded.width, embedded.height));
  const pageWidth = embedded.width * scale;
  const pageHeight = embedded.height * scale;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(embedded, { x: 0, y: 0, width: pageWidth, height: pageHeight });
}

async function restoreDocument(
  fileBuffer: Buffer,
  inputExt: string | undefined,
  outputFilename: string,
) {
  try {
    const ext = (inputExt || "").toLowerCase();
    const pdfDoc = await PDFDocument.create();

    if (ext === "pdf") {
      // Rasterize every page, restore each, reassemble into a clean PDF.
      const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
      try {
        const result = await parser.getScreenshot({
          desiredWidth: 1654, // ~A4 width @ 200dpi
          imageDataUrl: true,
          imageBuffer: false,
        });
        const pages = [...result.pages].sort(
          (a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0),
        );
        for (const pg of pages) {
          if (!pg?.dataUrl) continue;
          const base64 = pg.dataUrl.split(",")[1] ?? "";
          if (!base64) continue;
          const pageBuffer = Buffer.from(base64, "base64");
          const restored = await restoreImageToJpeg(pageBuffer);
          await addRestoredPage(pdfDoc, restored);
        }
      } finally {
        try { await parser.destroy(); } catch { /* ignore cleanup errors */ }
      }
    } else {
      // Single image input (photo or scan).
      const restored = await restoreImageToJpeg(fileBuffer);
      await addRestoredPage(pdfDoc, restored);
    }

    if (pdfDoc.getPageCount() === 0) {
      throw new Error("Document could not be restored (no readable pages found).");
    }

    const pdfBytes = await pdfDoc.save();
    return {
      success: true,
      convertedBuffer: Buffer.from(pdfBytes),
      mimeType: "application/pdf",
    };
  } catch (error) {
    throw new Error(
      `Document restore failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// PDF to Word: extract real text per page and build a genuine .docx file.
async function convertPdfToWord(pdfBuffer: Buffer, outputFilename: string) {
  try {
    const pages = await extractPdfPages(pdfBuffer);
    const hasText = pages.some((p) => p.trim().length > 0);

    const children: Paragraph[] = [];
    if (!hasText) {
      children.push(new Paragraph({ children: [new TextRun('No extractable text was found in this PDF (it may be a scanned image).')] }));
    } else {
      pages.forEach((pageText, idx) => {
        if (idx > 0) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }
        const lines = pageText.split(/\r?\n/);
        for (const line of lines) {
          children.push(new Paragraph({ children: [new TextRun(line)] }));
        }
      });
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    return {
      success: true,
      convertedBuffer: buffer,
      mimeType: getMimeType(outputFilename)
    };
  } catch (error) {
    throw new Error(`PDF to Word conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Image processing using Sharp
async function compressImage(imageBuffer: Buffer, inputExt: string | undefined, outputFilename: string, options: Record<string, any> = {}) {
  try {
    // User-selectable quality (10-100). Lower quality = smaller file = more
    // compression. Defaults to 80 when not provided. Clamped so a bad request
    // can't pass an out-of-range value to Sharp.
    const quality = Math.min(100, Math.max(10, Math.round(Number(options.quality)) || 80));

    let processedBuffer: Buffer;
    let mimeType: string;

    if (inputExt === 'jpg' || inputExt === 'jpeg') {
      processedBuffer = await sharp(imageBuffer)
        .jpeg({ quality, progressive: true })
        .toBuffer();
      mimeType = 'image/jpeg';
    } else if (inputExt === 'png') {
      // PNG is lossless, so quality maps to the palette size (number of colors).
      // Fewer colors = smaller file = more compression.
      const colors = Math.min(256, Math.max(2, Math.round((quality / 100) * 256)));
      processedBuffer = await sharp(imageBuffer)
        .png({ quality, colors, compressionLevel: 9, palette: true })
        .toBuffer();
      mimeType = 'image/png';
    } else if (inputExt === 'webp') {
      processedBuffer = await sharp(imageBuffer)
        .webp({ quality })
        .toBuffer();
      mimeType = 'image/webp';
    } else {
      // Fallback for any other format: compress as JPEG.
      processedBuffer = await sharp(imageBuffer)
        .jpeg({ quality })
        .toBuffer();
      mimeType = 'image/jpeg';
    }

    const compressionRatio = ((imageBuffer.length - processedBuffer.length) / imageBuffer.length * 100).toFixed(1);
    console.log(`Image compressed: ${compressionRatio}% size reduction (quality ${quality})`);

    return {
      success: true,
      convertedBuffer: processedBuffer,
      mimeType
    };
  } catch (error) {
    throw new Error(`Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Compress an MP4 video with ffmpeg (system binary). We round-trip through temp
// files because ffmpeg streams to/from disk rather than in-memory buffers.
// Target output size, as a fraction of the original, for each compression level
// the user picks in the "Compress Video" popup. These ratios drive BOTH the
// estimate shown to the user (client-side) and the actual encode target here,
// so the produced file lands close to the estimated size.
const VIDEO_LEVEL_RATIOS: Record<string, number> = {
  high: 0.11, // Smallest size, standard quality
  medium: 0.226, // Medium size, better quality
  low: 0.342, // Larger size, highest quality
};
const AUDIO_BITRATE_KBPS = 128;

// Resolve the ffmpeg/ffprobe binaries. Production (Railway) images don't ship
// these system-wide, so we bundle static builds via npm and use their absolute
// paths; env overrides win, then the static packages, then a bare PATH lookup.
const FFMPEG_BIN =
  process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string) || "ffmpeg";
const FFPROBE_BIN =
  process.env.FFPROBE_PATH || ffprobeStatic?.path || "ffprobe";

// Run ffmpeg with the given args, rejecting with trailing stderr on failure.
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, args);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    proc.on("error", (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err instanceof Error ? err.message : String(err)}`));
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });
}

// Probe a media file's duration in seconds via ffprobe. Returns 0 when unknown.
function probeDurationSeconds(filePath: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const proc = spawn(FFPROBE_BIN, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let out = "";
    proc.stdout.on("data", (d) => { out += d.toString(); });
    proc.on("error", () => resolve(0));
    proc.on("close", () => {
      const secs = parseFloat(out.trim());
      resolve(Number.isFinite(secs) && secs > 0 ? secs : 0);
    });
  });
}

// Returns the video's average frame rate as an ffmpeg fraction string
// (e.g. "30000/1001"), or "" if it can't be determined or looks bogus.
// Used to force CFR output so variable-frame-rate inputs (screen/phone
// recordings) don't re-encode to a stretched duration.
function probeAvgFrameRate(filePath: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const proc = spawn(FFPROBE_BIN, [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=avg_frame_rate",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let out = "";
    proc.stdout.on("data", (d) => { out += d.toString(); });
    proc.on("error", () => resolve(""));
    proc.on("close", () => {
      const raw = out.trim();
      const m = raw.match(/^(\d+)\/(\d+)$/);
      if (!m) { resolve(""); return; }
      const num = Number(m[1]);
      const den = Number(m[2]);
      if (!num || !den) { resolve(""); return; }
      const fps = num / den;
      // Only trust sane playback rates; ignore missing/extreme values.
      resolve(fps >= 1 && fps <= 120 ? raw : "");
    });
  });
}

async function compressVideo(
  videoBuffer: Buffer,
  inputExt: string | undefined,
  outputFilename: string,
  options: Record<string, any> = {},
) {
  const inExt = (inputExt && /^[a-z0-9]+$/i.test(inputExt)) ? inputExt.toLowerCase() : "mp4";
  const uid = randomUUID();
  const inputPath = path.join(os.tmpdir(), `vid-in-${uid}.${inExt}`);
  const outputPath = path.join(os.tmpdir(), `vid-out-${uid}.mp4`);
  // ffmpeg two-pass writes "<passlog>-0.log" and "<passlog>-0.log.mbtree".
  const passLog = path.join(os.tmpdir(), `vid-pass-${uid}`);

  // A level (high/medium/low) targets a specific output size; the legacy
  // quality option keeps working for API callers via a CRF encode.
  const level = typeof options.level === "string" ? options.level.toLowerCase() : "";
  const ratio = VIDEO_LEVEL_RATIOS[level];

  try {
    await fs.writeFile(inputPath, videoBuffer);

    // Force constant-frame-rate output at the source's true average rate so
    // variable-frame-rate inputs (screen/phone recordings) keep their real
    // duration instead of coming out stretched (e.g. a 5-min clip re-encoded
    // to 15 min).
    const avgFps = await probeAvgFrameRate(inputPath);
    const fpsArgs = avgFps ? ["-fps_mode", "cfr", "-r", avgFps] : [];

    let mode = "";
    if (ratio) {
      const duration = await probeDurationSeconds(inputPath);
      if (duration > 0) {
        // Total bitrate (kbps) the target size allows over this duration.
        const targetTotalBytes = videoBuffer.length * ratio;
        const totalKbps = (targetTotalBytes * 8) / duration / 1000;
        // Give audio a bounded share so it never eats the whole budget on
        // small targets, but still uses full quality (128k) when there's room.
        const audioKbps = Math.min(
          AUDIO_BITRATE_KBPS,
          Math.max(48, Math.round(totalKbps * 0.2)),
        );
        // Floor the video bitrate so tiny targets still yield a playable file.
        const videoBitrateKbps = Math.max(64, Math.round(totalKbps - audioKbps));

        // Single-pass ABR, capped by maxrate/bufsize, hits the target size well
        // while encoding roughly twice as fast as a two-pass run. The extra
        // analysis pass was what made longer videos sit near-complete for a long
        // time and appear stuck.
        await runFfmpeg([
          "-y", "-i", inputPath,
          "-c:v", "libx264",
          "-b:v", `${videoBitrateKbps}k`,
          "-maxrate", `${Math.round(videoBitrateKbps * 1.5)}k`,
          "-bufsize", `${Math.round(videoBitrateKbps * 2)}k`,
          "-preset", "veryfast",
          ...fpsArgs,
          "-c:a", "aac", "-b:a", `${audioKbps}k`,
          "-movflags", "+faststart",
          outputPath,
        ]);
        mode = `level ${level} single-pass (target ~${(targetTotalBytes / (1024 * 1024)).toFixed(2)}MB, v${videoBitrateKbps}k a${audioKbps}k)`;
      }
    }

    if (!mode) {
      // Fallback: quality -> CRF single-pass (API callers / unknown level).
      const quality = Math.min(100, Math.max(10, Math.round(Number(options.quality)) || 60));
      const crf = Math.round(34 - ((quality - 10) / 90) * 14);
      await runFfmpeg([
        "-y", "-i", inputPath,
        "-c:v", "libx264",
        "-crf", String(crf),
        "-preset", "veryfast",
        ...fpsArgs,
        "-c:a", "aac", "-b:a", `${AUDIO_BITRATE_KBPS}k`,
        "-movflags", "+faststart",
        outputPath,
      ]);
      mode = `crf ${crf} (quality ${quality})`;
    }

    const processedBuffer = await fs.readFile(outputPath);
    const compressionRatio = ((videoBuffer.length - processedBuffer.length) / videoBuffer.length * 100).toFixed(1);
    console.log(`Video compressed: ${compressionRatio}% size reduction (${mode})`);

    return {
      success: true,
      convertedBuffer: processedBuffer,
      mimeType: "video/mp4",
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Unknown error";
    // ffmpeg couldn't parse the container (truncated/incomplete upload or a
    // non-video file). Surface a friendly message instead of the raw banner.
    if (/moov atom not found|invalid data found|error opening input/i.test(raw)) {
      throw new Error(
        "This video file appears to be corrupted or incomplete, so it couldn't be compressed. Please re-export the video and try uploading it again.",
      );
    }
    throw new Error(`Video compression failed: ${raw}`);
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
    await fs.unlink(`${passLog}-0.log`).catch(() => {});
    await fs.unlink(`${passLog}-0.log.mbtree`).catch(() => {});
  }
}

// Resize image using Sharp
async function resizeImage(imageBuffer: Buffer, inputExt: string | undefined, outputFilename: string, options: Record<string, any> = {}) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 800;
    const originalHeight = metadata.height || 600;

    const maintainAspect = options.maintainAspectRatio !== false;
    let targetWidth = options.width ? Math.round(Number(options.width)) : undefined;
    let targetHeight = options.height ? Math.round(Number(options.height)) : undefined;

    // Percentage scaling, when provided, overrides explicit dimensions.
    if (options.percentage && Number(options.percentage) > 0) {
      const pct = Number(options.percentage) / 100;
      targetWidth = Math.max(1, Math.round(originalWidth * pct));
      targetHeight = Math.max(1, Math.round(originalHeight * pct));
    }

    // Fall back to the original behaviour (75%) when nothing was requested.
    if (!targetWidth && !targetHeight) {
      targetWidth = Math.round(originalWidth * 0.75);
      targetHeight = Math.round(originalHeight * 0.75);
    }

    // Clamp requested dimensions to a sane range so a malicious/huge request
    // can't force Sharp to allocate enormous buffers.
    const MAX_DIMENSION = 10000;
    if (targetWidth !== undefined) {
      if (!Number.isFinite(targetWidth) || targetWidth < 1) targetWidth = 1;
      targetWidth = Math.min(targetWidth, MAX_DIMENSION);
    }
    if (targetHeight !== undefined) {
      if (!Number.isFinite(targetHeight) || targetHeight < 1) targetHeight = 1;
      targetHeight = Math.min(targetHeight, MAX_DIMENSION);
    }

    const pipeline = sharp(imageBuffer);
    if (targetWidth && targetHeight) {
      pipeline.resize(targetWidth, targetHeight, {
        fit: maintainAspect ? 'inside' : 'fill',
        withoutEnlargement: false,
      });
    } else {
      pipeline.resize(targetWidth || null, targetHeight || null, {
        withoutEnlargement: false,
      });
    }

    const resizedBuffer = await pipeline.toBuffer();
    const finalMeta = await sharp(resizedBuffer).metadata();
    console.log(`Image resized from ${originalWidth}x${originalHeight} to ${finalMeta.width}x${finalMeta.height}`);

    return {
      success: true,
      convertedBuffer: resizedBuffer,
      mimeType: getMimeType(`output.${inputExt}`)
    };
  } catch (error) {
    throw new Error(`Image resize failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Rotate image using Sharp
async function rotateImage(imageBuffer: Buffer, inputExt: string | undefined, outputFilename: string, options: Record<string, any> = {}) {
  try {
    const angle = options.angle !== undefined ? Number(options.angle) : 90;
    const flipHorizontal = options.flipHorizontal === true;
    const flipVertical = options.flipVertical === true;
    const ext = (inputExt || 'png').toLowerCase();

    // JPEG/BMP have no alpha channel, so non-orthogonal rotations need a solid
    // background; PNG/WebP/GIF can keep the exposed corners transparent.
    const supportsAlpha = ext === 'png' || ext === 'webp' || ext === 'gif';
    const background = supportsAlpha
      ? { r: 0, g: 0, b: 0, alpha: 0 }
      : { r: 255, g: 255, b: 255, alpha: 1 };

    let pipeline = sharp(imageBuffer);
    if (angle % 360 !== 0) {
      pipeline = pipeline.rotate(angle, { background });
    }
    if (flipVertical) pipeline = pipeline.flip();
    if (flipHorizontal) pipeline = pipeline.flop();

    const rotatedBuffer = await pipeline.toBuffer();
    console.log(`Image rotated ${angle}° (flipH=${flipHorizontal}, flipV=${flipVertical})`);

    return {
      success: true,
      convertedBuffer: rotatedBuffer,
      mimeType: getMimeType(`output.${inputExt}`)
    };
  } catch (error) {
    throw new Error(`Image rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Convert image format using Sharp
async function convertImageFormat(imageBuffer: Buffer, inputExt: string | undefined, outputExt: string | undefined, outputFilename: string) {
  try {
    let convertedBuffer: Buffer;
    let mimeType: string;
    
    switch (outputExt) {
      case 'jpg':
      case 'jpeg':
        convertedBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
        mimeType = 'image/jpeg';
        break;
      case 'png':
        convertedBuffer = await sharp(imageBuffer).png().toBuffer();
        mimeType = 'image/png';
        break;
      case 'webp':
        convertedBuffer = await sharp(imageBuffer).webp({ quality: 90 }).toBuffer();
        mimeType = 'image/webp';
        break;
      case 'gif':
        convertedBuffer = await sharp(imageBuffer).gif().toBuffer();
        mimeType = 'image/gif';
        break;
      case 'avif':
        convertedBuffer = await sharp(imageBuffer).avif({ quality: 80 }).toBuffer();
        mimeType = 'image/avif';
        break;
      case 'tif':
      case 'tiff':
        convertedBuffer = await sharp(imageBuffer).tiff({ quality: 90 }).toBuffer();
        mimeType = 'image/tiff';
        break;
      default:
        convertedBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
        mimeType = 'image/jpeg';
    }
    
    console.log(`Image converted from ${inputExt} to ${outputExt}`);
    
    return {
      success: true,
      convertedBuffer,
      mimeType
    };
  } catch (error) {
    throw new Error(`Image format conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Crop image using Sharp  
async function cropImage(imageBuffer: Buffer, inputExt: string | undefined, outputFilename: string, options: Record<string, any> = {}) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    let cropWidth: number;
    let cropHeight: number;
    let left: number;
    let top: number;

    const hasExplicitCrop =
      options.width !== undefined && options.height !== undefined &&
      options.x !== undefined && options.y !== undefined;

    if (hasExplicitCrop) {
      left = Math.max(0, Math.round(Number(options.x)));
      top = Math.max(0, Math.round(Number(options.y)));
      cropWidth = Math.round(Number(options.width));
      cropHeight = Math.round(Number(options.height));
      // Clamp the crop rectangle so it never extends past the image bounds.
      cropWidth = Math.min(cropWidth, width - left);
      cropHeight = Math.min(cropHeight, height - top);
    } else {
      // Default: center 75% of the image.
      cropWidth = Math.round(width * 0.75);
      cropHeight = Math.round(height * 0.75);
      left = Math.round((width - cropWidth) / 2);
      top = Math.round((height - cropHeight) / 2);
    }

    if (cropWidth <= 0 || cropHeight <= 0) {
      throw new Error('Invalid crop dimensions');
    }

    const croppedBuffer = await sharp(imageBuffer)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .toBuffer();

    console.log(`Image cropped to ${cropWidth}x${cropHeight} at (${left},${top})`);

    return {
      success: true,
      convertedBuffer: croppedBuffer,
      mimeType: getMimeType(`output.${inputExt}`)
    };
  } catch (error) {
    throw new Error(`Image crop failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// PDF to Images: rasterize each page to a real PNG and bundle them in a ZIP.
async function convertPdfToImages(pdfBuffer: Buffer, outputFilename: string) {
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  try {
    const result = await parser.getScreenshot({ scale: 2 });

    const zip = new JSZip();
    let pageImages = 0;
    for (const pg of result.pages) {
      if (pg.data) {
        zip.file(`page_${pg.pageNumber}.png`, Buffer.from(pg.data));
        pageImages++;
      }
    }

    if (pageImages === 0) {
      throw new Error('No pages could be rendered from this PDF.');
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return {
      success: true,
      convertedBuffer: zipBuffer,
      mimeType: 'application/zip'
    };
  } catch (error) {
    throw new Error(`PDF to Images conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Cleanup must never mask a conversion error.
    try { await parser.destroy(); } catch { /* ignore cleanup errors */ }
  }
}

// Rasterise a single PDF page to a PNG data URL. Used by the mobile native
// editor, which has no DOM canvas / pdf.js and so can't render pages on-device.
async function renderPdfPageToPng(
  pdfBuffer: Buffer,
  pageNumber: number,
  desiredWidth: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  try {
    const result = await parser.getScreenshot({
      partial: [pageNumber],
      desiredWidth,
      imageDataUrl: true,
      imageBuffer: false,
    });
    const pg =
      result.pages.find((p) => p.pageNumber === pageNumber) ?? result.pages[0];
    if (!pg?.dataUrl) {
      throw new Error("Page could not be rendered.");
    }
    return { dataUrl: pg.dataUrl, width: pg.width ?? 0, height: pg.height ?? 0 };
  } finally {
    try { await parser.destroy(); } catch { /* ignore cleanup errors */ }
  }
}

// ── Mobile "Edit Text": server-side text-run extraction + colour sampling ────
// The native app has no pdf.js / DOM canvas, so it can't read a page's real text
// runs or sample their ink colour on-device. It uploads the PDF here; we run the
// SAME pdf.js extraction the web editor does (positions / size / font in the
// page's unrotated viewport space) and sample each run's colour from a rendered
// raster with sharp, returning ready-to-place editable text boxes. Mirrors the
// web engine in pdf-convert-mobile's services/pdfText.web.ts.
type EditFontKey = "helvetica" | "times" | "courier";
interface ServerTextRun {
  str: string;
  x: number; // left, points (top-left origin)
  y: number; // top, points
  width: number; // points
  height: number; // points (~ font size)
  fontSize: number; // points
  family: EditFontKey;
  bold: boolean;
  italic: boolean;
  color?: string;
}

// Map an arbitrary PostScript / CSS font name onto the three families the editor
// can re-embed with pdf-lib's standard fonts.
function editFamilyFromName(name: string): EditFontKey {
  const n = name.toLowerCase();
  if (/(times|georgia|garamond|minion|serif)/.test(n) && !/sans/.test(n))
    return "times";
  if (/(courier|mono|consol|menlo|typewriter)/.test(n)) return "courier";
  return "helvetica";
}
function editIsBoldName(name: string): boolean {
  return /(bold|black|heavy|semibold|demi|[^a-z]bd[^a-z]|w[6-9]00)/i.test(name);
}
function editIsItalicName(name: string): boolean {
  return /(italic|oblique|slant)/i.test(name);
}

// pdf.js is heavy and externalised in the bundle; load it lazily and once. Use
// the Node-blessed `legacy` build (what pdf-parse uses) and pin the SAME version
// pdf-parse resolves (see api-server's pdfjs-dist dependency). pdf.js keeps a
// process-global worker singleton, so mixing two pdfjs versions in one process
// throws "API version X does not match Worker version Y" — keeping both on one
// version (and the Node build) avoids that and the "use the legacy build" warning.
let pdfjsLibPromise: Promise<any> | null = null;
function getPdfjsLib(): Promise<any> {
  if (!pdfjsLibPromise)
    pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsLibPromise;
}

async function extractPdfPageRuns(
  pdfBuffer: Buffer,
  pageIndex: number,
): Promise<{
  runs: ServerTextRun[];
  pageWidth: number;
  pageHeight: number;
  pageCount: number;
}> {
  const pdfjs = await getPdfjsLib();
  const task = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    isEvalSupported: false,
  });
  try {
    const doc = await task.promise;
    const pageCount: number = doc.numPages;
    if (pageIndex < 0 || pageIndex >= pageCount) {
      return { runs: [], pageWidth: 0, pageHeight: 0, pageCount };
    }
    const page = await doc.getPage(pageIndex + 1);
    // Unrotated user space (rotation 0) so coordinates match the editor overlay.
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
    const pageWidth: number = viewport.width;
    const pageHeight: number = viewport.height;
    const content = await page.getTextContent();
    const styles: Record<string, any> = (content as any).styles ?? {};

    const fontMeta = new Map<
      string,
      { family: EditFontKey; bold: boolean; italic: boolean }
    >();
    const resolveFont = (fontName: string) => {
      const cached = fontMeta.get(fontName);
      if (cached) return cached;
      let psName = "";
      try {
        const obj: any =
          (page as any).commonObjs?.has?.(fontName) &&
          (page as any).commonObjs.get(fontName);
        if (obj) psName = obj.name || obj.loadedName || "";
      } catch {
        /* font not resolved yet */
      }
      const cssName: string = styles[fontName]?.fontFamily || "";
      const probe = `${psName} ${cssName}`;
      const meta = {
        family: editFamilyFromName(probe),
        bold: editIsBoldName(probe),
        italic: editIsItalicName(probe),
      };
      fontMeta.set(fontName, meta);
      return meta;
    };

    const runs: ServerTextRun[] = [];
    for (const raw of content.items as any[]) {
      const str: string = raw.str ?? "";
      if (!str || !str.trim()) continue;
      const tr: number[] = raw.transform; // [a,b,c,d,e,f]
      const fontSize = Math.hypot(tr[2], tr[3]) || Math.abs(tr[3]) || 12;
      const left = tr[4];
      const baseline = tr[5]; // distance from bottom
      const width: number = raw.width || fontSize * 0.5 * str.length;
      const height: number = raw.height || fontSize;
      // Glyph box top in top-left origin (transform sits on the baseline).
      const top = pageHeight - baseline - fontSize * 0.82;
      const meta = resolveFont(raw.fontName ?? "");
      runs.push({
        str,
        x: left,
        y: Math.max(0, top),
        width: Math.max(width, 1),
        height: Math.max(height, fontSize),
        fontSize,
        ...meta,
      });
    }
    try { page.cleanup(); } catch { /* best-effort */ }
    return { runs, pageWidth, pageHeight, pageCount };
  } finally {
    // pdf.js destroys through the loading task (not the doc). Keeping the
    // `task.promise` await inside the try guarantees a corrupt PDF that rejects
    // before `doc` is assigned still releases the parser here. A cleanup failure
    // must never discard a successful extraction.
    try { await task.destroy(); } catch { /* cleanup is best-effort */ }
  }
}

function editLum(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
function editToHex(r: number, g: number, b: number): string {
  const h = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Estimate the dominant ink colour of each run by sampling the rendered page
// raster within its bounding box: the brightest pixel is treated as the page
// background, and pixels meaningfully darker than it (the "ink") are averaged.
// Mirrors sampleBoxColor in services/pdfText.web.ts, but reads raw pixels with
// sharp instead of a DOM canvas.
async function samplePdfRunColors(
  pdfBuffer: Buffer,
  pageNumber: number,
  pageWidthPts: number,
  boxes: { x: number; y: number; width: number; height: number }[],
): Promise<string[]> {
  if (boxes.length === 0 || pageWidthPts <= 0) {
    return boxes.map(() => "#111111");
  }
  try {
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    let pngBuffer: Buffer;
    try {
      const result = await parser.getScreenshot({
        partial: [pageNumber],
        desiredWidth: 1000,
        imageDataUrl: false,
        imageBuffer: true,
      });
      const pg =
        result.pages.find((p) => p.pageNumber === pageNumber) ?? result.pages[0];
      if (!pg?.data) return boxes.map(() => "#111111");
      pngBuffer = Buffer.from(pg.data);
    } finally {
      try { await parser.destroy(); } catch { /* ignore cleanup errors */ }
    }
    const { data, info } = await sharp(pngBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    const W = info.width;
    const H = info.height;
    const scale = W / pageWidthPts; // px per point
    return boxes.map((box) => {
      const sx = Math.max(0, Math.min(W - 1, Math.floor(box.x * scale)));
      const sy = Math.max(0, Math.min(H - 1, Math.floor(box.y * scale)));
      const sw = Math.max(1, Math.min(W - sx, Math.ceil(box.width * scale)));
      const sh = Math.max(1, Math.min(H - sy, Math.ceil(box.height * scale)));
      let bgLum = 0;
      for (let yy = 0; yy < sh; yy++) {
        let idx = ((sy + yy) * W + sx) * ch;
        for (let xx = 0; xx < sw; xx++) {
          const l = editLum(data[idx], data[idx + 1], data[idx + 2]);
          if (l > bgLum) bgLum = l;
          idx += ch;
        }
      }
      const threshold = bgLum - 60; // ink is meaningfully darker than the page
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = 0; yy < sh; yy++) {
        let idx = ((sy + yy) * W + sx) * ch;
        for (let xx = 0; xx < sw; xx++) {
          const a = ch >= 4 ? data[idx + 3] : 255;
          if (a >= 128) {
            const l = editLum(data[idx], data[idx + 1], data[idx + 2]);
            if (l < threshold) {
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              n++;
            }
          }
          idx += ch;
        }
      }
      if (n < 3) return "#111111";
      return editToHex(r / n, g / n, b / n);
    });
  } catch {
    return boxes.map(() => "#111111");
  }
}

// Image to PDF: embed the actual image into a PDF page sized to the image.
async function convertImageToPdf(imageBuffer: Buffer, inputExt: string | undefined, outputFilename: string) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const pdfDoc = await PDFDocument.create();

    let embedded;
    if (metadata.format === 'jpeg') {
      embedded = await pdfDoc.embedJpg(imageBuffer);
    } else if (metadata.format === 'png') {
      embedded = await pdfDoc.embedPng(imageBuffer);
    } else {
      // Convert any other format (webp, gif, bmp, tiff, ...) to PNG first.
      const pngBuffer = await sharp(imageBuffer).png().toBuffer();
      embedded = await pdfDoc.embedPng(pngBuffer);
    }

    // Cap page dimensions so very large images don't produce an oversized PDF
    // page that some viewers struggle to render. Preserve the aspect ratio.
    const MAX_DIM = 2000;
    const scale = Math.min(1, MAX_DIM / Math.max(embedded.width, embedded.height));
    const pageWidth = embedded.width * scale;
    const pageHeight = embedded.height * scale;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });

    const pdfBytes = await pdfDoc.save();

    return {
      success: true,
      convertedBuffer: Buffer.from(pdfBytes),
      mimeType: 'application/pdf'
    };
  } catch (error) {
    throw new Error(`Image to PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Combine MULTIPLE images into a SINGLE PDF — one page per image, in the order
// given. Each page is sized to its image (aspect-ratio preserved, capped) so the
// result reads like a clean photo book rather than letterboxed A4 pages.
async function combineImagesToPdf(
  images: { buffer: Buffer; name: string }[],
  _outputFilename: string,
) {
  try {
    const pdfDoc = await PDFDocument.create();

    for (const img of images) {
      const metadata = await sharp(img.buffer).metadata();

      let embedded;
      if (metadata.format === 'jpeg') {
        // Re-encode through sharp so the JPEG carries a JFIF/APP0 header that
        // pdf-lib's embedJpg requires — some encoders (including sharp's own
        // output) omit it, which makes embedJpg throw "SOI not found". This
        // keeps photos in compact JPEG form rather than bloating to PNG.
        const jpgBuffer = await sharp(img.buffer).jpeg().toBuffer();
        embedded = await pdfDoc.embedJpg(jpgBuffer);
      } else {
        // Everything else (png, webp, gif, bmp, tiff, ...) is normalized to
        // PNG, which pdf-lib's embedPng reliably accepts regardless of the
        // source color type.
        const pngBuffer = await sharp(img.buffer).png().toBuffer();
        embedded = await pdfDoc.embedPng(pngBuffer);
      }

      const MAX_DIM = 2000;
      const scale = Math.min(1, MAX_DIM / Math.max(embedded.width, embedded.height));
      const pageWidth = embedded.width * scale;
      const pageHeight = embedded.height * scale;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();

    return {
      success: true,
      convertedBuffer: Buffer.from(pdfBytes),
      mimeType: 'application/pdf',
    };
  } catch (error) {
    throw new Error(`Images to PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function compressPdf(pdfBuffer: Buffer, outputFilename: string) {
  try {
    // Load and analyze the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    // Create a new PDF with compression applied
    const compressedDoc = await PDFDocument.create();
    
    // Copy pages with simulated compression
    for (let i = 0; i < pageCount; i++) {
      const [existingPage] = await compressedDoc.copyPages(pdfDoc, [i]);
      compressedDoc.addPage(existingPage);
    }
    
    // Add compression metadata
    compressedDoc.setTitle('Compressed PDF Document');
    compressedDoc.setSubject('PDF compressed for smaller file size');
    compressedDoc.setCreator('PDF Compression Tool');
    compressedDoc.setProducer('Advanced PDF Compressor v1.0');
    
    const compressedBytes = await compressedDoc.save();
    
    // Calculate compression ratio
    const originalSize = pdfBuffer.length;
    const compressedSize = compressedBytes.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100);
    
    console.log(`PDF compressed: ${compressionRatio.toFixed(1)}% size reduction`);
    
    return {
      success: true,
      convertedBuffer: Buffer.from(compressedBytes),
      mimeType: 'application/pdf'
    };
  } catch (error) {
    throw new Error(`PDF compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function rotatePdf(pdfBuffer: Buffer, outputFilename: string) {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    // Create a new PDF with rotated pages
    const rotatedDoc = await PDFDocument.create();
    
    // Copy and rotate each page
    for (let i = 0; i < pageCount; i++) {
      const [existingPage] = await rotatedDoc.copyPages(pdfDoc, [i]);
      
      // Rotate page 90 degrees clockwise
      existingPage.setRotation(degrees(90));
      
      rotatedDoc.addPage(existingPage);
    }
    
    // Add rotation metadata
    rotatedDoc.setTitle('Rotated PDF Document');
    rotatedDoc.setSubject('PDF pages rotated 90 degrees clockwise');
    rotatedDoc.setCreator('PDF Rotation Tool');
    rotatedDoc.setProducer('Advanced PDF Rotator v1.0');
    
    const rotatedBytes = await rotatedDoc.save();
    
    console.log(`PDF rotated: ${pageCount} pages rotated 90 degrees clockwise`);
    
    return {
      success: true,
      convertedBuffer: Buffer.from(rotatedBytes),
      mimeType: 'application/pdf'
    };
  } catch (error) {
    throw new Error(`PDF rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Pull every word + bounding box out of a Tesseract result, regardless of which
// shape the version returns (`data.words` on older builds, nested `data.blocks`
// on newer ones).
function collectOcrWords(
  data: any,
): Array<{ text: string; x0: number; y0: number; x1: number; y1: number }> {
  const out: Array<{ text: string; x0: number; y0: number; x1: number; y1: number }> = [];
  const push = (w: any) => {
    if (w?.text && w.bbox) {
      out.push({ text: w.text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 });
    }
  };
  if (Array.isArray(data?.words) && data.words.length) {
    data.words.forEach(push);
    return out;
  }
  for (const block of data?.blocks ?? []) {
    for (const para of block?.paragraphs ?? []) {
      for (const line of para?.lines ?? []) {
        for (const word of line?.words ?? []) push(word);
      }
    }
  }
  return out;
}

// OCR PDF: rasterise each page, recognise the text with Tesseract, then rebuild
// the PDF from the original pages with an invisible (opacity 0) text layer placed
// over the recognised words — the result looks identical but the text is now
// selectable and searchable.
async function ocrPdf(pdfBuffer: Buffer, outputFilename: string) {
  let worker: Tesseract.Worker | null = null;
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  try {
    const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const outDoc = await PDFDocument.create();
    const font = await outDoc.embedFont(StandardFonts.Helvetica);

    const shots = await parser.getScreenshot({ scale: 2 });
    const pageImages = new Map<number, Buffer>();
    for (const pg of shots.pages) {
      if (pg.data) pageImages.set(pg.pageNumber, Buffer.from(pg.data));
    }

    worker = await Tesseract.createWorker("eng");

    const pageCount = srcDoc.getPageCount();
    const pages: string[] = [];
    let recognisedWords = 0;

    for (let i = 0; i < pageCount; i++) {
      const [page] = await outDoc.copyPages(srcDoc, [i]);
      outDoc.addPage(page);
      const { width: pdfW, height: pdfH } = page.getSize();

      const img = pageImages.get(i + 1);
      if (!img) { pages.push(""); continue; }

      const meta = await sharp(img).metadata();
      const imgW = meta.width ?? 0;
      const imgH = meta.height ?? 0;
      if (!imgW || !imgH) { pages.push(""); continue; }

      const result = await worker.recognize(img, {}, { blocks: true });
      pages.push((result.data.text ?? "").trim());
      const words = collectOcrWords(result.data);
      const scaleX = pdfW / imgW;
      const scaleY = pdfH / imgH;

      for (const w of words) {
        // Helvetica (WinAnsi) can't encode arbitrary glyphs — keep printable ASCII.
        const text = w.text.replace(/[^\x20-\x7E]/g, "").trim();
        if (!text) continue;
        const fontSize = Math.max(1, (w.y1 - w.y0) * scaleY);
        page.drawText(text, {
          x: w.x0 * scaleX,
          y: pdfH - w.y1 * scaleY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          opacity: 0,
        });
        recognisedWords++;
      }
    }

    outDoc.setTitle("Searchable PDF (OCR)");
    outDoc.setProducer("PDF Genius OCR");
    const bytes = await outDoc.save();

    console.log(`OCR complete: ${pageCount} pages, ${recognisedWords} words recognised`);

    return {
      success: true,
      convertedBuffer: Buffer.from(bytes),
      mimeType: "application/pdf",
      pages,
    };
  } catch (error) {
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  } finally {
    try { if (worker) await worker.terminate(); } catch { /* ignore */ }
    try { await parser.destroy(); } catch { /* ignore */ }
  }
}

// Word to PDF: convert the document to HTML (preserving headings, lists, tables,
// and embedded images) and render it with headless Chromium for a faithful PDF.
async function convertWordToPdf(wordBuffer: Buffer, outputFilename: string) {
  try {
    const result = await mammoth.convertToHtml({ buffer: wordBuffer });
    const bodyHtml = result.value || '<p>(This document contained no readable content.)</p>';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111; font-size: 12pt; }
    h1, h2, h3, h4 { color: #111; margin: 0.8em 0 0.3em; }
    p { margin: 0.4em 0; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; margin: 0.6em 0; }
    td, th { border: 1px solid #999; padding: 4px 6px; vertical-align: top; }
    ul, ol { margin: 0.4em 0 0.4em 1.4em; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;

    const pdfBuffer = await htmlToPdfBuffer(html);

    return {
      success: true,
      convertedBuffer: pdfBuffer,
      mimeType: 'application/pdf'
    };
  } catch (error) {
    throw new Error(`Word to PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Excel to PDF: render every sheet as a real HTML table (full data, no truncation)
// and print it to PDF with headless Chromium.
async function convertExcelToPdf(excelBuffer: Buffer, outputFilename: string) {
  try {
    const workbook = xlsx.read(excelBuffer, { type: 'buffer' });

    let body = '';
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const table = xlsx.utils.sheet_to_html(worksheet);
      body += `<h2>${escapeHtml(sheetName)}</h2>${table}`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10pt; }
    h2 { font-size: 14pt; margin: 16px 0 8px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
    td, th { border: 1px solid #aaa; padding: 4px 6px; }
  </style>
</head>
<body>${body || '<p>(This workbook contained no sheets.)</p>'}</body>
</html>`;

    const pdfBuffer = await htmlToPdfBuffer(html);

    return {
      success: true,
      convertedBuffer: pdfBuffer,
      mimeType: 'application/pdf'
    };
  } catch (error) {
    throw new Error(`Excel to PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function mergePdfs(pdfBuffers: Buffer[], outputFilename: string) {
  try {
    // Create a new PDF to merge into
    const mergedDoc = await PDFDocument.create();
    
    // Process each PDF buffer. Fail loudly on any unreadable input rather than
    // silently dropping it — a "merged" file missing documents is misleading.
    for (let i = 0; i < pdfBuffers.length; i++) {
      try {
        const pdfDoc = await PDFDocument.load(pdfBuffers[i]);
        const pageCount = pdfDoc.getPageCount();
        const pageIndices = Array.from({ length: pageCount }, (_, index) => index);
        const copiedPages = await mergedDoc.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach((page) => mergedDoc.addPage(page));
      } catch {
        throw new Error(`File #${i + 1} could not be read — it may be password-protected or corrupted.`);
      }
    }

    if (mergedDoc.getPageCount() === 0) {
      throw new Error('No pages could be merged from the provided PDFs.');
    }
    
    // Add metadata
    mergedDoc.setTitle('Merged PDF Document');
    mergedDoc.setSubject('Multiple PDFs merged into single document');
    mergedDoc.setCreator('PDF Merge Tool');
    mergedDoc.setProducer('Advanced PDF Merger v1.0');
    
    const mergedBytes = await mergedDoc.save();
    
    console.log(`PDFs merged: ${pdfBuffers.length} files combined`);
    
    return {
      success: true,
      convertedBuffer: Buffer.from(mergedBytes),
      mimeType: 'application/pdf'
    };
  } catch (error) {
    throw new Error(`PDF merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Split PDF: extract every page into its own real PDF and bundle them in a ZIP.
async function splitPdf(pdfBuffer: Buffer, outputFilename: string) {
  try {
    const srcDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = srcDoc.getPageCount();

    const zip = new JSZip();
    for (let i = 0; i < pageCount; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      const bytes = await newDoc.save();
      zip.file(`page_${i + 1}.pdf`, Buffer.from(bytes));
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return {
      success: true,
      convertedBuffer: zipBuffer,
      mimeType: 'application/zip'
    };
  } catch (error) {
    throw new Error(`PDF split failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// PDF to Excel: extract real text per page and lay it out into spreadsheet rows,
// splitting each line into cells on tabs or runs of 2+ spaces (column gaps).
async function convertPdfToExcel(pdfBuffer: Buffer, outputFilename: string) {
  try {
    const pages = await extractPdfPages(pdfBuffer);
    const hasText = pages.some((p) => p.trim().length > 0);
    const workbook = xlsx.utils.book_new();

    if (!hasText) {
      const worksheet = xlsx.utils.aoa_to_sheet([['No extractable text was found in this PDF (it may be a scanned image).']]);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    } else {
      pages.forEach((pageText, idx) => {
        const rows = pageText
          .split(/\r?\n/)
          .map((line) => line.split(/\t|\s{2,}/).map((cell) => cell.trim()));
        const worksheet = xlsx.utils.aoa_to_sheet(rows.length ? rows : [['']]);
        xlsx.utils.book_append_sheet(workbook, worksheet, `Page ${idx + 1}`.slice(0, 31));
      });
    }

    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      success: true,
      convertedBuffer: excelBuffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  } catch (error) {
    throw new Error(`PDF to Excel conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// PDF to PowerPoint: extract real text per page and build a genuine .pptx with
// one slide per page.
async function convertPdfToPowerPoint(pdfBuffer: Buffer, outputFilename: string) {
  try {
    const pages = await extractPdfPages(pdfBuffer);
    if (pages.length === 0) {
      pages.push('No extractable text was found in this PDF.');
    }

    const pptx = new PptxGenCtor();
    pptx.layout = 'LAYOUT_WIDE';

    pages.forEach((pageText, idx) => {
      const slide = pptx.addSlide();
      slide.addText(`Page ${idx + 1}`, {
        x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 20, bold: true, color: '1F3864',
      });
      const body = (pageText || '').trim() || '(No text on this page.)';
      slide.addText(body, {
        x: 0.5, y: 1.1, w: 12, h: 6, fontSize: 12, color: '333333', valign: 'top', wrap: true,
      });
    });

    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;

    return {
      success: true,
      convertedBuffer: buffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
  } catch (error) {
    throw new Error(`PDF to PowerPoint conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// PowerPoint to PDF: read the real slide text out of the .pptx archive (one
// section per slide) and render it to PDF with headless Chromium.
async function convertPowerPointToPdf(pptBuffer: Buffer, outputFilename: string) {
  try {
    const zip = await JSZip.loadAsync(pptBuffer);

    const slideEntries = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const na = parseInt(a.match(/slide(\d+)\.xml/)![1], 10);
        const nb = parseInt(b.match(/slide(\d+)\.xml/)![1], 10);
        return na - nb;
      });

    const sections: string[] = [];
    for (let i = 0; i < slideEntries.length; i++) {
      const xml = await zip.files[slideEntries[i]].async('string');
      const texts = Array.from(xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)).map((m) =>
        m[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
      );
      const body = texts.map((t) => `<p>${escapeHtml(t)}</p>`).join('');
      sections.push(`<section class="slide"><h2>Slide ${i + 1}</h2>${body || '<p>(No text on this slide.)</p>'}</section>`);
    }

    if (sections.length === 0) {
      sections.push('<section class="slide"><p>No slides were found in this presentation.</p></section>');
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #111; }
    .slide { page-break-after: always; padding: 12px 0; }
    .slide:last-child { page-break-after: auto; }
    h2 { color: #1f3864; margin: 0 0 12px; }
    p { font-size: 13pt; margin: 6px 0; }
  </style>
</head>
<body>${sections.join('')}</body>
</html>`;

    const pdfBuffer = await htmlToPdfBuffer(html);

    return {
      success: true,
      convertedBuffer: pdfBuffer,
      mimeType: 'application/pdf'
    };
  } catch (error) {
    throw new Error(`PowerPoint to PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function convertHtmlToPdf(htmlBuffer: Buffer, outputFilename: string) {
  try {
    // Extract HTML content from buffer
    const htmlContent = htmlBuffer.toString('utf8');

    // Render the actual HTML (styles, layout, images) with headless Chromium so
    // the PDF looks like the page itself, not a stripped-down text dump.
    const pdfBuffer = await htmlToPdfBuffer(htmlContent);

    return {
      success: true,
      convertedBuffer: pdfBuffer,
      mimeType: 'application/pdf'
    };
  } catch (error) {
    throw new Error(`HTML to PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Resolve the Replicate API token from the Replit connector (preferred) or a
// REPLICATE_API_TOKEN env var fallback. Never cache it — tokens can rotate.
async function getReplicateToken(): Promise<string | undefined> {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!hostname || !xReplitToken) return undefined;

  try {
    const resp = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=replicate`,
      { headers: { Accept: 'application/json', X_REPLIT_TOKEN: xReplitToken } }
    );
    if (!resp.ok) return undefined;
    const data: any = await resp.json();
    const settings = data.items?.[0]?.settings ?? {};
    return (
      settings.api_token ||
      settings.api_key ||
      settings.access_token ||
      settings.oauth?.credentials?.access_token
    );
  } catch {
    return undefined;
  }
}

// Defence-in-depth: only fetch model output from Replicate's own delivery hosts.
function isAllowedReplicateOutputHost(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return (
      host === 'replicate.delivery' ||
      host.endsWith('.replicate.delivery') ||
      host === 'replicate.com' ||
      host.endsWith('.replicate.com')
    );
  } catch {
    return false;
  }
}

// Real AI super-resolution via Replicate (Real-ESRGAN). We do NOT fake this with
// a plain resampling filter — if the integration isn't connected we fail loudly
// so the output is always a genuine AI-enhanced image.
async function upscaleImage(imageBuffer: Buffer, inputExt: string | undefined, outputFilename: string, options: Record<string, any> = {}) {
  const token = await getReplicateToken();
  if (!token) {
    throw new Error(
      'AI upscaling requires the Replicate integration. Connect your Replicate account to enable this tool.'
    );
  }

  let scale = parseInt(String(options.scale), 10);
  if (![2, 4].includes(scale)) scale = 4;

  try {
    // Normalize to PNG so any input format is accepted, then send as a data URI.
    const pngInput = await sharp(imageBuffer).png().toBuffer();
    const dataUri = `data:image/png;base64,${pngInput.toString('base64')}`;

    const createResp = await fetch(
      'https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'wait',
        },
        body: JSON.stringify({ input: { image: dataUri, scale, face_enhance: false } }),
      }
    );

    if (!createResp.ok) {
      const errText = await createResp.text();
      throw new Error(`Replicate API error (${createResp.status}): ${errText}`);
    }

    let prediction: any = await createResp.json();
    const startedAt = Date.now();
    while (
      ['starting', 'processing'].includes(prediction.status) &&
      Date.now() - startedAt < 120000
    ) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollResp = await fetch(prediction.urls.get, {
        headers: { Authorization: `Bearer ${token}` },
      });
      prediction = await pollResp.json();
    }

    if (prediction.status !== 'succeeded') {
      throw new Error(`Upscaling failed: ${prediction.error || prediction.status}`);
    }

    const outputUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;
    if (!outputUrl || typeof outputUrl !== 'string') {
      throw new Error('Upscaling returned no output image');
    }
    if (!isAllowedReplicateOutputHost(outputUrl)) {
      throw new Error('Upscaling returned an unexpected output location');
    }

    const imgResp = await fetch(outputUrl);
    if (!imgResp.ok) {
      throw new Error(`Failed to fetch upscaled image (${imgResp.status})`);
    }
    const upscaledPng = Buffer.from(await imgResp.arrayBuffer());

    // Re-encode to the original format so the filename/MIME stay consistent.
    const ext = (inputExt || 'png').toLowerCase();
    let convertedBuffer: Buffer;
    let mimeType: string;
    if (ext === 'jpg' || ext === 'jpeg') {
      convertedBuffer = await sharp(upscaledPng).jpeg({ quality: 95 }).toBuffer();
      mimeType = 'image/jpeg';
    } else if (ext === 'webp') {
      convertedBuffer = await sharp(upscaledPng).webp({ quality: 95 }).toBuffer();
      mimeType = 'image/webp';
    } else {
      convertedBuffer = await sharp(upscaledPng).png().toBuffer();
      mimeType = 'image/png';
    }

    console.log(`Image upscaled ${scale}x via Replicate (${convertedBuffer.length} bytes)`);

    return { success: true, convertedBuffer, mimeType };
  } catch (error) {
    throw new Error(`Image upscaling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function removeBackground(imageBuffer: Buffer, inputExt: string | undefined, outputFilename: string) {
  // Genuine subject/background separation requires an AI model or an external
  // service (e.g. remove.bg). We do NOT fake it by distorting colors. If an API
  // key is configured we use it; otherwise we fail loudly so the result is never
  // a misleading "processed" image that still has its background.
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Background removal requires an external AI service. Set the REMOVE_BG_API_KEY secret (from remove.bg) to enable this tool.'
    );
  }

  try {
    // Normalize to PNG before sending so any input format is accepted.
    const pngInput = await sharp(imageBuffer).png().toBuffer();

    const form = new FormData();
    form.append('image_file', new Blob([pngInput as any], { type: 'image/png' }), 'image.png');
    form.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`remove.bg API error (${response.status}): ${errText}`);
    }

    const resultBuffer = Buffer.from(await response.arrayBuffer());

    return {
      success: true,
      convertedBuffer: resultBuffer,
      mimeType: 'image/png'
    };
  } catch (error) {
    throw new Error(`Background removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Configure multer for multiple files (PDF generator)
const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept images and text files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'text/plain'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.txt'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension);
    
    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPG, PNG, GIF, BMP, WebP) and text files are allowed.'));
    }
  },
});

// Multi-image upload for "Images to PDF". Accepts only images (no text files,
// unlike uploadMultiple) and allows up to 20 so several photos can be combined
// into a single PDF in one request.
const imageMultiUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
    files: 20,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith('image/') || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF, BMP, WebP) are allowed.'));
    }
  },
});

// File storage for conversion processing
const fileStorage = new Map<number, Buffer>();
const convertedFileStorage = new Map<number, { buffer: Buffer; mimeType: string; filename: string }>();
// OCR recognized text, per page, keyed by job id — surfaced via /api/ocr-text/:jobId.
const ocrTextStorage = new Map<number, string[]>();

// ---------------------------------------------------------------------------
// In-memory job buffer lifecycle. These maps hold raw file bytes in RAM and,
// before this sweeper existed, entries were only freed when the user downloaded
// or deleted the job. Jobs that were never downloaded accumulated their input
// AND output buffers forever, which OOM-crashed the production container under
// sustained traffic. Eviction is safe: completed results (and OCR text) are
// persisted to durable object storage at completion, and /api/download falls
// back to that durable copy when the in-memory copy is gone.
// ---------------------------------------------------------------------------
const JOB_BUFFER_TTL_MS = 30 * 60 * 1000; // keep in-memory copies for 30 min
const JOB_BUFFER_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const jobBufferTouchedAt = new Map<number, number>();

function touchJobBuffers(jobId: number): void {
  jobBufferTouchedAt.set(jobId, Date.now());
}

function purgeJobBuffers(jobId: number): void {
  fileStorage.delete(jobId);
  convertedFileStorage.delete(jobId);
  ocrTextStorage.delete(jobId);
  jobBufferTouchedAt.delete(jobId);
}

setInterval(() => {
  const cutoff = Date.now() - JOB_BUFFER_TTL_MS;
  let purged = 0;
  for (const [jobId, touchedAt] of jobBufferTouchedAt) {
    if (touchedAt < cutoff) {
      purgeJobBuffers(jobId);
      purged++;
    }
  }
  // Defensive: purge any orphaned entries that never got a touch timestamp so
  // no code path can reintroduce an unbounded buffer leak.
  for (const jobId of fileStorage.keys()) {
    if (!jobBufferTouchedAt.has(jobId)) { purgeJobBuffers(jobId); purged++; }
  }
  for (const jobId of convertedFileStorage.keys()) {
    if (!jobBufferTouchedAt.has(jobId)) { purgeJobBuffers(jobId); purged++; }
  }
  for (const jobId of ocrTextStorage.keys()) {
    if (!jobBufferTouchedAt.has(jobId)) { purgeJobBuffers(jobId); purged++; }
  }
  if (purged > 0) {
    console.log(`Job buffer sweep: purged in-memory copies for ${purged} job(s)`);
  }
}, JOB_BUFFER_SWEEP_INTERVAL_MS).unref();

// Text-derived OCR export formats the client can request via /api/download?format=.
type OcrExportFormat = "txt" | "doc" | "html" | "md";
const OCR_EXPORT_FORMATS = new Set<string>(["txt", "doc", "html", "md"]);
const OCR_FORMAT_MIME: Record<OcrExportFormat, string> = {
  txt: "text/plain; charset=utf-8",
  doc: "application/msword",
  html: "text/html; charset=utf-8",
  md: "text/markdown; charset=utf-8",
};

function escapeOcrHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Mirror of the web/mobile buildOcrContent so a server-built re-download is
// byte-identical to the file the first (client-built) download produced.
function buildOcrContent(format: OcrExportFormat, pages: string[], title: string): string {
  const trimmed = pages.map((p) => p.trim());
  switch (format) {
    case "md":
      return trimmed.map((t, i) => `## Page ${i + 1}\n\n${t}`).join("\n\n");
    case "html":
    case "doc": {
      const head =
        format === "doc"
          ? `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeOcrHtml(title)}</title></head><body>`
          : `<!doctype html><html><head><meta charset="utf-8"><title>${escapeOcrHtml(title)}</title></head><body style="font-family:sans-serif">`;
      const body = trimmed
        .map(
          (t, i) =>
            `<h2>Page ${i + 1}</h2><pre style="white-space:pre-wrap;font-family:inherit;font-size:14px">${escapeOcrHtml(t)}</pre>`,
        )
        .join("\n");
      return `${head}${body}</body></html>`;
    }
    case "txt":
    default:
      return trimmed.map((t, i) => `--- Page ${i + 1} ---\n${t}`).join("\n\n");
  }
}

// Resolve a job's OCR text pages: fast in-memory copy first, then the durable
// object-storage sidecar (so re-downloads work after purge / restart).
async function resolveOcrPages(jobId: number): Promise<string[] | null> {
  const inMemory = ocrTextStorage.get(jobId);
  if (inMemory && inMemory.length > 0) return inMemory;
  try {
    return await getOcrText(jobId);
  } catch (err) {
    console.error(`Failed to load OCR text for job ${jobId} from object storage:`, err);
    return null;
  }
}
// Stores images "uploaded to the server" from the in-browser Crop/Resize/Rotate
// editors. Kept in memory with a short TTL — a lightweight upload target.
const uploadedFileStorage = new Map<string, { buffer: Buffer; mimeType: string; filename: string; expiresAt: number }>();

// Extend Request interface for authentication
type AuthenticatedRequest = Omit<Request, "user"> & {
  user?: {
    id: string;
    email: string;
  };
};

// Middleware to support optional authentication
const optionalAuth = async (req: AuthenticatedRequest, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // No authentication provided, continue without user
    return next();
  }

  const token = authHeader.split(" ")[1];
  
  if (token) {
    // JWT token authentication - simplified version
    try {
      const { verifyToken } = await import("./auth");
      const payload = verifyToken(token);
      if (payload) {
        const user = await storage.getUserById(payload.userId);
        if (user) {
          req.user = { id: user.id, email: user.email };
        }
      }
    } catch (error) {
      console.error("Optional auth error:", error);
    }
  }
  
  next();
};

// Best public origin for building return/cancel URLs that point back at the web
// app. In production the web build is co-hosted with the API on a single origin,
// so the incoming request's host is correct; PUBLIC_APP_URL overrides it.
function appOrigin(req: Request): string {
  const configured = process.env.PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ||
    req.protocol ||
    "https";
  const host = req.get("host");
  return `${proto}://${host}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  // Authentication routes are defined above

  // Get all available tools
  app.get("/api/tools", async (req, res) => {
    try {
      const tools = await storage.getAllTools();
      res.json({
        success: true,
        data: tools,
        total: tools.length
      });
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch tools"
      });
    }
  });

  // Public paused-tools probe: lets web/mobile clients grey out paused tools
  // and show a friendly notice BEFORE the user uploads a file. Exposes only
  // the paused tool types — no admin data. Must be registered before the
  // "/api/tools/:toolType" route so "paused" isn't captured as a toolType.
  app.get("/api/tools/paused", async (_req, res) => {
    try {
      const paused = await storage.getPausedToolTypes();
      res.json({ success: true, data: { paused: Array.from(paused) } });
    } catch (error) {
      console.error("Error fetching paused tools:", error);
      // Fail open: clients treat all tools as active if this probe fails.
      res.json({ success: true, data: { paused: [] } });
    }
  });

  // Get tools by category
  app.get("/api/tools/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      
      if (!Object.values(ToolCategory).includes(category as ToolCategory)) {
        return res.status(400).json({
          success: false,
          error: "Invalid tool category"
        });
      }

      const tools = await storage.getToolsByCategory(category as ToolCategory);
      res.json({
        success: true,
        data: tools,
        category,
        total: tools.length
      });
    } catch (error) {
      console.error("Error fetching tools by category:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch tools by category"
      });
    }
  });

  // Get specific tool by type
  app.get("/api/tools/:toolType", async (req, res) => {
    try {
      const { toolType } = req.params;
      
      if (!Object.values(ToolType).includes(toolType as ToolType)) {
        return res.status(400).json({
          success: false,
          error: "Invalid tool type"
        });
      }

      const tool = await storage.getToolByType(toolType as ToolType);
      if (!tool) {
        return res.status(404).json({
          success: false,
          error: "Tool not found"
        });
      }

      res.json({
        success: true,
        data: tool
      });
    } catch (error) {
      console.error("Error fetching tool:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch tool"
      });
    }
  });

  // Mobile native page rasteriser: render one PDF page to a PNG data URL. The
  // native app has no pdf.js, so it uploads the PDF here and shows the returned
  // image in the editor. Free first-party tool → optional auth.
  app.post(
    "/api/pdf/render-page",
    optionalConversionAuth,
    (req, res, next) => {
      // Bound abuse before we accept a (potentially large) upload or spend CPU.
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (renderRateLimited(ip)) {
        return res
          .status(429)
          .json({ error: "Too many render requests. Please slow down." });
      }
      // Translate multer's streaming errors (oversized / non-PDF) into clean
      // JSON instead of letting them fall through to the HTML error handler.
      pdfRenderUpload.single("file")(req, res, (err: any) => {
        if (err) {
          let status = 400;
          let msg = err instanceof Error ? err.message : "Upload failed";
          if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            status = 413;
            msg = "PDF must be 100MB or smaller.";
          }
          return res.status(status).json({ error: msg });
        }
        next();
      });
    },
    async (req, res) => {
      let release: (() => void) | null = null;
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No PDF uploaded." });
        }
        const pageIndex = Number.parseInt(String(req.body.pageIndex ?? ""), 10);
        if (!Number.isFinite(pageIndex) || pageIndex < 0) {
          return res.status(400).json({ error: "Invalid pageIndex." });
        }
        let targetWidth = Number.parseInt(String(req.body.targetWidth ?? ""), 10);
        if (!Number.isFinite(targetWidth)) targetWidth = 620;
        targetWidth = Math.min(2000, Math.max(80, targetWidth));

        const doc = await PDFDocument.load(new Uint8Array(req.file.buffer), {
          ignoreEncryption: true,
        });
        const pageCount = doc.getPageCount();
        if (pageIndex >= pageCount) {
          return res.status(400).json({ error: "pageIndex out of range." });
        }

        release = await acquireRenderSlot();
        const { dataUrl, width, height } = await renderPdfPageToPng(
          req.file.buffer,
          pageIndex + 1,
          targetWidth,
        );
        res.setHeader("Cache-Control", "no-store");
        return res.json({ image: dataUrl, width, height });
      } catch (err) {
        console.error("PDF render-page failed:", err);
        return res.status(500).json({ error: "Could not render this PDF page." });
      } finally {
        if (release) release();
      }
    },
  );

  // Mobile native "Edit Text": extract a page's real, selectable text runs
  // (position / size / font) plus each run's sampled ink colour, so the native
  // editor can drop editable text boxes over the originals exactly like the web
  // app does. The native client has no pdf.js, so it uploads the PDF here.
  // Free first-party tool → optional auth.
  app.post(
    "/api/pdf/extract-text",
    optionalConversionAuth,
    (req, res, next) => {
      // Bound abuse before we accept a (potentially large) upload or spend CPU.
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (renderRateLimited(ip)) {
        return res
          .status(429)
          .json({ error: "Too many requests. Please slow down." });
      }
      // Translate multer's streaming errors (oversized / non-PDF) into clean
      // JSON instead of letting them fall through to the HTML error handler.
      pdfRenderUpload.single("file")(req, res, (err: any) => {
        if (err) {
          let status = 400;
          let msg = err instanceof Error ? err.message : "Upload failed";
          if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            status = 413;
            msg = "PDF must be 100MB or smaller.";
          }
          return res.status(status).json({ error: msg });
        }
        next();
      });
    },
    async (req, res) => {
      let release: (() => void) | null = null;
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No PDF uploaded." });
        }
        const pageIndex = Number.parseInt(String(req.body.pageIndex ?? ""), 10);
        if (!Number.isFinite(pageIndex) || pageIndex < 0) {
          return res.status(400).json({ error: "Invalid pageIndex." });
        }

        release = await acquireRenderSlot();
        const { runs, pageWidth, pageHeight, pageCount } =
          await extractPdfPageRuns(req.file.buffer, pageIndex);
        if (pageIndex >= pageCount) {
          return res.status(400).json({ error: "pageIndex out of range." });
        }
        res.setHeader("Cache-Control", "no-store");
        if (runs.length === 0) {
          // A real (but image-only / scanned) page: let the client report that
          // there's no editable text rather than erroring.
          return res.json({ items: [], pageWidth, pageHeight });
        }
        // Pad each run the way the editor builds its white cover boxes, so the
        // sampled colour reflects the run's ink like the web path does.
        const boxes = runs.map((run) => {
          const padY = run.fontSize * 0.35;
          const padX = Math.max(1.5, run.fontSize * 0.15);
          return {
            x: Math.max(0, run.x - padX),
            y: Math.max(0, run.y - padY),
            width: run.width + padX * 2,
            height: run.height + padY * 2,
          };
        });
        const colors = await samplePdfRunColors(
          req.file.buffer,
          pageIndex + 1,
          pageWidth,
          boxes,
        );
        const items = runs.map((run, i) => ({
          ...run,
          color: colors[i] ?? "#111111",
        }));
        return res.json({ items, pageWidth, pageHeight });
      } catch (err) {
        // pdf.js raises typed exceptions for bad input (corrupt, truncated, or
        // password-protected files). Those are client errors (400) — a malformed
        // upload, not a server fault — so report them clearly instead of a 500.
        const name = err instanceof Error ? err.name : "";
        const msg = err instanceof Error ? err.message : "";
        if (name === "PasswordException") {
          return res.status(400).json({
            error: "This PDF is password-protected — remove its password first.",
          });
        }
        if (
          /^(InvalidPDFException|MissingPDFException|FormatError)$/.test(name) ||
          /invalid pdf|stream must have|corrupt|may not be a pdf/i.test(msg)
        ) {
          return res.status(400).json({
            error: "This PDF couldn't be read — it may be corrupted or invalid.",
          });
        }
        console.error("PDF extract-text failed:", err);
        return res
          .status(500)
          .json({ error: "Could not read this PDF's text." });
      } finally {
        if (release) release();
      }
    },
  );

  app.post("/api/convert", optionalConversionAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded"
        });
      }

      // Diagnostic: compare the bytes we actually received against the size the
      // client claims. A large mismatch means the upload was truncated in
      // transit (not a corrupt source file).
      console.log(
        `Upload received: ${req.file.originalname} claimed=${req.body.fileSize ?? "?"} received=${req.file.size} bytes`,
      );

      const requestData = {
        toolType: req.body.toolType,
        fileName: req.body.fileName || req.file.originalname,
        fileSize: parseInt(req.body.fileSize) || req.file.size,
        options: req.body.options ? JSON.parse(req.body.options) : {}
      };

      const validationResult = fileConversionRequestSchema.safeParse(requestData);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: validationResult.error.issues
        });
      }

      const { toolType, fileName, fileSize, options } = validationResult.data;

      const tool = await storage.getToolByType(toolType);
      if (!tool) {
        return res.status(404).json({
          success: false,
          error: "Tool not found"
        });
      }

      // Admin kill-switch: paused tools reject new conversions immediately.
      if (await storage.isToolPaused(toolType)) {
        return res.status(503).json({
          success: false,
          error: "This tool is temporarily unavailable. Please try again later."
        });
      }

      if (fileSize > tool.maxFileSize * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: `File size exceeds maximum limit of ${tool.maxFileSize}MB`
        });
      }

      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      if (!fileExtension || !tool.inputFormats.includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported file format. Supported formats: ${tool.inputFormats.join(', ')}`
        });
      }

      const job = await storage.createConversionJob({
        userId: (req as ConversionAuthRequest).user?.id || null,
        toolType,
        status: "pending",
        source: (req as ConversionAuthRequest).authSource || "web",
        inputFilename: fileName,
        inputFileSize: fileSize,
        outputFilename: null,
        outputFileSize: null,
        processingTime: null,
        errorMessage: null
      });

      // Process file asynchronously
      processFile(job.id, req.file, tool, fileName, toolType, options)
        .catch(error => {
          console.error(`Processing failed for job ${job.id}:`, error);
        });

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          inputFilename: job.inputFilename,
          message: "File uploaded successfully. Processing started."
        }
      });

    } catch (error) {
      console.error("Conversion error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to start conversion",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Merge multiple PDFs into a single PDF. The generic /api/convert route is
  // single-file (upload.single), so PDF merging gets a dedicated multi-file
  // endpoint. It reuses the job + /api/download infrastructure so the frontend
  // polls and downloads exactly like every other tool.
  app.post("/api/merge-pdfs", optionalConversionAuth, (req, res, next) => {
    // mergeUpload enforces the 100MB/file and 20-file caps during streaming and
    // rejects non-PDF extensions. Translate its errors into clean 400 JSON
    // instead of letting them fall through to the generic error handler.
    mergeUpload.array('files', 20)(req, res, (err: any) => {
      if (err) {
        let msg = err instanceof Error ? err.message : 'Upload failed';
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') msg = 'Each PDF must be 100MB or smaller.';
          else if (err.code === 'LIMIT_FILE_COUNT') msg = 'You can merge at most 20 PDFs at once.';
        }
        return res.status(400).json({ success: false, error: msg });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length < 2) {
        return res.status(400).json({
          success: false,
          error: "Please select at least 2 PDF files to merge."
        });
      }

      // Admin kill-switch: paused tools reject new conversions immediately.
      if (await storage.isToolPaused(ToolType.MERGE_PDFS)) {
        return res.status(503).json({
          success: false,
          error: "This tool is temporarily unavailable. Please try again later."
        });
      }

      const pdfBuffers: Buffer[] = [];
      for (const f of files) {
        // Defense in depth: confirm real PDF bytes, not just a .pdf extension.
        const isPdfMagic = f.buffer.subarray(0, 5).toString('latin1').startsWith('%PDF');
        if (!isPdfMagic) {
          return res.status(400).json({
            success: false,
            error: `"${f.originalname}" is not a valid PDF file.`
          });
        }
        pdfBuffers.push(f.buffer);
      }

      const totalInputSize = files.reduce((sum, f) => sum + f.size, 0);
      const outputFilename = "merged.pdf";

      const job = await storage.createConversionJob({
        userId: (req as ConversionAuthRequest).user?.id || null,
        toolType: ToolType.MERGE_PDFS,
        status: "processing",
        source: (req as ConversionAuthRequest).authSource || "web",
        inputFilename: files.map(f => f.originalname).join(", ").slice(0, 255),
        inputFileSize: totalInputSize,
        outputFilename: null,
        outputFileSize: null,
        processingTime: null,
        errorMessage: null
      });

      try {
        const startTime = Date.now();
        const result = await mergePdfs(pdfBuffers, outputFilename);
        if (!result.success || !result.convertedBuffer || result.convertedBuffer.length === 0) {
          throw new Error("Merge produced no output");
        }
        convertedFileStorage.set(job.id, {
          buffer: result.convertedBuffer,
          mimeType: result.mimeType || "application/pdf",
          filename: outputFilename
        });
        touchJobBuffers(job.id);

        // Persist to durable object storage so the merged file can be
        // re-downloaded anytime — even after the in-memory copy is purged or the
        // server restarts. Best-effort: a storage failure must not fail the job.
        try {
          await saveConvertedFile(job.id, result.convertedBuffer, result.mimeType || "application/pdf");
        } catch (storageError) {
          console.error(`Failed to persist merged file for job ${job.id} to object storage:`, storageError);
        }

        await storage.updateConversionJobStatus(
          job.id,
          "completed",
          outputFilename,
          undefined,
          Date.now() - startTime,
          result.convertedBuffer.length
        );
      } catch (err) {
        await storage.updateConversionJobStatus(
          job.id,
          "failed",
          undefined,
          err instanceof Error ? err.message : "Merge failed"
        );
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: "processing",
          message: "Files uploaded successfully. Merging started."
        }
      });
    } catch (error) {
      console.error("Merge error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to merge PDFs",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Combine multiple images into a SINGLE PDF (one page per image, in order).
  // Like /api/merge-pdfs, the generic single-file /api/convert can't do this, so
  // "Images to PDF" gets its own multi-file endpoint that reuses the job +
  // /api/download infrastructure (poll + download exactly like every other tool).
  app.post("/api/images-to-pdf", optionalConversionAuth, (req, res, next) => {
    imageMultiUpload.array('files', 20)(req, res, (err: any) => {
      if (err) {
        let msg = err instanceof Error ? err.message : 'Upload failed';
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') msg = 'Each image must be 25MB or smaller.';
          else if (err.code === 'LIMIT_FILE_COUNT') msg = 'You can combine at most 20 images at once.';
        }
        return res.status(400).json({ success: false, error: msg });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length < 1) {
        return res.status(400).json({
          success: false,
          error: "Please select at least one image to convert.",
        });
      }

      // Admin kill-switch: paused tools reject new conversions immediately.
      if (await storage.isToolPaused(ToolType.IMAGES_TO_PDF)) {
        return res.status(503).json({
          success: false,
          error: "This tool is temporarily unavailable. Please try again later."
        });
      }

      const images = files.map((f) => ({ buffer: f.buffer, name: f.originalname }));
      const totalInputSize = files.reduce((sum, f) => sum + f.size, 0);
      const outputFilename = "images.pdf";

      const job = await storage.createConversionJob({
        userId: (req as ConversionAuthRequest).user?.id || null,
        toolType: ToolType.IMAGES_TO_PDF,
        status: "processing",
        source: (req as ConversionAuthRequest).authSource || "web",
        inputFilename: files.map((f) => f.originalname).join(", ").slice(0, 255),
        inputFileSize: totalInputSize,
        outputFilename: null,
        outputFileSize: null,
        processingTime: null,
        errorMessage: null,
      });

      try {
        const startTime = Date.now();
        const result = await combineImagesToPdf(images, outputFilename);
        if (!result.success || !result.convertedBuffer || result.convertedBuffer.length === 0) {
          throw new Error("Conversion produced no output");
        }
        convertedFileStorage.set(job.id, {
          buffer: result.convertedBuffer,
          mimeType: result.mimeType || "application/pdf",
          filename: outputFilename,
        });
        touchJobBuffers(job.id);
        // Best-effort durable copy so the result survives an in-memory purge or
        // a server restart (a storage failure must not fail the job).
        try {
          await saveConvertedFile(job.id, result.convertedBuffer, result.mimeType || "application/pdf");
        } catch (storageError) {
          console.error(`Failed to persist images-to-pdf result for job ${job.id}:`, storageError);
        }
        await storage.updateConversionJobStatus(
          job.id,
          "completed",
          outputFilename,
          undefined,
          Date.now() - startTime,
          result.convertedBuffer.length,
        );
      } catch (err) {
        await storage.updateConversionJobStatus(
          job.id,
          "failed",
          undefined,
          err instanceof Error ? err.message : "Conversion failed",
        );
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: "processing",
          message: "Images uploaded successfully. Conversion started.",
        },
      });
    } catch (error) {
      console.error("Images to PDF error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to convert images to PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Save an already-edited image (from the in-browser Crop/Resize/Rotate tools)
  // to the server and return a shareable URL. Hardened: image-only via a
  // dedicated multer config, re-encoded through Sharp to strip any active
  // content, safe server-derived mime/filename, per-IP rate limit, and
  // aggregate caps so the in-memory store can't grow unbounded.
  app.post("/api/uploads", optionalConversionAuth, imageUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No valid image file uploaded" });
      }

      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (uploadRateLimited(ip)) {
        return res.status(429).json({ success: false, error: "Too many uploads, please slow down" });
      }

      // Validate that the bytes are a real raster image and normalize them.
      let metadata;
      try {
        metadata = await sharp(req.file.buffer).metadata();
      } catch {
        return res.status(400).json({ success: false, error: "Invalid image file" });
      }
      const format = metadata.format || "";
      if (!SAFE_IMAGE_FORMATS[format]) {
        return res.status(400).json({ success: false, error: "Unsupported image format" });
      }

      // Re-encode through Sharp so only a clean raster image is ever stored.
      const safeBuffer = await sharp(req.file.buffer).toFormat(format as any).toBuffer();
      const mimeType = SAFE_IMAGE_FORMATS[format];

      // Enforce aggregate caps (drop expired entries first).
      const now = Date.now();
      let totalBytes = 0;
      for (const [key, val] of uploadedFileStorage) {
        if (val.expiresAt < now) uploadedFileStorage.delete(key);
        else totalBytes += val.buffer.length;
      }
      if (
        uploadedFileStorage.size >= UPLOAD_MAX_ENTRIES ||
        totalBytes + safeBuffer.length > UPLOAD_MAX_TOTAL_BYTES
      ) {
        return res.status(507).json({ success: false, error: "Upload storage is full, try again later" });
      }

      const id = randomUUID();
      const rawName = (req.body.fileName || req.file.originalname || `upload_${id}`).toString();
      const filename = sanitizeUploadName(rawName, format === "jpeg" ? "jpg" : format);
      const ttlMs = 60 * 60 * 1000; // 1 hour
      uploadedFileStorage.set(id, {
        buffer: safeBuffer,
        mimeType,
        filename,
        expiresAt: now + ttlMs,
      });
      const timer = setTimeout(() => uploadedFileStorage.delete(id), ttlMs);
      timer.unref?.();

      res.json({
        success: true,
        data: { id, url: `/api/uploads/${id}`, filename, size: safeBuffer.length },
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ success: false, error: "Failed to save upload" });
    }
  });

  // Retrieve a previously uploaded image. Served with a safe, server-derived
  // mime type plus nosniff/CSP so a stored file can never execute as active
  // content in the browser.
  app.get("/api/uploads/:id", (req, res) => {
    const stored = uploadedFileStorage.get(req.params.id);
    if (!stored || stored.expiresAt < Date.now()) {
      if (stored) uploadedFileStorage.delete(req.params.id);
      return res.status(404).json({ success: false, error: "Upload not found or expired" });
    }
    res.setHeader('Content-Type', stored.mimeType);
    res.setHeader('Content-Disposition', contentDisposition('inline', stored.filename));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'no-cache');
    res.send(stored.buffer);
  });

  // Process file function
  async function processFile(jobId: number, file: Express.Multer.File, tool: any, fileName: string, toolType: ToolType, options: Record<string, any> = {}) {
    const startTime = Date.now();
    
    try {
      await storage.updateConversionJobStatus(jobId, "processing");

      // Calculate realistic processing time based on file size
      const fileSizeMB = file.size / (1024 * 1024);
      let baseProcessingTime: number;
      
      // Optimized processing times based on file size and tool type
      if (fileSizeMB < 1) {
        // Small files: 2-8 seconds
        baseProcessingTime = 2000 + (fileSizeMB * 3000);
      } else if (fileSizeMB < 5) {
        // Medium files: 5-20 seconds  
        baseProcessingTime = 5000 + ((fileSizeMB - 1) * 3750);
      } else if (fileSizeMB < 10) {
        // Large files: 20-40 seconds
        baseProcessingTime = 20000 + ((fileSizeMB - 5) * 4000);
      } else {
        // Very large files: 40-60 seconds max
        baseProcessingTime = Math.min(40000 + ((fileSizeMB - 10) * 2000), 60000);
      }
      
      // Tool-specific multipliers (some tools are inherently faster)
      const toolMultipliers: { [key: string]: number } = {
        'rotate': 0.3,     // PDF rotation is very fast
        'compress': 0.6,   // Compression is relatively fast
        'resize': 0.4,     // Image resizing is fast
        'crop': 0.3,       // Cropping is very fast
        'format': 0.5,     // Format conversion is medium speed
        'merge': 0.4,      // Merging is relatively fast
        'split': 0.4,      // Splitting is relatively fast
      };
      
      let multiplier = 1.0;
      for (const [keyword, mult] of Object.entries(toolMultipliers)) {
        if (toolType.toLowerCase().includes(keyword)) {
          multiplier = mult;
          break;
        }
      }
      
      const processingTime = Math.floor(baseProcessingTime * multiplier + Math.random() * 1000);
      
      // Store the file buffer for actual conversion
      fileStorage.set(jobId, file.buffer);
      touchJobBuffers(jobId);
      
      // Simulate realistic conversion with progress updates (shortened)
      await simulateConversionWithProgress(jobId, Math.min(processingTime, 3000), fileSizeMB);
      
      const inputName = fileName.substring(0, fileName.lastIndexOf('.'));
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      let outputExtension = tool.outputFormat === "same" ? fileExtension : tool.outputFormat;
      // "Convert Image Format" lets the user pick the target format.
      if (toolType === ToolType.CONVERT_IMAGE_FORMAT) {
        const allowedFormats: Record<string, string> = {
          png: "png",
          jpg: "jpg",
          jpeg: "jpg",
          webp: "webp",
          gif: "gif",
          avif: "avif",
          tiff: "tiff",
          tif: "tiff",
        };
        const requested = (options?.outputFormat || "png").toString().toLowerCase();
        outputExtension = allowedFormats[requested] || "png";
      }
      const outputFilename = `${inputName}_converted.${outputExtension}`;
      
      // PERFORM ACTUAL CONVERSION
      const conversionResult = await performActualConversion(
        file.buffer,
        fileName,
        toolType,
        outputFilename,
        options
      );

      // The raw input bytes are never read again after conversion — free them
      // immediately instead of letting them sit in RAM until download/TTL.
      fileStorage.delete(jobId);

      if (!conversionResult.success) {
        throw new Error(conversionResult.error || 'Conversion failed');
      }
      
      // Store the converted file
      if (conversionResult.convertedBuffer && conversionResult.mimeType) {
        convertedFileStorage.set(jobId, {
          buffer: conversionResult.convertedBuffer,
          mimeType: conversionResult.mimeType,
          filename: outputFilename
        });
        touchJobBuffers(jobId);

        // Also persist to durable object storage so the user can re-download
        // their result anytime — even after the in-memory copy is purged or the
        // server restarts. Best-effort: a storage failure must not fail the job
        // (the in-memory copy still serves the immediate download).
        try {
          await saveConvertedFile(jobId, conversionResult.convertedBuffer, conversionResult.mimeType);
        } catch (storageError) {
          console.error(`Failed to persist converted file for job ${jobId} to object storage:`, storageError);
        }
      }

      // OCR also returns the recognized text per page so the client can display,
      // copy, and export it alongside the searchable PDF. Persist it durably too
      // (best-effort) so the TXT/DOC/HTML/MD download formats can be rebuilt for
      // a later re-download — even after the in-memory copy is purged or the
      // server restarts. Without this, re-downloading an OCR ".txt" served the
      // PDF bytes under a .txt name (a broken file).
      if (conversionResult.pages) {
        ocrTextStorage.set(jobId, conversionResult.pages);
        touchJobBuffers(jobId);
        try {
          await saveOcrText(jobId, conversionResult.pages);
        } catch (storageError) {
          console.error(`Failed to persist OCR text for job ${jobId} to object storage:`, storageError);
        }
      }
      
      const actualProcessingTime = Date.now() - startTime;
      const outputFileSize = conversionResult.convertedBuffer?.length || file.size;

      // Update job status to completed with output filename
      await storage.updateConversionJobStatus(
        jobId,
        "completed",
        outputFilename,
        undefined,
        actualProcessingTime,
        outputFileSize
      );
      
      console.log(`Job ${jobId} completed successfully: ${outputFilename}`);

    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      // A failed job's buffers are useless — free them right away instead of
      // waiting for the TTL sweep.
      purgeJobBuffers(jobId);
      await storage.updateConversionJobStatus(
        jobId,
        "failed",
        undefined,
        `Processing failed: ${error instanceof Error ? error.message : 'Internal error'}`
      );
    }
  }

  // Get conversion job status
  app.get("/api/jobs/:jobId", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(String(req.params.jobId));
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid job ID"
        });
      }

      const job = await storage.getConversionJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: "Job not found"
        });
      }

      // Ownership: a job attributed to a user is private — only that user may
      // see its status/metadata. Guest jobs (userId null) stay open so anonymous
      // polling keeps working. IDs are sequential, so without this anyone could
      // enumerate and read another user's filenames.
      if (job.userId && req.user?.id !== job.userId) {
        return res.status(403).json({
          success: false,
          error: "You don't have access to this file."
        });
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          inputFilename: job.inputFilename,
          outputFilename: job.outputFilename,
          processingTime: job.processingTime,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          downloadUrl: job.status === "completed" && job.outputFilename 
            ? `/api/download/${job.id}` 
            : undefined
        }
      });
    } catch (error) {
      console.error(`Error fetching job:`, error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch job status",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get the OCR-recognized text for a completed OCR job (per page + joined).
  app.get("/api/ocr-text/:jobId", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(String(req.params.jobId));
      if (isNaN(jobId)) {
        return res.status(400).json({ success: false, error: "Invalid job ID" });
      }
      // Ownership: OCR text is the actual document content. A job attributed to a
      // user is private — only that user may read its recognized text. Guest jobs
      // (userId null) stay open. IDs are sequential, so without this anyone could
      // enumerate and read another user's extracted text.
      const job = await storage.getConversionJob(jobId);
      if (job && job.userId && req.user?.id !== job.userId) {
        return res.status(403).json({ success: false, error: "You don't have access to this file." });
      }
      // Prefer the fast in-memory copy; fall back to the durable object-storage
      // sidecar so the recognized text survives an in-memory purge / restart.
      const pages = await resolveOcrPages(jobId);
      if (!pages || pages.length === 0) {
        return res.status(404).json({ success: false, error: "No OCR text for this job" });
      }
      res.json({
        success: true,
        data: { pages, text: pages.join("\n\n") },
      });
    } catch (error) {
      console.error("Error fetching OCR text:", error);
      res.status(500).json({ success: false, error: "Failed to fetch OCR text" });
    }
  });

  // Get user's conversion history
  app.get("/api/jobs", async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }

      const jobs: any[] = []; // For now, return empty array - getAllConversionJobs method doesn't exist
      res.json({
        success: true,
        data: jobs,
        total: jobs.length
      });
    } catch (error) {
      console.error("Error fetching user jobs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch conversion history"
      });
    }
  });

  // Download converted file
  app.get("/api/download/:jobId", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(String(req.params.jobId));
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid job ID"
        });
      }

      const job = await storage.getConversionJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: "Job not found"
        });
      }

      // Ownership: a job attributed to a user is private — only that user may
      // download it. Guest jobs (userId null) stay open so anonymous immediate
      // downloads keep working. IDs are sequential, so without this anyone could
      // enumerate and download another user's files.
      if (job.userId && req.user?.id !== job.userId) {
        return res.status(403).json({
          success: false,
          error: "You don't have access to this file."
        });
      }

      if (job.status !== "completed" || !job.outputFilename) {
        return res.status(400).json({
          success: false,
          error: "File not ready for download"
        });
      }

      // Format-aware download for OCR results. An OCR job's primary output is the
      // searchable PDF (served by the passthrough below), but the user can also
      // download the recognized text as TXT/DOC/HTML/Markdown. The first download
      // builds those client-side; a later re-download (from history or the files
      // list) hits this endpoint, so the server rebuilds the SAME text file here.
      // Without this, the PDF bytes were served under a .txt name — a broken file.
      // Any non-text / absent format falls through to the passthrough unchanged.
      const requestedFormat = String(req.query.format || "").toLowerCase();
      if (OCR_EXPORT_FORMATS.has(requestedFormat)) {
        const pages = await resolveOcrPages(jobId);
        if (pages && pages.length > 0) {
          const fmt = requestedFormat as OcrExportFormat;
          const base = (job.outputFilename || `converted_file_${jobId}`).replace(/\.[^./]+$/, "");
          const textFilename = `${base}.${fmt}`;
          const body = Buffer.from(buildOcrContent(fmt, pages, base), "utf-8");
          res.setHeader('Content-Disposition', contentDisposition('attachment', textFilename));
          res.setHeader('Content-Type', OCR_FORMAT_MIME[fmt]);
          res.setHeader('Content-Length', body.length.toString());
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Disposition');
          console.log(`Serving OCR ${fmt} download for job ${jobId}: ${textFilename}`);
          res.send(body);
          return;
        }
        if (job.toolType === 'ocr_pdf') {
          // OCR job whose recognized text is no longer recoverable (an old job
          // from before text was persisted). Be honest with a 404 rather than
          // serving the PDF bytes under a text extension (a broken file).
          return res.status(404).json({
            success: false,
            error: "The recognized text for this file is no longer available. Please run OCR again.",
          });
        }
        // Not an OCR job — a tool that genuinely produced a .txt/.doc/etc file.
        // Fall through to the passthrough so it's served unchanged.
      }

      // Resolve the converted bytes. Prefer the fast in-memory copy; fall back to
      // durable object storage so downloads keep working anytime — after the
      // in-memory copy is purged or the server has restarted.
      const safeFilename = job.outputFilename || `converted_file_${jobId}.${job.toolType.includes('pdf') ? 'pdf' : 'txt'}`;
      let convertedBuffer: Buffer | undefined;
      let mimeType: string | undefined;

      const memoryCopy = convertedFileStorage.get(jobId);
      if (memoryCopy) {
        convertedBuffer = memoryCopy.buffer;
        mimeType = memoryCopy.mimeType;
      } else {
        try {
          const stored = await getConvertedFile(jobId);
          if (stored) {
            convertedBuffer = stored.buffer;
            mimeType = stored.contentType;
          }
        } catch (storageError) {
          console.error(`Failed to load converted file for job ${jobId} from object storage:`, storageError);
        }
      }

      if (!convertedBuffer) {
        return res.status(404).json({
          success: false,
          error: "Converted file not found"
        });
      }

      // Set headers for proper file download
      const properMimeType = mimeType || getMimeType(safeFilename);
      
      res.setHeader('Content-Disposition', contentDisposition('attachment', safeFilename));
      res.setHeader('Content-Type', properMimeType);
      res.setHeader('Content-Length', convertedBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Disposition');
      
      console.log(`Serving download for job ${jobId}: ${safeFilename} (${properMimeType})`);
      
      // Send the actual converted file
      res.send(convertedBuffer);
      
      // Free the in-memory copies after serving. The durable object-storage copy
      // is intentionally KEPT so the user can download this result again later.
      purgeJobBuffers(jobId);

    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({
        success: false,
        error: "Failed to download file"
      });
    }
  });

  // Delete a conversion's stored output. Removes the durable Backblaze copy, any
  // in-memory copies, and the job record so a deleted file isn't kept forever.
  // Ownership mirrors the download route: a user-owned job is only deletable by
  // its owner; guest jobs (userId null) stay open (IDs alone are the capability).
  app.delete("/api/download/:jobId", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(String(req.params.jobId));
      if (isNaN(jobId)) {
        return res.status(400).json({ success: false, error: "Invalid job ID" });
      }

      const job = await storage.getConversionJob(jobId);
      // Already gone (or never existed) — treat delete as idempotent success so
      // the client can clear its local entry without surfacing an error.
      if (!job) {
        return res.json({ success: true });
      }

      if (job.userId && req.user?.id !== job.userId) {
        return res.status(403).json({
          success: false,
          error: "You don't have access to this file.",
        });
      }

      // Purge the durable copy FIRST and make it authoritative: if the object
      // store genuinely fails (transient error), abort without removing the job
      // row so the file isn't silently orphaned forever — the client keeps its
      // entry and can retry. deleteConvertedFile is idempotent for a missing
      // object (no-op), so an already-gone durable copy still succeeds here.
      await deleteConvertedFile(jobId);

      purgeJobBuffers(jobId);
      await storage.deleteConversionJob(jobId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ success: false, error: "Failed to delete file" });
    }
  });

  // PDF Generator endpoint - Real-time PDF generation
  app.post("/api/generate-pdf", uploadMultiple.array('files', 10), async (req, res) => {
    let tempFilePaths: string[] = [];
    
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files uploaded. Please upload images or text files."
        });
      }

      // Validate file count
      if (files.length > 10) {
        return res.status(400).json({
          success: false,
          error: "Too many files. Maximum 10 files allowed."
        });
      }

      // Admin kill-switch: this legacy endpoint behaves like images-to-pdf,
      // so it honors the same pause switch.
      if (await storage.isToolPaused(ToolType.IMAGES_TO_PDF)) {
        return res.status(503).json({
          success: false,
          error: "This tool is temporarily unavailable. Please try again later."
        });
      }

      console.log(`Generating PDF from ${files.length} files...`);
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let pageCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}: ${file.originalname} (${file.mimetype})`);
        
        if (file.mimetype.startsWith('image/')) {
          // Process image file
          try {
            // Convert image to JPEG using sharp for consistency
            const processedImageBuffer = await sharp(file.buffer)
              .jpeg({
                quality: 90,
                progressive: false,
                mozjpeg: true
              })
              .resize(1200, 1600, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .toBuffer();
            
            // Embed image in PDF
            const image = await pdfDoc.embedJpg(processedImageBuffer);
            const imageDims = image.scale(1);
            
            // Calculate dimensions to fit page
            const pageWidth = 595.28; // A4 width in points
            const pageHeight = 841.89; // A4 height in points
            const margin = 50;
            
            const availableWidth = pageWidth - (margin * 2);
            const availableHeight = pageHeight - (margin * 2);
            
            const scaleX = availableWidth / imageDims.width;
            const scaleY = availableHeight / imageDims.height;
            const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
            
            const scaledWidth = imageDims.width * scale;
            const scaledHeight = imageDims.height * scale;
            
            // Center the image on the page
            const x = (pageWidth - scaledWidth) / 2;
            const y = (pageHeight - scaledHeight) / 2;
            
            // Add new page
            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            page.drawImage(image, {
              x,
              y,
              width: scaledWidth,
              height: scaledHeight,
            });
            
            pageCount++;
            console.log(`Added image page ${pageCount}: ${file.originalname}`);
            
          } catch (imageError) {
            console.error(`Error processing image ${file.originalname}:`, imageError);
            // Add error page
            const page = pdfDoc.addPage();
            page.drawText(`Error processing image: ${file.originalname}`, {
              x: 50,
              y: 750,
              size: 12,
              font: helveticaFont,
              color: rgb(1, 0, 0),
            });
            pageCount++;
          }
          
        } else if (file.mimetype === 'text/plain') {
          // Process text file
          try {
            const textContent = file.buffer.toString('utf8');
            const lines = textContent.split('\n');
            
            const pageWidth = 595.28;
            const pageHeight = 841.89;
            const margin = 50;
            const lineHeight = 14;
            const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
            
            // Add title page for text file
            let page = pdfDoc.addPage([pageWidth, pageHeight]);
            let yPosition = pageHeight - margin;
            
            // Add title
            page.drawText(`File: ${file.originalname}`, {
              x: margin,
              y: yPosition,
              size: 16,
              font: helveticaBold,
              color: rgb(0, 0, 0),
            });
            
            yPosition -= 30;
            
            // Add content
            let linesOnCurrentPage = 2; // Account for title
            
            for (const line of lines) {
              if (linesOnCurrentPage >= maxLinesPerPage) {
                // Start new page
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                yPosition = pageHeight - margin;
                linesOnCurrentPage = 0;
              }
              
              // Handle long lines by wrapping
              const maxCharsPerLine = 80;
              if (line.length > maxCharsPerLine) {
                const wrappedLines = [];
                for (let i = 0; i < line.length; i += maxCharsPerLine) {
                  wrappedLines.push(line.substr(i, maxCharsPerLine));
                }
                
                for (const wrappedLine of wrappedLines) {
                  if (linesOnCurrentPage >= maxLinesPerPage) {
                    page = pdfDoc.addPage([pageWidth, pageHeight]);
                    yPosition = pageHeight - margin;
                    linesOnCurrentPage = 0;
                  }
                  
                  page.drawText(wrappedLine, {
                    x: margin,
                    y: yPosition,
                    size: 10,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                  });
                  
                  yPosition -= lineHeight;
                  linesOnCurrentPage++;
                }
              } else {
                page.drawText(line, {
                  x: margin,
                  y: yPosition,
                  size: 10,
                  font: helveticaFont,
                  color: rgb(0, 0, 0),
                });
                
                yPosition -= lineHeight;
                linesOnCurrentPage++;
              }
            }
            
            pageCount++;
            console.log(`Added text content from: ${file.originalname}`);
            
          } catch (textError) {
            console.error(`Error processing text file ${file.originalname}:`, textError);
            // Add error page
            const page = pdfDoc.addPage();
            page.drawText(`Error processing text file: ${file.originalname}`, {
              x: 50,
              y: 750,
              size: 12,
              font: helveticaFont,
              color: rgb(1, 0, 0),
            });
            pageCount++;
          }
        }
      }
      
      if (pageCount === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid content could be processed from the uploaded files."
        });
      }
      
      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();
      
      // Create temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const timestamp = Date.now();
      const tempFileName = `generated-pdf-${timestamp}.pdf`;
      const tempFilePath = path.join(tempDir, tempFileName);
      tempFilePaths.push(tempFilePath);
      
      // Write PDF to temp file
      await fs.writeFile(tempFilePath, pdfBytes);
      
      console.log(`PDF generated successfully: ${tempFileName} (${pageCount} pages)`);
      
      // Set response headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', contentDisposition('attachment', tempFileName));
      res.setHeader('Content-Length', pdfBytes.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Send the PDF file directly
      res.send(Buffer.from(pdfBytes));
      
      // Clean up temp file after response
      setTimeout(async () => {
        try {
          for (const filePath of tempFilePaths) {
            await fs.unlink(filePath);
            console.log(`Cleaned up temp file: ${path.basename(filePath)}`);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up temp files:', cleanupError);
        }
      }, 5000); // Clean up after 5 seconds
      
    } catch (error) {
      console.error('PDF generation error:', error);
      
      // Clean up temp files on error
      try {
        for (const filePath of tempFilePaths) {
          await fs.unlink(filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temp files after error:', cleanupError);
      }
      
      res.status(500).json({
        success: false,
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // -------------- AUTHENTICATION ROUTES --------------
  
  // User registration
  app.post("/api/signup", authRateLimit(10), register);
  app.post("/api/auth/register", authRateLimit(10), register); // alias used by web AuthContext
  
  // User sign in
  app.post("/api/signin", authRateLimit(15), signin);
  app.post("/api/auth/login", authRateLimit(15), signin); // alias used by web AuthContext

  // Hidden admin dashboard API (env-var credentials, admin-scoped JWT).
  registerAdminRoutes(app, authRateLimit);

  // Step 2 of signup: verify the emailed OTP, which creates the account.
  app.post("/api/auth/verify-signup", authRateLimit(15), verifySignupOtp);
  app.post("/api/verify-signup", authRateLimit(15), verifySignupOtp); // alias

  // Google OAuth: public config (client ID for the web popup) + sign-in.
  app.get("/api/auth/google/config", googleConfig);
  app.post("/api/auth/google", authRateLimit(15), googleAuth);
  // Mobile (native) Google sign-in: system-browser redirect flow.
  app.get("/api/auth/google/mobile/start", googleMobileStart);
  app.get("/api/auth/google/mobile/callback", googleMobileCallback);
  
  // Protected route: Get current user (dashboard)
  app.get("/api/dashboard", authenticateUser, getCurrentUser);
  
  // Protected route: Get user profile
  app.get("/api/user", authenticateUser, getCurrentUser);
  app.get("/api/auth/user", authenticateUser, getCurrentUser); // alias

  // Profile management (protected)
  app.patch("/api/auth/profile", authenticateUser, updateProfile);
  app.post("/api/auth/change-password", authenticateUser, changePassword);

  // Password reset via emailed code (public)
  app.post("/api/auth/forgot-password", authRateLimit(5), forgotPassword);
  app.post("/api/auth/reset-password", authRateLimit(10), resetPassword);

  // Upload the signed-in user's profile picture. Stored in object storage and
  // served back via GET /api/auth/avatar/:userId.
  app.post(
    "/api/auth/avatar",
    authenticateUser,
    imageUpload.single("avatar"),
    async (req, res) => {
      try {
        const userId = req.user!.id;
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: "No image file provided (expected field 'avatar', image/* only)",
          });
        }

        // Normalise through Sharp to strip metadata/active content and cap size.
        const processed = await sharp(req.file.buffer)
          .rotate()
          .resize(512, 512, { fit: "cover" })
          .jpeg({ quality: 88 })
          .toBuffer();

        await saveAvatar(userId, processed, "image/jpeg");

        // Cache-busting query param so clients refetch the new image immediately.
        const profilePictureUrl = `/api/auth/avatar/${userId}?v=${Date.now()}`;
        const updated = await storage.updateUserProfilePicture(userId, profilePictureUrl);
        if (!updated) {
          return res.status(404).json({ success: false, error: "User not found" });
        }

        const { passwordHash: _, ...userWithoutPassword } = updated;
        return res.status(200).json({
          success: true,
          data: { user: userWithoutPassword, profilePictureUrl },
          message: "Profile picture updated",
        });
      } catch (error) {
        req.log?.error?.({ err: error }, "Avatar upload failed");
        return res.status(500).json({ success: false, error: "Failed to upload avatar" });
      }
    },
  );

  // Remove the signed-in user's avatar: delete the stored image and clear the
  // profile_picture_url column so clients fall back to the initials placeholder.
  app.delete("/api/auth/avatar", authenticateUser, async (req, res) => {
    try {
      const userId = req.user!.id;
      await deleteAvatar(userId);
      const updated = await storage.updateUserProfilePicture(userId, "");
      if (!updated) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      const { passwordHash: _, ...userWithoutPassword } = updated;
      return res.status(200).json({
        success: true,
        data: { user: userWithoutPassword },
        message: "Profile picture removed",
      });
    } catch (error) {
      req.log?.error?.({ err: error }, "Avatar delete failed");
      return res.status(500).json({ success: false, error: "Failed to remove avatar" });
    }
  });

  // Serve a user's avatar image (public read — low-sensitivity profile picture).
  app.get("/api/auth/avatar/:userId", async (req, res) => {
    try {
      const stored = await getAvatar(req.params.userId);
      if (!stored) {
        return res.status(404).json({ success: false, error: "No avatar set" });
      }
      res.setHeader("Content-Type", stored.contentType);
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.send(stored.buffer);
    } catch (error) {
      req.log?.error?.({ err: error }, "Avatar fetch failed");
      return res.status(500).json({ success: false, error: "Failed to load avatar" });
    }
  });

  // API health check
  // ---------------------------------------------------------------------------
  // API PLATFORM: key management, usage analytics, and the public REST API.
  // ---------------------------------------------------------------------------

  // --- API key management (dashboard, JWT-authenticated) ---------------------

  // Create a new API key. The raw `sk-...` key is returned exactly ONCE; only a
  // sha256 hash + last 4 chars are persisted.
  app.post("/api/keys", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      const rawName = (req.body?.name ?? "").toString().trim();
      const name = rawName ? rawName.slice(0, 60) : null;

      const existing = await storage.getUserApiKeys(userId);
      if (existing.length >= 3) {
        return res.status(400).json({
          success: false,
          error: "You have reached the maximum of 3 API keys. Revoke one to create another."
        });
      }

      const rawKey = generateApiKey();
      const created = await storage.createApiKey({
        userId,
        apiKey: hashApiKey(rawKey),
        name,
        keyLast4: rawKey.slice(-4),
      });

      await notifyUser(userId, {
        type: "security",
        title: "New API key created",
        body: name
          ? `Your API key "${name}" is ready. Keep it secret — it grants access to your account.`
          : "A new API key is ready. Keep it secret — it grants access to your account.",
        link: "/dashboard/api-setup",
      });

      return res.status(201).json({
        success: true,
        data: {
          id: created.id,
          name: created.name,
          apiKey: rawKey, // shown once
          maskedKey: `sk-...${created.keyLast4}`,
          createdAt: created.createdAt,
        },
        message: "Copy your API key now — it won't be shown again."
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      return res.status(500).json({ success: false, error: "Failed to create API key" });
    }
  });

  // List the signed-in user's API keys (masked — the raw key is never returned).
  app.get("/api/keys", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      const keys = await storage.getUserApiKeys(userId);
      const data = keys
        .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
        .map((k) => ({
          id: k.id,
          name: k.name,
          maskedKey: k.keyLast4 ? `sk-...${k.keyLast4}` : "sk-••••",
          createdAt: k.createdAt,
          lastUsedAt: k.lastUsedAt,
        }));
      return res.json({ success: true, data });
    } catch (error) {
      console.error("Error listing API keys:", error);
      return res.status(500).json({ success: false, error: "Failed to list API keys" });
    }
  });

  // Revoke (hard-delete) an API key. Ownership is enforced.
  app.delete("/api/keys/:id", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      const key = await storage.getApiKeyById(String(req.params.id));
      if (!key || key.userId !== userId) {
        return res.status(404).json({ success: false, error: "API key not found" });
      }
      await storage.deleteApiKey(key.id);
      return res.json({ success: true, message: "API key revoked" });
    } catch (error) {
      console.error("Error revoking API key:", error);
      return res.status(500).json({ success: false, error: "Failed to revoke API key" });
    }
  });

  // --- Notifications (dashboard, JWT-authenticated) --------------------------

  // List the signed-in user's notifications (most recent first). The one-time
  // welcome notification is ensured lazily so existing accounts also see a real
  // message without any seeded/mock data.
  app.get("/api/notifications", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      await ensureWelcomeNotification(userId);
      const items = await storage.getUserNotifications(userId, 30);
      return res.json({ success: true, data: items });
    } catch (error) {
      console.error("Error listing notifications:", error);
      return res.status(500).json({ success: false, error: "Failed to load notifications" });
    }
  });

  // Unread badge count.
  app.get("/api/notifications/unread-count", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      await ensureWelcomeNotification(userId);
      const count = await storage.getUnreadNotificationCount(userId);
      return res.json({ success: true, data: { count } });
    } catch (error) {
      console.error("Error counting notifications:", error);
      return res.status(500).json({ success: false, error: "Failed to load notifications" });
    }
  });

  // Mark a single notification read. Ownership is enforced.
  app.post("/api/notifications/:id/read", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      const ok = await storage.markNotificationRead(String(req.params.id), userId);
      if (!ok) {
        return res.status(404).json({ success: false, error: "Notification not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      return res.status(500).json({ success: false, error: "Failed to update notification" });
    }
  });

  // Mark all of the user's notifications read.
  app.post("/api/notifications/read-all", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      await storage.markAllNotificationsRead(userId);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      return res.status(500).json({ success: false, error: "Failed to update notifications" });
    }
  });

  // --- Usage analytics (dashboard, JWT-authenticated) ------------------------

  // Real aggregates computed from the signed-in user's conversion jobs.
  app.get("/api/usage", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      const [jobs, keys, tools] = await Promise.all([
        storage.getUserConversionJobs(userId),
        storage.getUserApiKeys(userId),
        storage.getAllTools(),
      ]);

      const nameByType: Record<string, string> = {};
      for (const t of tools) nameByType[t.type] = t.name;

      const total = jobs.length;
      const completed = jobs.filter((j) => j.status === "completed").length;
      const failed = jobs.filter((j) => j.status === "failed").length;
      const apiCalls = jobs.filter((j) => j.source === "api").length;
      const webCalls = total - apiCalls;
      const successRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
      const dataProcessed = jobs.reduce((sum, j) => sum + (j.outputFileSize || 0), 0);

      const counts: Record<string, number> = {};
      for (const j of jobs) counts[j.toolType] = (counts[j.toolType] || 0) + 1;
      const mostUsed = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([type, count]) => ({ type, name: nameByType[type] || type, count }));

      const recent = [...jobs]
        .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
        .slice(0, 8)
        .map((j) => ({
          id: j.id,
          toolType: j.toolType,
          toolName: nameByType[j.toolType] || j.toolType,
          inputFilename: j.inputFilename,
          outputFilename: j.outputFilename,
          status: j.status,
          source: j.source,
          createdAt: j.createdAt,
        }));

      // Per-day breakdown for the last 14 days (oldest -> newest), so charts can
      // plot real activity. Days with no conversions are included with count 0.
      const DAY_WINDOW = 14;
      const toLocalDateKey = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      const dayCounts: Record<string, number> = {};
      for (const j of jobs) {
        if (!j.createdAt) continue;
        const created = new Date(j.createdAt as any);
        if (Number.isNaN(created.getTime())) continue;
        const key = toLocalDateKey(created);
        dayCounts[key] = (dayCounts[key] || 0) + 1;
      }
      const byDay: { date: string; count: number }[] = [];
      const today = new Date();
      for (let i = DAY_WINDOW - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = toLocalDateKey(d);
        byDay.push({ date: key, count: dayCounts[key] || 0 });
      }

      return res.json({
        success: true,
        data: {
          totals: { total, completed, failed, apiCalls, webCalls, successRate, dataProcessed, activeKeys: keys.length },
          mostUsed,
          byDay,
          recent,
        },
      });
    } catch (error) {
      console.error("Error computing usage:", error);
      return res.status(500).json({ success: false, error: "Failed to compute usage statistics" });
    }
  });

  // --- Subscription plans ----------------------------------------------------

  // Public plan catalog: the single source of truth shared by web and mobile.
  app.get("/api/plans", (_req, res) => {
    return res.json({ success: true, data: { plans: PLANS } });
  });

  // Self-service plan endpoint, now restricted to downgrading to the free plan.
  // Upgrades to paid plans go through Dodo checkout; cancellations go through the
  // Dodo customer portal (both reconcile via the billing webhook).
  app.post("/api/account/plan", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      const planId = String((req.body?.planId ?? "")).trim();
      const plan = getPlan(planId);
      if (!plan) {
        return res.status(400).json({ success: false, error: "Unknown plan" });
      }
      // Paid plans must be purchased through Dodo checkout — never flip a user to
      // a paid plan for free. This closes the previous monetization hole where any
      // logged-in user could self-assign the business plan.
      if (plan.id !== "free") {
        return res.status(400).json({
          success: false,
          error: "Use checkout to upgrade to a paid plan.",
        });
      }
      // Downgrading to free: if the user still has an active Dodo subscription
      // they must cancel it through the billing portal — the webhook then flips
      // them to free. This keeps our plan state in lockstep with Dodo.
      const current = await storage.getUserById(userId);
      if ((current as any)?.dodoSubscriptionId) {
        return res.status(400).json({
          success: false,
          error: "Manage or cancel your subscription from the billing portal.",
        });
      }
      const user = await storage.updateUserPlan(userId, plan.id);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      return res.json({ success: true, data: { user, plan } });
    } catch (error) {
      console.error("Error updating plan:", error);
      return res.status(500).json({ success: false, error: "Failed to update plan" });
    }
  });

  // Reconcile the signed-in user's RevenueCat purchases into our database. The
  // mobile client calls this right after a purchase/restore (and on launch) so
  // active subscriptions activate the plan and credit packs top up the balance
  // in real time. The RevenueCat customer id is the user's id (the client calls
  // Purchases.logIn(userId) before buying). Returns the up-to-date plan + credit
  // balance so the client can refresh immediately.
  app.post("/api/revenuecat/sync", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      const result = await syncRevenueCatCustomer(userId);
      const user = await storage.getUserById(userId);
      return res.json({ success: true, data: { ...result, user } });
    } catch (error) {
      console.error("Error syncing RevenueCat customer:", error);
      return res
        .status(502)
        .json({ success: false, error: "Failed to sync purchases" });
    }
  });

  // --- Billing (Dodo Payments) ----------------------------------------------

  // Whether the web billing flow is live (api key + at least one product id set).
  // Also advertises the pay-as-you-go credits config so the Buy Credits page can
  // show presets/limits and enable the buy button only when it's configured.
  app.get("/api/billing/config", (_req, res) => {
    return res.json({
      success: true,
      data: {
        enabled: isBillingConfigured(),
        credits: {
          enabled: isCreditsConfigured(),
          creditsPerUsd: CREDITS_PER_USD,
          minUsd: MIN_CREDITS_USD,
          maxUsd: MAX_CREDITS_USD,
        },
      },
    });
  });

  // Start a hosted Dodo checkout to buy a custom-dollar amount of credits.
  // Credits are granted only when Dodo's payment.succeeded webhook fires.
  app.post("/api/billing/credits-checkout", authenticateUser, async (req, res) => {
    try {
      if (!isCreditsConfigured()) {
        return res.status(503).json({
          success: false,
          error: "Credit purchases are not configured yet.",
        });
      }
      const userId = (req as any).user.id as string;
      const amountUsd = Number(req.body?.amountUsd);
      if (!Number.isFinite(amountUsd) || amountUsd < MIN_CREDITS_USD) {
        return res.status(400).json({
          success: false,
          error: `Enter an amount of at least $${MIN_CREDITS_USD}.`,
        });
      }
      if (amountUsd > MAX_CREDITS_USD) {
        return res.status(400).json({
          success: false,
          error: `The maximum per purchase is $${MAX_CREDITS_USD}.`,
        });
      }
      // Round to whole cents; credits scale with the exact dollar amount.
      const amountCents = Math.round(amountUsd * 100);
      const credits = Math.round((amountCents / 100) * CREDITS_PER_USD);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      const origin = appOrigin(req);
      const { url } = await createCreditCheckout({
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          dodoCustomerId: (user as any).dodoCustomerId ?? null,
        },
        amountCents,
        credits,
        returnUrl: `${origin}/dashboard/buy-credits?checkout=credits-success`,
        cancelUrl: `${origin}/dashboard/buy-credits?checkout=cancelled`,
      });
      return res.json({ success: true, data: { url } });
    } catch (error) {
      console.error("Error creating credits checkout:", error);
      return res
        .status(502)
        .json({ success: false, error: "Could not start checkout." });
    }
  });

  // Start a hosted Dodo checkout for a paid plan. Returns the checkout URL the
  // browser should redirect to. The plan only changes once Dodo's webhook fires.
  app.post("/api/billing/checkout", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      const planId = String(req.body?.planId ?? "").trim();
      const period: "month" | "year" =
        String(req.body?.period ?? "month").trim().toLowerCase() === "year"
          ? "year"
          : "month";
      const plan = getPlan(planId);
      if (!plan || plan.id === "free") {
        return res.status(400).json({ success: false, error: "Choose a paid plan." });
      }
      if (!getProductIdForPlan(plan.id, period)) {
        return res.status(503).json({
          success: false,
          error: "Billing is not configured for this plan yet.",
        });
      }
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      // A user with an active subscription must change plans through the portal,
      // never start a second checkout (which would create a duplicate sub).
      if ((user as any).dodoSubscriptionId) {
        return res.status(400).json({
          success: false,
          error:
            "You already have an active subscription. Manage it from the billing portal.",
        });
      }
      const origin = appOrigin(req);
      const { url } = await createCheckoutForPlan({
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          dodoCustomerId: (user as any).dodoCustomerId ?? null,
        },
        planId: plan.id,
        period,
        returnUrl: `${origin}/dashboard/manage-plans?checkout=success`,
        cancelUrl: `${origin}/dashboard/manage-plans?checkout=cancelled`,
      });
      return res.json({ success: true, data: { url } });
    } catch (error) {
      console.error("Error creating checkout:", error);
      return res.status(502).json({ success: false, error: "Could not start checkout." });
    }
  });

  // Open a Dodo customer portal session so the user can update payment details,
  // switch plans or cancel. Requires an existing Dodo customer.
  app.post("/api/billing/portal", authenticateUser, async (req, res) => {
    try {
      const userId = (req as any).user.id as string;
      const user = await storage.getUserById(userId);
      const customerId = (user as any)?.dodoCustomerId as string | undefined;
      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: "No billing account yet — upgrade to a paid plan first.",
        });
      }
      const origin = appOrigin(req);
      const { url } = await createPortalSession(
        customerId,
        `${origin}/dashboard/manage-plans`,
      );
      return res.json({ success: true, data: { url } });
    } catch (error) {
      console.error("Error creating billing portal session:", error);
      return res
        .status(502)
        .json({ success: false, error: "Could not open billing portal." });
    }
  });

  // Dodo webhook receiver. No auth — authenticity is proven by the Standard
  // Webhooks HMAC signature, verified against DODO_PAYMENTS_WEBHOOK_KEY using the
  // RAW request body (captured in app.ts).
  app.post("/api/billing/dodo/webhook", async (req, res) => {
    try {
      const raw = (req as any).rawBody;
      const rawBody =
        raw instanceof Buffer
          ? raw.toString("utf8")
          : typeof raw === "string"
            ? raw
            : JSON.stringify(req.body ?? {});
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === "string") headers[k] = v;
        else if (Array.isArray(v)) headers[k] = v.join(",");
      }
      const event = await verifyWebhook(rawBody, headers);
      await handleWebhookEvent(event);
      return res.json({ received: true });
    } catch (error) {
      console.error("Dodo webhook error:", error);
      // 400 so Dodo retries on transient failures, but never leak detail.
      return res.status(400).json({ received: false });
    }
  });

  // --- Public REST API (API-key authenticated) ------------------------------
  //
  // POST /api/v1/:toolType  (multipart/form-data)
  //   - field "file"  : the input file (use multiple "files" fields for merge_pdfs)
  //   - field "options": optional JSON string of conversion options
  //   - also accepts "outputFormat" / "quality" as convenience fields
  //
  // Synchronous: authenticates, converts, and streams the result back directly.
  // Auth runs BEFORE multipart parsing so unauthenticated requests are cheap.
  app.post(
    "/api/v1/:toolType",
    authenticateApiKey,
    // Tool-aware upload guard. We resolve the tool BEFORE parsing so multer can
    // enforce a tight per-request memory bound: non-merge tools accept exactly
    // one file capped at the tool's own maxFileSize; merge_pdfs accepts up to 20.
    // This prevents an authenticated caller from buffering many oversized files.
    async (req, res, next) => {
      try {
        const toolTypeParam = String(req.params.toolType);
        // Documented-but-offline public API tools. These are advertised in the
        // API reference but have no live endpoint yet, so we reject them with a
        // clear "offline" status instead of attempting a conversion. Keep this
        // in sync with OFFLINE_TOOL_TYPES in the web APIReference page.
        if (OFFLINE_API_TOOLS.has(toolTypeParam)) {
          return res.status(503).json({
            success: false,
            status: "offline",
            error: `The "${toolTypeParam}" API is currently offline.`,
          });
        }
        if (!Object.values(ToolType).includes(toolTypeParam as ToolType)) {
          return res.status(404).json({
            success: false,
            error: `Unknown tool "${toolTypeParam}".`,
            availableTools: Object.values(ToolType),
          });
        }
        const toolType = toolTypeParam as ToolType;
        const tool = await storage.getToolByType(toolType);
        if (!tool) {
          return res.status(404).json({ success: false, error: "Tool not found" });
        }

        // Admin kill-switch: paused tools reject new conversions immediately.
        if (await storage.isToolPaused(toolType)) {
          return res.status(503).json({
            success: false,
            status: "offline",
            error: "This tool is temporarily unavailable. Please try again later.",
          });
        }

        const isMerge = toolType === ToolType.MERGE_PDFS;
        const maxFilesAllowed = isMerge ? 20 : 1;
        const uploader = multer({
          storage: multer.memoryStorage(),
          limits: {
            fileSize: tool.maxFileSize * 1024 * 1024, // per-file, the tool's own cap
            files: maxFilesAllowed,
          },
        });

        // Stash resolved values so the handler doesn't re-look them up.
        (req as any).resolvedTool = tool;
        (req as any).resolvedToolType = toolType;

        uploader.any()(req, res, (err: any) => {
          if (err) {
            let msg = err instanceof Error ? err.message : "Upload failed";
            if (err instanceof multer.MulterError) {
              if (err.code === "LIMIT_FILE_SIZE") msg = `File exceeds the ${tool.maxFileSize}MB limit.`;
              else if (err.code === "LIMIT_FILE_COUNT") {
                msg = isMerge ? "Too many files (max 20)." : `${toolType} expects exactly one file (field "file").`;
              }
            }
            return res.status(400).json({ success: false, error: msg });
          }
          next();
        });
      } catch (e) {
        return res.status(500).json({ success: false, error: "Failed to prepare upload" });
      }
    },
    async (req, res) => {
      try {
        const userId = (req as any).user.id as string;
        const toolType = (req as any).resolvedToolType as ToolType;
        const tool = (req as any).resolvedTool;

        const files = (req.files as Express.Multer.File[]) || [];
        if (files.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No file uploaded. Send the file in a multipart "file" field.',
          });
        }

        // Parse options (JSON string) plus convenience scalar fields.
        let options: Record<string, any> = {};
        if (req.body?.options) {
          try {
            options = typeof req.body.options === "string" ? JSON.parse(req.body.options) : req.body.options;
          } catch {
            return res.status(400).json({ success: false, error: '"options" must be valid JSON.' });
          }
        }
        if (req.body?.outputFormat && options.outputFormat === undefined) options.outputFormat = req.body.outputFormat;
        if (req.body?.quality !== undefined && options.quality === undefined) options.quality = Number(req.body.quality);

        const maxBytes = tool.maxFileSize * 1024 * 1024;
        const startTime = Date.now();

        // --- merge_pdfs: combine >=2 PDFs into one ---------------------------
        if (toolType === ToolType.MERGE_PDFS) {
          if (files.length < 2) {
            return res.status(400).json({ success: false, error: "merge_pdfs requires at least 2 PDF files." });
          }
          const buffers: Buffer[] = [];
          for (const f of files) {
            if (f.size > maxBytes) {
              return res.status(400).json({ success: false, error: `"${f.originalname}" exceeds the ${tool.maxFileSize}MB limit.` });
            }
            const isPdfMagic = f.buffer.subarray(0, 5).toString("latin1").startsWith("%PDF");
            if (!isPdfMagic) {
              return res.status(400).json({ success: false, error: `"${f.originalname}" is not a valid PDF file.` });
            }
            buffers.push(f.buffer);
          }

          const outputFilename = "merged.pdf";
          let result;
          try {
            result = await mergePdfs(buffers, outputFilename);
          } catch (e) {
            result = { success: false, error: e instanceof Error ? e.message : "Merge failed" } as any;
          }

          if (!result.success || !result.convertedBuffer || result.convertedBuffer.length === 0) {
            await storage.createConversionJob({
              userId, toolType, status: "failed", source: "api",
              inputFilename: files.map((f) => f.originalname).join(", ").slice(0, 255),
              inputFileSize: files.reduce((s, f) => s + f.size, 0),
              outputFilename: null, outputFileSize: null,
              processingTime: Date.now() - startTime,
              errorMessage: result.error || "Merge failed",
            });
            return res.status(422).json({ success: false, error: result.error || "Merge failed" });
          }

          await storage.createConversionJob({
            userId, toolType, status: "completed", source: "api",
            inputFilename: files.map((f) => f.originalname).join(", ").slice(0, 255),
            inputFileSize: files.reduce((s, f) => s + f.size, 0),
            outputFilename, outputFileSize: result.convertedBuffer.length,
            processingTime: Date.now() - startTime, errorMessage: null,
          });

          res.setHeader("Content-Disposition", contentDisposition('attachment', outputFilename));
          res.setHeader("Content-Type", result.mimeType || "application/pdf");
          res.setHeader("Content-Length", String(result.convertedBuffer.length));
          return res.status(200).send(result.convertedBuffer);
        }

        // --- all other tools: exactly one file ------------------------------
        if (files.length !== 1) {
          return res.status(400).json({ success: false, error: `${toolType} expects exactly one file (field "file").` });
        }
        const file = files[0];

        if (file.size > maxBytes) {
          return res.status(400).json({ success: false, error: `File exceeds the ${tool.maxFileSize}MB limit.` });
        }
        const fileExtension = file.originalname.split(".").pop()?.toLowerCase();
        if (!fileExtension || !tool.inputFormats.includes(fileExtension)) {
          return res.status(400).json({ success: false, error: `Unsupported file format. Supported: ${tool.inputFormats.join(", ")}` });
        }

        // Derive the output filename exactly like the in-app flow.
        const inputName = file.originalname.includes(".")
          ? file.originalname.substring(0, file.originalname.lastIndexOf("."))
          : file.originalname;
        let outputExtension = tool.outputFormat === "same" ? fileExtension : tool.outputFormat;
        if (toolType === ToolType.CONVERT_IMAGE_FORMAT) {
          const allowedFormats: Record<string, string> = {
            png: "png", jpg: "jpg", jpeg: "jpg", webp: "webp", gif: "gif", avif: "avif", tiff: "tiff", tif: "tiff",
          };
          const requested = (options?.outputFormat || "png").toString().toLowerCase();
          outputExtension = allowedFormats[requested] || "png";
        }
        const outputFilename = `${inputName}_converted.${outputExtension}`;

        let result;
        try {
          result = await performActualConversion(file.buffer, file.originalname, toolType, outputFilename, options);
        } catch (e) {
          result = { success: false, error: e instanceof Error ? e.message : "Conversion failed" } as any;
        }

        if (!result.success || !result.convertedBuffer) {
          await storage.createConversionJob({
            userId, toolType, status: "failed", source: "api",
            inputFilename: file.originalname, inputFileSize: file.size,
            outputFilename: null, outputFileSize: null,
            processingTime: Date.now() - startTime,
            errorMessage: result.error || "Conversion failed",
          });
          return res.status(422).json({ success: false, error: result.error || "Conversion failed" });
        }

        await storage.createConversionJob({
          userId, toolType, status: "completed", source: "api",
          inputFilename: file.originalname, inputFileSize: file.size,
          outputFilename, outputFileSize: result.convertedBuffer.length,
          processingTime: Date.now() - startTime, errorMessage: null,
        });

        res.setHeader("Content-Disposition", contentDisposition('attachment', outputFilename));
        res.setHeader("Content-Type", result.mimeType || getMimeType(outputFilename));
        res.setHeader("Content-Length", String(result.convertedBuffer.length));
        return res.status(200).send(result.convertedBuffer);
      } catch (error) {
        console.error("Public API conversion error:", error);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            error: "Conversion failed",
            details: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }
  );

  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      message: "PDF Conversion API is running",
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

  // API documentation endpoint
  app.get("/api/docs", (req, res) => {
    res.json({
      success: true,
      message: "PDF Conversion API Documentation",
      endpoints: {
        "GET /api/tools": "Get all available tools",
        "GET /api/tools/category/:category": "Get tools by category", 
        "GET /api/tools/:toolType": "Get specific tool details",
        "POST /api/convert": "Start file conversion job (in-app, async)",
        "POST /api/generate-pdf": "Generate PDF from images/text (real-time)",
        "GET /api/jobs/:jobId": "Get job status",
        "GET /api/jobs": "Get user's job history",
        "GET /api/download/:jobId": "Download converted file",
        "GET /api/health": "API health check",
        "GET /api/docs": "API documentation"
      },
      publicApi: {
        description: "Public REST API authenticated with an API key (Authorization: Bearer sk-...). Synchronous: returns the converted file bytes directly.",
        "POST /api/v1/:toolType": "Convert a file. multipart/form-data with a 'file' field (use multiple 'files' for merge_pdfs), optional 'options' JSON.",
        availableTools: Object.values(ToolType),
        authentication: "Authorization: Bearer <your-api-key>",
      },
      keyManagement: {
        description: "Manage API keys (requires a logged-in session token, Authorization: Bearer <jwt>).",
        "POST /api/keys": "Create a new API key (raw key returned once)",
        "GET /api/keys": "List your API keys (masked)",
        "DELETE /api/keys/:id": "Revoke an API key",
        "GET /api/usage": "Usage statistics for your account",
      },
      version: "1.0.0"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}