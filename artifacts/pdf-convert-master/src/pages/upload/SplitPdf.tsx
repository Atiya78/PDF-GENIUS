import React, { useState } from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { SplitSettings, type SplitMode } from "@/components/upload/SplitSettings";
import { parsePageRanges } from "@/components/upload/pageRanges";

const stem = (f: File) => f.name.replace(/\.[^.]+$/, "") || "file";

export const SplitPdfUpload: React.FC = () => {
  const [mode, setMode] = useState<SplitMode>("all");
  const [ranges, setRanges] = useState("");
  const [ok, setOk] = useState(false);
  const zip = mode !== "extract";
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="split-pdf"
        toolTitle="PDF Splitter"
        toolDescription="Split a PDF into one file per page, by page ranges, or extract chosen pages into a single PDF."
        acceptedFormats={[".pdf"]}
        maxFileSize="100MB"
        maxFiles={1}
        outputFormat={zip ? "ZIP of PDFs" : "PDF"}
        outputLabel={zip ? "ZIP (PDF files)" : "one PDF"}
        toolIcon={<ToolLottieIcon toolId="split-pdf" size={48} />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
        canConvert={ok}
        extraOptions={{ mode, ranges: mode === "all" ? "" : parsePageRanges(ranges, null).normalized }}
        downloadName={(f) => `${stem(f)}-${mode === "extract" ? "extracted.pdf" : "split.zip"}`}
        renderSettings={({ files, disabled }) => (
          <SplitSettings file={files[0]} mode={mode} ranges={ranges} onMode={setMode} onRanges={setRanges} onValidChange={setOk} disabled={disabled} />
        )}
      />
    </div>
  );
};
