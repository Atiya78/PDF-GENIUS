import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEducationAccount } from "@/lib/education/billing";
import { cn } from "@/lib/utils";

const TIER: Record<string, string> = { none: "Free", basic: "Basic", pro: "Pro", max: "Max" };

export function EducationBillingStatus({ className }: { className?: string }) {
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const { account, error, loading } = useEducationAccount(isAuthenticated ? token : null);

  let body: React.ReactNode;
  if (authLoading || (isAuthenticated && loading && !account)) {
    body = <span className="block h-4 w-44 animate-pulse rounded bg-[#ece5da]" aria-label="Loading Education credits" />;
  } else if (!isAuthenticated) {
    body = <span className="text-[#57534e]">Free daily allowance on most tools; quizzes and exam papers use credits. Sign in to see your Education credits.</span>;
  } else if (error && !account) {
    body = <span className="text-[#8f1f1a]">Education credits unavailable: {error}</span>;
  } else if (account) {
    body = (
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[#57534e]">
        <span className="edu-eyebrow">Education {TIER[account.tier] ?? account.tier}</span>
        <span><span className="edu-mono text-base font-semibold text-[#1c1917]">{account.balance.toLocaleString()}</span> credits</span>
        <span className="hidden text-xs text-[#8a837b] sm:inline">{account.includedCredits.toLocaleString()} plan, {account.purchasedCredits.toLocaleString()} purchased</span>
      </span>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-y border-[#e7e0d5] py-3 text-sm", className)} data-testid="education-billing-status">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="edu-eyebrow shrink-0 !text-[#8a837b]">Credits</span>
        <div className="min-w-0">{body}</div>
      </div>
      <Link href="/education/pricing" className="group inline-flex items-center gap-1 whitespace-nowrap font-semibold text-[#1c1917] underline decoration-[#f7433d]/50 decoration-2 underline-offset-4 hover:decoration-[#f7433d]" data-testid="link-education-pricing">
        Education plans <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
export default EducationBillingStatus;
