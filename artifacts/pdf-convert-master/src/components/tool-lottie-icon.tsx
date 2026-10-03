import { useEffect, useRef, useState } from "react";
import { LottieIcon } from "@/components/ui/lottie-icon";
import { toolConfigs, type ToolConfig } from "@/lib/toolConfig";

/**
 * Maps each tool id to its Lottie animation, loaded on demand (each JSON is its
 * own chunk). Canonical tool-id mappings are unchanged from the previous static
 * registry; PDF to Word and PDF/Excel have per-direction animations.
 */
export const TOOL_ANIMATION_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  // PDF conversion
  "pdf-to-word": () => import("@/assets/lottie/pdf-to-word.json"),
  "word-to-pdf": () => import("@/assets/lottie/word-file.json"),
  "pdf-to-excel": () => import("@/assets/lottie/pdf-to-excel.json"),
  "excel-to-pdf": () => import("@/assets/lottie/excel-file-scanning.json"),
  "pdf-to-powerpoint": () => import("@/assets/lottie/ppt.json"),
  "powerpoint-to-pdf": () => import("@/assets/lottie/ppt_to_pdf.json"),
  "html-to-pdf": () => import("@/assets/lottie/pdf.json"),
  "pdf-to-images": () => import("@/assets/lottie/picture.json"),
  "images-to-pdf": () => import("@/assets/lottie/image.json"),
  // Image tools
  "convert-image-format": () => import("@/assets/lottie/convert-image.json"),
  "resize-images": () => import("@/assets/lottie/resize.json"),
  "crop-images": () => import("@/assets/lottie/crop-tool.json"),
  "rotate-images": () => import("@/assets/lottie/rotate-image.json"),
  "compress-images": () => import("@/assets/lottie/compress.json"),
  "compress-image": () => import("@/assets/lottie/compress.json"),
  "compress-video": () => import("@/assets/lottie/video-compress.json"),
  "upscale-images": () => import("@/assets/lottie/ai-upscaling.json"),
  "remove-background": () => import("@/assets/lottie/remove-image.json"),
  // PDF management
  "merge-pdfs": () => import("@/assets/lottie/pdf_merger.json"),
  "split-pdf": () => import("@/assets/lottie/pdf_splitter.json"),
  "compress-pdf": () => import("@/assets/lottie/pdf_compression.json"),
  "rotate-pdf": () => import("@/assets/lottie/pdf_rotate.json"),
  // PDF editor
  "edit-pdf": () => import("@/assets/lottie/edit-pdf.json"),
  "crop-pdf": () => import("@/assets/lottie/crop-pdf.json"),
  "sign-pdf": () => import("@/assets/lottie/signature-pdf.json"),
  "watermark-pdf": () => import("@/assets/lottie/watermark-pdf.json"),
  "add-image-pdf": () => import("@/assets/lottie/add-image-to-pdf.json"),
  "delete-pages-pdf": () => import("@/assets/lottie/delete-page.json"),
  "ocr-pdf": () => import("@/assets/lottie/ocr-pdf.json"),
  "restore-document": () => import("@/assets/lottie/restore-trash.json"),
  "lock-pdf": () => import("@/assets/lottie/lock.json"),
  "unlock-pdf": () => import("@/assets/lottie/unlock.json"),
};

const animationCache = new Map<string, unknown>();

/** Loads a tool's animation when `enabled`; returns undefined until ready. */
export function useToolAnimation(toolId: string | undefined, enabled = true): unknown {
  const [data, setData] = useState<unknown>(() => (toolId ? animationCache.get(toolId) : undefined));
  useEffect(() => {
    if (!toolId || !enabled) return;
    const cached = animationCache.get(toolId);
    if (cached) {
      setData(cached);
      return;
    }
    const loader = TOOL_ANIMATION_LOADERS[toolId];
    if (!loader) return;
    let live = true;
    loader()
      .then((m) => {
        animationCache.set(toolId, m.default);
        if (live) setData(m.default);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [toolId, enabled]);
  return data;
}

/** True once the element has come within ~200px of the viewport (then stays true). */
function useNearViewport<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near];
}

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
 * Renders a tool's animated Lottie identity icon. Always animates (the OS
 * "reduce motion" setting is intentionally ignored, matching the mobile app),
 * but only loads and plays once the icon is near the viewport. A static icon
 * shows until the animation is ready.
 */
export function ToolLottieIcon({
  toolId,
  config,
  size = 44,
  loop = true,
  playOnHover = false,
  className,
}: ToolLottieIconProps) {
  const [ref, near] = useNearViewport<HTMLSpanElement>();
  const animation = useToolAnimation(toolId, near);
  const cfg = config ?? toolConfigs[toolId];
  const hasAnimation = Boolean(TOOL_ANIMATION_LOADERS[toolId]);

  if (hasAnimation && animation) {
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

  const Icon = cfg?.icon;
  if (!Icon) return null;
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <Icon className={cfg?.iconColor} style={{ width: size * 0.62, height: size * 0.62 }} />
    </span>
  );
}

export default ToolLottieIcon;
