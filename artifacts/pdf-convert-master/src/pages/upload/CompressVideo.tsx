import React from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { Video } from "lucide-react";

export const CompressVideoUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="compress-video"
        toolTitle="Video Compressor"
        toolDescription="Reduce video file size while keeping good quality. Great for sharing, uploading, and saving storage space."
        acceptedFormats={[".mp4", ".mov", ".mkv", ".avi", ".webm", ".flv", ".wmv", ".m4v", ".mpeg", ".mpg", ".3gp", ".ts", ".m2ts", ".mts", ".ogv"]}
        maxFileSize="200MB"
        outputFormat="Compressed MP4"
        toolIcon={<Video className="w-8 h-8 text-[#f7433d]" />}
        iconBg="bg-[#f7433d]/10 border-[#f7433d]/20"
      />
    </div>
  );
};
