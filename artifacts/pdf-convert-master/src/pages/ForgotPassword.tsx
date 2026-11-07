import React, { useState } from "react";
import { useLocation } from "wouter";
import { requestPasswordReset } from "@/lib/profile";
import { Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { useSeo } from "@/lib/useSeo";
import { AuthShell, AuthMessage } from "@/components/AuthCard";

export const RESET_STEPS = ["Your email", "Code and new password", "Sign in"];

export const ForgotPassword: React.FC = () => {
  useSeo({ title: "Forgot Password", canonicalPath: "/forgot-password", noindex: true });
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      // Always proceed to the reset step — the server never reveals whether the
      // account exists, so we move on regardless.
      setLocation(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password reset"
      heading={<>Get back into<br />your account.</>}
      lede="We will email you a code. Enter it with a new password on the next screen."
      steps={RESET_STEPS}
      current={0}
    >
      <div className="auth-sheet">
        <p className="edu-eyebrow">Step 1 of 3</p>
        <h1 className="mt-2 font-['Poppins'] text-[1.65rem] font-semibold leading-tight tracking-[-0.02em] text-[#1c1917]">Forgot password?</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#57534e]">Enter your email and we'll send you a code to reset your password.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="edu-label mb-1.5">Email address</label>
            <div className="auth-field">
              <Mail className="auth-ico" aria-hidden="true" />
              <input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-forgot-email" />
            </div>
          </div>

          {error && <AuthMessage kind="error" testId="text-error">{error}</AuthMessage>}

          <button type="submit" disabled={isSubmitting} className="edu-btn-primary group w-full" data-testid="button-send-reset">
            {isSubmitting ? "Sending..." : <>Send reset code<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>}
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
