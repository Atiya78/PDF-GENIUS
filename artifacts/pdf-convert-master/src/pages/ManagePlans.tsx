import React from "react";
import "@/styles/dashboard.css";
import { PlansManager } from "@/components/PlansManager";

export const ManagePlans: React.FC = () => {
  return (
    <div className="dash-root min-h-[100dvh]">
      <div className="dash-head">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 lg:px-10">
          <p className="edu-eyebrow">Billing</p>
          <h1 className="dash-h1 mt-3">Manage plans</h1>
          <p className="dash-lede mt-2">Switch plans instantly. Your usage updates in real time.</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <PlansManager />
      </main>
    </div>
  );
};
