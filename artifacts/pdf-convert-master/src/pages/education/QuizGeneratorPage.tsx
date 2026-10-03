import { useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useExtractEducationPdf, useGenerateEducationQuiz } from "@workspace/api-client-react";
import type { EducationQuiz, EducationQuizInput } from "@workspace/api-client-react";
import { EducationToolLayout } from "@/components/education/EducationToolLayout";
import { UploadBox } from "@/components/education/UploadBox";
import { ChipGroup, LANGUAGE_OPTIONS } from "@/components/education/OptionControls";
import { GenerationProgress, type Phase } from "@/components/education/GenerationProgress";
import { QuizWorkspace } from "@/components/education/QuizWorkspace";
import { describeError } from "@/lib/education/errors";
import { useSourceInput } from "@/lib/education/useSource";
import { useTrack } from "@/lib/education/useTrack";

type QType = EducationQuizInput["questionTypes"][number];

export function QuizGeneratorPage(): JSX.Element {
  const src = useSourceInput();
  const track = useTrack("quiz-generator");
  const extract = useExtractEducationPdf();
  const generate = useGenerateEducationQuiz();
  const [types, setTypes] = useState<QType[]>(["mcq", "true-false"]);
  const [count, setCount] = useState<EducationQuizInput["count"]>(10);
  const [difficulty, setDifficulty] = useState<EducationQuizInput["difficulty"]>("mixed");
  const [language, setLanguage] = useState<EducationQuizInput["language"]>("same");
  const [topic, setTopic] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<EducationQuiz | null>(null);
  const busy = useRef(false);

  const running = phase !== "idle";
  const can = src.canSubmit && types.length > 0 && !running;

  const run = async () => {
    if (busy.current || !can) return;
    busy.current = true; setError(null); setWarnings([]);
    try {
      let pages: { pageNumber: number | null; text: string }[];
      if (src.mode === "upload" && src.file) {
        setPhase("reading");
        const ex = await extract.mutateAsync({ data: { file: src.file, pageRange: src.normalized || undefined } });
        track("upload"); setWarnings(ex.warnings);
        pages = ex.pages.filter((p) => p.text.trim());
        if (pages.length === 0) throw new Error("No readable text was found in this PDF or page range.");
      } else pages = [{ pageNumber: null, text: src.text.trim() }];
      setPhase("generating");
      const q = await generate.mutateAsync({ data: { pages, count, questionTypes: types, difficulty, language, topicFocus: topic.trim() || undefined } });
      pages = [];
      track("generate"); setQuiz(q); src.clear(); setTopic("");
    } catch (e) { setError(describeError(e)); }
    finally { setPhase("idle"); busy.current = false; }
  };

  const toggleType = (t: QType) => setTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const options = (
    <div className="space-y-5">
      <ChipGroup multi label="Question types" testId="chip-type" disabled={running} value={types} onChange={toggleType} hint={types.length === 0 ? "Pick at least one type." : undefined}
        options={[{ value: "mcq", label: "Multiple Choice" }, { value: "true-false", label: "True/False" }, { value: "short-answer", label: "Short Answer" }, { value: "fill-blank", label: "Fill in the Blank" }] as const} />
      <div className="grid gap-5 sm:grid-cols-2">
        <ChipGroup label="Number of questions" testId="chip-count" disabled={running} value={count} onChange={setCount} options={([5, 10, 20, 30] as const).map(n => ({ value: n, label: String(n) }))} />
        <ChipGroup label="Difficulty" testId="chip-difficulty" disabled={running} value={difficulty} onChange={setDifficulty} options={[{ value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }, { value: "mixed", label: "Mixed" }] as const} />
      </div>
      <ChipGroup label="Language" testId="chip-language" disabled={running} value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
      <div>
        <label htmlFor="topic" className="mb-1 block text-sm font-semibold text-gray-900">Topic focus <span className="font-normal text-gray-500">(optional)</span></label>
        <input id="topic" value={topic} maxLength={200} disabled={running} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Cell respiration" className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20" data-testid="input-topic" />
      </div>
      <button type="button" onClick={run} disabled={!can} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f7433d] px-8 text-base font-semibold text-white shadow-sm hover:bg-[#e03832] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" data-testid="button-generate-quiz">
        {running ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}{running ? "Generating..." : "Generate Quiz"}
      </button>
      {!src.canSubmit && !running && <p className="text-xs text-gray-500">Add a PDF or paste some text to continue.</p>}
      <GenerationProgress phase={phase} noun="questions" skipReading={src.mode === "paste"} />
      <div aria-live="assertive">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700" data-testid="text-generate-error">{error}</p>}
      </div>
      {warnings.length > 0 && <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800" data-testid="list-warnings">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
    </div>
  );

  return (
    <EducationToolLayout toolId="quiz-generator" seoTitle="PDF to Quiz Generator — Free AI Quiz Maker from PDF | PDF Genius" seoDescription="Turn a lecture PDF or pasted notes into a practice quiz with multiple choice, true/false and short-answer questions. Edit, take and export it. Free."
      upload={<UploadBox src={src} disabled={running} />} options={options}
      result={quiz && <QuizWorkspace quiz={quiz} onChange={setQuiz} onExported={() => track("export")} onCompleted={() => track("quiz_completed")} />} />
  );
}
export default QuizGeneratorPage;
