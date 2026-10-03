import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Code2, Archive, FileImage, CreditCard } from "lucide-react";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { LottieIcon } from "@/components/ui/lottie-icon";
import recommendedAnim from "@/assets/lottie/recommended.json";
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
    <>
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
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">
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
      <Card className="mb-8">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Available Plans</CardTitle>
            {/* Monthly / Yearly toggle */}
            <div
              className="inline-flex max-w-full items-stretch rounded-2xl sm:rounded-full bg-gray-100 p-1"
              role="tablist"
              aria-label="Billing period"
            >
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
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    billingPeriod === opt.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid={`toggle-billing-${opt.value}`}
                >
                  {opt.label}
                  {opt.value === "year" && (
                    <span className="block sm:inline sm:ml-1.5 text-xs font-semibold text-[#f7433d]">
                      2 months free
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <div className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
            {plans.map((plan) => {
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

              return (
                <div
                  key={plan.id}
                  className={`min-w-0 border rounded-lg p-4 sm:p-6 relative flex flex-col h-full ${
                    isCurrent
                      ? "border-2 border-[#f7433d] bg-[#f7433d]/5"
                      : "border-gray-200"
                  }`}
                >
                  {plan.popular && !isCurrent && (
                    <div
                      className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none"
                      aria-label="Recommended plan"
                    >
                      <LottieIcon animationData={recommendedAnim} width={110} height={73} />
                    </div>
                  )}
                  {isCurrent && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#f7433d] text-white border-[#f7433d] hover:bg-[#f7433d]">
                      Your Plan
                    </Badge>
                  )}
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <div className="flex items-end justify-center mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        $
                        {billingPeriod === "year" && !isFree
                          ? plan.yearlyPrice
                          : plan.price}
                      </span>
                      <span className="text-gray-600 ml-1">
                        {billingPeriod === "year" && !isFree
                          ? "/year"
                          : "/month"}
                      </span>
                    </div>
                    {billingPeriod === "year" && !isFree && (
                      <p className="text-xs text-gray-500 mb-1">
                        ${(plan.yearlyPrice / 12).toFixed(2)}/month, billed
                        yearly
                      </p>
                    )}
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="w-5 h-5 text-[#f7433d] mr-3 shrink-0" />
                        <span className="min-w-0 text-sm text-gray-700 break-words">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full mt-auto h-auto min-h-10 whitespace-normal px-3 py-2 text-sm ${
                      isCurrent
                        ? ""
                        : "bg-[#f7433d] hover:bg-[#d93832] text-white"
                    }`}
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || isPending}
                    onClick={onClick}
                    data-testid={`button-plan-${plan.id}`}
                  >
                    {isPending && (
                      <ProcessingSpinner size={16} tone="light" className="mr-2" />
                    )}
                    {label}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </>
  );
};
