import React from "react";
import { PlansManager } from "@/components/PlansManager";

export const ManagePlans: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Title Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto px-20">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Manage Plans
            </h1>
            <p className="text-lg text-gray-600">
              Switch plans instantly — your usage updates in real time
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
