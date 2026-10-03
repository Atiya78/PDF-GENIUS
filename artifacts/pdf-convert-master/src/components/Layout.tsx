import React from "react";
import { NavigationSection } from "@/pages/sections/NavigationSection";
import { FooterSection } from "@/pages/sections/FooterSection";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps): JSX.Element => {
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-medium focus:text-gray-900 focus:shadow-lg focus:ring-2 focus:ring-[#d92f29]"
        data-testid="link-skip-to-content"
      >
        Skip to main content
      </a>
      <NavigationSection />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <FooterSection />
    </div>
  );
};
