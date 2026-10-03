import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import type { EducationQuestion } from "@workspace/api-client-react";
import { effectiveOptions } from "@/lib/education/exportHelpers";

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}]/gu, "").replace(/\s+/g, " ").trim();

function resolveCorrect(q: EducationQuestion): string {
  const opts = effectiveOptions(q);
  const m = /^\(?([A-D])\)?[.)]?$/i.exec(q.correctAnswer.trim());
  if (q.type === "mcq" && m && !opts.some((o) => norm(o) === norm(q.correctAnswer))) return opts[m[1].toUpperCase().charCodeAt(0) - 65] ?? q.correctAnswer;
  return q.correctAnswer;
}
const isChoice = (q: EducationQuestion) => q.type === "mcq" || q.type === "true-false";

interface Answer { given: string; correct: boolean; overridden?: boolean }

export function QuizPlayer({ questions, onComplete }: { questions: EducationQuestion[]; onComplete: () => void }) {
  const [pool, setPool] = useState(questions);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const completedRef = useRef(false);
  const cbRef = useRef(onComplete);
  cbRef.current = onComplete;

  useEffect(() => {
    if (done && !completedRef.current) { completedRef.current = true; cbRef.current(); }
  }, [done]);

  const q = pool[idx];
  const ans = q ? answers[q.id] : undefined;
  const wrong = useMemo(() => questions.filter((x) => answers[x.id] && !answers[x.id].correct), [questions, answers]);
  const score = Object.values(answers).filter((a) => a.correct).length;

  const submit = (given: string) => {
    if (!q || ans) return;
    setAnswers((p) => ({ ...p, [q.id]: { given, correct: norm(given) === norm(resolveCorrect(q)) } }));
  };
  const next = () => { setText(""); if (idx + 1 >= pool.length) setDone(true); else setIdx(idx + 1); };
  const restart = (qs: EducationQuestion[]) => { setPool(qs); setIdx(0); setAnswers({}); setText(""); setDone(false); completedRef.current = false; };

  if (done) {
    const total = pool.length;
    return (
      <div data-testid="panel-quiz-complete">
        <div className="rounded-2xl bg-[#fff1f0] p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#d9322c]">Quiz complete</p>
          <p className="mt-2 font-['Poppins'] text-5xl font-bold text-gray-900" data-testid="text-score">{score}<span className="text-2xl text-gray-500"> / {total}</span></p>
          <p className="mt-1 text-gray-600">{Math.round((score / total) * 100)}% correct</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => restart(questions)} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f7433d] px-5 text-sm font-semibold text-white hover:bg-[#e03832]" data-testid="button-retry-quiz"><RotateCcw className="h-4 w-4" aria-hidden="true" />Retry</button>
            {wrong.length > 0 && pool === questions && <button type="button" onClick={() => restart(wrong)} className="h-10 rounded-full border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 hover:border-[#f7433d]" data-testid="button-retry-wrong">Retry wrong answers only</button>}
          </div>
        </div>
        {wrong.length > 0 && (
          <div className="mt-6">
            <h3 className="font-['Poppins'] text-lg font-semibold text-gray-900">Review wrong answers</h3>
            <ul className="mt-3 space-y-3">
              {wrong.map((w) => (
                <li key={w.id} className="rounded-xl border border-red-100 bg-white p-4">
                  <p className="font-medium text-gray-900">{w.question}</p>
                  <p className="mt-2 text-sm text-red-700">Your answer: {answers[w.id].given || "(blank)"}</p>
                  <p className="text-sm text-green-700">Correct answer: {resolveCorrect(w)}</p>
                  <p className="mt-1 text-sm text-gray-600">{w.explanation}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  if (!q) return <p className="text-gray-600">No questions to take.</p>;
  const opts = effectiveOptions(q);
  const correct = resolveCorrect(q);
  return (
    <div data-testid="panel-quiz-player">
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600"><span aria-live="polite">Question {idx + 1} of {pool.length}</span><span>Score {score}</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={pool.length} aria-valuenow={idx + (ans ? 1 : 0)}><div className="h-full bg-[#f7433d] transition-all" style={{ width: `${((idx + (ans ? 1 : 0)) / pool.length) * 100}%` }} /></div>
      </div>
      <h3 className="font-['Poppins'] text-xl font-semibold text-gray-900" data-testid="text-question">{q.question}</h3>
      {isChoice(q) ? (
        <div className="mt-4 grid gap-2" role="group" aria-label="Answer options">
          {opts.map((o, i) => {
            const picked = ans?.given === o; const isRight = norm(o) === norm(correct);
            const cls = !ans ? "border-gray-200 bg-white hover:border-[#f7433d]" : isRight ? "border-green-500 bg-green-50" : picked ? "border-red-400 bg-red-50" : "border-gray-200 bg-white opacity-70";
            return (
              <button key={i} type="button" disabled={!!ans} onClick={() => submit(o)} data-testid={`button-option-${i}`} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7433d] ${cls}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold">{String.fromCharCode(65 + i)}</span>{o}
              </button>
            );
          })}
        </div>
      ) : (
        <form className="mt-4" onSubmit={(e) => { e.preventDefault(); submit(text); }}>
          <label htmlFor="short-answer" className="sr-only">Your answer</label>
          <input id="short-answer" value={text} onChange={(e) => setText(e.target.value)} disabled={!!ans} placeholder="Type your answer" className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20" data-testid="input-short-answer" />
          {!ans && <button type="submit" disabled={!text.trim()} className="mt-3 h-10 rounded-full bg-[#f7433d] px-5 text-sm font-semibold text-white hover:bg-[#e03832] disabled:opacity-50" data-testid="button-check-answer">Check answer</button>}
          <p className="mt-2 text-xs text-gray-500">Marking note: typed answers are checked by exact match after ignoring case, spacing and punctuation. A right answer in different words may be marked wrong.</p>
        </form>
      )}
      {ans && (
        <div role="status" aria-live="polite" className={`mt-4 rounded-xl p-4 ${ans.correct ? "bg-green-50" : "bg-red-50"}`} data-testid="panel-feedback">
          <p className={`flex items-center gap-2 font-semibold ${ans.correct ? "text-green-700" : "text-red-700"}`}>{ans.correct ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <XCircle className="h-5 w-5" aria-hidden="true" />}{ans.correct ? "Correct" : "Not quite"}</p>
          {!ans.correct && <p className="mt-1 text-sm text-gray-800">Correct answer: <strong>{correct}</strong></p>}
          <p className="mt-1 text-sm text-gray-700">{q.explanation}</p>
          {!ans.correct && !isChoice(q) && !ans.overridden && (
            <button type="button" onClick={() => setAnswers((p) => ({ ...p, [q.id]: { ...p[q.id], correct: true, overridden: true } }))} className="mt-2 text-sm font-semibold text-[#d9322c] underline" data-testid="button-mark-correct">My answer was right, mark correct</button>
          )}
        </div>
      )}
      {ans && <button type="button" onClick={next} className="mt-4 h-10 rounded-full bg-gray-900 px-6 text-sm font-semibold text-white hover:bg-gray-800" data-testid="button-next-question">{idx + 1 >= pool.length ? "Finish" : "Next question"}</button>}
    </div>
  );
}
