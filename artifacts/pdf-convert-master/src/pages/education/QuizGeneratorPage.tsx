import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useExtractEducationPdf, generateEducationQuiz } from "@workspace/api-client-react";
import type { EducationQuiz, EducationQuizInput } from "@workspace/api-client-react";
import { EducationToolLayout } from "@/components/education/EducationToolLayout";
import { UploadBox } from "@/components/education/UploadBox";
import { ChipGroup, CountInput, LANGUAGE_OPTIONS } from "@/components/education/OptionControls";
import { GenerationProgress, type Phase } from "@/components/education/GenerationProgress";
import { QuizWorkspace } from "@/components/education/QuizWorkspace";
import { describeError } from "@/lib/education/errors";
import { useSourceInput } from "@/lib/education/useSource";
import { useTrack } from "@/lib/education/useTrack";
import { GenerationError } from "@/components/education/GenerationError";
import { EducationHistory } from "@/components/education/EducationHistory";
import { educationHeaders, requestIdentity } from "@/lib/education/requests";
import { useAuth } from "@/contexts/AuthContext";
import { CAP_MESSAGE, QUIZ_MAX_QUESTIONS, QUIZ_REGEN_CREDITS, countRangePages, includedStatus, quizCredits, useEducationAccount, useEducationConfig } from "@/lib/education/billing";

type QType = EducationQuizInput["questionTypes"][number];

export function QuizGeneratorPage(): JSX.Element {
  const src = useSourceInput();
  const track = useTrack("quiz-generator");
  const extract = useExtractEducationPdf();
  const { user, token, isAuthenticated, refreshUser } = useAuth();
  const { account, refresh: refreshAccount } = useEducationAccount(isAuthenticated ? token : null);
  const config = useEducationConfig();
  const tier = account?.tier ?? "none";
  const maxCount = QUIZ_MAX_QUESTIONS[tier];
  // Original source + options of the last generated quiz, kept in memory only (never persisted).
  const sourceRef = useRef<{ pages: { pageNumber: number | null; text: string }[]; input: Omit<EducationQuizInput, "pages" | "requestId"> } | null>(null);
  const regenId = useRef<string | null>(null);
  const [hasSource, setHasSource] = useState(false);
  const owner = user?.id ?? "guest";
  const previousOwner = useRef(owner);
  const request = useRef<{ signature: string; id: string } | null>(null);
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
  useEffect(() => {
    if (previousOwner.current !== owner) {
      previousOwner.current = owner; setQuiz(null); setError(null); setWarnings([]); src.clear(); request.current = null;
      sourceRef.current = null; regenId.current = null; setHasSource(false);
    }
  }, [owner, src.clear]);
  useEffect(() => () => { sourceRef.current = null; regenId.current = null; }, []);
  useEffect(() => { if (count > maxCount) setCount(maxCount); }, [count, maxCount]);

  const running = phase !== "idle";
  const quizInc = includedStatus(account, config, "quiz");
  const quizCapped = quizInc.capped;
  const can = src.canSubmit && types.length > 0 && Number.isInteger(count) && count >= 5 && count <= maxCount && !running && !quizCapped;

  const run = async () => {
    if (busy.current || !can) return;
    busy.current = true; setError(null); setWarnings([]);
    const caller = educationHeaders().Authorization;
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
      const opts = { count, questionTypes: types, difficulty, language, topicFocus: topic.trim() || undefined };
      const input = { pages, ...opts };
      const q = await generateEducationQuiz({ ...input, requestId: requestIdentity(request, input) }, { headers: educationHeaders() });
      if (educationHeaders().Authorization !== caller) return;
      request.current = null;
      sourceRef.current = { pages, input: opts }; regenId.current = null; setHasSource(true);
      pages = [];
      void refreshAccount();
      track("generate"); setQuiz(q); src.clear(); setTopic("");
      void refreshUser();
    } catch (e) { setError(describeError(e)); }
    finally { setPhase("idle"); busy.current = false; }
  };

  const regenerate = async () => {
    const source = sourceRef.current;
    if (busy.current || !source || running || quizCapped) return;
    const note = quizInc.included ? `This uses 1 of your ${quizInc.left} remaining included quizzes today.` : `This costs ${QUIZ_REGEN_CREDITS} Education credits, charged only if it succeeds.`;
    if (!window.confirm(`Regenerate the whole quiz from the same source and options? Your edits are replaced. ${note}`)) return;
    busy.current = true; setError(null); setPhase("generating");
    const caller = educationHeaders().Authorization;
    // Fresh request id per regenerate; kept across retries after a network failure.
    if (!regenId.current) regenId.current = crypto.randomUUID();
    try {
      const q = await generateEducationQuiz({ pages: source.pages, ...source.input, requestId: regenId.current }, { headers: educationHeaders() });
      if (educationHeaders().Authorization !== caller) return;
      regenId.current = null; setQuiz(q); track("generate");
      void refreshUser(); void refreshAccount();
    } catch (e) { setError(describeError(e)); }
    finally { setPhase("idle"); busy.current = false; }
  };

  const knownPages = src.mode === "paste" ? (src.text.trim() ? 1 : null) : countRangePages(src.normalized);
  const costLine = !isAuthenticated
    ? "Sign in to use Education credits. Without a plan, quizzes are limited to 20 questions and 50 pages."
    : quizCapped
      ? CAP_MESSAGE("quiz")
      : quizInc.included
      ? `Included in your plan: ${quizInc.left} quizzes left today (resets at midnight UTC). No credits are used.`
      : knownPages !== null
        ? `Estimated cost: ${quizCredits(count, knownPages)} Education credits (${count} questions, ${knownPages} page${knownPages === 1 ? "" : "s"}). Charged only on success.`
        : `Estimated cost: ${quizCredits(count, 20)} credits for up to 20 pages, plus 1 per 20 pages above 20. Set a page range for an exact figure.`;

  const toggleType = (t: QType) => setTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const options = (
    <div className="space-y-5">
      <ChipGroup multi label="Question types" testId="chip-type" disabled={running} value={types} onChange={toggleType} hint={types.length === 0 ? "Pick at least one type." : undefined}
        options={[{ value: "mcq", label: "Multiple Choice" }, { value: "true-false", label: "True/False" }, { value: "short-answer", label: "Short Answer" }, { value: "fill-blank", label: "Fill in the Blank" }] as const} />
      <div className="grid gap-5 sm:grid-cols-2">
        <CountInput label="Number of questions" min={5} max={maxCount} disabled={running} value={count} onChange={setCount} />
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
      <p className="text-xs text-gray-600" data-testid="text-quiz-cost">{costLine}{account ? ` Balance: ${account.balance.toLocaleString()} credits.` : ""} <Link href="/education/pricing" className="font-semibold text-[#d9322c] underline">Pricing</Link></p>
      {!src.canSubmit && !running && <p className="text-xs text-gray-500">Add a PDF or paste some text to continue.</p>}
      <GenerationProgress phase={phase} noun="questions" skipReading={src.mode === "paste"} />
      <div aria-live="assertive">
        <GenerationError error={error} retry={run} disabled={!can} />
      </div>
      {warnings.length > 0 && <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800" data-testid="list-warnings">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
    </div>
  );

  return (
    <>
    <EducationToolLayout toolId="quiz-generator" seoTitle="PDF to Quiz Generator — Free AI Quiz Maker from PDF | PDF Genius" seoDescription="Turn a lecture PDF or pasted notes into a practice quiz with multiple choice, true/false and short-answer questions. Edit, take and export it. Free."
      upload={<UploadBox src={src} disabled={running} />} options={options}
      result={<>
        {quiz && <><button type="button" disabled={running} onClick={() => { setQuiz(null); src.clear(); setError(null); setWarnings([]); request.current = null; sourceRef.current = null; regenId.current = null; setHasSource(false); }} className="mb-3 mr-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold">Start over</button>
          {hasSource && <button type="button" disabled={running || quizCapped} onClick={regenerate} className="mb-3 inline-flex items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50" data-testid="button-regenerate-quiz"><RefreshCw className="h-4 w-4" aria-hidden="true" />Regenerate quiz</button>}
          <QuizWorkspace key={quiz.questions[0]?.id} quiz={quiz} onChange={setQuiz} onExported={() => track("export")} onCompleted={() => track("quiz_completed")} /></>}
        <EducationHistory kind="quiz" revision={quiz?.questions[0]?.id} onOpen={saved => { if (saved.quiz) { sourceRef.current = null; regenId.current = null; setHasSource(false); setQuiz(saved.quiz); src.clear(); setError(null); } }} />
      </>} />
    </>
  );
}
export default QuizGeneratorPage;
