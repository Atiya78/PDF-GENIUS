import React, { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, RotateCcw, ImagePlus } from "lucide-react";
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
  type RenderedPage,
} from "@/lib/pdfClient";
import { toolConfigs } from "@/lib/toolConfig";

const cfg = toolConfigs["add-image-pdf"];

export function AddImagePdfUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [applyAll, setApplyAll] = useState(false);

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgBytes, setImgBytes] = useState<Uint8Array | null>(null);
  const [imgFormat, setImgFormat] = useState<"png" | "jpg">("png");
  const [imgAspect, setImgAspect] = useState(1);
  const [placement, setPlacement] = useState<Placement>({
    x: 40,
    y: 40,
    width: 160,
    height: 160,
  });

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
    const aspect = el.naturalHeight / el.naturalWidth || 1;
    const page = pages[pageIndex];
    const w = Math.min(page.width * 0.35, el.naturalWidth);
    setImgUrl(url);
    setImgBytes(await readFileBytes(f));
    setImgFormat(isPng ? "png" : "jpg");
    setImgAspect(aspect);
    setPlacement({
      x: (page.width - w) / 2,
      y: (page.height - w * aspect) / 2,
      width: w,
      height: w * aspect,
    });
  };

  const apply = async () => {
    if (!bytes || !imgBytes) {
      toast({ title: "Choose an image to place first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const doc = await PDFDocument.load(bytes);
      const embedded =
        imgFormat === "png"
          ? await doc.embedPng(imgBytes)
          : await doc.embedJpg(imgBytes);
      const docPages = doc.getPages();
      const targets = applyAll
        ? docPages.map((_, i) => i)
        : [pageIndex];
      for (const idx of targets) {
        const page = docPages[idx];
        if (!page) continue;
        const H = page.getSize().height;
        page.drawImage(embedded, {
          x: placement.x,
          y: H - placement.y - placement.height,
          width: placement.width,
          height: placement.height,
        });
      }
      const saved = await doc.save();
      downloadPdf(saved, `${stripExt(file?.name ?? "document")}-with-image.pdf`);
      toast({ title: "Done", description: "Your updated PDF was downloaded." });
    } catch (e) {
      console.error(e);
      toast({ title: "Could not add image", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setBytes(null);
    setPages([]);
    setImgUrl(null);
    setImgBytes(null);
  };

  const page = pages[pageIndex];

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
        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          <div className="space-y-5">
            <Button
              variant="outline"
              onClick={() => document.getElementById("add-image-input")?.click()}
              className="w-full"
              data-testid="button-pick-image"
            >
              <ImagePlus className="w-4 h-4 mr-1" />
              {imgUrl ? "Change image" : "Choose PNG / JPG"}
            </Button>
            <input
              id="add-image-input"
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={onImagePicked}
            />

            {pages.length > 1 && (
              <label className="block text-sm font-medium text-[#57534e]">
                Page
                <select
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[#e7e0d5] bg-white"
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

            <label className="flex items-center gap-2 text-sm text-[#57534e]">
              <input
                type="checkbox"
                checked={applyAll}
                onChange={(e) => setApplyAll(e.target.checked)}
                data-testid="checkbox-apply-all"
              />
              Add to all pages
            </label>

            <p className="text-xs text-[#8a837b]">
              Drag the image to move it, drag the corner handle to resize. The
              aspect ratio is preserved.
            </p>

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
                disabled={saving || !imgBytes}
                className="flex-1 bg-[#f7433d] hover:bg-[#c8302a]"
                data-testid="button-apply-image"
              >
                {saving ? (
                  <ProcessingSpinner size={16} tone="light" className="mr-1" />
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                Apply &amp; download
              </Button>
            </div>
          </div>

          <div className="flex justify-center items-start">
            <div className="w-full max-w-md">
              {imgUrl && page ? (
                <PdfPlacementCanvas
                  page={page}
                  imageUrl={imgUrl}
                  placement={placement}
                  onChange={setPlacement}
                  aspect={imgAspect}
                />
              ) : (
                page && (
                  <div className="relative shadow-lg">
                    <img
                      src={page.dataUrl}
                      alt="Page preview"
                      className="w-full block"
                      draggable={false}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                      <span className="bg-white/90 text-[#57534e] text-sm px-3 py-1.5 rounded-lg shadow">
                        Choose an image to place
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
