import React, { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, RotateCcw, Pen, Type, Upload, Eraser } from "lucide-react";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PdfToolLayout, PdfDropzone } from "@/components/pdf-tools/PdfToolShell";
import {
  PdfPlacementCanvas,
  type Placement,
} from "@/components/pdf-tools/PdfPlacementCanvas";
import {
  readFileBytes,
  renderPdfPages,
  downloadPdf,
  stripExt,
  isPdfFile,
  fileToDataUrl,
  loadImageElement,
  dataUrlToBytes,
  type RenderedPage,
} from "@/lib/pdfClient";
import { toolConfigs } from "@/lib/toolConfig";

const cfg = toolConfigs["sign-pdf"];

type SigTab = "draw" | "type" | "upload";

interface Signature {
  url: string;
  bytes: Uint8Array;
  format: "png" | "jpg";
  aspect: number; // height / width
}

export function SignPdfUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [tab, setTab] = useState<SigTab>("draw");
  const [signature, setSignature] = useState<Signature | null>(null);
  const [placement, setPlacement] = useState<Placement>({
    x: 60,
    y: 60,
    width: 200,
    height: 80,
  });
  const [typed, setTyped] = useState("");

  // Drawing pad
  const padRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  const onFile = async (f: File) => {
    if (!isPdfFile(f)) {
      toast({ title: "Please choose a PDF file", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const b = await readFileBytes(f);
      const rendered = await renderPdfPages(b, 1.5, undefined, { forceUnrotated: true });
      setBytes(b);
      setPages(rendered);
      setPageIndex(0);
      setFile(f);
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

  const padPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = padRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = padRef.current!;
    const ctx = c.getContext("2d")!;
    drawing.current = true;
    const { x, y } = padPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = padRef.current!;
    const ctx = c.getContext("2d")!;
    const { x, y } = padPos(e);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  };
  const endDraw = () => {
    drawing.current = false;
  };
  const clearPad = () => {
    const c = padRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
  };

  const useDrawn = () => {
    const c = padRef.current;
    if (!c || !hasInk.current) {
      toast({ title: "Draw your signature first", variant: "destructive" });
      return;
    }
    const url = c.toDataURL("image/png");
    setSignature({
      url,
      bytes: dataUrlToBytes(url),
      format: "png",
      aspect: c.height / c.width,
    });
  };

  const useTyped = () => {
    if (!typed.trim()) {
      toast({ title: "Type your signature first", variant: "destructive" });
      return;
    }
    const c = document.createElement("canvas");
    c.width = 600;
    c.height = 200;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "italic 90px 'Brush Script MT', 'Segoe Script', cursive";
    ctx.fillText(typed, c.width / 2, c.height / 2);
    const url = c.toDataURL("image/png");
    setSignature({
      url,
      bytes: dataUrlToBytes(url),
      format: "png",
      aspect: c.height / c.width,
    });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const isPng = f.type === "image/png";
    const isJpg = f.type === "image/jpeg";
    if (!isPng && !isJpg) {
      toast({ title: "Use a PNG or JPG image", variant: "destructive" });
      return;
    }
    const url = await fileToDataUrl(f);
    const el = await loadImageElement(url);
    setSignature({
      url,
      bytes: await readFileBytes(f),
      format: isPng ? "png" : "jpg",
      aspect: el.naturalHeight / el.naturalWidth || 0.4,
    });
  };

  // When a signature is created, size its placement box to a sensible default.
  React.useEffect(() => {
    if (!signature || !pages[pageIndex]) return;
    const page = pages[pageIndex];
    const w = Math.min(220, page.width * 0.4);
    setPlacement({
      x: page.width - w - 50,
      y: page.height - w * signature.aspect - 60,
      width: w,
      height: w * signature.aspect,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, pageIndex]);

  const apply = async () => {
    if (!bytes || !signature) {
      toast({ title: "Create a signature first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const doc = await PDFDocument.load(bytes);
      const embedded =
        signature.format === "png"
          ? await doc.embedPng(signature.bytes)
          : await doc.embedJpg(signature.bytes);
      const page = doc.getPages()[pageIndex];
      // Preview is rendered unrotated in the page's visible box, so map back
      // through the crop box origin (handles non-zero MediaBox/CropBox offsets).
      const box = page.getCropBox();
      page.drawImage(embedded, {
        x: box.x + placement.x,
        y: box.y + box.height - placement.y - placement.height,
        width: placement.width,
        height: placement.height,
      });
      const saved = await doc.save();
      downloadPdf(saved, `${stripExt(file?.name ?? "document")}-signed.pdf`);
      toast({ title: "Done", description: "Your signed PDF was downloaded." });
    } catch (e) {
      console.error(e);
      toast({ title: "Could not sign PDF", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setBytes(null);
    setPages([]);
    setSignature(null);
    setTyped("");
  };

  const page = pages[pageIndex];
  const tabBtn = (id: SigTab, label: string, Icon: any) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 ${
        tab === id ? "bg-blue-600 text-white" : "bg-white text-gray-600"
      }`}
      data-testid={`tab-${id}`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <PdfToolLayout
      icon={cfg.icon}
      iconColor={cfg.iconColor}
      iconBgColor={cfg.iconBgColor}
      iconBorderColor={cfg.iconBorderColor}
      title={cfg.title}
      description={cfg.description}
      hideHeader={pages.length === 0}
    >
      {pages.length === 0 ? (
        <PdfDropzone
          onFile={onFile}
          loading={loading}
          toolId={cfg.id}
        />
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-8">
          <div className="space-y-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {tabBtn("draw", "Draw", Pen)}
              {tabBtn("type", "Type", Type)}
              {tabBtn("upload", "Upload", Upload)}
            </div>

            {tab === "draw" && (
              <div>
                <canvas
                  ref={padRef}
                  width={600}
                  height={200}
                  className="w-full bg-white border-2 border-dashed border-gray-300 rounded-lg touch-none cursor-crosshair"
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                  data-testid="signature-pad"
                />
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={clearPad} data-testid="button-clear-pad">
                    <Eraser className="w-4 h-4 mr-1" /> Clear
                  </Button>
                  <Button size="sm" onClick={useDrawn} className="bg-blue-600 hover:bg-blue-700" data-testid="button-use-drawn">
                    Use signature
                  </Button>
                </div>
              </div>
            )}

            {tab === "type" && (
              <div>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  placeholder="Type your name"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  data-testid="input-typed-signature"
                />
                <div
                  className="mt-2 h-24 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-3xl text-slate-800"
                  style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontStyle: "italic" }}
                >
                  {typed || "Preview"}
                </div>
                <Button size="sm" onClick={useTyped} className="mt-2 bg-blue-600 hover:bg-blue-700" data-testid="button-use-typed">
                  Use signature
                </Button>
              </div>
            )}

            {tab === "upload" && (
              <div>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("sig-upload-input")?.click()}
                  className="w-full"
                  data-testid="button-upload-signature"
                >
                  <Upload className="w-4 h-4 mr-1" /> Choose PNG / JPG
                </Button>
                <input
                  id="sig-upload-input"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={onUpload}
                />
                <p className="text-xs text-gray-400 mt-2">
                  A transparent PNG signature looks best.
                </p>
              </div>
            )}

            {signature && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-3">
                <img src={signature.url} alt="Signature" className="h-10 bg-white rounded border" />
                <span className="text-sm text-green-700">Signature ready. Drag it on the page, pick any page from the list, then download.</span>
              </div>
            )}

            {pages.length > 1 && (
              <label className="block text-sm font-medium text-gray-700">
                Page
                <select
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  value={pageIndex}
                  onChange={(e) => setPageIndex(Number(e.target.value))}
                  data-testid="select-page"
                >
                  {pages.map((p) => (
                    <option key={p.pageIndex} value={p.pageIndex}>
                      Page {p.pageIndex + 1}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={resetAll} data-testid="button-choose-another">
                <RotateCcw className="w-4 h-4 mr-1" /> New file
              </Button>
              <Button
                onClick={apply}
                disabled={saving || !signature}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="button-apply-signature"
              >
                {saving ? (
                  <ProcessingSpinner size={16} tone="light" className="mr-1" />
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                Sign &amp; download
              </Button>
            </div>
          </div>

          <div className="flex justify-center items-start">
            <div className="w-full max-w-md">
              {signature && page ? (
                <PdfPlacementCanvas
                  page={page}
                  imageUrl={signature.url}
                  placement={placement}
                  onChange={setPlacement}
                  aspect={signature.aspect}
                />
              ) : (
                page && (
                  <div className="relative shadow-lg">
                    <img src={page.dataUrl} alt="Page preview" className="w-full block" draggable={false} />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                      <span className="bg-white/90 text-gray-600 text-sm px-3 py-1.5 rounded-lg shadow">
                        Create a signature to place it here
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </PdfToolLayout>
  );
}
