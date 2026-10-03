import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSeo } from "@/lib/useSeo";
import { educationTools, faqJsonLd, getEducationTool } from "@/lib/education/educationTools";
import { ToolCard } from "./ToolCard";

interface Props {
  toolId: string;
  seoTitle: string;
  seoDescription: string;
  upload: ReactNode;
  options: ReactNode;
  result?: ReactNode;
}

export function EducationToolLayout({ toolId, seoTitle, seoDescription, upload, options, result }: Props) {
  const tool = getEducationTool(toolId)!;
  const Icon = tool.icon;
  useSeo({ title: seoTitle, description: seoDescription, canonicalPath: tool.href, jsonLd: faqJsonLd(tool.faqs) });
  const related = educationTools.filter((t) => t.id !== toolId && t.status === "live").slice(0, 3);
  const more = related.length ? related : educationTools.filter((t) => t.id !== toolId).slice(0, 3);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#fff7f6] to-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">Home</Link><ChevronRight className="h-4 w-4" aria-hidden="true" />
          <Link href="/education" className="hover:text-gray-900">Education Zone</Link><ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span aria-current="page" className="font-medium text-gray-900">{tool.name}</span>
        </nav>
        <header className="mb-8 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f7433d] text-white"><Icon className="h-6 w-6" aria-hidden="true" /></span>
          <div>
            <h1 className="font-['Poppins'] text-3xl font-bold text-gray-900 sm:text-4xl" data-testid="text-tool-title">{tool.name}</h1>
            <p className="mt-2 text-gray-600">{tool.description}</p>
          </div>
        </header>
        <div className="space-y-6">
          <section aria-label="Upload" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">{upload}</section>
          <section aria-label="Options" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">{options}</section>
          {result && <section aria-label="Results" className="scroll-mt-20">{result}</section>}
        </div>
        <section className="mt-14" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-['Poppins'] text-2xl font-bold text-gray-900">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-4 rounded-2xl border border-gray-200 bg-white px-5">
            {tool.faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`}>
                <AccordionTrigger className="text-left font-medium text-gray-900">{f.q}</AccordionTrigger>
                <AccordionContent className="text-gray-600">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
        <section className="mt-14" aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-['Poppins'] text-2xl font-bold text-gray-900">Related tools</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{more.map((t) => <ToolCard key={t.id} tool={t} />)}</div>
        </section>
      </div>
    </div>
  );
}
