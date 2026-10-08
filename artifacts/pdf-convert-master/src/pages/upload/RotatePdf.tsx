import React, { useState } from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { RotateSettings, type RotateAngle, type RotateScope } from "@/components/upload/RotateSettings";
import { pagesToRangeString } from "@/components/upload/pageRanges";

const stem = (f: File) => f.name.replace(/\.[^.]+$/, "") || "file";

export const RotatePdfUpload: React.FC = () => {
  const [angle, setAngle] = useState<RotateAngle>(90);
  const [scope, setScope] = useState<RotateScope>("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [ok, setOk] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="rotate-pdf"
        toolTitle="PDF Rotator"
        toolDescription="Rotate all pages or only the ones you pick by 90, 180 or 270 degrees, with page previews."
        acceptedFormats={[".pdf"]}
        maxFileSize="100MB"
        maxFiles={1}
        outputFormat="Rotated PDF"
        outputLabel="rotated PDF"
        toolIcon={<ToolLottieIcon toolId="rotate-pdf" size={48} />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
        canConvert={ok}
        extraOptions={{ angle, pages: scope === "all" ? "all" : pagesToRangeString(selected) }}
        downloadName={(f) => `${stem(f)}-rotated.pdf`}
        renderSettings={({ files, disabled }) => (
          <RotateSettings
            file={files[0]} angle={angle} scope={scope} selected={selected}
            onAngle={setAngle} onScope={setScope} onSelected={setSelected} onValidChange={setOk} disabled={disabled}
          />
        )}
      />
    </div>
  );
};
