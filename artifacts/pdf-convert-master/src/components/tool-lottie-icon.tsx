import { LottieIcon } from "@/components/ui/lottie-icon";
import { toolConfigs, type ToolConfig } from "@/lib/toolConfig";

import wordFile from "@/assets/lottie/word-file.json";
import pdfToExcel from "@/assets/lottie/pdf-to-excel.json";
import excelFileScanning from "@/assets/lottie/excel-file-scanning.json";
import ppt from "@/assets/lottie/ppt.json";
import pptToPdf from "@/assets/lottie/ppt_to_pdf.json";
import pdf from "@/assets/lottie/pdf.json";
import picture from "@/assets/lottie/picture.json";
import image from "@/assets/lottie/image.json";
import resize from "@/assets/lottie/resize.json";
import cropTool from "@/assets/lottie/crop-tool.json";
import rotateImage from "@/assets/lottie/rotate-image.json";
import compress from "@/assets/lottie/compress.json";
import videoCompress from "@/assets/lottie/video-compress.json";
import aiUpscaling from "@/assets/lottie/ai-upscaling.json";
import removeImage from "@/assets/lottie/remove-image.json";
import pdfMerger from "@/assets/lottie/pdf_merger.json";
import pdfSplitter from "@/assets/lottie/pdf_splitter.json";
import pdfCompression from "@/assets/lottie/pdf_compression.json";
import pdfRotate from "@/assets/lottie/pdf_rotate.json";
import cropPdf from "@/assets/lottie/crop-pdf.json";
import signPdf from "@/assets/lottie/signature-pdf.json";
import watermarkPdf from "@/assets/lottie/watermark-pdf.json";
import addImagePdf from "@/assets/lottie/add-image-to-pdf.json";
import ocrPdf from "@/assets/lottie/ocr-pdf.json";
import pdfToWord from "@/assets/lottie/pdf-to-word.json";
import convertImage from "@/assets/lottie/convert-image.json";
import editPdf from "@/assets/lottie/edit-pdf.json";
import deletePagesPdf from "@/assets/lottie/delete-page.json";
import lockPdf from "@/assets/lottie/lock.json";
import unlockPdf from "@/assets/lottie/unlock.json";
import restoreDocument from "@/assets/lottie/restore-trash.json";

/**
 * Maps each tool id to the Lottie animation the user provided. The filename of
 * each uploaded animation identifies its tool. PDF→Word and PDF↔Excel each have
 * a dedicated animation per direction; Word→PDF still reuses the shared word
 * animation. The generic picture/image animations cover the image<->pdf tools.
 */
export const TOOL_ANIMATIONS: Record<string, unknown> = {
  // PDF conversion
  "pdf-to-word": pdfToWord,
  "word-to-pdf": wordFile,
  "pdf-to-excel": pdfToExcel,
  "excel-to-pdf": excelFileScanning,
  "pdf-to-powerpoint": ppt,
  "powerpoint-to-pdf": pptToPdf,
  "html-to-pdf": pdf,
  "pdf-to-images": picture,
  "images-to-pdf": image,
  // Image tools
  "convert-image-format": convertImage,
  "resize-images": resize,
  "crop-images": cropTool,
  "rotate-images": rotateImage,
  "compress-images": compress,
  "compress-image": compress,
  "compress-video": videoCompress,
  "upscale-images": aiUpscaling,
  "remove-background": removeImage,
  // PDF management
  "merge-pdfs": pdfMerger,
  "split-pdf": pdfSplitter,
  "compress-pdf": pdfCompression,
  "rotate-pdf": pdfRotate,
  // PDF editor
  "edit-pdf": editPdf,
  "crop-pdf": cropPdf,
  "sign-pdf": signPdf,
  "watermark-pdf": watermarkPdf,
  "add-image-pdf": addImagePdf,
  "delete-pages-pdf": deletePagesPdf,
  "ocr-pdf": ocrPdf,
  "restore-document": restoreDocument,
  "lock-pdf": lockPdf,
  "unlock-pdf": unlockPdf,
};

export interface ToolLottieIconProps {
  toolId: string;
  /** Optional pre-resolved config; falls back to toolConfigs[toolId]. */
  config?: ToolConfig;
  /** Square pixel size for the animation. Defaults to 44. */
  size?: number;
  /** Loop the animation. Defaults to true. */
  loop?: boolean;
  /** Play only while hovered. Defaults to false. */
  playOnHover?: boolean;
  className?: string;
}

/**
 * Renders a tool's animated Lottie identity icon on its card. Always animates
 * (full parity with the mobile app, which ignores the OS "reduce motion"
 * setting). Falls back to the tool's static lucide icon only when there is no
 * animation registered for the id.
 */
export function ToolLottieIcon({
  toolId,
  config,
  size = 44,
  loop = true,
  playOnHover = false,
  className,
}: ToolLottieIconProps) {
  const animation = TOOL_ANIMATIONS[toolId];
  const cfg = config ?? toolConfigs[toolId];

  if (!animation) {
    const Icon = cfg?.icon;
    if (!Icon) return null;
    return (
      <span
        className={className}
        style={{
          width: size,
          height: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          className={cfg?.iconColor}
          style={{ width: size * 0.62, height: size * 0.62 }}
        />
      </span>
    );
  }

  return (
    <LottieIcon
      animationData={animation}
      size={size}
      loop={loop}
      playOnHover={playOnHover}
      className={className}
    />
  );
}

export default ToolLottieIcon;
