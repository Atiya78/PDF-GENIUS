import { getPlan } from "../plans";

/** Read the existing catalog, without changing tiers, prices or billing rules. */
export function planFileLimitMB(planId = "free") {
  const plan = getPlan(planId) ?? getPlan("free");
  if (!plan) throw new Error("The upload plan catalog is unavailable.");
  for (const feature of plan.features) {
    const match = feature.match(/Files up to\s+([\d.]+)\s*(MB|GB)/i);
    if (match) return Number(match[1]) * (match[2].toUpperCase() === "GB" ? 1024 : 1);
  }
  throw new Error("The upload limit for this plan is unavailable. Please contact support.");
}
