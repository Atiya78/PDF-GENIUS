import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { Image } from "lucide-react";

export const PdfToImagesUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="pdf-to-images"
        toolTitle="PDF to Images Converter"
        toolDescription="Export PDF pages as PNG images in a ZIP archive. Direct JPG output is not currently offered by this workflow."
        acceptedFormats={[".pdf"]}
        maxFileSize="50MB"
        outputFormat="JPG/PNG"
        toolIcon={<Image className="w-8 h-8 text-blue-500" />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
      />
    </div>
  );
};