import { Link, useLocation } from "wouter";
import { Home, BarChart3, Settings, Book, GitBranch, Wallet, Wrench, HelpCircle, UserRound, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import "@/styles/dashboard.css";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: Home, testId: "nav-dashboard-home" },
  { href: "/dashboard/usage", label: "Usage", icon: BarChart3, testId: "nav-usage" },
  { href: "/dashboard/api-setup", label: "API keys", icon: Settings, testId: "nav-api-setup" },
  { href: "/dashboard/api-reference", label: "API reference", icon: Book, testId: "nav-api-reference" },
  { href: "/dashboard/manage-plans", label: "Plans", icon: GitBranch, testId: "nav-manage-plans" },
  { href: "/dashboard/buy-credits", label: "Buy credits", icon: Wallet, testId: "nav-buy-credits" },
  { href: "/dashboard/live-tools", label: "Live tools", icon: Wrench, testId: "nav-live-tools" },
  { href: "/dashboard/billing-help", label: "Billing help", icon: HelpCircle, testId: "nav-billing-help" },
  { href: "/dashboard/profile", label: "Account", icon: UserRound, testId: "nav-profile" },
];

/** Shared dashboard navigation: vertical rail on desktop, horizontal scroller on mobile. */
export function DashSidebar(): JSX.Element {
  const [location] = useLocation();
  const { user } = useAuth();
  return (
    <aside className="dash-side w-full shrink-0 border-b lg:sticky lg:top-[65px] lg:h-[calc(100dvh-65px)] lg:w-60 lg:border-b-0 lg:border-r" aria-label="Dashboard">
      <div className="flex h-full flex-col px-3 py-3 lg:px-4 lg:py-6">
        <p className="edu-eyebrow hidden px-3 lg:block">Workspace</p>
        <nav className="dash-nav-scroll -mx-3 flex gap-1 overflow-x-auto px-3 lg:mx-0 lg:mt-3 lg:flex-col lg:overflow-visible lg:px-0">
          {NAV.map(({ href, label, icon: Icon, testId }) => (
            <Link key={href} href={href} aria-current={location === href ? "page" : undefined} className="dash-nav-item shrink-0 whitespace-nowrap lg:shrink" data-testid={testId}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-[var(--desk-line)] px-3 pt-5 lg:block">
          <p className="edu-eyebrow !text-[var(--desk-ink-3)]">Current plan</p>
          <p className="mt-1.5 font-['Poppins'] text-base font-semibold capitalize text-[var(--desk-ink)]" data-testid="text-sidebar-plan">{user?.plan || "Free"}</p>
          <Link href="/dashboard/manage-plans" className="dash-link mt-2" data-testid="link-sidebar-upgrade">Compare plans <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </div>
      </div>
    </aside>
  );
}
