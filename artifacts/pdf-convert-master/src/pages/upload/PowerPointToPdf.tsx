import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { Presentation } from "lucide-react";

export const PowerPointToPdfUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="powerpoint-to-pdf"
        toolTitle="PowerPoint to PDF Converter"
        toolDescription="Convert your PowerPoint presentations (.ppt, .pptx) to PDF format with perfect slide layouts and formatting."
        acceptedFormats={[".ppt", ".pptx"]}
        maxFileSize="100MB"
        outputFormat="PDF"
        toolIcon={<Presentation className="w-8 h-8 text-[#c8302a]" />}
        iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
      />
    </div>
  );
};