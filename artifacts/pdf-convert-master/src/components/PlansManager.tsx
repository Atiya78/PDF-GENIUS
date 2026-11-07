import "@/styles/dashboard.css";
import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Code2, Archive, FileImage, CreditCard } from "lucide-react";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  type BillingPeriod,
  type Plan,
  type UsageData,
  fetchPlans,
  fetchUsage,
  changePlan,
  startCheckout,
  openBillingPortal,
  fetchMe,
  formatBytes,
  formatLimit,
  usagePercent,
} from "@/lib/plans";
import type { User } from "@workspace/db";

export const PlansManager: React.FC = () => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Tracks which paid plan's checkout button is busy (redirecting to Dodo).
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  // The customer portal opens for management/cancellation; one global flag.
  const [portalBusy, setPortalBusy] = useState(false);
  // Monthly / yearly billing toggle for the plan cards.
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("month");

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
    queryFn: fetchPlans,
  });

  const { data: usage } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
    queryFn: fetchUsage,
    enabled: isAuthenticated,
  });

  const currentPlanId = user?.plan ?? "free";
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  // A user with an active Dodo subscription manages everything via the portal;
  // a free user upgrades through hosted checkout.
  const hasSubscription = Boolean((user as any)?.dodoSubscriptionId);

  // Downgrade-to-free for subscription-less users (rare). Subscribers cancel via
  // the portal instead, so the backend rejects a free switch while a sub exists.
  const downgradeMutation = useMutation({
    mutationFn: changePlan,
    onSuccess: (plan: Plan) => {
      if (user) updateUser({ ...user, plan: plan.id } as User);
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({
        title: "Plan updated",
        description: `You're now on the ${plan.name} plan.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Could not change plan",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Redirect the browser into a Dodo checkout session for a paid plan.
  const handleUpgrade = async (planId: string) => {
    setPendingPlan(planId);
    try {
      const url = await startCheckout(planId, billingPeriod);
      window.location.href = url;
    } catch (err: any) {
      toast({
        title: "Could not start checkout",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      setPendingPlan(null);
    }
  };

  // Open the Dodo customer portal (update payment, switch plan, or cancel).
  const handlePortal = async () => {
    setPortalBusy(true);
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch (err: any) {
      toast({
        title: "Could not open billing",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      setPortalBusy(false);
    }
  };

  // Handle the return from a Dodo checkout. The plan flips via the webhook, which
  // may land a moment after the redirect, so poll the user a few times.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (!status) return;
    // Clean the URL so a refresh doesn't re-trigger the toast/poll.
    window.history.replaceState({}, "", window.location.pathname);

    if (status === "success") {
      toast({
        title: "Payment successful",
        description: "Your plan is being activated…",
      });
      let tries = 0;
      const poll = async () => {
        tries++;
        try {
          const me = await fetchMe();
          updateUser(me as User);
          queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
          if (me?.plan && me.plan !== "free") {
            toast({
              title: "Plan activated",
              description: `You're now on the ${me.plan} plan.`,
            });
            return;
          }
        } catch {
          // ignore and retry
        }
        if (tries < 6) setTimeout(poll, 2000);
      };
      poll();
    } else if (status === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "No changes were made.",
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meters =
    currentPlan && usage
      ? [
          {
            label: "API Calls",
            icon: Code2,
            used: usage.totals.apiCalls,
            limit: currentPlan.limits.apiCalls,
            fmt: (n: number) => n.toLocaleString(),
          },
          {
            label: "Storage",
            icon: Archive,
            used: usage.totals.dataProcessed,
            limit: currentPlan.limits.storageBytes,
            fmt: formatBytes,
          },
          {
            label: "Conversions",
            icon: FileImage,
            used: usage.totals.total,
            limit: currentPlan.limits.conversions,
            fmt: (n: number) => n.toLocaleString(),
          },
        ]
      : [];

  return (
    <div className="dash-scope">
      {isAuthenticated && currentPlan && (
        <>
          {/* Current Plan */}
          <Card className="mb-8">
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center mb-2">
                    <h2 className="text-xl font-bold text-gray-900 mr-3">
                      Current Plan
                    </h2>
                    <Badge className="bg-[#f7433d]/10 text-[#f7433d] border-[#f7433d]/20 hover:bg-[#f7433d]/10">
                      Active
                    </Badge>
                  </div>
                  <h3 className="mb-1 font-['Poppins'] text-3xl font-semibold tracking-[-0.02em] text-gray-900">
                    {currentPlan.name} Plan
                  </h3>
                  <p className="text-gray-600">
                    {currentPlan.price === 0
                      ? "Free forever"
                      : `$${currentPlan.price}/monthly`}{" "}
                    • {currentPlan.description}
                  </p>
                </div>
                {hasSubscription && (
                  <Button
                    variant="outline"
                    onClick={handlePortal}
                    disabled={portalBusy}
                    data-testid="button-manage-billing"
                  >
                    {portalBusy ? (
                      <ProcessingSpinner size={16} className="mr-2" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Usage Statistics (real data) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {meters.map((m) => {
              const pct = usagePercent(m.used, m.limit);
              const Icon = m.icon;
              return (
                <Card key={m.label}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">
                        {m.label}
                      </h3>
                      <Icon className="w-5 h-5 text-[#f7433d]" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-gray-900">
                          {m.fmt(m.used)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {m.limit === 0
                            ? "not included"
                            : `of ${formatLimit(m.limit, m.fmt)}`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#f7433d] h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {m.limit < 0
                          ? "Unlimited"
                          : m.limit === 0
                            ? "Upgrade to unlock"
                            : `${pct}% used`}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Available Plans */}
      <section className="mb-8 mt-4 grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]" aria-labelledby="plans-heading">
        <div>
          <p className="edu-eyebrow">Plans</p>
          <h2 id="plans-heading" className="mt-2 font-['Poppins'] text-[1.6rem] font-semibold tracking-[-0.02em] text-[#1c1917]">Choose a plan</h2>
          <div role="tablist" aria-label="Billing period" className="edu-tabs mt-5 !gap-6">
            {(
              [
                { value: "month", label: "Monthly" },
                { value: "year", label: "Yearly" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={billingPeriod === opt.value}
                onClick={() => setBillingPeriod(opt.value)}
                className={`edu-tab min-h-[44px] ${billingPeriod === opt.value ? "edu-tab-on" : ""}`}
                data-testid={`toggle-billing-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-[#57534e]"><span className="font-semibold text-[#c8302a]">Yearly: 2 months free.</span></p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-0 md:py-3">
            {plans.map((plan, idx) => {
              const isCurrent = isAuthenticated && plan.id === currentPlanId;
              const isFree = plan.id === "free";
              const isPending =
                pendingPlan === plan.id ||
                (downgradeMutation.isPending &&
                  downgradeMutation.variables === plan.id) ||
                (portalBusy && hasSubscription && !isCurrent);

              let label = plan.cta;
              if (isAuthenticated) {
                if (isCurrent) label = "Current Plan";
                else if (isFree) label = "Downgrade";
                else if (hasSubscription) label = "Switch Plan";
                else label = "Upgrade";
              }

              const onClick = () => {
                if (!isAuthenticated) {
                  setLocation("/signup");
                  return;
                }
                if (isCurrent) return;
                // Subscribers manage every change (switch or cancel) in the portal.
                if (hasSubscription) {
                  handlePortal();
                  return;
                }
                // No subscription yet: downgrade-to-free is a direct switch,
                // upgrading to a paid plan goes through Dodo checkout.
                if (isFree) {
                  downgradeMutation.mutate(plan.id);
                  return;
                }
                handleUpgrade(plan.id);
              };

              const featured = !!plan.popular;
              const next = plans[idx + 1];
              const yearly = billingPeriod === "year" && !isFree;
              return (
                <article
                  key={plan.id}
                  className={`relative flex min-w-0 flex-col border bg-[#fffdf9] p-6 rounded-[14px] md:rounded-none ${
                    featured ? "z-10 border-[#1c1917] shadow-[6px_6px_0_0_#f7433d] md:-my-3 md:rounded-[4px] md:py-9" : "border-[#e7e0d5]"
                  } ${idx === 0 ? "md:rounded-l-[14px]" : ""} ${idx === plans.length - 1 ? "md:rounded-r-[14px]" : ""} ${
                    !featured && idx > 0 ? "md:border-l-0" : ""
                  } ${!featured && next?.popular ? "md:border-r-0" : ""}`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-['Poppins'] text-lg font-semibold text-[#1c1917]">{plan.name}</h3>
                    {isCurrent && <span className="edu-eyebrow !text-[#2f5d50]" data-testid={`text-current-${plan.id}`}>Your plan</span>}
                  </div>
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="edu-mono text-[2.4rem] font-semibold leading-none tracking-[-0.03em] text-[#1c1917]">
                      ${yearly ? plan.yearlyPrice : plan.price}
                    </span>
                    <span className="text-sm text-[#57534e]">{yearly ? "/year" : "/month"}</span>
                  </p>
                  <p className="edu-mono mt-1.5 min-h-[1rem] text-xs text-[#8a837b]">
                    {yearly ? `$${(plan.yearlyPrice / 12).toFixed(2)}/month, billed yearly` : ""}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#57534e]">{plan.description}</p>
                  <ul className="mt-5 flex-1 border-t border-[#1c1917] text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 border-b border-[#efe8dd] py-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2f5d50]" aria-hidden="true" />
                        <span className="min-w-0 break-words text-[#1c1917]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1917] disabled:cursor-not-allowed ${
                      isCurrent
                        ? "border border-[#e7e0d5] text-[#8a837b]"
                        : featured
                          ? "bg-[#f7433d] text-white hover:bg-[#c8302a] disabled:opacity-60"
                          : "border border-[#1c1917] text-[#1c1917] hover:bg-[#1c1917] hover:text-[#faf7f2] disabled:opacity-60"
                    }`}
                    disabled={isCurrent || isPending}
                    onClick={onClick}
                    data-testid={`button-plan-${plan.id}`}
                  >
                    {isPending && <ProcessingSpinner size={16} tone={featured ? "light" : undefined} />}
                    {label}
                  </button>
                </article>
              );
            })}
        </div>
      </section>
    </div>
  );
};
