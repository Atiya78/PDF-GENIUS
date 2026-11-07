import { useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Reveal } from "@/components/education/Reveal";
import "@/styles/marketing.css";

const SPEC = [
  { k: "Tools", v: "20+ PDF and image conversion endpoints" },
  { k: "Free tier", v: "1,000 calls per month" },
  { k: "Card", v: "Not required to start" },
  { k: "Auth", v: "API key over HTTPS" },
  { k: "Response", v: "Synchronous; the file comes back in the response" },
];

export const APIDocumentationSection = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  // Public API lives on the custom domain, so the example always shows it.
  const apiDomain = "https://pdfgenius.app";

  const curlExample = `curl -X POST "${apiDomain}/api/v1/word_to_pdf" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@document.docx" \\
  -o converted.pdf`;

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlExample);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — leave the text selectable.
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6" aria-labelledby="api-heading">
      <Reveal>
        <div className="mkt-section">
          <div>
            <p className="edu-eyebrow">Developer API</p>
            <h2 id="api-heading" className="mkt-h2 mt-2">The same tools, over REST</h2>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-[#57534e]">
              Integrate PDF and image conversion into your own application.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button type="button" className="edu-btn-primary" onClick={() => setLocation("/dashboard/api-setup")} data-testid="button-api-get-key">
                Get API key
              </button>
              <Link href="/docs" className="mkt-link text-sm" data-testid="link-api-docs">
                Documentation <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="grid min-w-0 gap-8 border-t border-[#1c1917] pt-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="mkt-code min-w-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                <span className="text-[11px] uppercase tracking-[0.14em] text-[#b5aa9b]">Shell</span>
                <button
                  type="button"
                  onClick={copyCurl}
                  aria-label="Copy curl example to clipboard"
                  data-testid="button-copy-curl"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-2.5 text-xs text-[#e7e0d5] transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7433d]"
                >
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="overflow-x-auto p-4 sm:p-5"><code>{curlExample}</code></pre>
            </div>
            <dl className="text-sm">
              {SPEC.map((s) => (
                <div key={s.k} className="flex gap-4 border-b border-[#efe8dd] py-2.5 first:pt-0">
                  <dt className="edu-mono w-20 shrink-0 text-xs uppercase tracking-wider text-[#8a837b]">{s.k}</dt>
                  <dd className="text-[#1c1917]">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Reveal>
    </section>
  );
};
