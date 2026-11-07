import { useEffect, useRef, useState } from "react";
import { CheckoutLegalNote } from "@/components/legal/CheckoutLegalNote";
import { Link } from "wouter";
import { Check, ChevronRight, Copy, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { Reveal } from "@/components/education/Reveal";
import { useAuth } from "@/contexts/AuthContext";
import { EducationCustomTopUp } from "@/components/education/EducationCustomTopUp";
import { useSeo } from "@/lib/useSeo";
import { cn } from "@/lib/utils";
import "@/components/education/education.css";
import {
  type EduBillingConfig, type EduPeriod, type EducationCheckoutInput, createApiKey, deleteApiKey, fmtDate, getBillingConfig, getCheckoutStatus,
  loadPaddle, money, openPaddleCheckout, openPortal, setPaddleEventHandler, startCheckout, useEducationAccount,
} from "@/lib/education/billing";


const TXN_RE = /^txn_[A-Za-z0-9_]+$/;
function readUrlParams(): { settled: string | null; open: string | null } {
  const p = new URLSearchParams(window.location.search);
  const ok = (v: string | null) => (v && TXN_RE.test(v) ? v : null);
  return { settled: ok(p.get("education_checkout")), open: ok(p.get("_ptxn")) || ok(p.get("transaction_id")) };
}

const COSTS: { tool: string; href: string; rows: [string, string][] }[] = [
  { tool: "Quiz Generator", href: "/education/quiz-generator", rows: [
    ["Generate a quiz (up to 20 questions, 20 pages)", "5 credits"],
    ["Each extra 10 questions above 20", "+1 credit"],
    ["Each extra 20 pages above 20", "+1 credit"],
    ["Regenerate a quiz", "2 credits"],
  ] },
  { tool: "Exam Paper Generator", href: "/education/exam-paper-generator", rows: [
    ["Generate an exam paper (up to 50 pages)", "15 credits"],
    ["Each extra 50 pages above 50", "+3 credits"],
    ["Regenerate one section", "3 credits"],
    ["Replace one existing question", "3 credits"],
  ] },
];

export function EducationPricingPage(): JSX.Element {
  useSeo({
    title: "Education Plans and Credits | PDF Genius",
    description: "Education-only plans for students: Basic, Pro and Max with monthly study credits, custom credit top-ups at 100 credits per $1, daily quiz and exam allowances, and clear expiry rules.",
    canonicalPath: "/education/pricing",
  });
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const authed = isAuthenticated ? token : null;
  const { account, error: accErr, loading: accLoading, refresh } = useEducationAccount(authed);
  const [config, setConfig] = useState<EduBillingConfig | null>(null);
  const [cfgErr, setCfgErr] = useState<string | null>(null);
  const [period, setPeriod] = useState<EduPeriod>("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [txn, setTxn] = useState<string | null>(null);
  const [txnState, setTxnState] = useState<"pending" | "completed" | "canceled" | "error" | null>(null);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<{ id: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const loadConfig = () => { setCfgErr(null); getBillingConfig().then(setConfig).catch((e) => setCfgErr(e.message)); };
  useEffect(loadConfig, []);
  const [openTxn, setOpenTxn] = useState<string | null>(null);
  const [paddleErr, setPaddleErr] = useState<string | null>(null);
  useEffect(() => { const u = readUrlParams(); if (u.settled) setTxn(u.settled); else if (u.open) setOpenTxn(u.open); }, []);

  // Paddle events: completed -> poll server status (never claim credits); closed -> refresh account.
  useEffect(() => {
    setPaddleEventHandler((e) => {
      if (e.name === "checkout.completed") { const id = e.data?.transaction_id; if (id && TXN_RE.test(id)) setTxn(id); }
      else if (e.name === "checkout.closed") void refreshRef.current();
    });
    return () => setPaddleEventHandler(null);
  }, []);

  const getPaddle = async () => {
    if (!config?.clientToken) throw new Error("Payments are not configured right now. Please try again later.");
    try { return await loadPaddle(config.clientToken, config.environment); }
    catch (e) { const m = e instanceof Error ? e.message : "Payment system failed to load."; setPaddleErr(m); throw e; }
  };

  // _ptxn payment link: auto-open overlay once Paddle is ready (no redirect to our own URL).
  useEffect(() => {
    if (!openTxn || !config) return;
    const id = openTxn; setOpenTxn(null);
    getPaddle().then((P) => openPaddleCheckout(P, id)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTxn, config]);
  useEffect(() => { setNewKey(null); setActionErr(null); }, [authed]);

  // Poll server-owned checkout status; never trust the return URL alone.
  useEffect(() => {
    if (!txn || !authed) return;
    let stop = false; let tries = 0;
    setTxnState("pending");
    const tick = async () => {
      try {
        const s = await getCheckoutStatus(authed, txn);
        if (stop) return;
        setTxnState(s.status);
        if (s.status !== "pending") { void refreshRef.current(); return; }
      } catch { if (!stop && tries > 3) { setTxnState("error"); return; } }
      tries++;
      if (!stop && tries < 60) window.setTimeout(tick, 3000);
    };
    void tick();
    return () => { stop = true; };
  }, [txn, authed]);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id); setActionErr(null);
    try { await fn(); } catch (e) { setActionErr(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(null); }
  };
  const checkout = (input: EducationCheckoutInput) => run(input.kind === "custom" ? "custom" : `${input.kind}-${input.id}`, async () => {
    if (!authed) return;
    // Custom top-ups need a confirmed Education account so the shown rate matches the server's.
    if (input.kind === "custom" && (!account || accErr)) throw new Error("Refresh your Education account before starting a top-up.");
    const r = await startCheckout(authed, input);
    try {
      const P = await getPaddle();
      openPaddleCheckout(P, r.transactionId);
    } catch (e) {
      // Fallback only to an external https checkout, never our own _ptxn page (loop).
      let u: URL | null = null;
      try { u = new URL(r.url); } catch { u = null; }
      if (u && u.protocol === "https:" && u.origin !== window.location.origin) { window.location.href = u.href; return; }
      throw e;
    }
  });
  const portal = () => run("portal", async () => { if (authed) window.location.href = (await openPortal(authed)).url; });
  const addKey = () => run("key-new", async () => {
    if (!authed || !keyName.trim()) return;
    const k = await createApiKey(authed, keyName.trim());
    setNewKey(k); setKeyName(""); setCopied(false); await refresh();
  });
  const removeKey = (id: string) => run(`key-${id}`, async () => {
    if (!authed || !window.confirm("Revoke this API key? Apps using it will stop working immediately.")) return;
    await deleteApiKey(authed, id);
    if (newKey?.id === id) setNewKey(null);
    await refresh();
  });

  const subscribed = !!account && account.tier !== "none";
  const pol = config?.policies;
  const btn = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-[background-color,border-color,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
  const H2 = "mt-2 font-['Poppins'] text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[#1c1917]";
  const Label = ({ eyebrow, id, title, note }: { eyebrow: string; id?: string; title: string; note?: string }) => (
    <div>
      <p className="edu-eyebrow">{eyebrow}</p>
      <h2 id={id} className={H2}>{title}</h2>
      {note && <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#57534e]">{note}</p>}
    </div>
  );

  const policies: [string, React.ReactNode][] = [
    ["Monthly credits", <>{pol?.monthlyCreditsRollover === false ? "do not roll over." : "roll over month to month but expire at the end of your paid subscription period. Yearly plans receive their credits monthly, not all at once."} Exact expiry dates for your credits are listed in your account above.</>],
    ["Rollover is limited:", "unused plan credits carry over only within the billing period you have already paid for. Purchased credits are tracked separately."],
    ["Purchased credits", `expire ${pol?.purchasedExpiryMonths ?? 12} months after purchase.`],
    ["Other study tools", `(notes, summaries, flashcards, mind maps, Ask PDF, translation) stay free for ${pol?.freeGenerationsPerDay ?? 5} generations per day, then use ${pol?.otherToolsCredits ?? 1} Education credit each.`],
    ["Queue speed", "labels describe priority only; processing times are not guaranteed."],
    ["No unlimited usage.", "Every plan has the credit and daily limits shown on this page."],
    ["Separate from website plans.", "Education payments are processed by Paddle and do not change your PDF Genius website subscription."],
  ];

  return (
    <div className="edu-root min-h-[100dvh]">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:pt-12">
        <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-1 text-sm text-[#8a837b]">
          <Link href="/" className="hover:text-[#1c1917]">Home</Link><ChevronRight className="h-4 w-4" aria-hidden="true" />
          <Link href="/education" className="hover:text-[#1c1917]">Education Zone</Link><ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span aria-current="page" className="font-medium text-[#1c1917]">Education plans</span>
        </nav>

        <header className="grid gap-6 border-b border-[#e7e0d5] pb-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <p className="edu-eyebrow pt-2">Education Zone billing</p>
          <div className="max-w-3xl">
            <h1 className="font-['Poppins'] text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[#1c1917] sm:text-[3.4rem]" data-testid="text-education-pricing-title">Study credits, priced in plain numbers.</h1>
            <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-[#57534e]">These plans cover the Education Zone only: quizzes, exam papers, notes and other study tools built from your own PDFs. They are separate from the PDF Genius website plans on the <Link href="/pricing" className="font-semibold text-[#1c1917] underline decoration-[#f7433d]/50 decoration-2 underline-offset-4">main pricing page</Link>, which are billed differently and do not include Education credits.</p>
          </div>
        </header>

        {paddleErr && <p role="alert" className="mt-6 rounded-[10px] border border-[#f0dcb4] bg-[#fdf6e7] p-4 text-sm text-[#7a4b0c]" data-testid="status-paddle-error">{paddleErr}</p>}
        {txn && (
          <div role="status" className={cn("mt-6 flex items-start gap-3 rounded-[10px] border p-4 text-sm", txnState === "completed" ? "border-[#bcd3c9] bg-[#eef4f1] text-[#2f5d50]" : txnState === "canceled" || txnState === "error" ? "border-[#f0dcb4] bg-[#fdf6e7] text-[#7a4b0c]" : "border-[#e7e0d5] bg-[#fffdf9] text-[#57534e]")} data-testid="status-checkout">
            {txnState === "pending" || txnState === null ? <Loader2 className="mt-0.5 h-4 w-4 animate-spin" aria-hidden="true" /> : txnState === "completed" ? <Check className="mt-0.5 h-4 w-4" aria-hidden="true" /> : <X className="mt-0.5 h-4 w-4" aria-hidden="true" />}
            <div className="flex-1">
              {!authed ? "Sign in to confirm your Education checkout." :
                txnState === "completed" ? "Payment confirmed by our server. Your Education credits have been updated." :
                txnState === "canceled" ? "This checkout was canceled. You have not been charged for it." :
                txnState === "error" ? "We could not confirm this checkout yet. If you paid, credits appear once the payment is processed; refresh later or contact support." :
                "Confirming your payment with our server. This can take a minute; we do not mark a payment as successful until it is confirmed."}
            </div>
            <button type="button" onClick={() => setTxn(null)} className="text-xs font-semibold underline">Dismiss</button>
          </div>
        )}

        {/* Account */}
        <section aria-labelledby="acct-h" className="grid gap-6 border-b border-[#e7e0d5] py-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex items-start justify-between gap-3 lg:block">
            <Label eyebrow="Your desk" id="acct-h" title="Your Education account" />
            {authed && <button type="button" onClick={() => void refresh()} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#57534e] hover:text-[#1c1917] lg:mt-4" data-testid="button-refresh-account"><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</button>}
          </div>
          <div className="min-w-0">
            {authLoading || (authed && accLoading && !account) ? (
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[#e7e0d5] bg-[#e7e0d5] sm:grid-cols-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="bg-[#fffdf9] p-4"><div className="h-3 w-16 animate-pulse rounded bg-[#ece5da]" /><div className="mt-3 h-5 w-24 animate-pulse rounded bg-[#ece5da]" /></div>)}</div>
            ) : !authed ? (
              <p className="max-w-xl leading-relaxed text-[#57534e]">Sign in to buy a plan or credits and see your credit balance. Without an account you can still use {pol ? pol.freeGenerationsPerDay : "the"} free Education generations per day.{" "}
                <Link href="/signin" className="font-semibold text-[#1c1917] underline decoration-[#f7433d] decoration-2 underline-offset-4">Sign in</Link></p>
            ) : accErr && !account ? (
              <div role="alert" className="rounded-[10px] border border-[#f3c4c0] bg-[#fdf1ef] p-4 text-sm text-[#8f1f1a]">Could not load your Education account: {accErr} <button type="button" onClick={() => void refresh()} className="ml-2 font-semibold underline">Retry</button></div>
            ) : account && (
              <>
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[#e7e0d5] bg-[#e7e0d5] sm:grid-cols-4">
                  {[
                    ["Plan", account.tier === "none" ? "No plan" : `${account.tier[0].toUpperCase()}${account.tier.slice(1)}${account.billingPeriod ? ` (${account.billingPeriod}ly)` : ""}`],
                    ["Balance", `${account.balance.toLocaleString()} credits`],
                    ["From plan / purchased", `${account.includedCredits.toLocaleString()} / ${account.purchasedCredits.toLocaleString()}`],
                    ["Used today", `${account.usage.quiz} quiz, ${account.usage.exam} exam`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-[#fffdf9] p-4"><dt className="edu-label">{k}</dt><dd className="edu-mono mt-1.5 text-[15px] font-semibold text-[#1c1917]">{v}</dd></div>
                  ))}
                </dl>
                <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm text-[#57534e] sm:grid-cols-3">
                  <div><dt className="inline">Status: </dt><dd className="inline font-medium text-[#1c1917]">{account.status}</dd></div>
                  <div><dt className="inline">Paid period ends: </dt><dd className="edu-mono inline font-medium text-[#1c1917]">{fmtDate(account.periodEnd)}</dd></div>
                  <div><dt className="inline">Next monthly grant: </dt><dd className="edu-mono inline font-medium text-[#1c1917]">{fmtDate(account.nextGrantAt)}</dd></div>
                </dl>
                {account.lots.length > 0 && (
                  <div className="mt-6 overflow-x-auto">
                    <h3 className="edu-label">Credit lots and expiry</h3>
                    <table className="mt-2 w-full text-left text-sm"><thead className="text-[#8a837b]"><tr className="border-b border-[#1c1917]"><th className="py-2 font-medium">Source</th><th className="text-right font-medium">Credits</th><th className="pl-6 text-right font-medium">Expires</th></tr></thead>
                      <tbody>{account.lots.map((l, i) => <tr key={i} className="border-b border-[#efe8dd]"><td className="py-2 capitalize text-[#1c1917]">{l.kind}</td><td className="edu-mono text-right">{l.credits.toLocaleString()}</td><td className="edu-mono pl-6 text-right">{fmtDate(l.expiresAt)}</td></tr>)}</tbody></table>
                  </div>
                )}
                {account.canManage && (
                  <button type="button" onClick={portal} disabled={busy === "portal"} className="edu-btn-ghost mt-6" data-testid="button-manage-subscription">
                    {busy === "portal" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Manage Education subscription
                  </button>
                )}
              </>
            )}
            {actionErr && <p role="alert" className="mt-4 text-sm text-[#8f1f1a]">{actionErr}</p>}
          </div>
        </section>

        {/* Plans */}
        <section aria-labelledby="plans-h" className="border-b border-[#e7e0d5] py-12">
          <Reveal>
            <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-end">
              <Label eyebrow="Plans" id="plans-h" title="Education plans" note="Three tiers, one rule: credits arrive monthly, limits are printed below." />
              <div className="flex lg:justify-end">
                <div role="radiogroup" aria-label="Billing period" className="edu-tabs !gap-6">
                  {(["month", "year"] as const).map((p) => (
                    <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)} className={cn("edu-tab", period === p && "edu-tab-on")} data-testid={`toggle-period-${p}`}>{p === "month" ? "Monthly" : "Yearly"}</button>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
          {cfgErr ? (
            <div role="alert" className="mt-8 rounded-[10px] border border-[#f3c4c0] bg-[#fdf1ef] p-5 text-sm text-[#8f1f1a]">Could not load Education pricing: {cfgErr} <button type="button" onClick={loadConfig} className="ml-2 font-semibold underline">Retry</button></div>
          ) : !config ? (
            <div className="mt-8 grid gap-px overflow-hidden rounded-[14px] border border-[#e7e0d5] bg-[#e7e0d5] md:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="space-y-4 bg-[#fffdf9] p-6"><div className="h-5 w-20 animate-pulse rounded bg-[#ece5da]" /><div className="h-10 w-32 animate-pulse rounded bg-[#ece5da]" />{[0, 1, 2, 3, 4].map((j) => <div key={j} className="h-3 animate-pulse rounded bg-[#efe8dd]" />)}</div>)}</div>
          ) : (
            <>
              {config.enabled && !config.clientToken && <p className="mt-6 rounded-[10px] border border-[#f0dcb4] bg-[#fdf6e7] p-3 text-sm text-[#7a4b0c]">Checkout is not configured right now.</p>}
              {!config.enabled && <p className="mt-6 rounded-[10px] border border-[#f0dcb4] bg-[#fdf6e7] p-3 text-sm text-[#7a4b0c]">Education purchases are temporarily unavailable. Prices are shown for reference.</p>}
              <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-0">
                {config.plans.map((p, idx) => {
                  const current = account?.tier === p.id;
                  const featured = p.id === "pro";
                  const price = period === "month" ? p.monthlyCents : p.yearlyCents;
                  const rows: [string, string][] = [
                    ["Credits / month", p.monthlyCredits.toLocaleString()],
                    ["Pages per PDF", `up to ${p.maxPages}`],
                    ["Quizzes / day", p.quizDailyLimit > 0 ? `${p.quizDailyLimit} included` : "credits"],
                    ["Exam papers / day", p.examDailyLimit > 0 ? `${p.examDailyLimit} included` : "credits"],
                    ["Queue", `${p.queue[0]?.toUpperCase()}${p.queue.slice(1)}`],
                    ["Use", p.commercialUse ? "Commercial allowed" : "Personal study"],
                    ["API keys", p.apiAccess ? "Included" : "No"],
                  ];
                  return (
                    <article key={p.id} className={cn("relative flex flex-col border bg-[#fffdf9] p-6 rounded-[14px] md:rounded-none", featured ? "z-10 border-[#1c1917] shadow-[6px_6px_0_0_#f7433d] md:-my-3 md:rounded-[4px] md:py-9" : "border-[#e7e0d5]", idx === 0 && "md:rounded-l-[14px]", idx === config.plans.length - 1 && "md:rounded-r-[14px]", !featured && idx > 0 && "md:border-l-0", !featured && idx < config.plans.length - 1 && config.plans[idx + 1]?.id === "pro" && "md:border-r-0")} data-testid={`card-plan-${p.id}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="edu-mono text-xs text-[#8a837b]">{String(idx + 1).padStart(2, "0")}</p>
                        {current ? <span className="edu-eyebrow">Current</span> : null}
                      </div>
                      <h3 className="mt-2 font-['Poppins'] text-xl font-semibold text-[#1c1917]">{p.name}</h3>
                      <p className="mt-4 flex items-baseline gap-1.5"><span className="edu-mono text-[2.6rem] font-semibold leading-none tracking-[-0.04em] text-[#1c1917]">{money(price)}</span><span className="text-sm text-[#8a837b]">/ {period}</span></p>
                      <p className="mt-2 min-h-[2.5rem] text-xs leading-relaxed text-[#8a837b]">{period === "year" ? `Billed yearly; ${p.monthlyCredits.toLocaleString()} credits granted each month.` : "Billed monthly."}</p>
                      <dl className="mt-4 flex-1 border-t border-[#1c1917] text-sm">
                        {rows.map(([k, v]) => <div key={k} className="flex items-baseline justify-between gap-3 border-b border-[#efe8dd] py-2"><dt className="text-[#57534e]">{k}</dt><dd className={cn("text-right font-medium", v === "No" ? "text-[#b5aa9b]" : "text-[#1c1917]", /\d/.test(v) && "edu-mono")}>{v}</dd></div>)}
                      </dl>
                      {!authed ? (
                        <Link href="/signin" className={cn(btn, "mt-6", featured ? "bg-[#f7433d] text-white hover:bg-[#c8302a]" : "border border-[#1c1917] text-[#1c1917] hover:bg-[#1c1917] hover:text-[#faf7f2]")}>Sign in to subscribe</Link>
                      ) : subscribed ? (
                        current ? <p className="mt-6 text-center text-sm text-[#8a837b]">Your current plan</p> :
                        account?.canManage ? <button type="button" onClick={portal} disabled={!!busy} className={cn(btn, "mt-6 border border-[#1c1917] text-[#1c1917] hover:bg-[#1c1917] hover:text-[#faf7f2]")}>Change plan in portal</button> :
                        <p className="mt-6 text-center text-sm text-[#8a837b]">Plan changes are not available for this subscription.</p>
                      ) : (
                        <button type="button" onClick={() => checkout({ kind: "plan", id: p.id, period })} disabled={!config.enabled || !!busy} className={cn(btn, "mt-6", featured ? "bg-[#f7433d] text-white hover:bg-[#c8302a]" : "border border-[#1c1917] text-[#1c1917] hover:bg-[#1c1917] hover:text-[#faf7f2]")} data-testid={`button-subscribe-${p.id}`}>
                          {busy === `plan-${p.id}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Get {p.name}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
              <p className="mt-6 text-sm text-[#57534e]" data-testid="text-education-autorenew">Prices in US dollars, before any tax added at checkout. Plans renew automatically every {period === "month" ? "month" : "year"} until you cancel; cancel any time from Manage Education subscription.</p>
              <CheckoutLegalNote provider="paddle" subscription className="mt-2 max-w-3xl" />
            </>
          )}
        </section>

        {config && (
          <EducationCustomTopUp config={config} authed={!!authed} authLoading={authLoading} account={account} accountLoading={accLoading}
            accountError={accErr} busy={busy} onRetryAccount={() => void refresh()} onCheckout={(amountCents) => checkout({ kind: "custom", amountCents })} />
        )}

        {/* Costs */}
        <section aria-labelledby="cost-h" className="grid gap-6 border-b border-[#e7e0d5] py-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Reveal><Label eyebrow="Rates" id="cost-h" title="What a generation costs" note="Pro includes up to 30 quizzes per day before credits are used; Pro exam papers always use credits. Max includes up to 30 quizzes and 10 exam papers per day." /></Reveal>
          <Reveal delay={0.05}>
            <div className="space-y-8">
              {COSTS.map((c) => (
                <table key={c.tool} className="w-full text-left text-sm">
                  <caption className="pb-2 text-left"><Link href={c.href} className="font-['Poppins'] text-base font-semibold text-[#1c1917] underline decoration-[#f7433d]/40 decoration-2 underline-offset-4 hover:decoration-[#f7433d]">{c.tool}</Link></caption>
                  <tbody className="border-t border-[#1c1917]">
                    {c.rows.map(([a, b]) => <tr key={a} className="border-b border-[#efe8dd]"><th scope="row" className="py-2.5 pr-4 font-normal text-[#57534e]">{a}</th><td className="edu-mono whitespace-nowrap py-2.5 text-right font-semibold text-[#1c1917]">{b}</td></tr>)}
                  </tbody>
                </table>
              ))}
              <p className="text-sm text-[#57534e]">Page limits per document: Basic 50 pages (quizzes up to 20 questions), Pro 100 pages, Max 300 pages.</p>
            </div>
          </Reveal>
        </section>

        {/* Policies */}
        <section aria-labelledby="pol-h" className="grid gap-6 py-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Reveal><Label eyebrow="Fine print" id="pol-h" title="Policies" /></Reveal>
          <Reveal delay={0.05}>
            <ol className="border-t border-[#1c1917] text-sm">
              {policies.map(([k, v], i) => (
                <li key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)] border-b border-[#efe8dd] py-3 leading-relaxed text-[#57534e]">
                  <span className="edu-mono text-xs text-[#f7433d] pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                  <p><span className="font-semibold text-[#1c1917]">{k}</span> {v}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* API keys */}
        {authed && account && (
          <section aria-labelledby="api-h" className="grid gap-6 border-t border-[#e7e0d5] py-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <Label eyebrow="Appendix" id="api-h" title="Education API" />
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-[#57534e]">Available on Max. Send your key in the <code className="edu-mono rounded bg-[#efe8dd] px-1">X-Education-API-Key</code> header to the same endpoints the Education tools use, for example <code className="edu-mono rounded bg-[#efe8dd] px-1">POST /api/education/quiz</code>, <code className="edu-mono rounded bg-[#efe8dd] px-1">/api/education/exam-paper</code> and <code className="edu-mono rounded bg-[#efe8dd] px-1">/api/education/notes</code>. Request bodies match what the <Link href="/education/quiz-generator" className="underline">Quiz Generator</Link>, <Link href="/education/exam-paper-generator" className="underline">Exam Paper Generator</Link> and <Link href="/education/notes-maker" className="underline">Notes Maker</Link> send. API calls use the same credits and limits.</p>
              {account.tier !== "max" && <p className="mt-3 text-sm text-[#8a837b]">Your plan does not include API keys. The server will reject key creation unless you are on Max.</p>}
              {newKey && (
                <div className="mt-4 rounded-[10px] border border-[#bcd3c9] bg-[#eef4f1] p-4" data-testid="panel-new-key">
                  <p className="text-sm font-semibold text-[#2f5d50]">Copy this key now. It will not be shown again.</p>
                  <div className="mt-2 flex gap-2"><code className="edu-mono min-w-0 flex-1 break-all rounded-[8px] bg-[#fffdf9] p-2 text-xs">{newKey.key}</code>
                    <button type="button" onClick={() => { void navigator.clipboard.writeText(newKey.key).then(() => setCopied(true)); }} className="inline-flex shrink-0 items-center gap-1 rounded-[8px] bg-[#1c1917] px-3 text-xs font-semibold text-[#faf7f2]" data-testid="button-copy-key"><Copy className="h-3.5 w-3.5" aria-hidden="true" />{copied ? "Copied" : "Copy"}</button></div>
                  <button type="button" onClick={() => setNewKey(null)} className="mt-2 text-xs font-semibold underline">I saved it</button>
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); void addKey(); }} className="mt-5 flex flex-wrap gap-2">
                <label className="min-w-[12rem] flex-1"><span className="sr-only">Key name</span>
                  <input value={keyName} onChange={(e) => setKeyName(e.target.value)} maxLength={60} placeholder="Key name, e.g. course site" className="edu-input" data-testid="input-key-name" /></label>
                <button type="submit" disabled={!keyName.trim() || !!busy} className="edu-btn-ghost" data-testid="button-create-key">{busy === "key-new" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Create key</button>
              </form>
              {account.apiKeys.length > 0 ? (
                <ul className="mt-5 border-t border-[#1c1917] text-sm">
                  {account.apiKeys.map((k) => (
                    <li key={k.id} className="flex items-center justify-between gap-3 border-b border-[#efe8dd] py-2.5">
                      <div><p className="font-medium text-[#1c1917]">{k.name}</p><p className="edu-mono text-xs text-[#8a837b]">Created {fmtDate(k.createdAt)} · Last used {k.lastUsedAt ? fmtDate(k.lastUsedAt) : "never"}</p></div>
                      <button type="button" onClick={() => removeKey(k.id)} disabled={!!busy} className="inline-flex items-center gap-1 text-xs font-semibold text-[#8f1f1a] hover:underline" data-testid={`button-delete-key-${k.id}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Revoke</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-4 text-sm text-[#8a837b]">No API keys yet.</p>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
export default EducationPricingPage;
