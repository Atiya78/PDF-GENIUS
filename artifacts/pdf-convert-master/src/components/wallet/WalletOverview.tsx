import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPlans, type Plan } from "@/lib/plans";
import { fmtDate, useEducationAccount } from "@/lib/education/billing";

const EDU_TIER: Record<string, string> = { none: "No subscription", basic: "Basic", pro: "Pro", max: "Max" };

/**
 * Two independent wallets, side by side. Each has its own balance, its own
 * subscription and its own payment provider; credits never move between them.
 */
export function WalletOverview() {
  const { user, token, isAuthenticated } = useAuth();
  const { account, error, loading } = useEducationAccount(isAuthenticated ? token : null);
  const { data: plans = [] } = useQuery<Plan[]>({ queryKey: ["/api/plans"], queryFn: fetchPlans });

  const planId = user?.plan ?? "free";
  const plan = plans.find((p) => p.id === planId);
  const planName = plan?.name ?? planId.charAt(0).toUpperCase() + planId.slice(1);
  const hasSub = Boolean((user as { dodoSubscriptionId?: string | null } | null)?.dodoSubscriptionId);

  return (
    <section aria-labelledby="wallets-heading" className="grid gap-px overflow-hidden rounded-[14px] border border-[#e7e0d5] bg-[#e7e0d5] md:grid-cols-2">
      <h2 id="wallets-heading" className="sr-only">Your wallets</h2>

      <article className="flex flex-col bg-[#fffdf9] p-5 sm:p-6" data-testid="wallet-general">
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-[#c8302a]" aria-hidden="true" />
          <p className="edu-eyebrow">PDF tools wallet</p>
        </div>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="edu-mono text-[2.4rem] font-semibold leading-none tracking-[-0.03em] text-[#1c1917]" data-testid="text-wallet-general-balance">
            {(user?.credits ?? 0).toLocaleString()}
          </span>
          <span className="text-sm text-[#57534e]">credits</span>
        </p>
        <dl className="mt-5 flex-1 border-t border-[#1c1917] text-sm">
          <Row k="Subscription" v={`${planName}${plan && plan.price > 0 ? ` · $${plan.price}/mo` : ""}`} />
          <Row k="Used for" v="PDF, image and video tools, API" />
          <Row k="Top-up rate" v="$1 = 100 credits" mono />
          <Row k="Billed by" v="Dodo Payments" />
        </dl>
        <Link href="/dashboard/manage-plans" className="group mt-5 inline-flex items-center gap-1 self-start text-sm font-semibold text-[#1c1917] underline decoration-[#f7433d]/50 decoration-2 underline-offset-4 hover:decoration-[#f7433d]" data-testid="link-wallet-general-plan">
          {hasSub ? "Manage PDF tools plan" : "PDF tools plans"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </article>

      <article className="flex flex-col bg-[#fffdf9] p-5 sm:p-6" data-testid="wallet-education">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="h-4 w-4 text-[#2f5d50]" aria-hidden="true" />
          <p className="edu-eyebrow">Education wallet</p>
        </div>
        <p className="mt-4 flex items-baseline gap-2">
          {loading && !account ? (
            <span className="block h-9 w-24 animate-pulse rounded bg-[#ece5da]" aria-label="Loading Education balance" />
          ) : (
            <span className="edu-mono text-[2.4rem] font-semibold leading-none tracking-[-0.03em] text-[#1c1917]" data-testid="text-wallet-education-balance">
              {account ? account.balance.toLocaleString() : "—"}
            </span>
          )}
          <span className="text-sm text-[#57534e]">credits</span>
        </p>
        {error && !account && <p role="alert" className="mt-2 text-xs text-[#8f1f1a]">Education balance unavailable: {error}</p>}
        <dl className="mt-5 flex-1 border-t border-[#1c1917] text-sm">
          <Row
            k="Subscription"
            v={account ? `${EDU_TIER[account.tier] ?? account.tier}${account.tier !== "none" && account.periodEnd ? ` · renews ${fmtDate(account.periodEnd)}` : ""}` : "—"}
          />
          {account && (
            <Row k="Balance split" v={`${account.includedCredits.toLocaleString()} plan · ${account.purchasedCredits.toLocaleString()} purchased`} mono />
          )}
          <Row k="Used for" v="Quizzes, exam papers, study tools" />
          <Row k="Top-up rate" v="$1 = 100 credits" mono />
          <Row k="Billed by" v="Paddle" />
        </dl>
        <Link href="/education/pricing" className="group mt-5 inline-flex items-center gap-1 self-start text-sm font-semibold text-[#1c1917] underline decoration-[#2f5d50]/50 decoration-2 underline-offset-4 hover:decoration-[#2f5d50]" data-testid="link-wallet-education">
          Top up or subscribe to Education <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </article>
    </section>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#efe8dd] py-2.5">
      <dt className="shrink-0 text-[#8a837b]">{k}</dt>
      <dd className={`min-w-0 text-right text-[#1c1917] ${mono ? "edu-mono text-[13px]" : ""}`}>{v}</dd>
    </div>
  );
}
