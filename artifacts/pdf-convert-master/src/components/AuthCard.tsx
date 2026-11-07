import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Mail, Lock, User, Eye, EyeOff, X, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthResultIcon from "@/components/AuthResultIcon";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { LottieIcon } from "@/components/ui/lottie-icon";
import verifyEmailAnim from "@/assets/lottie/verify-email.json";
import appleUnavailableAnim from "@/assets/lottie/apple-unavailable.json";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { requestGoogleAuthCode } from "@/lib/googleAuth";
import { authEmailSchema, signupInputSchema } from "@/lib/authValidation";
import logoIcon from "@assets/IconOnly_Transparent_NoBuffer_1782108807761.png";
import "@/styles/auth.css";

type Mode = "signin" | "signup";

const REDIRECT_DELAY = 2600;

/* ------------------------------------------------------------------ */
/* Shared shell for every auth screen (sign in, sign up, forgot, reset) */
/* ------------------------------------------------------------------ */

export interface AuthShellProps {
  eyebrow: string;
  heading: ReactNode;
  lede: string;
  steps: string[];
  current: number;
  children: ReactNode;
  onClose?: () => void;
}

export function AuthShell({ eyebrow, heading, lede, steps, current, children, onClose }: AuthShellProps) {
  const [, setLocation] = useLocation();
  const close = onClose ?? (() => setLocation("/"));
  return (
    <div className="auth-root">
      <aside className="auth-aside">
        <Link href="/" className="inline-flex w-fit items-center gap-2.5 rounded-lg" aria-label="PDF Genius home">
          <img src={logoIcon} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="font-['Poppins'] text-[17px] font-semibold tracking-[-0.01em]">PDF Genius</span>
        </Link>
        <div className="max-w-md py-12">
          <p className="edu-eyebrow">{eyebrow}</p>
          <h2 className="mt-4 font-['Poppins'] text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.03em] text-[#1c1917] xl:text-[3rem]">{heading}</h2>
          <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-[#57534e]">{lede}</p>
          <ol className="auth-ledger mt-10" aria-label="Steps">
            {steps.map((s, i) => (
              <li key={s} data-state={i < current ? "done" : i === current ? "current" : "todo"} aria-current={i === current ? "step" : undefined}>
                <span className="edu-mono w-7 text-xs text-[#c8302a]">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <p className="edu-mono text-xs text-[#8a837b]">pdfgenius.app</p>
      </aside>

      <main className="auth-main">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg lg:invisible" aria-label="PDF Genius home" data-testid="link-auth-logo">
            <img src={logoIcon} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-['Poppins'] text-[15px] font-semibold">PDF Genius</span>
          </Link>
          <button type="button" onClick={close} className="auth-icon-btn" aria-label="Close and return home" data-testid="button-auth-close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-1 items-center py-6">{children}</div>
      </main>
    </div>
  );
}

export function AuthMessage({ kind, children, testId }: { kind: "error" | "info"; children: ReactNode; testId?: string }) {
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`auth-msg ${kind === "error" ? "auth-msg-error" : "auth-msg-info"}`} data-testid={testId}>
      {children}
    </p>
  );
}

function SheetHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <p className="edu-eyebrow">{eyebrow}</p>
      <h1 className="mt-2 font-['Poppins'] text-[1.65rem] font-semibold leading-tight tracking-[-0.02em] text-[#1c1917]">{title}</h1>
      {sub ? <p className="mt-2 text-[15px] leading-relaxed text-[#57534e]">{sub}</p> : null}
    </div>
  );
}

const Spin = ({ label }: { label: string }) => (
  <span className="inline-flex items-center justify-center gap-2">
    <ProcessingSpinner size={18} tone="light" />
    {label}
  </span>
);

/* ------------------------------------------------------------------ */

export function AuthCard({ mode }: { mode: Mode }) {
  const [, setLocation] = useLocation();
  const { signin, signup, verifySignupOtp, googleSignin, user, isAuthenticated, loading } = useAuth();

  const [step, setStep] = useState<"email" | "credentials" | "otp">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  // Signup only: required Terms of Service + Privacy Policy acceptance.
  const [agreed, setAgreed] = useState(false);
  const termsGate = () => {
    if (mode === "signup" && !agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy to create an account.");
      return false;
    }
    return true;
  };
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [result, setResult] = useState<
    "signin-success" | "signup-success" | "error" | "unavailable" | null
  >(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const copy = useMemo(
    () =>
      mode === "signin"
        ? {
            cta: "Sign In",
            switchPrompt: "Don't have an account?",
            switchAction: "Sign Up",
            switchRoute: "/signup",
          }
        : {
            cta: "Create Account",
            switchPrompt: "Already have an account?",
            switchAction: "Sign In",
            switchRoute: "/signin",
          },
    [mode],
  );

  // Bounce an already-signed-in visitor to their dashboard home, but never
  // mid-submit or while the welcome animation is playing.
  useEffect(() => {
    if (isAuthenticated && !loading && !isSubmitting && !result) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, isSubmitting, result, setLocation]);

  const close = () => setLocation("/");

  const social = (_provider: string) => {
    setError(null);
    setInfo(null);
    setResult("unavailable");
  };

  // Real Google sign-in: open the Google popup, exchange the code for a session,
  // then play the same welcome/redirect flow email login uses.
  const handleGoogle = async () => {
    if (isSubmitting) return;
    setError(null);
    setInfo(null);
    if (!termsGate()) return;
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
    setIsSubmitting(true);
    try {
      const code = await requestGoogleAuthCode();
      const res = await googleSignin(code, mode === "signup" && agreed);
      if (res.success) {
        setResult(res.isNewUser ? "signup-success" : "signin-success");
        redirectTimer.current = setTimeout(() => setLocation("/dashboard"), REDIRECT_DELAY);
      } else {
        setResult("error");
        setError(res.error || "Google sign-in failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueWithEmail = () => {
    setError(null);
    setInfo(null);
    if (!termsGate()) return;
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    const parsedEmail = authEmailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setError("Please enter a valid email address");
      return;
    }
    setEmail(parsedEmail.data);
    setStep("credentials");
  };

  const submit = async () => {
    setError(null);
    setInfo(null);

    const parsedEmail = authEmailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setStep("email");
      setError("Please enter a valid email address");
      return;
    }
    setEmail(parsedEmail.data);

    if (mode === "signup") {
      if (!termsGate()) return;
      if (!name.trim() || !password || !confirmPassword) {
        setError("Please fill in all fields");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      const input = signupInputSchema.safeParse({ email: parsedEmail.data, password, name });
      if (!input.success) {
        setError(input.error.issues[0].message);
        return;
      }
    } else if (!password) {
      setError("Please enter your password");
      return;
    }

    if (redirectTimer.current) clearTimeout(redirectTimer.current);
    setIsSubmitting(true);
    try {
      const res =
        mode === "signup" ? await signup(parsedEmail.data, password, name) : await signin(parsedEmail.data, password);
      if (res.success) {
        if (mode === "signup") {
          // Account isn't created yet — move to the email-verification step.
          setCode("");
          setStep("otp");
          setInfo("We sent a 6-digit code to your email.");
        } else {
          setResult("signin-success");
          redirectTimer.current = setTimeout(() => setLocation("/dashboard"), REDIRECT_DELAY);
        }
      } else {
        setResult("error");
        setError(res.error || (mode === "signup" ? "Sign up failed" : "Sign in failed"));
      }
    } catch {
      setResult("error");
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 of signup: confirm the emailed code. Success creates the account and
  // logs the user in, so we play the same welcome animation as a normal sign-up.
  const verifyCode = async () => {
    setError(null);
    setInfo(null);
    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
    setIsSubmitting(true);
    try {
      const res = await verifySignupOtp(email, code);
      if (res.success) {
        setResult("signup-success");
        redirectTimer.current = setTimeout(() => setLocation("/dashboard"), REDIRECT_DELAY);
      } else {
        setError(res.error || "Invalid or expired code");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-run step 1, which regenerates and re-emails the code (we still hold the
  // name/password in component state).
  const resendCode = async () => {
    setError(null);
    setInfo(null);
    setIsSubmitting(true);
    try {
      const res = await signup(email, password, name);
      if (res.success) {
        setCode("");
        setInfo("We sent you a new code.");
      } else {
        setError(res.error || "Could not resend the code");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dismissError = () => {
    setResult(null);
    setError(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isSubmitting) return;
      if (step === "email") continueWithEmail();
      else if (step === "otp") verifyCode();
      else submit();
    }
  };

  // Successful auth — full-screen welcome that greets the user by name.
  if (result === "signin-success" || result === "signup-success") {
    const firstName = user?.name?.trim().split(" ")[0] || user?.email?.split("@")[0] || "";
    const title =
      result === "signup-success"
        ? firstName
          ? `Welcome, ${firstName}!`
          : "Welcome!"
        : firstName
          ? `Welcome back, ${firstName}!`
          : "Welcome back!";
    return (
      <div className="auth-root place-items-center p-6" data-testid="view-welcome">
        <div className="flex flex-col items-center text-center">
          <AuthResultIcon kind={result === "signup-success" ? "signup" : "welcome"} size={300} loop={false} />
          <p className="edu-eyebrow mt-2">{result === "signup-success" ? "Account created" : "Signed in"}</p>
          <h1 className="mt-3 font-['Poppins'] text-[2rem] font-semibold tracking-[-0.02em] text-[#1c1917]">{title}</h1>
          <p className="mt-2 text-[15px] text-[#57534e]">Taking you to your dashboard…</p>
          <div className="mt-6 h-px w-40 overflow-hidden bg-[#e7e0d5]" aria-hidden="true">
            <div className="edu-indeterminate h-full w-1/3 bg-[#f7433d]" />
          </div>
        </div>
      </div>
    );
  }

  const steps = mode === "signin" ? ["Your email", "Your password", "Dashboard"] : ["Your email", "Name and password", "Verify email", "Dashboard"];
  const current = step === "email" ? 0 : step === "credentials" ? 1 : 2;
  const shell = {
    eyebrow: mode === "signin" ? "Sign in" : "Create an account",
    heading: mode === "signin" ? <>Pick up where<br />you left off.</> : <>One account for<br />every tool.</>,
    lede:
      mode === "signin"
        ? "Sign in with Google or your email to reach your dashboard."
        : "Start with your email. We will send a 6-digit code to confirm it before the account is created.",
    steps,
    current,
    onClose: close,
  };

  // Email-verification step — shown after credentials are submitted on sign-up.
  if (step === "otp") {
    return (
      <AuthShell {...shell}>
        <div className="auth-sheet" data-testid="view-otp">
          <div className="mb-2 -ml-2">
            <LottieIcon animationData={verifyEmailAnim} size={72} loop autoplay />
          </div>
          <SheetHeader
            eyebrow="Step 3 of 4"
            title="Verify your email"
            sub={<>Enter the 6-digit code we sent to <span className="font-semibold text-[#1c1917] break-all">{email}</span></>}
          />
          <div className="flex justify-start" onKeyDown={onKeyDown}>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => setCode(v.replace(/\D/g, ""))}
              containerClassName="gap-2"
              aria-label="6-digit verification code"
              data-testid="input-otp"
            >
              <InputOTPGroup className="gap-1.5 sm:gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="auth-otp-slot" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="mt-4 space-y-2">
            {error ? <AuthMessage kind="error" testId="text-error">{error}</AuthMessage> : null}
            {info ? <AuthMessage kind="info" testId="text-info">{info}</AuthMessage> : null}
          </div>

          <button type="button" onClick={verifyCode} disabled={isSubmitting || code.length !== 6} className="edu-btn-primary mt-5 w-full" data-testid="button-verify-otp">
            {isSubmitting ? <Spin label="Verifying..." /> : "Verify & Create Account"}
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[14px]">
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setError(null);
                setInfo(null);
              }}
              className="auth-link text-[#57534e]"
              data-testid="button-back-to-credentials"
            >
              <ArrowLeft className="auth-nudge auth-nudge-l h-4 w-4" aria-hidden="true" />
              Back
            </button>
            <span className="text-[#57534e]">
              Didn&apos;t get a code?{" "}
              <button type="button" onClick={resendCode} disabled={isSubmitting} className="auth-link" data-testid="button-resend-otp">
                Resend
              </button>
            </span>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell {...shell}>
      <div className="auth-sheet">
        {result === "unavailable" ? (
          <div className="flex flex-col items-start" data-testid="view-auth-unavailable">
            <LottieIcon animationData={appleUnavailableAnim} size={110} loop autoplay />
            <SheetHeader eyebrow="Apple" title="Apple sign-in unavailable" sub="Apple sign-in isn't available yet. Please continue with your email or Google instead." />
            <button type="button" onClick={dismissError} className="edu-btn-primary w-full" data-testid="button-unavailable-ok">
              Got it
            </button>
          </div>
        ) : result === "error" ? (
          <div className="flex flex-col items-start" data-testid="view-auth-error">
            <AuthResultIcon kind="error" size={110} loop={false} />
            <SheetHeader eyebrow="Something went wrong" title={mode === "signup" ? "Sign up failed" : "Sign in failed"} />
            {error ? <div className="-mt-3 mb-6 w-full"><AuthMessage kind="error">{error}</AuthMessage></div> : null}
            <button type="button" onClick={dismissError} className="edu-btn-primary w-full" data-testid="button-try-again">
              Try Again
            </button>
          </div>
        ) : (
          <>
            <SheetHeader
              eyebrow={`Step ${current + 1} of ${steps.length}`}
              title={mode === "signin" ? "Sign in to PDF Genius" : "Create your account"}
              sub={
                <>
                  {copy.switchPrompt}{" "}
                  <button type="button" onClick={() => setLocation(copy.switchRoute)} className="auth-link" data-testid="link-switch-mode">
                    {copy.switchAction}
                  </button>
                </>
              }
            />

            {/* Providers */}
            <div className="space-y-2.5">
              <button type="button" onClick={handleGoogle} disabled={isSubmitting} className="auth-provider" data-testid="button-google">
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
                <ArrowRight className="auth-arrow" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => social("Apple")} className="auth-provider" data-testid="button-apple">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1c1917" aria-hidden="true">
                  <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.78 1.3 10.32.86 1.24 1.89 2.64 3.23 2.59 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.27 3.13-2.52.99-1.44 1.4-2.84 1.42-2.91-.03-.01-2.72-1.04-2.75-4.13zM14.54 4.4c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z" />
                </svg>
                Continue with Apple
                <ArrowRight className="auth-arrow" aria-hidden="true" />
              </button>
            </div>

            <p className="auth-rule my-5 edu-mono text-[11px] uppercase tracking-[0.14em]">or with email</p>

            <div className="space-y-3">
              <div>
                <label htmlFor="auth-email" className="edu-label mb-1.5">Email</label>
                <div className="auth-field" data-locked={step === "credentials"}>
                  <Mail className="auth-ico" aria-hidden="true" />
                  <input
                    id="auth-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    disabled={step === "credentials"}
                    data-testid="input-email"
                  />
                  {step === "credentials" ? (
                    <button type="button" onClick={() => setStep("email")} className="auth-link text-[13px] text-[#c8302a]" data-testid="button-edit-email">
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Credentials step (progressive) */}
              {step === "credentials" ? (
                <>
                  {mode === "signup" ? (
                    <div>
                      <label htmlFor="auth-name" className="edu-label mb-1.5">Full name</label>
                      <div className="auth-field">
                        <User className="auth-ico" aria-hidden="true" />
                        <input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKeyDown} placeholder="Full name" autoComplete="name" autoFocus data-testid="input-full-name" />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className="mb-1.5 flex items-end justify-between">
                      <label htmlFor="auth-password" className="edu-label">Password</label>
                      {mode === "signin" ? (
                        <button type="button" onClick={() => setLocation("/forgot-password")} className="auth-link !min-h-0 text-[13px] text-[#57534e]" data-testid="link-forgot-password">
                          Forgot password?
                        </button>
                      ) : null}
                    </div>
                    <div className="auth-field">
                      <Lock className="auth-ico" aria-hidden="true" />
                      <input
                        id="auth-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={mode === "signup" ? "At least 6 characters" : "Password"}
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        autoFocus={mode === "signin"}
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="auth-icon-btn -mr-2 !h-10 !w-10"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {mode === "signup" ? (
                    <div>
                      <label htmlFor="auth-confirm" className="edu-label mb-1.5">Confirm password</label>
                      <div className="auth-field">
                        <Lock className="auth-ico" aria-hidden="true" />
                        <input
                          id="auth-confirm"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyDown={onKeyDown}
                          placeholder="Repeat password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          data-testid="input-confirm-password"
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              {error ? <AuthMessage kind="error" testId="text-error">{error}</AuthMessage> : null}
              {info ? <AuthMessage kind="info" testId="text-info">{info}</AuthMessage> : null}
            </div>

            <button
              type="button"
              onClick={step === "email" ? continueWithEmail : submit}
              disabled={isSubmitting}
              className="edu-btn-primary group mt-4 w-full"
              data-testid={step === "email" ? "button-continue" : "button-submit"}
            >
              {step === "email" ? (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </>
              ) : isSubmitting ? (
                <Spin label={mode === "signup" ? "Creating account..." : "Signing in..."} />
              ) : (
                copy.cta
              )}
            </button>

            {mode === "signup" ? (
              <label htmlFor="auth-agree" className="mt-6 flex cursor-pointer items-start gap-3 border-t border-[#efe8dd] pt-4 text-[13px] leading-5 text-[#57534e]">
                <input
                  id="auth-agree"
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setError(null); }}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#f7433d]"
                  data-testid="checkbox-agree-terms"
                />
                <span>
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener" className="font-semibold text-[#1c1917] underline decoration-[#d9d0c3] underline-offset-2 hover:decoration-[#f7433d]" data-testid="link-terms">Terms of Service</a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-[#1c1917] underline decoration-[#d9d0c3] underline-offset-2 hover:decoration-[#f7433d]" data-testid="link-privacy">Privacy Policy</a>
                </span>
              </label>
            ) : (
              <p className="mt-6 border-t border-[#efe8dd] pt-4 text-xs leading-[18px] text-[#57534e]">
                By continuing I agree to the{" "}
                <button type="button" onClick={() => setLocation("/terms")} className="font-semibold text-[#1c1917] underline decoration-[#d9d0c3] underline-offset-2 hover:decoration-[#f7433d]" data-testid="link-terms">
                  Terms
                </button>{" "}
                &{" "}
                <button type="button" onClick={() => setLocation("/privacy")} className="font-semibold text-[#1c1917] underline decoration-[#d9d0c3] underline-offset-2 hover:decoration-[#f7433d]" data-testid="link-privacy">
                  Privacy Policy
                </button>
                .
              </p>
            )}
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default AuthCard;
