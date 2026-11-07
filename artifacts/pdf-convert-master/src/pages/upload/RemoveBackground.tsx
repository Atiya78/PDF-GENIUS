import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { Scissors } from "lucide-react";

export const RemoveBackgroundUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="remove-background"
        toolTitle="AI Background Remover"
        toolDescription="Remove image backgrounds automatically using AI. Perfect for product photos, portraits, and graphic design with transparent output."
        acceptedFormats={[".jpg", ".jpeg", ".png", ".webp"]}
        maxFileSize="15MB"
        outputFormat="PNG with Transparency"
        toolIcon={<Scissors className="w-8 h-8 text-[#c8302a]" />}
        iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
      />
    </div>
  );
};