import React from "react";
import { PdfMergeWorkflow } from "@/components/PdfMergeWorkflow";
import { FileStack } from "lucide-react";

export const MergePdfsUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <PdfMergeWorkflow
        toolTitle="PDF Merger"
        toolDescription="Combine multiple PDF files into a single document. Add your files, drag the order with the arrows (top = first), then merge into one PDF."
        acceptedFormats={[".pdf"]}
        maxFileSize="100MB"
        toolIcon={<FileStack className="w-8 h-8 text-[#c8302a]" />}
        iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
      />
    </div>
  );
};
