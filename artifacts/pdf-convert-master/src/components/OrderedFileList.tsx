import React from "react";
import { FileText, ChevronUp, ChevronDown, X } from "lucide-react";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export interface OrderedFileListProps {
  files: File[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
  /** Disable all controls (e.g. while merging). */
  disabled?: boolean;
  /** Visual density: "comfortable" for full-page, "compact" for the small card. */
  size?: "comfortable" | "compact";
}

/**
 * An ordered, reorderable list of files. The number badge shows the merge
 * position (1st, 2nd, 3rd, …); up/down controls reorder, and the order shown
 * here is exactly the order the files are sent to the server.
 *
 * Shared by the full-page PDF merge workflow and the Tools-grid merge card so
 * both behave identically.
 */
export const OrderedFileList: React.FC<OrderedFileListProps> = ({
  files,
  onMoveUp,
  onMoveDown,
  onRemove,
  disabled = false,
  size = "comfortable",
}) => {
  const compact = size === "compact";
  return (
    <ul className={compact ? "space-y-2" : "space-y-3"} data-testid="list-merge-files">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${f.size}-${i}`}
          className={`flex items-center gap-2 rounded-xl border border-[#e7e0d5] bg-white ${
            compact ? "p-2" : "p-3 gap-3"
          }`}
          data-testid={`row-mergefile-${i}`}
        >
          {/* Position badge (1st, 2nd, 3rd …) */}
          <span
            className={`flex items-center justify-center rounded-full bg-[#f7433d] text-white font-semibold shrink-0 ${
              compact ? "w-5 h-5 text-[10px]" : "w-7 h-7 text-xs"
            }`}
            data-testid={`badge-position-${i}`}
          >
            {i + 1}
          </span>

          <div
            className={`flex items-center justify-center rounded-md bg-[#fdece9] shrink-0 ${
              compact ? "w-7 h-7" : "w-9 h-9"
            }`}
          >
            <FileText className={compact ? "w-4 h-4 text-[#c8302a]" : "w-5 h-5 text-[#c8302a]"} />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className={`font-medium text-[#1c1917] truncate ${compact ? "text-xs" : "text-sm"}`}
              data-testid={`text-mergefile-${i}`}
            >
              {f.name}
            </p>
            <p className={compact ? "text-[10px] text-[#57534e]" : "text-xs text-[#57534e]"}>
              {formatBytes(f.size)}
            </p>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onMoveUp(i)}
              disabled={disabled || i === 0}
              className="p-1 rounded-md text-[#8a837b] hover:text-[#c8302a] hover:bg-[#fdece9] transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              aria-label={`Move ${f.name} up`}
              data-testid={`button-move-up-${i}`}
            >
              <ChevronUp className={compact ? "w-4 h-4" : "w-5 h-5"} />
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(i)}
              disabled={disabled || i === files.length - 1}
              className="p-1 rounded-md text-[#8a837b] hover:text-[#c8302a] hover:bg-[#fdece9] transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              aria-label={`Move ${f.name} down`}
              data-testid={`button-move-down-${i}`}
            >
              <ChevronDown className={compact ? "w-4 h-4" : "w-5 h-5"} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(i)}
              disabled={disabled}
              className="p-1 rounded-md text-[#8a837b] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              aria-label={`Remove ${f.name}`}
              data-testid={`button-remove-mergefile-${i}`}
            >
              <X className={compact ? "w-4 h-4" : "w-5 h-5"} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};
