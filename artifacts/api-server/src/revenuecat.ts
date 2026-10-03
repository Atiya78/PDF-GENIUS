import { createClient } from "@replit/revenuecat-sdk/client";
import { ReplitConnectors } from "@replit/connectors-sdk";
import {
  listCustomerActiveEntitlements,
  listPurchases,
  listProducts,
} from "@replit/revenuecat-sdk";
import { storage } from "./storage";
import { getPlan } from "./plans";
import { logger } from "./lib/logger";

// --- Configuration ----------------------------------------------------------

// Map of credit-pack store identifiers -> number of credits granted. This is the
// server-side source of truth for how many credits each pack is worth; the
// client never gets to decide. Keep in sync with the seeded products
// (scripts/src/seedRevenueCat.ts).
const CREDITS_BY_STORE_ID: Record<string, number> = {
  credits_10: 10,
  credits_50: 50,
  credits_100: 100,
  credits_250: 250,
  credits_500: 500,
  credits_1000: 1000,
};

// Resolve how many credits a credit-pack store product grants. Prefer the
// explicit map above; otherwise fall back to parsing the "credits_<N>" naming
// convention, so any new pack created in the stores (e.g. credits_2500) grants
// the right amount with no code change. Returns null for non-credit products.
function creditsForStoreIdentifier(storeIdentifier: string): number | null {
  const explicit = CREDITS_BY_STORE_ID[storeIdentifier];
  if (explicit != null) return explicit;
  const m = /^credits_(\d+)$/.exec(storeIdentifier);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

// Entitlement lookup keys mapped to our internal plan ids, highest tier first.
// A customer who somehow holds both keeps the higher tier.
const ENTITLEMENT_TO_PLAN: Array<{ entitlement: string; plan: string }> = [
  { entitlement: "business", plan: "business" },
  { entitlement: "pro", plan: "pro" },
];

type RevenueCatClient = ReturnType<typeof createClient>;

function getProjectId(): string {
  const id = process.env.REVENUECAT_PROJECT_ID;
  if (!id) {
    throw new Error(
      "REVENUECAT_PROJECT_ID is not set. Cannot talk to the RevenueCat REST API.",
    );
  }
  return id;
}

/**
 * Builds a server-only RevenueCat v2 client. Direct keys support external
 * hosting; Replit's attached connection manages credentials in connector mode.
 */
export function getRevenueCatServerClient(): RevenueCatClient {
  const apiKey = process.env.REVENUECAT_API_KEY?.trim();
  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    ...(apiKey
      ? { headers: { Authorization: `Bearer ${apiKey}` } }
      : { fetch: new ReplitConnectors().createProxyFetch("revenuecat") }),
  });
}

// --- Product -> credits resolution ------------------------------------------

// Cache the RevenueCat product_id -> credits map so we don't re-list products on
// every sync. Products rarely change, and a stale entry can only ever fail to
// match a brand-new pack (which a server restart fixes).
let creditProductCache:
  | { fetchedAt: number; map: Map<string, number> }
  | null = null;
const CREDIT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getCreditProductMap(
  client: RevenueCatClient,
  projectId: string,
): Promise<Map<string, number>> {
  if (creditProductCache && Date.now() - creditProductCache.fetchedAt < CREDIT_CACHE_TTL_MS) {
    return creditProductCache.map;
  }

  const map = new Map<string, number>();
  let startingAfter: string | undefined;

  // Page through every product and record the RC product id of each credit pack
  // (matched by its store identifier) alongside how many credits it grants.
  do {
    const { data, error } = await listProducts({
      client,
      path: { project_id: projectId },
      query: { limit: 50, starting_after: startingAfter },
    });
    if (error || !data) {
      throw new Error(`RevenueCat listProducts failed: ${JSON.stringify(error)}`);
    }

    for (const product of data.items) {
      const credits = creditsForStoreIdentifier(product.store_identifier);
      if (credits != null) {
        map.set(product.id, credits);
      }
    }

    startingAfter = data.next_page ? data.items[data.items.length - 1]?.id : undefined;
  } while (startingAfter);

  creditProductCache = { fetchedAt: Date.now(), map };
  return map;
}

// --- Sync -------------------------------------------------------------------

export interface RevenueCatSyncResult {
  plan: string;
  credits: number;
  creditsGranted: number;
}

/**
 * Reconciles a user's RevenueCat state into our database:
 *  - reads active entitlements and sets users.plan (business > pro > free)
 *  - reads one-time purchases and grants any credit packs not yet granted
 *    (idempotent on the RevenueCat purchase id)
 *
 * The RevenueCat customer id is our own user id, because the mobile client calls
 * Purchases.logIn(userId) before purchasing.
 */
export async function syncRevenueCatCustomer(
  userId: string,
): Promise<RevenueCatSyncResult> {
  const client = getRevenueCatServerClient();
  const projectId = getProjectId();

  const user = await storage.getUserById(userId);
  if (!user) {
    throw new Error(`Cannot sync RevenueCat for unknown user ${userId}`);
  }

  // 1) Resolve the plan from active entitlements.
  const {
    data: entData,
    error: entError,
    response: entResponse,
  } = await listCustomerActiveEntitlements({
    client,
    path: { project_id: projectId, customer_id: userId },
  });
  // A customer RevenueCat has never seen (no purchases yet) 404s — that's a
  // perfectly normal "nothing to sync" state, not an error.
  const customerUnknown = entResponse?.status === 404;
  if ((entError || !entData) && !customerUnknown) {
    throw new Error(
      `RevenueCat listCustomerActiveEntitlements failed: ${JSON.stringify(entError)}`,
    );
  }

  const activeEntitlements = new Set(
    (entData?.items ?? []).map((e) => e.entitlement_id),
  );
  // Highest active tier, if any. We only ever UPGRADE/CHANGE the plan when there
  // is an active subscription entitlement; with no entitlements we leave the
  // stored plan untouched so a one-time credit purchase (which grants no
  // entitlement) never accidentally resets a subscriber's plan.
  let resolvedPlan: string | null = null;
  for (const { entitlement, plan: planId } of ENTITLEMENT_TO_PLAN) {
    if (activeEntitlements.has(entitlement)) {
      resolvedPlan = planId;
      break;
    }
  }
  if (resolvedPlan && user.plan !== resolvedPlan && getPlan(resolvedPlan)) {
    await storage.updateUserPlan(userId, resolvedPlan);
  }
  const plan = resolvedPlan ?? user.plan;

  // 2) Grant credits for any one-time credit-pack purchases not yet recorded.
  const creditMap = await getCreditProductMap(client, projectId);
  let creditsGranted = 0;
  let startingAfter: string | undefined;

  // Unknown customer (404 above) has no purchases to scan — skip the loop.
  while (!customerUnknown) {
    const {
      data: purData,
      error: purError,
      response: purResponse,
    } = await listPurchases({
      client,
      path: { project_id: projectId, customer_id: userId },
      query: { limit: 50, starting_after: startingAfter },
    });
    if (purResponse?.status === 404) break;
    if (purError || !purData) {
      throw new Error(`RevenueCat listPurchases failed: ${JSON.stringify(purError)}`);
    }

    for (const purchase of purData.items) {
      if (purchase.status !== "owned") continue; // skip refunded
      const credits = creditMap.get(purchase.product_id);
      if (credits == null) continue; // not a credit pack (e.g. a subscription)

      const grant = await storage.grantCreditsForPurchase(
        userId,
        purchase.id,
        purchase.product_id,
        credits,
      );
      if (grant) creditsGranted += grant.credits;
    }

    startingAfter = purData.next_page
      ? purData.items[purData.items.length - 1]?.id
      : undefined;
    if (!startingAfter) break;
  }

  // Re-read so the returned balance reflects any grants we just made.
  const fresh = await storage.getUserById(userId);
  const credits = fresh?.credits ?? user.credits ?? 0;

  logger.info(
    { userId, plan, creditsGranted, credits },
    "RevenueCat customer synced",
  );

  return { plan, credits, creditsGranted };
}
