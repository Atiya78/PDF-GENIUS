import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSeo } from "@/lib/useSeo";
import { EDUCATION_CATEGORIES, EDUCATION_LIMITS, educationTools, faqJsonLd, getEducationTool } from "@/lib/education/educationTools";
import { ToolCard } from "./ToolCard";
import { EducationBillingStatus } from "./EducationBillingStatus";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { EduFonts } from "./EduFonts";
import { Reveal } from "./Reveal";
import "./education.css";

interface Props {
  toolId: string;
  seoTitle: string;
  seoDescription: string;
  upload: ReactNode;
  options: ReactNode;
  result?: ReactNode;
}

function Step({ n, title, children, label }: { n: string; title: string; label: string; children: ReactNode }) {
  return (
    <section aria-label={label}>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="edu-mono text-sm font-semibold text-[#f7433d]">{n}</span>
        <h2 className="font-['Poppins'] text-base font-semibold text-[#1c1917]">{title}</h2>
        <span className="h-px flex-1 translate-y-[-3px] bg-[#e7e0d5]" aria-hidden="true" />
      </div>
      <div className="edu-sheet">{children}</div>
    </section>
  );
}

export function EducationToolLayout({ toolId, seoTitle, seoDescription, upload, options, result }: Props) {
  const tool = getEducationTool(toolId)!;
  useSeo({ title: seoTitle, description: seoDescription, canonicalPath: tool.href, jsonLd: faqJsonLd(tool.faqs) });
  const related = educationTools.filter((t) => t.id !== toolId && t.category === tool.category).slice(0, 3);
  const more = related.length ? related : educationTools.filter((t) => t.id !== toolId).slice(0, 3);
  const others = educationTools.filter((t) => t.id !== toolId);
  const cat = EDUCATION_CATEGORIES.find((c) => c.id === tool.category)?.label ?? "Study";

  return (
    <div className="education-tool-content edu-root min-h-[100dvh]">
      <EduFonts />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pt-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-[#8a837b]">
          <Link href="/" className="hover:text-[#1c1917]">Home</Link><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href="/education" className="hover:text-[#1c1917]">Education Zone</Link><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span aria-current="page" className="font-medium text-[#1c1917]">{tool.name}</span>
        </nav>

        <header className="grid gap-6 border-b border-[#e7e0d5] pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
          <div className="flex items-start gap-4 sm:gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border border-[#e7e0d5] bg-white shadow-[0_10px_24px_-18px_rgba(28,25,23,.5)]"><ToolLottieIcon toolId={tool.id} size={52} /></span>
            <div className="min-w-0">
              <p className="edu-eyebrow">{cat} / Education Zone</p>
              <h1 className="mt-2 font-['Poppins'] text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em] text-[#1c1917] sm:text-[2.6rem]" data-testid="text-tool-title">{tool.name}</h1>
              <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-[#57534e]">{tool.description}</p>
            </div>
          </div>
          <EducationBillingStatus />
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0 space-y-8">
            <Step n="01" title="Your material" label="Upload">{upload}</Step>
            <Step n="02" title="Settings" label="Options">{options}</Step>
          </div>
          <aside className="space-y-6 self-start lg:sticky lg:top-24" aria-label="About this tool">
            <div>
              <p className="edu-eyebrow !text-[#8a837b]">Limits</p>
              <dl className="mt-3 divide-y divide-[#e7e0d5] border-y border-[#e7e0d5] text-sm">
                {[
                  ["File size", `${EDUCATION_LIMITS.maxMb} MB`],
                  ["Source text", `${EDUCATION_LIMITS.maxPasteChars.toLocaleString()} chars`],
                  ["Pages, free / Basic", "50"],
                  ["Pages, Pro", "100"],
                  ["Pages, Max", String(EDUCATION_LIMITS.maxPages)],
                ].map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-2"><dt className="text-[#57534e]">{k}</dt><dd className="edu-mono font-semibold text-[#1c1917]">{v}</dd></div>)}
              </dl>
            </div>
            <p className="text-sm leading-relaxed text-[#57534e]">The AI works only from the material you give it, but it can still make mistakes. Check results against your source before you study or print.</p>
            <div className="hidden lg:block">
              <p className="edu-eyebrow !text-[#8a837b]">Other tools</p>
              <ul className="mt-2 space-y-0.5">
                {others.map((t) => <li key={t.id}><Link href={t.href} className="group flex items-center gap-2 rounded-[8px] py-1.5 text-sm text-[#57534e] hover:text-[#1c1917]"><span className="h-px w-3 bg-[#d9d0c3] transition-all group-hover:w-5 group-hover:bg-[#f7433d]" aria-hidden="true" />{t.name}</Link></li>)}
              </ul>
            </div>
          </aside>
        </div>

        {result && <section aria-label="Results" className="mt-10 scroll-mt-20">{result}</section>}

        <Reveal>
          <section className="mt-20 grid gap-8 border-t border-[#1c1917] pt-8 lg:grid-cols-[18rem_minmax(0,1fr)]" aria-labelledby="faq-heading">
            <div>
              <p className="edu-eyebrow">Questions</p>
              <h2 id="faq-heading" className="mt-2 font-['Poppins'] text-2xl font-semibold tracking-[-0.01em] text-[#1c1917]">Frequently asked questions</h2>
            </div>
            <Accordion type="single" collapsible className="border-t border-[#e7e0d5]">
              {tool.faqs.map((f, i) => (
                <AccordionItem key={i} value={`f${i}`} className="border-[#e7e0d5]">
                  <AccordionTrigger className="py-4 text-left text-[15px] font-semibold text-[#1c1917] hover:no-underline hover:text-[#c8302a]">{f.q}</AccordionTrigger>
                  <AccordionContent className="max-w-2xl text-[15px] leading-relaxed text-[#57534e]">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-16" aria-labelledby="related-heading">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="related-heading" className="font-['Poppins'] text-xl font-semibold text-[#1c1917]">Related tools</h2>
              <Link href="/education" className="text-sm font-semibold text-[#1c1917] underline decoration-[#f7433d]/50 decoration-2 underline-offset-4 hover:decoration-[#f7433d]">All study tools</Link>
            </div>
            <div className="mt-4 grid border-b border-[#e7e0d5] md:grid-cols-3 md:gap-x-6">{more.map((t) => <ToolCard key={t.id} tool={t} />)}</div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
