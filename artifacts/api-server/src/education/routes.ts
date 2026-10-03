import express, { type Request, type Response } from "express";
import multer from "multer";
import {
  ExtractEducationPdfBody, GenerateEducationQuizBody, GenerateEducationFlashcardsBody,
  ExportEducationBody, RecordEducationEventBody,
} from "@workspace/api-zod";
import { educationConfig, EducationError } from "./config";
import { extractPdf, validateSource } from "./source";
import { assertAiReady, generateQuiz, generateFlashcards } from "./ai";
import { exportFile, exportDisposition } from "./exports";
import { reserveGeneration, throttle } from "./limits";

export const educationApp = express();
// Scope trusted-proxy behavior to Education; do not change existing endpoints.
educationApp.set("trust proxy", 1);
educationApp.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
educationApp.use(express.json({ limit: "1mb" }));
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
  return res.status(known ? error.status : 503).json({ error: known ? error.message : "The study service is busy. Please try again." });
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

async function generate(req: Request, res: Response, kind: "quiz" | "flashcards") {
  let refund: (() => Promise<void>) | undefined, reserved = false;
  try {
    throttle(req, "generation-attempts", 20);
    const schema = kind === "quiz" ? GenerateEducationQuizBody : GenerateEducationFlashcardsBody;
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new EducationError("Choose valid options and upload a PDF or paste readable text.");
    validateSource(parsed.data.pages);
    assertAiReady();
    if (generations >= educationConfig.maxConcurrentGenerations) throw new EducationError("AI is busy. Please try again shortly.", 503);
    generations++; reserved = true;
    refund = await reserveGeneration(req);
    const result = kind === "quiz"
      ? await generateQuiz(GenerateEducationQuizBody.parse(parsed.data))
      : await generateFlashcards(GenerateEducationFlashcardsBody.parse(parsed.data));
    refund = undefined;
    res.json(result);
  } catch (error) {
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
educationApp.post("/export", async (req, res) => {
  let reserved = false;
  try {
    throttle(req, "export", 60);
    const parsed = ExportEducationBody.safeParse(req.body);
    if (!parsed.success) throw new EducationError("Please review your study material before exporting.");
    if (exports >= 2) throw new EducationError("Exports are busy. Try again shortly.", 503);
    exports++; reserved = true;
    const output = await exportFile(parsed.data);
    const title = parsed.data.kind === "cards" ? parsed.data.deck!.title : parsed.data.quiz!.title;
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