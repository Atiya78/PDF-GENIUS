import React from "react";
import { CreditPurchaseCard } from "@/components/CreditPurchaseCard";
import { useSeo } from "@/lib/useSeo";

export const BuyCredits: React.FC = () => {
  useSeo({ title: "Buy Credits", canonicalPath: "/dashboard/buy-credits", noindex: true });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Title Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Buy Credits
            </h1>
            <p className="text-lg text-gray-600">
              Top up your balance — pay only for what you need
            </p>
          </div>
        </div>
      </div>

      {/* Main Content — credits only, nothing else */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <CreditPurchaseCard />
      </main>
    </div>
  );
};
