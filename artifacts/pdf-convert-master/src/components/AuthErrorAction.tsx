import { Link } from "wouter";
import { LogIn } from "lucide-react";

interface AuthErrorActionProps {
  to: string;
  label: string;
  className?: string;
  testId?: string;
}

// Actionable link rendered inside conversion error states when the failure was a
// 401 (expired session or revoked API key). Sends the user to sign-in or the
// API Setup page so they can recover.
export const AuthErrorAction = ({
  to,
  label,
  className = "",
  testId,
}: AuthErrorActionProps) => (
  <Link
    href={to}
    className={`inline-flex items-center gap-1.5 text-sm font-semibold text-[#c8302a] hover:text-[#1c1917] underline decoration-[#f7433d]/40 underline-offset-4 hover:decoration-[#f7433d] rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1917] ${className}`}
    data-testid={testId}
  >
    <LogIn className="w-4 h-4" aria-hidden="true" />
    {label}
  </Link>
);
