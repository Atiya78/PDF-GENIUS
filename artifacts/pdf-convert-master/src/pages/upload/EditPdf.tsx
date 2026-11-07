import React from "react";
import { PdfEditor } from "@/components/PdfEditor";
import "@/styles/tools.css";

export const EditPdfUpload: React.FC = () => {
  return (
    <div className="tl-root relative min-h-[100dvh] py-8">
      <PdfEditor />
    </div>
  );
};
