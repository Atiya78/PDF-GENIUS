import React from "react";
import { NavigationSection } from "@/pages/sections/NavigationSection";
import { FooterSection } from "@/pages/sections/FooterSection";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps): JSX.Element => {
  return (
    <div className="min-h-screen flex flex-col">
      <NavigationSection />
      <main className="flex-1">
        {children}
      </main>
      <FooterSection />
    </div>
  );
};
