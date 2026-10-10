import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Languages, Loader2, RotateCcw } from "lucide-react";
import { useExtractEducationPdf } from "@workspace/api-client-react";
import type { EducationTranslation, EducationTranslationInput } from "@workspace/api-client-react";
import { EducationToolLayout } from "@/components/education/EducationToolLayout";
import { UploadBox } from "@/components/education/UploadBox";
import { ChipGroup } from "@/components/education/OptionControls";
import { GenerationError } from "@/components/education/GenerationError";
import { EducationHistory } from "@/components/education/EducationHistory";
import { describeError } from "@/lib/education/errors";
import { useSourceInput } from "@/lib/education/useSource";
import { readSourcePages } from "@/lib/education/sourcePages";
import { useTranslationStream } from "@/lib/education/translationStream";
import { requestExport, slugify } from "@/lib/education/exportHelpers";
import { useAuth } from "@/contexts/AuthContext";

const btn = "rounded-full border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50";

export function PdfTranslatorPage(): JSX.Element {
  const src = useSourceInput();
  const extract = useExtractEducationPdf();
  const { user, refreshUser } = useAuth();
  const owner = user?.id ?? "guest";
  const previousOwner = useRef(owner);
  const busy = useRef(false);
  const exporting = useRef(false);
  const [direction, setDirection] = useState<EducationTranslationInput["direction"]>("auto");
  const [technical, setTechnical] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [docTitle, setDocTitle] = useState("Translated document");
  const stream = useTranslationStream(() => { void refreshUser(); setVersion((v) => v + 1); });
  const { status, progress, translated, failed, retrying, message, result, source } = stream;

  const resetAll = () => { stream.reset(); src.clear(); setError(null); setExportError(null); setWarnings([]); setPage(1); setVersion((v) => v + 1); };
  const resetRef = useRef(resetAll); resetRef.current = resetAll;
  useEffect(() => {
    if (previousOwner.current !== owner) { previousOwner.current = owner; resetRef.current(); }
  }, [owner]);

  const running = reading || status === "running";
  const hasDoc = status !== "idle";
  const can = src.canSubmit && !running;

  const pageNumbers = useMemo(() => {
    const set = new Set<number>(source.map((p) => p.pageNumber ?? 0).filter(Boolean));
    Object.keys(translated).forEach((k) => set.add(Number(k)));
    return Array.from(set).sort((a, b) => a - b);
  }, [source, translated]);
  const current = pageNumbers.includes(page) ? page : pageNumbers[0] ?? 1;
  const idx = pageNumbers.indexOf(current);
  const original = source.find((p) => p.pageNumber === current)?.text;
  const tp = translated[current];

  const run = async () => {
    if (busy.current || !can) return;
    if (result && !window.confirm("Starting a new document replaces the translation below. Export it first if you want to keep it. Continue?")) return;
    busy.current = true; setError(null); setWarnings([]); setExportError(null);
    try {
      setReading(true);
      const { pages, warnings: w } = await readSourcePages(src, extract.mutateAsync, true, true);
      setWarnings(w); setReading(false);
      setDocTitle(src.mode === "upload" && src.file ? src.file.name.replace(/\.pdf$/i, "") : "Translated text");
      setPage(pages[0].pageNumber ?? 1);
      await stream.start(pages, { direction, keepTechnicalEnglish: technical });
      src.clear();
    } catch (e) { setError(describeError(e)); }
    finally { setReading(false); busy.current = false; }
  };

  const doExport = async (format: "pdf" | "docx") => {
    if (exporting.current) return;
    const pages = result?.pages ?? Object.values(translated).sort((a, b) => a.pageNumber - b.pageNumber);
    if (pages.length === 0) return;
    exporting.current = true; setExportBusy(true); setExportError(null);
    try {
      const translation: EducationTranslation = { title: result?.title ?? docTitle, pages };
      await requestExport({ kind: "translation", format, translation }, `${slugify(translation.title)}-translation.${format}`);
    } catch (e) { setExportError(describeError(e)); }
    finally { exporting.current = false; setExportBusy(false); }
  };

  const options = (
    <div className="space-y-5">
      <ChipGroup label="Direction" testId="chip-direction" disabled={running || hasDoc} value={direction} onChange={setDirection}
        options={[{ value: "auto", label: "Auto-detect" }, { value: "bangla-to-english", label: "Bangla to English" }, { value: "english-to-bangla", label: "English to Bangla" }] as const} />
      <label className="flex items-start gap-3 text-sm text-gray-800">
        <input type="checkbox" checked={technical} disabled={running || hasDoc} onChange={(e) => setTechnical(e.target.checked)} className="mt-1 h-4 w-4 accent-[#f7433d]" data-testid="toggle-technical-english" />
        <span><span className="font-semibold">Keep technical terms in English</span><br /><span className="text-xs text-gray-500">Applies inside Bangla output.</span></span>
      </label>
      {hasDoc && <p className="text-xs text-gray-500">Settings are locked while a document is open so retries stay consistent. Choose New document to change them.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={!can} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#f7433d] px-8 text-base font-semibold text-white shadow-sm hover:bg-[#e03832] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-translate">
          {running ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Languages className="h-5 w-5" aria-hidden="true" />}{reading ? "Reading PDF..." : status === "running" ? "Translating..." : hasDoc ? "Translate new document" : "Translate"}
        </button>
        {hasDoc && <button type="button" className={btn} disabled={running} onClick={() => { if (!result || window.confirm("Clear this translation?")) resetAll(); }} data-testid="button-new-document">New document</button>}
      </div>
      <p className="text-xs text-gray-500">A whole document counts as one generation from your normal daily allowance, not one per page. Partial results are never charged.</p>
      {!src.canSubmit && !running && <p className="text-xs text-gray-500">Add a PDF or paste some text to continue.</p>}
      <div aria-live="assertive"><GenerationError error={error} retry={run} disabled={!can} /></div>
      {warnings.length > 0 && <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
    </div>
  );

  const pct = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
  const failedList = Object.entries(failed).map(([k, v]) => [Number(k), v] as const).sort((a, b) => a[0] - b[0]);

  return (
    <EducationToolLayout toolId="pdf-translator" seoTitle="Bangla English PDF Translator — Page by Page | PDF Genius" seoDescription="Translate PDFs between Bangla and English page by page with side-by-side original and translation, retry failed pages, and export PDF or DOCX."
      upload={<UploadBox src={src} disabled={running || hasDoc} pdfOnly={false} />} options={options}
      result={<>
        {hasDoc && <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6" data-testid="panel-translation">
          <div role="status" aria-live="polite" className="mb-4">
            <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
              <span>{status === "done" ? "Translation complete" : status === "running" ? "Translating page by page" : status === "partial" ? "Some pages need a retry" : "Translation paused"}</span>
              <span data-testid="text-translate-progress">{progress.completed} of {progress.total} pages</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full origin-left bg-[#f7433d] transition-transform" style={{ transform: `scaleX(${pct / 100})` }} /></div>
            {message && <p role="alert" className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
            {status === "error" && progress.completed < progress.total && <button type="button" onClick={() => void stream.resume()} className={`${btn} mt-2`} data-testid="button-resume-translation"><RotateCcw className="mr-1 inline h-4 w-4" aria-hidden="true" />Retry remaining pages</button>}
          </div>
          {failedList.length > 0 && <ul className="mb-4 space-y-2" data-testid="list-failed-pages">{failedList.map(([n, m]) => <li key={n} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><span>Page {n}: {m}</span>
            <button type="button" disabled={running} onClick={() => void stream.retryPage(n)} className="rounded-full border border-red-300 bg-white px-3 py-1.5 font-semibold disabled:opacity-50" data-testid={`button-retry-page-${n}`}>{retrying === n ? "Retrying..." : `Retry page ${n}`}</button></li>)}</ul>}
          {pageNumbers.length > 0 && <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" className={btn} disabled={idx <= 0} onClick={() => setPage(pageNumbers[idx - 1])} aria-label="Previous page" data-testid="button-prev-page"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
              <label className="text-sm text-gray-700">Page <select value={current} onChange={(e) => setPage(Number(e.target.value))} className="ml-1 rounded-lg border border-gray-300 px-2 py-1.5" data-testid="select-page">{pageNumbers.map((n) => <option key={n} value={n}>{n}{failed[n] ? " (failed)" : translated[n] ? (translated[n].text.trim() ? "" : " (blank)") : " (pending)"}</option>)}</select> of {pageNumbers.length}</label>
              <button type="button" className={btn} disabled={idx >= pageNumbers.length - 1} onClick={() => setPage(pageNumbers[idx + 1])} aria-label="Next page" data-testid="button-next-page"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <section aria-label={`Original page ${current}`}><h3 className="mb-2 text-sm font-semibold text-gray-900">Original</h3>
                <div className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800" data-testid="text-original-page">{original === undefined ? "The original text is not kept for saved results. Upload the PDF again to compare." : original.trim() ? original : "This page is blank in the original PDF."}</div></section>
              <section aria-label={`Translated page ${current}`}><h3 className="mb-2 text-sm font-semibold text-gray-900">Translation{tp ? ` (${tp.sourceLanguage} to ${tp.targetLanguage})` : ""}</h3>
                <div className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-900" data-testid="text-translated-page">
                  {tp ? (tp.text.trim() ? tp.text : "Blank page. There is no text to translate, so this page is kept empty in the translation and exports.") : failed[current] ? "This page failed. Use the retry button above." : status === "running" ? "Translating this page..." : "Not translated yet."}</div></section>
            </div>
          </>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={exportBusy || Object.keys(translated).length === 0} onClick={() => doExport("pdf")} className={btn} data-testid="button-export-translation-pdf">Export PDF</button>
            <button type="button" disabled={exportBusy || Object.keys(translated).length === 0} onClick={() => doExport("docx")} className={btn} data-testid="button-export-translation-docx">Export DOCX</button>
          </div>
          {status !== "done" && Object.keys(translated).length > 0 && <p className="mt-2 text-xs text-gray-500">Exports include only the pages translated so far.</p>}
          {exportBusy && <p role="status" className="mt-2 text-sm text-gray-600">Preparing export...</p>}
          {exportError && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{exportError}</p>}
        </div>}
        <EducationHistory kind="translation" revision={String(version)} onOpen={(saved) => { if (saved.translation) {
          if (result && !window.confirm("Opening a saved translation replaces the current one. Continue?")) return;
          stream.showResult(saved.translation); setDocTitle(saved.translation.title); setPage(saved.translation.pages[0]?.pageNumber ?? 1); setError(null); src.clear();
        } }} />
      </>} />
  );
}
export default PdfTranslatorPage;
