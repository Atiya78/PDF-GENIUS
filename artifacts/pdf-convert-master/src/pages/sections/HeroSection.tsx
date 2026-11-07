import { ArrowRight } from "lucide-react";
import { Link, useSearch } from "wouter";
import { toolConfigs, isHeroTool } from "@/lib/toolConfig";
import { HeroToolConverter } from "@/components/HeroToolConverter";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { cn } from "@/lib/utils";
import "@/styles/marketing.css";

const heroBenefits = [
  "Work directly in your browser",
  "Review the result before using it",
  "Download your result when processing finishes",
  "Free tools. No signup required.",
];

const DEFAULT_TOOL = "pdf-to-word";
const QUICK_SWITCH = ["pdf-to-word", "word-to-pdf", "pdf-to-excel", "images-to-pdf", "pdf-to-images"];
const NOTES = ["Encrypted in transit (HTTPS)", "PDF and image tools", "No signup required"];

export const HeroSection = (): JSX.Element => {
  const search = useSearch();
  const toolId = new URLSearchParams(search).get("tool");
  const activeTool = isHeroTool(toolId) ? toolConfigs[toolId as string] : null;
  const deskTool = activeTool ?? (isHeroTool(DEFAULT_TOOL) ? toolConfigs[DEFAULT_TOOL] : null);
  const quick = QUICK_SWITCH.filter((id) => isHeroTool(id) && toolConfigs[id]);

  return (
    <section className="relative w-full overflow-hidden border-b border-[#e7e0d5]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14 lg:pb-20 lg:pl-12 lg:pt-16">
        <div className="min-w-0">
          <p className="edu-eyebrow">{activeTool ? `${activeTool.category} / ${activeTool.title}` : "PDF Genius / Document desk"}</p>
          <h1
            className="mkt-display mt-4 text-[2.4rem] sm:text-[3.2rem] lg:text-[3.7rem]"
            data-testid="text-hero-title"
          >
            {activeTool ? (
              `Convert ${activeTool.title}`
            ) : (
              <>
                Every PDF chore,{" "}
                <span className="relative whitespace-nowrap">
                  done here
                  <svg className="absolute -bottom-1.5 left-0 w-full" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 7 C 50 2, 120 2, 198 6" stroke="#f7433d" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
                </span>
                .
              </>
            )}
          </h1>
          <p className="mkt-lede mt-6 max-w-lg" data-testid="text-hero-description">
            {activeTool
              ? activeTool.description
              : "Merge, split, compress, convert, rotate, unlock and watermark PDFs in a few clicks. Free tools, no signup required."}
          </p>

          {activeTool ? (
            <ul className="mt-7 max-w-lg border-t border-[#e7e0d5]">
              {heroBenefits.map((benefit, i) => (
                <li key={benefit} className="flex items-baseline gap-4 border-b border-[#efe8dd] py-2.5 text-[15px] text-[#1c1917]">
                  <span className="edu-mono w-5 shrink-0 text-xs text-[#c8302a]">{String(i + 1).padStart(2, "0")}</span>
                  {benefit}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link href="/tools" className="edu-btn-primary group" data-testid="button-hero-start">
                Browse all tools
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link href="/learn-more" className="mkt-link text-[15px]" data-testid="link-hero-learn-more">
                How it works <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#57534e]" aria-label="At a glance">
            {NOTES.map((n) => (
              <li key={n} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2f5d50]" aria-hidden="true" />
                {n}
              </li>
            ))}
          </ul>
        </div>

        {deskTool && (
          <div className="min-w-0">
            <div className="mkt-sheet p-3 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <p className="edu-eyebrow !text-[#8a837b]">{activeTool ? "Your file" : "Start here"}</p>
                <p className="edu-mono truncate text-xs text-[#8a837b]">{deskTool.acceptedFormats.join(" ")}</p>
              </div>
              <HeroToolConverter key={deskTool.id} tool={deskTool} />
            </div>
            {quick.length > 1 && (
              <nav aria-label="Switch converter" className="mt-4">
                <p className="edu-eyebrow !text-[#8a837b]">Or convert</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {quick.map((id) => {
                    const t = toolConfigs[id];
                    const on = deskTool.id === id;
                    return (
                      <li key={id}>
                        <Link
                          href={`/?tool=${id}`}
                          aria-current={on ? "page" : undefined}
                          className={cn(
                            "inline-flex min-h-[44px] items-center gap-2 rounded-[9px] border px-2.5 pr-3.5 text-[13px] font-semibold transition-colors",
                            on ? "border-[#1c1917] bg-[#fffdf9] text-[#1c1917]" : "border-[#e7e0d5] text-[#57534e] hover:border-[#c9bfb1] hover:text-[#1c1917]",
                          )}
                          data-testid={`link-hero-switch-${id}`}
                        >
                          <ToolLottieIcon toolId={id} config={t} size={22} />
                          {t.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
