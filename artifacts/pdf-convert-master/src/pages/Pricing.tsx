import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PlansManager } from "@/components/PlansManager";
import { useSeo } from "@/lib/useSeo";

export const Pricing: React.FC = () => {
  useSeo({
    title: "Pricing — Free PDF Tools & Developer API",
    description:
      "Every PDF Genius web tool is free, no account required. Pricing unlocks our developer API for programmatic PDF conversion at scale.",
    canonicalPath: "/pricing",
  });
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Title Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto px-20">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {isAuthenticated ? "Manage Plans" : "Available Plans"}
            </h1>
            <p className="text-lg text-gray-600">
              {isAuthenticated
                ? "Switch plans instantly — your usage updates in real time"
                : "Pricing unlocks our developer API — every web tool stays free, no account required"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-20 py-8">
        <PlansManager />
      </main>
    </div>
  );
};
