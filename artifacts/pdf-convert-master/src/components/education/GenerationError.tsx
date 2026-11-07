import { Link } from "wouter";
import { AlertTriangle, RotateCcw } from "lucide-react";

export function GenerationError({ error, retry, disabled }: { error: string | null; retry: () => void; disabled: boolean }) {
  if (!error) return null;
  return <div role="alert" className="flex gap-3 rounded-[12px] border border-[#f3c4c0] bg-[#fdf1ef] p-4 text-sm text-[#8f1f1a]" data-testid="text-generate-error">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <div className="min-w-0">
      <p className="leading-relaxed">{error}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={disabled} onClick={retry} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1c1917] px-3.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Retry generation</button>
        {error.includes("Please use OCR first") && <Link href="/upload/ocr-pdf" className="inline-flex h-9 items-center rounded-[8px] border border-[#e7c3bf] bg-white px-3.5 font-semibold text-[#8f1f1a] hover:border-[#8f1f1a]">Open OCR tool</Link>}
      </div>
    </div>
  </div>;
}
