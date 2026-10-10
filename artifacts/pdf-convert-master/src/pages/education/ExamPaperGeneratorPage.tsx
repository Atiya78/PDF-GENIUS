import { useEffect, useMemo, useRef, useState } from "react";
import { FileQuestion, Loader2 } from "lucide-react";
import { generateEducationExam, regenerateEducationExamQuestion, useExtractEducationPdf } from "@workspace/api-client-react";
import type { EducationExamPaper, EducationExamSettings, EducationSourcePage } from "@workspace/api-client-react";
import { EducationToolLayout } from "@/components/education/EducationToolLayout";
import { UploadBox } from "@/components/education/UploadBox";
import { GenerationProgress, type Phase } from "@/components/education/GenerationProgress";
import { GenerationError } from "@/components/education/GenerationError";
import { EducationHistory } from "@/components/education/EducationHistory";
import { ExamSettingsForm, defaultSettings } from "@/components/education/exam/ExamSettingsForm";
import { ExamQuestionEditor } from "@/components/education/exam/ExamQuestionEditor";
import { describeError } from "@/lib/education/errors";
import { useSourceInput } from "@/lib/education/useSource";
import { readSourcePages } from "@/lib/education/sourcePages";
import { educationHeaders, requestIdentity } from "@/lib/education/requests";
import { requestExport, printStudyMaterial, slugify } from "@/lib/education/exportHelpers";
import { marksFor, validatePaper, validateSettings } from "@/lib/education/examValidation";
import { useAuth } from "@/contexts/AuthContext";

const btn = "rounded-full border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50";
type ExportKind = "exam-paper" | "exam-key";

export function ExamPaperGeneratorPage(): JSX.Element {
  const src = useSourceInput();
  const extract = useExtractEducationPdf();
  const { user, refreshUser } = useAuth();
  const owner = user?.id ?? "guest";
  const previousOwner = useRef(owner);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const regenRequest = useRef<{ signature: string; id: string } | null>(null);
  const pagesRef = useRef<EducationSourcePage[] | null>(null);
  const busy = useRef(false);
  const exporting = useRef(false);
  const [settings, setSettings] = useState<EducationExamSettings>(defaultSettings);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [paper, setPaper] = useState<EducationExamPaper | null>(null);
  const [regenId, setRegenId] = useState<string | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [exportErrors, setExportErrors] = useState<string[]>([]);
  const [exportBusy, setExportBusy] = useState(false);
  const [version, setVersion] = useState(0);

  const reset = () => { setPaper(null); setError(null); setWarnings([]); setRegenError(null); setExportErrors([]); src.clear(); request.current = null; regenRequest.current = null; pagesRef.current = null; setVersion((v) => v + 1); };
  const resetRef = useRef(reset); resetRef.current = reset;
  useEffect(() => { if (previousOwner.current !== owner) { previousOwner.current = owner; resetRef.current(); } }, [owner]);
  useEffect(() => () => { pagesRef.current = null; }, []);

  const settingsErrors = useMemo(() => validateSettings(settings), [settings]);
  const running = phase !== "idle" || regenId !== null;
  const can = src.canSubmit && !running && settingsErrors.length === 0;
  const paperErrors = useMemo(() => (paper ? validatePaper(paper) : []), [paper]);

  const run = async () => {
    if (busy.current || !can) return;
    if (paper && !window.confirm("A new paper will replace your current edits. Export them first if you want to keep them. Continue?")) return;
    busy.current = true; setError(null); setWarnings([]); setRegenError(null);
    const caller = educationHeaders().Authorization;
    try {
      setPhase("reading");
      const { pages, warnings: w } = await readSourcePages(src, extract.mutateAsync);
      setWarnings(w); setPhase("generating");
      const p = await generateEducationExam({ pages, settings, requestId: requestIdentity(request, { pages, settings }) }, { headers: educationHeaders() });
      if (educationHeaders().Authorization !== caller) return;
      request.current = null; pagesRef.current = pages;
      setPaper(p); setVersion((v) => v + 1); setExportErrors([]); src.clear();
      void refreshUser();
    } catch (e) { setError(describeError(e)); }
    finally { setPhase("idle"); busy.current = false; }
  };

  const regenerate = async (questionId: string) => {
    if (busy.current || !paper) return;
    if (!window.confirm("Regenerate this question? Your edits to it are replaced and it counts as one successful generation from your daily allowance.")) return;
    busy.current = true; setRegenId(questionId); setRegenError(null);
    const caller = educationHeaders().Authorization;
    try {
      let pages = pagesRef.current;
      if (!pages) {
        if (!src.canSubmit) throw new Error("Add the source PDF or text again above, then regenerate this question.");
        pages = (await readSourcePages(src, extract.mutateAsync)).pages;
        pagesRef.current = pages;
      }
      const updated = await regenerateEducationExamQuestion({ pages, paper, questionId, requestId: requestIdentity(regenRequest, { questionId, paper }) }, { headers: educationHeaders() });
      if (educationHeaders().Authorization !== caller) return;
      regenRequest.current = null; setPaper(updated); setExportErrors([]);
      void refreshUser();
    } catch (e) { setRegenError(describeError(e)); }
    finally { setRegenId(null); busy.current = false; }
  };

  const doExport = async (kind: ExportKind, format: "pdf" | "docx" | "print") => {
    if (exporting.current || !paper) return;
    const errs = validatePaper(paper);
    setExportErrors(errs);
    if (errs.length) return;
    exporting.current = true; setExportBusy(true);
    try {
      if (format === "print") await printStudyMaterial({ kind, exam: paper });
      else await requestExport({ kind, format, exam: paper }, `${slugify(paper.title)}-${kind === "exam-key" ? "answer-key" : "question-paper"}.${format}`);
    } catch (e) { setExportErrors([describeError(e)]); }
    finally { exporting.current = false; setExportBusy(false); }
  };

  const options = (
    <div className="space-y-5">
      <ExamSettingsForm settings={settings} onChange={setSettings} disabled={running} errors={settingsErrors} />
      <button type="button" onClick={run} disabled={!can} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f7433d] px-8 text-base font-semibold text-white shadow-sm hover:bg-[#e03832] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" data-testid="button-generate-exam">
        {phase !== "idle" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FileQuestion className="h-5 w-5" aria-hidden="true" />}{phase !== "idle" ? "Generating..." : "Generate paper"}
      </button>
      <p className="text-xs text-gray-500">One successful generation uses your normal daily allowance. Regenerating a single question also counts as one.</p>
      {paper && <p className="text-xs text-gray-500">Generating again replaces the paper below, including your edits.</p>}
      {!src.canSubmit && !running && <p className="text-xs text-gray-500">Add a PDF or paste some text to continue.</p>}
      <GenerationProgress phase={phase} noun="exam paper" skipReading={src.mode === "paste"} />
      <div aria-live="assertive"><GenerationError error={error} retry={run} disabled={!can} /></div>
      {warnings.length > 0 && <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
    </div>
  );

  const board = paper?.settings.format === "bangladesh-board";
  const updateQ = (i: number, q: EducationExamPaper["questions"][number]) => setPaper((p) => (p ? { ...p, questions: p.questions.map((x, k) => (k === i ? q : x)) } : p));

  return (
    <EducationToolLayout toolId="exam-paper-generator" seoTitle="Exam Question Paper Generator — Bangladesh Board Style | PDF Genius" seoDescription="Generate an A4 exam paper and separate answer key with exact marks totals, creative questions with stimulus and four parts, per-question regenerate and PDF or DOCX export."
      upload={<UploadBox src={src} disabled={running} />} options={options}
      result={<>
        {paper && <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6" data-testid="panel-exam-paper">
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" disabled={running || exportBusy} onClick={() => { if (window.confirm("Clear this paper and any edits?")) reset(); }} className={btn}>Start over</button>
          </div>
          <div className="mb-4 grid gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-2">
            <div><p className="text-sm font-semibold text-gray-900">Question paper</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={exportBusy || running} onClick={() => doExport("exam-paper", "pdf")} className={btn} data-testid="button-export-paper-pdf">PDF</button>
                <button type="button" disabled={exportBusy || running} onClick={() => doExport("exam-paper", "docx")} className={btn} data-testid="button-export-paper-docx">DOCX</button>
                <button type="button" disabled={exportBusy || running} onClick={() => doExport("exam-paper", "print")} className={btn} data-testid="button-print-paper">Print</button></div></div>
            <div><p className="text-sm font-semibold text-gray-900">Answer key and marking scheme</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={exportBusy || running} onClick={() => doExport("exam-key", "pdf")} className={btn} data-testid="button-export-key-pdf">PDF</button>
                <button type="button" disabled={exportBusy || running} onClick={() => doExport("exam-key", "docx")} className={btn} data-testid="button-export-key-docx">DOCX</button>
                <button type="button" disabled={exportBusy || running} onClick={() => doExport("exam-key", "print")} className={btn} data-testid="button-print-key">Print</button></div></div>
          </div>
          {exportBusy && <p role="status" className="mb-3 text-sm text-gray-600">Preparing export...</p>}
          {exportErrors.length > 0 && <ul role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700" data-testid="list-export-errors">{exportErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
          {paperErrors.length > 0 && exportErrors.length === 0 && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800" data-testid="text-paper-warning">{paperErrors.length} issue{paperErrors.length === 1 ? "" : "s"} must be fixed before export. Choose an export to see them.</p>}
          {regenError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700" data-testid="text-regenerate-error">{regenError}</p>}
          {!pagesRef.current && <p className="mb-3 text-xs text-gray-500">This paper was reopened from history. To regenerate a question, add the source PDF or text above first.</p>}
          <p className="mb-4 text-xs text-gray-500">Edits stay in this page and are not saved automatically. Export to keep them.</p>
          <label className="mb-4 block text-sm font-semibold text-gray-900">Paper title
            <input className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm font-normal focus:border-[#f7433d] focus:outline-none" maxLength={200} value={paper.title} disabled={running} onChange={(e) => setPaper({ ...paper, title: e.target.value })} data-testid="input-paper-title" /></label>
          <div className="space-y-6">
            {paper.settings.sections.map((s) => {
              const qs = paper.questions.map((q, i) => [q, i] as const).filter(([q]) => q.sectionId === s.id);
              return <section key={s.id} aria-label={`${s.kind} section`}>
                <h2 className="mb-2 font-['Poppins'] text-base font-semibold text-gray-900">{s.kind === "mcq" ? "MCQ" : s.kind === "short" ? "Short questions" : board ? "Creative questions" : "Broad questions"} <span className="text-sm font-normal text-gray-500">({s.count} x {s.marksPerQuestion} = {s.count * s.marksPerQuestion} marks)</span></h2>
                <div className="space-y-3">{qs.map(([q, i]) => <ExamQuestionEditor key={q.id} q={q} index={i} marks={marksFor(paper.settings, q)} board={!!board} disabled={running && regenId === null} regenerating={regenId === q.id} onChange={(nq) => updateQ(i, nq)} onRegenerate={() => regenerate(q.id)} />)}</div>
              </section>;
            })}
          </div>
        </div>}
        <EducationHistory kind="exam" revision={String(version)} onOpen={(saved) => { if (saved.exam) {
          if (paper && !window.confirm("Opening a saved paper will replace your current edits. Export them first if you want to keep them. Continue?")) return;
          pagesRef.current = null; setPaper(saved.exam); setSettings(saved.exam.settings); setVersion((v) => v + 1); src.clear(); setError(null); setExportErrors([]); setRegenError(null);
        } }} />
      </>} />
  );
}
export default ExamPaperGeneratorPage;
