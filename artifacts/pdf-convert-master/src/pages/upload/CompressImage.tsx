import React, { useState } from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { CompressLevelOptions, type CompressLevel } from "@/components/upload/OutputOptions";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";

export const CompressImageUpload: React.FC = () => {
  const [level, setLevel] = useState<CompressLevel>("medium");
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="compress-image"
        toolTitle="Image Compressor"
        toolDescription="Choose Low, Medium or High compression. The result shows the actual original and output sizes."
        acceptedFormats={[".jpg", ".jpeg", ".png", ".webp"]}
        maxFileSize="25MB"
        outputFormat="Compressed Images"
        toolIcon={<ToolLottieIcon toolId="compress-images" size={48} />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
        extraOptions={{ compressionLevel: level }}
        showSizeComparison
        useServerName
        renderSettings={({ disabled }) => <CompressLevelOptions level={level} onLevel={setLevel} disabled={disabled} />}
      />
    </div>
  );
};