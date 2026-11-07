import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { FILE_RETENTION_COPY, HTTPS_COPY, IMAGE_UPLOAD_RETENTION_COPY } from "@/config/siteCopy";
import { browserOnlyTools, localToolsWithOptionalUpload, serverUploadTools, unavailableTools } from "@/config/toolProcessing";
import { Reveal } from "@/components/education/Reveal";
import "@/styles/marketing.css";

export function PrivacyFilesSection() {
  const rows = [
    { k: "Browser only", note: "Your file never leaves your device.", v: browserOnlyTools },
    { k: "Local, optional upload", note: "Choosing Upload to Server sends the result to the server.", v: localToolsWithOptionalUpload },
    { k: "Server processing", note: "These tools upload files for processing.", v: serverUploadTools },
    { k: "Unavailable", note: "", v: unavailableTools },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6" aria-labelledby="privacy-heading">
      <Reveal>
        <div className="mkt-section">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="edu-eyebrow">Fine print</p>
            <h2 id="privacy-heading" className="mkt-h2 mt-2">Privacy and your files</h2>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/privacy" className="mkt-link">Privacy policy</Link>
              <Link href="/data-safety" className="mkt-link">Data safety</Link>
            </div>
          </div>
          <div className="border-t border-[#1c1917]">
            <div className="space-y-3 py-6 text-[15px] leading-relaxed text-[#57534e]">
              <p>Some tools process files in your browser; others upload files to the server. {HTTPS_COPY}</p>
              <p>{FILE_RETENTION_COPY}</p>
              <p>{IMAGE_UPLOAD_RETENTION_COPY}</p>
            </div>
            <details className="edu-details border-t border-[#e7e0d5]">
              <summary className="flex min-h-[52px] items-center gap-2 py-3 font-semibold text-[#1c1917] hover:text-[#c8302a]">
                <ChevronRight className="edu-caret h-4 w-4" aria-hidden="true" />
                Where each tool processes your file
              </summary>
              <dl className="pb-4 text-sm">
                {rows.map((r) => (
                  <div key={r.k} className="grid gap-1 border-t border-[#efe8dd] py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                    <dt className="font-semibold text-[#1c1917]">{r.k}</dt>
                    <dd className="text-[#57534e]">{r.v.join(", ")}.{r.note && <span className="mt-1 block text-[#8a837b]">{r.note}</span>}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
