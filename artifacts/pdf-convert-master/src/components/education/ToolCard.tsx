import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import type { EducationTool } from "@/lib/education/educationTools";
import { cn } from "@/lib/utils";

export function ToolCard({ tool }: { tool: EducationTool }) {
  const Icon = tool.icon;
  const live = tool.status === "live";
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", live ? "bg-[#fff1f0] text-[#f7433d]" : "bg-gray-100 text-gray-400")}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {live ? (
          tool.isNew && <span className="rounded-full bg-[#f7433d] px-2.5 py-0.5 text-xs font-semibold text-white">New</span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">Coming soon</span>
        )}
      </div>
      <h3 className={cn("mt-4 font-['Poppins'] text-lg font-semibold", live ? "text-gray-900" : "text-gray-500")}>{tool.name}</h3>
      <p className="mt-1 text-sm text-gray-600">{tool.description}</p>
      {live && (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#d9322c]">
          Open tool <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      )}
    </>
  );
  if (!live) {
    return (
      <div aria-disabled="true" className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-5" data-testid={`card-tool-${tool.id}`}>
        {body}
      </div>
    );
  }
  return (
    <Link href={tool.href} className="group block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#f7433d]/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7433d]" data-testid={`card-tool-${tool.id}`}>
      {body}
    </Link>
  );
}
