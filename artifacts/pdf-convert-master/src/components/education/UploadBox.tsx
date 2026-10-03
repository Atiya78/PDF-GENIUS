import { FileText, X } from "lucide-react";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { EDUCATION_LIMITS } from "@/lib/education/educationTools";
import type { SourceState } from "@/lib/education/useSource";
import { cn } from "@/lib/utils";

export function UploadBox({ src, disabled }: { src: SourceState; disabled: boolean }) {
  const tab = (m: "upload" | "paste", label: string) => (
    <button type="button" role="tab" aria-selected={src.mode === m} disabled={disabled} onClick={() => src.setMode(m)} data-testid={`tab-source-${m}`}
      className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7433d]", src.mode === m ? "bg-[#f7433d] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}>
      {label}
    </button>
  );
  return (
    <div>
      <div role="tablist" aria-label="Source" className="mb-4 flex gap-2">{tab("upload", "Upload PDF")}{tab("paste", "Paste text")}</div>
      <p className="mb-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600" data-testid="text-ai-disclosure">
        Privacy: PDF Genius does not store your PDF or its extracted text. To create questions or cards, the extracted text is sent to the configured AI provider, whose own data retention policies apply (we cannot promise the provider deletes its abuse-monitoring logs). Do not upload confidential material. Only generated flashcard decks and your study progress are kept, in this browser.
      </p>
      {src.mode === "upload" ? (
        <div className="space-y-4">
          {src.file ? (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3" data-testid="text-selected-file">
              <FileText className="h-6 w-6 text-[#f7433d]" aria-hidden="true" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900">{src.file.name}</p><p className="text-xs text-gray-500">{(src.file.size / 1048576).toFixed(2)} MB</p></div>
              <button type="button" disabled={disabled} onClick={() => src.setFile(null)} aria-label="Remove file" className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 disabled:opacity-50" data-testid="button-remove-file"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <UploadDropzone acceptedFormats={[".pdf"]} maxFileSize={EDUCATION_LIMITS.maxMb} disabled={disabled} title="Drop your lecture PDF here" subtitle={`Up to ${EDUCATION_LIMITS.maxMb} MB and ${EDUCATION_LIMITS.maxPages} pages`} onFiles={(f) => src.setFile(f[0])} testId="dropzone-education" />
          )}
          <div>
            <label htmlFor="page-range" className="mb-1 block text-sm font-semibold text-gray-900">Page range <span className="font-normal text-gray-500">(optional)</span></label>
            <input id="page-range" value={src.pageRange} disabled={disabled} onChange={(e) => src.setPageRange(e.target.value)} placeholder="e.g. 3-10" aria-invalid={!!src.rangeError} aria-describedby={src.rangeError ? "range-err" : undefined} className="h-10 w-full max-w-xs rounded-lg border border-gray-300 px-3 text-sm focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20" data-testid="input-page-range" />
            {src.rangeError && <p id="range-err" role="alert" className="mt-1 text-sm text-red-600">{src.rangeError}</p>}
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="paste-text" className="mb-1 block text-sm font-semibold text-gray-900">Paste your notes</label>
          <textarea id="paste-text" value={src.text} disabled={disabled} onChange={(e) => src.setText(e.target.value)} rows={8} placeholder="Paste at least a few sentences of study material" className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20" data-testid="input-paste-text" />
          <div className="mt-1 flex justify-between text-xs text-gray-500"><span>{src.text.trim().length < 50 ? "Minimum 50 characters" : "Ready"}</span><span>{src.text.length.toLocaleString()} / {EDUCATION_LIMITS.maxPasteChars.toLocaleString()}</span></div>
          {src.textError && <p role="alert" className="mt-1 text-sm text-red-600">{src.textError}</p>}
        </div>
      )}
    </div>
  );
}
