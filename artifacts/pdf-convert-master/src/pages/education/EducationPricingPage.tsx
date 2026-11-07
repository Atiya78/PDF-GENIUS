import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Check, ChevronRight, Copy, KeyRound, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EducationCustomTopUp } from "@/components/education/EducationCustomTopUp";
import { useSeo } from "@/lib/useSeo";
import { cn } from "@/lib/utils";
import {
  type EduBillingConfig, type EduPeriod, type EducationCheckoutInput, createApiKey, deleteApiKey, fmtDate, getBillingConfig, getCheckoutStatus,
  loadPaddle, money, openPaddleCheckout, openPortal, setPaddleEventHandler, startCheckout, useEducationAccount,
} from "@/lib/education/billing";

const RED = "#f7433d";

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
  const btn = "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:opacity-50";

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#fff7f6] to-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">Home</Link><ChevronRight className="h-4 w-4" aria-hidden="true" />
          <Link href="/education" className="hover:text-gray-900">Education Zone</Link><ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span aria-current="page" className="font-medium text-gray-900">Education plans</span>
        </nav>

        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9322c]">Education Zone billing</p>
          <h1 className="mt-2 font-['Poppins'] text-4xl font-bold text-gray-900 sm:text-5xl" data-testid="text-education-pricing-title">Study credits, priced in plain numbers.</h1>
          <p className="mt-3 text-lg text-gray-600">These plans cover the Education Zone only: quizzes, exam papers, notes and other study tools built from your own PDFs. They are separate from the PDF Genius website plans on the <Link href="/pricing" className="font-semibold text-gray-900 underline">main pricing page</Link>, which are billed differently and do not include Education credits.</p>
        </header>

        {paddleErr && <p role="alert" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" data-testid="status-paddle-error">{paddleErr}</p>}
        {txn && (
          <div role="status" className={cn("mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm", txnState === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : txnState === "canceled" || txnState === "error" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-gray-200 bg-white text-gray-700")} data-testid="status-checkout">
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
        <section aria-labelledby="acct-h" className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="acct-h" className="font-['Poppins'] text-xl font-bold text-gray-900">Your Education account</h2>
            {authed && <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900" data-testid="button-refresh-account"><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</button>}
          </div>
          {authLoading || (authed && accLoading && !account) ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}</div>
          ) : !authed ? (
            <p className="mt-3 text-gray-600">Sign in to buy a plan or credits and see your credit balance. Without an account you can still use {pol ? pol.freeGenerationsPerDay : "the"} free Education generations per day.{" "}
              <Link href="/signin" className="font-semibold text-[#d9322c] underline">Sign in</Link></p>
          ) : accErr && !account ? (
            <div className="mt-3 text-sm text-[#b42318]">Could not load your Education account: {accErr} <button type="button" onClick={() => void refresh()} className="ml-2 font-semibold underline">Retry</button></div>
          ) : account && (
            <>
              <dl className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                  ["Plan", account.tier === "none" ? "No plan" : `${account.tier[0].toUpperCase()}${account.tier.slice(1)}${account.billingPeriod ? ` (${account.billingPeriod}ly)` : ""}`],
                  ["Balance", `${account.balance.toLocaleString()} credits`],
                  ["From plan / purchased", `${account.includedCredits.toLocaleString()} / ${account.purchasedCredits.toLocaleString()}`],
                  ["Used today", `${account.usage.quiz} quiz, ${account.usage.exam} exam`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-[#fff7f6] p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{k}</dt><dd className="mt-1 font-semibold tabular-nums text-gray-900">{v}</dd></div>
                ))}
              </dl>
              <div className="mt-4 grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
                <p>Status: <span className="font-medium text-gray-900">{account.status}</span></p>
                <p>Paid period ends: <span className="font-medium text-gray-900">{fmtDate(account.periodEnd)}</span></p>
                <p>Next monthly grant: <span className="font-medium text-gray-900">{fmtDate(account.nextGrantAt)}</span></p>
              </div>
              {account.lots.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <h3 className="text-sm font-semibold text-gray-900">Credit lots and expiry</h3>
                  <table className="mt-2 w-full text-left text-sm"><thead className="text-gray-500"><tr><th className="py-1.5 font-medium">Source</th><th className="font-medium">Credits</th><th className="font-medium">Expires</th></tr></thead>
                    <tbody>{account.lots.map((l, i) => <tr key={i} className="border-t border-gray-100"><td className="py-1.5 capitalize">{l.kind}</td><td className="tabular-nums">{l.credits.toLocaleString()}</td><td>{fmtDate(l.expiresAt)}</td></tr>)}</tbody></table>
                </div>
              )}
              {account.canManage && (
                <button type="button" onClick={portal} disabled={busy === "portal"} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-gray-300 px-5 text-sm font-semibold text-gray-900 hover:border-gray-900" data-testid="button-manage-subscription">
                  {busy === "portal" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Manage Education subscription
                </button>
              )}
            </>
          )}
          {actionErr && <p role="alert" className="mt-4 text-sm text-[#b42318]">{actionErr}</p>}
        </section>

        {/* Plans */}
        <section aria-labelledby="plans-h" className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="plans-h" className="font-['Poppins'] text-2xl font-bold text-gray-900">Education plans</h2>
            <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full bg-white p-1 ring-1 ring-gray-200">
              {(["month", "year"] as const).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", period === p ? "bg-gray-900 text-white" : "text-gray-600")} data-testid={`toggle-period-${p}`}>{p === "month" ? "Monthly" : "Yearly"}</button>
              ))}
            </div>
          </div>
          {cfgErr ? (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-[#b42318]">Could not load Education pricing: {cfgErr} <button type="button" onClick={loadConfig} className="ml-2 font-semibold underline">Retry</button></div>
          ) : !config ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-96 animate-pulse rounded-3xl bg-gray-100" />)}</div>
          ) : (
            <>
              {config.enabled && !config.clientToken && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Checkout is not configured right now.</p>}
              {!config.enabled && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Education purchases are temporarily unavailable. Prices are shown for reference.</p>}
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {config.plans.map((p) => {
                  const current = account?.tier === p.id;
                  const featured = p.id === "pro";
                  const price = period === "month" ? p.monthlyCents : p.yearlyCents;
                  return (
                    <article key={p.id} className={cn("flex flex-col rounded-3xl bg-white p-6 ring-1", featured ? "ring-2 ring-[#f7433d] shadow-lg shadow-[#f7433d]/10" : "ring-gray-200")} data-testid={`card-plan-${p.id}`}>
                      <div className="flex items-center justify-between"><h3 className="font-['Poppins'] text-xl font-bold text-gray-900">{p.name}</h3>{current && <span className="rounded-full bg-[#fff1f0] px-2.5 py-0.5 text-xs font-semibold text-[#d9322c]">Current</span>}</div>
                      <p className="mt-3"><span className="font-['Poppins'] text-4xl font-bold tabular-nums text-gray-900">{money(price)}</span><span className="text-gray-500"> / {period}</span></p>
                      {period === "year" && <p className="text-xs text-gray-500">Billed yearly; {p.monthlyCredits.toLocaleString()} credits granted each month.</p>}
                      <ul className="mt-5 flex-1 space-y-2 text-sm text-gray-700">
                        {[
                          `${p.monthlyCredits.toLocaleString()} Education credits per month`,
                          `PDFs up to ${p.maxPages} pages`,
                          p.quizDailyLimit > 0 ? `${p.quizDailyLimit} quizzes per day included` : "Quizzes paid with credits",
                          p.examDailyLimit > 0 ? `${p.examDailyLimit} exam papers per day included` : "Exam papers paid with credits",
                          `${p.queue[0]?.toUpperCase()}${p.queue.slice(1)} processing queue`,
                          p.commercialUse ? "Commercial use allowed" : "Personal study use",
                          ...(p.apiAccess ? ["Education API keys"] : []),
                        ].map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: RED }} aria-hidden="true" />{f}</li>)}
                      </ul>
                      {!authed ? (
                        <Link href="/signin" className={cn(btn, "mt-6 bg-gray-900 text-white hover:bg-gray-800")}>Sign in to subscribe</Link>
                      ) : subscribed ? (
                        current ? <p className="mt-6 text-center text-sm text-gray-500">Your current plan</p> :
                        account?.canManage ? <button type="button" onClick={portal} disabled={!!busy} className={cn(btn, "mt-6 border border-gray-300 text-gray-900 hover:border-gray-900")}>Change plan in portal</button> :
                        <p className="mt-6 text-center text-sm text-gray-500">Plan changes are not available for this subscription.</p>
                      ) : (
                        <button type="button" onClick={() => checkout({ kind: "plan", id: p.id, period })} disabled={!config.enabled || !!busy} className={cn(btn, "mt-6 text-white", featured ? "bg-[#f7433d] hover:bg-[#e03832]" : "bg-gray-900 hover:bg-gray-800")} data-testid={`button-subscribe-${p.id}`}>
                          {busy === `plan-${p.id}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Get {p.name}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>

              <EducationCustomTopUp config={config} authed={!!authed} authLoading={authLoading} account={account} accountLoading={accLoading}
                accountError={accErr} busy={busy} onRetryAccount={() => void refresh()} onCheckout={(amountCents) => checkout({ kind: "custom", amountCents })} />
            </>
          )}
        </section>

        {/* Costs & policies */}
        <section aria-labelledby="cost-h" className="mt-14 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 id="cost-h" className="font-['Poppins'] text-2xl font-bold text-gray-900">What a generation costs</h2>
            <div className="mt-4 space-y-4">
              {COSTS.map((c) => (
                <div key={c.tool} className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
                  <Link href={c.href} className="font-semibold text-gray-900 underline decoration-[#f7433d]/40 underline-offset-4">{c.tool}</Link>
                  <dl className="mt-3 space-y-1.5 text-sm">{c.rows.map(([a, b]) => <div key={a} className="flex justify-between gap-4"><dt className="text-gray-600">{a}</dt><dd className="shrink-0 font-semibold tabular-nums text-gray-900">{b}</dd></div>)}</dl>
                </div>
              ))}
              <p className="text-sm text-gray-600">Pro includes up to 30 quizzes per day before credits are used; Pro exam papers always use credits. Max includes up to 30 quizzes and 10 exam papers per day. Page limits per document: Basic 50 pages (quizzes up to 20 questions), Pro 100 pages, Max 300 pages.</p>
            </div>
          </div>
          <div>
            <h2 className="font-['Poppins'] text-2xl font-bold text-gray-900">Policies</h2>
            <ul className="mt-4 space-y-3 rounded-2xl bg-white p-5 text-sm text-gray-700 ring-1 ring-gray-200">
              <li><span className="font-semibold text-gray-900">Monthly credits</span> {pol?.monthlyCreditsRollover === false ? "do not roll over." : "roll over month to month but expire at the end of your paid subscription period. Yearly plans receive their credits monthly, not all at once."} Exact expiry dates for your credits are listed in your account above.</li>
              <li><span className="font-semibold text-gray-900">Rollover is limited:</span> unused plan credits carry over only within the billing period you have already paid for. Purchased credits are tracked separately.</li>
              <li><span className="font-semibold text-gray-900">Purchased credits</span> expire {pol?.purchasedExpiryMonths ?? 12} months after purchase.</li>
              <li><span className="font-semibold text-gray-900">Other study tools</span> (notes, summaries, flashcards, mind maps, Ask PDF, translation) stay free for {pol?.freeGenerationsPerDay ?? 5} generations per day, then use {pol?.otherToolsCredits ?? 1} Education credit each.</li>
              <li><span className="font-semibold text-gray-900">Queue speed</span> labels describe priority only; processing times are not guaranteed.</li>
              <li><span className="font-semibold text-gray-900">No unlimited usage.</span> Every plan has the credit and daily limits shown on this page.</li>
              <li><span className="font-semibold text-gray-900">Separate from website plans.</span> Education payments are processed by Paddle and do not change your PDF Genius website subscription.</li>
            </ul>
          </div>
        </section>

        {/* API keys */}
        {authed && account && (
          <section aria-labelledby="api-h" className="mt-14 rounded-3xl border border-gray-200 bg-white p-5 sm:p-7">
            <h2 id="api-h" className="flex items-center gap-2 font-['Poppins'] text-2xl font-bold text-gray-900"><KeyRound className="h-5 w-5" aria-hidden="true" />Education API</h2>
            <p className="mt-2 text-sm text-gray-600">Available on Max. Send your key in the <code className="rounded bg-gray-100 px-1">X-Education-API-Key</code> header to the same endpoints the Education tools use, for example <code className="rounded bg-gray-100 px-1">POST /api/education/quiz</code>, <code className="rounded bg-gray-100 px-1">/api/education/exam-paper</code> and <code className="rounded bg-gray-100 px-1">/api/education/notes</code>. Request bodies match what the <Link href="/education/quiz-generator" className="underline">Quiz Generator</Link>, <Link href="/education/exam-paper-generator" className="underline">Exam Paper Generator</Link> and <Link href="/education/notes-maker" className="underline">Notes Maker</Link> send. API calls use the same credits and limits.</p>
            {account.tier !== "max" && <p className="mt-3 text-sm text-gray-500">Your plan does not include API keys. The server will reject key creation unless you are on Max.</p>}
            {newKey && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" data-testid="panel-new-key">
                <p className="text-sm font-semibold text-emerald-900">Copy this key now. It will not be shown again.</p>
                <div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white p-2 text-xs">{newKey.key}</code>
                  <button type="button" onClick={() => { void navigator.clipboard.writeText(newKey.key).then(() => setCopied(true)); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white" data-testid="button-copy-key"><Copy className="h-3.5 w-3.5" aria-hidden="true" />{copied ? "Copied" : "Copy"}</button></div>
                <button type="button" onClick={() => setNewKey(null)} className="mt-2 text-xs font-semibold underline">I saved it</button>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); void addKey(); }} className="mt-4 flex flex-wrap gap-2">
              <label className="flex-1"><span className="sr-only">Key name</span>
                <input value={keyName} onChange={(e) => setKeyName(e.target.value)} maxLength={60} placeholder="Key name, e.g. course site" className="h-10 w-full rounded-full border border-gray-300 px-4 text-sm focus:border-[#f7433d] focus:outline-none" data-testid="input-key-name" /></label>
              <button type="submit" disabled={!keyName.trim() || !!busy} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gray-900 px-5 text-sm font-semibold text-white disabled:opacity-50" data-testid="button-create-key">{busy === "key-new" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Create key</button>
            </form>
            {account.apiKeys.length > 0 ? (
              <ul className="mt-4 divide-y divide-gray-100 text-sm">
                {account.apiKeys.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div><p className="font-medium text-gray-900">{k.name}</p><p className="text-xs text-gray-500">Created {fmtDate(k.createdAt)} · Last used {k.lastUsedAt ? fmtDate(k.lastUsedAt) : "never"}</p></div>
                    <button type="button" onClick={() => removeKey(k.id)} disabled={!!busy} className="inline-flex items-center gap-1 text-xs font-semibold text-[#b42318] hover:underline" data-testid={`button-delete-key-${k.id}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Revoke</button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 text-sm text-gray-500">No API keys yet.</p>}
          </section>
        )}
      </div>
    </div>
  );
}
export default EducationPricingPage;
