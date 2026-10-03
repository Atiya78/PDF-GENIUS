import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, GraduationCap, Layers, ListChecks } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { ToolCard } from "@/components/education/ToolCard";
import { EDUCATION_CATEGORIES, EDUCATION_HUB_FAQS, EDUCATION_LIMITS, educationTools, faqJsonLd } from "@/lib/education/educationTools";
import { setPendingFile } from "@/lib/education/pendingFile";
import { useSeo } from "@/lib/useSeo";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: "1", t: "Upload PDF", d: "Drop a lecture PDF or paste your notes." },
  { n: "2", t: "Choose options", d: "Pick question types, card style, language and pages." },
  { n: "3", t: "Study & export", d: "Take the quiz, flip the cards, then export or print." },
];

export function EducationHome(): JSX.Element {
  useSeo({ title: "Education Zone — Free AI Study Tools for Students | PDF Genius", description: "Free AI study tools for students and teachers: turn lecture PDFs into quizzes and flashcards, with more tools on the way.", canonicalPath: "/education", jsonLd: faqJsonLd(EDUCATION_HUB_FAQS) });
  const [, setLocation] = useLocation();
  const [cat, setCat] = useState<string>("all");
  const [picked, setPicked] = useState<File | null>(null);
  const tools = educationTools.filter((t) => cat === "all" || t.category === cat);
  const go = (href: string) => { setPendingFile(picked); setLocation(href); };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#fff7f6] to-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-xs font-semibold text-[#d9322c] shadow-sm ring-1 ring-[#f7433d]/20"><GraduationCap className="h-4 w-4" aria-hidden="true" />For Students</span>
          <h1 className="mt-4 font-['Poppins'] text-4xl font-bold text-gray-900 sm:text-5xl" data-testid="text-education-title">Education Zone</h1>
          <p className="mt-3 text-lg text-gray-600">Free AI study tools for students and teachers</p>
        </header>
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          {!picked ? (
            <UploadDropzone acceptedFormats={[".pdf"]} maxFileSize={EDUCATION_LIMITS.maxMb} title="Start with a PDF" subtitle={`Up to ${EDUCATION_LIMITS.maxMb} MB and ${EDUCATION_LIMITS.maxPages} pages`} onFiles={(f) => setPicked(f[0])} testId="dropzone-education-hub" />
          ) : (
            <div data-testid="panel-hub-choice">
              <p className="mb-3 truncate text-sm font-semibold text-gray-900">{picked.name}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => go("/education/quiz-generator")} className="flex items-center gap-3 rounded-xl bg-[#f7433d] p-4 text-left font-semibold text-white hover:bg-[#e03832]" data-testid="button-hub-quiz"><ListChecks className="h-5 w-5" aria-hidden="true" />Make a quiz</button>
                <button type="button" onClick={() => go("/education/flashcards")} className="flex items-center gap-3 rounded-xl bg-[#f7433d] p-4 text-left font-semibold text-white hover:bg-[#e03832]" data-testid="button-hub-flashcards"><Layers className="h-5 w-5" aria-hidden="true" />Make flashcards</button>
              </div>
              <button type="button" onClick={() => setPicked(null)} className="mt-3 text-sm font-semibold text-gray-600 underline" data-testid="button-hub-change-file">Choose a different file</button>
            </div>
          )}
        </div>

        <section className="mt-14" aria-labelledby="tools-heading">
          <h2 id="tools-heading" className="font-['Poppins'] text-2xl font-bold text-gray-900">Study tools</h2>
          <div role="tablist" aria-label="Category" className="mt-4 flex flex-wrap gap-2">
            {EDUCATION_CATEGORIES.map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} data-testid={`tab-category-${c.id}`} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7433d]", cat === c.id ? "bg-[#f7433d] text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-[#f7433d]/50")}>{c.label}</button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tools.map((t) => <ToolCard key={t.id} tool={t} />)}</div>
          {tools.length === 0 && <p className="mt-5 text-gray-600">Nothing in this category yet.</p>}
        </section>

        <section className="mt-16" aria-labelledby="how-heading">
          <h2 id="how-heading" className="font-['Poppins'] text-2xl font-bold text-gray-900">How it works</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7433d] font-bold text-white">{s.n}</span>
                <h3 className="mt-3 font-semibold text-gray-900">{s.t}</h3><p className="mt-1 text-sm text-gray-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16" aria-labelledby="edu-faq-heading">
          <h2 id="edu-faq-heading" className="font-['Poppins'] text-2xl font-bold text-gray-900">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-4 rounded-2xl border border-gray-200 bg-white px-5">
            {EDUCATION_HUB_FAQS.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`}><AccordionTrigger className="text-left font-medium text-gray-900">{f.q}</AccordionTrigger><AccordionContent className="text-gray-600">{f.a}</AccordionContent></AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mt-16 rounded-3xl bg-gray-900 p-8 text-center text-white">
          <h2 className="font-['Poppins'] text-2xl font-bold">Need to convert or edit a PDF first?</h2>
          <p className="mt-2 text-gray-300">Word, Excel, images, merge, split, compress and more, all free.</p>
          <Link href="/tools" className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-[#f7433d] px-8 font-semibold text-white hover:bg-[#e03832]" data-testid="link-all-tools">Browse PDF tools <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </section>
      </div>
    </div>
  );
}
export default EducationHome;
