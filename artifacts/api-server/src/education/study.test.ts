import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { pool } from "@workspace/db";
import { renderStudyMarkdown, studyInlineRuns, AskEducationPdfBody, GenerateEducationNotesBody, type EducationNotes } from "@workspace/api-zod";
import { pdfPassages, rankBm25, retrievePdf } from "./retrieval";
import { groundedAnswer, askPdf, makeNotes, starterQuestions } from "./study";
import { exportFile, exportHtml } from "./exports";

after(() => pool.end());
const pages = [{ pageNumber: 12, text: "Photosynthesis converts light energy into chemical energy. Chlorophyll absorbs sunlight in chloroplasts. Plants release oxygen." },
  { pageNumber: 27, text: "Velocity is displacement divided by time.\nv = s / t\nA constant speed keeps the same velocity in a straight line." }];
const response = { title: "Photosynthesis", question: "Which pigment absorbs light?", answer: "Chlorophyll absorbs sunlight.", found: true,
  citations: [{ pageNumber: 12, quote: "Chlorophyll absorbs sunlight in chloroplasts." }] };
const notes: EducationNotes = { title: "বাংলা পাঠ", style: "mind-map",
  sections: [{ id: "n1", heading: "Concepts", body: "- **Energy**\n  - Light becomes chemical energy\n\n`v = s / t`", sourcePages: [12, 27] }], takeaways: ["সূর্যের আলো"] };

test("BM25 finds actual relevant PDF pages, handles Bengali and rejects pasted sources", () => {
  assert.equal(rankBm25(pdfPassages(pages), "chlorophyll")[0]!.pageNumber, 12);
  assert.equal(rankBm25(pdfPassages(pages), "velocity displacement")[0]!.pageNumber, 27);
  const bangla = [{ pageNumber: 8, text: "সালোকসংশ্লেষণ সূর্যের আলো ব্যবহার করে।" }, { pageNumber: 9, text: "পৃথিবী সূর্যের চারপাশে ঘোরে।" }];
  assert.equal(rankBm25(pdfPassages(bangla), "সালোকসংশ্লেষণ")[0]!.pageNumber, 8);
  assert.throws(() => pdfPassages([{ pageNumber: null, text: "Pasted material" }]), /upload a PDF/);
  assert.equal(AskEducationPdfBody.safeParse({ pages, question: "Q", language: "english" }).success, false);
  assert.equal(GenerateEducationNotesBody.safeParse({ pages, style: "unknown", language: "english" }).success, false);
});

test("citation validation rejects false page numbers, fabricated quotes and unsupported citations", () => {
  assert.equal(groundedAnswer(response, pdfPassages(pages), "original question").question, "original question");
  assert.throws(() => groundedAnswer({ ...response, citations: [{ ...response.citations[0], pageNumber: 99 }] }, pdfPassages(pages), response.question));
  assert.throws(() => groundedAnswer({ ...response, citations: [{ pageNumber: 12, quote: "A made-up sentence not in this PDF." }] }, pdfPassages(pages), response.question));
  assert.throws(() => groundedAnswer({ ...response, citations: [] }, pdfPassages(pages), response.question));
  assert.throws(() => groundedAnswer({ ...response, found: false }, pdfPassages(pages), response.question));
});

test("Markdown is safe, preserves formulas and notes/chat exports use real editable content", async () => {
  const malicious = renderStudyMarkdown("<img src=x onerror=alert(1)>\n**Definition**\n- point");
  assert.ok(!malicious.includes("<img")); assert.match(malicious, /<strong>Definition<\/strong>/);
  const formula = "E = m * c * c";
  assert.equal(studyInlineRuns(formula).map(run => run.text).join(""), formula);
  const html = exportHtml({ kind: "notes", format: "pdf", notes }, "licensed-font-fixture");
  assert.match(html, /v = s \/ t/); assert.match(html, /p. 27/); assert.match(html, /সূর্যের আলো/);
  assert.match(html, /data:font\/ttf;base64/);
  const markdown = await exportFile({ kind: "notes", format: "markdown", notes });
  assert.match(markdown.buffer.toString(), /  - Light becomes chemical energy/);
  assert.match(markdown.buffer.toString(), /Key takeaways/);
  const docx = await exportFile({ kind: "notes", format: "docx", notes });
  assert.equal(docx.buffer.subarray(0, 2).toString(), "PK");
  assert.match(exportHtml({ kind: "chat", format: "pdf", chat: { title: "Study chat", turns: [response] } }), /Chlorophyll absorbs sunlight/);
  await assert.rejects(exportFile({ kind: "notes", format: "csv", notes }), /cannot be exported as CSV/);
});

test("OpenRouter-compatible embedding retrieval, grounded chat verification, starter questions and all note styles", async () => {
  let embeddingsAvailable = true, supported = true, invalidCitation = false, noteCalls = 0, embedSizes: number[] = [];
  const server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/embeddings") {
      embedSizes.push(input.input.length);
      if (!embeddingsAvailable) { res.writeHead(404); res.end("{}"); return; }
      res.end(JSON.stringify({ data: input.input.map((text: string, index: number) => ({ index,
        embedding: /chlorophyll/i.test(text) ? [1, 0] : [0, 1] })) })); return;
    }
    const name = input.response_format.json_schema.name, prompt = String(input.messages[1].content);
    let value: unknown;
    if (name === "education_support_check") value = { found: supported };
    else if (name === "education_chat") {
      value = invalidCitation ? { ...response, citations: [{ pageNumber: 700, quote: "Not present in the source." }] } : response;
    } else if (name === "education_starters") value = {
      questions: ["Which pigment absorbs light?", "What is velocity?", "What do plants release?"],
      citations: [response.citations[0], { pageNumber: 27, quote: "Velocity is displacement divided by time." }, { pageNumber: 12, quote: "Plants release oxygen." }],
    };
    else {
      noteCalls++;
      const style = /style field must be\n"([^"]+)"/.exec(prompt)![1];
      const source = prompt.split("SOURCE:\n")[1]!;
      const sourcePages = [...new Set([...source.matchAll(/\[Source page: (\d+)\]/g)].map(match => Number(match[1])))];
      value = { title: "Physics", style, sections: [{ id: "provider-id", heading: "Velocity", body: "**Velocity** is displacement divided by time.", sourcePages }], takeaways: ["Velocity relates displacement and time."] };
    }
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const keys = ["EDUCATION_AI_PROVIDER", "EDUCATION_AI_BASE_URL", "EDUCATION_AI_MODEL", "OPENROUTER_API_KEY", "EDUCATION_EMBEDDING_MODEL"] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.EDUCATION_AI_PROVIDER = "openrouter"; process.env.EDUCATION_AI_MODEL = "openai/gpt-5-mini";
    process.env.EDUCATION_AI_BASE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    process.env.OPENROUTER_API_KEY = "education-unit-test-fixture"; delete process.env.EDUCATION_EMBEDDING_MODEL;
    const first = await retrievePdf(pages, "chlorophyll", Date.now() + 60_000);
    assert.equal(first.method, "embeddings"); assert.equal(first.passages[0]!.pageNumber, 12);
    await retrievePdf(pages, "velocity", Date.now() + 60_000);
    assert.deepEqual(embedSizes, [3, 1]); // Cached numeric vectors, not document text.
    const answer = await askPdf({ pages, question: response.question, language: "english" });
    assert.equal(answer.found, true); assert.equal(answer.citations[0]!.pageNumber, 12);
    supported = false;
    const refused = await askPdf({ pages, question: response.question, language: "bangla" });
    assert.equal(refused.found, false); assert.deepEqual(refused.citations, []); assert.match(refused.answer, /উত্তর পাওয়া যায়নি/);
    invalidCitation = true;
    await assert.rejects(askPdf({ pages, question: response.question, language: "english" }), /valid study material/);
    invalidCitation = false; embeddingsAvailable = false;
    assert.equal((await retrievePdf(pages, "chlorophyll", Date.now() + 60_000)).method, "bm25");
    assert.equal((await starterQuestions({ pages, language: "english" })).questions.length, 3);
    for (const style of ["detailed", "summary", "bullets", "cornell", "mind-map"] as const) {
      const result = await makeNotes({ pages, language: "english", style });
      assert.equal(result.style, style); assert.ok(result.sections.some(section => section.body.includes("v = s / t")));
      assert.ok(result.sections.every(section => section.sourcePages.every(page => page === 12 || page === 27)));
    }
    const before = noteCalls;
    const long = await makeNotes({ pages: [{ pageNumber: 12, text: pages[0]!.text.repeat(300) }], language: "english", style: "detailed" });
    assert.ok(noteCalls - before > 1); assert.ok(long.sections.length > 1); assert.equal(new Set(long.sections.map(section => section.id)).size, long.sections.length);
  } finally {
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
