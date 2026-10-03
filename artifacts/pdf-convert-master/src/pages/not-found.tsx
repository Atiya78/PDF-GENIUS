import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Home } from "lucide-react";
import { useSeo } from "@/lib/useSeo";
import { toolConfigs } from "@/lib/toolConfig";

const POPULAR = [
  { name: "Merge PDF", href: "/merge-pdf" },
  { name: "Compress PDF", href: "/compress-pdf" },
  { name: "PDF to Word", href: "/pdf-to-word" },
  { name: "Word to PDF", href: "/word-to-pdf" },
  { name: "Split PDF", href: "/split-pdf" },
  { name: "Edit PDF", href: "/edit-pdf" },
  { name: "Sign PDF", href: "/sign-pdf" },
  { name: "Images to PDF", href: "/jpg-to-pdf" },
];

export default function NotFound() {
  useSeo({ title: "Page not found", noindex: true });
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.values(toolConfigs)
      .filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);

  const goTo = (t: (typeof results)[number]) => setLocation(t.route ?? "/tools");

  return (
    <main className="min-h-[70vh] w-full flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl text-center">
        <p className="text-sm font-semibold text-[#c62d27]">Error 404</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-3 text-gray-600">
          We couldn't find that page. Search for a tool or pick one below.
        </p>

        <form
          role="search"
          className="relative mt-8 text-left"
          onSubmit={(e) => {
            e.preventDefault();
            if (results[0]) goTo(results[0]);
          }}
        >
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools, e.g. compress"
            aria-label="Search tools"
            data-testid="input-404-search"
            className="h-12 w-full rounded-full border border-gray-300 bg-white pl-12 pr-4 text-base text-gray-900 focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/30"
          />
          {query.trim() && (
            <ul className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {results.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-500">No tools match "{query}".</li>
              ) : (
                results.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={t.route ?? "/tools"}
                      className="block px-4 py-3 text-sm hover:bg-gray-50"
                      data-testid={`link-404-result-${t.id}`}
                    >
                      <span className="font-medium text-gray-900">{t.title}</span>
                      <span className="ml-2 text-gray-500">{t.description}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          )}
        </form>

        <h2 className="mt-10 text-base font-semibold text-gray-900">Popular tools</h2>
        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {POPULAR.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 transition-colors hover:border-[#f7433d] hover:text-[#f7433d]"
                data-testid={`link-404-${t.href.split("/").pop()}`}
              >
                {t.name}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="mt-10 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#d92f29] px-6 font-medium text-white hover:opacity-90"
          data-testid="link-404-home"
        >
          <Home className="h-4 w-4" aria-hidden="true" /> Back to home
        </Link>
      </div>
    </main>
  );
}
