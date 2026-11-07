import { createHmac, timingSafeEqual } from "node:crypto";
import { pool } from "@workspace/db";
import { EducationError } from "../config";
import { addMonths, catalog, priceInfo } from "./catalog";
import { billingTransaction, ensureEducationBilling, lockAccount, refreshMonthlyGrants } from "./store";
import { customPriceInfo } from "./custom-topups";

export function billingEnabled() {
  return Boolean(process.env.PADDLE_API_KEY && (process.env.PADDLE_WEBHOOK_SECRET || process.env.PADDLE_NOTIFICATION_ID));
}
let webhookSecretCache: { id: string; secret: string; until: number } | undefined;
export async function paddleWebhookSecret() {
  if (process.env.PADDLE_WEBHOOK_SECRET) return process.env.PADDLE_WEBHOOK_SECRET;
  const id = process.env.PADDLE_NOTIFICATION_ID;
  if (!id || !/^ntfset_[a-z0-9]{26}$/.test(id)) throw new EducationError("Education webhook verification is not configured.", 503);
  if (webhookSecretCache?.id === id && webhookSecretCache.until > Date.now()) return webhookSecretCache.secret;
  // Paddle exposes the signing key to authenticated server applications. Keep
  // it in server memory only; never send it to a client, file, or application log.
  const notification = await paddle(`/notification-settings/${id}`);
  if (!notification.active || notification.type !== "url" ||
      !new URL(notification.destination).pathname.endsWith("/api/education/billing/paddle/webhook") ||
      typeof notification.endpoint_secret_key !== "string")
    throw new EducationError("The Education webhook destination is not configured correctly.", 503);
  webhookSecretCache = { id, secret: notification.endpoint_secret_key, until: Date.now() + 5 * 60_000 };
  return webhookSecretCache.secret;
}
export async function paddle<T = any>(path: string, body?: object): Promise<T> {
  if (!process.env.PADDLE_API_KEY) throw new EducationError("Education checkout is not configured. Please contact support.", 503);
  const base = process.env.PADDLE_ENVIRONMENT === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}`, "Content-Type": "application/json", "Paddle-Version": "1" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json() as { data: T };
  if (!response.ok) throw new EducationError(response.status === 429 ? "Paddle is busy. Please try again shortly." : "Education billing could not reach Paddle. Please try again or contact support.", 503);
  return result.data as T;
}
export function verifyPaddleSignature(raw: Buffer, signature: string, secret: string, now = Date.now()) {
  const parts = signature.split(";").map(p => p.trim().split("="));
  const ts = parts.find(([key]) => key === "ts")?.[1];
  if (!ts || !/^\d+$/.test(ts) || Math.abs(now / 1000 - Number(ts)) > 5) return false;
  const expected = createHmac("sha256", secret).update(`${ts}:`).update(raw).digest();
  return parts.filter(([key]) => key === "h1").some(([, hash]) => {
    if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return false;
    return timingSafeEqual(expected, Buffer.from(hash, "hex"));
  });
}
function transactionPrice(transaction: any) {
  if (!Array.isArray(transaction.items) || transaction.items.length !== 1) return undefined;
  const item = transaction.items[0];
  const info = priceInfo(item.price?.id);
  if (!info || item.quantity !== 1 || item.price?.product_id !== info.productId ||
    item.price?.unit_price?.currency_code !== "USD" || item.price?.unit_price?.amount !== String(info.amount)) return undefined;
  return info;
}

// Always re-fetch the actual transaction. Neither redirects nor custom_data
// nor an unverified price/credit count can grant access or mint credits.
export async function fulfillTransaction(transactionId: string) {
  const transaction = await paddle(`/transactions/${encodeURIComponent(transactionId)}?include=adjustments`);
  if (transaction.status !== "completed") return transaction.status === "canceled" ? "canceled" : "pending";
  let info = transactionPrice(transaction);
  // A non-catalog price is legitimate only for our saved custom top-up order.
  // Never accept a credit amount from provider/client metadata.
  if (!info && !priceInfo(transaction.items?.[0]?.price?.id)) {
    await ensureEducationBilling();
    const owned = (await pool.query("SELECT * FROM education_billing_checkouts WHERE transaction_id=$1", [transactionId])).rows[0];
    info = customPriceInfo(transaction, owned);
  }
  if (!info) throw new EducationError("The Paddle transaction does not match the Education catalog. Contact support.", 409);
  const subtotal = Number(transaction.details?.totals?.subtotal);
  const total = Number(transaction.details?.totals?.total);
  if (transaction.currency_code !== "USD" || !Number.isFinite(subtotal) || !Number.isFinite(total) || subtotal <= 0 || total <= 0)
    throw new EducationError("This Education payment is not settled correctly. Contact support.", 409);
  const subscription = info.kind === "plan" && transaction.subscription_id
    ? await paddle(`/subscriptions/${encodeURIComponent(transaction.subscription_id)}`) : null;
  if (info.kind === "plan" && !subscription) throw new EducationError("Paddle is still finalizing your Education subscription. Please retry shortly.", 503);
  return billingTransaction(async client => {
    const checkout = (await client.query("SELECT * FROM education_billing_checkouts WHERE transaction_id=$1", [transactionId])).rows[0];
    const tracked = subscription ? (await client.query("SELECT user_id FROM education_billing_accounts WHERE subscription_id=$1", [subscription.id])).rows[0] : null;
    const userId = checkout?.user_id ?? tracked?.user_id;
    if (!userId) throw new EducationError("This payment is not associated with an Education checkout.", 409);
    const account = await lockAccount(client, userId);
    // The authenticated server checkout fixes the exact expected item.
    if (checkout && (checkout.price_id !== transaction.items[0].price.id || checkout.expected_amount !== info.amount))
      throw new EducationError("This payment does not match the requested Education purchase.", 409);
    const settled = await client.query(`INSERT INTO education_billing_settlements(transaction_id,user_id)
      VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING transaction_id`, [transactionId, userId]);
    if (!settled.rowCount || checkout?.status === "completed") return "completed";
    const refunds = (transaction.adjustments ?? []).filter((adjustment: any) => adjustment.action === "refund" && adjustment.status === "approved");
    const refunded = refunds.reduce((sum: number, adjustment: any) => sum + Math.abs(Number(adjustment.totals?.total ?? 0)), 0);
    const fractionRefunded = Math.min(1, refunded / total);
    for (const adjustment of refunds) await client.query(`INSERT INTO education_billing_refunds(id,transaction_id)
      VALUES($1,$2) ON CONFLICT DO NOTHING`, [adjustment.id, transactionId]);
    if (info.kind === "pack") {
      if (!checkout) throw new EducationError("Unknown Education credit purchase.", 409);
      const paidAt = new Date(transaction.billed_at ?? transaction.updated_at);
      if (!Number.isFinite(paidAt.getTime())) throw new EducationError("Paddle supplied an invalid payment date.", 503);
      await client.query(`INSERT INTO education_credit_lots(id,user_id,kind,credits,remaining,expires_at)
        VALUES($1,$2,'purchase',$3,$3,$4) ON CONFLICT DO NOTHING`,
        [`purchase:${transaction.id}`, userId, Math.max(0, info.credits - Math.ceil(info.credits * fractionRefunded)), addMonths(paidAt, 12)]);
    } else {
      const recurring = subscription.items?.find((item: any) => priceInfo(item.price?.id)?.kind === "plan");
      const current = priceInfo(recurring?.price?.id);
      if (!current || current.kind !== "plan" || subscription.customer_id !== transaction.customer_id)
        throw new EducationError("Paddle subscription details do not match this Education payment.", 409);
      // Do not grant a newly upgraded tier from a stale/old transaction.
      if (current.id !== info.id || current.period !== info.period)
        throw new EducationError("Your Education subscription changed while this payment was processing. Contact support.", 409);
      if (account.subscription_id && account.subscription_id !== subscription.id && account.status !== "canceled")
        throw new EducationError("An Education subscription already exists for this account.", 409);
      const period = subscription.current_billing_period;
      const paidPeriod = transaction.billing_period ?? period;
      if (!period?.starts_at || !period?.ends_at || !paidPeriod?.ends_at) throw new EducationError("Paddle billing dates are not ready. Please retry shortly.", 503);
      const paidUntil = new Date(Math.min(new Date(period.ends_at).getTime(), new Date(paidPeriod.ends_at).getTime()));
      if (!Number.isFinite(paidUntil.getTime())) throw new EducationError("Paddle billing dates are invalid.", 503);
      // An out-of-order renewal receipt must not shorten access already backed
      // by a newer settled payment.
      if (!account.paid_until || paidUntil >= account.paid_until) await client.query(`UPDATE education_billing_accounts SET tier=$2,status=$3,customer_id=$4,subscription_id=$5,
        billing_period=$6,period_start=$7,period_end=$8,paid_until=$9,grant_anchor=$7,checkout_pending_until=NULL WHERE user_id=$1`,
        [userId, current.id, subscription.status, subscription.customer_id, subscription.id, current.period,
          period.starts_at, period.ends_at, fractionRefunded >= 1 ? new Date(0) : paidUntil]);
      const updated = await lockAccount(client, userId);
      await refreshMonthlyGrants(client, updated);
    }
    if (checkout) await client.query("UPDATE education_billing_checkouts SET status='completed' WHERE transaction_id=$1", [transactionId]);
    return "completed";
  });
}

export async function handlePaddleEvent(event: any) {
  if (!event?.event_id || !event?.event_type || !event?.data?.id || !event?.occurred_at)
    throw new EducationError("Invalid Paddle event.", 400);
  if (event.event_type === "transaction.completed") {
    // Duplicate-safe even across distinct event IDs and checkout polling.
    // This account may contain unrelated products in the future. Do not turn
    // those notifications into endless retries or grant Education access.
    const transaction = await paddle(`/transactions/${encodeURIComponent(event.data.id)}`);
    const owned = transactionPrice(transaction) ? null :
      (await pool.query("SELECT kind FROM education_billing_checkouts WHERE transaction_id=$1", [event.data.id])).rows[0];
    if (transactionPrice(transaction) || owned?.kind === "custom") await fulfillTransaction(event.data.id);
  } else if (event.event_type.startsWith("subscription.")) {
    // Read CURRENT Paddle state so delayed cancel/past_due events cannot revoke
    // a resumed subscription. Lifecycle events alone never grant a paid tier.
    const subscription = await paddle(`/subscriptions/${encodeURIComponent(event.data.id)}`);
    await billingTransaction(async client => {
      const row = (await client.query("SELECT user_id FROM education_billing_accounts WHERE subscription_id=$1", [subscription.id])).rows[0];
      if (!row) return; // Payment webhook will establish ownership first.
      const account = await lockAccount(client, row.user_id);
      if (account.subscription_id !== subscription.id) return;
      if (account.last_event_at && account.last_event_at > new Date(event.occurred_at)) return;
      // The first settled transaction sets paid_until; an active status alone
      // must never extend access past that already-paid interval.
      await client.query("UPDATE education_billing_accounts SET status=$2,last_event_at=$3 WHERE user_id=$1",
        [row.user_id, subscription.status, event.occurred_at]);
    });
  } else if (event.event_type === "adjustment.updated" || event.event_type === "adjustment.created") {
    const adjustment = await paddle(`/adjustments/${encodeURIComponent(event.data.id)}`);
    if (adjustment.action === "refund" && adjustment.status === "approved") {
      const transaction = await paddle(`/transactions/${encodeURIComponent(adjustment.transaction_id)}`);
      await billingTransaction(async client => {
        const checkout = (await client.query(`SELECT user_id FROM education_billing_checkouts WHERE transaction_id=$1
          UNION SELECT user_id FROM education_billing_accounts WHERE subscription_id=$2 LIMIT 1`,
          [adjustment.transaction_id, transaction.subscription_id ?? null])).rows[0];
        if (!checkout) return;
        await lockAccount(client, checkout.user_id);
        const inserted = await client.query("INSERT INTO education_billing_refunds(id,transaction_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id",
          [adjustment.id, adjustment.transaction_id]);
        if (!inserted.rowCount) return;
        const refundAmount = Math.abs(Number(adjustment.totals?.total)), paidAmount = Number(transaction.details?.totals?.total);
        if (!Number.isFinite(refundAmount) || !Number.isFinite(paidAmount) || refundAmount <= 0 || paidAmount <= 0)
          throw new EducationError("Paddle refund totals are not ready. Please retry.", 503);
        const fraction = Math.min(1, refundAmount / paidAmount);
        const ownedOrder = (await client.query("SELECT * FROM education_billing_checkouts WHERE transaction_id=$1",
          [adjustment.transaction_id])).rows[0];
        const info = transactionPrice(transaction) ?? customPriceInfo(transaction, ownedOrder);
        if (info?.kind === "pack") {
          await client.query("UPDATE education_credit_lots SET remaining=GREATEST(0,remaining-$2) WHERE id=$1",
            [`purchase:${adjustment.transaction_id}`, Math.ceil(info.credits * fraction)]);
        }
        // A partial subscription refund does not silently cancel the whole
        // subscription. A full refund revokes this paid interval only.
        if (transaction.subscription_id && fraction >= 1 && transaction.billing_period?.ends_at) {
          await client.query(`UPDATE education_billing_accounts SET paid_until=LEAST(paid_until,now())
            WHERE user_id=$1 AND subscription_id=$2 AND paid_until<=$3`,
            [checkout.user_id, transaction.subscription_id, transaction.billing_period.ends_at]);
          await client.query("UPDATE education_credit_lots SET remaining=0 WHERE user_id=$1 AND id LIKE $2 AND expires_at=$3",
            [checkout.user_id, `subscription:${transaction.subscription_id}:%`, transaction.billing_period.ends_at]);
        }
      });
    }
  }
  await pool.query("INSERT INTO education_billing_events(id,occurred_at) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [event.event_id, event.occurred_at]);
}
