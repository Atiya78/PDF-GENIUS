import { useEffect, useState } from "react";
import { loadPdfDocument } from "@/lib/pdfClient";

export type PdfInfo =
  | { status: "idle" | "loading" }
  | { status: "ready"; pageCount: number }
  | { status: "error"; message: string };

export function describePdfError(err: unknown): string {
  const name = (err as { name?: string })?.name ?? "";
  const msg = (err as { message?: string })?.message ?? "";
  if (name === "PasswordException") return "This PDF is password-protected. Unlock it first, then try again.";
  if (name === "InvalidPDFException" || /invalid pdf|corrupt|malformed/i.test(msg)) return "This file is not a readable PDF. It may be damaged or not a real PDF.";
  if (name === "MissingPDFException") return "The PDF could not be read from your device.";
  return `The PDF could not be opened${msg ? `: ${msg}` : "."}`;
}

/** Reads the actual page count with PDF.js. Bytes are cloned by loadPdfDocument. */
export function usePdfInfo(file: File | undefined): PdfInfo {
  const [info, setInfo] = useState<PdfInfo>({ status: "idle" });
  useEffect(() => {
    if (!file) { setInfo({ status: "idle" }); return; }
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;
    setInfo({ status: "loading" });
    (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await loadPdfDocument(bytes);
        task = doc.loadingTask;
        if (cancelled) return;
        setInfo({ status: "ready", pageCount: doc.numPages });
      } catch (e) {
        if (!cancelled) setInfo({ status: "error", message: describePdfError(e) });
      } finally {
        if (task) void task.destroy().catch(() => undefined);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);
  return info;
}
