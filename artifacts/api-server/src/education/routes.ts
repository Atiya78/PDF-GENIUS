import express, { type Request, type Response } from "express";
import multer from "multer";
import {
  ExtractEducationPdfBody, GenerateEducationQuizBody, GenerateEducationFlashcardsBody,
  ExportEducationBody, RecordEducationEventBody,
  GetEducationHistoryParams, DeleteEducationHistoryParams,
  AskEducationPdfBody, GenerateEducationNotesBody, GenerateEducationStartersBody,
} from "@workspace/api-zod";
import { educationConfig, EducationError } from "./config";
import { extractPdf, validateSource } from "./source";
import { assertAiReady, generateQuiz, generateFlashcards } from "./ai";
import { exportFile, exportDisposition, loadBengaliFont } from "./exports";
import { reserveEducationAccess, throttle } from "./limits";
import { authenticateUser } from "../auth";
import { pool } from "@workspace/db";
import { beginEducationRequest, ensureEducationHistory, purgeEducationHistory } from "./history";
import { logger } from "../lib/logger";
import { askPdf, makeNotes, starterQuestions } from "./study";
import type { EducationKind } from "./history";

export const educationApp = express();
// Scope trusted-proxy behavior to Education; do not change existing endpoints.
educationApp.set("trust proxy", 1);
educationApp.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
educationApp.use(express.json({ limit: "3mb" }));
educationApp.use((req, res, next) => {
  if (req.headers.authorization) void authenticateUser(req, res, next);
  else next();
});
const historySweep = setInterval(() => {
  void purgeEducationHistory().catch(() => { logger.warn("Education history retention cleanup failed"); });
}, 60_000);
historySweep.unref();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: educationConfig.maxFileBytes, files: 1, fields: 1, fieldSize: 100, parts: 2 },
});
let extractions = 0, generations = 0, exports = 0;

function respondError(res: Response, error: unknown) {
  if (error instanceof multer.MulterError)
    return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "File too large. Upload a PDF up to 20 MB." : "Upload one PDF and an optional page range." });
  const known = error instanceof EducationError;
  if (known && error.status === 429) res.setHeader("Retry-After", "3600");
  return res.status(known ? error.status : 503).json({
    error: known ? error.message : "The study service is busy. Please try again.",
    ...(known && error.ocrUrl ? { ocrUrl: error.ocrUrl } : {}),
  });
}

educationApp.post("/extract", (req, res) => {
  try {
    throttle(req, "extract", 20);
    if (extractions >= educationConfig.maxConcurrentExtractions) throw new EducationError("PDF reading is busy. Please try again shortly.", 503);
  } catch (error) { respondError(res, error); return; }
  // Reserve BEFORE reading the multipart body to bound large-buffer memory.
  extractions++;
  upload.single("file")(req, res, async error => {
    try {
      if (error) throw error;
      if (!req.file) throw new EducationError("Please upload a PDF.");
      if (!/\.pdf$/i.test(req.file.originalname)) throw new EducationError("Wrong file type. Please upload a PDF file.");
      const input = ExtractEducationPdfBody.omit({ file: true }).safeParse(req.body);
      if (!input.success) throw new EducationError("Please enter a valid page range.");
      res.json(await extractPdf(req.file.buffer, input.data.pageRange));
    } catch (failure) { respondError(res, failure); }
    finally {
      req.file?.buffer.fill(0); req.file = undefined; req.body = undefined;
      extractions--;
    }
  });
});

async function generate(req: Request, res: Response, kind: EducationKind) {
  let refund: (() => Promise<void>) | undefined, reserved = false;
  let cancel: (() => Promise<void>) | undefined;
  try {
    throttle(req, "generation-attempts", 20);
    const schema = { quiz: GenerateEducationQuizBody, flashcards: GenerateEducationFlashcardsBody,
      chat: AskEducationPdfBody, notes: GenerateEducationNotesBody }[kind];
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new EducationError("Choose valid options and upload a PDF or paste readable text.");
    validateSource(parsed.data.pages);
    assertAiReady();
    const { requestId, ...content } = parsed.data;
    const request = await beginEducationRequest(req, kind, content, requestId);
    if (request.cached) { res.json(request.cached); return; }
    cancel = request.cancel;
    if (generations >= educationConfig.maxConcurrentGenerations) throw new EducationError("AI is busy. Please try again shortly.", 503);
    generations++; reserved = true;
    const access = await reserveEducationAccess(req);
    refund = access.refund;
    const result = kind === "quiz" ? await generateQuiz(GenerateEducationQuizBody.parse(parsed.data))
      : kind === "flashcards" ? await generateFlashcards(GenerateEducationFlashcardsBody.parse(parsed.data))
      : kind === "chat" ? await askPdf(AskEducationPdfBody.parse(parsed.data))
      : await makeNotes(GenerateEducationNotesBody.parse(parsed.data));
    const useful = kind !== "chat" || !("found" in result) || result.found;
    if (!useful) { await refund(); refund = undefined; }
    await request.complete!(result, access.chargeCredit && useful);
    refund = undefined; cancel = undefined;
    res.json(result);
  } catch (error) {
    if (cancel) await cancel().catch(() => { req.log.warn("Education request cleanup failed"); });
    if (refund) {
      try { await refund(); } catch { req.log.warn("Education quota refund failed"); }
    }
    respondError(res, error);
  } finally {
    req.body = undefined; // No PDF bytes or extracted text enters persistent storage.
    if (reserved) generations--;
  }
}
educationApp.post("/quiz", (req, res) => generate(req, res, "quiz"));
educationApp.post("/flashcards", (req, res) => generate(req, res, "flashcards"));
educationApp.post("/ask-pdf", (req, res) => generate(req, res, "chat"));
educationApp.post("/notes", (req, res) => generate(req, res, "notes"));
educationApp.post("/ask-pdf/starters", async (req, res) => {
  let reserved = false;
  try {
    throttle(req, "starters", 8);
    const input = GenerateEducationStartersBody.safeParse(req.body);
    if (!input.success) throw new EducationError("Upload a PDF and select a language.");
    if (generations >= educationConfig.maxConcurrentGenerations) throw new EducationError("AI is busy. Please retry shortly.", 503);
    generations++; reserved = true;
    res.json(await starterQuestions(input.data));
  } catch (error) { respondError(res, error); }
  finally { req.body = undefined; if (reserved) generations--; }
});
educationApp.get("/font", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.type("font/ttf").send(Buffer.from(await loadBengaliFont(), "base64"));
  } catch (error) { respondError(res, error); }
});
educationApp.get("/history", async (req, res) => {
  try {
    if (!req.user) throw new EducationError("Please sign in to see your saved study results.", 401);
    throttle(req, "history", 120);
    await ensureEducationHistory();
    const rows = await pool.query(`SELECT id,kind,result->>'title' AS title,created_at AS "createdAt"
      FROM education_generation_requests WHERE user_id=$1 AND status='succeeded' AND result IS NOT NULL
      AND created_at > now() - interval '24 hours' ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
    res.json(rows.rows);
  } catch (error) { respondError(res, error); }
});
educationApp.get("/history/:id", async (req, res) => {
  try {
    if (!req.user) throw new EducationError("Please sign in to open a saved study result.", 401);
    const id = GetEducationHistoryParams.safeParse(req.params);
    if (!id.success) throw new EducationError("Invalid saved result.", 400);
    throttle(req, "history", 120);
    await ensureEducationHistory();
    const row = (await pool.query(`SELECT id,kind,result,created_at AS "createdAt"
      FROM education_generation_requests WHERE id=$1 AND user_id=$2 AND status='succeeded'
      AND result IS NOT NULL AND created_at > now() - interval '24 hours'`, [id.data.id, req.user.id])).rows[0];
    if (!row) throw new EducationError("This saved result is missing or expired.", 404);
    const key = { quiz: "quiz", flashcards: "deck", chat: "chat", notes: "notes" }[row.kind as EducationKind];
    res.json({ id: row.id, kind: row.kind, title: row.result.title, createdAt: row.createdAt, [key]: row.result });
  } catch (error) { respondError(res, error); }
});
educationApp.delete("/history/:id", async (req, res) => {
  try {
    if (!req.user) throw new EducationError("Please sign in to delete a saved study result.", 401);
    const id = DeleteEducationHistoryParams.safeParse(req.params);
    if (!id.success) throw new EducationError("Invalid saved result.", 400);
    throttle(req, "history", 120);
    await ensureEducationHistory();
    // Keep the replay tombstone until expiry, but remove the generated content.
    await pool.query("UPDATE education_generation_requests SET result=NULL WHERE id=$1 AND user_id=$2 AND status='succeeded'", [id.data.id, req.user.id]);
    res.sendStatus(204);
  } catch (error) { respondError(res, error); }
});
educationApp.post("/export", async (req, res) => {
  let reserved = false;
  try {
    throttle(req, "export", 60);
    const parsed = ExportEducationBody.safeParse(req.body);
    if (!parsed.success) throw new EducationError("Please review your study material before exporting.");
    if (exports >= 2) throw new EducationError("Exports are busy. Try again shortly.", 503);
    exports++; reserved = true;
    const output = await exportFile(parsed.data);
    const title = parsed.data.kind === "cards" ? parsed.data.deck!.title : parsed.data.kind === "chat"
      ? parsed.data.chat!.title : parsed.data.kind === "notes" ? parsed.data.notes!.title : parsed.data.quiz!.title;
    res.type(output.mime).setHeader("Content-Disposition", exportDisposition(title, output.extension));
    res.send(output.buffer);
  } catch (error) { respondError(res, error); }
  finally { req.body = undefined; if (reserved) exports--; }
});
educationApp.post("/events", (req, res) => {
  try {
    throttle(req, "events", 120);
    const parsed = RecordEducationEventBody.safeParse(req.body);
    if (!parsed.success) throw new EducationError("Invalid activity event.");
    req.log.info(parsed.data, "Education activity");
    res.sendStatus(204);
  } catch (error) { respondError(res, error); }
  finally { req.body = undefined; }
});
educationApp.use((error: { type?: string }, _req: Request, res: Response, _next: express.NextFunction) => {
  res.status(error.type === "entity.too.large" ? 413 : 400).json({
    error: error.type === "entity.too.large" ? "Study text is too large. Choose a smaller page range." : "Invalid study request.",
  });
});