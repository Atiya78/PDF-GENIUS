import { useState } from "react";
import { Copy, FileText, FileType2, Printer, Eye, EyeOff } from "lucide-react";
import type { EducationQuiz } from "@workspace/api-client-react";
import { copyText, effectiveOptions, formatQuizText, printQuiz, requestExport, slugify } from "@/lib/education/exportHelpers";
import { ExportMenu } from "./ExportMenu";
import { QuizEditor, validateQuestion } from "./QuizEditor";
import { QuizPlayer } from "./QuizPlayer";
import { cn } from "@/lib/utils";

type View = "take" | "all" | "edit";

export function QuizWorkspace({ quiz, onChange, onExported, onCompleted }: { quiz: EducationQuiz; onChange: (q: EducationQuiz) => void; onExported: () => void; onCompleted: () => void }) {
  const [view, setView] = useState<View>("take");
  const [reveal, setReveal] = useState(false);
  const invalid = quiz.questions.filter((q) => validateQuestion(q)).length;
  const reason = quiz.questions.length === 0 ? "There are no questions to export." : invalid ? `Fix ${invalid} question${invalid > 1 ? "s" : ""} in Edit before exporting.` : null;
  const base = slugify(quiz.title);
  const tab = (v: View, label: string) => (
    <button type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} data-testid={`tab-quiz-${v}`} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7433d]", view === v ? "bg-[#f7433d] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}>{label}</button>
  );
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6" data-testid="panel-quiz-result">
      <h2 className="font-['Poppins'] text-2xl font-bold text-gray-900" data-testid="text-quiz-title">{quiz.title}</h2>
      <p className="mt-1 text-sm text-gray-500">{quiz.questions.length} questions. AI can make mistakes, so check answers against your source.</p>
      <div role="tablist" aria-label="Quiz view" className="mt-4 flex flex-wrap gap-2">{tab("take", "Take Quiz")}{tab("all", "View All")}{tab("edit", "Edit")}</div>
      <div className="mt-5">
        {view === "take" && (quiz.questions.length ? <QuizPlayer questions={quiz.questions} onComplete={onCompleted} /> : <p className="text-gray-600">No questions left.</p>)}
        {view === "all" && (
          <div>
            <button type="button" onClick={() => setReveal((r) => !r)} className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold" data-testid="button-toggle-answers">{reveal ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}{reveal ? "Hide answers" : "Show answers"}</button>
            <ol className="space-y-4">
              {quiz.questions.map((q, i) => (
                <li key={q.id} className="rounded-xl border border-gray-100 p-4">
                  <p className="font-medium text-gray-900">{i + 1}. {q.question}</p>
                  {effectiveOptions(q).length > 0 && <ul className="mt-2 space-y-1 text-sm text-gray-700">{effectiveOptions(q).map((o, j) => <li key={j}>{String.fromCharCode(65 + j)}. {o}</li>)}</ul>}
                  {reveal && <p className="mt-2 text-sm text-green-700">Answer: {q.correctAnswer}<span className="block text-gray-600">{q.explanation}</span></p>}
                </li>
              ))}
            </ol>
          </div>
        )}
        {view === "edit" && <QuizEditor quiz={quiz} onChange={onChange} />}
      </div>
      <div className="mt-6 border-t border-gray-100 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Export</h3>
        <ExportMenu disabledReason={reason} onExported={onExported} actions={[
          { id: "questions-pdf", label: "Questions PDF", icon: FileText, run: () => requestExport({ kind: "questions", format: "pdf", quiz }, `${base}-questions.pdf`) },
          { id: "answers-pdf", label: "Answer key PDF", icon: FileText, run: () => requestExport({ kind: "answers", format: "pdf", quiz }, `${base}-answers.pdf`) },
          { id: "docx", label: "DOCX with answer key", icon: FileType2, run: () => requestExport({ kind: "quiz", format: "docx", quiz }, `${base}.docx`) },
          { id: "copy", label: "Copy", icon: Copy, run: () => copyText(formatQuizText(quiz, true)) },
          { id: "print", label: "Print", icon: Printer, run: () => printQuiz(quiz) },
        ]} />
      </div>
    </div>
  );
}
