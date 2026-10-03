import { createHmac } from "node:crypto";
import { pool } from "@workspace/db";
import type { Request } from "express";
import { EducationError, educationConfig } from "./config";

let ready: Promise<unknown> | undefined;
function ensureUsageTable() {
  // Isolated, additive table; no existing tables/migrations are changed.
  // Only a keyed IP hash, UTC date and count are stored, never source content.
  return ready ??= pool.query(`CREATE TABLE IF NOT EXISTS education_daily_usage (
    identity_hash text NOT NULL, usage_date date NOT NULL, used integer NOT NULL DEFAULT 0,
    PRIMARY KEY (identity_hash, usage_date)
  )`).catch(error => { ready = undefined; throw error; });
}

export async function reserveGeneration(req: Request): Promise<() => Promise<void>> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new EducationError("Education tools are temporarily unavailable. Please try again later.", 503);
  const identity = createHmac("sha256", secret).update(`education:${req.ip}`).digest("hex");
  const day = new Date().toISOString().slice(0, 10);
  try {
    await ensureUsageTable();
    const result = await pool.query(`INSERT INTO education_daily_usage (identity_hash, usage_date, used)
      VALUES ($1, $2, 1) ON CONFLICT (identity_hash, usage_date)
      DO UPDATE SET used = education_daily_usage.used + 1
      WHERE education_daily_usage.used < $3 RETURNING used`,
      [identity, day, educationConfig.freeGenerationsPerDay]);
    if (!result.rowCount) throw new EducationError(`You've used today's ${educationConfig.freeGenerationsPerDay} free generations. Please return tomorrow (UTC).`, 429);
    // Retain counters for only the current and previous UTC day.
    void pool.query("DELETE FROM education_daily_usage WHERE usage_date < ($1::date - 1)", [day]).catch(() => {});
    return async () => {
      await pool.query("UPDATE education_daily_usage SET used = GREATEST(used - 1, 0) WHERE identity_hash = $1 AND usage_date = $2", [identity, day]);
    };
  } catch (error) {
    if (error instanceof EducationError) throw error;
    throw new EducationError("The study service is temporarily unavailable. Please try again.", 503);
  }
}

const recent = new Map<string, { count: number; until: number }>();
export function throttle(req: Request, action: string, limit: number) {
  const now = Date.now(), key = `${action}:${req.ip}`;
  if (recent.size > 10_000) {
    for (const [id, value] of recent) if (value.until < now) recent.delete(id);
    if (recent.size > 10_000) throw new EducationError("The study service is busy. Try again shortly.", 429);
  }
  const previous = recent.get(key);
  const entry = previous && previous.until > now ? previous : { count: 0, until: now + 60 * 60 * 1000 };
  if (++entry.count > limit) throw new EducationError("Too many requests. Please try again later.", 429);
  recent.set(key, entry);
}