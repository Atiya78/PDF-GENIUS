import type { EducationExamPaper, EducationExamQuestion, EducationExamSection, EducationExamSettings, EducationMarkingPoint } from "@workspace/api-client-react";

export const BOARD_PART_MARKS = [1, 2, 3, 4] as const;
export const BOARD_LABELS = ["ক", "খ", "গ", "ঘ"] as const;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
export const sumMarks = (pts: EducationMarkingPoint[]) => pts.reduce((a, p) => a + (Number(p.marks) || 0), 0);
export const sectionTotal = (s: EducationExamSection) => s.count * s.marksPerQuestion;
export const marksFor = (settings: EducationExamSettings, q: EducationExamQuestion) => settings.sections.find((s) => s.id === q.sectionId)?.marksPerQuestion ?? 0;

export function validateSettings(s: EducationExamSettings): string[] {
  const e: string[] = [];
  for (const [k, v] of [["Institution", s.institution], ["Exam name", s.examName], ["Subject", s.subject], ["Class", s.className], ["Time", s.time]] as const) if (!v.trim()) e.push(`${k} is required.`);
  if (!Number.isInteger(s.totalMarks) || s.totalMarks < 1 || s.totalMarks > 1000) e.push("Total marks must be a whole number from 1 to 1000.");
  if (s.sections.length === 0) e.push("Turn on at least one section.");
  for (const sec of s.sections) {
    if (!Number.isInteger(sec.count) || sec.count < 1 || sec.count > 30) e.push(`${sec.kind} section: question count must be 1 to 30.`);
    if (!Number.isInteger(sec.marksPerQuestion) || sec.marksPerQuestion < 1 || sec.marksPerQuestion > 100) e.push(`${sec.kind} section: marks per question must be 1 to 100.`);
    if (s.format === "bangladesh-board" && sec.kind === "broad" && sec.marksPerQuestion !== 10) e.push("Board style creative questions are worth 10 marks each (1 + 2 + 3 + 4).");
  }
  const sum = s.sections.reduce((a, x) => a + sectionTotal(x), 0);
  if (sum !== s.totalMarks) e.push(`Section marks add up to ${sum}, but total marks is ${s.totalMarks}.`);
  return e;
}

function checkScheme(label: string, pts: EducationMarkingPoint[], expected: number, e: string[]) {
  if (pts.length === 0) { e.push(`${label}: add at least one marking point.`); return; }
  if (pts.some((p) => !p.text.trim())) e.push(`${label}: a marking point is empty.`);
  if (pts.some((p) => !(p.marks >= 0.5))) e.push(`${label}: each marking point needs at least 0.5 marks.`);
  if (!near(sumMarks(pts), expected)) e.push(`${label}: marking points add up to ${sumMarks(pts)}, expected ${expected}.`);
}

export function validatePaper(paper: EducationExamPaper): string[] {
  const e: string[] = [];
  const st = paper.settings;
  e.push(...validateSettings(st));
  if (!paper.title.trim()) e.push("The paper needs a title.");
  let total = 0;
  paper.questions.forEach((q, i) => {
    const n = `Question ${i + 1}`;
    const marks = marksFor(st, q);
    if (!marks) { e.push(`${n}: its section is missing from the settings.`); return; }
    total += marks;
    if (!q.text.trim()) e.push(`${n}: question text is empty.`);
    if (!q.answer.trim()) e.push(`${n}: answer is empty.`);
    if (q.kind === "mcq") {
      if (q.options.length !== 4 || q.options.some((o) => !o.trim())) e.push(`${n}: provide exactly four non-empty options.`);
      if (q.correctOption === null || q.correctOption < 0 || q.correctOption > 3) e.push(`${n}: choose the correct option.`);
      if (new Set(q.options.map((o) => o.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim())).size !== 4) e.push(`${n}: all four options must be distinct.`);
      if (q.correctOption !== null && q.answer.trim() !== q.options[q.correctOption]?.trim()) e.push(`${n}: the answer must match the selected correct option.`);
      checkScheme(n, q.markingScheme, marks, e);
    } else if (q.kind === "broad" && st.format === "bangladesh-board") {
      if (!q.stimulus.trim()) e.push(`${n}: the stimulus (উদ্দীপক) is empty.`);
      if (marks !== 10) e.push(`${n}: board creative questions must be worth 10 marks.`);
      if (q.parts.length !== 4 || q.parts.some((p, k) => p.label !== BOARD_LABELS[k] || p.marks !== BOARD_PART_MARKS[k])) e.push(`${n}: needs parts ক, খ, গ, ঘ worth 1, 2, 3 and 4 marks.`);
      q.parts.forEach((p) => {
        if (!p.text.trim()) e.push(`${n} (${p.label}): part text is empty.`);
        if (!p.answer.trim()) e.push(`${n} (${p.label}): part answer is empty.`);
        checkScheme(`${n} (${p.label})`, p.markingScheme, p.marks, e);
      });
      checkScheme(n, q.markingScheme, marks, e);
    } else checkScheme(n, q.markingScheme, marks, e);
  });
  if (total !== st.totalMarks) e.push(`Question marks add up to ${total}, but total marks is ${st.totalMarks}.`);
  st.sections.forEach((s) => { const c = paper.questions.filter((q) => q.sectionId === s.id).length; if (c !== s.count) e.push(`Section ${s.kind}: expected ${s.count} questions, found ${c}.`); });
  return e;
}
