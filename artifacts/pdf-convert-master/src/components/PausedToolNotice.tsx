import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LottieIcon } from "@/components/ui/lottie-icon";
import temporarilyClosed from "@/assets/lottie/temporarily-closed.json";

/**
 * Friendly full-card notice shown on a tool's upload page when an admin has
 * temporarily paused that tool. Replaces the dropzone so visitors learn the
 * tool is unavailable BEFORE uploading a file (the server also rejects paused
 * conversions as a backstop).
 */
export const PausedToolNotice: React.FC<{ toolTitle: string }> = ({ toolTitle }) => {
  const [, setLocation] = useLocation();
  return (
    <div
      className="bg-[#fffdf9] rounded-[14px] border border-[#e7e0d5] shadow-[0_24px_48px_-36px_rgba(28,25,23,0.45)] px-6 py-12 flex flex-col items-center text-center"
      data-testid="notice-tool-paused"
    >
      <div className="mb-4">
        <LottieIcon animationData={temporarilyClosed} size={120} />
      </div>
      <h2 className="text-xl font-semibold text-[#1c1917] mb-2">
        Temporarily unavailable
      </h2>
      <p className="text-sm text-[#57534e] max-w-md mb-6">
        {toolTitle} is paused for maintenance right now. Please check back
        soon — in the meantime, all our other tools are ready to go.
      </p>
      <Button
        onClick={() => setLocation("/tools")}
        className="h-11 px-6 bg-[#f7433d] hover:bg-[#e03a35] text-white font-semibold rounded-full"
        data-testid="button-paused-browse-tools"
      >
        Browse other tools
      </Button>
    </div>
  );
};
