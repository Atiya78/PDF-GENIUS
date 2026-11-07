import React from "react";
import "@/styles/dashboard.css";
import { CreditPurchaseCard } from "@/components/CreditPurchaseCard";
import { WalletOverview } from "@/components/wallet/WalletOverview";
import { useSeo } from "@/lib/useSeo";

export const BuyCredits: React.FC = () => {
  useSeo({ title: "Buy Credits", canonicalPath: "/dashboard/buy-credits", noindex: true });

  return (
    <div className="dash-root min-h-[100dvh]">
      <div className="dash-head">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 lg:px-10">
          <p className="edu-eyebrow">Wallet</p>
          <h1 className="dash-h1 mt-3">Buy credits</h1>
          <p className="dash-lede mt-2">Two separate wallets: one for PDF tools, one for the Education Zone. Credits and subscriptions in one never apply to the other.</p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-10">
        <WalletOverview />
        <div className="max-w-3xl">
          <CreditPurchaseCard showBalance={false} />
        </div>
      </main>
    </div>
  );
};
