import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PlansManager } from "@/components/PlansManager";
import { CheckoutLegalNote } from "@/components/legal/CheckoutLegalNote";
import { useSeo } from "@/lib/useSeo";
import "@/styles/marketing.css";

interface EduPlan { id: string; name: string; monthlyCents: number; yearlyCents: number; monthlyCredits: number; maxPages: number; quizDailyLimit: number; examDailyLimit: number; commercialUse: boolean; apiAccess: boolean }
interface EduConfig { plans: EduPlan[]; policies: { purchasedExpiryMonths: number; freeGenerationsPerDay: number }; customTopUp: { minCents: number; maxCents: number; creditsPerUsd: number } }

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;

/** Education Zone prices, read from the same server catalog the Paddle checkout uses. */
function EducationPlansSummary() {
  const [cfg, setCfg] = useState<EduConfig | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/education/billing/config`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCfg)
      .catch(() => setErr(true));
  }, []);

  return (
    <section aria-labelledby="edu-pricing-heading" className="border-t border-[#e7e0d5] py-12" data-testid="section-education-pricing">
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <p className="edu-eyebrow">Education Zone</p>
          <h2 id="edu-pricing-heading" className="mkt-h2 mt-2">Education plans</h2>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-[#57534e]">
            AI study tools with their own wallet. Sold through Paddle. Separate from PDF Tools plans; credits don't transfer.
          </p>
          <Link href="/education/pricing" className="mkt-link mt-4 text-sm">Full Education pricing <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <div className="min-w-0">
          {err ? (
            <p className="text-sm text-[#57534e]">Education prices could not load. See <Link href="/education/pricing" className="mkt-link">Education pricing</Link>.</p>
          ) : !cfg ? (
            <div className="h-40 animate-pulse rounded-[10px] bg-[#efe8dd]" aria-busy="true" />
          ) : (
            <>
              <div className="overflow-x-auto border-t border-[#1c1917]">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e7e0d5] font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#8a837b]">
                      <th scope="col" className="py-2.5 pr-3 font-semibold">Plan</th>
                      <th scope="col" className="py-2.5 pr-3 font-semibold">Monthly</th>
                      <th scope="col" className="py-2.5 pr-3 font-semibold">Yearly</th>
                      <th scope="col" className="py-2.5 pr-3 font-semibold">Includes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#efe8dd]">
                      <th scope="row" className="py-3 pr-3 font-semibold text-[#1c1917]">Free</th>
                      <td className="edu-mono py-3 pr-3">$0</td>
                      <td className="edu-mono py-3 pr-3">$0</td>
                      <td className="py-3 pr-3 text-[#57534e]">{cfg.policies.freeGenerationsPerDay} free generations per day on eligible tools</td>
                    </tr>
                    {cfg.plans.map((p) => (
                      <tr key={p.id} className="border-b border-[#efe8dd]" data-testid={`row-edu-plan-${p.id}`}>
                        <th scope="row" className="py-3 pr-3 font-semibold text-[#1c1917]">{p.name}</th>
                        <td className="edu-mono whitespace-nowrap py-3 pr-3 text-[#1c1917]">{usd(p.monthlyCents)}<span className="text-[#8a837b]"> / month</span></td>
                        <td className="edu-mono whitespace-nowrap py-3 pr-3 text-[#1c1917]">{usd(p.yearlyCents)}<span className="text-[#8a837b]"> / year</span></td>
                        <td className="py-3 pr-3 text-[#57534e]">
                          {p.monthlyCredits.toLocaleString()} credits each month · up to {p.maxPages} pages per PDF
                          {p.quizDailyLimit > 0 ? ` · ${p.quizDailyLimit} quizzes/day included` : ""}
                          {p.examDailyLimit > 0 ? ` · ${p.examDailyLimit} exam papers/day included` : ""}
                          {p.commercialUse ? " · commercial use" : " · personal study"}
                          {p.apiAccess ? " · API keys" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-[#57534e]">
                Credit top-ups: {usd(cfg.customTopUp.minCents)}–{usd(cfg.customTopUp.maxCents)} one-time, {cfg.customTopUp.creditsPerUsd} credits per US dollar. Purchased credits expire {cfg.policies.purchasedExpiryMonths} months after purchase.
              </p>
              <p className="mt-2 text-sm text-[#57534e]">
                Prices in US dollars, before any tax added at checkout. Plans renew automatically each month or year until you cancel.
              </p>
              <CheckoutLegalNote provider="paddle" subscription className="mt-2" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export const Pricing: React.FC = () => {
  useSeo({
    title: "Pricing and Plans",
    description:
      "PDF Tools and Education Zone prices in US dollars: monthly and yearly plans, credit top-ups, what each includes, and auto-renewal terms.",
    canonicalPath: "/pricing",
  });
  const { isAuthenticated } = useAuth();

  return (
    <div className="mkt-root min-h-[100dvh]">
      <section className="border-b border-[#e7e0d5]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-8 lg:pt-14">
          <div>
            <p className="edu-eyebrow">{isAuthenticated ? "Your plan" : "Pricing"}</p>
            <h1 className="mkt-display mt-3 text-[2.2rem] sm:text-[2.9rem]">
              {isAuthenticated ? "Manage Plans" : "Available Plans"}
            </h1>
            <p className="mkt-lede mt-4 max-w-2xl">
              Two products, two separate wallets. <strong className="text-[#1c1917]">PDF Tools</strong> plans and credits are sold through Dodo Payments;{" "}
              <strong className="text-[#1c1917]">Education Zone</strong> plans and credits are sold through Paddle. All prices are in US dollars.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a href="#edu-pricing-heading" className="mkt-link">Education plans</a>
            <Link href="/refund-policy" className="mkt-link">Refund policy</Link>
            <Link href="/cancellation-policy" className="mkt-link">Cancellation</Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="edu-eyebrow mb-2">PDF Tools</p>
        <PlansManager />
        <p className="mt-6 text-sm text-[#57534e]" data-testid="text-pdf-topups">
          PDF Tools credit top-ups: $5–$500 one-time, 100 credits per US dollar, from <Link href="/dashboard/buy-credits" className="mkt-link">Buy credits</Link>. Most web tools stay free without an account.
        </p>
        <EducationPlansSummary />
      </main>
    </div>
  );
};
