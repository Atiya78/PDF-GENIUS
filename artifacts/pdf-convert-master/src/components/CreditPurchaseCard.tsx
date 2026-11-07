import "@/styles/dashboard.css";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Zap, CreditCard, GraduationCap } from "lucide-react";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  type BillingConfig,
  fetchBillingConfig,
  startCreditsCheckout,
  fetchMe,
} from "@/lib/plans";
import { creditsForCents, money, parseUsdToCents } from "@/lib/education/billing";
import type { User } from "@workspace/db";

/**
 * Self-contained credit balance + custom-amount purchase card. Owns its own
 * checkout-return handling (`?checkout=credits-success` / `cancelled`) so it can
 * be dropped on any page (e.g. the dedicated Buy Credits page).
 */
export const CreditPurchaseCard: React.FC<{ className?: string; showBalance?: boolean }> = ({
  className = "",
  showBalance = true,
}) => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [creditAmount, setCreditAmount] = useState("5");
  const [creditBusy, setCreditBusy] = useState(false);

  const { data: billingConfig } = useQuery<BillingConfig>({
    queryKey: ["/api/billing/config"],
    queryFn: fetchBillingConfig,
  });

  const creditsCfg = billingConfig?.credits;
  const creditsEnabled = Boolean(creditsCfg?.enabled);
  const perUsd = creditsCfg?.creditsPerUsd ?? 100;
  const minUsd = creditsCfg?.minUsd ?? 5;
  const maxUsd = creditsCfg?.maxUsd ?? 500;
  // Integer cents only: strict 2-decimal parse, never round an invalid entry up.
  const minCents = Math.round(minUsd * 100);
  const maxCents = Math.round(maxUsd * 100);
  const cents = parseUsdToCents(creditAmount);
  const amountValid = cents !== null && cents >= minCents && cents <= maxCents;
  const creditsToReceive = amountValid ? creditsForCents(cents, perUsd) : 0;
  const amountError =
    creditAmount.trim() === "" ? null :
    cents === null ? "Use dollars and up to 2 decimal places, e.g. 12.50." :
    !amountValid ? `Choose between ${money(minCents)} and ${money(maxCents)}.` : null;

  // Redirect the browser into a Dodo checkout for a custom $ amount of credits.
  const handleBuyCredits = async () => {
    if (!amountValid) {
      toast({
        title: "Enter a valid amount",
        description: amountError ?? `Choose between ${money(minCents)} and ${money(maxCents)}.`,
        variant: "destructive",
      });
      return;
    }
    setCreditBusy(true);
    try {
      const url = await startCreditsCheckout(cents / 100);
      window.location.href = url;
    } catch (err: any) {
      toast({
        title: "Could not start checkout",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      setCreditBusy(false);
    }
  };

  // Handle the return from a Dodo credits checkout. Credits land via the payment
  // webhook, which may arrive a moment after the redirect, so poll a few times.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (status !== "credits-success" && status !== "cancelled") return;
    // Clean the URL so a refresh doesn't re-trigger the toast/poll.
    window.history.replaceState({}, "", window.location.pathname);

    if (status === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "No changes were made.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Payment successful",
      description: "Your credits are being added…",
    });
    const before = user?.credits ?? 0;
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const me = await fetchMe();
        updateUser(me as User);
        if ((me?.credits ?? 0) > before) {
          toast({
            title: "Credits added",
            description: `Your balance is now ${(me.credits ?? 0).toLocaleString()} credits.`,
          });
          return;
        }
      } catch {
        // ignore and retry
      }
      if (tries < 8) setTimeout(poll, 2000);
    };
    poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className={`dash-scope ${className ?? ""}`}>
      <div className="p-5 sm:p-7">
        {showBalance ? (
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] border border-[#e7e0d5] bg-[#fdece9]">
            <Zap className="h-5 w-5 text-[#c8302a]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 basis-60">
            <p className="edu-eyebrow !text-[#8a837b]">Balance</p>
            <h3 className="text-base font-semibold text-gray-900">
              PDF tools credits
            </h3>
            <p className="text-sm text-gray-600">
              Spent on PDF, image and video tools and the API, on web and mobile. Not usable in the Education Zone.
            </p>
          </div>
          <span
            className="edu-mono text-[2.1rem] font-semibold leading-none tracking-[-0.02em] text-[#1c1917]"
            data-testid="text-credit-balance"
          >
            {(user?.credits ?? 0).toLocaleString()}
          </span>
        </div>
        ) : (
          <div>
            <p className="edu-eyebrow">Top up</p>
            <h3 className="mt-1.5 font-['Poppins'] text-lg font-semibold text-[#1c1917]">Add PDF tools credits</h3>
          </div>
        )}

        {billingConfig && !creditsEnabled && (
          <p className="mt-5 border-t border-[#e7e0d5] pt-4 text-sm text-[#57534e]" data-testid="text-credits-unavailable">
            Credit top-ups are not available right now. Your balance and plan are unaffected.
          </p>
        )}

        {creditsEnabled && (
          <div className={showBalance ? "mt-7 border-t border-[#1c1917] pt-6" : "mt-5 border-t border-[#1c1917] pt-5"}>
            {showBalance && (
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Top up PDF tools credits
            </h4>
            )}
            {/* Quick-pick dollar presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[5, 10, 25, 50, 100].map((amt) => {
                const active = cents === amt * 100;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCreditAmount(String(amt))}
                    disabled={creditBusy}
                    data-testid={`button-credit-preset-${amt}`}
                    aria-pressed={active}
                    className={`edu-choice edu-mono min-w-[4.5rem] justify-center !px-4 ${active ? "edu-choice-on !border-[#f7433d] !text-[#c8302a]" : ""}`}
                  >
                    ${amt}
                  </button>
                );
              })}
            </div>
            {/* Custom dollar amount */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 max-w-[220px]">
                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 edu-mono text-[#8a837b]">
                  $
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={minUsd}
                  max={maxUsd}
                  step="0.01"
                  aria-invalid={!!amountError}
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  disabled={creditBusy}
                  className="edu-input edu-mono !h-11 !pl-7"
                  aria-label="Custom amount in US dollars"
                  placeholder="Enter amount"
                  data-testid="input-credit-amount"
                />
              </div>
              <Button
                className="edu-btn-primary !h-11 !px-5 hover:!bg-[#c8302a]"
                onClick={handleBuyCredits}
                disabled={creditBusy || !amountValid}
                data-testid="button-buy-credits"
              >
                {creditBusy ? (
                  <ProcessingSpinner size={16} tone="light" className="mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                {amountValid
                  ? `Pay ${money(cents)} · get ${creditsToReceive.toLocaleString()} credits`
                  : "Enter an amount"}
              </Button>
            </div>
            {amountError && (
              <p role="alert" className="text-xs text-[#b42318] mt-2" data-testid="text-credit-amount-error">
                {amountError}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-3">
              $1 = {perUsd.toLocaleString()} PDF tools credits, rounded down to whole credits. Min {money(minCents)}, max{" "}
              {money(maxCents)}. Secure checkout via Dodo Payments.
            </p>
            <Link
              href="/education/pricing"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#d9322c] underline underline-offset-4"
              data-testid="link-education-pricing"
            >
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
              Need Education Zone credits? They are bought separately
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
};
