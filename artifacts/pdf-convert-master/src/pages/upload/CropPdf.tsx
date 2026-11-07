import React, { useState } from "react";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { PDFDocument } from "pdf-lib";
import { Download, RotateCcw } from "lucide-react";
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
  type RenderedPage,
} from "@/lib/pdfClient";
import { toolConfigs } from "@/lib/toolConfig";

const cfg = toolConfigs["crop-pdf"];

export function CropPdfUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 5,
    y: 5,
    width: 90,
    height: 90,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      setCrop({ unit: "%", x: 5, y: 5, width: 90, height: 90 });
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

  const apply = async () => {
    if (!bytes) return;
    if (!crop.width || !crop.height) {
      toast({ title: "Draw a crop region first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // The crop comes back in percentage units relative to each page. We apply
      // it to every page's CropBox, anchored to that page's current box so pages
      // with non-zero origins crop correctly. (Top-left in UI -> bottom-left in PDF.)
      const fx = crop.x / 100;
      const fy = crop.y / 100;
      const fw = crop.width / 100;
      const fh = crop.height / 100;

      const doc = await PDFDocument.load(bytes);
      for (const page of doc.getPages()) {
        const box = page.getCropBox();
        const newW = box.width * fw;
        const newH = box.height * fh;
        const newX = box.x + box.width * fx;
        const newY = box.y + box.height * (1 - fy - fh);
        page.setCropBox(newX, newY, newW, newH);
      }
      const saved = await doc.save();
      downloadPdf(saved, `${stripExt(file?.name ?? "document")}-cropped.pdf`);
      toast({ title: "Done", description: "Your cropped PDF was downloaded." });
    } catch (e) {
      console.error(e);
      toast({ title: "Could not crop PDF", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-sm text-[#57534e]">
              Drag the handles to set the crop region. It will be applied to all{" "}
              {pages.length} page(s).
            </span>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={resetAll}
              data-testid="button-choose-another"
            >
              <RotateCcw className="w-4 h-4 mr-1" /> New file
            </Button>
            <Button
              size="sm"
              onClick={apply}
              disabled={saving}
              className="bg-[#f7433d] hover:bg-[#c8302a]"
              data-testid="button-apply-crop"
            >
              {saving ? (
                <ProcessingSpinner size={16} tone="light" className="mr-1" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              Crop &amp; download
            </Button>
          </div>

          <div className="flex justify-center">
            <div className="inline-block shadow-lg max-w-full">
              <ReactCrop
                crop={crop}
                onChange={(_pixelCrop, percentCrop) => setCrop(percentCrop)}
                data-testid="crop-area"
              >
                <img
                  src={pages[0].dataUrl}
                  alt="Page 1 preview"
                  className="block max-w-full"
                  draggable={false}
                />
              </ReactCrop>
            </div>
          </div>
          <p className="text-center text-xs text-[#8a837b] mt-3">
            Preview shows page 1. The same crop is applied to every page.
          </p>
        </div>
      )}
    </PdfToolLayout>
  );
}
