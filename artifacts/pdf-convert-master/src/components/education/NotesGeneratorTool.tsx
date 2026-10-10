import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useExtractEducationPdf } from "@workspace/api-client-react";
import type { EducationNotes, EducationNotesInput } from "@workspace/api-client-react";
import { EducationToolLayout } from "@/components/education/EducationToolLayout";
import { UploadBox } from "@/components/education/UploadBox";
import { ChipGroup, LANGUAGE_OPTIONS } from "@/components/education/OptionControls";
import { GenerationProgress, type Phase } from "@/components/education/GenerationProgress";
import { GenerationError } from "@/components/education/GenerationError";
import { EducationHistory } from "@/components/education/EducationHistory";
import { NotesEditor, type NotesEditorHandle } from "@/components/education/NotesEditor";
import { MindMapTree } from "@/components/education/MindMapTree";
import { describeError } from "@/lib/education/errors";
import { useSourceInput } from "@/lib/education/useSource";
import { readSourcePages } from "@/lib/education/sourcePages";
import { educationHeaders, requestIdentity } from "@/lib/education/requests";
import { requestExport, printStudyMaterial, slugify } from "@/lib/education/exportHelpers";
import { useAuth } from "@/contexts/AuthContext";

interface Config {
  toolId: string;
  seoTitle: string;
  seoDescription: string;
  historyKind: "summary" | "mindmap";
  noun: string;
  action: string;
  style: EducationNotesInput["style"];
  generate: (input: EducationNotesInput, options: { headers: Record<string, string> }) => Promise<EducationNotes>;
  tree?: boolean;
}

const btn = "rounded-full border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50";

export function NotesGeneratorTool({ cfg }: { cfg: Config }): JSX.Element {
  const src = useSourceInput();
  const extract = useExtractEducationPdf();
  const { user, refreshUser } = useAuth();
  const owner = user?.id ?? "guest";
  const previousOwner = useRef(owner);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const busy = useRef(false);
  const exporting = useRef(false);
  const editor = useRef<NotesEditorHandle>(null);
  const [language, setLanguage] = useState<EducationNotesInput["language"]>("same");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notes, setNotes] = useState<EducationNotes | null>(null);
  const [version, setVersion] = useState(0);

  const reset = () => { setNotes(null); setError(null); setExportError(null); setWarnings([]); src.clear(); request.current = null; setVersion((v) => v + 1); };
  const resetRef = useRef(reset); resetRef.current = reset;
  useEffect(() => { if (previousOwner.current !== owner) { previousOwner.current = owner; resetRef.current(); } }, [owner]);

  const running = phase !== "idle";
  const can = src.canSubmit && !running;

  const run = async () => {
    if (busy.current || !can) return;
    if (notes && !window.confirm(`A new ${cfg.noun} will replace your current edits. Export them first if you want to keep them. Continue?`)) return;
    busy.current = true; setError(null); setWarnings([]);
    const caller = educationHeaders().Authorization;
    try {
      setPhase("reading");
      const { pages, warnings: w } = await readSourcePages(src, extract.mutateAsync);
      setWarnings(w); setPhase("generating");
      const input: EducationNotesInput = { pages, language, style: cfg.style };
      const n = await cfg.generate({ ...input, requestId: requestIdentity(request, { pages, language, style: cfg.style }) }, { headers: educationHeaders() });
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
      else await requestExport({ kind: "notes", format, notes: current }, `${slugify(current.title)}-${cfg.historyKind}.${format === "markdown" ? "md" : format}`);
    } catch (e) { setExportError(describeError(e)); }
    finally { exporting.current = false; setExportBusy(false); }
  };

  const applyEdits = () => {
    if (!editor.current) return;
    try { setNotes(editor.current.snapshot()); setExportError(null); } catch (e) { setExportError(describeError(e)); }
  };

  const options = (
    <div className="space-y-5">
      <ChipGroup label="Language" testId="chip-language" disabled={running} value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
      <button type="button" onClick={run} disabled={!can} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f7433d] px-8 text-base font-semibold text-white shadow-sm hover:bg-[#e03832] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" data-testid={`button-generate-${cfg.historyKind}`}>
        {running ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}{running ? "Generating..." : cfg.action}
      </button>
      <p className="text-xs text-gray-500">Each successful generation uses your normal daily allowance.</p>
      {notes && <p className="text-xs text-gray-500">Generating again replaces the result below, including your edits.</p>}
      {!src.canSubmit && !running && <p className="text-xs text-gray-500">Add a PDF or paste some text to continue.</p>}
      <GenerationProgress phase={phase} noun={cfg.noun} skipReading={src.mode === "paste"} />
      <div aria-live="assertive"><GenerationError error={error} retry={run} disabled={!can} /></div>
      {warnings.length > 0 && <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
    </div>
  );

  return (
    <EducationToolLayout toolId={cfg.toolId} seoTitle={cfg.seoTitle} seoDescription={cfg.seoDescription}
      upload={<UploadBox src={src} disabled={running} />} options={options}
      result={<>
        {notes && <div className="space-y-4">
          {cfg.tree && <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"><h2 className="mb-3 font-['Poppins'] text-lg font-semibold text-gray-900">Mind map</h2><MindMapTree notes={notes} />
            <p className="mt-3 text-xs text-gray-500">The map is drawn from the outline below. After editing the outline, choose Update map.</p></div>}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" disabled={running || exportBusy} onClick={() => { if (window.confirm("Clear this result and any edits?")) reset(); }} className={btn}>Start over</button>
              {cfg.tree && <button type="button" disabled={exportBusy} onClick={applyEdits} className={btn} data-testid="button-update-map">Update map</button>}
              <button type="button" disabled={exportBusy} onClick={() => doExport("pdf")} className={btn} data-testid="button-export-pdf">Export PDF</button>
              <button type="button" disabled={exportBusy} onClick={() => doExport("docx")} className={btn} data-testid="button-export-docx">Export DOCX</button>
              <button type="button" disabled={exportBusy} onClick={() => doExport("markdown")} className={btn} data-testid="button-export-markdown">Export Markdown</button>
              <button type="button" disabled={exportBusy} onClick={() => doExport("print")} className={btn} data-testid="button-print">Print</button>
            </div>
            {exportBusy && <p role="status" className="mb-3 text-sm text-gray-600">Preparing export...</p>}
            {exportError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{exportError}</p>}
            <p className="mb-4 text-xs text-gray-500">Edits stay in this page and are not saved automatically. Export to keep them.</p>
            <NotesEditor key={version} ref={editor} notes={notes} disabled={running || exportBusy} />
          </div>
        </div>}
        <EducationHistory kind={cfg.historyKind} revision={String(version)} onOpen={(saved) => { if (saved.notes) {
          if (notes && !window.confirm("Opening a saved result will replace your current edits. Export them first if you want to keep them. Continue?")) return;
          setNotes(saved.notes); setVersion((v) => v + 1); src.clear(); setError(null); setExportError(null);
        } }} />
      </>} />
  );
}
