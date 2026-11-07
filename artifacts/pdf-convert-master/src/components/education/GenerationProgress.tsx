import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type Phase = "idle" | "reading" | "generating";

export function GenerationProgress({ phase, noun, skipReading }: { phase: Phase; noun: string; skipReading?: boolean }) {
  const reduce = useReducedMotion();
  if (phase === "idle") return null;
  const readingDone = phase === "generating" || !!skipReading;
  const steps = [
    { label: `Reading PDF${skipReading ? " (not needed for pasted text)" : ""}`, done: readingDone, active: !readingDone },
    { label: "Analyzing", done: false, active: phase === "generating" },
    { label: `Creating ${noun}`, done: false, active: phase === "generating" },
  ];
  return (
    <motion.div
      role="status" aria-live="polite" data-testid="status-generation"
      initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-[12px] border border-[#e7e0d5] bg-[#fffdf9]"
    >
      <div className="relative h-[3px] overflow-hidden bg-[#f3eee6]"><span className="edu-indeterminate absolute inset-y-0 left-0 w-2/5 bg-[#f7433d]" /></div>
      <ol className="grid gap-3 p-4 text-sm sm:grid-cols-3 sm:gap-4">
        {steps.map((s, i) => (
          <li key={i} className={cn("flex items-start gap-2.5", s.done ? "text-[#8a837b]" : s.active ? "font-semibold text-[#1c1917]" : "text-[#b5aa9b]")}>
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
              s.done ? "border-[#2f5d50] bg-[#2f5d50] text-white" : s.active ? "border-[#f7433d] text-[#f7433d]" : "border-[#d9d0c3]")}>
              {s.done ? <Check className="h-3 w-3" aria-hidden="true" /> : s.active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f7433d] motion-reduce:animate-none" /> : null}
            </span>
            {s.label}
          </li>
        ))}
      </ol>
      {phase === "generating" && <p className="border-t border-[#efe8dd] px-4 py-2.5 text-xs text-[#57534e]">Analyzing and creating run together as one AI request, so they finish at the same time.</p>}
    </motion.div>
  );
}
