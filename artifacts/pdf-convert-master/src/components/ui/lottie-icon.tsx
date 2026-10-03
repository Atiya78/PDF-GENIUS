import { useEffect, useRef } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import { cn } from "../../lib/utils";

export interface LottieIconProps {
  /** Parsed Lottie animation JSON (import your .json file and pass it here). */
  animationData: unknown;
  /** Pixel size for a square icon. Defaults to 48. Ignored if width/height set. */
  size?: number;
  width?: number | string;
  height?: number | string;
  /** Loop the animation. Defaults to true. */
  loop?: boolean;
  /** Play automatically on mount. Defaults to true. */
  autoplay?: boolean;
  /** Play only while hovered, and reset when the pointer leaves. */
  playOnHover?: boolean;
  /**
   * Externally controlled play state. When defined, the animation plays while
   * `true` and resets while `false` (useful to drive it from a parent's hover,
   * e.g. a button). Overrides `playOnHover`/`autoplay`.
   */
  play?: boolean;
  /** Playback speed multiplier. Defaults to 1. */
  speed?: number;
  /**
   * Accessible label. When omitted the animation is treated as decorative and
   * hidden from assistive tech (the surrounding text already conveys state).
   */
  ariaLabel?: string;
  className?: string;
}

/**
 * Renders a Lottie animation from a JSON file using the open-source
 * lottie-react player. No subscription or external service required —
 * the .json is bundled and rendered fully client-side.
 */
export function LottieIcon({
  animationData,
  size = 48,
  width,
  height,
  loop = true,
  autoplay = true,
  playOnHover = false,
  play,
  speed = 1,
  ariaLabel,
  className,
}: LottieIconProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const isControlled = play !== undefined;

  useEffect(() => {
    lottieRef.current?.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    if (!isControlled) return;
    if (play) {
      lottieRef.current?.goToAndPlay(0);
    } else {
      lottieRef.current?.stop();
    }
  }, [isControlled, play]);

  const handleMouseEnter = () => {
    if (playOnHover && !isControlled) {
      lottieRef.current?.goToAndPlay(0);
    }
  };

  const handleMouseLeave = () => {
    if (playOnHover && !isControlled) {
      lottieRef.current?.stop();
    }
  };

  return (
    <div
      className={cn("inline-flex shrink-0", className)}
      style={{ width: width ?? size, height: height ?? size }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={playOnHover || isControlled ? false : autoplay}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default LottieIcon;
