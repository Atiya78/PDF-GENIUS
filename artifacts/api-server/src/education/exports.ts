import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import puppeteer from "puppeteer";
import { Document, HeadingLevel, Packer, Paragraph, PageBreak, TextRun } from "docx";
import type { EducationExportInput, EducationQuiz } from "@workspace/api-zod";
import { EducationError } from "./config";

export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]!));

function quizHtml(quiz: EducationQuiz, answers: boolean) {
  return quiz.questions.map((q, i) => `<article><h3>${i + 1}. ${escapeHtml(q.question)}</h3>${
    answers ? `<p><strong>Answer:</strong> ${escapeHtml(q.correctAnswer)}</p><p>${escapeHtml(q.explanation)}</p>`
      : q.options.length ? `<ol type="A">${q.options.map(o => `<li>${escapeHtml(o)}</li>`).join("")}</ol>`
      : `<p class="blank">Answer: __________________________________________________</p>`
  }${q.sourcePage ? `<small>Source page ${q.sourcePage}</small>` : ""}</article>`).join("");
}

let bengaliFont: Promise<string> | undefined;
function loadBengaliFont() {
  return bengaliFont ??= readFile(new URL("./assets/NotoSansBengali.ttf", import.meta.url))
    // Bundled API entry is dist/index.mjs; source-run tests use this module.
    .catch(() => readFile(new URL("../src/education/assets/NotoSansBengali.ttf", import.meta.url)))
    .then(buffer => buffer.toString("base64"))
    .catch(error => { bengaliFont = undefined; throw error; });
}

export function exportHtml(input: EducationExportInput, fontData?: string): string {
  const title = input.kind === "cards" ? input.deck!.title : input.quiz!.title;
  let content: string;
  if (input.kind === "cards") {
    const cards = input.deck!.cards;
    content = Array.from({ length: Math.ceil(cards.length / 8) }, (_, page) =>
      `<section class="sheet"><h1>${escapeHtml(title)}</h1><div class="card-grid">${
        cards.slice(page * 8, page * 8 + 8).map(c => `<article class="cutout"><strong>${escapeHtml(c.front)}</strong><hr><p>${escapeHtml(c.back)}</p>${c.sourcePage ? `<small>Page ${c.sourcePage}</small>` : ""}</article>`).join("")
      }</div></section>`).join("");
  } else {
    const quiz = input.quiz!;
    content = `<h1>${escapeHtml(title)}${input.kind === "answers" ? " — Answer key" : ""}</h1>` +
      quizHtml(quiz, input.kind === "answers");
    if (input.kind === "quiz") content += `<section class="answer-key"><h1>Answer key</h1>${quizHtml(quiz, true)}</section>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fontData ? `@font-face{font-family:"Education Bengali";src:url(data:font/ttf;base64,${fontData}) format("truetype");font-weight:100 900;unicode-range:U+0980-09FF}` : ""}
@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;width:182mm;max-width:100%;font-family:"Education Bengali","Noto Sans Bengali","Noto Sans",Arial,sans-serif;color:#17202b;font-size:11pt;line-height:1.45;overflow-wrap:anywhere}
h1{font-size:19pt}h3{font-size:12pt}article{break-inside:avoid;margin-bottom:7mm}small{color:#596575;font-size:9pt}
.blank{margin:8mm 0}.answer-key{break-before:page}.sheet{break-after:page}.sheet:last-child{break-after:auto}
.sheet h1{height:12mm;margin:0 0 4mm;font-size:14pt;overflow:hidden}.card-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,59mm);gap:3mm}
.cutout{border:1px dashed #929aa5;padding:4mm;margin:0;font-size:9pt;overflow:hidden}.cutout p{margin:2mm 0}.cutout hr{border:0;border-top:1px solid #ccc}
</style></head><body>${content}</body></html>`;
}

async function browserPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  for (const command of ["chromium", "chromium-browser"]) {
    try { return execFileSync("which", [command], { encoding: "utf8" }).trim(); } catch {}
  }
  return await puppeteer.executablePath();
}

export async function exportFile(input: EducationExportInput): Promise<{ buffer: Buffer; extension: string; mime: string }> {
  if (input.kind === "cards" && (!input.deck || input.format !== "pdf"))
    throw new EducationError("Choose PDF to export printable flashcards.");
  if (input.kind !== "cards" && !input.quiz) throw new EducationError("Quiz data is missing.");
  if (input.format === "docx") {
    const quiz = input.quiz!;
    const children: Paragraph[] = [new Paragraph({ text: quiz.title, heading: HeadingLevel.TITLE })];
    for (const [index, q] of quiz.questions.entries()) {
      children.push(new Paragraph({ text: `${index + 1}. ${q.question}`, heading: HeadingLevel.HEADING_2 }));
      children.push(...q.options.map((o, i) => new Paragraph(`${String.fromCharCode(65 + i)}. ${o}`)));
      if (!q.options.length) children.push(new Paragraph("Answer: ____________________________________"));
    }
    children.push(new Paragraph({ children: [new PageBreak()] }), new Paragraph({ text: "Answer key", heading: HeadingLevel.HEADING_1 }));
    for (const [index, q] of quiz.questions.entries())
      children.push(new Paragraph({ children: [new TextRun({ text: `${index + 1}. ${q.correctAnswer}`, bold: true })] }), new Paragraph(q.explanation));
    return {
      buffer: await Packer.toBuffer(new Document({ sections: [{ children }] })),
      extension: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      executablePath: await browserPath(), headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    // Exports are self-contained; no user HTML, remote assets or local file reads.
    await page.setRequestInterception(true);
    page.on("request", r => r.url().startsWith("data:font/ttf;base64,") ? r.continue() : r.abort());
    const font = /[\u0980-\u09ff]/.test(JSON.stringify(input)) ? await loadBengaliFont() : undefined;
    await page.setContent(exportHtml(input, font), { waitUntil: "load", timeout: 30_000 });
    // This callback runs inside Chromium, not the Node/DOM-free TS project.
    const fits = await page.evaluate(`async () => {
      await document.fonts.ready;
      for (const card of document.querySelectorAll(".cutout")) {
        for (let size = 9; size >= 6; size -= 0.5) {
          card.style.fontSize = size + "pt";
          if (card.scrollHeight <= card.clientHeight + 1) break;
        }
        if (card.scrollHeight > card.clientHeight + 1) return false;
      }
      return true;
    }`);
    if (!fits) throw new EducationError("Some cards are too long for printable cut-outs. Shorten their text before exporting.");
    const buffer = Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, timeout: 30_000 }));
    return { buffer, extension: "pdf", mime: "application/pdf" };
  } catch (error) {
    if (error instanceof EducationError) throw error;
    throw new EducationError("Could not create the export. Please try again.", 503);
  }
  finally { await browser?.close().catch(() => {}); }
}

export function exportDisposition(title: string, extension: string) {
  const name = `${title.replace(/[\u0000-\u001f\u007f/\\]/g, "").slice(0, 100) || "Study material"}.${extension}`;
  const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}`;
}