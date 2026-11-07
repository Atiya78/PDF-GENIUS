/**
 * Dodo Payments integration — the web app's real payment gateway.
 *
 * Flow:
 *  - Upgrades (free -> paid): create a hosted Checkout Session for the plan's
 *    Dodo product and redirect the browser to `checkout_url`. The subscription
 *    is only activated once Dodo calls our webhook.
 *  - Management / cancellation / plan switches: open a Dodo Customer Portal
 *    session for the stored Dodo customer.
 *  - Fulfilment: `/api/billing/dodo/webhook` verifies the Standard-Webhooks
 *    signature (HMAC SHA256) with `DODO_PAYMENTS_WEBHOOK_KEY` and reconciles the
 *    user's plan from the subscription lifecycle events.
 *
 * The source of truth for a user's plan is the Dodo subscription state, mirrored
 * into `users.plan` by the webhook. Product ids live in env vars (not secret) so
 * the same code serves test_mode and live_mode.
 */
import DodoPayments from "dodopayments";
import { storage } from "./storage";
import { getPlan } from "./plans";
import { logger } from "./lib/logger";

/** Parsed, signature-verified webhook event (inferred from the SDK). */
export type DodoWebhookEvent = Awaited<
  ReturnType<DodoPayments["webhooks"]["unwrap"]>
>;

function getEnvironment(): "test_mode" | "live_mode" {
  return (process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode").toLowerCase() ===
    "live_mode"
    ? "live_mode"
    : "test_mode";
}

let cachedClient: DodoPayments | null = null;

export function getDodoClient(): DodoPayments {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DODO_PAYMENTS_API_KEY is not set. Add your Dodo Payments API key to enable billing.",
    );
  }
  if (!cachedClient) {
    cachedClient = new DodoPayments({
      bearerToken: apiKey,
      environment: getEnvironment(),
    });
  }
  return cachedClient;
}

// --- Pay-as-you-go credits -------------------------------------------------
//
// Credits are sold on the web as a single pay-what-you-want one-time Dodo
// product (DODO_PRODUCT_CREDITS). The customer picks any dollar amount in our
// UI; we pass it as the checkout line's `amount` (cents) and grant credits at a
// fixed rate. The grant happens only on the `payment.succeeded` webhook.
export const CREDITS_PER_USD = 100; // $1 = 100 credits (1 credit = 1¢)
export const MIN_CREDITS_USD = 5; // owner-approved minimum custom top-up
export const MAX_CREDITS_USD = 500; // sanity cap per checkout

/** The Dodo product id backing pay-as-you-go credit purchases (env-driven). */
export function getCreditsProductId(): string | undefined {
  return process.env.DODO_PRODUCT_CREDITS || undefined;
}

/** Credit purchases are usable once the api key and credits product are set. */
export function isCreditsConfigured(): boolean {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY && getCreditsProductId());
}

export type BillingPeriod = "month" | "year";

/** Map an internal plan id + billing period to its Dodo product id (env-driven). */
export function getProductIdForPlan(
  planId: string,
  period: BillingPeriod = "month",
): string | undefined {
  const map: Record<BillingPeriod, Record<string, string | undefined>> = {
    month: {
      pro: process.env.DODO_PRODUCT_PRO,
      business: process.env.DODO_PRODUCT_BUSINESS,
    },
    year: {
      pro: process.env.DODO_PRODUCT_PRO_YEARLY,
      business: process.env.DODO_PRODUCT_BUSINESS_YEARLY,
    },
  };
  return map[period]?.[planId];
}

/** Reverse lookup: a Dodo product id back to our plan id (tier, any period). */
export function getPlanForProductId(
  productId: string | undefined | null,
): string | undefined {
  if (!productId) return undefined;
  if (
    productId === process.env.DODO_PRODUCT_PRO ||
    productId === process.env.DODO_PRODUCT_PRO_YEARLY
  )
    return "pro";
  if (
    productId === process.env.DODO_PRODUCT_BUSINESS ||
    productId === process.env.DODO_PRODUCT_BUSINESS_YEARLY
  )
    return "business";
  return undefined;
}

/** Billing is usable only once an API key and at least one product id are set. */
export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.DODO_PAYMENTS_API_KEY &&
      (process.env.DODO_PRODUCT_PRO ||
        process.env.DODO_PRODUCT_BUSINESS ||
        process.env.DODO_PRODUCT_PRO_YEARLY ||
        process.env.DODO_PRODUCT_BUSINESS_YEARLY),
  );
}

// Brand the hosted Dodo checkout to match the PDF Genius web app (coral on a
// light surface). Dodo is a Merchant of Record, so the checkout itself must be
// hosted by Dodo — but every colour/font/radius is themeable, so it reads as our
// own page. Keep these tokens in sync with the web app's palette (#f7433d coral).
const BRAND_CHECKOUT_CUSTOMIZATION = {
  theme: "light" as const,
  show_on_demand_tag: false,
  theme_config: {
    radius: "10px",
    font_size: "md" as const,
    pay_button_text: "Subscribe",
    light: {
      bg_primary: "#ffffff",
      bg_secondary: "#f9fafb",
      border_primary: "#e5e7eb",
      border_secondary: "#f3f4f6",
      button_primary: "#f7433d",
      button_primary_hover: "#d93832",
      button_text_primary: "#ffffff",
      button_secondary: "#f3f4f6",
      button_secondary_hover: "#e5e7eb",
      button_text_secondary: "#111827",
      input_focus_border: "#f7433d",
      text_primary: "#111827",
      text_secondary: "#6b7280",
      text_placeholder: "#9ca3af",
      text_error: "#dc2626",
      text_success: "#16a34a",
    },
  },
};

export interface CheckoutUser {
  id: string;
  email: string;
  name: string | null;
  dodoCustomerId?: string | null;
}

/** Create a hosted checkout session for a paid plan; returns its checkout URL. */
export async function createCheckoutForPlan(opts: {
  user: CheckoutUser;
  planId: string;
  period?: BillingPeriod;
  returnUrl: string;
  cancelUrl?: string;
}): Promise<{ url: string; sessionId: string }> {
  const period: BillingPeriod = opts.period === "year" ? "year" : "month";
  const productId = getProductIdForPlan(opts.planId, period);
  if (!productId) {
    throw new Error(
      `No Dodo product is configured for the "${opts.planId}" plan (${period}ly billing).`,
    );
  }
  const client = getDodoClient();

  // Re-use the Dodo customer when we already have one so the portal and
  // subscription history stay attached to a single customer record.
  const customer = opts.user.dodoCustomerId
    ? { customer_id: opts.user.dodoCustomerId }
    : { email: opts.user.email, name: opts.user.name || opts.user.email };

  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: customer as any,
    return_url: opts.returnUrl,
    ...(opts.cancelUrl ? { cancel_url: opts.cancelUrl } : {}),
    // Brand the hosted checkout to match our site.
    customization: BRAND_CHECKOUT_CUSTOMIZATION,
    // Carried back to us on every subscription webhook so we can attribute the
    // subscription to the right user without a DB round-trip.
    metadata: { userId: opts.user.id, planId: opts.planId, period },
  });

  if (!session.checkout_url) {
    throw new Error("Dodo Payments did not return a checkout URL.");
  }
  return { url: session.checkout_url, sessionId: session.session_id };
}

/**
 * Create a hosted checkout for a custom-dollar credit purchase. The amount (in
 * cents) is passed on the pay-what-you-want line item; `credits` is carried in
 * metadata and granted when the `payment.succeeded` webhook arrives.
 */
export async function createCreditCheckout(opts: {
  user: CheckoutUser;
  amountCents: number;
  credits: number;
  returnUrl: string;
  cancelUrl?: string;
}): Promise<{ url: string; sessionId: string }> {
  if (!Number.isSafeInteger(opts.amountCents) || opts.amountCents < MIN_CREDITS_USD * 100 ||
      opts.amountCents > MAX_CREDITS_USD * 100 || opts.credits !== opts.amountCents * CREDITS_PER_USD / 100)
    throw new Error("Invalid general credit top-up amount.");
  const productId = getCreditsProductId();
  if (!productId) {
    throw new Error("No Dodo product is configured for credit purchases.");
  }
  const client = getDodoClient();

  const customer = opts.user.dodoCustomerId
    ? { customer_id: opts.user.dodoCustomerId }
    : { email: opts.user.email, name: opts.user.name || opts.user.email };

  const create = (cust: Record<string, unknown>) => client.checkoutSessions.create({
    product_cart: [
      { product_id: productId, quantity: 1, amount: opts.amountCents },
    ],
    customer: cust as any,
    return_url: opts.returnUrl,
    ...(opts.cancelUrl ? { cancel_url: opts.cancelUrl } : {}),
    customization: {
      ...BRAND_CHECKOUT_CUSTOMIZATION,
      theme_config: {
        ...BRAND_CHECKOUT_CUSTOMIZATION.theme_config,
        pay_button_text: "Buy credits",
      },
    },
    // Carried back on the payment webhook so we can attribute + grant credits.
    metadata: {
      userId: opts.user.id,
      kind: "credits",
      credits: String(opts.credits),
      amountCents: String(opts.amountCents),
    },
  });

  let session;
  try {
    session = await create(customer);
  } catch (err) {
    // A stored customer id can be stale (e.g. created in test mode before going
    // live). Retry once by email so the purchase is not blocked by it.
    if (!opts.user.dodoCustomerId) throw err;
    console.warn("[dodo] credit checkout with stored customer_id failed; retrying by email:", dodoErrorMessage(err));
    session = await create({ email: opts.user.email, name: opts.user.name || opts.user.email });
  }

  if (!session.checkout_url) {
    throw new Error("Dodo Payments did not return a checkout URL.");
  }
  return { url: session.checkout_url, sessionId: session.session_id };
}

/** Best-effort readable message from a Dodo SDK/API error (no secrets in it). */
export function dodoErrorMessage(err: unknown): string {
  const e = err as { status?: number; error?: { message?: string; code?: string }; message?: string };
  const detail = e?.error?.message || e?.message || String(err);
  return e?.status ? `${e.status}: ${detail}` : detail;
}

/** Create a Dodo Customer Portal session so the user can manage/cancel billing. */
export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const client = getDodoClient();
  const session = await client.customers.customerPortal.create(customerId, {
    return_url: returnUrl,
  });
  const url = (session as any).link as string | undefined;
  if (!url) {
    throw new Error("Dodo Payments did not return a customer portal URL.");
  }
  return { url };
}

/** Verify a webhook's signature and return the parsed event. Throws if invalid. */
export async function verifyWebhook(
  rawBody: string,
  headers: Record<string, string>,
): Promise<DodoWebhookEvent> {
  const key = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!key) {
    throw new Error(
      "DODO_PAYMENTS_WEBHOOK_KEY is not set. Cannot verify Dodo webhooks.",
    );
  }
  const client = getDodoClient();
  return (await client.webhooks.unwrap(rawBody, { headers, key })) as DodoWebhookEvent;
}

async function resolveUser(userId?: string, customerId?: string) {
  if (userId) {
    const u = await storage.getUserById(userId);
    if (u) return u;
  }
  if (customerId) {
    const u = await storage.getUserByDodoCustomerId(customerId);
    if (u) return u;
  }
  return undefined;
}

/** Reconcile a verified webhook event into our database. */
export async function handleWebhookEvent(
  event: DodoWebhookEvent,
): Promise<void> {
  const type = event.type;

  // One-time credit purchases (web pay-as-you-go). Grant credits idempotently
  // keyed by the payment id once the payment actually succeeds.
  if (type === "payment.succeeded") {
    const pay = event.data as any;
    if (pay?.metadata?.kind !== "credits") {
      logger.info({ type }, "Dodo payment.succeeded ignored (not a credit buy)");
      return;
    }
    const creditsProductId = getCreditsProductId();
    // Authoritative product gate: the settled payment MUST actually contain our
    // credits product. Never grant on metadata alone (it is attacker-influenced).
    const cart: Array<{ product_id?: string }> = Array.isArray(pay?.product_cart)
      ? pay.product_cart
      : [];
    if (!creditsProductId || !cart.some((i) => i?.product_id === creditsProductId)) {
      logger.warn(
        { type, paymentId: pay?.payment_id },
        "Dodo credit buy: settled payment does not contain the credits product",
      );
      return;
    }
    const userId: string | undefined = pay?.metadata?.userId;
    const paymentId: string | undefined = pay?.payment_id;
    const customerId: string | undefined = pay?.customer?.customer_id;

    // Derive credits from the AUTHORITATIVE settled amount, not metadata. For USD
    // we recompute from the pre-tax charged amount (total_amount includes tax);
    // metadata.credits is only a cross-check / non-USD fallback.
    let credits = Number(pay?.metadata?.credits);
    const currency: string | undefined = pay?.currency;
    const totalCents = Number(pay?.total_amount);
    const taxCents = Number(pay?.tax ?? 0);
    if (currency === "USD" && Number.isFinite(totalCents)) {
      const netCents = Math.max(
        0,
        totalCents - (Number.isFinite(taxCents) ? taxCents : 0),
      );
      const computed = Math.round((netCents / 100) * CREDITS_PER_USD);
      if (Number.isFinite(credits) && Math.abs(computed - credits) > 1) {
        logger.warn(
          { paymentId, metadataCredits: credits, computed, netCents },
          "Dodo credit buy: metadata credits disagree with settled amount; using settled",
        );
      }
      credits = computed;
    }
    if (!userId || !paymentId || !Number.isFinite(credits) || credits <= 0) {
      logger.warn({ type, userId, paymentId, credits }, "Dodo credit buy: bad metadata");
      return;
    }
    const user = await resolveUser(userId, customerId);
    if (!user) {
      logger.warn({ type, userId, customerId }, "Dodo credit buy: no matching user");
      return;
    }
    const grant = await storage.grantCreditsForPurchase(
      user.id,
      paymentId,
      getCreditsProductId() ?? "credits",
      credits,
    );
    // Keep the Dodo customer attached so future buys/portal reuse one record.
    if (customerId && !(user as any).dodoCustomerId) {
      await storage.updateUserDodoRefs(user.id, { dodoCustomerId: customerId });
    }
    logger.info(
      { userId: user.id, paymentId, credits, granted: Boolean(grant) },
      grant ? "Dodo credits granted" : "Dodo credits already granted (idempotent)",
    );
    return;
  }

  if (!type.startsWith("subscription.")) {
    // Anything that isn't a subscription lifecycle event or a credit payment is
    // not actioned here (mobile in-app purchases reconcile via RevenueCat).
    logger.info({ type }, "Dodo webhook ignored (not a subscription event)");
    return;
  }

  const sub = event.data as any;
  const userId: string | undefined = sub?.metadata?.userId;
  const customerId: string | undefined = sub?.customer?.customer_id;
  const subscriptionId: string | undefined = sub?.subscription_id;
  const productId: string | undefined = sub?.product_id;
  // The AUTHORITATIVE signal is the subscription's own status, NOT the event
  // type. Dodo emits subscription.active / subscription.updated events while a
  // subscription is being created and during payment retries, even when the
  // first charge has NOT settled (status: "pending" | "on_hold" | "failed").
  // Granting on event type alone therefore handed paid access to users whose
  // payment FAILED. We only ever grant a plan for a genuinely "active"
  // subscription. Dodo statuses: pending | active | on_hold | cancelled |
  // failed | expired.
  const status: string | undefined =
    typeof sub?.status === "string" ? sub.status.toLowerCase() : undefined;

  const user = await resolveUser(userId, customerId);
  if (!user) {
    logger.warn({ type, userId, customerId, status }, "Dodo webhook: no matching user");
    return;
  }

  const isActive = status === "active";
  const isEnded =
    status === "cancelled" || status === "expired" || status === "failed";

  if (isActive) {
    // The subscription's product is the authoritative tier — metadata.planId can
    // be stale after a portal-driven plan switch, so it is only a fallback.
    const planId =
      getPlanForProductId(productId) ||
      (sub?.metadata?.planId as string) ||
      user.plan;
    if (getPlan(planId) && planId !== "free") {
      await storage.updateUserPlan(user.id, planId);
    }
    await storage.updateUserDodoRefs(user.id, {
      dodoCustomerId: customerId ?? (user as any).dodoCustomerId ?? null,
      dodoSubscriptionId: subscriptionId ?? (user as any).dodoSubscriptionId ?? null,
    });
    logger.info(
      { userId: user.id, plan: planId, type, status },
      "Dodo subscription active -> plan granted",
    );
  } else if (isEnded) {
    // Only act if this event is for the user's *currently tracked* subscription.
    // A delayed/out-of-order cancel for a subscription they already replaced (or
    // a different one) must not revoke their active paid access.
    const trackedSub = (user as any).dodoSubscriptionId as string | null;
    if (trackedSub && subscriptionId && trackedSub !== subscriptionId) {
      logger.info(
        { userId: user.id, type, status, subscriptionId, trackedSub },
        "Dodo end event for non-active subscription ignored",
      );
      return;
    }
    await storage.updateUserPlan(user.id, "free");
    await storage.updateUserDodoRefs(user.id, { dodoSubscriptionId: null });
    logger.info(
      { userId: user.id, type, status },
      "Dodo subscription ended -> downgraded to free",
    );
  } else {
    // pending (first charge not settled), on_hold / paused (retry in progress),
    // or an unknown status. Do NOT grant a plan — a failed or not-yet-settled
    // payment must never hand out paid access. Leave any existing plan intact so
    // an in-flight retry can still recover via a later "active" event.
    logger.info(
      { userId: user.id, type, status },
      "Dodo subscription non-active status -> no plan grant",
    );
  }
}
