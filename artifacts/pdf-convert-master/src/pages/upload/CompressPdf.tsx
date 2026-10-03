import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { Minimize2 } from "lucide-react";

export const CompressPdfUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="compress-pdf"
        toolTitle="PDF Compressor"
        toolDescription="Process your PDF with the compression tool, then compare the result's size and readability with the original."
        acceptedFormats={[".pdf"]}
        maxFileSize="200MB"
        outputFormat="Compressed PDF"
        toolIcon={<Minimize2 className="w-8 h-8 text-blue-600" />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
      />
    </div>
  );
};