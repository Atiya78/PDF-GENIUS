import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, GraduationCap, Layers, ListChecks } from "lucide-react";

const benefits = [
  "PDF or pasted notes",
  "English and Bangla",
  "Multiple-choice quizzes",
  "Flip flashcards",
  "Instant quiz feedback",
  "Saved flashcard progress",
  "Edit before exporting",
  "PDF, DOCX and CSV",
];

const actions = [
  { icon: ListChecks, label: "Quiz Generator", href: "/education/quiz-generator", id: "quiz" },
  { icon: Layers, label: "Flashcard Maker", href: "/education/flashcards", id: "flashcards" },
];

export function EducationZoneSection(): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} aria-labelledby="education-zone-heading" className="w-full px-4 py-12 sm:px-6 lg:px-8" data-testid="section-education-zone">
      <div className={`mx-auto grid max-w-6xl items-center gap-10 rounded-3xl bg-[#fff1f0] p-6 transition-all duration-700 motion-reduce:transition-none sm:p-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14 lg:p-14 ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
        <div>
          <h2 id="education-zone-heading" className="font-['Poppins'] text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
            Education Zone.<br />Study smarter with AI.
          </h2>
          <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
            Turn lecture notes or textbook PDFs into quizzes and flashcards in seconds, so revision starts sooner.
          </p>
          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm font-semibold text-gray-900">
                <Check className="h-4 w-4 shrink-0 text-[#f7433d]" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:ml-auto">
          <span className="absolute -top-6 right-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7433d] text-white shadow-lg motion-safe:animate-bounce [animation-duration:3s]" aria-hidden="true">
            <GraduationCap className="h-8 w-8" />
          </span>
          <div className="rounded-2xl bg-white p-6 shadow-[0_20px_40px_-12px_rgba(247,67,61,0.22)] ring-1 ring-gray-100 sm:p-8">
            <h3 className="text-center font-['Poppins'] text-xl font-bold text-gray-900">Start studying</h3>
            <p className="mt-2 text-center text-sm text-gray-500">Pick a study tool and upload your PDF. Free to try.</p>
            <div className="mt-6 space-y-3">
              {actions.map((a) => (
                <Link key={a.id} href={a.href} className="flex h-12 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-900 transition-colors hover:border-[#f7433d]/40 hover:bg-[#fff1f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7433d]" data-testid={`link-education-${a.id}`}>
                  <a.icon className="h-4 w-4 text-[#f7433d]" aria-hidden="true" /> {a.label}
                </Link>
              ))}
            </div>
            <div className="my-4 flex items-center gap-3 text-xs text-gray-400" aria-hidden="true">
              <span className="h-px flex-1 bg-gray-200" />or<span className="h-px flex-1 bg-gray-200" />
            </div>
            <Link href="/education" className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f7433d] text-sm font-semibold text-white transition-colors hover:bg-[#e03832] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7433d]" data-testid="link-explore-education">
              Explore Education Zone <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
export default EducationZoneSection;
