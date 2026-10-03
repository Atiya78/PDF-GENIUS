import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { Minimize2 } from "lucide-react";

export const CompressImageUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="compress-image"
        toolTitle="Image Compressor"
        toolDescription="Reduce image file size without losing quality. Perfect for web optimization and storage savings with customizable compression levels."
        acceptedFormats={[".jpg", ".jpeg", ".png", ".webp"]}
        maxFileSize="25MB"
        outputFormat="Compressed Images"
        toolIcon={<Minimize2 className="w-8 h-8 text-blue-500" />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
      />
    </div>
  );
};