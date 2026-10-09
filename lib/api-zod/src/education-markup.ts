/** Deliberately limited Markdown. Raw HTML, images and links are never executed. */
export const escapeStudyHtml = (text: string) => text.replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!));

export function studyInlineRuns(text: string): { text: string; bold?: boolean; italics?: boolean; code?: boolean }[] {
  // Unformatted equations must retain multiplication/exponent operators.
  if (/[=≈≠]/.test(text) && !text.includes("`")) return [{ text }];
  const runs: ReturnType<typeof studyInlineRuns> = [];
  const pattern = /(\*\*([^*\n]+)\*\*|`([^`\n]+)`|\*([^*\n]+)\*)/g;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > offset) runs.push({ text: text.slice(offset, match.index) });
    runs.push(match[2] ? { text: match[2], bold: true } : match[3] ? { text: match[3], code: true } : { text: match[4]!, italics: true });
    offset = match.index! + match[0].length;
  }
  if (offset < text.length) runs.push({ text: text.slice(offset) });
  return runs;
}

export function renderStudyMarkdown(text: string): string {
  const inline = (value: string) => studyInlineRuns(value).map(run => {
    const safe = escapeStudyHtml(run.text);
    return run.bold ? `<strong>${safe}</strong>` : run.italics ? `<em>${safe}</em>` : run.code ? `<code>${safe}</code>` : safe;
  }).join("");
  return text.split("\n").map(line => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) return `<h${heading[1]!.length + 1}>${inline(heading[2]!)}</h${heading[1]!.length + 1}>`;
    const list = /^(\s*)(?:[-*]|\d+\.)\s+(.+)$/.exec(line);
    if (list) return `<ul style="margin-left:${Math.min(6, Math.floor(list[1]!.length / 2)) * 12}px"><li>${inline(list[2]!)}</li></ul>`;
    return line.trim() ? `<p>${inline(line)}</p>` : "<p><br></p>";
  }).join("");
}
