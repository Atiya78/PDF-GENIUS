import React, { useState } from "react";
import { ConversionWorkflow } from "@/components/ConversionWorkflow";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { UrlSourcePanel, makeUrlSourceFile, type HtmlInputMode } from "@/components/upload/UrlSourcePanel";

const stem = (f: File) => f.name.replace(/\.[^.]+$/, "") || "file";

export const HtmlToPdfUpload: React.FC = () => {
  const [mode, setMode] = useState<HtmlInputMode>("file");
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [injected, setInjected] = useState<{ key: string; files: File[] } | null>(null);
  const urlMode = mode === "url" && !!submittedUrl;
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <ConversionWorkflow
        toolType="html-to-pdf"
        toolTitle="HTML to PDF Converter"
        toolDescription="Convert an HTML file or a public web page address to a PDF document. Layout may differ from your browser."
        acceptedFormats={[".html", ".htm"]}
        maxFileSize="10MB"
        outputFormat="PDF"
        toolIcon={<ToolLottieIcon toolId="html-to-pdf" size={48} />}
        iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
        extraOptions={urlMode ? { inputMode: "url", url: submittedUrl } : undefined}
        downloadName={(f) => `${urlMode ? "webpage" : stem(f)}.pdf`}
        hideDropzone={mode === "url"}
        injectedFiles={injected}
        uploadHeader={
          <UrlSourcePanel
            mode={mode} onMode={(m) => { setMode(m); if (m === "file") setSubmittedUrl(""); }}
            url={url} onUrl={setUrl}
            onSubmit={(u) => {
              setSubmittedUrl(u);
              setInjected({ key: `${Date.now()}`, files: [makeUrlSourceFile(u)] });
            }}
          />
        }
      />
    </div>
  );
};
