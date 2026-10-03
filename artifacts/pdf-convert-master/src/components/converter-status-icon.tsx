import { LottieIcon } from "@/components/ui/lottie-icon";
import syncingFile from "@/assets/lottie/syncing-file.json";
import correctFile from "@/assets/lottie/correct-file.json";
import discardedFile from "@/assets/lottie/discarded-file.json";
import processingAnim from "@/assets/lottie/processing.json";
import { useToolAnimation, TOOL_ANIMATION_LOADERS } from "@/components/tool-lottie-icon";

/**
 * Stages every file converter shares:
 * - "upload"     → prompt to pick/drop a file
 * - "processing" → file is uploading / converting
 * - "success"    → conversion finished
 * - "error"      → wrong file type or conversion failed
 *
 * For the "upload" prompt, callers pass the selected tool's id so the drop area
 * plays that tool's OWN Lottie animation (resolved from TOOL_ANIMATIONS). Tools
 * without a specific animation fall back to the generic "syncing file" loop. The
 * "processing" stage plays the dedicated processing animation, "correct file" is
 * success, and "discarded file" is the error/invalid state.
 */
export type ConverterStatus = "upload" | "processing" | "success" | "error";

export interface ConverterStatusIconProps {
  status: ConverterStatus;
  /** Square pixel size. Defaults to 96. */
  size?: number;
  className?: string;
  /**
   * Tool id used in the "upload" state to play that tool's own Lottie animation
   * instead of the generic syncing loop. Ignored for the other states.
   */
  toolId?: string;
}

import { useToolProcessing } from "@/lib/toolProcessing";

export function ConverterStatusIcon({
  status,
  size = 96,
  className,
  toolId,
}: ConverterStatusIconProps) {
  useToolProcessing(status === "processing");
  const toolAnim = useToolAnimation(toolId, status === "upload");
  let animation: unknown;
  let loop: boolean;

  if (status === "success") {
    animation = correctFile;
    loop = false;
  } else if (status === "error") {
    animation = discardedFile;
    loop = false;
  } else if (status === "processing") {
    animation = processingAnim;
    loop = true;
  } else {
    // upload prompt → prefer the picked tool's own animation, else generic loop
    animation = toolId && TOOL_ANIMATION_LOADERS[toolId] ? toolAnim : syncingFile;
    loop = true;
  }

  if (!animation) {
    return <span aria-hidden="true" className={className} style={{ display: "inline-flex", width: size, height: size }} />;
  }

  return (
    <LottieIcon
      animationData={animation}
      size={size}
      loop={loop}
      className={className}
    />
  );
}

export default ConverterStatusIcon;
