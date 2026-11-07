import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useSeo } from "@/lib/useSeo";
import "@/styles/marketing.css";

export const Features: React.FC = () => {
  useSeo({
    title: "Features — Fast, Secure PDF & Image Tools",
    description:
      "Explore PDF and image tools. Some tools process locally; others upload files for server processing. Encrypted in transit (HTTPS).",
    canonicalPath: "/features",
  });

  const features = [
    { title: "PDF and image processing", description: "Conversion time depends on the file and the tool." },
    { title: "Encrypted in transit (HTTPS)", description: "File uploads and downloads use HTTPS." },
    { title: "Works on any device", description: "Runs in a modern browser on desktop, tablet or phone." },
  ];

  return (
    <div className="mkt-root min-h-[70dvh] pb-24">
      <section className="border-b border-[#e7e0d5]">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:pt-16">
          <p className="edu-eyebrow">Features</p>
          <h1 className="mkt-display mt-4 max-w-3xl text-[2.4rem] sm:text-[3.2rem]">PDF tools for the work that actually comes up.</h1>
          <p className="mkt-lede mt-6 max-w-xl">
            Convert documents, merge and split files, compress, sign and protect them, from one place in your browser.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link href="/tools" className="edu-btn-primary group" data-testid="link-features-tools">
              Try it now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href="/learn-more" className="mkt-link text-[15px]" data-testid="link-features-learn-more">
              Learn more <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="mkt-section">
          <div>
            <p className="edu-eyebrow">Notes</p>
            <h2 className="mkt-h2 mt-2">What to expect</h2>
          </div>
          <ol className="border-t border-[#1c1917]">
            {features.map((f, i) => (
              <li key={f.title} className="flex gap-5 border-b border-[#e7e0d5] py-6">
                <span className="edu-mono w-8 shrink-0 pt-1 text-xs text-[#c8302a]">{["i.", "ii.", "iii."][i]}</span>
                <div>
                  <h3 className="font-['Poppins'] text-lg font-semibold text-[#1c1917]">{f.title}</h3>
                  <p className="mt-1 text-[15px] text-[#57534e]">{f.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
};
