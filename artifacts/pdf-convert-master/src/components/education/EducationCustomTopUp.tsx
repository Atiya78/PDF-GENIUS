import { useState } from "react";
import { Link } from "wouter";
import { GraduationCap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type EduAccount, type EduBillingConfig, creditsForCents, money, parseUsdToCents } from "@/lib/education/billing";

interface Props {
  config: EduBillingConfig;
  authed: boolean;
  authLoading: boolean;
  account: EduAccount | null;
  accountLoading: boolean;
  accountError: string | null;
  busy: string | null;
  onRetryAccount: () => void;
  onCheckout: (amountCents: number) => void;
}

const PRESETS = [500, 1000, 2500, 5000];

/** Education-only custom top-up at a flat rate; the server quote is authoritative. */
export function EducationCustomTopUp({ config, authed, authLoading, account, accountLoading, accountError, busy, onRetryAccount, onCheckout }: Props) {
  const cfg = config.customTopUp;
  const [raw, setRaw] = useState("10");
  if (!cfg) return null; // Tolerate an older config during a rolling deployment.
  const cents = parseUsdToCents(raw);
  const inRange = cents !== null && cents >= cfg.minCents && cents <= cfg.maxCents;
  const rate = cfg.creditsPerUsd;
  const credits = inRange ? creditsForCents(cents, rate) : 0;
  const isBusy = busy === "custom";
  const validation = raw.trim() === "" ? "Enter an amount." :
    cents === null ? "Use dollars and up to 2 decimal places, e.g. 12.50." :
    !inRange ? `Choose between ${money(cfg.minCents)} and ${money(cfg.maxCents)}.` : null;
  const expiry = config.policies.purchasedExpiryMonths;

  return (
    <section aria-labelledby="custom-h" className="mt-8 rounded-3xl bg-white p-5 ring-1 ring-gray-200 sm:p-7" data-testid="section-education-custom-topup">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1f0] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#d9322c]"><GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />Education credits only</p>
          <h3 id="custom-h" className="mt-3 font-['Poppins'] text-xl font-bold text-gray-900">Custom top-up</h3>
          <p className="mt-1 text-sm text-gray-600">Buy exactly what you need, from {money(cfg.minCents)} to {money(cfg.maxCents)} USD plus any applicable tax.</p>
          <ul className="mt-4 space-y-1.5 text-sm text-gray-700">
            <li><span className="font-semibold tabular-nums text-gray-900">{cfg.creditsPerUsd}</span> credits per $1, the same rate for everyone</li>
            <li>Credits expire {expiry} months after purchase.</li>
            <li>Added to your Education balance only. Education and general PDF Genius credits are separate and cannot be transferred.</li>
          </ul>
        </div>

        <div className="rounded-2xl bg-[#fff7f6] p-5">
          {authLoading || (authed && accountLoading && !account) ? (
            <div className="space-y-3" aria-busy="true"><div className="h-11 animate-pulse rounded-full bg-white" /><div className="h-16 animate-pulse rounded-2xl bg-white" /><div className="h-11 animate-pulse rounded-full bg-white" /></div>
          ) : !authed ? (
            <div data-testid="status-custom-signin">
              <p className="text-sm text-gray-700">Sign in to buy a custom amount of Education credits.</p>
              <Link href="/signin" className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-gray-800" data-testid="link-custom-signin">Sign in to top up</Link>
            </div>
          ) : !account || accountError ? (
            <p role="alert" className="text-sm text-[#b42318]" data-testid="status-custom-account-error">Could not load your Education account{accountError ? `: ${accountError}` : ""}. Purchases are paused until we can load your account. <button type="button" onClick={onRetryAccount} className="font-semibold underline" data-testid="button-custom-retry">Retry</button></p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (config.enabled && config.clientToken && !busy && inRange && cents !== null) onCheckout(cents); }} noValidate>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
                {PRESETS.filter((p) => p >= cfg.minCents && p <= cfg.maxCents).map((p) => (
                  <button key={p} type="button" disabled={!!busy} onClick={() => setRaw(String(p / 100))} className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold transition", cents === p ? "border-[#f7433d] bg-white text-[#d9322c]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400")} data-testid={`button-custom-preset-${p}`}>{money(p)}</button>
                ))}
              </div>
              <label className="mt-4 block text-sm font-semibold text-gray-900" htmlFor="custom-amount">Amount (USD)</label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-500">$</span>
                <input id="custom-amount" type="text" inputMode="decimal" autoComplete="off" value={raw} disabled={!!busy}
                  onChange={(e) => setRaw(e.target.value)} aria-invalid={!!validation} aria-describedby="custom-amount-help"
                  className="h-11 w-full rounded-full border border-gray-300 bg-white pl-8 pr-4 text-base tabular-nums focus:border-[#f7433d] focus:outline-none" data-testid="input-custom-amount" />
              </div>
              <p id="custom-amount-help" className={cn("mt-1.5 text-xs", validation ? "text-[#b42318]" : "text-gray-500")}>{validation ?? `${money(cents!)} USD plus any applicable tax.`}</p>
              <div className="mt-4 flex items-baseline justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">You receive</p>
                  <p className="text-xs text-gray-500">{rate} credits per $1</p>
                </div>
                <p className="font-['Poppins'] text-2xl font-bold tabular-nums text-gray-900" data-testid="text-custom-credits">{inRange ? credits.toLocaleString() : "--"} <span className="text-sm font-semibold text-gray-500">credits</span></p>
              </div>
              <button type="submit" disabled={!config.enabled || !config.clientToken || !inRange || !!busy} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#f7433d] px-5 text-sm font-semibold text-white transition hover:bg-[#e03832] disabled:opacity-50" data-testid="button-custom-checkout">
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isBusy ? "Opening checkout" : inRange ? `Buy ${credits.toLocaleString()} Education credits` : "Buy Education credits"}
              </button>
              <p className="mt-2 text-xs text-gray-500">Secure checkout via Paddle. Credits are added only after our server confirms the payment.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
