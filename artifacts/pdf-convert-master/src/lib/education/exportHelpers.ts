import type { EducationCard, EducationDeck, EducationExportInput, EducationQuestion, EducationQuiz } from "@workspace/api-client-react";
import { downloadBlob } from "@/lib/download";

export async function requestExport(input: EducationExportInput, filename: string): Promise<void> {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const res = await fetch(`${base}/api/education/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let msg = "";
    try { msg = (await res.json())?.error ?? ""; } catch { /* non-JSON error body */ }
    throw new Error(msg || `Export failed (${res.status}). Please try again.`);
  }
  await downloadBlob(await res.blob(), filename);
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "study";

export const effectiveOptions = (q: EducationQuestion): string[] =>
  q.type === "true-false" && q.options.length === 0 ? ["True", "False"] : q.options;

export function formatQuizText(quiz: EducationQuiz, withAnswers: boolean): string {
  const lines: string[] = [quiz.title, ""];
  quiz.questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.question}`);
    effectiveOptions(q).forEach((o, j) => lines.push(`   ${String.fromCharCode(65 + j)}. ${o}`));
    if (withAnswers) { lines.push(`   Answer: ${q.correctAnswer}`); lines.push(`   Why: ${q.explanation}`); }
    lines.push("");
  });
  return lines.join("\n");
}

export const formatDeckText = (deck: EducationDeck) =>
  [deck.title, "", ...deck.cards.map((c, i) => `${i + 1}. ${c.front}\n   ${c.back}`)].join("\n");

const neutralize = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);
const csvField = (s: string) => `"${neutralize(s).replace(/"/g, '""')}"`;

export function cardsToCsv(cards: EducationCard[]): string {
  const rows = ["Front,Back,Source page", ...cards.map((c) => [csvField(c.front), csvField(c.back), csvField(c.sourcePage ? String(c.sourcePage) : "")].join(","))];
  return "\uFEFF" + rows.join("\r\n");
}

const ankiField = (s: string) => s.replace(/[\t\r\n]+/g, " ").trim();
export const cardsToAnki = (cards: EducationCard[]) => cards.map((c) => `${ankiField(c.front)}\t${ankiField(c.back)}`).join("\n");

export async function downloadText(content: string, name: string, mime: string) {
  await downloadBlob(new Blob([content], { type: `${mime};charset=utf-8` }), name);
}

export async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error("Copying is not supported in this browser.");
  await navigator.clipboard.writeText(text);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function printHtml(title: string, bodyHtml: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) { frame.remove(); throw new Error("Printing is not available in this browser."); }
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Georgia,serif;margin:28px;color:#111}h1{font-size:22px}li{margin:10px 0}.opt{margin-left:18px}.ans{page-break-before:always}</style></head><body>${bodyHtml}</body></html>`);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 2000);
  }, 150);
}

export function printQuiz(quiz: EducationQuiz) {
  const qs = quiz.questions.map((q) => `<li>${esc(q.question)}${effectiveOptions(q).map((o, j) => `<div class="opt">${String.fromCharCode(65 + j)}. ${esc(o)}</div>`).join("")}</li>`).join("");
  const as = quiz.questions.map((q) => `<li>${esc(q.correctAnswer)} <small>${esc(q.explanation)}</small></li>`).join("");
  printHtml(quiz.title, `<h1>${esc(quiz.title)}</h1><ol>${qs}</ol><div class="ans"><h1>Answer key</h1><ol>${as}</ol></div>`);
}
