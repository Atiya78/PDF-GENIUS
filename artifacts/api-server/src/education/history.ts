import { createHash, createHmac, randomUUID } from "node:crypto";
import type { Request } from "express";
import { pool } from "@workspace/db";
import type { EducationQuiz, EducationDeck, EducationChatAnswer, EducationNotes, EducationTranslation, EducationExamPaper } from "@workspace/api-zod";
import { EducationError } from "./config";

type Result = EducationQuiz | EducationDeck | EducationChatAnswer | EducationNotes | EducationTranslation | EducationExamPaper;
export type EducationKind = "quiz" | "flashcards" | "chat" | "notes" | "translation" | "exam" | "summary" | "mindmap";
let ready: Promise<unknown> | undefined;
export function ensureEducationHistory() {
  return ready ??= pool.query(`CREATE TABLE IF NOT EXISTS education_generation_requests (
    id uuid NOT NULL UNIQUE,
    identity_hash text NOT NULL,
    request_key uuid NOT NULL,
    request_hash text NOT NULL,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('quiz','flashcards','chat','notes','translation','exam','summary','mindmap')),
    status text NOT NULL CHECK (status IN ('processing','succeeded')),
    result jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (identity_hash, request_key)
  )`).then(() => pool.query(`ALTER TABLE education_generation_requests
    DROP CONSTRAINT IF EXISTS education_generation_requests_kind_check,
    ADD CONSTRAINT education_generation_requests_kind_check CHECK (kind IN ('quiz','flashcards','chat','notes','translation','exam','summary','mindmap'))`))
    .then(() => pool.query(`CREATE INDEX IF NOT EXISTS education_results_user_created
    ON education_generation_requests (user_id, created_at DESC)`))
    .catch(error => { ready = undefined; throw error; });
}

export async function purgeEducationHistory() {
  for (const [key, value] of completed) if (value.expires < Date.now()) completed.delete(key);
  await ensureEducationHistory();
  await pool.query(`DELETE FROM education_generation_requests
    WHERE created_at < now() - interval '24 hours'
    OR (status = 'processing' AND created_at < now() - interval '1 hour')`);
}

const completed = new Map<string, { result: Result; expires: number; bytes: number }>();
export async function beginEducationRequest(req: Request, kind: EducationKind, input: object, requestId?: string) {
  await ensureEducationHistory();
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new EducationError("Education tools are temporarily unavailable.", 503);
  const identity = createHmac("sha256", secret).update(`education:${req.user?.id ?? req.ip}`).digest("hex");
  const digest = createHash("sha256").update(JSON.stringify({ kind, input })).digest("hex");
  // Legacy callers without an explicit UUID still cannot double-charge the
  // same input. A fresh UUID deliberately requests a new generation.
  const requestKey = requestId ?? `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20, 32)}`;
  const cacheKey = `${identity}:${requestKey}`;
  for (const [key, value] of completed) if (value.expires < Date.now()) completed.delete(key);
  const id = randomUUID();
  const inserted = await pool.query(`INSERT INTO education_generation_requests
    (id, identity_hash, request_key, request_hash, user_id, kind, status)
    VALUES ($1,$2,$3,$4,$5,$6,'processing') ON CONFLICT DO NOTHING RETURNING id`,
    [id, identity, requestKey, digest, req.user?.id ?? null, kind]);
  if (!inserted.rowCount) {
    const previous = (await pool.query(`SELECT request_hash, status, result
      FROM education_generation_requests WHERE identity_hash=$1 AND request_key=$2`, [identity, requestKey])).rows[0];
    if (!previous || previous.request_hash !== digest)
      throw new EducationError("This request ID was already used with different options. Start a new generation.", 409);
    if (previous.status === "processing")
      throw new EducationError("This generation is already processing. Wait before retrying; you won't be charged twice.", 409);
    const result = previous.result ?? completed.get(cacheKey)?.result;
    if (!result) throw new EducationError("This request already completed. Its in-session result expired; start a new generation.", 409);
    return { cached: result as Result };
  }
  return {
    cached: undefined,
    cancel: async () => {
      await pool.query("DELETE FROM education_generation_requests WHERE id=$1 AND status='processing'", [id]);
    },
    complete: async (result: Result, chargeCredit: boolean) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Lock the request first: a duplicate completion can never spend twice.
        const request = await client.query("SELECT status FROM education_generation_requests WHERE id=$1 FOR UPDATE", [id]);
        if (request.rows[0]?.status !== "processing") throw new EducationError("This request has already been completed.", 409);
        if (chargeCredit) {
          if (!req.user) throw new EducationError("Please sign in to use credits.", 401);
          const charged = await client.query("UPDATE users SET credits=credits-1 WHERE id=$1 AND credits>=1 RETURNING credits", [req.user.id]);
          if (!charged.rowCount) throw new EducationError("You have no credits left. Add credits or return tomorrow.", 402);
        }
        // Generated study material only; never PDF bytes, extracted text, or prompts.
        await client.query(`UPDATE education_generation_requests SET status='succeeded', result=$2, created_at=now() WHERE id=$1`,
          [id, req.user ? JSON.stringify(result) : null]);
        await client.query("COMMIT");
        // Guests have only a bounded, short-lived replay cache, not server history.
        if (!req.user) {
          const bytes = Buffer.byteLength(JSON.stringify(result));
          while (completed.size && (completed.size >= 20 || [...completed.values()].reduce((sum, value) => sum + value.bytes, 0) + bytes > 8 * 1024 * 1024))
            completed.delete(completed.keys().next().value!);
          completed.set(cacheKey, { result, bytes, expires: Date.now() + 10 * 60_000 });
        }
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally { client.release(); }
    },
  };
}
