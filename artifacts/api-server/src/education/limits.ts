import { createHmac, createHash } from "node:crypto";
import { pool } from "@workspace/db";
import type { Request } from "express";
import { EducationError, educationConfig } from "./config";
import { getEducationAccount, reservePaidUsage, type EducationCharge } from "./billing/store";
import { usagePrice } from "./billing/catalog";

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
  const identity = createHmac("sha256", secret).update(`education:${req.user?.id ?? req.ip}`).digest("hex");
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

export async function reserveEducationAccess(req: Request, options: {
  kind?: string; pages?: unknown[]; questions?: number; regeneration?: boolean;
} = {}): Promise<{ refund: () => Promise<void>; chargeCredit: false | EducationCharge; priority: number }> {
  const kind = options.kind ?? "other";
  const pages = options.pages ?? [];
  const tier = req.user ? (await getEducationAccount(req.user.id)).tier : "none";
  const price = usagePrice(tier, kind, pages.length, options.questions ?? 0, options.regeneration);
  // Premium tools follow their own Education prices and included allowances.
  // General-site plans and the Dodo/mobile wallet never grant these benefits.
  if (kind === "quiz" || kind === "exam") {
    if (!req.user) throw new EducationError("Please sign in and choose Education credits or an Education subscription to use this tool.", 402);
    const access = await reservePaidUsage(req.user.id, kind, pages, options.questions ?? 0,
      createHash("sha256").update(JSON.stringify(pages)).digest("hex"), options.regeneration);
    return { refund: access.refund, chargeCredit: access.charge, priority: access.priority };
  }
  try {
    return { refund: await reserveGeneration(req), chargeCredit: false, priority: price.priority };
  } catch (error) {
    if (!(error instanceof EducationError) || error.status !== 429 || !req.user) throw error;
    const access = await reservePaidUsage(req.user.id, kind, pages, options.questions ?? 0,
      createHash("sha256").update(JSON.stringify(pages)).digest("hex"));
    return { refund: access.refund, chargeCredit: access.charge, priority: access.priority };
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