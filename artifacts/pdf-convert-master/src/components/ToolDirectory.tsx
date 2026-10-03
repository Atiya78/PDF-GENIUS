import { Link } from "wouter";
import { toolLandingPages } from "@/config/toolLandingPages";

export function ToolDirectory() {
  return (
    <section aria-labelledby="tool-directory" className="bg-white px-4 sm:px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <h2 id="tool-directory" className="text-2xl font-bold text-gray-900">All tools</h2>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {toolLandingPages.map((t) => (
            <li key={t.path}>
              <Link href={t.path} className="block rounded-xl border border-gray-200 px-4 py-3 font-medium text-gray-900 hover:border-primary hover:text-primary" data-testid={`link-tool-${t.id}`}>
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-gray-600">
          <Link href="/restore-document" className="hover:text-primary hover:underline">Document Restore (coming soon)</Link>
        </p>
      </div>
    </section>
  );
}
