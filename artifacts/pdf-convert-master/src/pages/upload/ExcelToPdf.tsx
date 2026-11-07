import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { FileSpreadsheet } from "lucide-react";

export const ExcelToPdfUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="excel-to-pdf"
        toolTitle="Excel to PDF Converter"
        toolDescription="Convert your Excel spreadsheets (.xls, .xlsx) to PDF format while preserving formatting, charts, and tables."
        acceptedFormats={[".xls", ".xlsx"]}
        maxFileSize="50MB"
        outputFormat="PDF"
        toolIcon={<FileSpreadsheet className="w-8 h-8 text-[#c8302a]" />}
        iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
      />
    </div>
  );
};