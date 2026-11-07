import React from "react";
import { ImagesToPdfWorkflow } from "@/components/ImagesToPdfWorkflow";
import { Image } from "lucide-react";

export const ImagesToPdfUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ImagesToPdfWorkflow
        toolTitle="Images to PDF Converter"
        toolDescription="Combine multiple images (JPG, PNG, GIF, WebP) into a single PDF document. Add your images, drag the order with the arrows (top = first page), then convert into one PDF."
        acceptedFormats={[".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"]}
        maxFileSize="20MB"
        toolIcon={<Image className="w-8 h-8 text-[#f7433d]" />}
        iconBg="bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-800"
      />
    </div>
  );
};
