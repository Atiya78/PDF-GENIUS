import { Link } from "wouter";
import { ArrowRight, Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEducationAccount } from "@/lib/education/billing";
import { cn } from "@/lib/utils";

const TIER: Record<string, string> = { none: "Free", basic: "Basic", pro: "Pro", max: "Max" };

export function EducationBillingStatus({ className }: { className?: string }) {
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const { account, error, loading } = useEducationAccount(isAuthenticated ? token : null);

  let body: React.ReactNode;
  if (authLoading || (isAuthenticated && loading && !account)) {
    body = <span className="h-4 w-40 animate-pulse rounded bg-gray-200" aria-label="Loading Education credits" />;
  } else if (!isAuthenticated) {
    body = <span className="text-gray-600">Study tools with a free daily allowance, plus paid quizzes and exam papers. Sign in to see your Education credits.</span>;
  } else if (error && !account) {
    body = <span className="text-[#b42318]">Education credits unavailable: {error}</span>;
  } else if (account) {
    body = (
      <span className="text-gray-700">
        <span className="font-semibold text-gray-900">Education {TIER[account.tier] ?? account.tier}</span>
        <span className="mx-2 text-gray-300">|</span>
        <span className="tabular-nums font-semibold text-gray-900">{account.balance.toLocaleString()}</span> credits
        <span className="hidden sm:inline text-gray-500"> ({account.includedCredits.toLocaleString()} plan, {account.purchasedCredits.toLocaleString()} purchased)</span>
      </span>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f7433d]/15 bg-white px-4 py-3 text-sm shadow-sm", className)} data-testid="education-billing-status">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fff1f0] text-[#d9322c]"><Coins className="h-4 w-4" aria-hidden="true" /></span>
        {body}
      </div>
      <Link href="/education/pricing" className="inline-flex items-center gap-1 font-semibold text-[#d9322c] hover:text-[#b42318]" data-testid="link-education-pricing">
        Education plans <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
export default EducationBillingStatus;
