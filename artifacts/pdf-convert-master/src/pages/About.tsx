import { Link } from "wouter";
import "@/styles/marketing.css";
import { useSeo } from "@/lib/useSeo";
import { COMPANY } from "@/content/legal/company";
import aboutIllustration from "@/assets/about-collaboration.png";
import supportIllustration from "@/assets/about-support.png";
import {
  FREE_TOOLS_COPY,
  HTTPS_COPY,
  FILE_RETENTION_COPY,
  IMAGE_UPLOAD_RETENTION_COPY,
} from "@/config/siteCopy";
import {
  FileText,
  Combine,
  Scissors,
  Minimize2,
  LayoutGrid,
  Image as ImageIcon,
  ShieldCheck,
  Code2,
  Mail,
  ArrowRight,
} from "lucide-react";


const capabilities = [
  { icon: FileText, title: "Convert", text: "Move documents between PDF and other formats." },
  { icon: Combine, title: "Merge", text: "Combine several PDFs into one file." },
  { icon: Scissors, title: "Split", text: "Separate a PDF into individual pages." },
  { icon: Minimize2, title: "Compress", text: "Reduce file size for sharing and uploads." },
  { icon: LayoutGrid, title: "Organize and edit", text: "Rotate, crop, sign and edit your PDFs." },
  { icon: ImageIcon, title: "Image workflows", text: "Resize, crop, rotate and convert images." },
];

const handling = [
  {
    title: "Local or uploaded",
    text: "Some operations run locally in your browser. Others upload the file for processing.",
  },
  { title: "In transit", text: HTTPS_COPY },
  { title: "Stored results", text: FILE_RETENTION_COPY },
  { title: "Image editor uploads", text: IMAGE_UPLOAD_RETENTION_COPY },
];

export const About = (): JSX.Element => {
  useSeo({
    title: "About PDF Genius",
    description:
      "PDF Genius is operated by FLEXO AI LTD. Learn about our PDF tools, the Education Zone, how we handle files, and how to reach us.",
    canonicalPath: "/about",
  });


  return (
    <div className="mkt-root overflow-x-hidden">
      <section className="border-b border-[#e7e0d5]" data-testid="about-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:py-24 xl:gap-14">
          <div className="min-w-0">
          <p className="edu-eyebrow">
            PDF Genius by {COMPANY.legalName}
          </p>
          <h1 className="mkt-display mt-4 max-w-3xl text-[2.3rem] sm:text-5xl xl:text-[3.6rem] break-words">
            PDF and image tools for everyday work and study.
          </h1>
          <p className="mt-6 max-w-2xl mkt-lede">
            PDF Genius gives you straightforward browser workflows for the document jobs that come up
            with work files and study material. {FREE_TOOLS_COPY}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/tools"
              data-testid="link-about-tools"
              className="edu-btn-primary group"
            >
              Browse tools <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/docs"
              data-testid="link-about-docs"
              className="edu-btn-ghost h-12 px-5"
            >
              <Code2 className="w-4 h-4" /> Developer docs
            </Link>
          </div>
          </div>
          <div className="mx-auto w-full min-w-0 max-w-xl lg:max-w-none">
            <img
              src={aboutIllustration}
              alt=""
              aria-hidden="true"
              width={3002}
              height={1370}
              fetchPriority="high"
              decoding="async"
              className="block h-auto w-full max-w-full object-contain"
              data-testid="about-hero-illustration"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20" aria-labelledby="who-heading" data-testid="about-company">
        <div className="mkt-section">
          <div>
            <p className="edu-eyebrow">Who we are</p>
            <h2 id="who-heading" className="mkt-h2 mt-2">The company behind PDF Genius</h2>
          </div>
          <div className="border-t border-[#1c1917] pt-5 text-[16px] leading-relaxed text-[#3f3a35]">
            <p>
              PDF Genius is built and operated by <strong className="text-[#1c1917]">{COMPANY.legalName}</strong>, a private limited company registered in {COMPANY.jurisdiction} (company number {COMPANY.companyNumber}), with its registered office at {COMPANY.address}. We run the website at {COMPANY.domain} and the PDF Genius app on Google Play.
            </p>
            <p className="mt-4">
              Our aim is simple: make common document and study tasks quick to finish, explain plainly what happens to your files, and keep the basic tools free.
            </p>
            <dl className="mt-6 grid gap-px overflow-hidden rounded-[10px] border border-[#e7e0d5] bg-[#e7e0d5] sm:grid-cols-2">
              <div className="bg-[#fffdf9] p-5">
                <dt className="font-['Poppins'] text-lg font-semibold text-[#1c1917]">PDF Tools</dt>
                <dd className="mt-1 text-[15px] text-[#57534e]">Convert, edit, merge, split, compress and protect PDFs, plus image tools and a developer API. Paid plans and credits are sold through Dodo Payments.</dd>
                <dd className="mt-3"><Link href="/tools" className="mkt-link text-sm">Browse tools <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" /></Link></dd>
              </div>
              <div className="bg-[#fffdf9] p-5">
                <dt className="font-['Poppins'] text-lg font-semibold text-[#1c1917]">Education Zone</dt>
                <dd className="mt-1 text-[15px] text-[#57534e]">AI study tools that turn your documents into quizzes, exam papers, flashcards, notes and cited answers. Plans and credits are sold through Paddle.</dd>
                <dd className="mt-3"><Link href="/education" className="mkt-link text-sm">Open Education Zone <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" /></Link></dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
        <p className="edu-eyebrow">Capabilities</p>
        <h2 className="mkt-h2 mt-2">What you can do</h2>
        <div className="mt-8 grid border-t border-[#1c1917] sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
          {capabilities.map((c) => (
            <div key={c.title} className="group border-b border-[#e7e0d5] py-6" data-testid={`item-capability-${c.title}`}>
              <c.icon className="w-5 h-5 text-[#c8302a] transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden="true" />
              <h3 className="mt-3 font-['Poppins'] text-lg font-semibold">{c.title}</h3>
              <p className="mt-1 text-[#57534e] leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-[#57534e]">
           Web tools are available without signup. A developer API key requires an account.
        </p>
      </section>

      <section className="border-y border-[#e7e0d5] bg-[#fffdf9]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="edu-eyebrow inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Handling</p>
            <h2 className="mkt-h2 mt-2">How your files are handled</h2>
            <p className="mt-3 text-[#57534e] leading-relaxed">
              Knowing where a file goes matters. Here is what applies today.
            </p>
            <Link
              href="/privacy"
              data-testid="link-about-privacy"
              className="mkt-link mt-5"
            >
              Read the privacy policy <ArrowRight className="mkt-arrow w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
          <dl className="divide-y divide-[#e7e0d5] border-t border-b border-[#1c1917]">
            {handling.map((h) => (
              <div key={h.title} className="py-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="font-semibold">{h.title}</dt>
                <dd className="mt-1 sm:mt-0 text-[#57534e] leading-relaxed">{h.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20" data-testid="about-support">
        <div className="grid items-center gap-8 border-y border-[#e7e0d5] py-10 lg:grid-cols-[1.15fr_1fr] xl:gap-12">
          <div className="min-w-0">
          <p className="edu-eyebrow">Support</p>
          <h2 className="mkt-h2 mt-2">Questions or feedback?</h2>
          <p className="mt-3 max-w-xl leading-relaxed text-[#57534e]">
             Contact support with questions about a tool, your account or a file-processing issue. For privacy or legal matters, write to{" "}
             <a href={`mailto:${COMPANY.privacyEmail}`} className="mkt-link">{COMPANY.privacyEmail}</a>.
          </p>
          <div className="mt-6 flex flex-col flex-wrap gap-3 sm:flex-row">
            <a
              href="mailto:support@pdfgenius.app"
              data-testid="link-about-email"
              className="edu-btn-primary break-all"
            >
              <Mail className="w-4 h-4 shrink-0" /> support@pdfgenius.app
            </a>
            <Link
              href="/contact"
              data-testid="link-about-contact"
              className="edu-btn-ghost h-12 px-5"
            >
              Open contact page
            </Link>
          </div>
          </div>
          <div className="mx-auto w-full min-w-0 max-w-sm lg:max-w-none">
            <img
              src={supportIllustration}
              alt=""
              aria-hidden="true"
              width={2950}
              height={1668}
              loading="eager"
              decoding="async"
              className="block h-auto w-full max-w-full object-contain"
              data-testid="about-support-illustration"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
