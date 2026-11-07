import { X, Download, PartyPopper, CheckCircle2, Circle } from "lucide-react";

import { ProcessingSpinner } from "@/components/processing-spinner";
import type { DownloadOption } from "@/lib/downloadFormats";

interface DownloadFormatModalProps {
  open: boolean;
  onClose: () => void;
  /** Big celebratory heading. Defaults to "Awesome job!". */
  title?: string;
  /** One-line context under the title. */
  subtitle: string;
  /** Label above the format grid. Defaults to "Save as:". */
  sectionLabel?: string;
  /** Selectable output formats. */
  formats: DownloadOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Primary action label. Defaults to "Download". */
  confirmLabel?: string;
  onConfirm: () => void;
  /** Disables the primary action (e.g. while saving). */
  busy?: boolean;
  /** Optional editable file name section (shown only when provided). */
  fileName?: string;
  onChangeFileName?: (value: string) => void;
  previewName?: string;
}

/**
 * Shared "result is ready — pick an output format" chooser. The web mirror of
 * the mobile DownloadFormatModal so the format-selection UX is identical
 * everywhere: every conversion tool's Download action opens this celebratory
 * sheet, the user picks a genuinely-deliverable format, then confirms.
 */
export default function DownloadFormatModal({
  open,
  onClose,
  title = "Awesome job!",
  subtitle,
  sectionLabel = "Save as:",
  formats,
  selectedId,
  onSelect,
  confirmLabel = "Download",
  onConfirm,
  busy = false,
  fileName,
  onChangeFileName,
  previewName,
}: DownloadFormatModalProps) {
  if (!open) return null;
  const showFileName = fileName !== undefined && onChangeFileName !== undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 p-0 sm:p-4"
      onClick={onClose}
      data-testid="modal-download-format"
    >
      <div
        className="w-full sm:max-w-[460px] bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-7 shadow-2xl flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Celebratory header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#fdecea] flex items-center justify-center shrink-0">
            <PartyPopper className="w-6 h-6 text-[#f7433d]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-[#1c1917]" style={{ fontFamily: "Poppins, sans-serif" }}>
              {title}
            </h2>
            <p className="text-[13px] text-[#57534e] truncate">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8a837b] hover:text-[#57534e] shrink-0"
            aria-label="Close"
            data-testid="button-download-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm font-semibold text-[#1c1917] mt-1">{sectionLabel}</p>
        <div className="flex flex-wrap gap-2.5">
          {formats.map((f) => {
            const active = selectedId === f.id;
            const Icon = f.icon;
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => onSelect(f.id)}
                className={`flex-1 min-w-[47%] flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-[1.5px] transition-colors ${
                  active
                    ? "border-[#f7433d] bg-[#fdecea]"
                    : "border-[#e7e0d5] bg-white hover:border-[#e7e0d5]"
                }`}
                data-testid={`format-${f.id}`}
              >
                {active ? (
                  <CheckCircle2 className="w-5 h-5 text-[#f7433d] shrink-0" />
                ) : (
                  <Circle className="w-[18px] h-[18px] text-gray-300 shrink-0" />
                )}
                <span
                  className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: f.color }}
                >
                  <Icon className="w-[15px] h-[15px] text-white" />
                </span>
                <span className="flex-1 text-left text-sm font-semibold text-[#1c1917] truncate">
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>

        {showFileName && (
          <div className="mt-1">
            <label className="block text-xs font-medium text-[#57534e] mb-1">File name</label>
            <input
              value={fileName}
              onChange={(e) => onChangeFileName?.(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="output"
              className="w-full h-[46px] px-3.5 rounded-[14px] border border-[#e7e0d5] text-[15px] text-[#1c1917] outline-none focus:border-[#f7433d]"
              data-testid="input-download-filename"
            />
            {previewName && (
              <p className="text-xs text-[#57534e] mt-1.5 truncate">{previewName}</p>
            )}
          </div>
        )}

        <div className="flex gap-2.5 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[50px] rounded-[14px] border border-[#e7e0d5] text-[#57534e] font-semibold hover:bg-[#faf7f2] transition-colors"
            data-testid="button-download-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 h-[50px] rounded-[14px] bg-[#f7433d] hover:bg-[#e23a34] text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
            data-testid="button-download-confirm"
          >
            {busy ? (
              <ProcessingSpinner size={18} tone="light" />
            ) : (
              <Download className="w-[18px] h-[18px]" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
