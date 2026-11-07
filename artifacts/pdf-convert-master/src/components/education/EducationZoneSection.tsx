import { Link } from "wouter";
import { Reveal } from "@/components/education/Reveal";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { LottieIcon } from "@/components/ui/lottie-icon";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import studentAnimation from "@/assets/lottie/student.json";

const benefits = [
  "PDF or pasted notes",
  "English and Bangla",
  "Quizzes and exam papers",
  "Flip flashcards",
  "Instant quiz feedback",
  "Saved flashcard progress",
  "Edit before exporting",
  "Translate, summarize, mind-map",
  "PDF, DOCX and CSV",
];

const actions = [
  { toolId: "quiz-generator", label: "Quiz Generator", href: "/education/quiz-generator", id: "quiz" },
  { toolId: "exam-paper-generator", label: "Exam Paper Generator", href: "/education/exam-paper-generator", id: "exam-paper-generator" },
  { toolId: "flashcards", label: "Flashcard Maker", href: "/education/flashcards", id: "flashcards" },
  { toolId: "notes-maker", label: "Notes Maker", href: "/education/notes-maker", id: "notes-maker" },
  { toolId: "pdf-translator", label: "PDF Translator", href: "/education/pdf-translator", id: "pdf-translator" },
  { toolId: "pdf-summarizer", label: "PDF Summarizer", href: "/education/pdf-summarizer", id: "pdf-summarizer" },
  { toolId: "mind-map", label: "Mind Map", href: "/education/mind-map", id: "mind-map" },
];

export function EducationZoneSection(): JSX.Element {

  return (
    <section aria-labelledby="education-zone-heading" className="w-full px-4 py-14 sm:px-6 lg:px-8" data-testid="section-education-zone">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[20px] border border-[#e7e0d5] bg-[#faf7f2]">
        <div className="grid gap-10 p-6 sm:p-10 sm:pl-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 lg:p-14 lg:pl-20">
          <Reveal>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c8302a]">Education Zone</p>
            <h2 id="education-zone-heading" className="mt-3 font-['Poppins'] text-[2.2rem] font-semibold leading-[1.06] tracking-[-0.025em] text-[#1c1917] sm:text-[2.8rem]">
              Your lecture PDF,<br />turned into revision.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#57534e] sm:text-[17px]">
              Turn lecture notes or textbook PDFs into quizzes and flashcards in seconds, so revision starts sooner.
            </p>
            <ul className="mt-7 grid max-w-lg gap-x-6 border-t border-[#e7e0d5] sm:grid-cols-2">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-2.5 border-b border-[#e7e0d5] py-2.5 text-sm font-medium text-[#1c1917]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f7433d]" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="relative mx-auto w-full max-w-sm pt-10 lg:mx-0 lg:ml-auto lg:pt-0">
            <span className="pointer-events-none absolute -top-6 right-2 z-10 h-24 w-24 sm:-top-14 sm:h-28 sm:w-28" aria-hidden="true" data-testid="education-student-animation">
              <LottieIcon animationData={studentAnimation} width="100%" height="100%" loop autoplay className="block" />
            </span>
            <div className="rounded-[16px] border border-[#e7e0d5] bg-[#fffdf9] p-5 shadow-[0_30px_60px_-40px_rgba(28,25,23,.55)] sm:p-6">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a837b]">Start studying</p>
              <p className="mt-1.5 text-sm text-[#57534e]">Pick a study tool and upload your PDF. Free to try.</p>
              <ul className="mt-4 border-t border-[#e7e0d5]">
                {actions.map((a) => (
                  <li key={a.id}>
                    <Link href={a.href} className="group flex h-12 items-center gap-3 border-b border-[#efe8dd] px-1 text-sm font-semibold text-[#1c1917] transition-colors hover:text-[#c8302a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7433d]" data-testid={`link-education-${a.id}`}>
                      <ToolLottieIcon toolId={a.toolId} size={28} /> {a.label}
                      <ArrowUpRight className="ml-auto h-4 w-4 text-[#c9bfb1] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f7433d]" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/education" className="group mt-5 flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#f7433d] text-sm font-semibold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,.16)] transition-colors hover:bg-[#c8302a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1917]" data-testid="link-explore-education">
                Explore Education Zone <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
export default EducationZoneSection;
