import { useState } from "react";
import { CheckoutLegalNote } from "@/components/legal/CheckoutLegalNote";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
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
    <section aria-labelledby="custom-h" className="grid gap-6 border-b border-[#e7e0d5] py-12 lg:grid-cols-[18rem_minmax(0,1fr)]" data-testid="section-education-custom-topup">
      <div>
        <p className="edu-eyebrow">Education credits only</p>
        <h3 id="custom-h" className="mt-2 font-['Poppins'] text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[#1c1917]">Custom top-up</h3>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#57534e]">Buy exactly what you need, from {money(cfg.minCents)} to {money(cfg.maxCents)} USD plus any applicable tax.</p>
        <ul className="mt-5 max-w-xs border-t border-[#e7e0d5] text-sm text-[#57534e]">
          <li className="border-b border-[#efe8dd] py-2"><span className="edu-mono font-semibold text-[#1c1917]">{cfg.creditsPerUsd}</span> credits per $1, the same rate for everyone</li>
          <li className="border-b border-[#efe8dd] py-2">Credits expire <span className="edu-mono text-[#1c1917]">{expiry}</span> months after purchase.</li>
          <li className="border-b border-[#efe8dd] py-2">Added to your Education balance only. Education and general PDF Genius credits are separate and cannot be transferred.</li>
        </ul>
      </div>

      <div className="min-w-0">
        {authLoading || (authed && accountLoading && !account) ? (
          <div className="max-w-xl space-y-4" aria-busy="true"><div className="h-9 w-72 animate-pulse rounded bg-[#ece5da]" /><div className="h-14 animate-pulse rounded bg-[#ece5da]" /><div className="h-11 animate-pulse rounded-full bg-[#ece5da]" /></div>
        ) : !authed ? (
          <div className="max-w-xl" data-testid="status-custom-signin">
            <p className="text-[#57534e]">Sign in to buy a custom amount of Education credits.</p>
            <Link href="/signin" className="edu-btn-primary mt-4" data-testid="link-custom-signin">Sign in to top up</Link>
          </div>
        ) : !account || accountError ? (
          <p role="alert" className="max-w-xl rounded-[10px] border border-[#f3c4c0] bg-[#fdf1ef] p-4 text-sm text-[#8f1f1a]" data-testid="status-custom-account-error">Could not load your Education account{accountError ? `: ${accountError}` : ""}. Purchases are paused until we can load your account. <button type="button" onClick={onRetryAccount} className="font-semibold underline" data-testid="button-custom-retry">Retry</button></p>
        ) : (
          <form className="max-w-xl" onSubmit={(e) => { e.preventDefault(); if (config.enabled && config.clientToken && !busy && inRange && cents !== null) onCheckout(cents); }} noValidate>
            <p className="edu-label" id="custom-presets">Quick amounts</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="custom-presets">
              {PRESETS.filter((p) => p >= cfg.minCents && p <= cfg.maxCents).map((p) => (
                <button key={p} type="button" disabled={!!busy} aria-pressed={cents === p} onClick={() => setRaw(String(p / 100))} className={cn("edu-mono min-h-9 rounded-full border px-4 text-sm font-semibold transition-colors", cents === p ? "border-[#1c1917] bg-[#1c1917] text-[#faf7f2]" : "border-[#d9d0c3] text-[#1c1917] hover:border-[#1c1917]")} data-testid={`button-custom-preset-${p}`}>{money(p)}</button>
              ))}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <label className="edu-label block" htmlFor="custom-amount">Amount (USD)</label>
                <div className="relative mt-1 border-b-2 border-[#1c1917] focus-within:border-[#f7433d]">
                  <span className="edu-mono pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-2xl text-[#8a837b]">$</span>
                  <input id="custom-amount" type="text" inputMode="decimal" autoComplete="off" value={raw} disabled={!!busy}
                    onChange={(e) => setRaw(e.target.value)} aria-invalid={!!validation} aria-describedby="custom-amount-help"
                    className="edu-mono h-14 w-full bg-transparent pl-6 text-[2rem] font-semibold tracking-[-0.03em] text-[#1c1917] focus:outline-none" data-testid="input-custom-amount" />
                </div>
              </div>
              <div className="sm:text-right" aria-live="polite">
                <p className="edu-label">You receive</p>
                <p className="mt-1 text-[#1c1917]" data-testid="text-custom-credits"><span className="edu-mono text-[2rem] font-semibold tracking-[-0.03em]">{inRange ? credits.toLocaleString() : "--"}</span> <span className="text-sm text-[#8a837b]">credits</span></p>
              </div>
            </div>
            <p id="custom-amount-help" className={cn("mt-2 text-xs", validation ? "text-[#8f1f1a]" : "text-[#8a837b]")}>{validation ?? `${money(cents!)} USD plus any applicable tax.`} <span className="text-[#8a837b]">{rate} credits per $1.</span></p>
            <button type="submit" disabled={!config.enabled || !config.clientToken || !inRange || !!busy} className="edu-btn-primary mt-6 w-full sm:w-auto" data-testid="button-custom-checkout">
              {isBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isBusy ? "Opening checkout" : inRange ? `Buy ${credits.toLocaleString()} Education credits` : "Buy Education credits"}
            </button>
            <p className="mt-3 text-xs text-[#8a837b]">Secure checkout via Paddle. Credits are added only after our server confirms the payment.</p>
            <CheckoutLegalNote provider="paddle" className="mt-2" />
          </form>
        )}
      </div>
    </section>
  );
}
