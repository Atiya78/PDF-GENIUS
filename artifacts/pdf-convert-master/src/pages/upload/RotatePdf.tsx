import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { RotateCw } from "lucide-react";

export const RotatePdfUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="rotate-pdf"
        toolTitle="PDF Rotator"
        toolDescription="Set every PDF page's rotation to 90 degrees clockwise. This workflow does not offer a page or angle selector."
        acceptedFormats={[".pdf"]}
        maxFileSize="100MB"
        outputFormat="Rotated PDF"
        toolIcon={<RotateCw className="w-8 h-8 text-blue-600" />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
      />
    </div>
  );
};