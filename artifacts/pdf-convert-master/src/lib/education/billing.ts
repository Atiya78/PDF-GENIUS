import { useCallback, useEffect, useRef, useState } from "react";
import type { EducationCheckoutInput, EducationCustomTopUpConfig } from "@workspace/api-client-react";

export type { EducationCheckoutInput, EducationCustomTopUpConfig };

export type EduTier = "none" | "basic" | "pro" | "max";
export type EduPeriod = "month" | "year";

export interface EduPlan {
  id: "basic" | "pro" | "max"; name: string; monthlyCents: number; yearlyCents: number; monthlyCredits: number;
  maxPages: number; quizDailyLimit: number; examDailyLimit: number; queue: string; commercialUse: boolean; apiAccess: boolean;
}
export interface EduPack { id: "small" | "medium" | "large"; credits: number; priceCents: number; subscriberPriceCents: number }
export interface EduBillingConfig {
  enabled: boolean; clientToken: string | null; environment: "live" | "sandbox"; customTopUp: EducationCustomTopUpConfig; plans: EduPlan[]; packs: EduPack[];
  policies: { purchasedExpiryMonths: number; monthlyCreditsRollover: boolean; otherToolsCredits: number; freeGenerationsPerDay: number };
}
export interface EduAccount {
  tier: EduTier; status: string; periodEnd: string | null; billingPeriod: EduPeriod | null; balance: number;
  includedCredits: number; purchasedCredits: number; nextGrantAt: string | null; subscriptionId: string | null; canManage: boolean;
  usage: { quiz: number; exam: number };
  lots: { credits: number; expiresAt: string; kind: string }[];
  apiKeys: { id: string; name: string; createdAt: string; lastUsedAt: string | null }[];
}
export interface EduCheckoutStatus { status: "pending" | "completed" | "canceled"; balance: number }

const base = () => (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
export const billingUrl = (p: string) => `${base()}/api/education/billing${p}`;

async function call<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try { res = await fetch(billingUrl(path), { ...init, headers, credentials: "include" }); }
  catch { throw new Error("Network error. Check your connection and try again."); }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && typeof data.error === "string" && data.error) || `Request failed (${res.status})`);
  return data as T;
}

export const getBillingConfig = () => call<EduBillingConfig>("/config", null);
export const getBillingAccount = (t: string) => call<EduAccount>("/account", t);
export const startCheckout = (t: string, body: EducationCheckoutInput) =>
  call<{ url: string; transactionId: string }>("/checkout", t, { method: "POST", body: JSON.stringify(body) });
export const getCheckoutStatus = (t: string, id: string) => call<EduCheckoutStatus>(`/checkout/${encodeURIComponent(id)}`, t);
export const openPortal = (t: string) => call<{ url: string }>("/portal", t, { method: "POST", body: "{}" });
export const createApiKey = (t: string, name: string) =>
  call<{ id: string; key: string }>("/api-keys", t, { method: "POST", body: JSON.stringify({ name }) });
export const deleteApiKey = (t: string, id: string) =>
  call<{ success: true }>(`/api-keys/${encodeURIComponent(id)}`, t, { method: "DELETE" });

/**
 * Strictly parse a user-typed USD amount into integer cents without floating point.
 * Accepts "12", "12.3", "12.34", ".5"; rejects more than 2 decimals, signs, exponents.
 */
export function parseUsdToCents(raw: string): number | null {
  const m = /^(\d{0,7})(?:\.(\d{0,2}))?$/.exec(raw.trim());
  if (!m || (!m[1] && !m[2])) return null;
  return Number(m[1] || "0") * 100 + Number((m[2] || "").padEnd(2, "0"));
}
/** Whole credits for an integer-cents amount at a per-USD rate (rounded down). */
export const creditsForCents = (cents: number, perUsd: number) => Math.floor((cents * perUsd) / 100);

export const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
export const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");

/** Account state for the signed-in user: refreshes on focus, reconnect and every 15s; clears on token change. */
export function useEducationAccount(token: string | null) {
  const [account, setAccount] = useState<EduAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const refresh = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const a = await getBillingAccount(t);
      if (tokenRef.current === t) { setAccount(a); setError(null); }
    } catch (e) {
      if (tokenRef.current === t) setError(e instanceof Error ? e.message : "Could not load account");
    } finally { if (tokenRef.current === t) setLoading(false); }
  }, []);

  useEffect(() => {
    setAccount(null); setError(null);
    if (!token) { setLoading(false); return; }
    setLoading(true);
    void refresh();
    const onFocus = () => { void refresh(); };
    const onVis = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVis);
    // Poll only while the tab is visible.
    const iv = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(iv);
    };
  }, [token, refresh]);

  return { account, error, loading, refresh };
}

// Minimal local typing for Paddle.js v2 (loaded from CDN, no package).
interface PaddleEvent { name?: string; data?: { transaction_id?: string } }
interface PaddleGlobal {
  Environment: { set: (env: string) => void };
  Initialize: (o: { token: string; eventCallback?: (e: PaddleEvent) => void }) => void;
  Checkout: { open: (o: { transactionId: string; settings: Record<string, unknown> }) => void };
}
declare global { interface Window { Paddle?: PaddleGlobal } }

type PaddleHandler = (e: PaddleEvent) => void;
let paddleHandler: PaddleHandler | null = null;
let paddlePromise: Promise<PaddleGlobal> | null = null;
export function setPaddleEventHandler(h: PaddleHandler | null) { paddleHandler = h; }

/** Loads Paddle.js once and initializes it with the public client token. */
export function loadPaddle(clientToken: string, environment: "live" | "sandbox"): Promise<PaddleGlobal> {
  if (paddlePromise) return paddlePromise;
  paddlePromise = new Promise<PaddleGlobal>((resolve, reject) => {
    const init = () => {
      const P = window.Paddle;
      if (!P) { reject(new Error("Payment system failed to load. Disable blockers for cdn.paddle.com and reload.")); return; }
      try {
        if (environment === "sandbox") P.Environment.set("sandbox");
        P.Initialize({ token: clientToken, eventCallback: (e) => paddleHandler?.(e) });
        resolve(P);
      } catch { reject(new Error("Payment system could not be initialized.")); }
    };
    if (window.Paddle) { init(); return; }
    const el = document.createElement("script");
    el.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    el.async = true;
    el.onload = init;
    el.onerror = () => reject(new Error("Payment system failed to load. Check your connection or disable blockers for cdn.paddle.com, then reload."));
    document.head.appendChild(el);
  }).catch((e) => { paddlePromise = null; throw e; });
  return paddlePromise;
}

export function openPaddleCheckout(P: PaddleGlobal, transactionId: string) {
  P.Checkout.open({
    transactionId,
    settings: {
      displayMode: "overlay",
      successUrl: `${window.location.origin}${base()}/education/pricing?education_checkout=${encodeURIComponent(transactionId)}`,
      allowDiscountRemoval: false,
      showAddDiscounts: false,
      allowLogout: false,
    },
  });
}

// ---- Education generation cost rules (mirror server pricing; server is authoritative) ----
export const PAGE_CAPS: Record<EduTier, number> = { none: 50, basic: 50, pro: 100, max: 300 };
export const QUIZ_MAX_QUESTIONS: Record<EduTier, number> = { none: 20, basic: 20, pro: 50, max: 50 };
export const QUIZ_REGEN_CREDITS = 2;
export const EXAM_QUESTION_REGEN_CREDITS = 3;
export const EXAM_SECTION_REGEN_CREDITS = 3;

export function quizCredits(count: number, pages: number): number {
  return 5 + Math.ceil(Math.max(0, count - 20) / 10) + Math.ceil(Math.max(0, pages - 20) / 20);
}
export function examCredits(pages: number): number {
  return 15 + 3 * Math.ceil(Math.max(0, pages - 50) / 50);
}
/** Page count from a normalized range like "1-5,8"; null when unknown. */
export function countRangePages(range: string | null | undefined): number | null {
  if (!range) return null;
  let n = 0;
  for (const part of range.split(",")) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!m) return null;
    const a = Number(m[1]); const b = m[2] ? Number(m[2]) : a;
    if (b < a) return null;
    n += b - a + 1;
  }
  return n || null;
}
export interface IncludedStatus { included: boolean; left: number; capped: boolean }
/**
 * Included daily allowance (fair-use cap). When a tier includes the kind, the server
 * never falls back to credits: at the cap it rejects until midnight UTC.
 */
export function includedStatus(account: EduAccount | null, config: EduBillingConfig | null, kind: "quiz" | "exam"): IncludedStatus {
  if (!account || account.tier === "none") return { included: false, left: 0, capped: false };
  const plan = config?.plans.find((p) => p.id === account.tier);
  const fallback = kind === "quiz" ? (account.tier === "basic" ? 0 : 30) : account.tier === "max" ? 10 : 0;
  const limit = plan ? (kind === "quiz" ? plan.quizDailyLimit : plan.examDailyLimit) : fallback;
  if (limit <= 0) return { included: false, left: 0, capped: false };
  const left = Math.max(0, limit - account.usage[kind]);
  return { included: true, left, capped: left === 0 };
}
export const CAP_MESSAGE = (kind: "quiz" | "exam") =>
  `You have reached today's included ${kind === "quiz" ? "quiz" : "exam paper"} limit for your plan. It resets at midnight UTC; included plans do not switch to paid credits.`;
/** Remaining included daily generations, or 0. */
export function includedLeft(account: EduAccount | null, config: EduBillingConfig | null, kind: "quiz" | "exam"): number {
  if (!account || account.tier === "none") return 0;
  const plan = config?.plans.find((p) => p.id === account.tier);
  const fallback = kind === "quiz" ? (account.tier === "basic" ? 0 : 30) : account.tier === "max" ? 10 : 0;
  const limit = plan ? (kind === "quiz" ? plan.quizDailyLimit : plan.examDailyLimit) : fallback;
  return Math.max(0, limit - account.usage[kind]);
}

/** POST /api/education/exam-paper/regenerate-section (manual client until codegen adds a hook). */
export async function regenerateExamSection<P>(body: { pages: unknown; paper: P; sectionId: string; requestId: string }, headers: Record<string, string>): Promise<P> {
  let res: Response;
  try {
    res = await fetch(`${base()}/api/education/exam-paper/regenerate-section`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
    });
  } catch { throw new Error("Network error. Check your connection and try again."); }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && typeof data.error === "string" && data.error) || `Section regeneration failed (${res.status})`);
  return data as P;
}

/** Shared config fetch for tool pages (cached in-module). */
let configPromise: Promise<EduBillingConfig> | null = null;
export function useEducationConfig(): EduBillingConfig | null {
  const [c, setC] = useState<EduBillingConfig | null>(null);
  useEffect(() => {
    let live = true;
    if (!configPromise) configPromise = getBillingConfig().catch((e) => { configPromise = null; throw e; });
    configPromise.then((v) => { if (live) setC(v); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return c;
}
