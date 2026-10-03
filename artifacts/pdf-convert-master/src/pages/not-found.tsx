import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ToolSearch } from "@/components/ToolSearch";
import { useSeo } from "@/lib/useSeo";

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
    <section className="bg-gray-50 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-sm font-semibold text-primary">404</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-4 text-gray-600">
          This page doesn't exist. Search for a tool or choose one below.
        </p>
        <div className="mx-auto my-8 max-w-sm text-left">
          <ToolSearch className="w-full" />
        </div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Popular PDF tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {popularTools.map((tool) => (
            <Link key={tool.path} href={tool.path} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 hover:border-primary hover:text-primary focus-visible:outline-primary">
              {tool.name}
            </Link>
          ))}
        </div>
        <Button asChild className="mt-8">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </section>
  );
}
