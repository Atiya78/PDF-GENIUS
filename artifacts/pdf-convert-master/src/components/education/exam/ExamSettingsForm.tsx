import type { ChangeEvent } from "react";
import type { EducationExamSection, EducationExamSectionKind, EducationExamSettings } from "@workspace/api-client-react";
import { ChipGroup } from "@/components/education/OptionControls";
import { sectionTotal } from "@/lib/education/examValidation";

const KINDS: { kind: EducationExamSectionKind; label: string }[] = [
  { kind: "mcq", label: "MCQ" }, { kind: "short", label: "Short questions" }, { kind: "broad", label: "Creative / broad questions" },
];
const field = "h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-[#f7433d] focus:outline-none disabled:opacity-60";

export function defaultSettings(): EducationExamSettings {
  return { institution: "", examName: "", subject: "", className: "", totalMarks: 50, time: "2 hours", format: "standard", language: "same",
    sections: [{ id: "mcq", kind: "mcq", count: 10, marksPerQuestion: 1 }, { id: "short", kind: "short", count: 5, marksPerQuestion: 4 }, { id: "broad", kind: "broad", count: 2, marksPerQuestion: 10 }] };
}

function Text({ label, value, onChange, disabled, id, max }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean; id: string; max: number }) {
  return <label className="block text-sm font-semibold text-gray-900">{label}
    <input className={`${field} mt-1 font-normal`} value={value} maxLength={max} disabled={disabled} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} data-testid={`input-exam-${id}`} /></label>;
}
function Num({ label, value, onChange, disabled, id, readOnly }: { label: string; value: number; onChange: (v: number) => void; disabled: boolean; id: string; readOnly?: boolean }) {
  return <label className="block text-xs font-semibold text-gray-700">{label}
    <input type="number" min={1} step={1} className={`${field} mt-1 font-normal`} value={value || ""} disabled={disabled} readOnly={readOnly} onChange={(e) => onChange(Number(e.target.value))} data-testid={`input-exam-${id}`} /></label>;
}

export function ExamSettingsForm({ settings, onChange, disabled, errors }: { settings: EducationExamSettings; onChange: (s: EducationExamSettings) => void; disabled: boolean; errors: string[] }) {
  const set = (patch: Partial<EducationExamSettings>) => onChange({ ...settings, ...patch });
  const board = settings.format === "bangladesh-board";
  const patchSection = (kind: EducationExamSectionKind, patch: Partial<EducationExamSection>) => set({ sections: settings.sections.map((s) => (s.kind === kind ? { ...s, ...patch } : s)) });
  const toggle = (kind: EducationExamSectionKind) => {
    const has = settings.sections.some((s) => s.kind === kind);
    const next = has ? settings.sections.filter((s) => s.kind !== kind) : [...settings.sections, { id: kind, kind, count: 5, marksPerQuestion: board && kind === "broad" ? 10 : 1 }];
    set({ sections: KINDS.map((k) => next.find((s) => s.kind === k.kind)).filter((s): s is EducationExamSection => !!s) });
  };
  const setFormat = (format: EducationExamSettings["format"]) => set({ format, sections: format === "bangladesh-board" ? settings.sections.map((s) => (s.kind === "broad" ? { ...s, marksPerQuestion: 10 } : s)) : settings.sections });
  const sum = settings.sections.reduce((a, s) => a + sectionTotal(s), 0);
  const ok = sum === settings.totalMarks;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Text id="institution" label="Institution name" max={150} value={settings.institution} disabled={disabled} onChange={(v) => set({ institution: v })} />
        <Text id="exam-name" label="Exam name" max={150} value={settings.examName} disabled={disabled} onChange={(v) => set({ examName: v })} />
        <Text id="subject" label="Subject" max={150} value={settings.subject} disabled={disabled} onChange={(v) => set({ subject: v })} />
        <Text id="class" label="Class" max={100} value={settings.className} disabled={disabled} onChange={(v) => set({ className: v })} />
        <Text id="time" label="Time" max={100} value={settings.time} disabled={disabled} onChange={(v) => set({ time: v })} />
        <Num id="total-marks" label="Total marks" value={settings.totalMarks} disabled={disabled} onChange={(v) => set({ totalMarks: v })} />
      </div>
      <ChipGroup label="Format" testId="chip-exam-format" disabled={disabled} value={settings.format} onChange={setFormat}
        options={[{ value: "standard", label: "Standard" }, { value: "bangladesh-board", label: "Bangladesh board style" }] as const}
        hint={board ? "Creative questions use a stimulus and parts ক, খ, গ, ঘ worth 1, 2, 3 and 4 marks (10 per question)." : undefined} />
      <ChipGroup label="Language" testId="chip-exam-language" disabled={disabled} value={settings.language} onChange={(v) => set({ language: v })}
        options={[{ value: "english", label: "English" }, { value: "bangla", label: "Bangla" }, { value: "same", label: "Same as source" }] as const} />
      <fieldset disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold text-gray-900">Sections</legend>
        <div className="space-y-3">
          {KINDS.map((k) => {
            const s = settings.sections.find((x) => x.kind === k.kind);
            return <div key={k.kind} className="rounded-xl border border-gray-200 p-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900"><input type="checkbox" className="h-4 w-4 accent-[#f7433d]" checked={!!s} onChange={() => toggle(k.kind)} data-testid={`toggle-section-${k.kind}`} />{k.label}</label>
              {s && <div className="mt-3 grid grid-cols-3 items-end gap-3">
                <Num id={`${k.kind}-count`} label="Questions (1-30)" value={s.count} disabled={disabled} onChange={(v) => patchSection(k.kind, { count: v })} />
                <Num id={`${k.kind}-marks`} label="Marks each" value={s.marksPerQuestion} disabled={disabled} readOnly={board && k.kind === "broad"} onChange={(v) => patchSection(k.kind, { marksPerQuestion: v })} />
                <p className="pb-2 text-sm text-gray-700" data-testid={`text-section-total-${k.kind}`}>= {sectionTotal(s)} marks</p>
              </div>}
            </div>;
          })}
        </div>
        <p role="status" className={`mt-3 text-sm font-semibold ${ok ? "text-green-700" : "text-red-700"}`} data-testid="text-marks-balance">Sections add up to {sum} of {settings.totalMarks} marks{ok ? "" : ` (${sum > settings.totalMarks ? "over" : "short"} by ${Math.abs(sum - settings.totalMarks)})`}</p>
      </fieldset>
      {errors.length > 0 && <ul className="rounded-lg bg-red-50 p-3 text-sm text-red-700" data-testid="list-exam-errors">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
    </div>
  );
}
