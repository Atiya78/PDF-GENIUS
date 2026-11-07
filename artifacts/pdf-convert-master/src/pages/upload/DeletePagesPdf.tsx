import React, { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, Trash2, RotateCcw, Undo2 } from "lucide-react";
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

const cfg = toolConfigs["delete-pages-pdf"];

export function DeletePagesPdfUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [toDelete, setToDelete] = useState<Set<number>>(new Set());
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
      const rendered = await renderPdfPages(b, 0.6);
      setBytes(b);
      setPages(rendered);
      setToDelete(new Set());
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

  const toggle = (idx: number) =>
    setToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const keepCount = pages.length - toDelete.size;

  const apply = async () => {
    if (!bytes || toDelete.size === 0) return;
    if (keepCount < 1) {
      toast({ title: "You can't delete every page", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const src = await PDFDocument.load(bytes);
      const out = await PDFDocument.create();
      const keepIdx = pages
        .map((p) => p.pageIndex)
        .filter((i) => !toDelete.has(i));
      const copied = await out.copyPages(src, keepIdx);
      copied.forEach((p) => out.addPage(p));
      const saved = await out.save();
      downloadPdf(saved, `${stripExt(file?.name ?? "document")}-pages-removed.pdf`);
      toast({
        title: "Done",
        description: `${toDelete.size} page(s) removed — ${keepCount} kept.`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Could not save PDF", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setBytes(null);
    setPages([]);
    setToDelete(new Set());
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
          <div className="flex flex-wrap items-center gap-3 mb-6 sticky top-0 z-10 bg-[#faf7f2]/90 backdrop-blur py-3">
            <span className="text-sm text-[#57534e]" data-testid="text-page-summary">
              {pages.length} pages · {toDelete.size} marked for deletion ·{" "}
              {keepCount} will remain
            </span>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setToDelete(new Set())}
              disabled={toDelete.size === 0}
              data-testid="button-clear-selection"
            >
              <Undo2 className="w-4 h-4 mr-1" /> Clear selection
            </Button>
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
              disabled={toDelete.size === 0 || saving || keepCount < 1}
              className="bg-[#f7433d] hover:bg-[#c8302a]"
              data-testid="button-apply-delete"
            >
              {saving ? (
                <ProcessingSpinner size={16} tone="light" className="mr-1" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              Delete &amp; download
            </Button>
          </div>

          <p className="text-sm text-[#57534e] mb-4">
            Click a page to mark it for deletion. Click again to keep it.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((p) => {
              const marked = toDelete.has(p.pageIndex);
              return (
                <button
                  key={p.pageIndex}
                  onClick={() => toggle(p.pageIndex)}
                  className={`group relative rounded-lg border-2 overflow-hidden transition-all ${
                    marked
                      ? "border-red-500 ring-2 ring-red-200"
                      : "border-[#e7e0d5] hover:border-[#f7433d]"
                  }`}
                  data-testid={`thumb-page-${p.pageIndex}`}
                >
                  <img
                    src={p.dataUrl}
                    alt={`Page ${p.pageIndex + 1}`}
                    className={`w-full block bg-white ${marked ? "opacity-40" : ""}`}
                    draggable={false}
                  />
                  {marked && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-red-500 text-white rounded-full p-2 shadow-lg">
                        <Trash2 className="w-5 h-5" />
                      </span>
                    </span>
                  )}
                  <span className="absolute bottom-1 left-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-black/60 text-white">
                    {p.pageIndex + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PdfToolLayout>
  );
}
