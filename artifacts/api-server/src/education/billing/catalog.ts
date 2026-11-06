import catalog from "../paddle-catalog.json";
import { EducationError } from "../config";

export type Tier = "none" | "basic" | "pro" | "max";
export type PaidTier = Exclude<Tier, "none">;
export type Period = "month" | "year";
export const plans = [
  { id: "basic" as const, name: "Basic", monthlyCents: 900, yearlyCents: 9000, monthlyCredits: 500, maxPages: 50, quizDailyLimit: 0, examDailyLimit: 0, queue: "standard", commercialUse: false, apiAccess: false },
  { id: "pro" as const, name: "Pro", monthlyCents: 2900, yearlyCents: 29000, monthlyCredits: 2000, maxPages: 100, quizDailyLimit: 30, examDailyLimit: 0, queue: "priority", commercialUse: true, apiAccess: false },
  { id: "max" as const, name: "Max", monthlyCents: 7900, yearlyCents: 79000, monthlyCredits: 6000, maxPages: 300, quizDailyLimit: 30, examDailyLimit: 10, queue: "fastest", commercialUse: true, apiAccess: true },
];
export const packs = Object.entries(catalog.packs).map(([id, pack]) => ({
  id, credits: pack.credits, priceCents: pack.standard.amount, subscriberPriceCents: pack.subscriber.amount,
}));
export const policies = { purchasedExpiryMonths: 12, monthlyCreditsRollover: true, otherToolsCredits: 1, freeGenerationsPerDay: 5 };
export { catalog };
export function planFor(tier: Tier) { return plans.find(plan => plan.id === tier) ?? plans[0]; }

export function priceInfo(priceId: string) {
  for (const [id, plan] of Object.entries(catalog.plans)) {
    for (const period of ["month", "year"] as const) {
      if (plan[period].priceId === priceId)
        return { kind: "plan" as const, id: id as PaidTier, period, credits: plan.credits, amount: plan[period].amount, productId: plan.productId };
    }
  }
  for (const [id, pack] of Object.entries(catalog.packs)) {
    for (const variant of ["standard", "subscriber"] as const) {
      if (pack[variant].priceId === priceId)
        return { kind: "pack" as const, id, period: null, credits: pack.credits, amount: pack[variant].amount, productId: pack.productId };
    }
  }
  return undefined;
}

// Calendar arithmetic must not turn January 31 + 1 month into March.
export function addMonths(date: Date, count: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + count);
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}

export function usagePrice(tier: Tier, kind: string, pages: number, questions = 0, regeneration = false) {
  const plan = planFor(tier);
  if (pages > plan.maxPages) throw new EducationError(`Your Education plan allows up to ${plan.maxPages} pages per upload. Select a smaller document or upgrade your Education plan.`, 403);
  if (kind === "quiz" && (tier === "none" || tier === "basic") && questions > 20)
    throw new EducationError("Basic and credit-only access allow up to 20 questions per quiz. Choose Pro or Max for more.", 403);
  const included = kind === "quiz" ? plan.quizDailyLimit : kind === "exam" ? plan.examDailyLimit : 0;
  const cost = kind === "quiz" ? regeneration ? 2 : 5 + Math.ceil(Math.max(0, questions - 20) / 10) + Math.ceil(Math.max(0, pages - 20) / 20)
    : kind === "exam" ? regeneration ? 3 : 15 + 3 * Math.ceil(Math.max(0, pages - 50) / 50) : 1;
  return { cost: included ? 0 : cost, includedLimit: included, priority: tier === "max" ? 2 : tier === "pro" ? 1 : 0 };
}
