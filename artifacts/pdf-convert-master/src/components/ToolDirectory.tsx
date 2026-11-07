import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { toolLandingPages } from "@/config/toolLandingPages";
import "@/styles/tools.css";

export function ToolDirectory() {
  return (
    <section aria-labelledby="tool-directory" className="tl-root px-4 py-16 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <p className="edu-eyebrow">Directory</p>
          <h2 id="tool-directory" className="mt-2 font-['Poppins'] text-[1.9rem] font-semibold tracking-[-0.02em] text-[#1c1917]">All tools</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#57534e]">
            <span className="edu-mono text-[#1c1917]">{toolLandingPages.length}</span> pages, A to Z by task.
          </p>
        </div>
        <div>
          <ul className="grid border-b border-[#e7e0d5] sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
            {toolLandingPages.map((t) => (
              <li key={t.path}>
                <Link href={t.path} className="tl-dir-link" data-testid={`link-tool-${t.id}`}>
                  <span>{t.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-[#57534e]">
            <Link href="/restore-document" className="underline decoration-[#d9d0c3] decoration-2 underline-offset-4 hover:text-[#1c1917] hover:decoration-[#f7433d]">Document Restore (coming soon)</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
