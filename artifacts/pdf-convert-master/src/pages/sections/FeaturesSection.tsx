import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { toolConfigs } from "@/lib/toolConfig";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { VerifiedSiteStats } from "@/components/VerifiedSiteStats";
import { Reveal } from "@/components/education/Reveal";
import "@/styles/marketing.css";

const FEATURE_TOOL: Record<string, string> = {
  "Merge PDFs": "merge-pdfs", "Split PDFs": "split-pdf", "Compress Files": "compress-pdf", "Rotate Pages": "rotate-pdf",
  "Password Protect": "lock-pdf", "Remove Password": "unlock-pdf", "Add Watermark": "watermark-pdf", "Digital Signature": "sign-pdf",
  "PDF to Word": "pdf-to-word", "Word to PDF": "word-to-pdf", "Excel to PDF": "excel-to-pdf", "Image to PDF": "images-to-pdf",
};

const DRAWERS = [
  { label: "Convert", description: "Move between document formats. Review the result: formatting may change during conversion.", features: ["PDF to Word", "Word to PDF", "Excel to PDF", "Image to PDF"] },
  { label: "Organize", description: "Merge, split and reorganize pages without leaving the browser tab.", features: ["Merge PDFs", "Split PDFs", "Compress Files", "Rotate Pages"] },
  { label: "Secure", description: "Add or remove a password, watermark pages, or sign a document.", features: ["Password Protect", "Remove Password", "Add Watermark", "Digital Signature"] },
];

const NOTES = [
  { t: "PDF and image processing", d: "Conversion time depends on the file and the tool." },
  { t: "Encrypted in transit (HTTPS)", d: "File uploads and downloads use HTTPS." },
  { t: "Works on any device", d: "Runs in a modern browser on desktop or phone." },
];

export const FeaturesSection = (): JSX.Element => {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6" aria-labelledby="features-heading">
      <Reveal>
        <div className="mkt-section">
          <div>
            <p className="edu-eyebrow">The toolkit</p>
            <h2 id="features-heading" className="mkt-h2 mt-2">Three drawers, one desk</h2>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-[#57534e]">
              The jobs people bring most often, filed where you would look for them.
            </p>
          </div>
          <div className="grid border-t border-[#1c1917] md:grid-cols-3">
            {DRAWERS.map((d, i) => (
              <div key={d.label} className={i > 0 ? "border-t border-[#e7e0d5] pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-6" : "pt-6 md:pr-6"}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-['Poppins'] text-lg font-semibold text-[#1c1917]">{d.label}</h3>
                  <span className="edu-mono text-xs text-[#c8302a]">{["i.", "ii.", "iii."][i]}</span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-[#57534e]">{d.description}</p>
                <ul className="mt-4 pb-6">
                  {d.features.map((f) => {
                    const id = FEATURE_TOOL[f];
                    const tool = id ? toolConfigs[id] : undefined;
                    if (!tool?.route) return <li key={f} className="py-2 text-sm text-[#57534e]">{f}</li>;
                    return (
                      <li key={f}>
                        <Link href={tool.route} className="mkt-tool -mx-2" data-testid={`link-feature-${id}`}>
                          <span className="mkt-icon"><ToolLottieIcon toolId={tool.id} config={tool} size={26} /></span>
                          {f}
                          <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mkt-section mt-16">
          <div>
            <p className="edu-eyebrow">Notes</p>
            <h2 className="mkt-h2 mt-2">What to expect</h2>
          </div>
          <dl className="grid gap-x-8 border-t border-[#e7e0d5] sm:grid-cols-3">
            {NOTES.map((n) => (
              <div key={n.t} className="border-b border-[#efe8dd] py-5 sm:border-b-0">
                <dt className="text-[15px] font-semibold text-[#1c1917]">{n.t}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-[#57534e]">{n.d}</dd>
              </div>
            ))}
          </dl>
        </div>
        <VerifiedSiteStats group="home" />
      </Reveal>
    </section>
  );
};
