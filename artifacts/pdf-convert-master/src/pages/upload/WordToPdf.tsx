import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { FileText } from "lucide-react";

export const WordToPdfUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="word-to-pdf"
        toolTitle="Word to PDF Converter"
        toolDescription="Convert your Word documents (.doc, .docx) to PDF format while preserving formatting, fonts, and layout."
        acceptedFormats={[".doc", ".docx"]}
        maxFileSize="50MB"
        outputFormat="PDF"
        toolIcon={<FileText className="w-8 h-8 text-[#c8302a]" />}
        iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
      />
    </div>
  );
};