import { pool } from "@workspace/db";
import { deleteAvatar } from "./avatarStorage";
import { deleteConvertedFile } from "./conversionStorage";
import { logger } from "./logger";

/** Bump when the Terms/Privacy text changes materially; stored with each acceptance. */
export const LEGAL_VERSION = "2026-11-07";

let ready: Promise<unknown> | undefined;
/** Idempotent: the acceptance columns are nullable, so older rows stay valid. */
export function ensureLegalColumns() {
  return (ready ??= pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version text;
  `));
}

export async function recordTermsAcceptance(userId: string): Promise<void> {
  await ensureLegalColumns();
  await pool.query(
    `UPDATE users SET terms_accepted_at = now(), terms_version = $2 WHERE id = $1`,
    [userId, LEGAL_VERSION],
  );
}

export class AccountDeletionBlocked extends Error {}

/**
 * Permanently delete a user and their stored data. Active paid subscriptions block
 * deletion (they are billed by the Merchant of Record and must be cancelled there
 * first), so deleting an account can never leave a subscription charging nobody.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const { rows: [user] } = await pool.query(
    `SELECT id, email, plan, dodo_subscription_id FROM users WHERE id = $1`, [userId]);
  if (!user) throw new AccountDeletionBlocked("Account not found.");
  if (user.dodo_subscription_id && user.plan !== "free") {
    throw new AccountDeletionBlocked(
      "Your PDF Tools subscription is still active. Cancel it from Pricing → Manage Billing, then delete your account once it has ended.");
  }
  const edu = await pool.query(
    `SELECT tier, status FROM education_billing_accounts WHERE user_id = $1`, [userId]).catch(() => ({ rows: [] as any[] }));
  const acct = edu.rows[0];
  if (acct && acct.tier !== "none" && !["canceled", "none"].includes(String(acct.status))) {
    throw new AccountDeletionBlocked(
      "Your Education Zone subscription is still active. Cancel it from Education pricing → Manage Education subscription, then delete your account once it has ended.");
  }

  // Stored files first: if storage fails we stop before removing the account,
  // so nothing is orphaned without an owner to request deletion again.
  const { rows: jobs } = await pool.query(`SELECT id FROM conversion_jobs WHERE user_id = $1`, [userId]);
  for (const job of jobs) await deleteConvertedFile(job.id);
  await deleteAvatar(userId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM conversion_jobs WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM signup_verifications WHERE lower(email) = lower($1)`, [user.email]);
    // Remaining per-user tables reference users ON DELETE CASCADE.
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  logger.info({ userId }, "Account deleted at user request");
}
