import React, { useEffect, useRef, useState } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { Download, RotateCcw, FileText, ScanText, X } from "lucide-react";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PdfToolLayout, PdfDropzone } from "@/components/pdf-tools/PdfToolShell";
import {
  readFileBytes,
  loadPdfDocument,
  downloadPdf,
  downloadText,
  downloadBytes,
  dataUrlToBytes,
  stripExt,
  isPdfFile,
} from "@/lib/pdfClient";
import { toolConfigs } from "@/lib/toolConfig";

class UnsupportedGlyphError extends Error {}

const BENGALI_RE = /[\u0980-\u09FF]/;

// Embedded only when Bangla is selected; both packages and the font file are
// loaded lazily so English-only OCR never pays for them.
async function loadBengaliFont(): Promise<{ fontkit: any; bytes: ArrayBuffer }> {
  const base: any = (await import("@pdf-lib/fontkit")).default;
  // The hidden text layer must carry text in LOGICAL order so extractors
  // (pdftotext, PDF.js) return the same Bangla that was recognised. fontkit's
  // Indic shaping reorders glyphs into visual order, so the adapter lays out
  // glyphs one per code point instead. Positioning is irrelevant because the
  // layer is invisible; the subset font and ToUnicode mapping are unchanged.
  const fontkit = {
    ...base,
    create(data: Uint8Array, postscriptName?: string) {
      const font = base.create(data, postscriptName);
      return new Proxy(font, {
        get(target, prop, receiver) {
          if (prop === "layout") {
            return (text: string) => {
              const glyphs = Array.from(text, (c) => target.glyphForCodePoint(c.codePointAt(0) as number));
              const positions = glyphs.map((g: { advanceWidth: number }) => ({
                xAdvance: g.advanceWidth,
                yAdvance: 0,
                xOffset: 0,
                yOffset: 0,
              }));
              return { glyphs, positions };
            };
          }
          const v = Reflect.get(target, prop, target);
          return typeof v === "function" ? v.bind(target) : v;
        },
      });
    },
  };
  const url: string = (await import("@/assets/fonts/NotoSansBengali-Regular.ttf?url")).default;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Bangla font could not be loaded");
  return { fontkit, bytes: await res.arrayBuffer() };
}

const cfg = toolConfigs["ocr-pdf"];

const OCR_SCALE = 2; // render pages at 2x for better recognition
const LANGUAGES: { code: string; label: string }[] = [
  { code: "eng", label: "English" },
  { code: "ben", label: "Bangla" },
  { code: "eng+ben", label: "English + Bangla" },
  { code: "spa", label: "Spanish" },
  { code: "fra", label: "French" },
  { code: "deu", label: "German" },
  { code: "por", label: "Portuguese" },
  { code: "ita", label: "Italian" },
];

interface OcrWord {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface PageResult {
  width: number; // points
  height: number; // points
  imgDataUrl: string; // JPEG raster of the page
  imgScale: number; // px-per-point used when rasterising
  words: OcrWord[];
  text: string;
}

// Tesseract's word data lives under data.words in some versions and inside
// data.blocks → paragraphs → lines → words in others. Handle both.
function extractWords(data: any): OcrWord[] {
  const out: OcrWord[] = [];
  const push = (w: any) => {
    if (!w?.text?.trim() || !w.bbox) return;
    out.push({
      text: w.text,
      x0: w.bbox.x0,
      y0: w.bbox.y0,
      x1: w.bbox.x1,
      y1: w.bbox.y1,
    });
  };
  if (Array.isArray(data?.words) && data.words.length) {
    data.words.forEach(push);
    return out;
  }
  for (const block of data?.blocks ?? []) {
    for (const para of block?.paragraphs ?? []) {
      for (const line of para?.lines ?? []) {
        for (const w of line?.words ?? []) push(w);
      }
    }
  }
  return out;
}

export function OcrPdfUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [language, setLanguage] = useState("eng");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<PageResult[] | null>(null);

  const cancelRef = useRef(false);
  const workerRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // On unmount: stop any in-flight OCR and tear the worker down so recognition
  // can't keep running (or call setState/toast) after the page is gone.
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cancelRef.current = true;
      if (workerRef.current) {
        try {
          workerRef.current.terminate();
        } catch {}
        workerRef.current = null;
      }
    };
  }, []);

  const onFile = async (f: File) => {
    if (!isPdfFile(f)) {
      toast({ title: "Please choose a PDF file", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const b = await readFileBytes(f);
      const doc = await loadPdfDocument(b);
      setNumPages(doc.numPages);
      await doc.loadingTask.destroy();
      setBytes(b);
      setFile(f);
      setResults(null);
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not open PDF",
        description: "The file may be corrupt or password-protected.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runOcr = async () => {
    if (!bytes) return;
    setRunning(true);
    cancelRef.current = false;
    setResults(null);
    try {
      const Tesseract: any = await import("tesseract.js");
      setProgress("Loading language data…");
      const worker = await Tesseract.createWorker(language, 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setProgress(
              (prev) => prev.replace(/\s*\(\d+%\)$/, "") + ` (${Math.round(m.progress * 100)}%)`,
            );
          }
        },
      });
      workerRef.current = worker;

      const doc = await loadPdfDocument(bytes);
      const pageResults: PageResult[] = [];
      try {
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelRef.current) break;
          setProgress(`Recognising page ${i} of ${doc.numPages}`);
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: OCR_SCALE });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          page.cleanup();

          const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true });
          pageResults.push({
            width: base.width,
            height: base.height,
            imgDataUrl: canvas.toDataURL("image/jpeg", 0.8),
            imgScale: OCR_SCALE,
            words: extractWords(data),
            text: data.text ?? "",
          });
        }
      } finally {
        await doc.loadingTask.destroy();
      }

      await worker.terminate();
      workerRef.current = null;

      if (!mountedRef.current) return;
      if (cancelRef.current) {
        setProgress("");
        toast({ title: "OCR cancelled" });
        return;
      }
      setResults(pageResults);
      setProgress("");
      toast({
        title: "OCR complete",
        description: `Recognised ${pageResults.length} page(s).`,
      });
    } catch (e) {
      console.error(e);
      if (mountedRef.current) {
        toast({
          title: "OCR failed",
          description: "Could not recognise text in this PDF.",
          variant: "destructive",
        });
      }
    } finally {
      if (workerRef.current) {
        try {
          await workerRef.current.terminate();
        } catch {}
        workerRef.current = null;
      }
      if (mountedRef.current) setRunning(false);
    }
  };

  const cancel = () => {
    cancelRef.current = true;
    setProgress("Cancelling…");
  };

  const downloadTxt = () => {
    if (!results) return;
    const text = results
      .map((p, i) => `--- Page ${i + 1} ---\n${p.text.trim()}`)
      .join("\n\n");
    downloadText(text, `${stripExt(file?.name ?? "document")}-ocr.txt`);
  };

  const downloadSearchablePdf = async () => {
    if (!results) return;
    try {
      const out = await PDFDocument.create();
      const font = await out.embedFont(StandardFonts.Helvetica);
      const failed: string[] = [];
      let bnFont: any = null;
      if (language.includes("ben")) {
        const { fontkit, bytes: fontBytes } = await loadBengaliFont();
        out.registerFontkit(fontkit);
        bnFont = await out.embedFont(fontBytes, { subset: true });
      }
      for (const pr of results) {
        const page = out.addPage([pr.width, pr.height]);
        const jpg = await out.embedJpg(dataUrlToBytes(pr.imgDataUrl));
        page.drawImage(jpg, { x: 0, y: 0, width: pr.width, height: pr.height });
        for (const w of pr.words) {
          const x = w.x0 / pr.imgScale;
          const wordH = (w.y1 - w.y0) / pr.imgScale;
          const size = Math.max(2, wordH * 0.86);
          const y = pr.height - w.y1 / pr.imgScale;
          if (!w.text.trim()) continue;
          const isBn = !!bnFont && BENGALI_RE.test(w.text);
          try {
            page.drawText(w.text, { x, y, size, font: isBn ? bnFont : font, opacity: 0 });
          } catch {
            failed.push(w.text);
          }
        }
      }
      if (failed.length) {
        throw new UnsupportedGlyphError(
          `${failed.length} recognised word(s) contain characters the PDF text layer cannot encode (for example "${failed[0]}"). ` +
            `The searchable PDF was not created so no text is lost. Download the TXT or DOCX instead, or choose a language that matches the document.`,
        );
      }
      const saved = await out.save();
      downloadPdf(saved, `${stripExt(file?.name ?? "document")}-searchable.pdf`);
      toast({ title: "Searchable PDF downloaded" });
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not build searchable PDF",
        description: e instanceof UnsupportedGlyphError ? e.message : "Something went wrong while creating the PDF.",
        variant: "destructive",
      });
    }
  };

  const downloadDocx = async () => {
    if (!results) return;
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
      const children: any[] = [];
      results.forEach((p, i) => {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`Page ${i + 1}`)] }));
        p.text.trim().split(/\n+/).forEach((line) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  font: BENGALI_RE.test(line) ? { name: "Noto Sans Bengali" } : undefined,
                  ...(BENGALI_RE.test(line) ? { complexScript: true } : {}),
                }),
              ],
            }),
          );
        });
      });
      const doc = new Document({ sections: [{ children }] });
      const blob: Blob = await Packer.toBlob(doc);
      downloadBytes(
        new Uint8Array(await blob.arrayBuffer()),
        `${stripExt(file?.name ?? "document")}-ocr.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      toast({ title: "Word document downloaded" });
    } catch (e) {
      console.error(e);
      toast({ title: "Could not build DOCX", variant: "destructive" });
    }
  };

  const resetAll = () => {
    cancelRef.current = true;
    setFile(null);
    setBytes(null);
    setResults(null);
    setNumPages(0);
    setProgress("");
  };

  const combinedText = results
    ? results.map((p) => p.text.trim()).join("\n\n").trim()
    : "";

  return (
    <PdfToolLayout
      icon={cfg.icon}
      iconColor={cfg.iconColor}
      iconBgColor={cfg.iconBgColor}
      iconBorderColor={cfg.iconBorderColor}
      title={cfg.title}
      description={cfg.description}
      hideHeader={!file}
    >
      {!file ? (
        <PdfDropzone
          onFile={onFile}
          loading={loading}
          toolId={cfg.id}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-4 bg-white border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700">
              Document language
              <select
                className="mt-1 block w-48 px-3 py-2 rounded-lg border border-gray-300 bg-white"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={running}
                data-testid="select-language"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-sm text-gray-500">
              {numPages} page(s) detected
            </div>
            <div className="flex-1" />
            <Button variant="outline" onClick={resetAll} data-testid="button-choose-another">
              <RotateCcw className="w-4 h-4 mr-1" /> New file
            </Button>
            {running ? (
              <Button variant="destructive" onClick={cancel} data-testid="button-cancel-ocr">
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            ) : (
              <Button
                onClick={runOcr}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-run-ocr"
              >
                <ScanText className="w-4 h-4 mr-1" /> Run OCR
              </Button>
            )}
          </div>

          {running && (
            <div className="flex items-center gap-3 text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-4">
              <ProcessingSpinner size={24} />
              <span data-testid="text-progress">{progress || "Working…"}</span>
            </div>
          )}
          {numPages > 15 && !running && !results && (
            <p className="text-xs text-amber-600">
              This PDF has many pages — OCR runs in your browser and may take a
              while.
            </p>
          )}

          {results && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={downloadSearchablePdf}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-download-searchable"
                >
                  <Download className="w-4 h-4 mr-1" /> Download searchable PDF
                </Button>
                <Button variant="outline" onClick={downloadTxt} data-testid="button-download-txt">
                  <FileText className="w-4 h-4 mr-1" /> Download text (.txt)
                </Button>
                <Button variant="outline" onClick={downloadDocx} data-testid="button-download-docx">
                  <FileText className="w-4 h-4 mr-1" /> Download Word (.docx)
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recognised text
                </label>
                <textarea
                  readOnly
                  value={combinedText || "(No text was recognised.)"}
                  className="w-full h-72 px-3 py-2 rounded-lg border border-gray-300 font-mono text-sm"
                  data-testid="textarea-ocr-text"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </PdfToolLayout>
  );
}
