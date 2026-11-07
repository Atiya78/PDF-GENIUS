import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { ToolSearch } from "@/components/ToolSearch";
import { useSeo } from "@/lib/useSeo";
import "@/styles/marketing.css";

const popularTools = [
  { name: "Merge PDF", path: "/upload/merge-pdfs" },
  { name: "Compress PDF", path: "/upload/compress-pdf" },
  { name: "PDF to Word", path: "/upload/pdf-to-word" },
  { name: "Word to PDF", path: "/upload/word-to-pdf" },
  { name: "Split PDF", path: "/upload/split-pdf" },
  { name: "Edit PDF", path: "/upload/edit-pdf" },
  { name: "Sign PDF", path: "/upload/sign-pdf" },
  { name: "Images to PDF", path: "/upload/images-to-pdf" },
];

export default function NotFound() {
  useSeo({
    title: "Page not found",
    description: "Find a PDF Genius tool or return to the homepage.",
    noindex: true,
  });

  return (
    <section className="mkt-root px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="edu-eyebrow">Error 404</p>
          <h1 className="mkt-display mt-4 text-[2.4rem] sm:text-[3rem]">This page is not on the desk.</h1>
          <p className="mkt-lede mt-5 max-w-md">This page doesn't exist. Search for a tool or choose one from the list.</p>
          <div className="mt-8 max-w-sm">
            <ToolSearch className="w-full" />
          </div>
          <Link href="/" className="mkt-link mt-8 text-[15px]" data-testid="link-404-home">
            Back to home <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <nav aria-labelledby="popular-heading">
          <h2 id="popular-heading" className="edu-eyebrow !text-[#8a837b]">Popular PDF tools</h2>
          <ul className="mt-3 border-t border-[#1c1917]">
            {popularTools.map((tool) => (
              <li key={tool.path}>
                <Link href={tool.path} className="mkt-row font-medium">
                  {tool.name}
                  <ArrowRight className="mkt-arrow ml-auto h-4 w-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
