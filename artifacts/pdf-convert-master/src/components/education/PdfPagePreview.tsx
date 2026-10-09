import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

const docs = new WeakMap<File, Promise<PDFDocumentProxy>>();
export function releaseStudyPdf(file: File) {
  const promise = docs.get(file); docs.delete(file);
  void promise?.then(doc => doc.loadingTask.destroy()).catch(() => {});
}
async function load(file: File) {
  let p = docs.get(file);
  if (!p) {
    p = (async () => {
      const { pdfjs } = await import("@/lib/pdfClient");
      return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    })();
    docs.set(file, p);
    p.catch(() => docs.delete(file));
  }
  return p;
}

export function PdfPagePreview({ file, pageNumber, quote, onClose }: { file: File | null; pageNumber: number; quote?: string; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!file) return;
    let cancelled = false; let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    setState("loading");
    (async () => {
      try {
        const doc = await load(file);
        if (pageNumber < 1 || pageNumber > doc.numPages) throw new Error(`This PDF has no page ${pageNumber}.`);
        const page = await doc.getPage(pageNumber);
        if (cancelled || !canvas.current) return;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2, 720 / base.width) * Math.min(2, window.devicePixelRatio || 1);
        const vp = page.getViewport({ scale });
        const el = canvas.current;
        el.width = vp.width; el.height = vp.height;
        const ctx = el.getContext("2d");
        if (!ctx) throw new Error("Canvas is not available.");
        task = page.render({ canvas: el, canvasContext: ctx, viewport: vp });
        await task.promise;
        if (!cancelled) setState("ready");
      } catch (e) { if (!cancelled && (e as Error).name !== "RenderingCancelledException") { setMsg((e as Error).message || "Could not render this page."); setState("error"); } }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [file, pageNumber]);
  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3" data-testid="pdf-preview">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">Page {pageNumber} of your PDF</p>
        <button type="button" onClick={onClose} className="rounded-full border bg-white px-3 py-1 text-xs font-semibold">Close preview</button>
      </div>
      {quote && <p className="mb-2 rounded-lg bg-white p-2 text-xs italic text-gray-700">Cited: "{quote}"</p>}
      {!file ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This saved answer does not include your PDF. Upload the original PDF and start a session to preview pages.</p> : <>
        {state === "loading" && <div className="h-64 animate-pulse rounded-lg bg-gray-200" aria-label="Loading page" />}
        {state === "error" && <p role="alert" className="text-sm text-red-700">{msg}</p>}
        <canvas ref={canvas} className={state === "ready" ? "h-auto w-full max-w-3xl rounded-lg border bg-white" : "hidden"} aria-label={`PDF page ${pageNumber}`} />
      </>}
    </div>
  );
}
