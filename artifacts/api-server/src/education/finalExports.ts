import { Paragraph, HeadingLevel, TextRun, PageBreak } from "docx";
import { escapeStudyHtml, renderStudyMarkdown, type EducationExportInput } from "@workspace/api-zod";
import { validateExamPaper } from "./exams";
import { EducationError } from "./config";

const labels = { mcq: "Multiple choice", short: "Short questions", broad: "Broad / Creative questions" };
export function finalTitle(input: EducationExportInput) {
  const value = input.kind === "translation" ? input.translation : input.exam;
  if (!value) throw new EducationError("Generate or open the study result before exporting.");
  return value.title;
}
export function finalHtml(input: EducationExportInput) {
  if (input.kind === "translation") {
    if (!input.translation) throw new EducationError("Translated pages are missing.");
    return input.translation.pages.map(page => `<section class="translation-page"><small>Source page ${page.pageNumber}</small>
      <div class="translated-text">${escapeStudyHtml(page.text)}</div></section>`).join("");
  }
  const paper = validateExamPaper(input.exam), key = input.kind === "exam-key";
  const settings = paper.settings;
  const header = `<header class="exam-header"><h1>${escapeStudyHtml(settings.institution)}</h1><h2>${escapeStudyHtml(settings.examName)}</h2>
    <p>${escapeStudyHtml(settings.subject)} · Class: ${escapeStudyHtml(settings.className)}</p>
    <p class="exam-meta"><span>Time: ${escapeStudyHtml(settings.time)}</span><span>Total marks: ${settings.totalMarks}</span></p>
    ${key ? "<h2>Answer key / Marking scheme</h2>" : ""}</header>`;
  let index = 0;
  return header + settings.sections.map(section => `<section><h2>${labels[section.kind]} — ${section.count} × ${section.marksPerQuestion} = ${section.count * section.marksPerQuestion}</h2>
    ${paper.questions.filter(q => q.sectionId === section.id).map(q => `<article class="exam-question">
      <h3>${++index}. ${escapeStudyHtml(q.text)} <small>[${section.marksPerQuestion}]</small></h3>
      ${q.stimulus ? `<div class="stimulus">${renderStudyMarkdown(q.stimulus)}</div>` : ""}
      ${q.options.length ? `<ol type="A">${q.options.map(option => `<li>${escapeStudyHtml(option)}</li>`).join("")}</ol>` : ""}
      ${q.parts.map(part => `<p><strong>${part.label}.</strong> ${escapeStudyHtml(part.text)} <small>[${part.marks}]</small></p>
        ${key ? `${renderStudyMarkdown(part.answer)}<ul>${part.markingScheme.map(point => `<li>${escapeStudyHtml(point.text)} — ${point.marks}</li>`).join("")}</ul>` : ""}`).join("")}
      ${key && !q.parts.length ? `${renderStudyMarkdown(q.answer)}<ul>${q.markingScheme.map(point => `<li>${escapeStudyHtml(point.text)} — ${point.marks}</li>`).join("")}</ul>` : ""}
      ${key && q.sourcePages.length ? `<small>Source: ${q.sourcePages.map(page => `p. ${page}`).join(", ")}</small>` : ""}
    </article>`).join("")}</section>`).join("");
}
export function finalDocx(input: EducationExportInput): Paragraph[] {
  if (input.kind === "translation") {
    if (!input.translation) throw new EducationError("Translated pages are missing.");
    return input.translation.pages.flatMap((page, index) => [
      ...(index ? [new Paragraph({ children: [new PageBreak()] })] : []),
      new Paragraph({ text: `Source page ${page.pageNumber}`, heading: HeadingLevel.HEADING_3 }),
      ...page.text.split("\n").map(text => new Paragraph({ text })),
    ]);
  }
  const paper = validateExamPaper(input.exam), s = paper.settings, key = input.kind === "exam-key";
  const result = [new Paragraph({ text: s.institution, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: s.examName, heading: HeadingLevel.HEADING_1 }),
    new Paragraph(`${s.subject} | Class: ${s.className} | Time: ${s.time} | Marks: ${s.totalMarks}`)];
  if (key) result.push(new Paragraph({ text: "Answer key / Marking scheme", heading: HeadingLevel.HEADING_1 }));
  let index = 0;
  for (const section of s.sections) {
    result.push(new Paragraph({ text: `${labels[section.kind]}: ${section.count} × ${section.marksPerQuestion} = ${section.count * section.marksPerQuestion}`, heading: HeadingLevel.HEADING_2 }));
    for (const q of paper.questions.filter(q => q.sectionId === section.id)) {
      result.push(new Paragraph({ children: [new TextRun({ text: `${++index}. ${q.text} [${section.marksPerQuestion}]`, bold: true })], keepNext: true }));
      if (q.stimulus) result.push(...q.stimulus.split("\n").map(text => new Paragraph(text)));
      q.options.forEach((option, n) => result.push(new Paragraph(`${String.fromCharCode(65 + n)}. ${option}`)));
      q.parts.forEach(part => {
        result.push(new Paragraph(`${part.label}. ${part.text} [${part.marks}]`));
        if (key) result.push(new Paragraph(part.answer), ...part.markingScheme.map(point => new Paragraph(`${point.text} — ${point.marks}`)));
      });
      if (key && !q.parts.length) result.push(new Paragraph(q.answer), ...q.markingScheme.map(point => new Paragraph(`${point.text} — ${point.marks}`)));
      if (key && q.sourcePages.length) result.push(new Paragraph(`Source: ${q.sourcePages.map(page => `p. ${page}`).join(", ")}`));
    }
  }
  return result;
}
