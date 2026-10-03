import React, { useCallback, useMemo, useRef, useState } from "react";
import { ConverterStatusIcon } from "@/components/converter-status-icon";
import { useToast } from "@/hooks/use-toast";
import { getFileTypeErrorMessage } from "@/lib/toolConfig";
import { cn } from "@/lib/utils";

export interface UploadDropzoneProps {
  /** Accepted extensions, e.g. [".pdf"] or [".jpg", ".png"]. */
  acceptedFormats: string[];
  /** Max size per file. Either an MB number (50) or a label string ("50MB"). */
  maxFileSize: string | number;
  /** Allow selecting more than one file. */
  multiple?: boolean;
  /** Max number of files (only meaningful when `multiple`). */
  maxFiles?: number;
  /** How many files are already selected (only meaningful when `multiple`). */
  currentFileCount?: number;
  /** Tool id so the upload prompt plays that tool's own Lottie animation. */
  toolId?: string;
  /** Big heading shown in the idle state. */
  title?: string;
  /** Sub-heading shown under the title. */
  subtitle?: string;
  /** Label for the blue pill button. */
  actionLabel?: string;
  /** Disable the whole dropzone. */
  disabled?: boolean;
  /** Show the processing animation + a busy label instead of the upload prompt. */
  loading?: boolean;
  /** Busy label shown while `loading`. */
  loadingText?: string;
  /**
   * When false, selected files are passed straight to `onFiles` WITHOUT
   * extension/size checks (used by the multi-file batch workflow which validates
   * each file downstream and shows invalid ones in its list). Defaults to true.
   */
  validate?: boolean;
  /** Receives the picked files (already validated unless `validate` is false). */
  onFiles: (files: File[]) => void;
  /** Called with a human-readable message when a file fails validation. */
  onValidationError?: (message: string) => void;
  className?: string;
  testId?: string;
}

/**
 * The single, canonical upload dropzone used by every tool — PDF converters,
 * PDF editor, image tools and the homepage hero. Owns its own drag state, the
 * hidden file input, extension/size validation, the brand-blue dashed styling,
 * the tool's upload Lottie (via ConverterStatusIcon) and the format/size copy.
 */
export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  acceptedFormats,
  maxFileSize,
  multiple = false,
  maxFiles = 10,
  currentFileCount = 0,
  toolId,
  title,
  subtitle,
  actionLabel,
  disabled = false,
  loading = false,
  loadingText = "Opening file…",
  validate = true,
  onFiles,
  onValidationError,
  className,
  testId,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const { maxBytes, maxSizeLabel } = useMemo(() => {
    if (typeof maxFileSize === "number") {
      return { maxBytes: maxFileSize * 1024 * 1024, maxSizeLabel: `${maxFileSize}MB` };
    }
    const n = parseFloat(maxFileSize);
    return {
      maxBytes: Number.isNaN(n) ? Infinity : n * 1024 * 1024,
      maxSizeLabel: maxFileSize,
    };
  }, [maxFileSize]);

  const formatsList = useMemo(
    () => acceptedFormats.map((f) => f.replace(".", "").toUpperCase()).join(", "),
    [acceptedFormats],
  );

  const remainingSlots = multiple ? maxFiles - currentFileCount : 1;
  const isFull = multiple && remainingSlots <= 0;
  const interactionDisabled = disabled || loading || isFull;

  const raiseError = useCallback(
    (message: string) => {
      if (onValidationError) {
        onValidationError(message);
      } else {
        toast({ title: "Can't use that file", description: message, variant: "destructive" });
      }
    },
    [onValidationError, toast],
  );

  const processFiles = useCallback(
    (fileList: FileList | null) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;

      if (!validate) {
        onFiles(files);
        return;
      }

      const valid: File[] = [];
      let errorMessage = "";
      for (const file of files) {
        const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
        if (!acceptedFormats.includes(ext)) {
          errorMessage = getFileTypeErrorMessage(acceptedFormats);
          continue;
        }
        if (file.size > maxBytes) {
          errorMessage = `That file is too large. Maximum file size is ${maxSizeLabel}.`;
          continue;
        }
        valid.push(file);
      }

      if (errorMessage) raiseError(errorMessage);
      if (valid.length > 0) onFiles(multiple ? valid : [valid[0]]);
    },
    [acceptedFormats, maxBytes, maxSizeLabel, multiple, onFiles, raiseError, validate],
  );

  const openPicker = () => {
    if (!interactionDisabled) inputRef.current?.click();
  };

  const resolvedTitle = title ?? `Drop your ${formatsList} file${multiple ? "s" : ""} here`;
  const resolvedSubtitle = subtitle ?? "or click to browse files";
  const resolvedActionLabel =
    actionLabel ?? (multiple ? "Select Files" : "Select File");

  return (
    <div
      role="button"
      tabIndex={interactionDisabled ? -1 : 0}
      aria-disabled={interactionDisabled}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!interactionDisabled) setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (!interactionDisabled) processFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed px-6 py-12 sm:py-16 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        interactionDisabled
          ? "cursor-not-allowed opacity-60 border-gray-200 bg-gray-50"
          : isDragOver
            ? "cursor-pointer border-blue-500 bg-blue-50 scale-[1.01]"
            : "cursor-pointer border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50/50",
        className,
      )}
      data-testid={testId || "dropzone-upload"}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats.join(",")}
        multiple={multiple}
        disabled={interactionDisabled}
        className="hidden"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = "";
        }}
        data-testid="input-file"
      />

      <ConverterStatusIcon
        status={loading ? "processing" : "upload"}
        size={96}
        toolId={toolId}
        className="mb-4"
      />

      <h3 className="text-xl font-bold text-gray-900 mb-1">
        {loading
          ? loadingText
          : isDragOver
            ? "Release to upload"
            : isFull
              ? `Maximum files reached (${maxFiles}/${maxFiles})`
              : resolvedTitle}
      </h3>
      <p className="text-sm text-gray-500">{resolvedSubtitle}</p>

      {!loading && (
        <span
          className={cn(
            "mt-5 inline-flex items-center justify-center rounded-full px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors pointer-events-none",
            interactionDisabled ? "bg-blue-300" : "bg-blue-600",
          )}
        >
          {resolvedActionLabel}
        </span>
      )}

      {multiple && !loading && (
        <p className="mt-3 text-xs font-medium text-blue-600">
          {isFull
            ? `Maximum ${maxFiles} files`
            : `You can add ${remainingSlots} more file${remainingSlots !== 1 ? "s" : ""}` +
              (currentFileCount > 0 ? ` (${currentFileCount}/${maxFiles} selected)` : "")}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {acceptedFormats.map((format) => (
          <span
            key={format}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
          >
            {format.replace(".", "").toUpperCase()}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400">Maximum file size: {maxSizeLabel}</p>
    </div>
  );
};

export default UploadDropzone;
