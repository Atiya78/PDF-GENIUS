import { Link } from "wouter";
import { useSeo } from "@/lib/useSeo";
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

const CORAL = "#f7433d";

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
      "PDF Genius is a browser toolkit for converting, editing, merging, splitting and compressing PDFs and images. Free tools. No signup required.",
    canonicalPath: "/about",
  });

  const btn =
    "inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  return (
    <div className="bg-[#fffaf8] text-stone-900 overflow-x-hidden">
      <section className="border-b border-stone-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20 lg:py-28">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: CORAL }}>
            About PDF Genius
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] break-words">
            PDF and image tools for everyday work and study.
          </h1>
          <p className="mt-6 max-w-2xl text-base sm:text-lg text-stone-700 leading-relaxed">
            PDF Genius gives you straightforward browser workflows for the document jobs that come up
            with work files and study material. {FREE_TOOLS_COPY}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/tools"
              data-testid="link-about-tools"
              className={`${btn} text-white hover:opacity-90`}
              style={{ backgroundColor: CORAL }}
            >
              Browse tools <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs"
              data-testid="link-about-docs"
              className={`${btn} border border-stone-300 bg-white hover:bg-stone-50`}
            >
              <Code2 className="w-4 h-4" /> Developer docs
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold">What you can do</h2>
        <div className="mt-8 grid gap-px bg-stone-200 border border-stone-200 rounded-lg overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <div key={c.title} className="bg-white p-5 sm:p-6" data-testid={`item-capability-${c.title}`}>
              <c.icon className="w-6 h-6" style={{ color: CORAL }} />
              <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="mt-1 text-stone-600 leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-stone-600">
           Web tools are available without signup. A developer API key requires an account.
        </p>
      </section>

      <section className="bg-white border-y border-stone-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <ShieldCheck className="w-8 h-8" style={{ color: CORAL }} />
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold">How your files are handled</h2>
            <p className="mt-3 text-stone-600 leading-relaxed">
              Knowing where a file goes matters. Here is what applies today.
            </p>
            <Link
              href="/privacy-policy"
              data-testid="link-about-privacy"
              className="mt-5 inline-flex items-center gap-2 font-semibold hover:underline"
              style={{ color: CORAL }}
            >
              Read the privacy policy <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <dl className="divide-y divide-stone-200 border-t border-b border-stone-200">
            {handling.map((h) => (
              <div key={h.title} className="py-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="font-semibold">{h.title}</dt>
                <dd className="mt-1 sm:mt-0 text-stone-600 leading-relaxed">{h.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
        <div className="rounded-xl p-6 sm:p-10 text-white" style={{ backgroundColor: CORAL }}>
          <h2 className="text-2xl sm:text-3xl font-bold">Questions or feedback?</h2>
          <p className="mt-3 max-w-xl leading-relaxed">
             Contact support with questions about a tool, your account or a file-processing issue.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:support@pdfgenius.app"
              data-testid="link-about-email"
              className={`${btn} bg-white text-stone-900 hover:bg-stone-100 break-all`}
            >
              <Mail className="w-4 h-4 shrink-0" /> support@pdfgenius.app
            </a>
            <Link
              href="/contact"
              data-testid="link-about-contact"
              className={`${btn} border border-white/70 hover:bg-white/10`}
            >
              Open contact page
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
