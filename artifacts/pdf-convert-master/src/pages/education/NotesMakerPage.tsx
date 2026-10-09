import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useExtractEducationPdf, generateEducationNotes } from "@workspace/api-client-react";
import type { EducationNotes, EducationNotesInput } from "@workspace/api-client-react";
import { EducationToolLayout } from "@/components/education/EducationToolLayout";
import { UploadBox } from "@/components/education/UploadBox";
import { ChipGroup, LANGUAGE_OPTIONS } from "@/components/education/OptionControls";
import { GenerationProgress, type Phase } from "@/components/education/GenerationProgress";
import { GenerationError } from "@/components/education/GenerationError";
import { EducationHistory } from "@/components/education/EducationHistory";
import { NotesEditor, type NotesEditorHandle } from "@/components/education/NotesEditor";
import { describeError } from "@/lib/education/errors";
import { useSourceInput } from "@/lib/education/useSource";
import { educationHeaders, requestIdentity } from "@/lib/education/requests";
import { requestExport, printStudyMaterial, slugify } from "@/lib/education/exportHelpers";
import { useAuth } from "@/contexts/AuthContext";

export function NotesMakerPage(): JSX.Element {
  const src = useSourceInput();
  const extract = useExtractEducationPdf();
  const { user, refreshUser } = useAuth();
  const owner = user?.id ?? "guest";
  const previousOwner = useRef(owner);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const busy = useRef(false);
  const exporting = useRef(false);
  const editor = useRef<NotesEditorHandle>(null);
  const [style, setStyle] = useState<EducationNotesInput["style"]>("detailed");
  const [language, setLanguage] = useState<EducationNotesInput["language"]>("same");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notes, setNotes] = useState<EducationNotes | null>(null);
  const [version, setVersion] = useState(0);

  const reset = () => { setNotes(null); setError(null); setExportError(null); setWarnings([]); src.clear(); request.current = null; setVersion((v) => v + 1); };
  useEffect(() => {
    if (previousOwner.current !== owner) { previousOwner.current = owner; reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  const running = phase !== "idle";
  const can = src.canSubmit && !running;

  const run = async () => {
    if (busy.current || !can) return;
    if (notes && !window.confirm("New notes will replace your current edits. Export them first if you want to keep them. Continue?")) return;
    busy.current = true; setError(null); setWarnings([]);
    const caller = educationHeaders().Authorization;
    try {
      let pages: { pageNumber: number | null; text: string }[];
      if (src.mode === "upload" && src.file) {
        setPhase("reading");
        const ex = await extract.mutateAsync({ data: { file: src.file, pageRange: src.normalized || undefined } });
        setWarnings(ex.warnings);
        pages = ex.pages.filter((p) => p.text.trim());
        if (pages.length === 0) throw new Error("No readable text was found in this PDF or page range.");
      } else pages = [{ pageNumber: null, text: src.text.trim() }];
      setPhase("generating");
      const input = { pages, language, style };
      const n = await generateEducationNotes({ ...input, requestId: requestIdentity(request, input) }, { headers: educationHeaders() });
      pages = [];
      if (educationHeaders().Authorization !== caller) return;
      request.current = null;
      setNotes(n); setVersion((v) => v + 1); setExportError(null); src.clear();
      void refreshUser();
    } catch (e) { setError(describeError(e)); }
    finally { setPhase("idle"); busy.current = false; }
  };

  const doExport = async (format: "pdf" | "docx" | "markdown" | "print") => {
    if (exporting.current || !editor.current) return;
    exporting.current = true; setExportBusy(true); setExportError(null);
    try {
      const current = editor.current.snapshot();
      setNotes(current);
      if (format === "print") await printStudyMaterial({ kind: "notes", notes: current });
      else await requestExport({ kind: "notes", format, notes: current }, `${slugify(current.title)}-notes.${format === "markdown" ? "md" : format}`);
    } catch (e) { setExportError(describeError(e)); }
    finally { exporting.current = false; setExportBusy(false); }
  };

  const options = (
    <div className="space-y-5">
      <ChipGroup label="Note style" testId="chip-notes-style" disabled={running} value={style} onChange={setStyle}
        options={[{ value: "detailed", label: "Detailed" }, { value: "summary", label: "Summary" }, { value: "bullets", label: "Bullet points" }, { value: "cornell", label: "Cornell" }, { value: "mind-map", label: "Mind-map outline" }] as const} />
      <ChipGroup label="Language" testId="chip-language" disabled={running} value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
      <button type="button" onClick={run} disabled={!can} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f7433d] px-8 text-base font-semibold text-white shadow-sm hover:bg-[#e03832] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" data-testid="button-generate-notes">
        {running ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}{running ? "Generating..." : "Make Notes"}
      </button>
      {notes && <p className="text-xs text-gray-500">Generating new notes replaces the notes below, including your edits.</p>}
      {!src.canSubmit && !running && <p className="text-xs text-gray-500">Add a PDF or paste some text to continue.</p>}
      <GenerationProgress phase={phase} noun="notes" skipReading={src.mode === "paste"} />
      <div aria-live="assertive"><GenerationError error={error} retry={run} disabled={!can} /></div>
      {warnings.length > 0 && <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
    </div>
  );

  const btn = "rounded-full border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50";
  return (
    <EducationToolLayout toolId="notes-maker" seoTitle="PDF to Study Notes — Editable AI Notes Maker | PDF Genius" seoDescription="Turn a lecture PDF into editable study notes with source pages. Choose detailed, summary, Cornell or mind-map style and export to PDF, Word or Markdown."
      upload={<UploadBox src={src} disabled={running} />} options={options}
      result={<>
        {notes && <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" disabled={running || exportBusy} onClick={() => { if (window.confirm("Clear these notes and any edits?")) reset(); }} className={btn}>Start over</button>
            <button type="button" disabled={exportBusy} onClick={() => doExport("pdf")} className={btn}>Export PDF</button>
            <button type="button" disabled={exportBusy} onClick={() => doExport("docx")} className={btn}>Export DOCX</button>
            <button type="button" disabled={exportBusy} onClick={() => doExport("markdown")} className={btn}>Export Markdown</button>
            <button type="button" disabled={exportBusy} onClick={() => doExport("print")} className={btn}>Print</button>
          </div>
          {exportBusy && <p role="status" className="mb-3 text-sm text-gray-600">Preparing export...</p>}
          {exportError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{exportError}</p>}
          <p className="mb-4 text-xs text-gray-500">Edits stay in this page and are not saved automatically. Export to keep them.</p>
          <NotesEditor key={version} ref={editor} notes={notes} disabled={running || exportBusy} />
        </div>}
        <EducationHistory kind="notes" revision={String(version)} onOpen={(saved) => { if (saved.notes) {
          if (notes && !window.confirm("Opening saved notes will replace your current edits. Export them first if you want to keep them. Continue?")) return;
          setNotes(saved.notes); setVersion((v) => v + 1); src.clear(); setError(null); setExportError(null);
        } }} />
      </>} />
  );
}
export default NotesMakerPage;
