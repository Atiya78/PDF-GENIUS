import { useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { ToolCard } from "@/components/education/ToolCard";
import { EducationBillingStatus } from "@/components/education/EducationBillingStatus";
import { EduFonts } from "@/components/education/EduFonts";
import { Reveal } from "@/components/education/Reveal";
import "@/components/education/education.css";
import { EDUCATION_CATEGORIES, EDUCATION_HUB_FAQS, EDUCATION_LIMITS, educationTools, faqJsonLd } from "@/lib/education/educationTools";
import { setPendingFile } from "@/lib/education/pendingFile";
import { useSeo } from "@/lib/useSeo";
import { cn } from "@/lib/utils";

const METHOD = [
  { t: "Add your material", d: "Drop a lecture PDF or paste text. Pick a page range if you only need a chapter." },
  { t: "Pick a tool and options", d: "Quiz, exam paper, flashcards, notes, summary, mind map or translation, in English or Bangla." },
  { t: "Review, edit, export", d: "Edit the result, then export to PDF, DOCX or print. Signed-in results stay in history for 24 hours." },
];

const OUTPUTS = ["a quiz", "an exam paper", "flashcards", "study notes", "a summary", "a mind map", "cited answers", "a Bangla translation"];

export function EducationHome(): JSX.Element {
  useSeo({ title: "Education Zone — AI Study Tools, Plans and Credits | PDF Genius", description: "Create quizzes, exam papers, flashcards, notes, summaries and mind maps. Ask PDFs with page citations and translate Bangla-English. Edit and export your work.", canonicalPath: "/education", jsonLd: faqJsonLd(EDUCATION_HUB_FAQS) });
  const reduce = useReducedMotion();
  const [, setLocation] = useLocation();
  const [cat, setCat] = useState<string>("all");
  const [picked, setPicked] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const categories = EDUCATION_CATEGORIES.filter(c => c.id === "all" || educationTools.some(t => t.category === c.id));
  const q = query.trim().toLowerCase();
  const tools = educationTools.filter((t) => (cat === "all" || t.category === cat) && (!q || t.name.toLowerCase().includes(q)));
  const go = (href: string) => { setPendingFile(picked); setLocation(href); };

  return (
    <div className="education-tool-content edu-root min-h-[100dvh]">
      <EduFonts />
      {/* Hero: statement on the left, the working sheet on the right */}
      <section className="relative overflow-hidden border-b border-[#e7e0d5]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:pb-20 lg:pl-12 lg:pt-16">
          <motion.div initial={{ y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}>
            <h1 data-testid="text-education-title">
              <span className="edu-eyebrow block">Education Zone</span>
              <span className="mt-4 block font-['Poppins'] text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.03em] text-[#1c1917] sm:text-[3.4rem] lg:text-[3.9rem]">
                Bring the lecture.<br />Leave <span className="relative whitespace-nowrap">exam-ready<svg className="absolute -bottom-1.5 left-0 w-full" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 7 C 50 2, 120 2, 198 6" stroke="#f7433d" strokeWidth="3" fill="none" strokeLinecap="round" /></svg></span>.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-[#57534e]">
              Study tools for university and college students and their teachers. Start from your own PDF or notes, in English or Bangla, and turn it into:
            </p>
            <ul className="mt-4 flex max-w-lg flex-wrap gap-x-1.5 gap-y-1 text-[15px] text-[#1c1917]" aria-label="What you can make">
              {OUTPUTS.map((o, i) => <li key={o}>{o}{i < OUTPUTS.length - 1 ? <span className="text-[#c9bfb1]">,</span> : "."}</li>)}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <a href="#tools-heading" className="group inline-flex items-center gap-1.5 font-semibold text-[#1c1917]">Browse all tools <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></a>
              <Link href="/education/pricing" className="font-semibold text-[#57534e] underline decoration-[#d9d0c3] decoration-2 underline-offset-4 hover:text-[#1c1917] hover:decoration-[#f7433d]">Plans and credits</Link>
            </div>
          </motion.div>

          <motion.div initial={{ y: reduce ? 0 : 16 }} animate={{ y: 0 }} transition={{ duration: 0.55, delay: 0.08, ease: [0.2, 0.7, 0.2, 1] }} className="space-y-3">
            <div className="relative rounded-[16px] border border-[#e7e0d5] bg-[#fffdf9] p-4 shadow-[0_30px_60px_-40px_rgba(28,25,23,.55)] sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="edu-eyebrow !text-[#8a837b]">Start here</p>
                <p className="edu-mono text-xs text-[#b5aa9b]">PDF, up to {EDUCATION_LIMITS.maxMb} MB</p>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                {!picked ? (
                  <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <UploadDropzone acceptedFormats={[".pdf"]} maxFileSize={EDUCATION_LIMITS.maxMb} title="Start with a PDF" subtitle={`Up to ${EDUCATION_LIMITS.maxMb} MB. Page cap 50 (free/Basic), 100 (Pro), ${EDUCATION_LIMITS.maxPages} (Max)`} onFiles={(f) => setPicked(f[0])} testId="dropzone-education-hub" />
                  </motion.div>
                ) : (
                  <motion.div key="choice" data-testid="panel-hub-choice" initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                    <p className="text-xs text-[#8a837b]">Ready to use</p>
                    <p className="mt-0.5 truncate font-['Poppins'] text-lg font-semibold text-[#1c1917]">{picked.name}</p>
                    <p className="mt-4 text-sm text-[#57534e]">What should it become?</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <button type="button" onClick={() => go("/education/quiz-generator")} className="group flex items-center gap-3 rounded-[12px] bg-[#f7433d] p-3.5 text-left font-semibold text-white transition-colors hover:bg-[#c8302a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1917]" data-testid="button-hub-quiz"><span className="rounded-[8px] bg-white p-1"><ToolLottieIcon toolId="quiz-generator" size={28} /></span>Make a quiz<ArrowRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></button>
                      <button type="button" onClick={() => go("/education/flashcards")} className="group flex items-center gap-3 rounded-[12px] bg-[#1c1917] p-3.5 text-left font-semibold text-white transition-colors hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7433d]" data-testid="button-hub-flashcards"><span className="rounded-[8px] bg-white p-1"><ToolLottieIcon toolId="flashcards" size={28} /></span>Make flashcards<ArrowRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></button>
                    </div>
                    <button type="button" onClick={() => setPicked(null)} className="mt-4 text-sm font-semibold text-[#57534e] underline underline-offset-4 hover:text-[#1c1917]" data-testid="button-hub-change-file">Choose a different file</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <EducationBillingStatus />
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {/* Contents */}
        <section className="pt-16" aria-labelledby="tools-heading">
          <Reveal>
            <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-end">
              <div>
                <p className="edu-eyebrow">Contents</p>
                <h2 id="tools-heading" className="mt-2 scroll-mt-24 font-['Poppins'] text-[1.9rem] font-semibold tracking-[-0.02em] text-[#1c1917]">Study tools</h2>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div role="tablist" aria-label="Category" className="edu-tabs flex-1 !gap-5">
                  {categories.map((c) => (
                    <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} data-testid={`tab-category-${c.id}`} className={cn("edu-tab", cat === c.id && "edu-tab-on")}>{c.label}</button>
                  ))}
                </div>
                <label className="relative block sm:w-60"><span className="sr-only">Search tools by name</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a837b]" aria-hidden="true" />
                  <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools by name" className="edu-input !pl-9" data-testid="input-education-search" />
                </label>
              </div>
            </div>
          </Reveal>
          <motion.div layout={!reduce} className="mt-6 grid border-b border-[#e7e0d5] md:grid-cols-2 md:gap-x-10">
            <AnimatePresence initial={false}>
              {tools.map((t) => (
                <motion.div key={t.id} layout={!reduce} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <ToolCard tool={t} index={educationTools.indexOf(t)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          {tools.length === 0 && <p className="mt-6 text-[#57534e]">No tools match your search. <button type="button" onClick={() => { setQuery(""); setCat("all"); }} className="font-semibold text-[#1c1917] underline underline-offset-4">Clear filters</button></p>}
        </section>

        {/* Method */}
        <section className="mt-24" aria-labelledby="how-heading">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <div>
                <p className="edu-eyebrow">Method</p>
                <h2 id="how-heading" className="mt-2 font-['Poppins'] text-[1.9rem] font-semibold tracking-[-0.02em] text-[#1c1917]">How it works</h2>
              </div>
              <ol className="grid border-t border-[#1c1917] md:grid-cols-3">
                {METHOD.map((s, i) => (
                  <li key={s.t} className={cn("relative py-6 md:pr-6", i > 0 && "border-t border-[#e7e0d5] md:border-l md:border-t-0 md:pl-6")}>
                    <span className="edu-mono text-xs text-[#f7433d]">{["i.", "ii.", "iii."][i]}</span>
                    <h3 className="mt-2 font-['Poppins'] text-lg font-semibold text-[#1c1917]">{s.t}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#57534e]">{s.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section className="mt-24" aria-labelledby="edu-faq-heading">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <p className="edu-eyebrow">Fine print</p>
                <h2 id="edu-faq-heading" className="mt-2 font-['Poppins'] text-[1.9rem] font-semibold tracking-[-0.02em] text-[#1c1917]">Frequently asked questions</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#57534e]">Privacy, limits and credits, answered plainly.</p>
              </div>
              <Accordion type="single" collapsible className="border-t border-[#1c1917]">
                {EDUCATION_HUB_FAQS.map((f, i) => (
                  <AccordionItem key={i} value={`f${i}`} className="border-[#e7e0d5]">
                    <AccordionTrigger className="py-5 text-left text-[16px] font-semibold text-[#1c1917] hover:no-underline hover:text-[#c8302a]">{f.q}</AccordionTrigger>
                    <AccordionContent className="max-w-2xl text-[15px] leading-relaxed text-[#57534e]">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Reveal>
        </section>

        <Reveal>
          <section className="mt-24 flex flex-col gap-4 border-y border-[#e7e0d5] py-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-['Poppins'] text-xl font-semibold text-[#1c1917]">Need to convert or edit a PDF first?</h2>
              <p className="mt-1 text-[#57534e]">Word, Excel, images, merge, split, compress and more, all free.</p>
            </div>
            <Link href="/tools" className="group inline-flex h-12 shrink-0 items-center gap-2 rounded-[10px] border border-[#1c1917] px-6 font-semibold text-[#1c1917] transition-colors hover:bg-[#1c1917] hover:text-white" data-testid="link-all-tools">Browse PDF tools <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
export default EducationHome;
