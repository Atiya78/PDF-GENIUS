import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, FileText, ShieldCheck, X } from "lucide-react";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { EDUCATION_LIMITS } from "@/lib/education/educationTools";
import type { SourceState } from "@/lib/education/useSource";
import { cn } from "@/lib/utils";

export function UploadBox({ src, disabled, pdfOnly }: { src: SourceState; disabled: boolean; pdfOnly?: boolean }) {
  const reduce = useReducedMotion();
  const upload = pdfOnly || src.mode === "upload";
  const tab = (m: "upload" | "paste", label: string) => (
    <button type="button" role="tab" aria-selected={src.mode === m} disabled={disabled} onClick={() => src.setMode(m)} data-testid={`tab-source-${m}`}
      className={cn("edu-tab", src.mode === m && "edu-tab-on")}>
      {label}
    </button>
  );
  return (
    <div>
      {!pdfOnly && <div role="tablist" aria-label="Source" className="edu-tabs mb-5">{tab("upload", "Upload PDF")}{tab("paste", "Paste text")}</div>}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={upload ? "upload" : "paste"} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {upload ? (
            <div className="space-y-5">
              {src.file ? (
                <div className="flex items-center gap-3 rounded-[12px] border border-[#e7e0d5] bg-white p-3 pl-4" data-testid="text-selected-file">
                  <span className="flex h-10 w-9 items-center justify-center rounded-[6px] bg-[#fdece9] text-[#c8302a]"><FileText className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#1c1917]">{src.file.name}</p><p className="edu-mono text-xs text-[#8a837b]">{(src.file.size / 1048576).toFixed(2)} MB</p></div>
                  <button type="button" disabled={disabled} onClick={() => src.setFile(null)} aria-label="Remove file" className="rounded-[8px] p-2 text-[#8a837b] hover:bg-[#f3eee6] hover:text-[#1c1917] disabled:opacity-50" data-testid="button-remove-file"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <UploadDropzone acceptedFormats={[".pdf"]} maxFileSize={EDUCATION_LIMITS.maxMb} disabled={disabled} title="Drop your lecture PDF here" subtitle={`Up to ${EDUCATION_LIMITS.maxMb} MB. Page cap 50 (free/Basic), 100 (Pro), ${EDUCATION_LIMITS.maxPages} (Max)`} onFiles={(f) => src.setFile(f[0])} testId="dropzone-education" />
              )}
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="w-full max-w-[14rem]">
                  <label htmlFor="page-range" className="edu-label mb-2">Page range <span className="font-normal text-[#8a837b]">(optional)</span></label>
                  <input id="page-range" value={src.pageRange} disabled={disabled} onChange={(e) => src.setPageRange(e.target.value)} placeholder="e.g. 3-10" aria-invalid={!!src.rangeError} aria-describedby={src.rangeError ? "range-err" : undefined} className="edu-input edu-mono" data-testid="input-page-range" />
                </div>
                <p className="pb-3 text-xs text-[#8a837b]">Only need one chapter? Set its pages here.</p>
              </div>
              {src.rangeError && <p id="range-err" role="alert" className="-mt-3 text-sm text-[#8f1f1a]">{src.rangeError}</p>}
            </div>
          ) : (
            <div>
              <label htmlFor="paste-text" className="edu-label mb-2">Paste your notes</label>
              <textarea id="paste-text" value={src.text} disabled={disabled} onChange={(e) => src.setText(e.target.value)} rows={9} placeholder="Paste at least a few sentences of study material" className="edu-ruled w-full rounded-[12px] border border-[#e7e0d5] bg-white py-[6px] pl-12 pr-4 text-sm leading-8 text-[#1c1917] focus:border-[#1c1917] focus:outline-none focus:ring-[3px] focus:ring-[#f7433d]/20" data-testid="input-paste-text" />
              <div className="mt-1.5 flex justify-between text-xs"><span className={src.text.trim().length < 50 ? "text-[#8a837b]" : "font-semibold text-[#2f5d50]"}>{src.text.trim().length < 50 ? "Minimum 50 characters" : "Ready"}</span><span className="edu-mono text-[#8a837b]">{src.text.length.toLocaleString()} / {EDUCATION_LIMITS.maxPasteChars.toLocaleString()}</span></div>
              {src.textError && <p role="alert" className="mt-1 text-sm text-[#8f1f1a]">{src.textError}</p>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <details className="edu-details mt-5 rounded-[10px] border border-[#efe8dd] bg-[#faf7f2]">
        <summary className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-[#1c1917]">
          <ShieldCheck className="h-4 w-4 text-[#2f5d50]" aria-hidden="true" />How your file and credits are handled
          <ChevronRight className="edu-caret ml-auto h-4 w-4 text-[#8a837b]" aria-hidden="true" />
        </summary>
        <ul className="space-y-1.5 border-t border-[#efe8dd] px-3.5 py-3 text-xs leading-relaxed text-[#57534e] [&>li]:pl-3 [&>li]:relative [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.55em] [&>li]:before:h-1 [&>li]:before:w-1 [&>li]:before:rounded-full [&>li]:before:bg-[#c9bfb1]" data-testid="text-ai-disclosure">
          <li>Privacy: PDFs and extracted source text are processed in memory, not stored as uploaded-source files.</li>
          <li>Text is sent to the configured AI provider, whose retention policies apply. Do not upload confidential material.</li>
          <li>Signed-in accounts save generated results, including quoted citations, for 24 hours.</li>
          <li>Flashcard progress is saved on this device; chat sessions and note edits last only while this page remains open.</li>
          <li>Quizzes and exam papers use Education credits (see Education plans). Other tools give five free successful generations per day, then one Education credit each.</li>
          <li>Failed generations and unsupported Q&amp;A answers do not spend credits.</li>
        </ul>
      </details>
    </div>
  );
}
