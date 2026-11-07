import { LottieIcon } from "@/components/ui/lottie-icon";
import processingAnim from "@/assets/lottie/processing.json";

/**
 * Full-screen loading indicator shown while the website is loading (e.g. auth
 * resolution / layout gates). Plays the shared processing Lottie so loading and
 * in-progress states use the same animation everywhere.
 */
export function PageLoader({
  size = 120,
  label,
}: {
  size?: number;
  label?: string;
}) {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-[#faf7f2]"
      data-testid="page-loader"
    >
      <div className="text-center">
        <LottieIcon
          animationData={processingAnim}
          size={size}
          loop
          className="mx-auto"
        />
        {label && <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8a837b]" role="status">{label}</p>}
      </div>
    </div>
  );
}

export default PageLoader;
