import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { toolConfigs, isHeroTool, getServerToolType, type ToolConfig } from "@/lib/toolConfig";
import { usePausedTools } from "@/lib/usePausedTools";
import { PausedBadge } from "@/components/PausedBadge";
import { Reveal } from "@/components/education/Reveal";
import { Link, useLocation } from "wouter";
import "@/styles/marketing.css";

// Every tool, grouped by its category in definition order.
function groupTools(): { category: string; tools: ToolConfig[] }[] {
  const map = new Map<string, ToolConfig[]>();
  for (const t of Object.values(toolConfigs)) {
    const list = map.get(t.category) ?? [];
    list.push(t);
    map.set(t.category, list);
  }
  return Array.from(map, ([category, tools]) => ({ category, tools }));
}

export const TestimonialsSection = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const pausedTools = usePausedTools();
  const groups = groupTools();
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const handleToolClick = (tool: ToolConfig): void => {
    if (isHeroTool(tool.id)) {
      // PDF converters open IN PLACE on the homepage hero (same behavior as the
      // navbar dropdowns) — update the URL, then scroll up to the hero.
      setLocation(`/?tool=${tool.id}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (tool.route) {
      setLocation(tool.route);
    }
  };

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6" aria-labelledby="catalogue-heading">
      <Reveal>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="edu-eyebrow">Catalogue</p>
            <h2 id="catalogue-heading" className="mkt-h2 mt-2">Every tool, by drawer</h2>
            <p className="mt-2 max-w-md text-[15px] text-[#57534e]">Converters open right here in the page; the rest open their own workspace.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="mkt-nav-btn" onClick={() => page(-1)} disabled={edges.start} aria-label="Previous categories" aria-controls="tool-catalogue" data-testid="button-catalogue-prev">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className="mkt-nav-btn" onClick={() => page(1)} disabled={edges.end} aria-label="Next categories" aria-controls="tool-catalogue" data-testid="button-catalogue-next">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          id="tool-catalogue"
          ref={scroller}
          onScroll={update}
          className="mkt-scroller mt-7"
          tabIndex={0}
          role="region"
          aria-label="Tool categories, scroll horizontally"
        >
          {groups.map((g) => (
            <article key={g.category} className="mkt-card" aria-label={g.category}>
              <div className="flex items-baseline justify-between border-b border-[#efe8dd] pb-3">
                <h3 className="font-['Poppins'] text-base font-semibold text-[#1c1917]">{g.category}</h3>
                <span className="edu-mono text-xs text-[#8a837b]">{String(g.tools.length).padStart(2, "0")}</span>
              </div>
              <ul className="mt-2 flex-1">
                {g.tools.map((tool) => {
                  const isPaused = pausedTools.has(getServerToolType(tool));
                  return (
                    <li key={tool.id}>
                      <button
                        type="button"
                        onClick={() => handleToolClick(tool)}
                        className={`mkt-tool -mx-2 w-[calc(100%+1rem)] ${isPaused ? "opacity-70" : ""}`}
                        data-testid={`card-tool-${tool.id}`}
                        title={tool.description}
                      >
                        <span className="mkt-icon"><ToolLottieIcon toolId={tool.id} config={tool} size={26} /></span>
                        <span className="min-w-0 truncate">{tool.title}</span>
                        {isPaused && <PausedBadge testId={`card-tool-paused-${tool.id}`} />}
                        <ArrowRight className="mkt-arrow h-4 w-4 shrink-0" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-14 flex flex-col gap-5 border-y border-[#e7e0d5] py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-['Poppins'] text-xl font-semibold text-[#1c1917]">Building something with PDFs?</h3>
            <p className="mt-1 text-[#57534e]">The same conversions are available over a REST API. See the developer documentation.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setLocation("/tools")} className="edu-btn-primary" data-testid="button-browse-tools">
              Browse all tools
            </button>
            <button type="button" onClick={() => setLocation("/signup")} className="edu-btn-ghost h-12 px-5" data-testid="button-home-api-access">
              Get API access
            </button>
            <Link href="/docs" className="mkt-link self-center px-1 text-sm">Docs <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
};
