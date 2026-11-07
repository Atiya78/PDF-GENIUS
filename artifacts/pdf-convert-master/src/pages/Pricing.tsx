import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { PlansManager } from "@/components/PlansManager";
import { useSeo } from "@/lib/useSeo";
import "@/styles/marketing.css";

export const Pricing: React.FC = () => {
  useSeo({
    title: "Pricing — Free PDF Tools & Developer API",
    description:
      "Every PDF Genius web tool is free, no account required. Pricing unlocks our developer API for programmatic PDF conversion at scale.",
    canonicalPath: "/pricing",
  });
  const { isAuthenticated } = useAuth();

  return (
    <div className="mkt-root min-h-[100dvh]">
      <section className="border-b border-[#e7e0d5]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-8 lg:pt-14">
          <div>
            <p className="edu-eyebrow">{isAuthenticated ? "Your plan" : "Pricing"}</p>
            <h1 className="mkt-display mt-3 text-[2.2rem] sm:text-[2.9rem]">
              {isAuthenticated ? "Manage Plans" : "Available Plans"}
            </h1>
            <p className="mkt-lede mt-4 max-w-xl">
              {isAuthenticated
                ? "Switch plans instantly — your usage updates in real time"
                : "Pricing unlocks our developer API — every web tool stays free, no account required"}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/education/pricing" className="mkt-link">Education plans</Link>
            <Link href="/refund-policy" className="mkt-link">Refund policy</Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <PlansManager />
      </main>
    </div>
  );
};
