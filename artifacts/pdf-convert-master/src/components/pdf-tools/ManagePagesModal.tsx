import { useEffect, useRef, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import {
  Plus,
  Copy,
  Trash2,
  RotateCcw,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { useToast } from "@/hooks/use-toast";
import { usePlanMaxFileMB, effectiveMaxMB } from "@/lib/usePlanUploadLimit";
import {
  readFileBytes,
  renderPdfPages,
  isPdfFile,
  type RenderedPage,
} from "@/lib/pdfClient";

const A4 = { width: 595.28, height: 841.89 };
const THUMB_SCALE = 0.7;

interface PlanItem {
  uid: string;
  kind: "page" | "blank";
  docId: string; // "current", imported doc id, or "blank"
  srcPage: number; // 0-based page index in the source doc
  rotate: number; // accumulated rotation delta in degrees (multiple of 90)
  baseRotation: number; // source page's native /Rotate
  thumb: string; // unrotated page preview (empty for blank)
  width: number; // points (unrotated)
  height: number; // points (unrotated)
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  srcBytes: Uint8Array;
  pages: RenderedPage[];
  onApply: (result: {
    bytes: Uint8Array;
    pageMap: Record<number, number>;
  }) => void | Promise<void>;
}

let importCounter = 0;
const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const norm = (deg: number) => (((deg % 360) + 360) % 360);

export function ManagePagesModal({
  open,
  onOpenChange,
  srcBytes,
  pages,
  onApply,
}: Props) {
  const { toast } = useToast();
  const planMaxMB = usePlanMaxFileMB();
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const docBytesRef = useRef<Map<string, Uint8Array>>(new Map());
  const importInputRef = useRef<HTMLInputElement>(null);

  // Build the initial plan from the current document each time the modal opens.
  useEffect(() => {
    if (!open) return;
    docBytesRef.current = new Map([["current", srcBytes]]);
    setPlan(
      pages.map((p) => ({
        uid: uid(),
        kind: "page" as const,
        docId: "current",
        srcPage: p.pageIndex,
        rotate: 0,
        baseRotation: norm(p.rotation ?? 0),
        thumb: p.dataUrl,
        width: p.width,
        height: p.height,
      })),
    );
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(plan.map((p) => p.uid)));
  const selectNone = () => setSelected(new Set());

  const blankSize = () => {
    const first = plan[0];
    if (first && first.width && first.height)
      return { width: first.width, height: first.height };
    return A4;
  };

  const addBlank = () => {
    const { width, height } = blankSize();
    const item: PlanItem = {
      uid: uid(),
      kind: "blank",
      docId: "blank",
      srcPage: -1,
      rotate: 0,
      baseRotation: 0,
      thumb: "",
      width,
      height,
    };
    setPlan((prev) => [...prev, item]);
  };

  const duplicateSelected = () => {
    if (!selected.size) return;
    setPlan((prev) => {
      const out: PlanItem[] = [];
      for (const it of prev) {
        out.push(it);
        if (selected.has(it.uid)) out.push({ ...it, uid: uid() });
      }
      return out;
    });
  };

  const deleteSelected = () => {
    if (!selected.size) return;
    setPlan((prev) => prev.filter((it) => !selected.has(it.uid)));
    setSelected(new Set());
  };

  const rotateSelected = (delta: number) => {
    if (!selected.size) return;
    setPlan((prev) =>
      prev.map((it) =>
        selected.has(it.uid) ? { ...it, rotate: it.rotate + delta } : it,
      ),
    );
  };

  // Shift selected items one slot left/right, preserving their relative order
  // and never swapping two selected items past each other.
  const moveSelected = (dir: -1 | 1) => {
    if (!selected.size) return;
    setPlan((prev) => {
      const arr = [...prev];
      if (dir === -1) {
        for (let i = 1; i < arr.length; i++) {
          if (selected.has(arr[i].uid) && !selected.has(arr[i - 1].uid)) {
            [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
          }
        }
      } else {
        for (let i = arr.length - 2; i >= 0; i--) {
          if (selected.has(arr[i].uid) && !selected.has(arr[i + 1].uid)) {
            [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
          }
        }
      }
      return arr;
    });
  };

  const onImportPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!isPdfFile(f)) {
      toast({ title: "Please choose a PDF file", variant: "destructive" });
      return;
    }
    const capMB = effectiveMaxMB(100, planMaxMB);
    if (f.size > capMB * 1024 * 1024) {
      toast({ title: "File too large", description: `Maximum file size is ${capMB}MB for your plan.`, variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const bytes = await readFileBytes(f);
      const docId = `import-${importCounter++}`;
      docBytesRef.current.set(docId, bytes);
      const rendered = await renderPdfPages(bytes, THUMB_SCALE, undefined, {
        forceUnrotated: true,
      });
      const items: PlanItem[] = rendered.map((p) => ({
        uid: uid(),
        kind: "page",
        docId,
        srcPage: p.pageIndex,
        rotate: 0,
        baseRotation: norm(p.rotation ?? 0),
        thumb: p.dataUrl,
        width: p.width,
        height: p.height,
      }));
      setPlan((prev) => [...prev, ...items]);
      toast({
        title: "Document imported",
        description: `${items.length} page${items.length === 1 ? "" : "s"} added.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not import PDF",
        description: "The file may be corrupt or password-protected.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const save = async () => {
    if (!plan.length) {
      toast({
        title: "Document needs at least one page",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const out = await PDFDocument.create();
      const loaded = new Map<string, PDFDocument>();
      for (const [id, bytes] of docBytesRef.current) {
        if (id === "blank") continue;
        loaded.set(id, await PDFDocument.load(bytes));
      }

      const pageMap: Record<number, number> = {};
      for (let i = 0; i < plan.length; i++) {
        const it = plan[i];
        if (it.kind === "blank") {
          const pg = out.addPage([it.width, it.height]);
          const r = norm(it.rotate);
          if (r) pg.setRotation(degrees(r));
          continue;
        }
        const src = loaded.get(it.docId);
        if (!src) throw new Error(`Missing source document: ${it.docId}`);
        const [copied] = await out.copyPages(src, [it.srcPage]);
        const total = norm(copied.getRotation().angle + it.rotate);
        copied.setRotation(degrees(total));
        out.addPage(copied);
        if (it.docId === "current" && pageMap[it.srcPage] === undefined) {
          pageMap[it.srcPage] = i;
        }
      }

      const bytes = await out.save();
      await onApply({ bytes, pageMap });
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not save pages",
        description: "Something went wrong rebuilding the document.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const allSelected = plan.length > 0 && selected.size === plan.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Manage pages</h3>
            <p className="text-xs text-gray-500">
              Reorder, rotate, duplicate, delete, add or import pages.
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600"
            data-testid="button-close-manage"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            onClick={addBlank}
            data-testid="button-add-blank-page"
          >
            <Plus className="w-4 h-4 mr-1" /> New page
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={duplicateSelected}
            disabled={!selected.size}
            data-testid="button-duplicate-pages"
          >
            <Copy className="w-4 h-4 mr-1" /> Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deleteSelected}
            disabled={!selected.size}
            data-testid="button-delete-pages"
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
          <span className="w-px h-6 bg-gray-200 mx-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => rotateSelected(-90)}
            disabled={!selected.size}
            data-testid="button-rotate-left"
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Left
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => rotateSelected(90)}
            disabled={!selected.size}
            data-testid="button-rotate-right"
          >
            <RotateCw className="w-4 h-4 mr-1" /> Right
          </Button>
          <span className="w-px h-6 bg-gray-200 mx-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => moveSelected(-1)}
            disabled={!selected.size}
            data-testid="button-move-left"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Move
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => moveSelected(1)}
            disabled={!selected.size}
            data-testid="button-move-right"
          >
            Move <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <span className="w-px h-6 bg-gray-200 mx-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            data-testid="button-import-document"
          >
            {importing ? (
              <ProcessingSpinner size={16} className="mr-1" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            Import
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={onImportPicked}
            data-testid="input-import-document"
          />
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? selectNone : selectAll}
            data-testid="button-select-all"
          >
            {allSelected ? (
              <Square className="w-4 h-4 mr-1" />
            ) : (
              <CheckSquare className="w-4 h-4 mr-1" />
            )}
            {allSelected ? "Select none" : "Select all"}
          </Button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-5">
          {plan.length === 0 ? (
            <div className="text-center text-gray-400 py-16 text-sm">
              No pages. Add a new page or import a document.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {plan.map((it, idx) => {
                const isSel = selected.has(it.uid);
                const rot = norm(it.baseRotation + it.rotate);
                return (
                  <button
                    key={it.uid}
                    type="button"
                    onClick={() => toggle(it.uid)}
                    className={`group relative rounded-lg border-2 p-2 text-left transition ${
                      isSel
                        ? "border-blue-600 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`page-card-${idx}`}
                  >
                    <span
                      className={`absolute top-1 left-1 z-10 w-5 h-5 rounded flex items-center justify-center text-white text-[10px] ${
                        isSel ? "bg-blue-600" : "bg-black/30"
                      }`}
                    >
                      {isSel ? "✓" : ""}
                    </span>
                    <span className="absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px]">
                      {idx + 1}
                    </span>
                    <div className="aspect-[3/4] bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                      {it.kind === "blank" ? (
                        <span className="text-gray-400 text-xs">Blank</span>
                      ) : (
                        <img
                          src={it.thumb}
                          alt={`Page ${idx + 1}`}
                          className="max-w-full max-h-full object-contain transition-transform"
                          style={{ transform: `rotate(${rot}deg)` }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t">
          <span className="text-sm text-gray-500" data-testid="text-page-count">
            {plan.length} page{plan.length === 1 ? "" : "s"} ·{" "}
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              data-testid="button-cancel-manage"
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={busy || plan.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-save-manage"
            >
              {busy ? (
                <>
                  <ProcessingSpinner size={16} tone="light" className="mr-1" /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
