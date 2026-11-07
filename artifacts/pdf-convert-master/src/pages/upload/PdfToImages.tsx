import React, { useState } from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { ImageOutputOptions, type ImgFmt } from "@/components/upload/OutputOptions";

const stem = (f: File) => f.name.replace(/\.[^.]+$/, "") || "file";

export const PdfToImagesUpload: React.FC = () => {
  const [fmt, setFmt] = useState<ImgFmt>("jpg");
  const [quality, setQuality] = useState(90);
  const [dpi, setDpi] = useState(150);
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="pdf-to-images"
        toolTitle="PDF to Images Converter"
        toolDescription="Export every PDF page as a real JPG or PNG image at 72, 150 or 300 DPI. Pages are delivered together in a ZIP archive."
        acceptedFormats={[".pdf"]}
        maxFileSize="50MB"
        outputFormat={`ZIP of ${fmt.toUpperCase()} images`}
        outputLabel={`ZIP (${fmt.toUpperCase()} images)`}
        toolIcon={<ToolLottieIcon toolId="pdf-to-images" size={48} />}
        iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
        extraOptions={{ outputFormat: fmt, quality, dpi }}
        downloadName={(f) => `${stem(f)}-images.zip`}
        renderSettings={({ disabled }) => (
          <ImageOutputOptions
            title="Image output" formats={["jpg", "png"]} format={fmt} quality={quality}
            dpi={dpi} onDpi={setDpi} onFormat={setFmt} onQuality={setQuality} disabled={disabled}
            note="The download is always a ZIP with one image per page."
          />
        )}
      />
    </div>
  );
};
