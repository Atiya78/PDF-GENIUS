import { Suspense, useMemo, type ComponentType } from "react";
import { Link } from "wouter";
import { useSeo } from "@/lib/useSeo";
import { PageLoader } from "@/components/page-loader";
import { ToolLandingContext } from "@/components/upload/ToolLandingContext";
import { toolPageBySlug, type ToolPage } from "@/config/toolPages";

const SITE_URL = "https://pdfgenius.app";

interface ToolLandingProps {
  page: ToolPage;
  Tool: ComponentType;
}

/**
 * Canonical landing wrapper for every tool. Owns the single page H1, the page
 * metadata and structured data; the tool inside renders its title as an H2.
 */
export const ToolLanding = ({ page, Tool }: ToolLandingProps): JSX.Element => {
  const heading = page.title.split(" | ")[0];
  const url = `${SITE_URL}/${page.slug}`;

  const jsonLd = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE_URL}/tools` },
          { "@type": "ListItem", position: 3, name: heading, item: url },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: heading,
        description: page.description,
        step: page.howTo.map((text, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: `Step ${i + 1}`,
          text,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
    [page, heading, url],
  );

  useSeo({
    title: page.title,
    description: page.description,
    canonicalPath: `/${page.slug}`,
    jsonLd,
  });

  const related = page.related
    .map((slug) => toolPageBySlug(slug))
    .filter((p): p is ToolPage => Boolean(p));

  return (
    <div>
      <div className="mx-auto max-w-5xl px-4 pt-8 text-center sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl" data-testid="text-tool-landing-h1">
          {heading}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-700">{page.description}</p>
      </div>

      <ToolLandingContext.Provider value={true}>
        <Suspense fallback={<PageLoader />}>
          <Tool />
        </Suspense>
      </ToolLandingContext.Provider>

      <div className="mx-auto max-w-3xl space-y-12 px-4 pb-16 pt-4 sm:px-6">
        <section aria-labelledby="how-to-heading">
          <h2 id="how-to-heading" className="text-2xl font-bold text-gray-900">
            How to use {heading}
          </h2>
          <ol className="mt-4 space-y-3">
            {page.howTo.map((step, i) => (
              <li key={i} className="flex gap-3 text-gray-700">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d92f29] text-sm font-semibold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="why-heading">
          <h2 id="why-heading" className="text-2xl font-bold text-gray-900">
            When to use it
          </h2>
          <p className="mt-3 leading-7 text-gray-700">{page.why}</p>
        </section>

        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold text-gray-900">
            Questions about {heading}
          </h2>
          <div className="mt-4 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
            {page.faqs.map((f) => (
              <details key={f.question} className="group p-4">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 font-semibold text-gray-900">
                  {f.question}
                  <span className="text-[#c62d27] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="pb-2 pt-1 leading-7 text-gray-700">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <nav aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-2xl font-bold text-gray-900">
            Related tools
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${r.slug}`}
                  className="flex min-h-[44px] items-center rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-[#c62d27] hover:border-[#f7433d] hover:bg-[#fff5f4]"
                >
                  {r.title.split(" | ")[0]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default ToolLanding;
