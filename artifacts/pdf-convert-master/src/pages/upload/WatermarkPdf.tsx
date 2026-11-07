import React, { useMemo, useState } from "react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { Download, RotateCcw, Type, Image as ImageIcon } from "lucide-react";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PdfToolLayout, PdfDropzone } from "@/components/pdf-tools/PdfToolShell";
import {
  readFileBytes,
  renderPdfPages,
  downloadPdf,
  stripExt,
  isPdfFile,
  fileToDataUrl,
  loadImageElement,
  hexToRgb01,
  type RenderedPage,
} from "@/lib/pdfClient";
import { toolConfigs } from "@/lib/toolConfig";

const cfg = toolConfigs["watermark-pdf"];

const FONT_OPTIONS: Record<string, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  "Helvetica Bold": StandardFonts.HelveticaBold,
  "Times Roman": StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

// Rigid-body offset: position so the watermark's CENTRE lands on (cx, cy) after
// pdf-lib rotates the box around its bottom-left anchor.
function anchorForCentre(
  cx: number,
  cy: number,
  w: number,
  h: number,
  angleDeg: number,
) {
  const a = (angleDeg * Math.PI) / 180;
  const ox = w / 2;
  const oy = h / 2;
  const rx = ox * Math.cos(a) - oy * Math.sin(a);
  const ry = ox * Math.sin(a) + oy * Math.cos(a);
  return { x: cx - rx, y: cy - ry };
}

// Grid of cell centres (in points) covering the page for tiled layout.
function tileCentres(pageW: number, pageH: number, w: number, h: number) {
  const stepX = Math.max(w, h) * 1.4 + 24;
  const stepY = Math.max(w, h) * 1.4 + 24;
  const centres: { x: number; y: number }[] = [];
  for (let y = stepY / 2; y < pageH + stepY; y += stepY) {
    for (let x = stepX / 2; x < pageW + stepX; x += stepX) {
      centres.push({ x, y: pageH - y }); // convert top-down loop to PDF bottom-up
      if (centres.length > 400) return centres; // safety cap
    }
  }
  return centres;
}

export function WatermarkPdfUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<"text" | "image">("text");
  const [layout, setLayout] = useState<"single" | "tiled">("single");
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(-45);

  // Text options
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontKey, setFontKey] = useState("Helvetica Bold");
  const [fontSize, setFontSize] = useState(60);
  const [color, setColor] = useState("#e02d27");

  // Image options
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgBytes, setImgBytes] = useState<Uint8Array | null>(null);
  const [imgFormat, setImgFormat] = useState<"png" | "jpg">("png");
  const [imgAspect, setImgAspect] = useState(1);
  const [imgScale, setImgScale] = useState(35); // % of page width

  const onFile = async (f: File) => {
    if (!isPdfFile(f)) {
      toast({ title: "Please choose a PDF file", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const b = await readFileBytes(f);
      const rendered = await renderPdfPages(b, 1.5);
      setBytes(b);
      setPages(rendered);
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

  const onImagePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setImgUrl(url);
    setImgBytes(await readFileBytes(f));
    setImgFormat(isPng ? "png" : "jpg");
    setImgAspect(el.naturalHeight / el.naturalWidth || 1);
  };

  const page0 = pages[0];

  const apply = async () => {
    if (!bytes) return;
    if (mode === "text" && !text.trim()) {
      toast({ title: "Enter watermark text", variant: "destructive" });
      return;
    }
    if (mode === "image" && !imgBytes) {
      toast({ title: "Choose a watermark image", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const doc = await PDFDocument.load(bytes);
      const { r, g, b } = hexToRgb01(color);
      const font =
        mode === "text"
          ? await doc.embedFont(FONT_OPTIONS[fontKey] ?? StandardFonts.Helvetica)
          : null;
      const embeddedImg =
        mode === "image" && imgBytes
          ? imgFormat === "png"
            ? await doc.embedPng(imgBytes)
            : await doc.embedJpg(imgBytes)
          : null;

      for (const page of doc.getPages()) {
        const { width: W, height: H } = page.getSize();
        let w: number;
        let h: number;
        if (mode === "text" && font) {
          w = font.widthOfTextAtSize(text, fontSize);
          h = font.heightAtSize(fontSize);
        } else {
          w = W * (imgScale / 100);
          h = w * imgAspect;
        }

        const centres =
          layout === "tiled"
            ? tileCentres(W, H, w, h)
            : [{ x: W / 2, y: H / 2 }];

        for (const c of centres) {
          const { x, y } = anchorForCentre(c.x, c.y, w, h, rotation);
          if (mode === "text" && font) {
            page.drawText(text, {
              x,
              y,
              size: fontSize,
              font,
              color: rgb(r, g, b),
              opacity,
              rotate: degrees(rotation),
            });
          } else if (embeddedImg) {
            page.drawImage(embeddedImg, {
              x,
              y,
              width: w,
              height: h,
              opacity,
              rotate: degrees(rotation),
            });
          }
        }
      }

      const saved = await doc.save();
      downloadPdf(saved, `${stripExt(file?.name ?? "document")}-watermarked.pdf`);
      toast({ title: "Done", description: "Your watermarked PDF was downloaded." });
    } catch (e) {
      console.error(e);
      toast({ title: "Could not add watermark", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Preview cell centres as percentages of page 1, mirroring the export grid.
  const previewCells = useMemo(() => {
    if (!page0) return [] as { left: number; top: number }[];
    if (layout === "single") return [{ left: 50, top: 50 }];
    const w =
      mode === "text"
        ? Math.max(40, fontSize * Math.max(1, text.length) * 0.5)
        : page0.width * (imgScale / 100);
    const h = mode === "text" ? fontSize : w * imgAspect;
    const cells = tileCentres(page0.width, page0.height, w, h);
    return cells.map((c) => ({
      left: (c.x / page0.width) * 100,
      top: (1 - c.y / page0.height) * 100,
    }));
  }, [page0, layout, mode, fontSize, text, imgScale, imgAspect]);

  const resetAll = () => {
    setFile(null);
    setBytes(null);
    setPages([]);
  };

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
        <div className="grid lg:grid-cols-[340px_1fr] gap-8">
          {/* Controls */}
          <div className="space-y-5">
            <div className="flex rounded-lg border border-[#e7e0d5] overflow-hidden">
              <button
                onClick={() => setMode("text")}
                className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 ${
                  mode === "text" ? "bg-[#f7433d] text-white" : "bg-white text-[#57534e]"
                }`}
                data-testid="tab-text"
              >
                <Type className="w-4 h-4" /> Text
              </button>
              <button
                onClick={() => setMode("image")}
                className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 ${
                  mode === "image" ? "bg-[#f7433d] text-white" : "bg-white text-[#57534e]"
                }`}
                data-testid="tab-image"
              >
                <ImageIcon className="w-4 h-4" /> Image
              </button>
            </div>

            {mode === "text" ? (
              <>
                <label className="block text-sm font-medium text-[#57534e]">
                  Watermark text
                  <input
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-[#e7e0d5]"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    data-testid="input-watermark-text"
                  />
                </label>
                <label className="block text-sm font-medium text-[#57534e]">
                  Font
                  <select
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-[#e7e0d5] bg-white"
                    value={fontKey}
                    onChange={(e) => setFontKey(e.target.value)}
                    data-testid="select-font"
                  >
                    {Object.keys(FONT_OPTIONS).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-[#57534e]">
                  Size: {fontSize}pt
                  <input
                    type="range"
                    min={8}
                    max={200}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="mt-1 w-full"
                    data-testid="range-size"
                  />
                </label>
                <label className="flex items-center gap-3 text-sm font-medium text-[#57534e]">
                  Colour
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-14 rounded border"
                    data-testid="input-color"
                  />
                </label>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("wm-image-input")?.click()}
                  data-testid="button-pick-image"
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  {imgUrl ? "Change image" : "Choose PNG / JPG"}
                </Button>
                <input
                  id="wm-image-input"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={onImagePicked}
                />
                {imgUrl && (
                  <label className="block text-sm font-medium text-[#57534e]">
                    Size: {imgScale}% of page width
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={imgScale}
                      onChange={(e) => setImgScale(Number(e.target.value))}
                      className="mt-1 w-full"
                      data-testid="range-image-size"
                    />
                  </label>
                )}
              </>
            )}

            <label className="block text-sm font-medium text-[#57534e]">
              Opacity: {Math.round(opacity * 100)}%
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                className="mt-1 w-full"
                data-testid="range-opacity"
              />
            </label>
            <label className="block text-sm font-medium text-[#57534e]">
              Rotation: {rotation}°
              <input
                type="range"
                min={-90}
                max={90}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="mt-1 w-full"
                data-testid="range-rotation"
              />
            </label>
            <label className="block text-sm font-medium text-[#57534e]">
              Layout
              <select
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[#e7e0d5] bg-white"
                value={layout}
                onChange={(e) => setLayout(e.target.value as "single" | "tiled")}
                data-testid="select-layout"
              >
                <option value="single">Single (centred)</option>
                <option value="tiled">Tiled (repeated)</option>
              </select>
            </label>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={resetAll}
                data-testid="button-choose-another"
              >
                <RotateCcw className="w-4 h-4 mr-1" /> New file
              </Button>
              <Button
                onClick={apply}
                disabled={saving}
                className="flex-1 bg-[#f7433d] hover:bg-[#c8302a]"
                data-testid="button-apply-watermark"
              >
                {saving ? (
                  <ProcessingSpinner size={16} tone="light" className="mr-1" />
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                Apply &amp; download
              </Button>
            </div>
            <p className="text-xs text-[#8a837b]">
              Applied to all {pages.length} page(s). Preview shows page 1.
            </p>
          </div>

          {/* Live preview */}
          <div className="flex justify-center items-start">
            {page0 && (
              <div
                className="relative shadow-lg w-full max-w-md"
                style={{ containerType: "inline-size" } as React.CSSProperties}
              >
                <img
                  src={page0.dataUrl}
                  alt="Page 1 preview"
                  className="w-full block"
                  draggable={false}
                />
                {previewCells.map((cell, i) => (
                  <div
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${cell.left}%`,
                      top: `${cell.top}%`,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                      opacity,
                    }}
                  >
                    {mode === "text" ? (
                      <span
                        style={{
                          fontSize: `${(fontSize / page0.width) * 100}cqw`,
                          color,
                          whiteSpace: "pre",
                          fontFamily: fontKey.includes("Times")
                            ? "Georgia, serif"
                            : fontKey.includes("Courier")
                              ? "monospace"
                              : "Helvetica, Arial, sans-serif",
                          fontWeight: fontKey.includes("Bold") ? 700 : 400,
                          lineHeight: 1,
                        }}
                      >
                        {text}
                      </span>
                    ) : imgUrl ? (
                      <img
                        src={imgUrl}
                        alt=""
                        style={{ width: `${imgScale}cqw`, height: "auto" }}
                        draggable={false}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PdfToolLayout>
  );
}
