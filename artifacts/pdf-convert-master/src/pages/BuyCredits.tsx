import React from "react";
import "@/styles/dashboard.css";
import { CreditPurchaseCard } from "@/components/CreditPurchaseCard";
import { useSeo } from "@/lib/useSeo";

export const BuyCredits: React.FC = () => {
  useSeo({ title: "Buy Credits", canonicalPath: "/dashboard/buy-credits", noindex: true });

  return (
    <div className="dash-root min-h-[100dvh]">
      <div className="dash-head">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 lg:px-10">
          <p className="edu-eyebrow">Wallet</p>
          <h1 className="dash-h1 mt-3">Buy credits</h1>
          <p className="dash-lede mt-2">Top up your balance and pay only for what you need.</p>
        </div>
      </div>

      {/* Main Content — credits only, nothing else */}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10"><div className="max-w-3xl">
        <CreditPurchaseCard />
        </div>
      </main>
    </div>
  );
};
