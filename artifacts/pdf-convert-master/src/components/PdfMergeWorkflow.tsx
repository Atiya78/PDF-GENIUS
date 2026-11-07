import React, { useState, useRef, useCallback, useEffect } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { downloadFromUrl } from "@/lib/download";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  FileCheck,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Download,
} from "lucide-react";
import { EnhancedUploadArea } from "@/components/ui/enhanced-upload-area";
import { ConverterStatusIcon } from "@/components/converter-status-icon";
import { OrderedFileList } from "@/components/OrderedFileList";
import { ToolPageShell } from "@/components/upload/ToolPageShell";
import { toolConfigs, getToolActionLabel } from "@/lib/toolConfig";
import { useToolPaused } from "@/lib/usePausedTools";
import { PausedToolNotice } from "@/components/PausedToolNotice";

interface PdfMergeWorkflowProps {
  toolTitle: string;
  toolDescription: string;
  acceptedFormats: string[];
  maxFileSize: string;
  toolIcon: React.ReactNode;
  iconBg: string;
}

type MergeStage = "upload" | "files-selected" | "merging" | "completed" | "error";

const MAX_FILES = 20; // matches the backend cap

/**
 * Full-page PDF merge workflow. Unlike the generic single-file ConversionWorkflow
 * (which uploads each file separately and can never combine them), this collects
 * MULTIPLE PDFs, lets the user reorder them, and POSTs them all together to the
 * dedicated /api/merge-pdfs endpoint so they become ONE document in the chosen
 * order. Styled to match the PDF splitter so the two read as a matched set.
 */
export const PdfMergeWorkflow: React.FC<PdfMergeWorkflowProps> = ({
  toolTitle,
  toolDescription,
  acceptedFormats,
  maxFileSize,
  toolIcon,
  iconBg,
}) => {
  const [stage, setStage] = useState<MergeStage>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("merged.pdf");
  const { toast } = useToast();

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const maxSizeInBytes = (parseFloat(maxFileSize) || 100) * 1024 * 1024;

  const handleFilesSelection = useCallback(
    (incoming: File[]) => {
      setErrorMessage(null);
      const valid: File[] = [];
      let rejected = 0;
      for (const f of incoming) {
        const ext = "." + (f.name.split(".").pop()?.toLowerCase() || "");
        if (!acceptedFormats.includes(ext) || f.size > maxSizeInBytes) {
          rejected += 1;
          continue;
        }
        valid.push(f);
      }

      setFiles((prev) => {
        const remaining = MAX_FILES - prev.length;
        const toAdd = valid.slice(0, remaining);
        if (valid.length > remaining) {
          toast({
            title: "Maximum files reached",
            description: `You can merge up to ${MAX_FILES} PDFs at once.`,
            variant: "destructive",
          });
        }
        const next = [...prev, ...toAdd];
        if (next.length > 0) setStage("files-selected");
        return next;
      });

      if (rejected > 0) {
        toast({
          title: `${rejected} file${rejected !== 1 ? "s" : ""} skipped`,
          description: `Only PDF files up to ${maxFileSize} can be merged.`,
          variant: "destructive",
        });
      }
    },
    [acceptedFormats, maxSizeInBytes, maxFileSize, toast],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) handleFilesSelection(dropped);
    },
    [handleFilesSelection],
  );

  const moveUp = useCallback((index: number) => {
    setFiles((prev) => {
      if (index <= 0) return prev;
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setFiles((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return next;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setStage("upload");
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setStage("upload");
    setErrorMessage(null);
  }, []);

  const reset = useCallback(() => {
    setStage("upload");
    setFiles([]);
    setProgress(0);
    setErrorMessage(null);
    setDownloadUrl(null);
    setIsDragOver(false);
  }, []);

  const pollJob = (jobId: number): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 90;
      const tick = async () => {
        try {
          if (!mountedRef.current) {
            resolve();
            return;
          }
          const res = await fetch(`/api/jobs/${jobId}`);
          const data = await res.json();
          if (!mountedRef.current) {
            resolve();
            return;
          }
          if (!data.success) throw new Error("Failed to check status");
          const job = data.data;
          if (job.status === "completed") {
            setDownloadUrl(`/api/download/${jobId}`);
            setOutputName(job.outputFilename || "merged.pdf");
            setProgress(100);
            setStage("completed");
            resolve();
            return;
          }
          if (job.status === "failed") {
            throw new Error(job.errorMessage || "Merge failed");
          }
          setProgress((p) => Math.min(95, p + 7));
          attempts += 1;
          if (attempts < maxAttempts) {
            setTimeout(tick, 1200);
          } else {
            throw new Error("Processing took longer than expected");
          }
        } catch (err) {
          reject(err);
        }
      };
      setTimeout(tick, 600);
    });

  const startMerge = async () => {
    if (files.length < 2) return;
    setStage("merging");
    setProgress(8);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      // Append in the user-chosen order; the backend merges strictly in this order.
      for (const f of files) formData.append("files", f);

      const res = await authedFetch("/api/merge-pdfs", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Could not start merge");
      }
      await pollJob(data.data.jobId);
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorMessage(err instanceof Error ? err.message : "Merge failed");
      setStage("error");
    }
  };

  const handleDownload = async () => {
    if (!downloadUrl) return;
    try {
      await downloadFromUrl(downloadUrl, outputName);
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Could not download the file.",
        variant: "destructive",
      });
    }
  };

  const stageLabel =
    stage === "files-selected" ? "files selected" : stage === "merging" ? "merging" : stage;

  // Tool-specific upload copy so the merger's upload page matches every other
  // tool: bare dropzone with a button that names the tool ("Merge PDFs").
  const cfg = toolConfigs["merge-pdfs"];
  const uploadTitle = cfg?.dropAreaText;
  const uploadActionLabel = cfg ? getToolActionLabel(cfg) : toolTitle;
  const isPaused = useToolPaused("merge_pdfs");

  return (
    <ToolPageShell
      title={toolTitle}
      description={toolDescription}
      icon={toolIcon}
      iconBoxClassName={iconBg}
      maxWidth="max-w-4xl"
      showHeader={stage !== "upload"}
    >
      {/* Paused by an admin: friendly notice instead of the dropzone. */}
      {stage === "upload" && isPaused && <PausedToolNotice toolTitle={toolTitle} />}

      {/* Upload Stage — bare dropzone, identical design to every other tool */}
      {stage === "upload" && !isPaused && (
        <EnhancedUploadArea
          acceptedFormats={acceptedFormats}
          maxFileSize={maxFileSize}
          maxFiles={MAX_FILES}
          onFilesSelected={handleFilesSelection}
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          currentFileCount={files.length}
          showAdvancedFeatures={true}
          toolId="merge-pdfs"
          title={uploadTitle}
          actionLabel={uploadActionLabel}
        />
      )}

      {/* Workflow Card — only after files are selected / merging / done */}
      {stage !== "upload" && (
      <div className="bg-[#fffdf9] rounded-[14px] border border-[#e7e0d5] shadow-[0_24px_48px_-36px_rgba(28,25,23,0.45)] overflow-hidden">
        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-[#faf7f2] border-b">
          <div className="flex items-center justify-between mb-2">
            <div
              className={`flex items-center space-x-2 ${
                stage === "completed"
                  ? "text-green-600"
                  : stage === "error"
                    ? "text-red-600"
                    : "text-[#c8302a]"
              }`}
            >
              {stage === "files-selected" && <FileCheck className="w-4 h-4" />}
              {stage === "merging" && <ConverterStatusIcon status="processing" size={16} />}
              {stage === "completed" && <CheckCircle className="w-4 h-4" />}
              {stage === "error" && <AlertCircle className="w-4 h-4" />}
              <span className="text-sm font-medium capitalize">{stageLabel}</span>
            </div>
            {files.length > 0 && stage !== "completed" && stage !== "error" && (
              <div className="text-sm text-[#57534e]" data-testid="text-merge-count">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </div>
            )}
          </div>
          {stage === "merging" && <Progress value={progress} className="h-2" />}
        </div>

        {/* Content Area */}
        <div className="p-8">
          {/* Files Selected Stage */}
          {stage === "files-selected" && files.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-[#1c1917]">
                    {files.length} File{files.length !== 1 ? "s" : ""} Selected
                  </h3>
                  <p className="text-[#57534e]">
                    Use the arrows to set the merge order (top = first page).
                  </p>
                </div>
                <Button
                  onClick={clearAll}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  data-testid="button-clear-merge"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>

              <div className="max-h-72 overflow-y-auto pr-1">
                <OrderedFileList
                  files={files}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  onRemove={removeFile}
                />
              </div>

              {/* Add More Files Area */}
              <div className="border-2 border-dashed border-[#e7e0d5] rounded-lg p-4">
                <EnhancedUploadArea
                  acceptedFormats={acceptedFormats}
                  maxFileSize={maxFileSize}
                  maxFiles={MAX_FILES}
                  onFilesSelected={handleFilesSelection}
                  isDragOver={isDragOver}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  currentFileCount={files.length}
                  showAdvancedFeatures={false}
                  toolId="merge-pdfs"
                />
              </div>

              {files.length < 2 && (
                <p className="text-center text-sm text-amber-600" data-testid="text-merge-hint">
                  Add at least 2 PDFs to merge them into one document.
                </p>
              )}

              <div className="flex justify-center space-x-4 pt-2">
                <Button
                  onClick={startMerge}
                  disabled={files.length < 2}
                  className="bg-[#f7433d] hover:bg-[#c8302a] text-white px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-start-merge"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Merge {files.length > 1 ? `${files.length} PDFs` : "PDFs"}
                </Button>
                <Button onClick={reset} variant="outline" className="px-8 py-3">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
              </div>
            </div>
          )}

          {/* Merging Stage */}
          {stage === "merging" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <ConverterStatusIcon status="processing" size={88} />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-[#1c1917] mb-2">Merging PDFs…</h3>
                <p className="text-[#57534e]">
                  Combining {files.length} file{files.length !== 1 ? "s" : ""} into one document
                </p>
              </div>
            </div>
          )}

          {/* Completed Stage */}
          {stage === "completed" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <ConverterStatusIcon status="success" size={88} />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-[#1c1917] mb-2">Merge Complete!</h3>
                <p className="text-[#57534e]">Your PDFs were combined into a single document.</p>
              </div>
              <div className="flex justify-center space-x-4 pt-2">
                <Button
                  onClick={handleDownload}
                  className="bg-[#f7433d] hover:bg-[#c8302a] text-white px-8 py-3"
                  data-testid="button-download-merged"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Merged PDF
                </Button>
                <Button onClick={reset} variant="outline" className="px-8 py-3">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Merge More Files
                </Button>
              </div>
            </div>
          )}

          {/* Error Stage */}
          {stage === "error" && errorMessage && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <ConverterStatusIcon status="error" size={88} />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-[#1c1917] mb-2">Merge Failed</h3>
                <p className="text-red-600" data-testid="text-merge-error">
                  {errorMessage}
                </p>
              </div>
              <Button
                onClick={reset}
                className="bg-[#f7433d] hover:bg-[#c8302a] text-white px-8 py-3"
                data-testid="button-merge-retry"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
      )}
    </ToolPageShell>
  );
};
