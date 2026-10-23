import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, User, Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthResultIcon from "@/components/AuthResultIcon";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { LottieIcon } from "@/components/ui/lottie-icon";
import verifyEmailAnim from "@/assets/lottie/verify-email.json";
import appleUnavailableAnim from "@/assets/lottie/apple-unavailable.json";
import { SIGN_UP_XML } from "@/lib/signUpIcon";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { requestGoogleAuthCode } from "@/lib/googleAuth";
import { authEmailSchema, signupInputSchema } from "@/lib/authValidation";

type Mode = "signin" | "signup";

// This auth screen is intentionally dark (matches the mobile design), independent
// of the otherwise light web theme.
const SHEET = {
  bg: "#171c28",
  field: "#1f2533",
  border: "#2c3344",
  text: "#f8fafc",
  muted: "#9aa4b6",
  primary: "#f7433d",
  error: "#fda4a1",
};

const REDIRECT_DELAY = 2600;

export function AuthCard({ mode }: { mode: Mode }) {
  const [, setLocation] = useLocation();
  const { signin, signup, verifySignupOtp, googleSignin, user, isAuthenticated, loading } = useAuth();

  const [step, setStep] = useState<"email" | "credentials" | "otp">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
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
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
    setIsSubmitting(true);
    try {
      const code = await requestGoogleAuthCode();
      const res = await googleSignin(code);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6" data-testid="view-welcome">
        <AuthResultIcon
          kind={result === "signup-success" ? "signup" : "welcome"}
          size={360}
          loop={false}
          className="mb-2"
        />
        <h1 className="text-3xl font-bold text-gray-900 text-center" style={{ fontFamily: "Poppins, sans-serif" }}>
          {title}
        </h1>
        <p className="text-[15px] text-gray-500 mt-1.5 text-center">Taking you home…</p>
      </div>
    );
  }

  const fieldClass =
    "flex items-center gap-2.5 h-[54px] px-4 rounded-[14px] border";

  // Email-verification step — shown after credentials are submitted on sign-up.
  if (step === "otp") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(160deg,#0b1220 0%,#11172480 60%,#0b1220 100%)" }}
      >
        <div
          className="w-full max-w-[460px] rounded-[26px] p-[22px] flex flex-col gap-3 shadow-2xl"
          style={{ backgroundColor: SHEET.bg }}
          data-testid="view-otp"
        >
          <div className="relative flex items-center justify-center mb-0.5">
            <span className="text-sm font-semibold" style={{ color: SHEET.text }}>
              Verify your email
            </span>
            <button
              type="button"
              onClick={close}
              className="absolute right-0 p-1 transition-opacity hover:opacity-70"
              aria-label="Close"
              data-testid="button-auth-close"
            >
              <X className="w-5 h-5" style={{ color: SHEET.muted }} />
            </button>
          </div>

          <div className="flex items-center justify-center mt-1 mb-1">
            <LottieIcon animationData={verifyEmailAnim} size={96} loop autoplay />
          </div>

          <p className="text-[15px] text-center leading-6" style={{ color: SHEET.muted }}>
            Enter the 6-digit code we sent to{" "}
            <span style={{ color: SHEET.text }}>{email}</span>
          </p>

          <div className="flex justify-center my-2">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => setCode(v.replace(/\D/g, ""))}
              containerClassName="gap-2"
              data-testid="input-otp"
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-[52px] w-[44px] rounded-[12px] border-0 text-lg font-semibold"
                    style={{ backgroundColor: SHEET.field, color: SHEET.text }}
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error ? (
            <p className="text-[13px] text-center" style={{ color: SHEET.error }} data-testid="text-error">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-[13px] text-center" style={{ color: SHEET.muted }} data-testid="text-info">
              {info}
            </p>
          ) : null}

          <button
            type="button"
            onClick={verifyCode}
            disabled={isSubmitting || code.length !== 6}
            className="h-[54px] rounded-[14px] mt-1 font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
            style={{ backgroundColor: SHEET.primary }}
            data-testid="button-verify-otp"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <ProcessingSpinner size={18} tone="light" />
                Verifying...
              </span>
            ) : (
              "Verify & Create Account"
            )}
          </button>

          <div className="flex justify-center items-center mt-1">
            <span className="text-[13px]" style={{ color: SHEET.muted }}>
              Didn&apos;t get a code?
            </span>
            <button
              type="button"
              onClick={resendCode}
              disabled={isSubmitting}
              className="text-[13px] font-semibold ml-1 disabled:opacity-60"
              style={{ color: SHEET.primary }}
              data-testid="button-resend-otp"
            >
              Resend
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setError(null);
              setInfo(null);
            }}
            className="text-[13px] font-semibold self-center"
            style={{ color: SHEET.muted }}
            data-testid="button-back-to-credentials"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg,#0b1220 0%,#11172480 60%,#0b1220 100%)" }}
    >
      <div
        className="w-full max-w-[460px] rounded-[26px] p-[22px] flex flex-col gap-3 shadow-2xl"
        style={{ backgroundColor: SHEET.bg }}
      >
        {result === "unavailable" ? (
          <div className="flex flex-col items-center justify-center py-5 gap-1.5" data-testid="view-auth-unavailable">
            <LottieIcon animationData={appleUnavailableAnim} size={150} loop autoplay />
            <h2 className="text-xl font-bold mt-1" style={{ color: SHEET.text, fontFamily: "Poppins, sans-serif" }}>
              Apple sign-in unavailable
            </h2>
            <p className="text-sm text-center leading-5" style={{ color: SHEET.muted }}>
              Apple sign-in isn't available yet. Please continue with your email or Google instead.
            </p>
            <button
              type="button"
              onClick={dismissError}
              className="self-stretch h-[54px] rounded-[14px] mt-4 font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
              style={{ backgroundColor: SHEET.primary }}
              data-testid="button-unavailable-ok"
            >
              Got it
            </button>
          </div>
        ) : result === "error" ? (
          <div className="flex flex-col items-center justify-center py-5 gap-1.5" data-testid="view-auth-error">
            <AuthResultIcon kind="error" size={150} loop={false} />
            <h2 className="text-xl font-bold mt-1" style={{ color: SHEET.text, fontFamily: "Poppins, sans-serif" }}>
              {mode === "signup" ? "Sign up failed" : "Sign in failed"}
            </h2>
            {error ? (
              <p className="text-sm text-center leading-5" style={{ color: SHEET.muted }}>
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={dismissError}
              className="self-stretch h-[54px] rounded-[14px] mt-4 font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
              style={{ backgroundColor: SHEET.primary }}
              data-testid="button-try-again"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative flex items-center justify-center mb-0.5">
              <span className="text-sm font-semibold" style={{ color: SHEET.text }}>
                Sign up or Log in
              </span>
              <button
                type="button"
                onClick={close}
                className="absolute right-0 p-1 transition-opacity hover:opacity-70"
                aria-label="Close"
                data-testid="button-auth-close"
              >
                <X className="w-5 h-5" style={{ color: SHEET.muted }} />
              </button>
            </div>

            {/* Illustration — one consistent icon for both modes. The animated
                welcome/signup icons are reserved for the success screen only. */}
            <div className="flex items-center justify-center mt-1 mb-3.5">
              <div
                className="[&>svg]:w-full [&>svg]:h-full"
                style={{ width: 150, height: 158 }}
                dangerouslySetInnerHTML={{ __html: SIGN_UP_XML }}
              />
            </div>

            {/* Social */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={isSubmitting}
              className={`${fieldClass} transition-opacity hover:opacity-90`}
              style={{ backgroundColor: SHEET.field, borderColor: SHEET.border }}
              data-testid="button-google"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-[15px] font-medium" style={{ color: SHEET.text }}>
                Google
              </span>
            </button>
            <button
              type="button"
              onClick={() => social("Apple")}
              className={`${fieldClass} transition-opacity hover:opacity-90`}
              style={{ backgroundColor: SHEET.field, borderColor: SHEET.border }}
              data-testid="button-apple"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={SHEET.text}>
                <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.78 1.3 10.32.86 1.24 1.89 2.64 3.23 2.59 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.27 3.13-2.52.99-1.44 1.4-2.84 1.42-2.91-.03-.01-2.72-1.04-2.75-4.13zM14.54 4.4c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z" />
              </svg>
              <span className="text-[15px] font-medium" style={{ color: SHEET.text }}>
                Apple
              </span>
            </button>

            {/* Email */}
            <div className={fieldClass} style={{ backgroundColor: SHEET.field, borderColor: SHEET.border }}>
              <Mail className="w-[18px] h-[18px] shrink-0" style={{ color: SHEET.muted }} />
              <input
                className="flex-1 bg-transparent outline-none text-[15px]"
                style={{ color: SHEET.text }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="user@gmail.com"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                disabled={step === "credentials"}
                data-testid="input-email"
              />
              {step === "credentials" ? (
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-[13px] font-semibold"
                  style={{ color: SHEET.primary }}
                  data-testid="button-edit-email"
                >
                  Edit
                </button>
              ) : null}
            </div>

            {/* Credentials step (progressive) */}
            {step === "credentials" ? (
              <>
                {mode === "signup" ? (
                  <div className={fieldClass} style={{ backgroundColor: SHEET.field, borderColor: SHEET.border }}>
                    <User className="w-[18px] h-[18px] shrink-0" style={{ color: SHEET.muted }} />
                    <input
                      className="flex-1 bg-transparent outline-none text-[15px]"
                      style={{ color: SHEET.text }}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Full name"
                      autoComplete="name"
                      data-testid="input-full-name"
                    />
                  </div>
                ) : null}

                <div className={fieldClass} style={{ backgroundColor: SHEET.field, borderColor: SHEET.border }}>
                  <Lock className="w-[18px] h-[18px] shrink-0" style={{ color: SHEET.muted }} />
                  <input
                    className="flex-1 bg-transparent outline-none text-[15px]"
                    style={{ color: SHEET.text }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" style={{ color: SHEET.muted }} />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" style={{ color: SHEET.muted }} />
                    )}
                  </button>
                </div>

                {mode === "signup" ? (
                  <div className={fieldClass} style={{ backgroundColor: SHEET.field, borderColor: SHEET.border }}>
                    <Lock className="w-[18px] h-[18px] shrink-0" style={{ color: SHEET.muted }} />
                    <input
                      className="flex-1 bg-transparent outline-none text-[15px]"
                      style={{ color: SHEET.text }}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Confirm password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                ) : null}

                {mode === "signin" ? (
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="self-end text-[13px] font-semibold mt-0.5"
                    style={{ color: SHEET.primary }}
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                ) : null}
              </>
            ) : null}

            {/* Messages */}
            {error ? (
              <p className="text-[13px] mt-0.5" style={{ color: SHEET.error }} data-testid="text-error">
                {error}
              </p>
            ) : null}
            {info ? (
              <p className="text-[13px] mt-0.5" style={{ color: SHEET.muted }} data-testid="text-info">
                {info}
              </p>
            ) : null}

            {/* Primary action */}
            <button
              type="button"
              onClick={step === "email" ? continueWithEmail : submit}
              disabled={isSubmitting}
              className="h-[54px] rounded-[14px] mt-1 font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
              style={{ backgroundColor: SHEET.primary }}
              data-testid={step === "email" ? "button-continue" : "button-submit"}
            >
              {step === "email" ? (
                "Continue"
              ) : isSubmitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <ProcessingSpinner size={18} tone="light" />
                  {mode === "signup" ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                copy.cta
              )}
            </button>

            {/* Switch mode */}
            <div className="flex justify-center items-center mt-1">
              <span className="text-[13px]" style={{ color: SHEET.muted }}>
                {copy.switchPrompt}{" "}
              </span>
              <button
                type="button"
                onClick={() => setLocation(copy.switchRoute)}
                className="text-[13px] font-semibold ml-1"
                style={{ color: SHEET.primary }}
                data-testid="link-switch-mode"
              >
                {copy.switchAction}
              </button>
            </div>

            {/* Terms */}
            <p className="text-xs text-center mt-1.5 leading-[18px]" style={{ color: SHEET.muted }}>
              By continuing I agree to the{" "}
              <button
                type="button"
                onClick={() => setLocation("/terms-of-service")}
                className="underline"
                style={{ color: SHEET.text }}
                data-testid="link-terms"
              >
                Terms
              </button>{" "}
              &{" "}
              <button
                type="button"
                onClick={() => setLocation("/privacy-policy")}
                className="underline"
                style={{ color: SHEET.text }}
                data-testid="link-privacy"
              >
                Privacy Policy
              </button>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default AuthCard;
