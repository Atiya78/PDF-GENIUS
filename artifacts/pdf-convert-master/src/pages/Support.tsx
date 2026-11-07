import { Link } from "wouter";
import { ArrowRight, Mail } from "lucide-react";
import { SUPPORT_REPLY_COPY, FILE_RETENTION_COPY } from "@/config/siteCopy";
import { useSeo } from "@/lib/useSeo";
import { Reveal } from "@/components/education/Reveal";
import "@/styles/marketing.css";

const topics = [
  { title: "Choose a tool", description: "Browse every PDF and image tool and open the one you need.", href: "/tools", cta: "Open tools" },
  { title: "Conversion problems", description: "Check file type and size limits on the tool page, then contact support with the tool name and the message you saw.", href: "/contact", cta: "Contact support" },
  { title: "Plans and billing", description: "Compare plans, manage credits, and read the refund policy.", href: "/pricing", cta: "See pricing" },
  { title: "API", description: "Endpoints, options and output formats for developers.", href: "/docs", cta: "Read the docs" },
  { title: "Features", description: "What each tool does and which ones run locally in your browser.", href: "/features", cta: "View features" },
  { title: "Privacy and file safety", description: FILE_RETENTION_COPY, href: "/data-safety", cta: "Data safety" },
];

export const Support = (): JSX.Element => {
  useSeo({
    title: "Support",
    description: "Get help with PDF Genius tools, plans and files. Email support@pdfgenius.app.",
    canonicalPath: "/support",
  });
  return (
    <div className="mkt-root pb-24">
      <section className="border-b border-[#e7e0d5]">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:pt-16">
          <p className="edu-eyebrow">Support</p>
          <h1 className="mkt-display mt-4 max-w-2xl text-[2.4rem] sm:text-[3.2rem]">How can we help?</h1>
          <p className="mkt-lede mt-5 max-w-lg">{SUPPORT_REPLY_COPY}.</p>
          <a href="mailto:support@pdfgenius.app" className="edu-btn-primary mt-8" data-testid="button-support-email">
            <Mail className="h-4 w-4" aria-hidden="true" />support@pdfgenius.app
          </a>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6" aria-labelledby="topics-heading">
        <Reveal>
          <div className="mkt-section">
            <div>
              <p className="edu-eyebrow">Index</p>
              <h2 id="topics-heading" className="mkt-h2 mt-2">Common topics</h2>
            </div>
            <ul className="border-t border-[#1c1917]">
              {topics.map((t, i) => (
                <li key={t.title}>
                  <Link href={t.href} className="mkt-row items-start py-5" data-testid={`link-support-${t.href.slice(1)}`}>
                    <span className="edu-mono w-7 shrink-0 pt-1 text-xs text-[#c8302a]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-['Poppins'] text-[17px] font-semibold">{t.title}</span>
                      <span className="mt-1 block text-[15px] leading-relaxed text-[#57534e]">{t.description}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1.5 pt-1 text-sm font-semibold text-[#57534e] sm:inline-flex">
                      {t.cta}<ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" />
                    </span>
                    <ArrowRight className="mkt-arrow mt-1 h-4 w-4 shrink-0 sm:hidden" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default Support;
