import { useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/education/Reveal";
import "@/styles/tools.css";
import { useSeo } from "@/lib/useSeo";
import { ToolLandingContext } from "@/contexts/ToolLandingContext";
import type { ToolLandingPageData } from "@/config/toolLandingPages";

export function ToolLandingPage({ page, children }: { page: ToolLandingPageData; children: ReactNode }) {
  const jsonLd = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: `How to use ${page.name}`,
        step: page.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, name: `Step ${i + 1}`, text })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://pdfgenius.app/" },
          { "@type": "ListItem", position: 2, name: page.name, item: `https://pdfgenius.app${page.path}` },
        ],
      },
    ],
    [page],
  );

  useSeo({ title: page.title, description: page.description, canonicalPath: page.path, jsonLd });

  const H2 = "mt-2 font-['Poppins'] text-[1.6rem] font-semibold tracking-[-0.02em] text-[#1c1917]";
  return (
    <div className="tl-root">
      <header className="mx-auto max-w-5xl px-4 pt-8 pb-2 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-[#57534e]">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="rounded-sm underline-offset-4 hover:text-[#1c1917] hover:underline hover:decoration-[#f7433d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1c1917]" data-testid="link-breadcrumb-home">Home</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5 text-[#b5aa9b]" /></li>
            <li aria-current="page" className="font-medium text-[#1c1917]">{page.name}</li>
          </ol>
        </nav>
        <h1 className="font-['Poppins'] text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] text-[#1c1917] sm:text-[2.6rem]" data-testid="text-tool-title">{page.name}</h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-[#57534e]">{page.description}</p>
      </header>

      <div className="tl-landing-body"><ToolLandingContext.Provider value={true}>{children}</ToolLandingContext.Provider></div>

      <div className="mx-auto max-w-5xl space-y-20 px-4 pb-24 pt-10 sm:px-6">
        <Reveal>
          <section aria-labelledby="how-to" className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <div>
              <p className="edu-eyebrow">Method</p>
              <h2 id="how-to" className={H2}>How to use {page.name}</h2>
            </div>
            <ol className="grid border-t border-[#1c1917] md:grid-cols-3">
              {page.steps.map((s, i) => (
                <li key={i} className={`py-5 md:pr-6 ${i > 0 ? "border-t border-[#e7e0d5] md:border-l md:border-t-0 md:pl-6" : ""}`} data-testid={`step-${i + 1}`}>
                  <span className="edu-mono text-xs text-[#c8302a]">{["i.", "ii.", "iii.", "iv.", "v.", "vi."][i] ?? `${i + 1}.`}</span>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#1c1917]">{s}</p>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>

        <Reveal>
          <section aria-labelledby="why" className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <div>
              <p className="edu-eyebrow">Notes</p>
              <h2 id="why" className={H2}>Why use this tool</h2>
            </div>
            <p className="max-w-3xl border-t border-[#1c1917] pt-5 text-[16px] leading-relaxed text-[#57534e]">{page.why}</p>
          </section>
        </Reveal>

        <Reveal>
          <section aria-labelledby="faq" className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <p className="edu-eyebrow">Fine print</p>
              <h2 id="faq" className={H2}>Frequently asked questions</h2>
            </div>
            <dl className="border-t border-[#1c1917]">
              {page.faqs.map((f, i) => (
                <div key={i} className="border-b border-[#e7e0d5] py-5" data-testid={`faq-${i + 1}`}>
                  <dt className="font-semibold text-[#1c1917]">{f.question}</dt>
                  <dd className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-[#57534e]">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </Reveal>

        <Reveal>
          <section aria-labelledby="related" className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <div>
              <p className="edu-eyebrow">See also</p>
              <h2 id="related" className={H2}>Related tools</h2>
            </div>
            <ul className="grid border-b border-[#e7e0d5] sm:grid-cols-2 sm:gap-x-8">
              {page.related.map((r) => (
                <li key={r.path}>
                  <Link href={r.path} className="tl-dir-link" data-testid={`link-related-${r.path.replace(/\W+/g, "-")}`}>
                    <span>{r.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
