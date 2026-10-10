import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import express, { type Request } from "express";
import { pool } from "@workspace/db";
import { EducationError } from "./config";
import { translationChunks, translatePage, sealTranslation, verifyTranslationReceipt, streamTranslation } from "./translation";
import { validateExamSettings, validateExamPaper, makeExam, regenerateExam } from "./exams";
import { exportFile, exportHtml } from "./exports";
import type { EducationExamPaper, EducationExamSettings, EducationTranslationInput, EducationTranslationEvent } from "@workspace/api-zod";
after(() => pool.end());
const pages = [{ pageNumber: 2, text: "Velocity is displacement divided by time. A straight line at constant speed has constant velocity.\nv = s / t" }];
const settings: EducationExamSettings = { institution: "Unit fixture institution", examName: "Physics assessment",
  subject: "Physics", className: "10", totalMarks: 20, time: "45 minutes", format: "bangladesh-board", language: "bangla",
  sections: [{ id: "creative", kind: "broad", count: 2, marksPerQuestion: 10 }] };
function question(n: number) {
  return { id: `q${n}`, sectionId: "creative", kind: "broad" as const, text: `Explain the velocity relation ${n}.`,
    stimulus: "An object moves in a straight line at constant speed.", options: [], correctOption: null,
    parts: ["ক", "খ", "গ", "ঘ"].map((label, index) => ({ label: label as "ক" | "খ" | "গ" | "ঘ", text: `Describe velocity (${index + 1}).`,
      answer: "Velocity is displacement divided by time.", marks: index + 1, markingScheme: [{ text: `Private scoring detail ${index + 1}`, marks: index + 1 }] })),
    answer: "Velocity relates displacement and time.", markingScheme: [{ text: "Private full scoring detail", marks: 10 }], sourcePages: [2] };
}
const paper: EducationExamPaper = { title: "Physics assessment", settings, questions: [question(1), question(2)] };
function zipXml(buffer: Buffer, name: string): string {
  for (let i = 0; i < buffer.length - 46; i++) {
    if (buffer.readUInt32LE(i) !== 0x02014b50) continue;
    const n = buffer.readUInt16LE(i + 28);
    if (buffer.subarray(i + 46, i + 46 + n).toString() !== name) continue;
    const offset = buffer.readUInt32LE(i + 42);
    const start = offset + 30 + buffer.readUInt16LE(offset + 26) + buffer.readUInt16LE(offset + 28);
    const data = buffer.subarray(start, start + buffer.readUInt32LE(i + 20));
    return (buffer.readUInt16LE(i + 10) === 8 ? inflateRawSync(data) : data).toString();
  }
  throw new Error("DOCX XML not found");
}
test("teacher exam totals and creative part rubrics are validated exactly", () => {
  assert.doesNotThrow(() => validateExamPaper(paper));
  assert.throws(() => validateExamSettings({ ...settings, totalMarks: 19 }), /add up/);
  assert.throws(() => validateExamSettings({ ...settings, totalMarks: 18, sections: [{ ...settings.sections[0]!, marksPerQuestion: 9 }] }), /10 marks/);
  const broken = structuredClone(paper); broken.questions[0]!.parts[2]!.marks = 2;
  assert.throws(() => validateExamPaper(broken), /1\/2\/3\/4/);
  const badRubric = structuredClone(paper); badRubric.questions[0]!.parts[0]!.markingScheme[0]!.marks = 2;
  assert.throws(() => validateExamPaper(badRubric), /matching marking/);
  const wrongCount = { ...paper, questions: [paper.questions[0]!] };
  assert.throws(() => validateExamPaper(wrongCount), /counts/);
});
test("student exam exports do not leak marking details; DOCX is genuinely A4", async () => {
  const student = exportHtml({ kind: "exam-paper", format: "pdf", exam: paper }, "licensed-font-fixture");
  assert.ok(!student.includes("Private scoring")); assert.ok(!student.includes("Private full scoring"));
  assert.ok(!student.includes("Answer key")); assert.match(student, /Time: 45 minutes/); assert.match(student, /Total marks: 20/);
  assert.match(student, /ক/); assert.match(student, /data:font\/ttf;base64/);
  const key = exportHtml({ kind: "exam-key", format: "pdf", exam: paper });
  assert.match(key, /Private scoring/); assert.match(key, /Answer key/);
  const doc = await exportFile({ kind: "exam-paper", format: "docx", exam: paper });
  const xml = zipXml(doc.buffer, "word/document.xml");
  assert.match(xml, /w:w="11906"/); assert.match(xml, /w:h="16838"/); assert.ok(!xml.includes("Private scoring"));
  const keyDoc = await exportFile({ kind: "exam-key", format: "docx", exam: paper });
  assert.match(zipXml(keyDoc.buffer, "word/document.xml"), /Private scoring/);
  await assert.rejects(exportFile({ kind: "exam-paper", format: "csv", exam: paper }), /PDF or DOCX/);
});
test("MCQs require distinct choices and an answer matching the selected option", () => {
  const mcqSettings: EducationExamSettings = { ...settings, format: "standard", totalMarks: 1,
    sections: [{ id: "mcq", kind: "mcq", count: 1, marksPerQuestion: 1 }] };
  const q = { ...question(1), kind: "mcq" as const, sectionId: "mcq", stimulus: "", parts: [],
    options: ["Displacement / time", "Time / displacement", "Mass / volume", "Force / area"], correctOption: 0,
    answer: "Displacement / time", markingScheme: [{ text: "Correct option", marks: 1 }] };
  assert.doesNotThrow(() => validateExamPaper({ title: "Physics", settings: mcqSettings, questions: [q] }));
  assert.throws(() => validateExamPaper({ title: "Physics", settings: mcqSettings, questions: [{ ...q, answer: "Invented answer" }] }), /matching answer/);
  assert.throws(() => validateExamPaper({ title: "Physics", settings: mcqSettings, questions: [{ ...q, options: ["Same", "Same", "C", "D"] }] }), /distinct options/);
});
test("blank translated pages and text tables are preserved without executable HTML", async () => {
  const translation = { title: "Translated material", pages: [{ pageNumber: 2, text: "শিরোনাম\n\n| সময় | বেগ |\n| ২ | ১০ |",
    sourceLanguage: "english" as const, targetLanguage: "bangla" as const }, { pageNumber: 3, text: "", sourceLanguage: "english" as const, targetLanguage: "bangla" as const }] };
  const html = exportHtml({ kind: "translation", format: "pdf", translation });
  assert.match(html, /\| সময় \| বেগ \|/); assert.match(html, /Source page 3/);
  const doc = await exportFile({ kind: "translation", format: "docx", translation });
  assert.match(zipXml(doc.buffer, "word/document.xml"), /শিরোনাম/);
  assert.match(zipXml(doc.buffer, "word/document.xml"), /w:type="page"/);
  const chunks = translationChunks("paragraph\n\n".repeat(2000));
  assert.ok(chunks.length > 1); assert.equal(chunks.join(""), "paragraph\n\n".repeat(2000)); assert.ok(chunks.every(chunk => chunk.length <= 6000));
});
test("signed receipts reject changed source, settings, owner, output and expiry", () => {
  const prior = process.env.JWT_SECRET; process.env.JWT_SECRET = "education-unit-hmac-fixture";
  try {
    const req = { ip: "127.0.0.4", user: { id: randomUUID() } } as Request;
    const input: EducationTranslationInput = { pages, direction: "english-to-bangla", keepTechnicalEnglish: true };
    const receipt = sealTranslation(req, input, { pageNumber: 2, text: "বেগ = সরণ / সময়", sourceLanguage: "english", targetLanguage: "bangla" });
    assert.equal(verifyTranslationReceipt(req, input, receipt).page.text, receipt.page.text);
    assert.throws(() => verifyTranslationReceipt(req, { ...input, pages: [{ ...pages[0]!, text: "Different source" }] }, receipt), /does not match/);
    assert.throws(() => verifyTranslationReceipt(req, { ...input, keepTechnicalEnglish: false }, receipt), /does not match/);
    assert.throws(() => verifyTranslationReceipt({ ...req, user: { id: randomUUID() } } as Request, input, receipt), /does not match/);
    assert.throws(() => verifyTranslationReceipt(req, input, { ...receipt, page: { ...receipt.page, text: "Forged output" } }), /does not match/);
    assert.throws(() => verifyTranslationReceipt(req, input, { ...receipt, expiresAt: 1 }), /expired/);
  } finally { if (prior === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = prior; }
});
test("page-only retry reuses receipts, completion charges once and replay does not call AI", async context => {
  const keys = ["JWT_SECRET", "EDUCATION_AI_PROVIDER", "EDUCATION_AI_BASE_URL", "EDUCATION_AI_MODEL", "OPENROUTER_API_KEY"] as const;
  const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const rows = new Map<string, { id: string; digest: string; status: string; result: unknown }>();
  let wallet = 1, charges = 0, calls = 0, failSecond = true;
  context.mock.method(pool, "query", async (sql: string, args: unknown[] = []) => {
    if (sql.startsWith("CREATE") || sql.startsWith("ALTER")) return { rows: [], rowCount: 0 };
    if (sql.startsWith("INSERT INTO education_daily_usage")) return { rows: [], rowCount: 0 }; // Five free already used.
    if (sql.startsWith("SELECT credits")) return { rows: [{ credits: wallet }], rowCount: 1 };
    if (sql.startsWith("INSERT INTO education_generation_requests")) {
      const key = `${args[1]}:${args[2]}`; if (rows.has(key)) return { rows: [], rowCount: 0 };
      rows.set(key, { id: String(args[0]), digest: String(args[3]), status: "processing", result: null });
      return { rows: [{ id: args[0] }], rowCount: 1 };
    }
    if (sql.startsWith("SELECT request_hash")) {
      const row = rows.get(`${args[0]}:${args[1]}`)!;
      return { rows: [{ request_hash: row.digest, status: row.status, result: row.result }], rowCount: 1 };
    }
    if (sql.startsWith("DELETE FROM education_generation_requests")) {
      for (const [key, row] of rows) if (row.id === args[0] && row.status === "processing") rows.delete(key);
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("DELETE")) return { rows: [], rowCount: 0 };
    throw new Error(`Unexpected test SQL ${sql}`);
  });
  context.mock.method(pool, "connect", async () => ({ release() {}, async query(sql: string, args: unknown[] = []) {
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return {};
    const row = [...rows.values()].find(r => r.id === args[0]);
    if (sql.startsWith("SELECT status")) return { rows: [{ status: row!.status }] };
    if (sql.startsWith("UPDATE users")) { if (!wallet) return { rowCount: 0 }; wallet--; charges++; return { rowCount: 1 }; }
    if (sql.startsWith("UPDATE education_generation_requests")) { row!.status = "succeeded"; row!.result = JSON.parse(String(args[1])); return { rowCount: 1 }; }
    throw new Error("Unexpected transaction");
  } }));
  const provider = createServer(async (req, res) => {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw), prompt = String(body.messages[1].content); calls++;
    const value = failSecond && prompt.includes("RETRY_PAGE") ? { text: "" } : { text: "বেগ হলো সরণকে সময় দিয়ে ভাগ করলে প্রাপ্ত রাশি।\nv = s / t" };
    res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }));
  });
  const owner = randomUUID(), app = express(); app.use(express.json());
  let slots = 0;
  app.post("/", (req, res) => {
    req.user = { id: owner } as Request["user"];
    void streamTranslation(req, res, () => { slots++; return () => { slots--; }; },
      (r, error) => r.status(error instanceof EducationError ? error.status : 500).json({ error: error instanceof Error ? error.message : "Error" }));
  });
  const service = createServer(app);
  const listen = (server: ReturnType<typeof createServer>) => new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  await listen(provider); await listen(service);
  try {
    process.env.JWT_SECRET = "education-unit-hmac-fixture"; process.env.EDUCATION_AI_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "education-unit-api-fixture"; process.env.EDUCATION_AI_MODEL = "fixture-model";
    process.env.EDUCATION_AI_BASE_URL = `http://127.0.0.1:${(provider.address() as { port: number }).port}`;
    const url = `http://127.0.0.1:${(service.address() as { port: number }).port}/`;
    const input: EducationTranslationInput = { pages: [...pages, { pageNumber: 3, text: `${pages[0]!.text} RETRY_PAGE` }, { pageNumber: 4, text: "" }],
      direction: "english-to-bangla", keepTechnicalEnglish: true, requestId: randomUUID() };
    const send = async (body: EducationTranslationInput) => {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify(body) });
      assert.equal(res.status, 200);
      return (await res.text()).trim().split("\n").map(line => JSON.parse(line) as EducationTranslationEvent);
    };
    const first = await send(input);
    assert.equal(first.at(-1)!.type, "partial"); assert.equal(charges, 0); assert.equal(calls, 3);
    const receipts = first.flatMap(event => event.receipt ? [event.receipt] : []);
    assert.equal(receipts.length, 2); assert.ok(receipts.some(receipt => receipt.page.text === ""));
    failSecond = false;
    const retried = await send({ ...input, completed: receipts, retryPages: [3] });
    assert.equal(retried.at(-1)!.type, "complete"); assert.equal(calls, 4); assert.equal(charges, 1);
    assert.equal(retried.at(-1)!.result!.pages.length, 3);
    assert.equal((await send(input)).at(-1)!.type, "complete"); assert.equal(calls, 4); assert.equal(charges, 1); assert.equal(slots, 0);
    assert.equal((await translatePage({ pageNumber: 4, text: "" }, input)).text, "");
  } finally {
    for (const key of keys) { if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key]; }
    await Promise.all([provider, service].map(server => new Promise<void>(resolve => server.close(() => resolve()))));
  }
});
test("source-grounded exam generation and individual regeneration preserve the other questions", async () => {
  const keys = ["EDUCATION_AI_PROVIDER", "EDUCATION_AI_BASE_URL", "EDUCATION_AI_MODEL", "OPENROUTER_API_KEY"] as const;
  const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  let count = 10;
  const server = createServer(async (req, res) => {
    for await (const _ of req) { /* body consumed; no live provider */ }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ questions: [question(count++)] }) } }] }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    process.env.EDUCATION_AI_PROVIDER = "openrouter"; process.env.OPENROUTER_API_KEY = "education-unit-api-fixture";
    process.env.EDUCATION_AI_MODEL = "fixture-model"; process.env.EDUCATION_AI_BASE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const generated = await makeExam({ pages, settings });
    assert.equal(generated.questions.length, 2); assert.equal(generated.settings.totalMarks, 20);
    const regenerated = await regenerateExam({ pages, paper: generated, questionId: generated.questions[0]!.id });
    assert.equal(regenerated.questions[0]!.id, generated.questions[0]!.id);
    assert.notEqual(regenerated.questions[0]!.text, generated.questions[0]!.text);
    assert.deepEqual(regenerated.questions[1], generated.questions[1]);
  } finally {
    for (const key of keys) { if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key]; }
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
