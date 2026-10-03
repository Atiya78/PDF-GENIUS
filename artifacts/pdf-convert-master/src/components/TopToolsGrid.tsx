import { Link } from "wouter";
import { toolConfigs } from "@/lib/toolConfig";

const TOP = ["merge-pdfs", "compress-pdf", "pdf-to-word", "split-pdf", "edit-pdf", "sign-pdf", "images-to-pdf", "unlock-pdf"];
const NAMES: Record<string, string> = { "merge-pdfs": "Merge PDF", "split-pdf": "Split PDF" };

export const TopToolsGrid = (): JSX.Element => (
  <div className="w-full" data-testid="grid-top-tools">
    <div className="flex items-end justify-between gap-4 mb-4">
      <h2 className="text-xl font-bold text-gray-900">Popular tools</h2>
      <Link href="/tools" className="inline-flex min-h-[44px] items-center text-sm font-medium text-[#c62d27] underline-offset-2 hover:underline" data-testid="link-all-tools">
        All tools
      </Link>
    </div>
    <ul className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3">
      {TOP.map((id) => {
        const t = toolConfigs[id];
        if (!t || !t.route) return null;
        const Icon = t.icon;
        return (
          <li key={id}>
            <Link
              href={t.route}
              className="group flex h-full min-h-[44px] flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#f7433d] hover:shadow-md"
              data-testid={`link-top-tool-${id}`}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff0ef] text-[#c62d27]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-semibold text-gray-900">{NAMES[id] ?? t.title}</span>
              </span>
              <span className="text-sm text-gray-600">{t.description}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  </div>
);
