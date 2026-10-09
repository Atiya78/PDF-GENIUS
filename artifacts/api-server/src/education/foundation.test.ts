import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { Request } from "express";
import { pool } from "@workspace/db";
import { GenerateEducationQuizBody, GenerateEducationFlashcardsBody } from "@workspace/api-zod";
import { extractPdf, parsePageRange, chunkSource } from "./source";
import { generateQuiz, generateFlashcards } from "./ai";
import { exportHtml, exportFile, exportTextFile } from "./exports";
import { beginEducationRequest } from "./history";
import { EducationError } from "./config";
import { reserveEducationAccess } from "./limits";

after(() => pool.end());
const text = "Photosynthesis uses light energy. Chlorophyll absorbs sunlight. Chloroplasts contain chlorophyll. Plants absorb water and carbon dioxide, release oxygen, and store chemical energy as sugar.";
const pages = [{ pageNumber: 12, text }];
const quizInput = { pages, count: 50, questionTypes: ["mcq" as const], difficulty: "easy" as const, language: "english" as const };
const quiz = { title: "Photosynthesis", questions: [{ id: "q1", type: "mcq" as const, question: "Which pigment absorbs light?", options: ["Chlorophyll", "Water", "Oxygen", "Sugar"], correctAnswer: "Chlorophyll", explanation: "Chlorophyll absorbs sunlight.", difficulty: "easy" as const, sourcePage: 12 }] };
const deck = { title: "Biology", cards: Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, front: `Front ${i}`, back: `Back ${i}`, sourcePage: 12 })) };

test("contracts accept every integer count through the required bounds", () => {
  for (let count = 5; count <= 50; count++) assert.ok(GenerateEducationQuizBody.safeParse({ ...quizInput, count }).success);
  for (let count = 10; count <= 100; count++) assert.ok(GenerateEducationFlashcardsBody.safeParse({ pages, count, style: "cloze", language: "bangla" }).success);
  for (const count of [4, 51, 5.5]) assert.equal(GenerateEducationQuizBody.safeParse({ ...quizInput, count }).success, false);
  assert.deepEqual(parsePageRange("12, 2-3", 20), [2, 3, 12]);
  assert.throws(() => parsePageRange("1-21", 20), EducationError);
  assert.ok(chunkSource([{ pageNumber: 300, text: text.repeat(200) }]).every(chunk => chunk.pageNumbers.includes(300)));
});

test("PDF extraction keeps actual page numbers and rejects scans and wrong files", async () => {
  const document = await PDFDocument.create(), font = await document.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 3; i++) document.addPage().drawText(text, { font, size: 9, x: 20, y: 600 });
  const result = await extractPdf(Buffer.from(await document.save()), "2-3");
  assert.deepEqual(result.pages.map(page => page.pageNumber), [2, 3]);
  const blank = await PDFDocument.create(); blank.addPage();
  await assert.rejects(extractPdf(Buffer.from(await blank.save())), error =>
    error instanceof EducationError && error.status === 422 && error.ocrUrl === "/upload/ocr-pdf");
  await assert.rejects(extractPdf(Buffer.from("not PDF")), /valid PDF/);
  await assert.rejects(extractPdf(Buffer.alloc(20 * 1024 * 1024 + 1)), /20 MB/);
});

test("structured AI retries invalid JSON, merges full counts and enforces Cloze", async () => {
  let calls = 0, invalid = true, mode: "valid" | "bad-cloze" | "rate-limit" = "valid";
  const server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk;
    const input = JSON.parse(body), prompt = String(input.messages[1].content);
    assert.equal(input.response_format.json_schema.strict, true);
    calls++;
    if (mode === "rate-limit") { res.writeHead(429); res.end("{}"); return; }
    const count = Number(/Create exactly (\d+)/.exec(prompt)![1]);
    const value = input.response_format.json_schema.name === "education_quiz"
      ? { title: "Biology", questions: Array.from({ length: count }, (_, i) => ({ ...quiz.questions[0], id: String(i), question: `Question ${calls}-${i}` })) }
      : { title: "Biology", cards: Array.from({ length: count }, (_, i) => ({ id: String(i), front: `${mode === "bad-cloze" ? "No blank" : "____ absorbs light"} (${calls}-${i})`, back: "Chlorophyll", sourcePage: 12 })) };
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ choices: [{ message: { content: invalid ? "not JSON" : JSON.stringify(value) } }] }));
    invalid = false;
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const keys = ["EDUCATION_AI_PROVIDER", "EDUCATION_AI_BASE_URL", "EDUCATION_AI_MODEL", "OPENAI_API_KEY"] as const;
  const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.EDUCATION_AI_PROVIDER = "openai"; process.env.EDUCATION_AI_MODEL = "gpt-5-mini";
    process.env.EDUCATION_AI_BASE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    process.env.OPENAI_API_KEY = "education-unit-test-fixture";
    assert.equal((await generateQuiz(quizInput)).questions.length, 50);
    assert.equal(calls, 4); // Three bounded output batches plus one parse retry.
    assert.equal((await generateFlashcards({ pages, count: 100, style: "cloze", language: "english" })).cards.length, 100);
    mode = "bad-cloze"; const before = calls;
    await assert.rejects(generateFlashcards({ pages, count: 10, style: "cloze", language: "english" }), /valid study material/);
    assert.equal(calls - before, 2);
    mode = "rate-limit";
    await assert.rejects(generateQuiz({ ...quizInput, count: 5 }), error => error instanceof EducationError && error.status === 429);
  } finally {
    for (const key of keys) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; }
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("shared exports preserve Unicode, real DOCX and front/back cut-line alignment without a browser", async () => {
  const html = exportHtml({ kind: "cards", format: "pdf", deck }, "font-data-fixture");
  assert.equal(html.match(/class="sheet"/g)?.length, 4);
  assert.ok(html.indexOf("Back 1") < html.indexOf("Back 0"));
  assert.match(html, /data:font\/ttf;base64,font-data-fixture/);
  const csv = exportTextFile({ kind: "cards", format: "csv", deck }).buffer.toString("utf8");
  assert.equal(csv.split("\r\n")[0], "\uFEFFfront,back");
  const bangla = { ...quiz, title: "বাংলা", questions: quiz.questions.map(question => ({ ...question, explanation: "সূর্যের আলো" })) };
  assert.match(exportTextFile({ kind: "quiz", format: "markdown", quiz: bangla }).buffer.toString("utf8"), /সূর্যের আলো/);
  assert.equal((await exportFile({ kind: "quiz", format: "docx", quiz: bangla })).buffer.subarray(0, 2).toString(), "PK");
});

test("request replay and credit settlement are duplicate-safe and transactional", async context => {
  const savedSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "education-unit-only-hmac-fixture";
  const records = new Map<string, { id: string; digest: string; status: string; result: unknown }>();
  let creditWrites = 0, rollback = false, wallet = 1;
  context.mock.method(pool, "query", async (sql: string, args: unknown[] = []) => {
    if (sql.startsWith("CREATE") || sql.startsWith("ALTER")) return { rows: [], rowCount: 0 };
    if (sql.startsWith("INSERT")) {
      const key = `${args[1]}:${args[2]}`;
      if (records.has(key)) return { rows: [], rowCount: 0 };
      records.set(key, { id: String(args[0]), digest: String(args[3]), status: "processing", result: null });
      return { rows: [{ id: args[0] }], rowCount: 1 };
    }
    if (sql.startsWith("SELECT request_hash")) {
      const row = records.get(`${args[0]}:${args[1]}`)!;
      return { rows: [{ request_hash: row.digest, status: row.status, result: row.result }], rowCount: 1 };
    }
    throw new Error("Unexpected test query");
  });
  context.mock.method(pool, "connect", async () => ({
    release() {},
    async query(sql: string, args: unknown[] = []) {
      if (sql === "ROLLBACK") { rollback = true; return {}; }
      if (sql === "BEGIN" || sql === "COMMIT") return {};
      const row = [...records.values()].find(record => record.id === args[0]);
      if (sql.startsWith("SELECT status")) return { rows: [{ status: row?.status }], rowCount: row ? 1 : 0 };
      if (sql.startsWith("UPDATE users")) { if (!wallet) return { rowCount: 0 }; wallet--; creditWrites++; return { rowCount: 1 }; }
      if (sql.startsWith("UPDATE education_generation")) { row!.status = "succeeded"; row!.result = JSON.parse(String(args[1])); return { rowCount: 1 }; }
      throw new Error("Unexpected test transaction");
    },
  }));
  try {
    const req = { ip: "127.0.0.100", user: { id: randomUUID(), credits: 1 } } as Request;
    const key = randomUUID(), input = { pages, count: 5 };
    const first = await beginEducationRequest(req, "quiz", input, key);
    await assert.rejects(beginEducationRequest(req, "quiz", input, key), /already processing/);
    assert.equal(creditWrites, 0);
    await first.complete!(quiz, true);
    assert.equal(creditWrites, 1);
    assert.deepEqual((await beginEducationRequest(req, "quiz", input, key)).cached, quiz);
    await assert.rejects(beginEducationRequest(req, "quiz", { pages, count: 6 }, key), /different options/);
    const second = await beginEducationRequest(req, "quiz", input, randomUUID());
    await assert.rejects(second.complete!(quiz, true), error => error instanceof EducationError && error.status === 402);
    assert.equal(creditWrites, 1); assert.equal(rollback, true);
  } finally {
    if (savedSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = savedSecret;
  }
});

test("failed generation refunds free usage and overflow checks existing credits without spending", async context => {
  let used = 0, wallet = 1;
  const original = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "education-unit-only-hmac-fixture";
  context.mock.method(pool, "query", async (sql: string) => {
    if (sql.includes("CREATE TABLE") || sql.startsWith("DELETE")) return { rows: [], rowCount: 0 };
    if (sql.startsWith("INSERT INTO education_daily_usage")) {
      if (used >= 5) return { rows: [], rowCount: 0 };
      return { rows: [{ used: ++used }], rowCount: 1 };
    }
    if (sql.startsWith("UPDATE education_daily_usage")) { used--; return { rows: [], rowCount: 1 }; }
    if (sql.startsWith("SELECT credits")) return { rows: [{ credits: wallet }], rowCount: 1 };
    throw new Error("Unexpected query: credit spending must not happen before AI succeeds");
  });
  try {
    const req = { ip: "127.0.0.101", user: { id: randomUUID(), credits: 1 } } as Request;
    const first = await reserveEducationAccess(req);
    for (let index = 0; index < 4; index++) assert.equal((await reserveEducationAccess(req)).chargeCredit, false);
    assert.equal((await reserveEducationAccess(req)).chargeCredit, true);
    assert.equal(wallet, 1);
    await first.refund(); assert.equal(used, 4);
    assert.equal((await reserveEducationAccess(req)).chargeCredit, false);
    wallet = 0;
    await assert.rejects(reserveEducationAccess(req), error => error instanceof EducationError && error.status === 402);
  } finally {
    if (original === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original;
  }
});
