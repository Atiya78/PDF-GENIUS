import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { EducationExamQuestion, EducationMarkingPoint } from "@workspace/api-client-react";
import { sumMarks } from "@/lib/education/examValidation";

const area = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#f7433d] focus:outline-none disabled:opacity-60";
const small = "rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-60";

function Scheme({ points, onChange, expected, disabled, id }: { points: EducationMarkingPoint[]; onChange: (p: EducationMarkingPoint[]) => void; expected: number; disabled: boolean; id: string }) {
  const sum = sumMarks(points);
  const ok = Math.abs(sum - expected) < 1e-6;
  return <div className="mt-2">
    <p className="text-xs font-semibold text-gray-700">Marking scheme <span className={ok ? "text-green-700" : "text-red-700"}>({sum} of {expected})</span></p>
    <ul className="mt-1 space-y-1.5">{points.map((p, i) => <li key={i} className="flex gap-2">
      <input aria-label={`Marking point ${i + 1}`} className={`${small} min-w-0 flex-1`} value={p.text} disabled={disabled} onChange={(e) => onChange(points.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} data-testid={`input-${id}-point-${i}`} />
      <input aria-label={`Marks for point ${i + 1}`} type="number" min={0.5} step={0.5} className={`${small} w-20`} value={p.marks} disabled={disabled} onChange={(e) => onChange(points.map((x, k) => (k === i ? { ...x, marks: Number(e.target.value) } : x)))} data-testid={`input-${id}-marks-${i}`} />
      <button type="button" aria-label={`Remove marking point ${i + 1}`} disabled={disabled || points.length <= 1} onClick={() => onChange(points.filter((_, k) => k !== i))} className="rounded-lg border p-2 disabled:opacity-40"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
    </li>)}</ul>
    <button type="button" disabled={disabled || points.length >= 20} onClick={() => onChange([...points, { text: "", marks: 1 }])} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#d9322c] disabled:opacity-50" data-testid={`button-add-${id}-point`}><Plus className="h-3.5 w-3.5" aria-hidden="true" />Add point</button>
  </div>;
}

interface Props { q: EducationExamQuestion; index: number; marks: number; board: boolean; disabled: boolean; regenerating: boolean; onChange: (q: EducationExamQuestion) => void; onRegenerate: () => void }

export function ExamQuestionEditor({ q, index, marks, board, disabled, regenerating, onChange, onRegenerate }: Props) {
  const id = `q${index + 1}`;
  const off = disabled || regenerating;
  const set = (patch: Partial<EducationExamQuestion>) => onChange({ ...q, ...patch });
  const creative = q.kind === "broad" && board;
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4" aria-busy={regenerating} data-testid={`card-question-${q.id}`}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Question {index + 1} <span className="font-normal text-gray-500">({marks} {marks === 1 ? "mark" : "marks"}{q.sourcePages.length ? `, p. ${q.sourcePages.join(", ")}` : ""})</span></h3>
        <button type="button" disabled={off} onClick={onRegenerate} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold disabled:opacity-50" data-testid={`button-regenerate-${q.id}`}>
          {regenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}{regenerating ? "Regenerating..." : "Regenerate"}
        </button>
      </header>
      {creative && <label className="mb-3 block text-xs font-semibold text-gray-700">Stimulus (উদ্দীপক)
        <textarea className={`${area} mt-1 font-normal`} rows={3} maxLength={8000} value={q.stimulus} disabled={off} onChange={(e) => set({ stimulus: e.target.value })} data-testid={`input-${id}-stimulus`} /></label>}
      {!creative && <label className="block text-xs font-semibold text-gray-700">Question text
        <textarea className={`${area} mt-1 font-normal`} rows={2} maxLength={5000} value={q.text} disabled={off} onChange={(e) => set({ text: e.target.value })} data-testid={`input-${id}-text`} /></label>}
      {creative && <label className="block text-xs font-semibold text-gray-700">Question heading
        <input className={`${area} mt-1 font-normal`} maxLength={5000} value={q.text} disabled={off} onChange={(e) => set({ text: e.target.value })} data-testid={`input-${id}-text`} /></label>}
      {q.kind === "mcq" && <fieldset className="mt-3"><legend className="text-xs font-semibold text-gray-700">Options (select the correct one)</legend>
        {q.options.map((o, i) => <div key={i} className="mt-1.5 flex items-center gap-2">
          <input type="radio" name={`correct-${q.id}`} aria-label={`Option ${i + 1} is correct`} checked={q.correctOption === i} disabled={off} onChange={() => set({ correctOption: i })} className="accent-[#f7433d]" data-testid={`radio-${id}-correct-${i}`} />
          <input aria-label={`Option ${i + 1}`} className={`${small} min-w-0 flex-1`} maxLength={1000} value={o} disabled={off} onChange={(e) => set({ options: q.options.map((x, k) => (k === i ? e.target.value : x)) })} data-testid={`input-${id}-option-${i}`} />
        </div>)}
      </fieldset>}
      {creative ? <div className="mt-3 space-y-3">{q.parts.map((p, i) => <div key={p.label} className="rounded-lg bg-gray-50 p-3">
        <p className="text-sm font-semibold text-gray-900">{p.label}) <span className="font-normal text-gray-500">{p.marks} {p.marks === 1 ? "mark" : "marks"}</span></p>
        <label className="mt-1 block text-xs font-semibold text-gray-700">Part text
          <textarea className={`${area} mt-1 font-normal`} rows={2} maxLength={2000} value={p.text} disabled={off} onChange={(e) => set({ parts: q.parts.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)) })} data-testid={`input-${id}-part-${i}-text`} /></label>
        <label className="mt-2 block text-xs font-semibold text-gray-700">Answer
          <textarea className={`${area} mt-1 font-normal`} rows={2} maxLength={5000} value={p.answer} disabled={off} onChange={(e) => set({ parts: q.parts.map((x, k) => (k === i ? { ...x, answer: e.target.value } : x)) })} data-testid={`input-${id}-part-${i}-answer`} /></label>
        <Scheme id={`${id}-part-${i}`} points={p.markingScheme} expected={p.marks} disabled={off} onChange={(m) => set({ parts: q.parts.map((x, k) => (k === i ? { ...x, markingScheme: m } : x)) })} />
      </div>)}
        <label className="block text-xs font-semibold text-gray-700">Overall answer note
          <textarea className={`${area} mt-1 font-normal`} rows={2} maxLength={8000} value={q.answer} disabled={off} onChange={(e) => set({ answer: e.target.value })} data-testid={`input-${id}-answer`} /></label>
        <Scheme id={id} points={q.markingScheme} expected={marks} disabled={off} onChange={(m) => set({ markingScheme: m })} />
      </div> : <div className="mt-3">
        <label className="block text-xs font-semibold text-gray-700">Model answer
          <textarea className={`${area} mt-1 font-normal`} rows={3} maxLength={8000} value={q.answer} disabled={off} onChange={(e) => set({ answer: e.target.value })} data-testid={`input-${id}-answer`} /></label>
        <Scheme id={id} points={q.markingScheme} expected={marks} disabled={off} onChange={(m) => set({ markingScheme: m })} />
      </div>}
    </article>
  );
}
