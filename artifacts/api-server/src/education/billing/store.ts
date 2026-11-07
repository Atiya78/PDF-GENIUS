import { pool } from "@workspace/db";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { EducationError } from "../config";
import { addMonths, planFor, usagePrice, type Tier } from "./catalog";
type PoolClient = Pick<typeof pool, "query">;

type Account = {
  user_id: string; tier: Tier; status: string; customer_id: string | null; subscription_id: string | null;
  billing_period: "month" | "year" | null; period_start: Date | null; period_end: Date | null;
  paid_until: Date | null; grant_anchor: Date | null; last_event_at: Date | null;
};
let ready: Promise<unknown> | undefined;
export function ensureEducationBilling() {
  return ready ??= pool.query(`
    CREATE TABLE IF NOT EXISTS education_billing_accounts (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      tier text NOT NULL DEFAULT 'none', status text NOT NULL DEFAULT 'none',
      customer_id text, subscription_id text UNIQUE, billing_period text,
      period_start timestamptz, period_end timestamptz, paid_until timestamptz, grant_anchor timestamptz,
      last_event_at timestamptz, checkout_pending_until timestamptz
    );
    CREATE TABLE IF NOT EXISTS education_credit_lots (
      id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind text NOT NULL CHECK(kind IN ('subscription','purchase')),
      credits integer NOT NULL CHECK(credits >= 0), remaining integer NOT NULL CHECK(remaining >= 0),
      expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS education_credit_lots_owner ON education_credit_lots(user_id,expires_at);
    CREATE TABLE IF NOT EXISTS education_billing_checkouts (
      transaction_id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind text NOT NULL, price_id text NOT NULL, expected_amount integer NOT NULL,
      status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE education_billing_checkouts ADD COLUMN IF NOT EXISTS expected_credits integer;
    ALTER TABLE education_billing_checkouts ADD COLUMN IF NOT EXISTS expected_product_id text;
    CREATE TABLE IF NOT EXISTS education_billing_events (
      id text PRIMARY KEY, occurred_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS education_billing_refunds (
      id text PRIMARY KEY, transaction_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS education_billing_settlements (
      transaction_id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS education_usage_holds (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind text NOT NULL, source_hash text NOT NULL, cost integer NOT NULL,
      included boolean NOT NULL, status text NOT NULL DEFAULT 'pending',
      usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS education_usage_holds_owner ON education_usage_holds(user_id,usage_date);
    CREATE INDEX IF NOT EXISTS education_usage_holds_source ON education_usage_holds(user_id,kind,source_hash,status);
    CREATE TABLE IF NOT EXISTS education_api_keys (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash text NOT NULL UNIQUE, name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz
    );
  `).catch(error => { ready = undefined; throw error; });
}

export async function billingTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureEducationBilling();
  const client = await pool.connect();
  try { await client.query("BEGIN"); const result = await fn(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { client.release(); }
}
export async function lockAccount(client: PoolClient, userId: string): Promise<Account> {
  await client.query("INSERT INTO education_billing_accounts(user_id) VALUES($1) ON CONFLICT DO NOTHING", [userId]);
  return (await client.query("SELECT * FROM education_billing_accounts WHERE user_id=$1 FOR UPDATE", [userId])).rows[0];
}
export function activeTier(account: Account, now = new Date()): Tier {
  return account.status === "active" && account.paid_until && account.period_end &&
    account.paid_until > now && account.period_end > now ? account.tier : "none";
}
export async function refreshMonthlyGrants(client: PoolClient, account: Account, now = new Date()) {
  if (activeTier(account, now) === "none" || !account.grant_anchor || !account.period_end || !account.subscription_id) return;
  // Yearly subscribers accrue monthly, even if they skip visiting the site.
  // Included credits roll over within the already-paid period, never beyond it.
  for (let month = 0; month < 12; month++) {
    const date = addMonths(account.grant_anchor, month);
    if (date > now || date >= account.period_end || date >= account.paid_until!) break;
    const credits = planFor(account.tier).monthlyCredits;
    await client.query(`INSERT INTO education_credit_lots(id,user_id,kind,credits,remaining,expires_at,created_at)
      VALUES($1,$2,'subscription',$3,$3,$4,$5) ON CONFLICT(id) DO UPDATE
      SET credits=GREATEST(education_credit_lots.credits,EXCLUDED.credits),
        remaining=education_credit_lots.remaining+GREATEST(0,EXCLUDED.credits-education_credit_lots.credits)
      WHERE education_credit_lots.credits<EXCLUDED.credits`,
      [`subscription:${account.subscription_id}:${date.toISOString()}`, account.user_id, credits,
        account.period_end < account.paid_until! ? account.period_end : account.paid_until, date]);
  }
}
async function clearStaleHolds(client: PoolClient, userId: string) {
  // Completed billing metadata is not study history: retaining its one-way
  // source fingerprint preserves the cheaper regeneration price after the
  // generated result itself has expired. No source text or PDF is retained.
  await client.query("DELETE FROM education_usage_holds WHERE user_id=$1 AND status='pending' AND created_at<now()-interval '1 hour'", [userId]);
}
async function balances(client: PoolClient, userId: string) {
  const lots = (await client.query(`SELECT remaining AS credits, expires_at AS "expiresAt",kind
    FROM education_credit_lots WHERE user_id=$1 AND remaining>0 AND expires_at>now() ORDER BY expires_at,id`, [userId])).rows;
  const held = Number((await client.query("SELECT COALESCE(sum(cost),0) AS held FROM education_usage_holds WHERE user_id=$1 AND status='pending'", [userId])).rows[0].held);
  const includedCredits = lots.filter(l => l.kind === "subscription").reduce((sum, l) => sum + l.credits, 0);
  const purchasedCredits = lots.filter(l => l.kind === "purchase").reduce((sum, l) => sum + l.credits, 0);
  return { lots, includedCredits, purchasedCredits, balance: Math.max(0, includedCredits + purchasedCredits - held) };
}
export async function getEducationAccount(userId: string) {
  return billingTransaction(async client => {
    const account = await lockAccount(client, userId);
    await refreshMonthlyGrants(client, account);
    await clearStaleHolds(client, userId);
    const tier = activeTier(account);
    const usageRows = (await client.query(`SELECT kind,count(*)::int AS used FROM education_usage_holds
      WHERE user_id=$1 AND included=true AND usage_date=(now() AT TIME ZONE 'UTC')::date GROUP BY kind`, [userId])).rows;
    const apiKeys = (await client.query(`SELECT id,name,created_at AS "createdAt",last_used_at AS "lastUsedAt"
      FROM education_api_keys WHERE user_id=$1 ORDER BY created_at DESC`, [userId])).rows;
    let nextGrantAt: Date | null = null;
    if (tier !== "none" && account.grant_anchor && account.period_end) {
      for (let n = 1; n <= 12; n++) {
        const date = addMonths(account.grant_anchor, n);
        if (date > new Date()) { if (date < account.period_end) nextGrantAt = date; break; }
      }
    }
    return { tier, status: account.status, periodEnd: account.period_end, billingPeriod: account.billing_period,
      nextGrantAt, subscriptionId: account.subscription_id, canManage: Boolean(account.customer_id && account.subscription_id),
      ...(await balances(client, userId)),
      usage: { quiz: usageRows.find(row => row.kind === "quiz")?.used ?? 0, exam: usageRows.find(row => row.kind === "exam")?.used ?? 0 },
      apiKeys };
  });
}
export async function assertUploadLimit(userId: string | undefined, totalPages: number) {
  const tier = userId ? (await getEducationAccount(userId)).tier : "none";
  const maxPages = planFor(tier).maxPages;
  if (totalPages > maxPages) throw new EducationError(`Your Education access allows PDFs up to ${maxPages} pages. Upgrade your Education plan for larger uploads.`, 403);
}

export type EducationCharge = { holdId: string; userId: string };
export async function reservePaidUsage(userId: string, kind: string, pages: unknown[], questions: number, sourceHash: string, regeneration = false) {
  return billingTransaction(async client => {
    const account = await lockAccount(client, userId);
    await refreshMonthlyGrants(client, account);
    await clearStaleHolds(client, userId);
    const tier = activeTier(account);
    // A cheaper regeneration requires an actual successful generation of this
    // source/tool, never just a client-controlled boolean.
    const prior = regeneration || kind === "quiz" ? (await client.query(`SELECT id FROM education_usage_holds
      WHERE user_id=$1 AND kind=$2 AND source_hash=$3 AND status='completed' LIMIT 1`, [userId, kind, sourceHash])).rowCount : 0;
    if (regeneration && !prior) throw new EducationError("Generate the original study material before regenerating it.", 409);
    const price = usagePrice(tier, kind, pages.length, questions, regeneration || (kind === "quiz" && Boolean(prior)));
    if (price.includedLimit) {
      const count = Number((await client.query(`SELECT count(*) AS used FROM education_usage_holds
        WHERE user_id=$1 AND kind=$2 AND included=true AND usage_date=(now() AT TIME ZONE 'UTC')::date`, [userId, kind])).rows[0].used);
      if (count >= price.includedLimit) throw new EducationError(`You've reached your Education plan's ${price.includedLimit} ${kind === "quiz" ? "quizzes" : "exam papers"} for today. Your allowance resets at midnight UTC.`, 429);
    } else {
      const wallet = await balances(client, userId);
      if (wallet.balance < price.cost) throw new EducationError(`This ${kind === "exam" ? "exam paper" : kind} needs ${price.cost} Education credits. You have ${wallet.balance}. Buy Education credits or choose an Education plan.`, 402);
    }
    const holdId = randomUUID();
    await client.query(`INSERT INTO education_usage_holds(id,user_id,kind,source_hash,cost,included)
      VALUES($1,$2,$3,$4,$5,$6)`, [holdId, userId, kind, sourceHash, price.cost, Boolean(price.includedLimit)]);
    return { charge: { holdId, userId } as EducationCharge, priority: price.priority,
      refund: async () => { await pool.query("DELETE FROM education_usage_holds WHERE id=$1 AND status='pending'", [holdId]); } };
  });
}

// Called inside the SAME transaction as the idempotent generation completion.
export async function settleEducationCharge(client: PoolClient, charge: EducationCharge) {
  await lockAccount(client, charge.userId);
  const hold = (await client.query("SELECT * FROM education_usage_holds WHERE id=$1 AND user_id=$2 FOR UPDATE", [charge.holdId, charge.userId])).rows[0];
  if (!hold || hold.status !== "pending") throw new EducationError("Your credit reservation expired. Please retry; no credits were charged.", 409);
  let left = hold.cost;
  const lots = (await client.query(`SELECT id,remaining FROM education_credit_lots
    WHERE user_id=$1 AND remaining>0 AND expires_at>now() ORDER BY expires_at,id FOR UPDATE`, [charge.userId])).rows;
  if (lots.reduce((sum, lot) => sum + lot.remaining, 0) < left) throw new EducationError("Your Education credits expired before completion. No credits were charged.", 402);
  for (const lot of lots) {
    const spent = Math.min(left, lot.remaining);
    if (spent) await client.query("UPDATE education_credit_lots SET remaining=remaining-$2 WHERE id=$1", [lot.id, spent]);
    left -= spent; if (!left) break;
  }
  await client.query("UPDATE education_usage_holds SET status='completed' WHERE id=$1", [charge.holdId]);
}
export async function createEducationKey(userId: string, name: string) {
  return billingTransaction(async client => {
    const account = await lockAccount(client, userId);
    if (activeTier(account) !== "max") throw new EducationError("Education API access requires an active Max subscription.", 403);
    const count = Number((await client.query("SELECT count(*) AS used FROM education_api_keys WHERE user_id=$1", [userId])).rows[0].used);
    if (count >= 5) throw new EducationError("Revoke an existing API key before creating another. The limit is five keys.", 400);
    const key = `edu_${randomBytes(32).toString("hex")}`, id = randomUUID();
    await client.query("INSERT INTO education_api_keys(id,user_id,key_hash,name) VALUES($1,$2,$3,$4)",
      [id, userId, createHash("sha256").update(key).digest("hex"), name]);
    return { id, key };
  });
}
export async function userForEducationKey(key: string) {
  await ensureEducationBilling();
  const row = (await pool.query(`SELECT k.id,k.user_id FROM education_api_keys k
    JOIN education_billing_accounts a ON a.user_id=k.user_id
    WHERE k.key_hash=$1 AND a.tier='max' AND a.status='active' AND a.paid_until>now() AND a.period_end>now()`,
    [createHash("sha256").update(key).digest("hex")])).rows[0];
  if (!row) throw new EducationError("Invalid API key or inactive Education Max subscription.", 401);
  await pool.query("UPDATE education_api_keys SET last_used_at=now() WHERE id=$1", [row.id]);
  return row.user_id as string;
}
