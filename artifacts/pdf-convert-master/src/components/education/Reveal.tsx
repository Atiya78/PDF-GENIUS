import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Quiet scroll reveal: short rise + fade, once.
 * Content is VISIBLE by default (prerendered HTML, no-JS, crawlers). Only blocks that
 * start below the fold after hydration are hidden and then revealed when scrolled into view.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "hidden" | "shown">("static");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduce || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // Already on screen: never hide it.
    setState("hidden");
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setState("shown"); io.disconnect(); }
    }, { rootMargin: "0px 0px -60px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <div
      ref={ref}
      className={className}
      style={state === "static" ? undefined : {
        opacity: state === "hidden" ? 0 : 1,
        transform: state === "hidden" ? "translateY(14px)" : "none",
        transition: `opacity 500ms cubic-bezier(0.2,0.7,0.2,1) ${delay}s, transform 500ms cubic-bezier(0.2,0.7,0.2,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
