import React, { useState } from "react";
import { useLocation } from "wouter";
import { resetPassword, requestPasswordReset } from "@/lib/profile";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound } from "lucide-react";
import AuthResultIcon from "@/components/AuthResultIcon";
import { useSeo } from "@/lib/useSeo";
import { AuthShell, AuthMessage } from "@/components/AuthCard";
import { RESET_STEPS } from "@/pages/ForgotPassword";

export const ResetPassword: React.FC = () => {
  useSeo({ title: "Reset Password", canonicalPath: "/reset-password", noindex: true });
  const [, setLocation] = useLocation();
  const initialEmail = new URLSearchParams(window.location.search).get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!code.trim()) {
      setError("Enter the code from your email");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ email, code: code.trim(), newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    if (!email || !email.includes("@")) {
      setError("Enter your email to resend the code");
      return;
    }
    try {
      await requestPasswordReset(email);
      setNotice("A new code has been sent if an account exists for that email.");
    } catch {
      setError("Could not resend the code. Please try again.");
    }
  };

  const shell = {
    eyebrow: "Password reset",
    heading: <>Get back into<br />your account.</>,
    lede: "Use the code from your email to set a new password, then sign in as usual.",
    steps: RESET_STEPS,
    current: done ? 2 : 1,
  };

  if (done) {
    return (
      <AuthShell {...shell}>
        <div className="auth-sheet flex flex-col items-start" data-testid="view-reset-done">
          <AuthResultIcon kind="password-reset" size={130} loop={false} />
          <p className="edu-eyebrow mt-1">Step 3 of 3</p>
          <h1 className="mt-2 font-['Poppins'] text-[1.65rem] font-semibold tracking-[-0.02em] text-[#1c1917]">Password updated</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#57534e]">Your password has been changed. You can now sign in with your new password.</p>
          <button type="button" onClick={() => setLocation("/signin")} className="edu-btn-primary mt-6 w-full" data-testid="button-go-signin">
            Go to sign in
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell {...shell}>
      <div className="auth-sheet">
        <p className="edu-eyebrow">Step 2 of 3</p>
        <h1 className="mt-2 font-['Poppins'] text-[1.65rem] font-semibold leading-tight tracking-[-0.02em] text-[#1c1917]">Reset password</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#57534e]">Enter the code we emailed you and choose a new password.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="edu-label mb-1.5">Email address</label>
            <div className="auth-field">
              <Mail className="auth-ico" aria-hidden="true" />
              <input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-reset-email" />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-end justify-between">
              <label htmlFor="code" className="edu-label">Reset code</label>
              <button type="button" onClick={handleResend} className="auth-link !min-h-0 text-[13px] text-[#57534e]" data-testid="button-resend-reset">
                Resend code
              </button>
            </div>
            <div className="auth-field">
              <KeyRound className="auth-ico" aria-hidden="true" />
              <input id="code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} className="edu-mono !tracking-[0.3em]" data-testid="input-reset-code" />
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="edu-label mb-1.5">New password</label>
            <div className="auth-field">
              <Lock className="auth-ico" aria-hidden="true" />
              <input id="newPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} data-testid="input-new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-icon-btn -mr-2 !h-10 !w-10" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>

          {error && <AuthMessage kind="error" testId="text-error">{error}</AuthMessage>}
          {notice && <AuthMessage kind="info" testId="text-info">{notice}</AuthMessage>}

          <button type="submit" disabled={isSubmitting} className="edu-btn-primary w-full" data-testid="button-reset-password">
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <div className="mt-6 border-t border-[#efe8dd] pt-3">
          <button type="button" onClick={() => setLocation("/signin")} className="auth-link text-sm" data-testid="link-back-signin">
            <ArrowLeft className="auth-nudge auth-nudge-l h-4 w-4" aria-hidden="true" />
            Back to Sign In
          </button>
        </div>
      </div>
    </AuthShell>
  );
};
