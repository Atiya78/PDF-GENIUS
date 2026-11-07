import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { FileText } from "lucide-react";

export const PdfToWordUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="pdf-to-word"
        toolTitle="PDF to Word Converter"
        toolDescription="Convert your PDF documents to editable Word documents (.docx) with accurate text and formatting preservation."
        acceptedFormats={[".pdf"]}
        maxFileSize="50MB"
        outputFormat="DOCX"
        toolIcon={<FileText className="w-8 h-8 text-[#c8302a]" />}
        iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
      />
    </div>
  );
};