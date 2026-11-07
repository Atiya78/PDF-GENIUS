import { type ReactNode, useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useSeo } from "@/lib/useSeo";
import { parseLegal, LegalBlocks } from "@/components/legal/LegalMarkdown";
import { COMPANY, LEGAL_PAGES } from "@/content/legal/company";
import "@/styles/marketing.css";
import "@/styles/legal.css";

const SOURCES = import.meta.glob("../../content/legal/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export function legalSource(slug: string): string {
  const raw = SOURCES[`../../content/legal/${slug}.md`];
  if (!raw) throw new Error(`Missing legal content: ${slug}.md`);
  return raw;
}

/** Shared shell for every policy page: title block, sticky contents, ruled body, related links. */
export function LegalPage({ slug, path, children }: { slug: string; path: string; children?: ReactNode }) {
  const doc = useMemo(() => parseLegal(legalSource(slug)), [slug]);
  const { title, description, eyebrow = "Legal" } = doc.meta;
  useSeo({ title, description, canonicalPath: path });
  const showToc = doc.toc.length >= 4;
  const related = LEGAL_PAGES.filter((p) => p.path !== path);

  return (
    <div className="mkt-root legal-root pb-24">
      <header className="border-b border-[#e7e0d5]">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 lg:pt-14">
          <p className="edu-eyebrow">{eyebrow}</p>
          <h1 className="mkt-display mt-3 text-[2.2rem] sm:text-[2.9rem]">{title}</h1>
          {description && <p className="mkt-lede mt-4 max-w-2xl">{description}</p>}
          <dl className="legal-meta mt-7">
            <div><dt>Effective</dt><dd>{COMPANY.effectiveDate}</dd></div>
            <div><dt>Last updated</dt><dd>{COMPANY.lastUpdated}</dd></div>
            <div><dt>Operator</dt><dd>{COMPANY.legalName}</dd></div>
          </dl>
        </div>
      </header>

      <div className={`mx-auto max-w-6xl px-4 pt-10 sm:px-6 ${showToc ? "lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14" : ""}`}>
        {showToc && (
          <nav aria-label="On this page" className="legal-toc mb-10 lg:mb-0">
            <p className="edu-eyebrow !text-[#8a837b]">On this page</p>
            <ol>
              {doc.toc.map((t, i) => (
                <li key={t.id}><a href={`#${t.id}`}><span className="edu-mono">{String(i + 1).padStart(2, "0")}</span>{t.title}</a></li>
              ))}
            </ol>
          </nav>
        )}
        <main className="legal-body min-w-0 max-w-3xl">
          {children}
          <LegalBlocks blocks={doc.blocks} />

          <section aria-labelledby="related-heading" className="mt-16 border-t border-[#1c1917] pt-6">
            <h2 id="related-heading" className="edu-eyebrow">Related policies</h2>
            <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.path} className="border-b border-[#efe8dd]">
                  <Link href={p.path} className="legal-related">{p.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
