import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NavigationSection } from "@/pages/sections/NavigationSection";
import { DashboardHeader } from "./DashboardHeader";
import { FooterSection } from "@/pages/sections/FooterSection";
import { PageLoader } from "@/components/page-loader";

interface DynamicLayoutProps {
  children: React.ReactNode;
  isDashboardPage?: boolean;
}

export const DynamicLayout = ({ children, isDashboardPage = false }: DynamicLayoutProps): JSX.Element => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return <PageLoader label="Loading..." />;
  }

  // For dashboard pages, always use DashboardLayout structure
  if (isDashboardPage) {
    return (
      <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-medium focus:text-gray-900 focus:shadow-lg focus:ring-2 focus:ring-[#d92f29]"
        data-testid="link-skip-to-content"
      >
        Skip to main content
      </a>
        <DashboardHeader />
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <FooterSection />
      </div>
    );
  }

  // For regular pages, switch header based on authentication
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-medium focus:text-gray-900 focus:shadow-lg focus:ring-2 focus:ring-[#d92f29]"
        data-testid="link-skip-to-content"
      >
        Skip to main content
      </a>
      {isAuthenticated ? (
        // Logged-in users see DashboardHeader on all pages
        <DashboardHeader />
      ) : (
        // Logged-out users see global header with sign in/sign up
        <NavigationSection />
      )}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <FooterSection />
    </div>
  );
};
