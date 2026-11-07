import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { FileSpreadsheet } from "lucide-react";

export const PdfToExcelUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="pdf-to-excel"
        toolTitle="PDF to Excel Converter"
        toolDescription="Convert your PDF documents to editable Excel spreadsheets (.xlsx) with accurate data table extraction."
        acceptedFormats={[".pdf"]}
        maxFileSize="50MB"
        outputFormat="XLSX"
        toolIcon={<FileSpreadsheet className="w-8 h-8 text-[#c8302a]" />}
        iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
      />
    </div>
  );
};