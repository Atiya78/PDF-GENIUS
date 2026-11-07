import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { Lock } from "lucide-react";

export const LockPdfUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="lock-pdf"
        toolTitle="Lock PDF"
        toolDescription="Upload a PDF and protect it with a password. We encrypt it with strong AES-256 encryption so only people with the password can open it."
        acceptedFormats={[".pdf"]}
        maxFileSize="100MB"
        outputFormat="Password-protected PDF"
        toolIcon={<Lock className="w-8 h-8 text-[#f7433d]" />}
        iconBg="bg-[#f7433d]/10 border-[#f7433d]/20"
      />
    </div>
  );
};
