import React, { useState } from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { ImageOutputOptions, type ImgFmt } from "@/components/upload/OutputOptions";

const stem = (f: File) => f.name.replace(/\.[^.]+$/, "") || "file";

export const ConvertImageFormatUpload: React.FC = () => {
  const [fmt, setFmt] = useState<ImgFmt>("png");
  const [quality, setQuality] = useState(90);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="convert-image-format"
        toolTitle="Image Format Converter"
        toolDescription="Convert images to JPG, PNG or WebP. HEIC and HEIF photos are accepted as input."
        acceptedFormats={[".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".heic", ".heif"]}
        maxFileSize="25MB"
        outputFormat={fmt.toUpperCase()}
        toolIcon={<ToolLottieIcon toolId="convert-image-format" size={48} />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
        extraOptions={{ outputFormat: fmt, quality }}
        downloadName={(f) => `${stem(f)}.${fmt}`}
        renderSettings={({ files, disabled }) => (
          <ImageOutputOptions
            title="Output format" formats={["jpg", "png", "webp"]} format={fmt} quality={quality}
            onFormat={setFmt} onQuality={setQuality} disabled={disabled}
            note={files.some((f) => /\.(heic|heif)$/i.test(f.name)) ? "HEIC and HEIF files are listed by name only because browsers cannot preview them. They are converted on the server, and HEIC/HEIF files must be 25 MB or smaller and up to 40 megapixels." : undefined}
          />
        )}
      />
    </div>
  );
};
