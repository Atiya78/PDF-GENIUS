import { lazy, Suspense } from "react";
import type { LottieIconProps } from "./lottie-icon-impl";

export type { LottieIconProps } from "./lottie-icon-impl";

// lottie-react (lottie-web) is large; load it on first use, not in the entry bundle.
const LottieIconImpl = lazy(() => import("./lottie-icon-impl"));

/** Lazy wrapper: reserves the icon's box so layout never shifts while the player loads. */
export function LottieIcon(props: LottieIconProps) {
  const { size = 48, width, height, className } = props;
  return (
    <Suspense
      fallback={
        <span
          aria-hidden="true"
          className={className}
          style={{ display: "inline-flex", flexShrink: 0, width: width ?? size, height: height ?? size }}
        />
      }
    >
      <LottieIconImpl {...props} />
    </Suspense>
  );
}

export default LottieIcon;
