import React, { useState } from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { CompressLevelOptions, type CompressLevel } from "@/components/upload/OutputOptions";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";

export const CompressPdfUpload: React.FC = () => {
  const [level, setLevel] = useState<CompressLevel>("medium");
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="compress-pdf"
        toolTitle="PDF Compressor"
        toolDescription="Choose Low, Medium or High compression. The result shows the actual original and output sizes."
        acceptedFormats={[".pdf"]}
        maxFileSize="200MB"
        outputFormat="Compressed PDF"
        toolIcon={<ToolLottieIcon toolId="compress-pdf" size={48} />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
        extraOptions={{ compressionLevel: level }}
        showSizeComparison
        useServerName
        renderSettings={({ disabled }) => <CompressLevelOptions level={level} onLevel={setLevel} disabled={disabled} />}
      />
    </div>
  );
};