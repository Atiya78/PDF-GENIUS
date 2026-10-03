import { Trash2 } from "lucide-react";
import type { EducationQuestion, EducationQuiz } from "@workspace/api-client-react";

export function validateQuestion(q: EducationQuestion): string | null {
  if (!q.question.trim()) return "Question text is empty.";
  if (!q.correctAnswer.trim()) return "Choose or type a correct answer.";
  if (!q.explanation.trim()) return "Add a short explanation.";
  if (q.type === "mcq") {
    if (q.options.length < 2 || q.options.some((o) => !o.trim())) return "Every option needs text.";
    if (!q.options.includes(q.correctAnswer)) return "The correct answer must be one of the options.";
  }
  if (q.type === "true-false" && (q.options.length !== 2 || !q.options.includes(q.correctAnswer))) return "Correct answer must be one of the two true/false options.";
  return null;
}

const field = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20";

export function QuizEditor({ quiz, onChange }: { quiz: EducationQuiz; onChange: (q: EducationQuiz) => void }) {
  const update = (i: number, patch: Partial<EducationQuestion>) => onChange({ ...quiz, questions: quiz.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const setType = (i: number, type: EducationQuestion["type"]) => {
    const q = quiz.questions[i];
    if (type === "mcq") { const o = q.options.length >= 2 && q.type === "mcq" ? q.options : [...q.options, "", "", "", ""].slice(0, 4); update(i, { type, options: o, correctAnswer: o.includes(q.correctAnswer) ? q.correctAnswer : "" }); }
    else if (type === "true-false") { const o = q.options.length === 2 ? q.options : ["True", "False"]; update(i, { type, options: o, correctAnswer: o.includes(q.correctAnswer) ? q.correctAnswer : o[0] }); }
    else update(i, { type, options: [], correctAnswer: q.type === "mcq" || q.type === "true-false" ? "" : q.correctAnswer });
  };
  if (quiz.questions.length === 0) return <p className="rounded-xl bg-gray-50 p-6 text-center text-gray-600" data-testid="text-no-questions">All questions deleted. Generate a new quiz to continue.</p>;
  return (
    <ul className="space-y-4">
      {quiz.questions.map((q, i) => {
        const err = validateQuestion(q);
        return (
          <li key={q.id} className="rounded-xl border border-gray-200 bg-white p-4" data-testid={`editor-question-${i}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900">Question {i + 1}</span>
              <button type="button" onClick={() => onChange({ ...quiz, questions: quiz.questions.filter((_, j) => j !== i) })} aria-label={`Delete question ${i + 1}`} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" data-testid={`button-delete-question-${i}`}><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3">
              <label className="text-xs font-semibold text-gray-600">Type
                <select value={q.type} onChange={(e) => setType(i, e.target.value as EducationQuestion["type"])} className={`${field} mt-1`} data-testid={`select-type-${i}`}>
                  <option value="mcq">Multiple choice</option><option value="true-false">True / False</option><option value="short-answer">Short answer</option><option value="fill-blank">Fill in the blank</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-600">Question
                <textarea value={q.question} maxLength={3000} rows={2} onChange={(e) => update(i, { question: e.target.value })} className={`${field} mt-1`} data-testid={`input-question-${i}`} />
              </label>
              {q.type === "mcq" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, k) => (
                    <label key={k} className="text-xs font-semibold text-gray-600">Option {String.fromCharCode(65 + k)}
                      <input value={o} maxLength={600} onChange={(e) => update(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)), correctAnswer: q.correctAnswer === o ? e.target.value : q.correctAnswer })} className={`${field} mt-1`} />
                    </label>
                  ))}
                </div>
              )}
              <label className="text-xs font-semibold text-gray-600">Correct answer
                {q.type === "mcq" || q.type === "true-false" ? (
                  <select value={q.correctAnswer} onChange={(e) => update(i, { correctAnswer: e.target.value })} className={`${field} mt-1`} data-testid={`select-correct-${i}`}>
                    <option value="" disabled>Select...</option>
                    {q.options.filter((o) => o).map((o, k) => <option key={k} value={o}>{o}</option>)}
                  </select>
                ) : <input value={q.correctAnswer} maxLength={3000} onChange={(e) => update(i, { correctAnswer: e.target.value })} className={`${field} mt-1`} data-testid={`input-correct-${i}`} />}
              </label>
              <label className="text-xs font-semibold text-gray-600">Explanation
                <textarea value={q.explanation} maxLength={3000} rows={2} onChange={(e) => update(i, { explanation: e.target.value })} className={`${field} mt-1`} data-testid={`input-explanation-${i}`} />
              </label>
            </div>
            {err && <p role="alert" className="mt-2 text-sm text-red-600">{err}</p>}
          </li>
        );
      })}
    </ul>
  );
}
