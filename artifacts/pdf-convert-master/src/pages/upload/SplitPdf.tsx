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
  const [n, setN] = useState(2);
  const zip = mode !== "extract";
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="split-pdf"
        toolTitle="PDF Splitter"
        toolDescription="Split a PDF into one file per page, by page ranges, every N pages, or extract chosen pages into a single PDF. One result downloads as a PDF, several as a ZIP."
        acceptedFormats={[".pdf"]}
        maxFileSize="100MB"
        maxFiles={1}
        outputFormat="Split PDF"
        outputLabel={zip ? "split PDF files" : "one PDF"}
        toolIcon={<ToolLottieIcon toolId="split-pdf" size={48} />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
        canConvert={ok}
        useServerName
        extraOptions={(() => {
          const r = mode === "ranges" || mode === "extract" ? parsePageRanges(ranges, null).normalized : "";
          return { mode, ranges: r, pagesPerSplit: n };
        })()}
        downloadName={(f) => `${stem(f)}-${mode === "extract" ? "extracted.pdf" : "split.zip"}`}
        renderSettings={({ files, disabled }) => (
          <SplitSettings file={files[0]} mode={mode} ranges={ranges} onMode={setMode} onRanges={setRanges} onValidChange={setOk} pagesPerSplit={n} onPagesPerSplit={setN} disabled={disabled} />
        )}
      />
    </div>
  );
};
