import { Link } from "wouter";
import { cn } from "@/lib/utils";

const PROVIDERS = {
  dodo: { name: "Dodo Payments", product: "PDF Tools" },
  paddle: { name: "Paddle.com", product: "Education Zone" },
} as const;

/** Purchase-time agreement + Merchant of Record disclosure, shown next to every checkout button. */
export function CheckoutLegalNote({ provider, subscription = false, className }: { provider: keyof typeof PROVIDERS; subscription?: boolean; className?: string }) {
  const p = PROVIDERS[provider];
  const a = "font-medium text-[#1c1917] underline decoration-[#d9d0c3] underline-offset-2 hover:decoration-[#f7433d]";
  return (
    <p className={cn("text-xs leading-5 text-[#6b645c]", className)} data-testid={`text-checkout-legal-${provider}`}>
      By purchasing you agree to our <Link href="/terms" className={a}>Terms</Link> and{" "}
      <Link href="/refund-policy" className={a}>Refund Policy</Link>. Your {p.product} order is processed by{" "}
      {p.name}, our Merchant of Record, which handles payment, tax and receipts.{subscription && " Subscriptions renew automatically at the end of each billing period until you cancel."}
    </p>
  );
}
