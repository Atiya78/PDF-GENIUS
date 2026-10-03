import { Check, Loader2 } from "lucide-react";

export type Phase = "idle" | "reading" | "generating";

export function GenerationProgress({ phase, noun, skipReading }: { phase: Phase; noun: string; skipReading?: boolean }) {
  if (phase === "idle") return null;
  const readingDone = phase === "generating" || !!skipReading;
  const Spin = <Loader2 className="h-4 w-4 animate-spin text-[#f7433d]" aria-hidden="true" />;
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-[#f7433d]/20 bg-[#fff7f6] p-4" data-testid="status-generation">
      <ol className="space-y-2 text-sm">
        <li className={`flex items-center gap-2 ${readingDone ? "text-gray-500" : "font-semibold text-gray-900"}`}>
          {readingDone ? <Check className="h-4 w-4 text-green-600" aria-hidden="true" /> : Spin}Reading PDF{skipReading ? " (not needed for pasted text)" : ""}
        </li>
        <li className={`flex items-center gap-2 ${phase === "generating" ? "font-semibold text-gray-900" : "text-gray-400"}`}>
          {phase === "generating" ? Spin : <span className="h-4 w-4" />}Analyzing
        </li>
        <li className={`flex items-center gap-2 ${phase === "generating" ? "font-semibold text-gray-900" : "text-gray-400"}`}>
          {phase === "generating" ? Spin : <span className="h-4 w-4" />}Creating {noun}
        </li>
      </ol>
      {phase === "generating" && <p className="mt-2 text-xs text-gray-500">Analyzing and creating run together as one AI request, so they finish at the same time.</p>}
    </div>
  );
}
