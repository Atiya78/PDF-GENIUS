import { Paragraph, HeadingLevel, TextRun } from "docx";
import { escapeStudyHtml, renderStudyMarkdown, studyInlineRuns, type EducationExportInput } from "@workspace/api-zod";
import { EducationError } from "./config";

export const exportTitle = (input: EducationExportInput) => {
  const value = input.kind === "cards" ? input.deck : input.kind === "chat" ? input.chat : input.kind === "notes" ? input.notes : input.quiz;
  if (!value) throw new EducationError("Study material is missing. Generate or open a result before exporting.");
  return value.title;
};
const source = (pages: number[]) => pages.length ? `Source: ${pages.map(page => `p. ${page}`).join(", ")}` : "Source: pasted text";
export function studyHtml(input: EducationExportInput) {
  if (input.kind === "chat") {
    if (!input.chat) throw new EducationError("Chat data is missing.");
    return `<h1>${escapeStudyHtml(input.chat.title)}</h1>${input.chat.turns.map(turn => `<article>
      <h3>${escapeStudyHtml(turn.question)}</h3>${renderStudyMarkdown(turn.answer)}
      ${turn.citations.map(cite => `<p><strong>p. ${cite.pageNumber}</strong> — ${escapeStudyHtml(cite.quote)}</p>`).join("")}</article>`).join("")}`;
  }
  const notes = input.notes;
  if (!notes) throw new EducationError("Notes data is missing.");
  return `<h1>${escapeStudyHtml(notes.title)}</h1>${notes.sections.map(section =>
    `<section><h2>${escapeStudyHtml(section.heading)}</h2>${renderStudyMarkdown(section.body)}<small>${source(section.sourcePages)}</small></section>`
  ).join("")}<section><h2>${/[\u0980-\u09ff]/.test(notes.title) ? "মূল বিষয়গুলো (Key takeaways)" : "Key takeaways"}</h2>
    <ul>${notes.takeaways.map(point => `<li>${renderStudyMarkdown(point)}</li>`).join("")}</ul></section>`;
}
function paragraphs(body: string): Paragraph[] {
  return body.split("\n").map(line => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line), bullet = /^(\s*)(?:[-*]|\d+\.)\s+(.+)$/.exec(line);
    const content = heading?.[2] ?? bullet?.[2] ?? line;
    return new Paragraph({
      children: studyInlineRuns(content).map(run => new TextRun({ text: run.text, bold: run.bold, italics: run.italics })),
      ...(heading ? { heading: HeadingLevel.HEADING_3 } : {}),
      ...(bullet ? { bullet: { level: Math.min(6, Math.floor(bullet[1]!.length / 2)) } } : {}),
    });
  });
}
export function studyDocx(input: EducationExportInput): Paragraph[] {
  const children = [new Paragraph({ text: exportTitle(input), heading: HeadingLevel.TITLE })];
  if (input.kind === "chat") {
    for (const turn of input.chat!.turns) children.push(new Paragraph({ text: turn.question, heading: HeadingLevel.HEADING_2 }),
      ...paragraphs(turn.answer), ...turn.citations.map(cite => new Paragraph(`p. ${cite.pageNumber}: ${cite.quote}`)));
  } else {
    for (const section of input.notes!.sections) children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2 }),
      ...paragraphs(section.body), new Paragraph(source(section.sourcePages)));
    children.push(new Paragraph({ text: /[\u0980-\u09ff]/.test(input.notes!.title) ? "মূল বিষয়গুলো (Key takeaways)" : "Key takeaways", heading: HeadingLevel.HEADING_1 }),
      ...input.notes!.takeaways.flatMap(point => paragraphs(`- ${point}`)));
  }
  return children;
}
export function studyText(input: EducationExportInput) {
  const title = exportTitle(input);
  if (input.kind === "chat") return `# ${title}\n\n${input.chat!.turns.map(turn =>
    `## ${turn.question}\n\n${turn.answer}\n\n${turn.citations.map(cite => `> p. ${cite.pageNumber}: ${cite.quote}`).join("\n")}`).join("\n\n")}`;
  return `# ${title}\n\n${input.notes!.sections.map(section =>
    `## ${section.heading}\n\n${section.body}\n\n${source(section.sourcePages)}`).join("\n\n")}\n\n## Key takeaways\n\n${input.notes!.takeaways.map(point => `- ${point}`).join("\n")}\n`;
}
