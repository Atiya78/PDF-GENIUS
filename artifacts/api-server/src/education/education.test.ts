import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID, createHmac } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { pool } from "@workspace/db";
import { GenerateEducationQuizBody } from "@workspace/api-zod";
import type { Request } from "express";
import { extractPdf, parsePageRange, chunkSource, validateSource } from "./source";
import { generateQuiz, generateFlashcards, assertAiReady, documentPrompt } from "./ai";
import { exportFile, escapeHtml, exportHtml } from "./exports";
import { reserveGeneration } from "./limits";
import { EducationError } from "./config";

const notes = "Photosynthesis converts light energy into chemical energy. Chlorophyll absorbs sunlight. Plants use carbon dioxide and water. Oxygen is released during photosynthesis. Chloroplasts contain chlorophyll. Roots absorb water from soil.";
const pages = [{ pageNumber: 1, text: notes }];
const quizInput = { pages, count: 5 as const, questionTypes: ["mcq", "true-false", "short-answer", "fill-blank"] as const, difficulty: "easy" as const, language: "english" as const };
const quiz = {
  title: "Biology revision", questions: [{ id: "1", type: "mcq" as const, question: "What absorbs sunlight?",
    options: ["Chlorophyll", "Soil", "Oxygen", "Water"], correctAnswer: "Chlorophyll",
    explanation: "The notes state that chlorophyll absorbs sunlight.", difficulty: "easy" as const, sourcePage: 1 }],
};
after(async () => { await pool.end(); });

test("page ranges validate bounds, normalize dashes and de-duplicate", () => {
  assert.deepEqual(parsePageRange("3–5,4,1", 7), [1, 3, 4, 5]);
  assert.deepEqual(parsePageRange("", 2), [1, 2]);
  for (const invalid of ["0", "3-2", "1,99", "abc", "1,,2"])
    assert.throws(() => parsePageRange(invalid, 8), EducationError);
});
test("source limits and request schema reject unreadable or oversized input", () => {
  assert.throws(() => validateSource([{ pageNumber: null, text: "   " }]), /readable/);
  assert.throws(() => validateSource([{ pageNumber: 1, text: "a".repeat(250_001) }]), /too much text/);
  assert.equal(GenerateEducationQuizBody.safeParse({ ...quizInput, count: 99 }).success, false);
});
test("chunking includes the end of a long single page with source numbers intact", () => {
  const chunks = chunkSource([{ pageNumber: 7, text: "a".repeat(40_000) + "THE_END" }]);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.at(-1)!.text.includes("THE_END"));
  assert.ok(chunks.every(c => c.pageNumbers.includes(7)));
  assert.ok(documentPrompt.includes("ONLY") && documentPrompt.includes("untrusted"));
});
test("real PDF text extraction respects selected pages, rejects damaged and >50-page PDFs", async () => {
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 3; i++) pdf.addPage().drawText(`Page ${i + 1}. ${notes}`, { x: 40, y: 700, size: 9, font, maxWidth: 500 });
  const result = await extractPdf(Buffer.from(await pdf.save()), "2-3");
  assert.equal(result.totalPages, 3); assert.equal(result.usedOcr, false);
  assert.deepEqual(result.pages.map(p => p.pageNumber), [2, 3]);
  await assert.rejects(extractPdf(Buffer.from("not a pdf")), /valid PDF/);
  const long = await PDFDocument.create();
  for (let i = 0; i < 51; i++) long.addPage();
  await assert.rejects(extractPdf(Buffer.from(await long.save())), /50 pages/);
});
test("real scanned-page OCR fallback reads a synthetic image, without persisting the upload", async () => {
  const image = await sharp(Buffer.from(`<svg width="1400" height="900" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/><g fill="black" font-family="Arial" font-size="38">
  <text x="65" y="120">Photosynthesis converts light into chemical energy.</text>
  <text x="65" y="200">Chlorophyll absorbs sunlight inside chloroplasts.</text>
  <text x="65" y="280">Plants absorb water and release oxygen.</text></g></svg>`)).png().toBuffer();
  const pdf = await PDFDocument.create(), embedded = await pdf.embedPng(image);
  pdf.addPage([700, 450]).drawImage(embedded, { x: 0, y: 0, width: 700, height: 450 });
  const result = await extractPdf(Buffer.from(await pdf.save()));
  assert.equal(result.usedOcr, true);
  assert.match(result.pages[0]!.text, /Chlorophyll/i);
});

test("strict AI parsing retries once, merges chunks, enforces grounded pages and answer choices", async () => {
  let requests = 0, invalidRemaining = 1, badPages = false, openrouterMode = false;
  const mock = createServer(async (req, res) => {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const input = JSON.parse(raw), prompt = input.messages[1].content as string;
    assert.equal(input.response_format.json_schema.strict, true);
    if (openrouterMode) {
      assert.equal(input.model, "openai/gpt-5-mini");
      assert.equal(input.provider.require_parameters, true);
      assert.equal(input.reasoning_effort, "low");
      assert.equal(input.store, undefined);
      assert.equal(req.headers.authorization, "Bearer openrouter-fixture-not-a-secret");
    } else assert.equal(input.store, false);
    requests++;
    let result: unknown;
    if (invalidRemaining-- > 0) result = "not-json";
    else {
      const count = Number(/Create exactly (\d+)/.exec(prompt)![1]);
      const sourcePage = badPages ? 50 : Number(/\[Source page: (\d+)\]/.exec(prompt)?.[1] ?? 1);
      if (input.response_format.json_schema.name === "education_quiz") {
        const types = /Types in order: ([^\n]+)\./.exec(prompt)![1].split(", ");
        result = { title: "Biology revision", questions: Array.from({ length: count }, (_, i) => {
          const type = types[i], options = type === "mcq" ? ["Chlorophyll", "Soil", "Oxygen", "Water"] : type === "true-false" ? ["True", "False"] : [];
          return { ...quiz.questions[0], id: String(i), type, sourcePage, options,
            question: `${type === "fill-blank" ? "____ absorbs" : "What absorbs"} sunlight? (${requests}-${i})`,
            correctAnswer: type === "true-false" ? "True" : "Chlorophyll" };
        }) };
      } else result = { title: "Biology", cards: Array.from({ length: count }, (_, i) => ({
        id: String(i), front: `Chlorophyll ${requests}-${i}`, back: "Absorbs sunlight.", sourcePage,
      })) };
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ choices: [{ message: { content: typeof result === "string" ? result : JSON.stringify(result) } }] }));
  });
  await new Promise<void>(resolve => mock.listen(0, "127.0.0.1", resolve));
  const address = mock.address() as { port: number };
  const oldKey = process.env.OPENAI_API_KEY, oldBase = process.env.EDUCATION_AI_BASE_URL;
  const savedConfig = Object.fromEntries(["EDUCATION_AI_PROVIDER", "EDUCATION_AI_MODEL", "OPENROUTER_API_KEY"].map(name => [name, process.env[name]]));
  // Isolated test process only; never changes workspace Secrets/configuration.
  process.env.OPENAI_API_KEY = "fixture-not-a-secret";
  process.env.EDUCATION_AI_PROVIDER = "openai";
  process.env.EDUCATION_AI_MODEL = "gpt-5-mini";
  process.env.EDUCATION_AI_BASE_URL = `http://127.0.0.1:${address.port}`;
  try {
    const result = await generateQuiz({ ...quizInput, questionTypes: [...quizInput.questionTypes] });
    assert.equal(requests, 2); assert.equal(result.questions.length, 5);
    assert.equal(new Set(result.questions.map(q => q.id)).size, 5);
    const longPages = Array.from({ length: 4 }, (_, i) => ({ pageNumber: i + 1, text: notes.repeat(80) }));
    const deck = await generateFlashcards({ pages: longPages, count: 60, style: "term-definition", language: "english" });
    assert.equal(deck.cards.length, 60);
    assert.equal(new Set(deck.cards.map(c => c.front)).size, 60);
    badPages = true; const before = requests;
    await assert.rejects(generateQuiz({ ...quizInput, questionTypes: [...quizInput.questionTypes] }), /valid study material/);
    assert.equal(requests - before, 2);
    delete process.env.OPENAI_API_KEY;
    assert.throws(assertAiReady, /not configured/);
    openrouterMode = true; badPages = false;
    process.env.EDUCATION_AI_PROVIDER = "openrouter";
    process.env.EDUCATION_AI_MODEL = "openai/gpt-5-mini";
    process.env.OPENROUTER_API_KEY = "openrouter-fixture-not-a-secret";
    assert.equal((await generateQuiz({ ...quizInput, questionTypes: [...quizInput.questionTypes] })).questions.length, 5);
    assert.equal((await generateFlashcards({ pages, count: 10, style: "term-definition", language: "english" })).cards.length, 10);
    delete process.env.OPENROUTER_API_KEY;
    // A selected provider never silently borrows another provider's credential.
    process.env.OPENAI_API_KEY = "fixture-not-a-secret";
    assert.throws(assertAiReady, /not configured/);
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
    if (oldBase === undefined) delete process.env.EDUCATION_AI_BASE_URL; else process.env.EDUCATION_AI_BASE_URL = oldBase;
    for (const [name, value] of Object.entries(savedConfig)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    await new Promise<void>(resolve => mock.close(() => resolve()));
  }
});
test("daily quota is atomic, shared, durable, and failed generations can be refunded", async () => {
  const ip = `education-test-${randomUUID()}`;
  const req = { ip } as Request;
  const hash = createHmac("sha256", process.env.JWT_SECRET!).update(`education:${ip}`).digest("hex");
  try {
    const refund = await reserveGeneration(req);
    for (let i = 0; i < 4; i++) await reserveGeneration(req);
    await assert.rejects(reserveGeneration(req), /today's 5/);
    await refund(); await reserveGeneration(req);
    await assert.rejects(reserveGeneration(req), /today's 5/);
  } finally { await pool.query("DELETE FROM education_daily_usage WHERE identity_hash = $1", [hash]); }
});
test("PDF/DOCX exports work and printable flashcards have eight cards per sheet", async () => {
  assert.equal(escapeHtml('<img src="x">'), "&lt;img src=&quot;x&quot;&gt;");
  const questions = await exportFile({ kind: "questions", format: "pdf", quiz });
  const answers = await exportFile({ kind: "answers", format: "pdf", quiz });
  assert.equal(questions.buffer.subarray(0, 4).toString(), "%PDF");
  assert.equal(answers.buffer.subarray(0, 4).toString(), "%PDF");
  const bangla = await exportFile({ kind: "answers", format: "pdf", quiz: { ...quiz, title: "বাংলা অধ্যয়ন",
    questions: quiz.questions.map(q => ({ ...q, question: "সূর্যের আলো কে শোষণ করে?", correctAnswer: "ক্লোরোফিল", explanation: "ক্লোরোফিল সূর্যের আলো শোষণ করে।" })) } });
  const banglaParser = new (await import("pdf-parse")).PDFParse({ data: new Uint8Array(bangla.buffer) });
  try { assert.match((await banglaParser.getText()).text, /[\u0980-\u09ff]/); } finally { await banglaParser.destroy(); }
  const doc = await exportFile({ kind: "quiz", format: "docx", quiz });
  assert.equal(doc.buffer.subarray(0, 2).toString(), "PK");
  const deck = { title: "Revision", cards: Array.from({ length: 10 }, (_, i) => ({ id: String(i), front: "Chlorophyll", back: "Absorbs sunlight.", sourcePage: 1 })) };
  assert.equal(exportHtml({ kind: "cards", format: "pdf", deck }).match(/class="sheet"/g)?.length, 2);
  const file = await exportFile({ kind: "cards", format: "pdf", deck });
  const parser = new (await import("pdf-parse")).PDFParse({ data: new Uint8Array(file.buffer) });
  try { assert.equal((await parser.getInfo()).total, 2); } finally { await parser.destroy(); }
  await assert.rejects(exportFile({ kind: "cards", format: "docx", deck }), /Choose PDF/);
});