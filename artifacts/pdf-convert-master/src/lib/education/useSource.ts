import { useCallback, useEffect, useMemo, useState } from "react";
import { EDUCATION_LIMITS } from "./educationTools";
import { takePendingFile } from "./pendingFile";

export type SourceMode = "upload" | "paste";
const RANGE_RE = /^\d+(-\d+)?(,\d+(-\d+)?)*$/;

export function normalizeRange(raw: string): string {
  return raw.replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, "");
}

export function useSourceInput() {
  const [mode, setMode] = useState<SourceMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [pageRange, setPageRange] = useState("");

  useEffect(() => {
    const f = takePendingFile();
    if (f) setFile(f);
  }, []);

  const normalized = normalizeRange(pageRange);
  const rangeError = useMemo(() => {
    if (mode !== "upload" || !normalized) return null;
    if (!RANGE_RE.test(normalized)) return "Use a page range like 3-10 or 1,4,6-8.";
    const bad = normalized.split(",").some((p) => {
      const [a, b] = p.split("-").map(Number);
      return a < 1 || (b !== undefined && b < a);
    });
    return bad ? "Page numbers start at 1 and ranges must go upward." : null;
  }, [mode, normalized]);

  const textError = text.length > EDUCATION_LIMITS.maxPasteChars ? `Pasted text is limited to ${EDUCATION_LIMITS.maxPasteChars.toLocaleString()} characters.` : null;
  const hasSource = mode === "upload" ? !!file : text.trim().length >= 50;
  const canSubmit = hasSource && !rangeError && !textError;
  const clear = useCallback(() => { setFile(null); setText(""); setPageRange(""); }, []);

  return { mode, setMode, file, setFile, text, setText, pageRange, setPageRange, normalized, rangeError, textError, hasSource, canSubmit, clear };
}
export type SourceState = ReturnType<typeof useSourceInput>;
