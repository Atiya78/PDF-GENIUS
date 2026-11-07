import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { Unlock } from "lucide-react";

export const UnlockPdfUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="unlock-pdf"
        toolTitle="Unlock PDF"
        toolDescription="Upload a password-protected PDF and enter its current password to remove the protection. The result is a clean PDF you can open without a password."
        acceptedFormats={[".pdf"]}
        maxFileSize="100MB"
        outputFormat="Unlocked PDF"
        toolIcon={<Unlock className="w-8 h-8 text-[#f7433d]" />}
        iconBg="bg-[#f7433d]/10 border-[#f7433d]/20"
      />
    </div>
  );
};
