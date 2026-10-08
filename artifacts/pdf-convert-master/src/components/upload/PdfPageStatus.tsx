import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { PdfInfo } from "./usePdfDocument";

export const PdfPageStatus: React.FC<{ info: PdfInfo }> = ({ info }) => {
  if (info.status === "loading" || info.status === "idle")
    return <p className="flex items-center gap-2 text-sm text-gray-600" role="status" data-testid="pdf-loading"><Loader2 className="h-4 w-4 animate-spin" />Reading PDF pages...</p>;
  if (info.status === "error")
    return <p className="flex items-start gap-2 text-sm text-red-600" role="alert" data-testid="pdf-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{info.message}</p>;
  if (info.status !== "ready") return null;
  return <p className="text-sm text-gray-600" data-testid="pdf-page-count">This PDF has {info.pageCount} page{info.pageCount === 1 ? "" : "s"}.</p>;
};
