import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { EDUCATION_CATEGORIES, type EducationTool } from "@/lib/education/educationTools";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";

const CAT: Record<string, string> = { ...Object.fromEntries(EDUCATION_CATEGORIES.map((c) => [c.id, c.label])), more: "Overview" };

/** Contents-row entry for a study tool: index number, live icon, name, one line, arrow. */
export function ToolCard({ tool, index }: { tool: EducationTool; index?: number }) {
  return (
    <Link href={tool.href}
      className="group relative grid grid-cols-[auto_1fr_auto] items-start gap-4 border-t border-[#e7e0d5] px-1 py-5 transition-colors hover:bg-[#fffdf9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7433d] sm:px-3"
      data-testid={`card-tool-${tool.id}`}>
      <span className="absolute left-0 top-0 h-px w-0 bg-[#f7433d] transition-[width] duration-300 ease-out group-hover:w-full motion-reduce:transition-none" aria-hidden="true" />
      <span className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-[#e7e0d5] bg-white">
        <ToolLottieIcon toolId={tool.id} size={40} />
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-2.5">
          {index !== undefined && <span className="edu-mono text-xs text-[#b5aa9b]">{String(index + 1).padStart(2, "0")}</span>}
          <span className="font-['Poppins'] text-[17px] font-semibold leading-snug text-[#1c1917]">{tool.name}</span>
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-[#57534e]">{tool.description}</span>
        <span className="edu-eyebrow mt-2 block !text-[#8a837b]">{CAT[tool.category] ?? tool.category}</span>
      </span>
      <ArrowUpRight className="mt-1 h-5 w-5 text-[#b5aa9b] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f7433d] motion-reduce:transition-none" aria-hidden="true" />
    </Link>
  );
}
