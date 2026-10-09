import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPlans, type Plan } from "@/lib/plans";

// Per-file upload cap advertised by each plan ("Files up to 25 MB").
// Parsed from the existing /api/plans catalog so it never drifts from pricing.
let planCache: Plan[] | null = null;
let planPromise: Promise<Plan[]> | null = null;

function loadPlans(): Promise<Plan[]> {
  if (planCache) return Promise.resolve(planCache);
  if (!planPromise) {
    planPromise = fetchPlans()
      .then((p) => (planCache = p))
      .catch(() => {
        planPromise = null;
        return [] as Plan[];
      });
  }
  return planPromise;
}

export function planMaxFileMB(plans: Plan[], planId: string | null | undefined): number | null {
  const plan = plans.find((p) => p.id.toLowerCase() === (planId || "free").toLowerCase());
  for (const f of plan?.features ?? []) {
    const m = /files up to\s+([\d.]+)\s*(MB|GB)/i.exec(f);
    if (m) return parseFloat(m[1]) * (m[2].toUpperCase() === "GB" ? 1024 : 1);
  }
  return null;
}

/**
 * Per-file MB cap for the current visitor's plan (guests use the Free plan).
 * Returns null until the catalog is known, so callers fall back to the tool cap.
 */
export function usePlanMaxFileMB(): number | null {
  const { user } = useAuth();
  const planId = (user as { plan?: string } | null)?.plan ?? "free";
  const [mb, setMb] = useState<number | null>(planCache ? planMaxFileMB(planCache, planId) : null);
  useEffect(() => {
    let live = true;
    loadPlans().then((plans) => {
      if (live) setMb(planMaxFileMB(plans, planId));
    });
    return () => {
      live = false;
    };
  }, [planId]);
  return mb;
}

/** min(tool cap, plan cap) in MB. */
export function effectiveMaxMB(toolMB: number, planMB: number | null): number {
  // Fail closed to the existing Free cap while the catalog is loading/unavailable.
  return Math.min(toolMB, planMB ?? 25);
}
