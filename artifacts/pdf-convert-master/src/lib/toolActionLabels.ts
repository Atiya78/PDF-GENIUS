/**
 * Tool-specific action wording used by the conversion workflow UI so each tool
 * describes its own action (e.g. "Locking" / "Unlocking") instead of the generic
 * "Converting". Purely cosmetic — does not affect conversion behavior.
 *
 * Keyed by tool id (same ids used on web `toolConfig` and the mobile tools list).
 *   progress – gerund shown while processing ("Locking")
 *   done     – past tense shown on completion ("Locked")
 *   base     – base verb for "Ready to <base>" ("lock")
 */
export interface ToolActionLabels {
  progress: string;
  done: string;
  base: string;
}

const CONVERT: ToolActionLabels = { progress: "Converting", done: "Converted", base: "convert" };
const COMPRESS: ToolActionLabels = { progress: "Compressing", done: "Compressed", base: "compress" };
const ROTATE: ToolActionLabels = { progress: "Rotating", done: "Rotated", base: "rotate" };
const CROP: ToolActionLabels = { progress: "Cropping", done: "Cropped", base: "crop" };

const TOOL_ACTION_LABELS: Record<string, ToolActionLabels> = {
  // PDF conversion
  "pdf-to-word": CONVERT,
  "word-to-pdf": CONVERT,
  "csv-to-pdf": CONVERT,
  "pdf-to-excel": CONVERT,
  "excel-to-pdf": CONVERT,
  "pdf-to-powerpoint": CONVERT,
  "powerpoint-to-pdf": CONVERT,
  "html-to-pdf": CONVERT,
  "pdf-to-images": CONVERT,
  "images-to-pdf": CONVERT,
  "convert-image-format": CONVERT,
  // Image tools
  "resize-images": { progress: "Resizing", done: "Resized", base: "resize" },
  "crop-images": CROP,
  "rotate-images": ROTATE,
  "compress-images": COMPRESS,
  "compress-image": COMPRESS,
  // Video tools
  "compress-video": COMPRESS,
  "upscale-images": { progress: "Upscaling", done: "Upscaled", base: "upscale" },
  "remove-background": { progress: "Removing Background", done: "Processed", base: "process" },
  // PDF management
  "merge-pdfs": { progress: "Merging", done: "Merged", base: "merge" },
  "split-pdf": { progress: "Splitting", done: "Split", base: "split" },
  "compress-pdf": COMPRESS,
  "rotate-pdf": ROTATE,
  // PDF editor
  "edit-pdf": { progress: "Editing", done: "Edited", base: "edit" },
  "crop-pdf": CROP,
  "sign-pdf": { progress: "Signing", done: "Signed", base: "sign" },
  "watermark-pdf": { progress: "Watermarking", done: "Watermarked", base: "watermark" },
  "add-image-pdf": { progress: "Adding Image", done: "Updated", base: "update" },
  "delete-pages-pdf": { progress: "Deleting Pages", done: "Updated", base: "update" },
  "ocr-pdf": { progress: "Recognizing Text", done: "Processed", base: "process" },
  "restore-document": { progress: "Restoring", done: "Restored", base: "restore" },
  "lock-pdf": { progress: "Locking", done: "Locked", base: "lock" },
  "unlock-pdf": { progress: "Unlocking", done: "Unlocked", base: "unlock" },
};

export function getToolActionLabels(toolId: string): ToolActionLabels {
  return TOOL_ACTION_LABELS[toolId] ?? CONVERT;
}
