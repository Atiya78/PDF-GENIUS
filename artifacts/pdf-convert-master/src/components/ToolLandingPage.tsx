import { useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
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

  return (
    <div className="bg-white">
      <header className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 pb-4">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="hover:text-primary hover:underline" data-testid="link-breadcrumb-home">Home</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
            <li aria-current="page" className="font-medium text-gray-800">{page.name}</li>
          </ol>
        </nav>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900" data-testid="text-tool-title">{page.name}</h1>
        <p className="mt-3 max-w-2xl text-gray-600">{page.description}</p>
      </header>

      <ToolLandingContext.Provider value={true}>{children}</ToolLandingContext.Provider>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 space-y-14">
        <section aria-labelledby="how-to">
          <h2 id="how-to" className="text-2xl font-bold text-gray-900">How to use {page.name}</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {page.steps.map((s, i) => (
              <li key={i} className="rounded-2xl border border-gray-200 bg-gray-50 p-5" data-testid={`step-${i + 1}`}>
                <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
                <p className="text-gray-700">{s}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="why">
          <h2 id="why" className="text-2xl font-bold text-gray-900">Why use this tool</h2>
          <p className="mt-3 max-w-3xl text-gray-600">{page.why}</p>
        </section>

        <section aria-labelledby="faq">
          <h2 id="faq" className="text-2xl font-bold text-gray-900">Frequently asked questions</h2>
          <dl className="mt-5 divide-y divide-gray-200 rounded-2xl border border-gray-200">
            {page.faqs.map((f, i) => (
              <div key={i} className="p-5" data-testid={`faq-${i + 1}`}>
                <dt className="font-semibold text-gray-900">{f.question}</dt>
                <dd className="mt-1.5 text-gray-600">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="related">
          <h2 id="related" className="text-2xl font-bold text-gray-900">Related tools</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {page.related.map((r) => (
              <li key={r.path}>
                <Link href={r.path} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 font-medium text-gray-900 hover:border-primary hover:text-primary" data-testid={`link-related-${r.path.replace(/\W+/g, "-")}`}>
                  {r.name}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
