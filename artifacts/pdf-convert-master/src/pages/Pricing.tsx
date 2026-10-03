import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PlansManager } from "@/components/PlansManager";
import { usePublicSeo } from "@/lib/usePublicSeo";

export const Pricing: React.FC = () => {
  usePublicSeo("/pricing");
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
            <p className="text-lg text-gray-700" data-testid="text-pricing-summary">
              Every web tool is free. Pay only if you need higher API volume.
            </p>
            {isAuthenticated && (
              <p className="mt-2 text-sm text-gray-600">Switch plans instantly — your usage updates in real time</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-20 py-8">
        <PlansManager />
      </div>
    </div>
  );
};
