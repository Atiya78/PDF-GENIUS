import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Layers, ListChecks } from "lucide-react";

const cards = [
  { icon: ListChecks, title: "Quiz Generator", text: "Create MCQ, True/False and short-answer quizzes from your PDF.", href: "/education/quiz-generator", id: "quiz" },
  { icon: Layers, title: "Flashcard Maker", text: "Auto-generate flip flashcards for fast revision.", href: "/education/flashcards", id: "flashcards" },
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
      <div className={`mx-auto max-w-6xl rounded-3xl bg-gradient-to-br from-[#fff1f0] via-white to-[#fff7f1] p-6 ring-1 ring-[#f7433d]/10 transition-all duration-700 motion-reduce:transition-none sm:p-10 ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
        <div className="text-center">
          <h2 id="education-zone-heading" className="mt-4 font-['Poppins'] text-3xl font-bold text-gray-900 sm:text-4xl">Education Zone — Study Smarter with AI</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 sm:text-lg">Turn any lecture notes or textbook PDF into quizzes and flashcards in seconds.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cards.map((c) => (
            <Link key={c.id} href={c.href} className="group flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7433d]" data-testid={`link-education-${c.id}`}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f7433d] text-white"><c.icon className="h-6 w-6" aria-hidden="true" /></span>
              <span>
                <span className="block font-['Poppins'] text-lg font-semibold text-gray-900">{c.title}</span>
                <span className="mt-1 block text-sm text-gray-600">{c.text}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/education" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f7433d] px-8 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#e03832] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7433d]" data-testid="link-explore-education">
            Explore Education Zone <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
export default EducationZoneSection;
