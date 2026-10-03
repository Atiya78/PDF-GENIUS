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
        <DashboardHeader />
        <main className="flex-1">
          {children}
        </main>
        <FooterSection />
      </div>
    );
  }

  // For regular pages, switch header based on authentication
  return (
    <div className="min-h-screen flex flex-col">
      {isAuthenticated ? (
        // Logged-in users see DashboardHeader on all pages
        <DashboardHeader />
      ) : (
        // Logged-out users see global header with sign in/sign up
        <NavigationSection />
      )}
      <main className="flex-1">
        {children}
      </main>
      <FooterSection />
    </div>
  );
};
