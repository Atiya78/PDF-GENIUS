import React, { useState, useRef, useEffect } from "react";
import { authedFetch, getAuthError, AuthError } from "@/lib/authedFetch";
import { downloadFromUrl } from "@/lib/download";
import { useLocation } from "wouter";
import { AuthErrorAction } from "@/components/AuthErrorAction";
import { toolConfigs, type ToolConfig } from "@/lib/toolConfig";
import { useSeo } from "@/lib/useSeo";
import { useToolPaused } from "@/lib/usePausedTools";
import {
  Upload,
  Download,
  X,
  RefreshCw,
  FileText,
  SlidersHorizontal,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "@/styles/tools.css";
import { ConverterStatusIcon } from "@/components/converter-status-icon";
import { PausedBadge } from "@/components/PausedBadge";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { OrderedFileList } from "@/components/OrderedFileList";
import {
  ResizeModal,
  CropModal,
  RotateModal,
  type WorkingImage,
} from "./ImageEditTools";
import { loadImageFromUrl, downloadBlob, withSuffix, exportExtension } from "@/lib/imageTools";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Map frontend tool config ids to the exact backend ToolType strings.
// NOTE: several image tools are singular on the backend (resize_image, not
// resize_images), so a naive dash->underscore replace would break them.
const toolTypeMap: Record<string, string> = {
  "pdf-to-word": "pdf_to_word",
  "pdf-to-excel": "pdf_to_excel",
  "pdf-to-powerpoint": "pdf_to_powerpoint",
  "pdf-to-images": "pdf_to_images",
  "word-to-pdf": "word_to_pdf",
  "excel-to-pdf": "excel_to_pdf",
  "csv-to-pdf": "csv_to_pdf",
  "powerpoint-to-pdf": "powerpoint_to_pdf",
  "html-to-pdf": "html_to_pdf",
  "images-to-pdf": "images_to_pdf",
  "resize-images": "resize_image",
  "crop-images": "crop_image",
  "rotate-images": "rotate_image",
  "convert-image-format": "convert_image_format",
  "compress-images": "compress_image",
  "upscale-images": "upscale_image",
  "remove-background": "remove_background",
  "merge-pdfs": "merge_pdfs",
  "split-pdf": "split_pdf",
  "compress-pdf": "compress_pdf",
  "rotate-pdf": "rotate_pdf",
  "compress-video": "compress_video",
};

// These three tools are handled entirely in the browser with a manual-options
// popup (set width/height, crop region, or rotation) instead of a server-side
// /api/convert call with no options.
type EditOp = "resize" | "crop" | "rotate";
const manualEditMap: Record<string, EditOp> = {
  "resize-images": "resize",
  "crop-images": "crop",
  "rotate-images": "rotate",
};

// Editor tools live on their own full-page route (client-side editors). Clicking
// their /tools card navigates there instead of opening the inline upload popup.
const NAVIGATE_TOOL_IDS = new Set([
  "edit-pdf",
  "crop-pdf",
  "sign-pdf",
  "watermark-pdf",
  "add-image-pdf",
  "delete-pages-pdf",
  "ocr-pdf",
  // Combines MULTIPLE images into one PDF — needs the dedicated multi-file page,
  // not the single-file card modal.
  "images-to-pdf",
  // Video compression opens a level-picker popup on its dedicated page.
  "compress-video",
]);
const editSuffixMap: Record<EditOp, string> = {
  resize: "resized",
  crop: "cropped",
  rotate: "rotated",
};

// Backend /api/merge-pdfs caps at 20 files; enforce the same limit client-side so
// the card never submits an over-limit batch the server would reject.
const MAX_MERGE_FILES = 20;

type CardStage = "idle" | "ready" | "converting" | "done" | "error";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Correct, human-readable action label per tool for the convert button.
// Avoids generic/incorrect text like "Convert to Same Format".
const getActionLabel = (cfg: ToolConfig): string => {
  const labels: Record<string, string> = {
    "pdf-to-word": "Convert to Word",
    "pdf-to-excel": "Convert to Excel",
    "pdf-to-powerpoint": "Convert to PowerPoint",
    "pdf-to-images": "Convert to Images",
    "word-to-pdf": "Convert to PDF",
    "excel-to-pdf": "Convert to PDF",
    "csv-to-pdf": "Convert to PDF",
    "powerpoint-to-pdf": "Convert to PDF",
    "html-to-pdf": "Convert to PDF",
    "images-to-pdf": "Convert to PDF",
    "resize-images": "Resize Images",
    "crop-images": "Crop Images",
    "rotate-images": "Rotate Images",
    "convert-image-format": "Convert Image",
    "compress-images": "Compress Images",
    "upscale-images": "Upscale Images",
    "remove-background": "Remove Background",
    "merge-pdfs": "Merge PDFs",
    "split-pdf": "Split PDF",
    "compress-pdf": "Compress PDF",
    "rotate-pdf": "Rotate PDF",
  };
  return labels[cfg.id] ?? cfg.title;
};

interface ToolCardProps {
  toolConfig: ToolConfig;
}

const ToolCard: React.FC<ToolCardProps> = ({ toolConfig }) => {
  const [stage, setStage] = useState<CardStage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [targetFormat, setTargetFormat] = useState<string>("png");
  const [compressionQuality, setCompressionQuality] = useState<number>(80);
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [editImage, setEditImage] = useState<WorkingImage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const [, setLocation] = useLocation();
  const isNavigateTool = NAVIGATE_TOOL_IDS.has(toolConfig.id) || toolConfig.id === "csv-to-pdf";
  const isComingSoon = !!toolConfig.comingSoon;
  // Admin-paused tools are greyed out just like coming-soon ones, but with a
  // "Temporarily unavailable" label. Editor tools without a backend toolType
  // fall back to the dash→underscore form so admin pauses still apply.
  const isPaused = useToolPaused(
    toolTypeMap[toolConfig.id] ?? toolConfig.id.replace(/-/g, "_"),
  );
  const isDisabled = isComingSoon || isPaused;
  const editUrlRef = useRef<string | null>(null);
  // Bumped on every new edit action (open/apply) and on reset; an async decode
  // whose token no longer matches is stale and must not touch state.
  const loadSeqRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (editUrlRef.current) URL.revokeObjectURL(editUrlRef.current);
    };
  }, []);

  const editOp = manualEditMap[toolConfig.id];
  const isManualEdit = Boolean(editOp);
  const needsFormatPicker = toolConfig.id === "convert-image-format";
  const needsCompressionPicker = toolConfig.id === "compress-images";
  // PDF Merge accepts and accumulates MULTIPLE files into one document.
  const isMultiMerge = toolConfig.id === "merge-pdfs";

  // Track the single live object URL for the working image so it can be revoked
  // when replaced or on unmount, avoiding leaks across re-edits.
  const setWorking = (wi: WorkingImage | null) => {
    if (editUrlRef.current && (!wi || wi.url !== editUrlRef.current)) {
      URL.revokeObjectURL(editUrlRef.current);
    }
    editUrlRef.current = wi ? wi.url : null;
    setEditImage(wi);
  };

  // Load the picked file into a working image and open its manual-options popup.
  const openEditor = async (picked: File) => {
    const url = URL.createObjectURL(picked);
    const seq = ++loadSeqRef.current;
    try {
      const img = await loadImageFromUrl(url);
      if (!mountedRef.current || seq !== loadSeqRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      setWorking({
        blob: picked,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        name: picked.name,
      });
      setFile(picked);
      setError(null);
      setStage("ready");
      setModalOpen(true);
    } catch {
      URL.revokeObjectURL(url);
      if (!mountedRef.current || seq !== loadSeqRef.current) return;
      setError("Could not load this image. It may be corrupted or unsupported.");
      setStage("error");
    }
  };

  // Modal "Apply" callback: the edited blob becomes the new working image so the
  // result can be downloaded (and re-edited), then show the done state.
  const handleEditApply = async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const seq = ++loadSeqRef.current;
    try {
      const img = await loadImageFromUrl(url);
      if (!mountedRef.current || seq !== loadSeqRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      const baseName = file?.name ?? editImage?.name ?? "image.png";
      setWorking({
        blob,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        name: baseName,
      });
      setModalOpen(false);
      setStage("done");
    } catch {
      URL.revokeObjectURL(url);
      if (!mountedRef.current || seq !== loadSeqRef.current) return;
      setModalOpen(false);
      setError("Could not process the edited image.");
      setStage("error");
    }
  };

  const handleEditDownload = () => {
    if (!editImage || !editOp) return;
    // Canvas re-encodes non-jpeg/png/webp inputs (e.g. gif/bmp) as PNG, so the
    // download extension must match the actual exported bytes.
    downloadBlob(
      editImage.blob,
      withSuffix(editImage.name, editSuffixMap[editOp], exportExtension(editImage.name)),
    );
  };

  const acceptAttr = toolConfig.acceptedFormats.join(",");
  const formatList = toolConfig.acceptedFormats
    .map((f) => f.replace(".", "").toUpperCase())
    .join(", ");
  const maxSizeBytes = (parseFloat(toolConfig.maxFileSize) || 50) * 1024 * 1024;

  const selectFile = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    if (arr.length === 0) return;
    // A file was chosen — close the upload popup; the card now shows the result.
    setUploadOpen(false);

    // PDF Merge accumulates multiple validated files; everything else is single-file.
    if (isMultiMerge) {
      const valid: File[] = [];
      for (const f of arr) {
        const fext = "." + (f.name.split(".").pop()?.toLowerCase() || "");
        if (!toolConfig.acceptedFormats.includes(fext)) {
          setError(`Unsupported file type. Accepts: ${formatList}`);
          setStage("error");
          return;
        }
        if (f.size > maxSizeBytes) {
          setError(`"${f.name}" is too large. Max ${toolConfig.maxFileSize}.`);
          setStage("error");
          return;
        }
        valid.push(f);
      }
      const remaining = MAX_MERGE_FILES - mergeFiles.length;
      if (remaining <= 0) {
        setStage("ready");
        return;
      }
      const toAdd = valid.slice(0, remaining);
      setMergeFiles((prev) => [...prev, ...toAdd]);
      setError(null);
      setStage("ready");
      return;
    }

    const picked = arr[0];

    const ext = "." + (picked.name.split(".").pop()?.toLowerCase() || "");
    if (!toolConfig.acceptedFormats.includes(ext)) {
      setError(`Unsupported file type. Accepts: ${formatList}`);
      setStage("error");
      return;
    }
    if (picked.size > maxSizeBytes) {
      setError(`File is too large. Max ${toolConfig.maxFileSize}.`);
      setStage("error");
      return;
    }
    // Manual image tools open a popup to set options instead of converting.
    if (isManualEdit) {
      void openEditor(picked);
      return;
    }
    setFile(picked);
    setError(null);
    setStage("ready");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      selectFile(e.target.files);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isNavigateTool) {
      setLocation(toolConfig.route!);
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      selectFile(e.dataTransfer.files);
    }
  };

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
            setOutputName(job.outputFilename || "converted-file");
            setProgress(100);
            setStage("done");
            resolve();
            return;
          }
          if (job.status === "failed") {
            throw new Error(job.errorMessage || "Conversion failed");
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

  const startConversion = async () => {
    if (!file) return;
    setStage("converting");
    setProgress(8);
    setError(null);
    setAuthError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("toolType", toolTypeMap[toolConfig.id]);
      formData.append("fileName", file.name);
      formData.append("fileSize", file.size.toString());
      const options: Record<string, unknown> = {};
      if (needsFormatPicker) options.outputFormat = targetFormat;
      if (needsCompressionPicker) options.quality = compressionQuality;
      formData.append("options", JSON.stringify(options));

      const res = await authedFetch("/api/convert", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const authErr = getAuthError(res.status, data?.error);
      if (authErr) throw authErr;
      if (!data.success) {
        throw new Error(data.error || "Could not start conversion");
      }
      await pollJob(data.data.jobId);
    } catch (err) {
      if (err instanceof AuthError) setAuthError(err);
      setError(err instanceof Error ? err.message : "Conversion failed");
      setStage("error");
    }
  };

  const removeMergeFile = (index: number) => {
    setMergeFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setStage("idle");
      return next;
    });
  };

  const moveMergeFileUp = (index: number) => {
    setMergeFiles((prev) => {
      if (index <= 0) return prev;
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveMergeFileDown = (index: number) => {
    setMergeFiles((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return next;
    });
  };

  const startMerge = async () => {
    if (mergeFiles.length < 2) return;
    setStage("converting");
    setProgress(8);
    setError(null);
    setAuthError(null);
    try {
      const formData = new FormData();
      for (const f of mergeFiles) formData.append("files", f);

      const res = await authedFetch("/api/merge-pdfs", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const authErr = getAuthError(res.status, data?.error);
      if (authErr) throw authErr;
      if (!data.success) {
        throw new Error(data.error || "Could not start merge");
      }
      await pollJob(data.data.jobId);
    } catch (err) {
      if (err instanceof AuthError) setAuthError(err);
      setError(err instanceof Error ? err.message : "Merge failed");
      setStage("error");
    }
  };

  const handleDownload = async () => {
    if (!downloadUrl) return;
    try {
      await downloadFromUrl(downloadUrl, outputName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const reset = () => {
    loadSeqRef.current += 1; // invalidate any in-flight edit decode
    setStage("idle");
    setFile(null);
    setMergeFiles([]);
    setProgress(0);
    setError(null);
    setAuthError(null);
    setDownloadUrl(null);
    setOutputName("");
    setIsDragOver(false);
    setModalOpen(false);
    setUploadOpen(false);
    setWorking(null);
  };

  const cardBase =
    "tl-sheet w-full my-3 md:col-span-2";
  const cardActive = "min-h-[280px]";

  // Compact header used in all non-idle stages
  const CompactHeader = (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`tl-icon !h-11 !w-11 shrink-0`}
      >
        <ToolLottieIcon toolId={toolConfig.id} config={toolConfig} size={34} />
      </div>
      <h3 className="font-['Poppins'] text-base font-semibold text-[#1c1917] leading-tight">
        {toolConfig.title}
      </h3>
      {stage !== "converting" && (
        <button
          onClick={reset}
          className="ml-auto grid h-11 w-11 place-items-center rounded-lg text-[#8a837b] hover:bg-[#faf7f2] hover:text-[#1c1917] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1c1917]"
          aria-label="Close"
          data-testid={`button-close-${toolConfig.id}`}
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  // The dropzone popup (matches the reference upload screen). Opens when the
  // card is clicked: the user can drag-drop or browse, the button shows this
  // tool's action label, and the supported formats are listed dynamically.
  const uploadDialog = (
    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="sr-only">
          Upload files for {toolConfig.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {toolConfig.description}
        </DialogDescription>

        <UploadDropzone
          acceptedFormats={toolConfig.acceptedFormats}
          maxFileSize={toolConfig.maxFileSize}
          multiple={isMultiMerge}
          maxFiles={isMultiMerge ? MAX_MERGE_FILES : undefined}
          currentFileCount={isMultiMerge ? mergeFiles.length : 0}
          toolId={toolConfig.id}
          title={toolConfig.dropAreaText}
          actionLabel={getActionLabel(toolConfig)}
          validate={false}
          onFiles={(files) => selectFile(files)}
          testId={`dropzone-${toolConfig.id}`}
        />
      </DialogContent>
    </Dialog>
  );

  if (stage === "idle") {
    return (
      <>
        <div
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          aria-disabled={isDisabled || undefined}
          onClick={() => {
            if (isDisabled) return;
            isNavigateTool ? setLocation(toolConfig.route!) : setUploadOpen(true);
          }}
          onKeyDown={(e) => {
            if (isDisabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              isNavigateTool ? setLocation(toolConfig.route!) : setUploadOpen(true);
            }
          }}
          onDragOver={(e) => {
            if (isDisabled) return;
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={isDisabled ? undefined : handleDrop}
          className={`tl-row ${isDragOver ? "tl-drag" : ""} ${isDisabled ? "" : "cursor-pointer"}`}
          data-testid={`card-tool-${toolConfig.id}`}
        >
          <div className="tl-icon">
            <ToolLottieIcon toolId={toolConfig.id} config={toolConfig} size={36} />
          </div>
          <div className="min-w-0">
            <h3 className="tl-title flex flex-wrap items-center gap-2 font-['Poppins'] text-[16px] font-semibold leading-snug text-[#1c1917]">
              {toolConfig.title}
              {isComingSoon && (
                <span className="tl-tag tl-tag-coral" data-testid={`hint-coming-soon-${toolConfig.id}`}>
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Coming soon
                </span>
              )}
              {!isComingSoon && isPaused && (
                <PausedBadge testId={`badge-paused-${toolConfig.id}`} />
              )}
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[#57534e]">
              {toolConfig.description}
            </p>
            <p className="edu-mono mt-2 text-[11.5px] text-[#8a837b]">
              <span className="sr-only">Accepts: </span>{formatList}
              <span className="mx-1.5 text-[#c9bfb1]" aria-hidden="true">/</span>
              max {toolConfig.maxFileSize}
            </p>
            {!isComingSoon && isPaused && (
              <p className="mt-1 text-xs font-semibold text-[#7a5410]" data-testid={`hint-paused-${toolConfig.id}`}>
                Temporarily unavailable
              </p>
            )}
            {!isComingSoon && !isPaused && (
              <span className="sr-only" data-testid={`hint-upload-${toolConfig.id}`}>Click to upload</span>
            )}
          </div>
          {isDisabled ? (
            <Clock className="mt-1 h-4 w-4 text-[#b5aa9b]" aria-hidden="true" />
          ) : isNavigateTool ? (
            <ArrowRight className="tl-arrow mt-1 h-4 w-4" aria-hidden="true" />
          ) : (
            <Upload className="tl-arrow mt-1 h-4 w-4" aria-hidden="true" />
          )}
        </div>

        {uploadDialog}
      </>
    );
  }

  return (
    <div className={`${cardBase} ${cardActive}`} data-testid={`card-tool-${toolConfig.id}`}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        multiple={isMultiMerge}
        onChange={handleInputChange}
        className="hidden"
        data-testid={`input-file-${toolConfig.id}`}
      />
      {CompactHeader}

      {/* Manual-edit option popups (resize / crop / rotate) */}
      {isManualEdit && modalOpen && editImage && editOp === "resize" && (
        <ResizeModal
          image={editImage}
          onApply={handleEditApply}
          onCancel={() => setModalOpen(false)}
        />
      )}
      {isManualEdit && modalOpen && editImage && editOp === "crop" && (
        <CropModal
          image={editImage}
          onApply={handleEditApply}
          onCancel={() => setModalOpen(false)}
        />
      )}
      {isManualEdit && modalOpen && editImage && editOp === "rotate" && (
        <RotateModal
          image={editImage}
          onApply={handleEditApply}
          onCancel={() => setModalOpen(false)}
        />
      )}

      {/* READY (server-conversion tools) */}
      {stage === "ready" && file && !isManualEdit && !isMultiMerge && (
        <div
          className="flex flex-col"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={handleDrop}
        >
          <div
            className={`flex items-center gap-3 p-3 mb-4 rounded-xl border ${
              isDragOver ? "border-[#f7433d] bg-[#fdece9]" : "border-[#e7e0d5] bg-white"
            }`}
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#fdece9] shrink-0">
              <FileText className="w-5 h-5 text-[#c8302a]" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-medium text-[#1c1917] truncate"
                data-testid={`text-filename-${toolConfig.id}`}
              >
                {file.name}
              </p>
              <p className="text-xs text-[#57534e]">{formatBytes(file.size)}</p>
            </div>
          </div>

          {needsFormatPicker && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-[#57534e] mb-1">
                Convert to
              </label>
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#e7e0d5] bg-white text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/30 focus:border-[#1c1917]"
                data-testid={`select-format-${toolConfig.id}`}
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="webp">WebP</option>
                <option value="gif">GIF</option>
                <option value="avif">AVIF</option>
                <option value="tiff">TIFF</option>
              </select>
            </div>
          )}

          {needsCompressionPicker && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={`slider-compression-${toolConfig.id}`}
                  className="text-xs font-medium text-[#57534e]"
                >
                  Compression level
                </label>
                <span
                  className="text-xs font-semibold text-[#c8302a]"
                  data-testid={`text-compression-quality-${toolConfig.id}`}
                >
                  Quality {compressionQuality}%
                </span>
              </div>
              <input
                id={`slider-compression-${toolConfig.id}`}
                type="range"
                min={10}
                max={100}
                step={5}
                value={compressionQuality}
                onChange={(e) => setCompressionQuality(Number(e.target.value))}
                className="w-full tl-range cursor-pointer"
                data-testid={`slider-compression-${toolConfig.id}`}
              />
              <div className="flex justify-between text-[10px] text-[#8a837b] mt-1">
                <span>Smaller file</span>
                <span>Higher quality</span>
              </div>
            </div>
          )}

          <button
            onClick={startConversion}
            className="tl-btn mb-1 h-12"
            data-testid={`button-convert-${toolConfig.id}`}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {needsFormatPicker
              ? `Convert to ${targetFormat.toUpperCase()}`
              : getActionLabel(toolConfig)}
          </button>

          <button
            onClick={() => inputRef.current?.click()}
            className="tl-link"
            data-testid={`button-change-${toolConfig.id}`}
          >
            Choose a different file
          </button>
        </div>
      )}

      {/* READY (PDF merge — multiple files) */}
      {stage === "ready" && isMultiMerge && (
        <div
          className="flex flex-col"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={handleDrop}
        >
          <div
            className={`mb-3 max-h-[180px] overflow-y-auto pr-1 rounded-xl ${
              isDragOver ? "ring-2 ring-[#f7433d]" : ""
            }`}
          >
            <OrderedFileList
              files={mergeFiles}
              onMoveUp={moveMergeFileUp}
              onMoveDown={moveMergeFileDown}
              onRemove={removeMergeFile}
              size="compact"
            />
          </div>

          <p
            className="text-[11px] text-[#57534e] text-center mb-3"
            data-testid={`text-mergecount-${toolConfig.id}`}
          >
            {mergeFiles.length} file{mergeFiles.length === 1 ? "" : "s"} selected
            {mergeFiles.length < 2 ? " — add at least 2 to merge" : ""}
          </p>

          <button
            onClick={startMerge}
            disabled={mergeFiles.length < 2}
            className="tl-btn mb-1 h-12"
            data-testid={`button-merge-${toolConfig.id}`}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Merge PDFs
          </button>

          <button
            onClick={() => inputRef.current?.click()}
            className="tl-link"
            data-testid={`button-addmore-${toolConfig.id}`}
          >
            + Add more files
          </button>
        </div>
      )}

      {/* READY (manual image-edit tools) */}
      {stage === "ready" && file && isManualEdit && (
        <div className="flex flex-col">
          <div className="flex items-center gap-3 p-3 mb-4 rounded-xl border border-[#e7e0d5] bg-white">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#fdece9] shrink-0">
              <FileText className="w-5 h-5 text-[#c8302a]" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-medium text-[#1c1917] truncate"
                data-testid={`text-filename-${toolConfig.id}`}
              >
                {file.name}
              </p>
              <p className="text-xs text-[#57534e]">
                {editImage
                  ? `${editImage.width} × ${editImage.height}px`
                  : formatBytes(file.size)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="tl-btn mb-1 h-12"
            data-testid={`button-edit-${toolConfig.id}`}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            {getActionLabel(toolConfig)}
          </button>

          <button
            onClick={() => inputRef.current?.click()}
            className="tl-link"
            data-testid={`button-change-${toolConfig.id}`}
          >
            Choose a different file
          </button>
        </div>
      )}

      {/* CONVERTING */}
      {stage === "converting" && (
        <div className="flex flex-col items-center justify-center py-6">
          <ConverterStatusIcon status="processing" size={80} className="mb-3" />
          <p className="text-sm font-medium text-[#1c1917] mb-1">
            Converting your file…
          </p>
          {file && (
            <p className="text-xs text-[#57534e] truncate max-w-full px-4 mb-4">
              {file.name}
            </p>
          )}
          <div className="tl-progress w-full mb-2">
            <div
              style={{ width: `${progress}%` }}
              data-testid={`progress-${toolConfig.id}`}
            />
          </div>
          <p className="edu-mono text-xs text-[#8a837b]">{Math.round(progress)}%</p>
        </div>
      )}

      {/* DONE (server-conversion tools) */}
      {stage === "done" && !isManualEdit && (
        <div className="flex flex-col items-center justify-center py-4">
          <ConverterStatusIcon status="success" size={80} className="mb-2" />
          <p className="font-['Poppins'] text-base font-semibold text-[#1c1917] mb-1">Ready!</p>
          <p
            className="text-xs text-[#57534e] text-center truncate max-w-full px-2 mb-5"
            data-testid={`text-output-${toolConfig.id}`}
          >
            {outputName}
          </p>

          <button
            onClick={handleDownload}
            className="tl-btn mb-1 h-12"
            data-testid={`button-download-${toolConfig.id}`}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>

          <button
            onClick={reset}
            className="tl-link"
            data-testid={`button-again-${toolConfig.id}`}
          >
            Convert another file
          </button>
        </div>
      )}

      {/* DONE (manual image-edit tools) */}
      {stage === "done" && isManualEdit && (
        <div className="flex flex-col items-center justify-center py-4">
          <ConverterStatusIcon status="success" size={80} className="mb-2" />
          <p className="font-['Poppins'] text-base font-semibold text-[#1c1917] mb-1">Ready!</p>
          <p
            className="text-xs text-[#57534e] text-center truncate max-w-full px-2 mb-5"
            data-testid={`text-output-${toolConfig.id}`}
          >
            {editImage ? `${editImage.width} × ${editImage.height}px` : ""}
          </p>

          <button
            onClick={handleEditDownload}
            className="tl-btn mb-1 h-12"
            data-testid={`button-download-${toolConfig.id}`}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="tl-link"
            data-testid={`button-editagain-${toolConfig.id}`}
          >
            Edit again
          </button>

          <button
            onClick={reset}
            className="tl-link"
            data-testid={`button-again-${toolConfig.id}`}
          >
            Use another file
          </button>
        </div>
      )}

      {/* ERROR */}
      {stage === "error" && (
        <div className="flex flex-col items-center justify-center py-4">
          <ConverterStatusIcon status="error" size={80} className="mb-2" />
          <p className="font-['Poppins'] text-base font-semibold text-[#1c1917] mb-1">
            {authError ? "Sign in required" : "Something went wrong"}
          </p>
          <p
            className="text-xs text-[#57534e] text-center px-2 mb-3"
            data-testid={`text-error-${toolConfig.id}`}
          >
            {error}
          </p>

          {authError && (
            <div className="mb-4">
              <AuthErrorAction
                to={authError.linkTo}
                label={authError.linkLabel}
                testId={`link-auth-${toolConfig.id}`}
              />
            </div>
          )}

          <button
            onClick={() => inputRef.current?.click()}
            className="tl-btn h-12"
            data-testid={`button-retry-${toolConfig.id}`}
          >
            <Upload className="w-4 h-4 mr-2" />
            Try another file
          </button>
        </div>
      )}
    </div>
  );
};

export const Tools: React.FC = () => {
  useSeo({
    title: "All PDF & Image Tools — Free Online",
    description:
      "Browse every free PDF Genius tool: convert, merge, split, compress, rotate, sign, OCR PDFs plus resize, crop and convert images. No signup, no watermarks.",
    canonicalPath: "/tools",
  });
  const [activeFilter, setActiveFilter] = useState("All Tools");

  const mainToolKeys = [
    "pdf-to-word",
    "pdf-to-excel",
    "pdf-to-powerpoint",
    "pdf-to-images",
    "word-to-pdf",
    "excel-to-pdf",
    "csv-to-pdf",
    "powerpoint-to-pdf",
    "html-to-pdf",
    "images-to-pdf",
    "resize-images",
    "crop-images",
    "rotate-images",
    "convert-image-format",
    "compress-images",
    "upscale-images",
    "remove-background",
    "edit-pdf",
    "merge-pdfs",
    "split-pdf",
    "compress-pdf",
    "rotate-pdf",
    "crop-pdf",
    "sign-pdf",
    "watermark-pdf",
    "add-image-pdf",
    "delete-pages-pdf",
    "ocr-pdf",
    "compress-video",
  ];

  const toolsData = mainToolKeys.map((key) => toolConfigs[key]).filter(Boolean);

  const filterButtons = [
    "All Tools",
    "Convert",
    "Edit",
    "Organize",
    "Security",
    "Image Tools",
    "Video Tools",
  ];

  const filteredTools =
    activeFilter === "All Tools"
      ? toolsData
      : toolsData.filter((tool) => tool.category === activeFilter);

  const counts = filterButtons.reduce<Record<string, number>>((acc, name) => {
    acc[name] = name === "All Tools" ? toolsData.length : toolsData.filter((t) => t.category === name).length;
    return acc;
  }, {});
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };
  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, []);
  const scrollBy = (dir: number) => scrollerRef.current?.scrollBy({ left: dir * 240 });

  return (
    <div className="tl-root min-h-[100dvh]">
      <header className="border-b border-[#e7e0d5]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-end lg:pb-12 lg:pt-14">
          <div>
            <p className="edu-eyebrow">Index</p>
            <h1 className="mt-3 font-['Poppins'] text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[#1c1917] sm:text-[2.8rem]" data-testid="text-tools-title">
              Every tool
            </h1>
          </div>
          <p className="max-w-xl text-[16px] leading-relaxed text-[#57534e]">
            Convert, merge, split, compress, rotate, sign and OCR PDFs, plus resize, crop and convert images.
            Pick a row to open it, or drop a file straight onto one. <span className="edu-mono text-[#1c1917]">{toolsData.length}</span> tools.
          </p>
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b border-[#e7e0d5] bg-[#faf7f2]/95 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
          <div
            ref={scrollerRef}
            onScroll={updateEdges}
            className="tl-scroller flex-1"
            role="toolbar"
            aria-label="Filter tools by category"
          >
            {filterButtons.filter((name) => counts[name] > 0).map((buttonName, index) => (
              <button
                key={index}
                type="button"
                aria-pressed={activeFilter === buttonName}
                className={`tl-filter ${activeFilter === buttonName ? "tl-filter-on" : ""}`}
                onClick={() => setActiveFilter(buttonName)}
                data-testid={`filter-${buttonName.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <span className="self-center">{buttonName}</span>
                <span className="tl-count self-center">{counts[buttonName]}</span>
              </button>
            ))}
          </div>
          <div className="hidden shrink-0 gap-1.5 sm:flex">
            <button type="button" className="tl-nav" onClick={() => scrollBy(-1)} disabled={edges.start} aria-label="Scroll categories left">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className="tl-nav" onClick={() => scrollBy(1)} disabled={edges.end} aria-label="Scroll categories right">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-['Poppins'] text-lg font-semibold text-[#1c1917]">{activeFilter}</h2>
          <p className="edu-mono text-xs text-[#8a837b]">{filteredTools.length} listed</p>
        </div>
        <div className="grid border-b border-[#e7e0d5] md:grid-cols-2 md:gap-x-10">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} toolConfig={tool} />
          ))}
        </div>
      </div>
    </div>
  );
};
